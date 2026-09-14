export type Route =
  | { name: "home" }
  | { name: "list" }
  | { name: "favorites" }
  | { name: "detail"; id: string }
  | { name: "plans" }
  | { name: "plan"; id: string }
  | { name: "strength" }
  | { name: "me" };

export type TabKey = "exercises" | "plans" | "strength" | "me";

type Handler = (r: Route) => void;

const handlers = new Set<Handler>();

export function onRoute(fn: Handler): void {
  handlers.add(fn);
}

/** 路由 → hash。集中在这里，避免 navigate 里堆一长串三元表达式。 */
export function hashOf(to: Route): string {
  switch (to.name) {
    case "home":
      return "#/";
    case "list":
      return "#/list";
    case "favorites":
      return "#/fav";
    case "detail":
      return `#/e/${encodeURIComponent(to.id)}`;
    case "plans":
      return "#/plans";
    case "plan":
      return `#/p/${encodeURIComponent(to.id)}`;
    case "strength":
      return "#/strength";
    case "me":
      return "#/me";
  }
}

export function parseHash(): Route {
  const h = location.hash.replace(/^#\/?/, "");
  const [head, arg] = h.split("/");
  switch (head) {
    case "list":
      return { name: "list" };
    case "fav":
      return { name: "favorites" };
    case "e":
      return arg ? { name: "detail", id: decodeURIComponent(arg) } : { name: "home" };
    case "plans":
      return { name: "plans" };
    case "p":
      return arg ? { name: "plan", id: decodeURIComponent(arg) } : { name: "plans" };
    case "strength":
      return { name: "strength" };
    case "me":
      return { name: "me" };
    default:
      return { name: "home" };
  }
}

/** 该路由属于哪个底部 Tab（用于高亮） */
export function tabOf(r: Route): TabKey {
  switch (r.name) {
    case "plans":
    case "plan":
      return "plans";
    case "strength":
      return "strength";
    case "me":
    case "favorites":
      return "me";
    default:
      return "exercises";
  }
}

/**
 * 详情类页面（动作详情、计划详情）是沉浸式的，且自带底部操作栏，
 * 与 Tab 栏会叠在一起，所以不显示。
 */
export function showsTabbar(r: Route): boolean {
  return r.name !== "detail" && r.name !== "plan";
}

export function navigate(to: Route, replace = false): void {
  const hash = hashOf(to);
  if (location.hash === hash) {
    dispatch();
    return;
  }
  if (replace) history.replaceState(null, "", hash);
  else history.pushState(null, "", hash);
  dispatch();
}

export function back(): void {
  if (history.length > 1) history.back();
  else navigate({ name: "home" }, true);
}

function dispatch(): void {
  const r = parseHash();
  for (const fn of handlers) fn(r);
}

export function startRouter(): void {
  window.addEventListener("hashchange", dispatch);
  window.addEventListener("popstate", dispatch);
  dispatch();
}

/** 记录列表页滚动位置，从详情返回时恢复 */
let listScroll = 0;

export function saveListScroll(y: number): void {
  listScroll = y;
}

export function takeListScroll(): number {
  const y = listScroll;
  listScroll = 0;
  return y;
}
