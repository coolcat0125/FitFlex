import { el } from "../core/dom";

let hideTimer = 0;
let cur: HTMLElement | null = null;

/** 轻提示：底部浮出一条，1.8 秒后自动消失。同一时间只保留一条。 */
export function toast(msg: string): void {
  if (cur) cur.remove();
  window.clearTimeout(hideTimer);

  const node = el("div", { class: "toast", text: msg, attrs: { role: "status" } });
  document.body.appendChild(node);
  cur = node;

  requestAnimationFrame(() => node.setAttribute("data-show", "true"));
  hideTimer = window.setTimeout(() => {
    node.setAttribute("data-show", "false");
    window.setTimeout(() => {
      node.remove();
      if (cur === node) cur = null;
    }, 260);
  }, 1800);
}
