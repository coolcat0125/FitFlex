import { el } from "../core/dom";
import { mediaUrl } from "../core/dataset";
import { createBodyMap } from "../components/bodymap";
import { createCard } from "../components/card";
import { iconEl } from "../components/icons";
import { pickFeatured } from "../core/search";
import { state, setFilters, toggleFilter, subscribe } from "../core/store";
import { navigate } from "../router";
import type { Exercise } from "../core/types";
import type { ThemeCtx } from "../core/theme";

export interface HomeCtx extends ThemeCtx {
  labelOf: (key: string) => string;
}

export function renderHome(ctx: HomeCtx): HTMLElement {
  const searchInput = el("input", {
    attrs: {
      type: "search",
      placeholder: "搜索动作、肌群或器械",
      "aria-label": "搜索动作",
      autocomplete: "off",
      enterkeyhint: "search",
    },
    on: {
      input: () => {
        setFilters({ q: searchInput.value });
        navigate({ name: "list" });
      },
    },
  });

  const bodyMap = createBodyMap(
    state.filters.bodyPart,
    state.facets?.bodyPart ?? [],
    (part) => {
      // 不跳转：留在首页，人体图保持可见，方便连续点几个部位对比。
      // 想看成列表时，下方结果区有「查看全部 N 个」入口。
      setFilters({ bodyPart: part });
    },
  );

  const groupChips = el("div", { class: "chips chips--scroll" });
  const featured = el("div", { class: "cards" });
  const featuredTitle = el("h2", { class: "section__title", text: "推荐动作" });
  const featuredHint = el("span", { class: "section__hint", text: "" });
  const featuredAction = el("button", {
    class: "section__action",
    attrs: { type: "button" },
    text: "全部",
    on: { click: () => navigate({ name: "list" }) },
  });

  const screen = el(
    "div",
    { class: "screen" },
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
        el("div", { class: "topbar__spacer" }),
        themeButton(ctx),
        el(
          "button",
          {
            class: "icon-btn",
            attrs: { type: "button", "aria-label": "我的收藏" },
            on: { click: () => navigate({ name: "favorites" }) },
          },
          iconEl("star"),
        ),
      ),
      el(
        "div",
        { class: "search" },
        iconEl("search", "search__icon"),
        searchInput,
      ),
    ),
    el(
      "section",
      { class: "section" },
      el(
        "div",
        { class: "section__head" },
        el("h2", { class: "section__title", text: "按肌群浏览" }),
        el("span", { class: "section__hint", text: "点击人体或部位" }),
      ),
      bodyMap.node,
    ),
    el(
      "section",
      { class: "section" },
      el(
        "div",
        { class: "section__head" },
        el("h2", { class: "section__title", text: "按类型" }),
      ),
      groupChips,
    ),
    el(
      "section",
      { class: "section" },
      el(
        "div",
        { class: "section__head" },
        el("div", { class: "section__lead" }, featuredTitle, featuredHint),
        featuredAction,
      ),
      featured,
    ),
  );

  // 器械大类
  const groups = state.facets?.equipmentGroup ?? [];
  for (const g of groups) {
    const active = state.filters.equipmentGroup === g.key;
    groupChips.appendChild(
      el(
        "button",
        {
          class: "chip",
          attrs: { type: "button", "data-active": active },
          on: {
            click: () => {
              toggleFilter("equipmentGroup", g.key);
              navigate({ name: "list" });
            },
          },
        },
        el("span", { text: g.zh }),
        el("span", { class: "chip__count", text: String(g.count) }),
      ),
    );
  }

  /**
   * 结果区：没选部位时显示推荐，选了部位就换成该肌群的动作。
   * 与人体图同屏，选完可以直接点下一个部位继续看，不用来回跳页。
   */
  function paintFeatured(): void {
    const part = state.filters.bodyPart;
    const pool = part
      ? state.list.filter((e) => e.bodyPart === part)
      : pickFeatured(state.list, 6);
    const picks = part ? pool.slice(0, 6) : pool;

    featuredTitle.textContent = part ? ctx.labelOf(part) : "推荐动作";
    featuredHint.textContent = part ? `${pool.length} 个动作` : "";
    featuredAction.textContent = part ? `查看全部 ${pool.length} 个` : "全部";

    featured.replaceChildren(...picks.map((e) => cardFor(e, ctx)));
    if (!picks.length) {
      featured.appendChild(
        el(
          "div",
          { class: "empty empty--compact" },
          el("p", { class: "empty__hint", text: "这个部位暂时没有动作" }),
        ),
      );
    }
  }

  paintFeatured();

  const off = subscribe(() => {
    bodyMap.update(state.filters.bodyPart);
    paintFeatured();
  });
  screen.addEventListener("fitflex:leave", off as EventListener);

  return screen;
}

function cardFor(e: Exercise, ctx: HomeCtx): HTMLElement {
  return createCard(
    e,
    state.media,
    {
      bodyPart: ctx.labelOf(e.bodyPart),
      equipment: ctx.labelOf(e.equipment),
      target: ctx.labelOf(e.target),
    },
    (id) => navigate({ name: "detail", id }),
  );
}

export function themeButton(ctx: HomeCtx): HTMLElement {
  const btn = el("button", {
    class: "icon-btn",
    attrs: { type: "button", "aria-label": "切换主题" },
    on: { click: ctx.toggleTheme },
  });
  const paint = () => {
    btn.replaceChildren(iconEl(ctx.isDark() ? "sun" : "moon"));
  };
  paint();
  btn.addEventListener("click", paint);
  return btn;
}

/** 缩略图地址拼装（详情页也用） */
export function thumbFor(image: string): string {
  return mediaUrl(state.media, image);
}
