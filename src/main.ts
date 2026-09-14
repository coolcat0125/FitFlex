import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/modules.css";

import { loadFacets, loadIndex, loadMeta } from "./core/dataset";
import { buildDocs, buildLabelMap } from "./core/search";
import type { SearchDoc } from "./core/search";
import { el } from "./core/dom";
import { iconEl } from "./components/icons";
import { emit, state } from "./core/store";
import { onRoute, showsTabbar, startRouter } from "./router";
import type { Route } from "./router";
import { createTabbar } from "./components/tabbar";
import { renderHome } from "./views/home";
import { renderList } from "./views/list";
import { renderDetail } from "./views/detail";
import { renderFavorites } from "./views/favorites";
import { renderPlans } from "./views/plans";
import { renderPlanDetail } from "./views/planDetail";
import { renderStrength } from "./views/strength";
import { renderMe } from "./views/me";
import { assertTemplateIds } from "./core/plan";

const root = document.getElementById("app")!;
const THEME_KEY = "fitflex:theme";

/* ------------------------------- 主题 ------------------------------- */

function currentTheme(): "dark" | "light" {
  // 深色是默认外观；仅在用户显式切换过之后才读存档
  const saved = localStorage.getItem(THEME_KEY);
  return saved === "light" ? "light" : "dark";
}

function applyTheme(t: "dark" | "light"): void {
  document.documentElement.setAttribute("data-theme", t);
}

function toggleTheme(): void {
  const next = currentTheme() === "dark" ? "light" : "dark";
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
  emit();
}

applyTheme(currentTheme());

/* ------------------------------- 启动 ------------------------------- */

const themeCtx = { toggleTheme, theme: currentTheme };

function bootError(msg: string, retry: () => void): void {
  root.replaceChildren(
    el(
      "div",
      { class: "empty", style: { paddingTop: "30vh" } },
      iconEl("alert", "empty__icon"),
      el("p", { class: "empty__title", text: "数据加载失败" }),
      el("p", { class: "empty__hint", text: msg }),
      el(
        "button",
        { class: "chip", style: { marginTop: "16px" }, attrs: { type: "button" }, on: { click: retry } },
        el("span", { text: "重试" }),
      ),
    ),
  );
}

function showSkeleton(): void {
  const cards = el("div", { class: "cards", style: { padding: "0 16px" } });
  for (let i = 0; i < 6; i++) {
    cards.appendChild(
      el(
        "div",
        { class: "skel-card" },
        el("div", { class: "skel skel-card__thumb" }),
        el(
          "div",
          { style: { flex: "1", display: "flex", flexDirection: "column", gap: "8px" } },
          el("div", { class: "skel", style: { height: "14px", width: "58%" } }),
          el("div", { class: "skel", style: { height: "11px", width: "34%" } }),
        ),
      ),
    );
  }
  root.replaceChildren(
    el(
      "div",
      { class: "app" },
      el(
        "header",
        { class: "topbar" },
        el(
          "div",
          { class: "topbar__row" },
            el(
              "div",
              { class: "brand" },
              iconEl("dumbbell", "brand__mark"),
              el("span", { class: "brand__name", html: "Fit<em>Flex</em>" }),
            ),
        ),
        el("div", { class: "search" }, el("div", { class: "skel", style: { height: "16px", width: "100%" } })),
      ),
      el("div", { class: "section" }, cards),
    ),
  );
}

let docs: SearchDoc[] = [];
let labels = new Map<string, string>();

function labelOf(key: string): string {
  return labels.get(key) ?? key;
}

function render(route: Route): void {
  const tabbed = showsTabbar(route);
  const shell = el("div", { class: tabbed ? "app app--tabbed" : "app" });

  // 让上一个页面释放订阅与监听
  const prev = root.querySelector(".screen");
  prev?.dispatchEvent(new Event("fitflex:leave"));

  let view: HTMLElement;
  switch (route.name) {
    case "list":
      view = renderList({ docs, labelOf, ...themeCtx });
      break;
    case "favorites":
      view = renderFavorites({ labelOf });
      break;
    case "detail":
      view = renderDetail(route.id);
      break;
    case "plans":
      view = renderPlans();
      break;
    case "plan":
      view = renderPlanDetail(route.id);
      break;
    case "strength":
      view = renderStrength();
      break;
    case "me":
      view = renderMe({ labelOf, ...themeCtx });
      break;
    default:
      view = renderHome({ labelOf, ...themeCtx });
  }

  shell.appendChild(view);
  if (tabbed) shell.appendChild(createTabbar(route));
  root.replaceChildren(shell);
  window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
}

async function boot(): Promise<void> {
  showSkeleton();
  try {
    const [idx, facets, meta] = await Promise.all([loadIndex(), loadFacets(), loadMeta()]);
    state.list = idx.list;
    state.byId = new Map(idx.list.map((e) => [e.id, e]));
    state.media = idx.media;
    state.facets = facets;
    state.meta = meta;
    labels = buildLabelMap(facets);
    docs = buildDocs(idx.list, labels);

    // 模板引用的动作 id 必须存在，否则点开计划会是空白行
    const bad = assertTemplateIds((id) => state.byId.has(id));
    if (bad.length) console.warn("[FitFlex] 训练计划引用了不存在的动作：", bad);

    state.ready = true;
    startRouter();
  } catch (err) {
    bootError(err instanceof Error ? err.message : String(err), () => {
      location.reload();
    });
  }
}

onRoute(render);
void boot();

/* --------------------------- Service Worker --------------------------- */

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(new URL("sw.js", document.baseURI).href).catch(() => {
      /* 离线能力是增强项，注册失败不影响使用 */
    });
  });
}
