"""把译名成品切成前端可直接消费的静态数据集。

产物（public/data/）：
  index.json        精简检索索引（列式存储，供本地即时检索）
  facets.json       四个筛选维度的聚合计数
  detail/{sh}.json  详情分片，按 id 前两位分片，按需加载

媒体不落仓库：图片与 GIF 走 jsDelivr 引用上游数据集仓库，
缩略图约 6KB、GIF 约 90KB，GIF 仅在详情页按需拉取。
"""

from __future__ import annotations

import collections
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SEED = ROOT / "data" / "exercises.seed.json"
OUT = ROOT / "public" / "data"

CDN = "https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/"
ATTRIBUTION = "© Gym visual — https://gymvisual.com/"

# 索引列定义（列式存储比对象数组小约 40%）
COLS = ["i", "z", "e", "b", "q", "g", "t", "m"]


def main() -> int:
    if not SEED.exists():
        print(f"错误：找不到译名成品 {SEED}")
        return 2

    seed = json.loads(SEED.read_text(encoding="utf-8"))
    OUT.mkdir(parents=True, exist_ok=True)

    # ---- 检索索引 ----
    rows = [
        [e["id"], e["nameZh"], e["name"], e["bodyPart"], e["equipment"],
         e["equipmentGroup"], e["target"], e["image"]]
        for e in seed
    ]
    index = {"cols": COLS, "media": CDN, "rows": rows}
    (OUT / "index.json").write_text(
        json.dumps(index, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
    )

    # ---- 维度聚合 ----
    def agg(field: str, zh_field: str) -> list[dict]:
        pairs = collections.Counter(
            (e[field], e[zh_field]) for e in seed
        )
        items = [{"key": k, "zh": zh, "count": c} for (k, zh), c in pairs.items()]
        items.sort(key=lambda x: -x["count"])
        return items

    facets = {
        "bodyPart": agg("bodyPart", "bodyPartZh"),
        "equipment": agg("equipment", "equipmentZh"),
        "equipmentGroup": agg("equipmentGroup", "equipmentGroup"),
        "target": agg("target", "targetZh"),
    }
    (OUT / "facets.json").write_text(
        json.dumps(facets, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
    )

    # ---- 详情分片 ----
    detail_dir = OUT / "detail"
    if detail_dir.exists():
        for old in detail_dir.glob("*.json"):
            old.unlink()
    detail_dir.mkdir(parents=True, exist_ok=True)

    shards: dict[str, list[dict]] = collections.defaultdict(list)
    for e in seed:
        shards[e["id"][:2]].append({
            "i": e["id"],
            "z": e["nameZh"],
            "e": e["name"],
            "b": e["bodyPartZh"],
            "q": e["equipmentZh"],
            "g": e["equipmentGroup"],
            "t": e["targetZh"],
            "mg": e["muscleGroupZh"],
            "sm": e["secondaryMusclesZh"],
            "st": e["stepsZh"],
            "ds": e["descZh"],
            "im": e["image"],
            "gf": e["gif"],
        })

    for sh, items in shards.items():
        (detail_dir / f"{sh}.json").write_text(
            json.dumps(items, ensure_ascii=False, separators=(",", ":")),
            encoding="utf-8",
        )

    # ---- 元信息 ----
    meta = {
        "count": len(seed),
        "media": CDN,
        "attribution": ATTRIBUTION,
        "source": "https://github.com/hasaneyldrm/exercises-dataset",
        "shards": sorted(shards.keys()),
    }
    (OUT / "meta.json").write_text(
        json.dumps(meta, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
    )

    def kb(p: Path) -> str:
        return f"{p.stat().st_size / 1024:.0f}KB"

    total_detail = sum(p.stat().st_size for p in detail_dir.glob("*.json"))
    print(f"记录数：{len(seed)}")
    print(f"  index.json        {kb(OUT / 'index.json')}")
    print(f"  facets.json       {kb(OUT / 'facets.json')}")
    print(f"  meta.json         {kb(OUT / 'meta.json')}")
    print(f"  detail/           {len(shards)} 个分片，合计 {total_detail / 1024:.0f}KB")
    print(f"  媒体 CDN          {CDN}")
    print(f"  署名              {ATTRIBUTION}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
