import { el, fromHTML } from "../core/dom";
import { mediaUrl } from "../core/dataset";
import type { Exercise } from "../core/types";
import { icons } from "./icons";

/** 缩略图懒加载：进入视口才发请求，1324 张图不会一次性打满网络 */
const io = "IntersectionObserver" in window
  ? new IntersectionObserver(
      (entries, obs) => {
        for (const en of entries) {
          if (!en.isIntersecting) continue;
          const img = en.target as HTMLImageElement;
          const src = img.dataset.src;
          if (src) {
            img.src = src;
            img.removeAttribute("data-src");
          }
          obs.unobserve(img);
        }
      },
      { rootMargin: "300px 0px" },
    )
  : null;

export function lazyImage(src: string, alt: string): HTMLImageElement {
  const img = el("img", {
    attrs: { alt, loading: "lazy", decoding: "async", "data-src": src },
    on: {
      load: () => img.setAttribute("data-loaded", "true"),
      error: () => img.setAttribute("data-loaded", "true"),
    },
  });
  if (io) io.observe(img);
  else img.src = src;
  return img;
}

export function createCard(
  e: Exercise,
  media: string,
  labels: { bodyPart: string; equipment: string; target: string },
  onOpen: (id: string) => void,
): HTMLElement {
  const thumb = el("div", { class: "card__thumb" });
  if (e.image) thumb.appendChild(lazyImage(mediaUrl(media, e.image), e.zh));

  const node = el(
    "button",
    {
      class: "card",
      attrs: { type: "button", "data-id": e.id, "aria-label": `${e.zh}，${labels.bodyPart}，${labels.equipment}` },
      on: { click: () => onOpen(e.id) },
    },
    thumb,
    el(
      "div",
      { class: "card__body" },
      el("div", { class: "card__name", text: e.zh }),
      el("div", { class: "card__en", text: e.en }),
      el(
        "div",
        { class: "card__tags" },
        el("span", { class: "tag tag--target", text: labels.target || labels.bodyPart }),
        el("span", { class: "tag tag--equip", text: labels.equipment }),
      ),
    ),
    fromHTML(icons.chevronRight).cloneNode(true) as Element,
  );
  node.lastElementChild?.classList.add("card__chev");
  return node;
}

export function createSkeletonCard(): HTMLElement {
  return el(
    "div",
    { class: "skel-card" },
    el("div", { class: "skel skel-card__thumb" }),
    el(
      "div",
      { style: { flex: "1", display: "flex", flexDirection: "column", gap: "8px" } },
      el("div", { class: "skel", style: { height: "14px", width: "62%" } }),
      el("div", { class: "skel", style: { height: "11px", width: "38%" } }),
      el("div", { class: "skel", style: { height: "18px", width: "52%" } }),
    ),
  );
}
