import type { Exercise, Facets, Filters, SortKey } from "./types";

/** 归一化：小写、去空白与常见分隔符，让「卧推」和「卧 推」等价 */
function norm(s: string): string {
  return s.toLowerCase().replace(/[\s\-_/.·（）()]+/g, "");
}

export interface SearchDoc {
  e: Exercise;
  zh: string;
  en: string;
  tags: string;
}

/** 用维度中文名把索引里的英文 key 映射成中文，让「胸部」「哑铃」可被搜到 */
export function buildLabelMap(facets: Facets): Map<string, string> {
  const m = new Map<string, string>();
  for (const group of [facets.bodyPart, facets.equipment, facets.target]) {
    for (const f of group) m.set(f.key, f.zh);
  }
  return m;
}

export function buildDocs(list: Exercise[], labels: Map<string, string>): SearchDoc[] {
  return list.map((e) => {
    const bodyPart = labels.get(e.bodyPart) ?? "";
    const equipment = labels.get(e.equipment) ?? "";
    const target = labels.get(e.target) ?? "";
    return {
      e,
      zh: norm(e.zh),
      en: norm(e.en),
      tags: norm(`${bodyPart}${equipment}${target}${e.equipmentGroup}`),
    };
  });
}

function scoreDoc(d: SearchDoc, q: string): number {
  let s = 0;
  if (d.zh === q) s += 1200;
  else if (d.zh.startsWith(q)) s += 900;
  else if (d.zh.includes(q)) s += 700;

  if (d.en.startsWith(q)) s += 520;
  else if (d.en.includes(q)) s += 400;

  if (d.tags.includes(q)) s += 200;

  // 越短的名字越可能是精确命中
  if (s > 0) s += Math.max(0, 60 - d.zh.length * 3);
  return s;
}

export function hasFilters(f: Filters): boolean {
  return Boolean(
    f.q.trim() || f.bodyPart || f.equipment || f.equipmentGroup || f.target,
  );
}

export function filterCount(f: Filters): number {
  return [f.bodyPart, f.equipment, f.equipmentGroup, f.target].filter(Boolean).length;
}

export interface SearchResult {
  items: Exercise[];
  ms: number;
}

export function runSearch(
  docs: SearchDoc[],
  filters: Filters,
  sort: SortKey,
): SearchResult {
  const t0 = performance.now();
  const q = norm(filters.q.trim());

  let out: { e: Exercise; score: number }[] = [];

  for (const d of docs) {
    const e = d.e;
    if (filters.bodyPart && e.bodyPart !== filters.bodyPart) continue;
    if (filters.equipment && e.equipment !== filters.equipment) continue;
    if (filters.equipmentGroup && e.equipmentGroup !== filters.equipmentGroup) continue;
    if (filters.target && e.target !== filters.target) continue;

    if (!q) {
      out.push({ e, score: 0 });
      continue;
    }
    const s = scoreDoc(d, q);
    if (s > 0) out.push({ e, score: s });
  }

  if (sort === "relevance" && q) {
    out.sort((a, b) => b.score - a.score || a.e.zh.localeCompare(b.e.zh, "zh"));
  } else if (sort === "name") {
    out.sort((a, b) => a.e.zh.localeCompare(b.e.zh, "zh"));
  } else if (sort === "bodyPart") {
    out.sort(
      (a, b) =>
        a.e.bodyPart.localeCompare(b.e.bodyPart) ||
        a.e.zh.localeCompare(b.e.zh, "zh"),
    );
  }

  return { items: out.map((x) => x.e), ms: performance.now() - t0 };
}

/** 首页推荐：优先徒手与热门器械，兼顾各部位覆盖 */
export function pickFeatured(list: Exercise[], n: number): Exercise[] {
  const byBody = new Map<string, Exercise[]>();
  for (const e of list) {
    const arr = byBody.get(e.bodyPart);
    if (arr) arr.push(e);
    else byBody.set(e.bodyPart, [e]);
  }
  const parts = [...byBody.keys()].sort((a, b) => {
    const rank = (k: string) => (k === "chest" ? 0 : k === "back" ? 1 : k === "upper legs" ? 2 : 3);
    return rank(a) - rank(b);
  });

  const out: Exercise[] = [];
  let i = 0;
  while (out.length < n && parts.length) {
    for (const p of parts) {
      const arr = byBody.get(p)!;
      if (arr[i]) out.push(arr[i]);
      if (out.length >= n) break;
    }
    i++;
    if (i > 40) break;
  }
  return out;
}
