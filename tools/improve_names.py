"""规则式批量中文译名流水线（健身动作库，1324 条）。

读基线 data/exercises.seed.json.baseline，写成品 data/exercises.seed.json。

流水线顺序（阶段 2 必须整体迭代，不可拆开）：
  0. 自检覆盖表 id 是否全部命中        → 不通过则报错退出
  1. 显式覆盖（人工译名，最高优先级）
  2. compose + settle_name：组名/补词/剥词迭代到不动点
  3. disambiguate + resolve_duplicates  → 迭代到不动点
  4. cleanup_orphan_ordinals：清孤儿序号、重编跳号
  5. 统计覆盖率 + 报告未译词

幂等要求：脚本每次从基线重新读入，内存状态一律归零；
写盘判据为「与开头快照逐条比对」，而非某个阶段的改动计数。
"""

from __future__ import annotations

import collections
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from terms_zh import (  # noqa: E402
    ALL_TERMS,
    ALL_TERMS_QUAL,
    BODY_PART_ZH,
    EQUIPMENT_ZH,
    EQUIPMENT_GROUP,
    MUSCLE_ZH,
    NOISE_PHRASES,
    NOISE_TOKENS,
    OVERRIDE_BY_ID,
    TARGET_ZH,
    TYPO_FIX,
)

ROOT = Path(__file__).resolve().parent.parent
SEED = ROOT / "data" / "exercises.seed.json"
BASE = SEED.parent / (SEED.name + ".baseline")   # 字符串拼接，绝不用 with_suffix

# 器械剥离已并入 ALL_TERMS（映射为空串），由最长匹配统一处理，
# 因此不再需要「先剥器械、后翻译」的两段式，避免拆散 air bike 这类短语。
CONNECTORS = {
    "on", "with", "to", "and", "into", "from", "of", "in", "the", "a", "an",
    "at", "by", "for", "as", "is", "it", "your", "you",
}

FRACTIONS = {
    "3/4": "frac34",
    "1/2": "frac12",
    "1/4": "frac14",
    "2/3": "frac23",
    "1/3": "frac13",
}
FRACTION_ZH = {
    "frac34": "四分之三",
    "frac12": "半",
    "frac14": "四分之一",
    "frac23": "三分之二",
    "frac13": "三分之一",
}

ORD = re.compile(r"（\d+）")
NUMERIC = re.compile(r"^\d+°?$")
UNTRANSLATED: collections.Counter = collections.Counter()


# ------------------------------------------------------------------ 工具

def normalize_mojibake(s: str) -> str:
    """修正 45в° 这类西里尔字母混入的乱码。"""
    return re.sub(r"[\u0400-\u04FF]", "", s)


def translate_tokens(toks: list[str], table: dict | None = None) -> str:
    """最长匹配优先的短语翻译。数字标记原样保留，未命中词计入 UNTRANSLATED 并丢弃。

    table 传 ALL_TERMS_QUAL 时，器械词保留中文而非剥离（用于括号限定语）。
    """
    table = ALL_TERMS if table is None else table
    out: list[str] = []
    i = 0
    while i < len(toks):
        if NUMERIC.match(toks[i]):
            out.append(toks[i])
            i += 1
            continue
        if re.search(r"[\u4e00-\u9fff]", toks[i]):   # 已是中文（分数等）直接保留
            out.append(toks[i])
            i += 1
            continue
        hit = False
        for n in (4, 3, 2, 1):
            if i + n > len(toks):
                continue
            phrase = " ".join(toks[i:i + n])
            if phrase in table:
                out.append(table[phrase])
                i += n
                hit = True
                break
        if not hit:
            UNTRANSLATED[toks[i]] += 1
            i += 1
    return "".join(out)


def strip_equipment(toks: list[str]) -> list[str]:
    """器械剥离已由 ALL_TERMS 空译名承担，此处仅保留占位以兼容调用点。"""
    return toks


def tokenize(s: str) -> list[str]:
    s = normalize_mojibake(s.lower())
    for frac, tag in FRACTIONS.items():         # 3/4 → 拉丁占位符，避开标点清理
        s = s.replace(frac, f" {tag} ")
    s = re.sub(r"[^a-z0-9°\s]", " ", s)
    toks = [TYPO_FIX.get(t, t) for t in s.split()]
    return [FRACTION_ZH.get(t, t) for t in toks]


# ------------------------------------------------------------------ 阶段 2

