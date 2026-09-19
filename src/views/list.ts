import { el, clear } from "../core/dom";
import { createCard } from "../components/card";
import { iconEl } from "../components/icons";
import { filterCount, hasFilters, runSearch } from "../core/search";
import type { SearchDoc } from "../core/search";
import { setFilters, setSort, state, subscribe } from "../core/store";
import { back, navigate, takeListScroll } from "../router";
import type { Exercise, SortKey } from "../core/types";
import type { ThemeCtx } from "../core/theme";

const PAGE = 30;
const SORT_LABEL: Record<SortKey, string> = {
  relevance: "相关度",
  name: "名称",
  bodyPart: "部位",
};
const SORT_ORDER: SortKey[] = ["relevance", "name", "bodyPart"];

export interface ListCtx extends ThemeCtx {
  docs: SearchDoc[];
  labelOf: (key: string) => string;
}

export function renderList(ctx: ListCtx): HTMLElement {
  const input = el("input", {
    attrs: {
      type: "search",
      placeholder: "搜索动作、肌群或器械",
      "aria-label": "搜索动作",
      autocomplete: "off",
      enterkeyhint: "search",
    },
  });
  input.value = state.filters.q;

  const clearBtn = el(
    "button",
    {
      class: "search__clear",
      attrs: { type: "button", "aria-label": "清空搜索" },
      on: {
        click: () => {
          input.value = "";
          setFilters({ q: "" });
          input.focus();
        },
      },
    },
    iconEl("close"),
  );

  const activeRow = el("div", { class: "active-filters" });
  const countEl = el("span", { class: "result-bar__count" });
  const sortBtn = el(
    "button",
    { class: "sort-btn", attrs: { type: "button" } },
    iconEl("sort"),
    el("span"),
  );
  const listEl = el("div", { class: "cards", style: { padding: "0 16px" } });

  let shown = 0;
  let items: Exercise[] = [];
  let searchMs = 0;

  const sentinel = el("div", { style: { height: "1px" } });
  const moreIO = "IntersectionObserver" in window
    ? new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) renderMore();
      }, { rootMargin: "600px 0px" })
    : null;

  const screen = el(
    "div",
    { class: "screen" },
    el(
      "header",
      { class: "topbar", attrs: { "data-stuck": "false" } },
      el(
        "div",
        { class: "topbar__row" },
        el(
          "button",
          {
            class: "icon-btn",
            attrs: { type: "button", "aria-label": "返回" },
            on: { click: () => back() },
          },
          iconEl("chevronLeft"),
        ),
        el(
          "div",
          { class: "search", style: { marginTop: "0", flex: "1" } },
          iconEl("search", "search__icon"),
          input,
          clearBtn,
        ),
      ),
    ),
    activeRow,
    el("div", { class: "result-bar" }, countEl, sortBtn),
    listEl,
    sentinel,
  );

  input.addEventListener("input", () => setFilters({ q: input.value }));

  function renderMore(): void {
    const end = Math.min(items.length, shown + PAGE);
    const frag = document.createDocumentFragment();
    for (let i = shown; i < end; i++) {
      frag.appendChild(
        createCard(
          items[i],
          state.media,
          {
            bodyPart: ctx.labelOf(items[i].bodyPart),
            equipment: ctx.labelOf(items[i].equipment),
            target: ctx.labelOf(items[i].target),
          },
          (id) => navigate({ name: "detail", id }),
        ),
      );
    }
    listEl.appendChild(frag);
    shown = end;
    if (shown >= items.length) moreIO?.disconnect();
  }

  function renderFilters(): void {
    clear(activeRow);
    const entries: [string, string | null][] = [
      ["bodyPart", state.filters.bodyPart],
      ["equipment", state.filters.equipment],
      ["equipmentGroup", state.filters.equipmentGroup],
      ["target", state.filters.target],
    ];
    for (const [key, val] of entries) {
      if (!val) continue;
      activeRow.appendChild(
        el(
          "button",
          {
            class: "chip",
            attrs: { type: "button", "data-active": "true" },
            on: { click: () => setFilters({ [key]: null }) },
          },
          el("span", { text: ctx.labelOf(val) }),
          iconEl("close", "chip__x"),
        ),
      );
    }
    if (filterCount(state.filters) > 1) {
      activeRow.appendChild(
        el("button", {
          class: "chip",
          attrs: { type: "button" },
          text: "清空筛选",
          on: { click: () => setFilters({ bodyPart: null, equipment: null, equipmentGroup: null, target: null }) },
        }),
      );
    }
  }

  function renderSort(): void {
    const span = sortBtn.lastElementChild as HTMLElement;
    span.textContent = `按${SORT_LABEL[state.sort]}`;
    sortBtn.setAttribute("aria-label", `当前排序：${SORT_LABEL[state.sort]}，点击切换`);
  }

  function renderResults(): void {
    const res = runSearch(ctx.docs, state.filters, state.sort);
    items = res.items;
    searchMs = res.ms;
    shown = 0;
    clear(listEl);

    const n = items.length;
    countEl.innerHTML = hasFilters(state.filters)
      ? `共 <strong>${n}</strong> 个动作`
      : `全部 <strong>${n}</strong> 个动作`;

    if (n === 0) {
      listEl.appendChild(emptyState());
      moreIO?.disconnect();
      return;
    }
    renderMore();
    if (n > shown) moreIO?.observe(sentinel);
  }

  function emptyState(): HTMLElement {
    return el(
      "div",
      { class: "empty" },
      iconEl("empty", "empty__icon"),
      el("p", { class: "empty__title", text: "没有找到匹配的动作" }),
      el("p", {
        class: "empty__hint",
        text: state.filters.q ? "试试更短的关键词，或清除筛选条件" : "换个肌群或器械试试",
      }),
      el(
        "button",
        {
          class: "chip",
          style: { marginTop: "16px" },
          attrs: { type: "button" },
          on: {
            click: () => {
              input.value = "";
              setFilters({ q: "", bodyPart: null, equipment: null, equipmentGroup: null, target: null });
            },
          },
        },
        el("span", { text: "重置全部条件" }),
      ),
    );
  }

  sortBtn.addEventListener("click", () => {
    const i = SORT_ORDER.indexOf(state.sort);
    setSort(SORT_ORDER[(i + 1) % SORT_ORDER.length]);
  });

  // 顶部搜索栏吸附阴影
  const onScroll = () => {
    screen.querySelector(".topbar")?.setAttribute("data-stuck", String(window.scrollY > 4));
  };
  window.addEventListener("scroll", onScroll, { passive: true });

  const off = subscribe(() => {
    if (input.value !== state.filters.q) input.value = state.filters.q;
    renderFilters();
    renderSort();
    renderResults();
  });

  renderFilters();
  renderSort();
  renderResults();

  screen.addEventListener("fitflex:leave", (() => {
    off();
    window.removeEventListener("scroll", onScroll);
    moreIO?.disconnect();
  }) as EventListener);

  // 从详情返回时恢复滚动位置
  requestAnimationFrame(() => {
    const y = takeListScroll();
    if (y > 0) window.scrollTo({ top: y, behavior: "instant" as ScrollBehavior });
    else if (!state.filters.q) input.focus({ preventScroll: true });
  });

  void searchMs;
  return screen;
}
