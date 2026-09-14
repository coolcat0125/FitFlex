import { el } from "../core/dom";
import { createCard } from "../components/card";
import { iconEl } from "../components/icons";
import { state, subscribe } from "../core/store";
import { back, navigate } from "../router";

export interface FavCtx {
  labelOf: (key: string) => string;
}

export function renderFavorites(ctx: FavCtx): HTMLElement {
  const listEl = el("div", { class: "cards", style: { padding: "0 16px" } });

  const screen = el(
    "div",
    { class: "screen page-enter" },
    el(
      "header",
      { class: "topbar" },
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
        el("div", { class: "section__title", style: { flex: "1" }, text: "我的收藏" }),
      ),
    ),
    listEl,
  );

  function render(): void {
    listEl.replaceChildren();
    const favs = state.list.filter((e) => state.favorites.has(e.id));
    if (!favs.length) {
      listEl.appendChild(
        el(
          "div",
          { class: "empty" },
          iconEl("star", "empty__icon"),
          el("p", { class: "empty__title", text: "还没有收藏动作" }),
          el("p", { class: "empty__hint", text: "在动作详情页点底部星标即可收藏" }),
          el(
            "button",
            {
              class: "chip",
              style: { marginTop: "16px" },
              attrs: { type: "button" },
              on: { click: () => navigate({ name: "home" }) },
            },
            el("span", { text: "去逛逛动作库" }),
          ),
        ),
      );
      return;
    }
    for (const e of favs) {
      listEl.appendChild(
        createCard(
          e,
          state.media,
          {
            bodyPart: ctx.labelOf(e.bodyPart),
            equipment: ctx.labelOf(e.equipment),
            target: ctx.labelOf(e.target),
          },
          (id) => navigate({ name: "detail", id }),
        ),
      );
    }
  }

  render();
  const off = subscribe(render);
  screen.addEventListener("fitflex:leave", off as EventListener);
  return screen;
}
