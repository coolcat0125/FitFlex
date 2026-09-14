import type { Detail, Exercise, Facets, IndexData, Meta, Row } from "./types";

/** 数据文件相对站点根解析，兼容子目录部署 */
function url(path: string): string {
  return new URL(`data/${path}`, document.baseURI).href;
}

let indexPromise: Promise<{ list: Exercise[]; media: string }> | null = null;
let facetsPromise: Promise<Facets> | null = null;
let metaPromise: Promise<Meta> | null = null;

const detailCache = new Map<string, Promise<Map<string, Detail>>>();

function toExercise(r: Row): Exercise {
  return {
    id: r[0],
    zh: r[1],
    en: r[2],
    bodyPart: r[3],
    equipment: r[4],
    equipmentGroup: r[5],
    target: r[6],
    image: r[7],
  };
}

/** 精简索引：首屏唯一必须等待的数据，其余全部按需 */
export function loadIndex(): Promise<{ list: Exercise[]; media: string }> {
  if (!indexPromise) {
    indexPromise = fetch(url("index.json"))
      .then((r) => {
        if (!r.ok) throw new Error(`index.json ${r.status}`);
        return r.json() as Promise<IndexData>;
      })
      .then((d) => ({ list: d.rows.map(toExercise), media: d.media }));
  }
  return indexPromise;
}

export function loadFacets(): Promise<Facets> {
  if (!facetsPromise) {
    facetsPromise = fetch(url("facets.json")).then((r) => {
      if (!r.ok) throw new Error(`facets.json ${r.status}`);
      return r.json() as Promise<Facets>;
    });
  }
  return facetsPromise;
}

export function loadMeta(): Promise<Meta> {
  if (!metaPromise) {
    metaPromise = fetch(url("meta.json")).then((r) => {
      if (!r.ok) throw new Error(`meta.json ${r.status}`);
      return r.json() as Promise<Meta>;
    });
  }
  return metaPromise;
}

/** 详情分片按 id 前两位切分，只在真正打开详情页时才拉取 */
export function loadDetail(id: string): Promise<Detail | undefined> {
  const shard = id.slice(0, 2);
  let p = detailCache.get(shard);
  if (!p) {
    p = fetch(url(`detail/${shard}.json`))
      .then((r) => {
        if (!r.ok) throw new Error(`detail/${shard}.json ${r.status}`);
        return r.json() as Promise<Detail[]>;
      })
      .then((list) => new Map(list.map((d) => [d.i, d])));
    detailCache.set(shard, p);
  }
  return p.then((m) => m.get(id));
}

/** 缩略图与 GIF 走 CDN，拼出完整地址 */
export function mediaUrl(base: string, path: string): string {
  if (!path) return "";
  return base + path;
}
