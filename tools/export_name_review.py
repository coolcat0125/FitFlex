"""译名校验 + 导出人工校对表。

校验清单（任一不过则退出码非 0）：
  1. 零重名（全局，不按部位——搜索会跨部位）
  2. 无残名（以 · 结尾 / 空）
  3. 无单字译名、无光秃修饰语、无光秃器械名
  4. 序号健康：不叠加、不整名裸序号
  5. 无未译英文残留

导出 data/name-review.csv（utf-8-sig，Excel 直接打开不乱码），
按「待补中文 → 需确认 → OK」排序，用户从最需要改的看起。
"""

from __future__ import annotations

import collections
import csv
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from terms_zh import EQUIPMENT_ZH  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
SEED = ROOT / "data" / "exercises.seed.json"
OUT = ROOT / "data" / "name-review.csv"

ORD = re.compile(r"（\d+）")
DANGLING = re.compile(r"^[侧上下前后内外单双交替·]+$")
SUSPICIOUS = {"侧", "上", "下", "屈", "伸", "拉", "推", "单", "双", "斜"}
# 这些动作名本身就等于器械名，属合法译名而非漏译
LEGIT_BARE = {"0128", "0857"}


def classify(e: dict) -> tuple[str, str]:
    zh = e["nameZh"].strip()
    en = e["name"]
    if not zh:
        return "english", "译名为空，需人工补中文"
    if zh == en or re.search(r"[a-zA-Z]{3,}", zh):
        return "english", "残留英文，需人工补中文"
    if zh.endswith("·"):
        return "review", "残名（以 · 结尾）"
    if len(zh) == 1:
        return "review", "单字译名，信息不足"
    if zh in SUSPICIOUS or DANGLING.match(zh):
        return "review", "只有修饰语，缺主体动作"
    if zh in EQUIPMENT_ZH.values():
        return "review", "光秃器械名，缺动作"
    if len(ORD.findall(zh)) > 1:
        return "review", "序号叠加"
    if not ORD.sub("", zh).strip():
        return "review", "整名是裸序号"
    if ORD.search(zh):
        return "review", "含序号，可能可消歧"
    en_words = len([w for w in re.split(r"[^a-zA-Z]+", en) if len(w) > 2])
    if en_words >= 4 and len(zh) <= 4:
        return "review", f"原名 {en_words} 词译名仅 {len(zh)} 字，可能漏译"
    if len(zh) > 16:
        return "review", "译名过长"
    return "ok", ""


def main() -> int:
    seed = json.loads(SEED.read_text(encoding="utf-8"))
    problems: list[str] = []

    # 1. 零重名
    dup = [k for k, v in collections.Counter(
        e["nameZh"] for e in seed
    ).items() if v > 1]
    if dup:
        problems.append(f"重名 {len(dup)} 组：{dup[:5]}")

    # 2. 无残名
    bad = [e["id"] for e in seed if not e["nameZh"].strip() or e["nameZh"].endswith("·")]
    if bad:
        problems.append(f"残名 {len(bad)} 条：{bad[:5]}")

    # 3. 单字 / 光秃修饰语 / 光秃器械名
    singles = [e["id"] for e in seed if len(e["nameZh"]) == 1]
    if singles:
        problems.append(f"单字译名 {len(singles)} 条：{singles[:5]}")
    dangling = [e["id"] for e in seed if DANGLING.match(e["nameZh"])]
    if dangling:
        problems.append(f"光秃修饰语 {len(dangling)} 条：{dangling[:5]}")
    bare_eq = [e["id"] for e in seed
               if e["nameZh"] in EQUIPMENT_ZH.values() and e["id"] not in LEGIT_BARE]
    if bare_eq:
        problems.append(f"光秃器械名 {len(bare_eq)} 条：{bare_eq[:5]}")

    # 4. 序号健康
    multi = [e["id"] for e in seed if len(ORD.findall(e["nameZh"])) > 1]
    if multi:
        problems.append(f"序号叠加 {len(multi)} 条：{multi[:5]}")
    naked = [e["id"] for e in seed if not ORD.sub("", e["nameZh"]).strip()]
    if naked:
        problems.append(f"整名裸序号 {len(naked)} 条：{naked[:5]}")

    # 5. 英文残留
    eng = [e["id"] for e in seed if re.search(r"[a-zA-Z]{3,}", e["nameZh"])]
    if eng:
        problems.append(f"英文残留 {len(eng)} 条：{eng[:5]}")

    # ---- 导出校对表 ----
    rows = []
    stats = collections.Counter()
    for e in seed:
        st, note = classify(e)
        stats[st] += 1
        rows.append({
            "id(勿改)": e["id"],
            "中文名(可修改)": e["nameZh"],
            "英文名": e["name"],
            "部位": e["bodyPartZh"],
            "器械": e["equipmentZh"],
            "状态": st,
            "说明": note,
        })
    order = {"english": 0, "review": 1, "ok": 2}
    rows.sort(key=lambda r: (order[r["状态"]], r["id(勿改)"]))

    OUT.parent.mkdir(parents=True, exist_ok=True)
    with OUT.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)

    lens = collections.Counter(len(e["nameZh"]) for e in seed)
    print(f"总条数：{len(seed)}")
    print(f"译名长度：最短 {min(lens)} / 最长 {max(lens)} / 平均 "
          f"{sum(len(e['nameZh']) for e in seed) / len(seed):.1f}")
    print(f"含序号：{sum(1 for e in seed if ORD.search(e['nameZh']))} 条")
    print(f"校对表分级：待补中文 {stats['english']} · 需确认 {stats['review']} · OK {stats['ok']}")
    print(f"已导出：{OUT}")
    print()
    if problems:
        print("校验未通过：")
        for p in problems:
            print("  ✗ " + p)
        return 1
    print("校验全部通过（零重名 / 无残名 / 无单字 / 序号健康 / 无英文残留）")
    return 0


if __name__ == "__main__":
    sys.exit(main())
