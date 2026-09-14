export type Row = [
  id: string,
  zh: string,
  en: string,
  bodyPart: string,
  equipment: string,
  equipmentGroup: string,
  target: string,
  image: string,
];

export interface IndexData {
  cols: string[];
  media: string;
  rows: Row[];
}

export interface Exercise {
  id: string;
  zh: string;
  en: string;
  bodyPart: string;
  equipment: string;
  equipmentGroup: string;
  target: string;
  image: string;
}

export interface Facet {
  key: string;
  zh: string;
  count: number;
}

export interface Facets {
  bodyPart: Facet[];
  equipment: Facet[];
  equipmentGroup: Facet[];
  target: Facet[];
}

export interface Detail {
  i: string;
  z: string;
  e: string;
  b: string;
  q: string;
  g: string;
  t: string;
  mg: string;
  sm: string[];
  st: string[];
  ds: string;
  im: string;
  gf: string;
}

export interface Meta {
  count: number;
  media: string;
  attribution: string;
  source: string;
  shards: string[];
}

export interface Filters {
  q: string;
  bodyPart: string | null;
  equipment: string | null;
  equipmentGroup: string | null;
  target: string | null;
}

export type SortKey = "relevance" | "name" | "bodyPart";

export const EMPTY_FILTERS: Filters = {
  q: "",
  bodyPart: null,
  equipment: null,
  equipmentGroup: null,
  target: null,
};
