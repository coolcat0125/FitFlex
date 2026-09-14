import { el, clear } from "../core/dom";
import { loadDetail, mediaUrl } from "../core/dataset";
import { iconEl } from "../components/icons";
import { state, toggleFavorite, isFavorite, subscribe } from "../core/store";
import { back, saveListScroll } from "../router";
import type { Detail } from "../core/types";

export function renderDetail(id: string): HTMLElement {
  const barTitle = el("div", { class: "detail__bar-title" });
  const mediaSlot = el("div", { class: "media" }, el("div", { class: "skel", style: { width: "100%", height: "100%" } }));
  const body = el("div");

  const favBtn = el("button", {
    class: "btn btn--ghost",
    attrs: { type: "button", "aria-label": "收藏" },
    on: { click: () => toggleFavorite(id) },
  });
  const paintFav = () => {
    const on = isFavorite(id);
    favBtn.setAttribute("data-on", String(on));
    favBtn.setAttribute("aria-label", on ? "取消收藏" : "收藏");
    favBtn.replaceChildren(iconEl(on ? "starFill" : "star"));
  };

  const playBtn = el(
    "button",
    {
      class: "btn btn--primary",
      attrs: { type: "button" },
      on: {
        click: () => {
          mediaSlot.scrollIntoView({ behavior: "smooth", block: "center" });
          play();
        },
      },
    },
    iconEl("play"),
    el("span", { text: "播放演示" }),
  );
  let play: () => void = () => {};

  const screen = el(
    "div",
    { class: "screen page-enter" },
    el(
      "div",
      { class: "detail__bar" },
      el(
        "button",
        {
          class: "icon-btn",
          attrs: { type: "button", "aria-label": "返回" },
          on: {
            click: () => {
              back();
            },
          },
        },
        iconEl("chevronLeft"),
      ),
      barTitle,
      el(
        "button",
        {
          class: "icon-btn",
          attrs: { type: "button", "aria-label": "分享" },
          on: {
            click: () => {
              void share(id);
            },
          },
        },
        iconEl("share"),
      ),
    ),
    mediaSlot,
    body,
    el("div", { class: "detail__actions" }, playBtn, favBtn),
  );

  paintFav();

  loadDetail(id)
    .then((d) => {
      if (!d) {
        clear(body);
        body.appendChild(
          el(
            "div",
            { class: "empty" },
            iconEl("alert", "empty__icon"),
            el("p", { class: "empty__title", text: "没有找到这个动作" }),
            el("p", { class: "empty__hint", text: "数据可能已更新，请返回重试" }),
          ),
        );
        return;
      }
      barTitle.textContent = d.z;
      play = renderMedia(mediaSlot, d);
      renderBody(body, d);
    })
    .catch(() => {
      clear(body);
      body.appendChild(
        el(
          "div",
          { class: "empty" },
          iconEl("alert", "empty__icon"),
          el("p", { class: "empty__title", text: "加载失败" }),
          el("p", { class: "empty__hint", text: "请检查网络后重试" }),
        ),
      );
    });

  const onScroll = () => barTitle.setAttribute("data-show", String(window.scrollY > 90));
  window.addEventListener("scroll", onScroll, { passive: true });

  const off = subscribe(paintFav);
  screen.addEventListener("fitflex:leave", (() => {
    off();
    window.removeEventListener("scroll", onScroll);
    saveListScroll(window.scrollY);
  }) as EventListener);

  return screen;
}

/** 渲染静态图解 + 点击/按钮触发 GIF 演示，返回「播放演示」的触发函数 */
function renderMedia(slot: HTMLElement, d: Detail): () => void {
  const img = el("img", {
    attrs: { alt: `${d.z} 动作图解`, decoding: "async" },
  });
  img.src = mediaUrl(state.media, d.im);

  const paintBadge = (text: string) => {
    slot.appendChild(el("span", { class: "media__badge", text }));
    slot.appendChild(el("span", { class: "media__note", text: "© Gym visual" }));
  };

  slot.replaceChildren(img);
  paintBadge(d.gf ? "点击看演示" : "动作图解");
  slot.classList.toggle("media--btn", Boolean(d.gf));
  if (d.gf) {
    slot.setAttribute("role", "button");
    slot.setAttribute("tabindex", "0");
    slot.setAttribute("aria-label", "加载动作演示动画");
  }

  let playing = false;
  const load = () => {
    if (!d.gf || playing) return;
    playing = true;
    const gif = el("img", { attrs: { alt: `${d.z} 动作演示`, decoding: "async" } });
    gif.src = mediaUrl(state.media, d.gf);
    gif.addEventListener("load", () => {
      slot.replaceChildren(gif);
      paintBadge("演示中");
      slot.classList.remove("media--btn");
      slot.removeAttribute("tabindex");
      slot.removeAttribute("role");
    });
  };

  slot.addEventListener("click", load);
  slot.addEventListener("keydown", (e) => {
    if ((e as KeyboardEvent).key === "Enter" || (e as KeyboardEvent).key === " ") load();
  });

  return load;
}

function renderBody(body: HTMLElement, d: Detail): void {
  const chips = el(
    "div",
    { class: "chips", style: { marginTop: "14px" } },
    el("span", { class: "tag tag--target", text: d.b }),
    el("span", { class: "tag tag--equip", text: d.q }),
    el("span", { class: "tag", text: d.g }),
  );

  const nodes: (Node | null)[] = [
    el(
      "div",
      { class: "detail__head" },
      el("h1", { class: "detail__title", text: d.z }),
      el("div", { class: "detail__en", text: d.e }),
      chips,
    ),
    el(
      "div",
      { class: "panel" },
      el("div", { class: "panel__label", text: "目标肌群" }),
      el(
        "div",
        { class: "muscle-row" },
        el("span", { class: "tag tag--target", text: d.t }),
      ),
      d.sm.length
        ? el(
            "div",
            { class: "panel__sub" },
            el("div", { class: "panel__label", text: "协同肌群" }),
            el(
              "div",
              { class: "muscle-row" },
              ...d.sm.map((m) => el("span", { class: "tag", text: m })),
            ),
          )
        : null,
    ),
    d.st.length
      ? el(
          "div",
          { class: "panel" },
          el("div", { class: "panel__label", text: `动作步骤 · 共 ${d.st.length} 步` }),
          el(
            "ul",
            { class: "steps" },
            ...d.st.map((s) => el("li", { text: s })),
          ),
        )
      : null,
    d.ds
      ? el(
          "div",
          { class: "panel" },
          el("div", { class: "panel__label", text: "动作说明" }),
          el("div", { style: { fontSize: "var(--fs-base)", lineHeight: "var(--lh-loose)" }, text: d.ds }),
        )
      : null,
    el(
      "div",
      { class: "panel" },
      el("div", { class: "panel__label", text: "数据来源" }),
      el("div", {
        style: { fontSize: "var(--fs-sm)", color: "var(--text-2)", lineHeight: "var(--lh-base)" },
        text: "动作数据来自 exercises-dataset（MIT），图片与动画 © Gym visual，仅作演示用途。",
      }),
    ),
  ];

  clear(body);
  for (const n of nodes) if (n) body.appendChild(n);
}

async function share(id: string): Promise<void> {
  const url = `${location.origin}${location.pathname}#/e/${encodeURIComponent(id)}`;
  try {
    if (navigator.share) {
      await navigator.share({ title: "FitFlex 动作", url });
      return;
    }
    await navigator.clipboard.writeText(url);
  } catch {
    /* 用户取消分享，忽略 */
  }
}