def compose(name_en: str, equipment: str) -> str:
    """把英文名组合成中文名。"""
    s = normalize_mojibake(name_en.lower())

    # 括号内容 → 限定语
    parens = re.findall(r"\(([^)]*)\)", s)
    s = re.sub(r"\([^)]*\)", " ", s)

    # 版本标记 v. 2
    ver = None
    m = re.search(r"\bv\.?\s*(\d+)\b", s)
    if m:
        ver = m.group(1)
        s = re.sub(r"\bv\.?\s*\d+\b", " ", s)

    # with X / on X → 限定语（on floor、on knees、on stability ball 都属限定信息）
    chunks = re.split(r"\bwith\b|\bon\b", s)
    main_en = chunks[0]
    quals_en = chunks[1:]

    toks = [t for t in tokenize(main_en) if t not in NOISE_TOKENS]
    toks = strip_equipment(toks)
    toks = [t for t in toks if t not in CONNECTORS]
    zh = translate_tokens(toks)

    # 限定语翻译（丢弃 male / female 这类性别标记；pov 保留为视角）
    eq_zh = EQUIPMENT_ZH.get(equipment, "")
    quals: list[str] = []
    for q in list(quals_en) + list(parens):
        if q.strip().lower() in NOISE_PHRASES:
            continue
        qt = [t for t in tokenize(q) if t not in NOISE_TOKENS and t not in CONNECTORS]
        z = translate_tokens(qt, ALL_TERMS_QUAL)   # 限定语保留器械词
        # 限定语与器械前缀重复时丢弃，避免「健身球俯卧撑（健身球）」
        if z and z != eq_zh and z not in quals:
            quals.append(z)

    out = zh
    if quals:
        out += "（" + "·".join(dict.fromkeys(quals)) + "）"
    if ver:
        out += f"（第{ver}式）"
    return out


def dedupe_repeat(zh: str) -> str:
    """去除相邻重复词块，如「弯举弯举」→「弯举」。只做纯函数变换。"""
    body = zh
    # 相邻重复的中文双字块
    prev = None
    while prev != body:
        prev = body
        body = re.sub(r"(.{2,4})\1", r"\1", body)
    return body


def attach_equipment(zh: str, equipment: str) -> str:
    """统一补器械前缀：除「徒手」外一律保留。

    器械同时是独立筛选维度，但完全剥离会导致「弯举」这类重名泛滥、
    进而产出「卧推（2）」式序号；统一保留则译名一致且自然。
    """
    eq = EQUIPMENT_ZH.get(equipment, "")
    if not eq or eq == "徒手":
        return zh
    if ORD.sub("", zh).startswith(eq):
        return zh
    return eq + zh


def settle_name(name_en: str, equipment: str) -> str:
    """组名 → 去重迭代到不动点 → 统一补器械前缀。"""
    zh = compose(name_en, equipment)
    for _ in range(6):
        stripped = dedupe_repeat(zh)
        if stripped and stripped != zh:
            zh = stripped
            continue
        break
    return attach_equipment(zh, equipment)


# ------------------------------------------------------------------ 阶段 3

def base_of(zh: str) -> str:
    return ORD.sub("", zh).strip()


def resolve_duplicates(seed: list[dict]) -> int:
    """全局重名消解：器械前缀 → 序号。返回本轮的改动条数。"""
    changed = 0
    groups: dict[str, list[dict]] = collections.defaultdict(list)
    for e in seed:
        if "·" in e["nameZh"]:
            continue
        groups[base_of(e["nameZh"])].append(e)

    for base, items in groups.items():
        if len(items) < 2:
            continue
        eqs = [EQUIPMENT_ZH.get(e["equipment"], "") for e in items]
        can_prefix = (
            all(eqs)
            and len(set(eqs)) == len(items)
            and not any(base.startswith(eq) for eq in eqs if eq)
        )
        if can_prefix:
            for e, eq in zip(items, eqs):
                new = eq + base
                if new != e["nameZh"]:
                    e["nameZh"] = new
                    changed += 1
        else:
            for idx, e in enumerate(items):
                new = base if idx == 0 else f"{base}（{idx + 1}）"
                if new != e["nameZh"]:
                    e["nameZh"] = new
                    changed += 1
    return changed


