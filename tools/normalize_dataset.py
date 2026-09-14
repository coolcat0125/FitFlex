"""把原始 17MB 多语言数据集归一化成精简种子文件。

原始数据：data/raw/exercises.json（10 种语言说明，17MB）
产物：data/exercises.seed.json（只保留中英，作为译名流水线的稳定基线）

注意：种子文件是流水线的唯一输入基线。任何下游脚本都不得在成品上二次加工。
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "tools" / ".cache" / "exercises.json"
SEED = ROOT / "data" / "exercises.seed.json"
VOCAB = ROOT / "tools" / ".cache" / "vocab.txt"


def main() -> int:
    if not RAW.exists():
        print(f"错误：找不到原始数据集 {RAW}")
        print("请先执行：curl -sL -o tools/.cache/exercises.json \\")
        print("  https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/data/exercises.json")
        return 2

    raw = json.loads(RAW.read_text(encoding="utf-8"))
    seed = []

    for r in raw:
        steps = r.get("instruction_steps", {}) or {}
        instr = r.get("instructions", {}) or {}
        seed.append(
            {
                "id": r["id"],
                "name": r["name"],
                "nameZh": "",
                "bodyPart": r.get("body_part", ""),
                "equipment": r.get("equipment", ""),
                "target": r.get("target", ""),
                "muscleGroup": r.get("muscle_group", ""),
                "secondaryMuscles": r.get("secondary_muscles", []) or [],
                "image": r.get("image", ""),
                "gif": r.get("gif_url", ""),
                "stepsZh": steps.get("zh", []) or [],
                "stepsEn": steps.get("en", []) or [],
                "descZh": instr.get("zh", "") or "",
                "descEn": instr.get("en", "") or "",
                "attribution": r.get("attribution", ""),
            }
        )

    seed.sort(key=lambda e: e["id"])
    SEED.parent.mkdir(parents=True, exist_ok=True)
    SEED.write_text(json.dumps(seed, ensure_ascii=False, indent=1), encoding="utf-8")

    # 导出词汇表，供人工构建词典
    import collections
    import re

    words = collections.Counter()
    for e in seed:
        norm = e["name"].lower().replace("-", " ").replace("/", " ")
        for w in re.split(r"[^a-z]+", norm):
            if w:
                words[w] += 1
    lines = [f"{w}\t{c}" for w, c in words.most_common()]
    VOCAB.write_text("\n".join(lines), encoding="utf-8")

    size_mb = SEED.stat().st_size / 1024 / 1024
    missing_zh = sum(1 for e in seed if not e["stepsZh"])
    print(f"种子文件：{SEED}")
    print(f"  记录数：{len(seed)}")
    print(f"  体积：{size_mb:.2f} MB")
    print(f"  缺中文步骤：{missing_zh} 条")
    print(f"  词汇表：{VOCAB}（{len(words)} 个词）")
    return 0


if __name__ == "__main__":
    sys.exit(main())
