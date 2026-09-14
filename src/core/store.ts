import type { Exercise, Facets, Filters, Meta, SortKey } from "./types";
import { EMPTY_FILTERS } from "./types";

type Listener = () => void;

export interface State {
  ready: boolean;
  error: string | null;
  list: Exercise[];
  /** id → 动作，训练计划按 id 取名字时用 */
  byId: Map<string, Exercise>;
  media: string;
  facets: Facets | null;
  meta: Meta | null;
  filters: Filters;
  sort: SortKey;
  favorites: Set<string>;
}

const FAV_KEY = "fitflex:favorites";

function readFavorites(): Set<string> {
  try {
    const raw = localStorage.getItem(FAV_KEY);
    return new Set<string>(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set<string>();
  }
}

export const state: State = {
  ready: false,
  error: null,
  list: [],
  byId: new Map(),
  media: "",
  facets: null,
  meta: null,
  filters: { ...EMPTY_FILTERS },
  sort: "relevance",
  favorites: readFavorites(),
};

const listeners = new Set<Listener>();

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function emit(): void {
  for (const fn of listeners) fn();
}

export function setFilters(patch: Partial<Filters>): void {
  state.filters = { ...state.filters, ...patch };
  emit();
}

export function toggleFilter(key: keyof Filters, value: string): void {
  const cur = state.filters[key];
  setFilters({ [key]: cur === value ? null : value } as Partial<Filters>);
}

export function clearFilters(): void {
  state.filters = { ...EMPTY_FILTERS };
  emit();
}

export function setSort(sort: SortKey): void {
  state.sort = sort;
  emit();
}

export function toggleFavorite(id: string): void {
  if (state.favorites.has(id)) state.favorites.delete(id);
  else state.favorites.add(id);
  try {
    localStorage.setItem(FAV_KEY, JSON.stringify([...state.favorites]));
  } catch {
    /* 隐私模式下写入失败可忽略 */
  }
  emit();
}

export function isFavorite(id: string): boolean {
  return state.favorites.has(id);
}