def cleanup_orphan_ordinals(seed: list[dict]) -> int:
    """清孤儿序号：同基名只剩自己 → 去号；多条 → 重编为连续序号。"""
    changed = 0
    groups: dict[str, list[dict]] = collections.defaultdict(list)
    for e in seed:
        if "·" in e["nameZh"]:
            continue
        groups[base_of(e["nameZh"])].append(e)

    for base, items in groups.items():
        if len(items) == 1:
            e = items[0]
            if e["nameZh"] != base:
                e["nameZh"] = base
                changed += 1
        else:
            for idx, e in enumerate(items):
                new = base if idx == 0 else f"{base}（{idx + 1}）"
                if e["nameZh"] != new:
                    e["nameZh"] = new
                    changed += 1
    return changed


# ------------------------------------------------------------------ 主流程

def main() -> int:
    if not BASE.exists():
        print(f"错误：基线文件不存在 {BASE}")
        print("请先执行：cp data/exercises.seed.json data/exercises.seed.json.baseline")
        return 2

    seed = json.loads(BASE.read_text(encoding="utf-8"))

    # 改动基线取「磁盘上已有的成品」，而非纯净基线：
    # 这样第二次运行才会如实报出 0 条改动，幂等性可被验证。
    prev: dict[str, str] = {}
    if SEED.exists():
        try:
            prev = {
                e["id"]: (e.get("nameZh") or "")
                for e in json.loads(SEED.read_text(encoding="utf-8"))
            }
        except (json.JSONDecodeError, KeyError):
            prev = {}

    # --- 阶段 0：覆盖表自检 ---
    unknown = sorted(set(OVERRIDE_BY_ID) - {e["id"] for e in seed})
    if unknown:
        print("错误：覆盖表中有 id 不存在于种子数据：")
        for uid in unknown:
            print("  " + uid)
        return 2

    # --- 阶段 1：显式覆盖 ---
    for e in seed:
        if e["id"] in OVERRIDE_BY_ID:
            e["nameZh"] = OVERRIDE_BY_ID[e["id"]]

    # --- 阶段 2：组合 + 迭代到不动点 ---
    for e in seed:
        if e["id"] in OVERRIDE_BY_ID:
            continue
        e["nameZh"] = settle_name(e["name"], e["equipment"])

    # --- 阶段 3：消歧义，迭代到不动点 ---
    for _ in range(12):
        if resolve_duplicates(seed) == 0:
            break

    # --- 阶段 4：清理孤儿序号 ---
    for _ in range(6):
        if cleanup_orphan_ordinals(seed) == 0:
            break

    # --- 阶段 5：写盘判据（与磁盘成品逐条比对） ---
    real_changes = [e for e in seed if prev.get(e["id"], "") != (e.get("nameZh") or "")]

    # 维度中文名回填
    for e in seed:
        e["bodyPartZh"] = BODY_PART_ZH.get(e["bodyPart"], e["bodyPart"])
        e["equipmentZh"] = EQUIPMENT_ZH.get(e["equipment"], e["equipment"])
        e["equipmentGroup"] = EQUIPMENT_GROUP.get(e["equipment"], "其他")
        e["targetZh"] = TARGET_ZH.get(e["target"], e["target"])
        e["muscleGroupZh"] = MUSCLE_ZH.get(e["muscleGroup"], e["muscleGroup"])
        e["secondaryMusclesZh"] = [
            MUSCLE_ZH.get(m, m) for m in e.get("secondaryMuscles", [])
        ]

    if real_changes:
        SEED.write_text(json.dumps(seed, ensure_ascii=False, indent=1), encoding="utf-8")

    # --- 统计 ---
    total = len(seed)
    filled = sum(1 for e in seed if e["nameZh"].strip())
    dup = [k for k, v in collections.Counter(
        e["nameZh"] for e in seed if "·" not in e["nameZh"]
    ).items() if v > 1]

    print(f"总条数：{total}")
    print(f"已生成中文名：{filled}（{filled / total * 100:.1f}%）")
    print(f"实际改动：{len(real_changes)} 条")
    if real_changes:
        print("  样例：" + "、".join(
            f"{e['name']} → {e['nameZh']}" for e in real_changes[:5]
        ))
    print(f"重名冲突：{len(dup)} 组" + (f" → {dup[:5]}" if dup else ""))
    if UNTRANSLATED:
        print(f"未译词：{len(UNTRANSLATED)} 个 → "
              + "、".join(f"{w}({c})" for w, c in UNTRANSLATED.most_common(25)))
    if not real_changes:
        print("无改动（幂等）")
    return 0


if __name__ == "__main__":
    sys.exit(main())
