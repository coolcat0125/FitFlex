import { fromHTML } from "../core/dom";

/** 内联 SVG 图标。统一 24×24 viewBox，用 currentColor 继承颜色。
 *  默认带 .ico 类（18×18）与显式 width/height，避免无尺寸 SVG 被撑成 300×150。 */
const wrap = (d: string, extra = ""): string =>
  `<svg class="ico" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}${extra}</svg>`;

export const icons = {
  search: wrap('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>'),
  close: wrap('<path d="M6 6l12 12M18 6L6 18"/>'),
  chevronRight: wrap('<path d="M9 5l7 7-7 7"/>'),
  chevronLeft: wrap('<path d="M15 5l-7 7 7 7"/>'),
  chevronDown: wrap('<path d="M6 9l6 6 6-6"/>'),
  star: wrap('<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z"/>'),
  starFill: `<svg class="ico" viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z"/></svg>`,
  play: wrap('<path d="M9.2 6.4l9 5.6-9 5.6z" fill="currentColor" stroke-linejoin="round"/>'),
  share: wrap('<path d="M12 15V4"/><path d="M8 8l4-4 4 4"/><path d="M5 14v4.5A1.5 1.5 0 006.5 20h11a1.5 1.5 0 001.5-1.5V14"/>'),
  sort: wrap('<path d="M7 5v14"/><path d="M4 8l3-3 3 3"/><path d="M17 19V5"/><path d="M14 16l3 3 3-3"/>'),
  sun: wrap('<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4"/>'),
  moon: wrap('<path d="M20 14.5A8.5 8.5 0 019.5 4a8.5 8.5 0 1010.5 10.5z"/>'),
  dumbbell: wrap('<path d="M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10"/>'),
  empty: wrap('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/><path d="M8.5 11h5"/>'),
  alert: wrap('<path d="M12 8v5"/><circle cx="12" cy="16.5" r=".6" fill="currentColor"/><path d="M12 3.5l9 16H3z"/>'),
  check: wrap('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  refresh: wrap('<path d="M20 12a8 8 0 11-2.3-5.6"/><path d="M20 4v4h-4"/>'),
  target: wrap('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.2"/>'),
  /* --- 训练计划 --- */
  clipboard: wrap('<path d="M9 4.5H7.5A1.5 1.5 0 006 6v13.5A1.5 1.5 0 007.5 21h9a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H15"/><rect x="9" y="2.8" width="6" height="3.4" rx="1.2"/><path d="M9.2 11.5h5.6M9.2 15.5h3.6"/>'),
  calendar: wrap('<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 9.8h17M8 3.2v3.4M16 3.2v3.4"/>'),
  plus: wrap('<path d="M12 5.5v13M5.5 12h13"/>'),
  minus: wrap('<path d="M5.5 12h13"/>'),
  trash: wrap('<path d="M4.5 6.8h15M9.5 6.8V4.6h5v2.2M6.6 6.8l.9 12.1a1.6 1.6 0 001.6 1.5h5.8a1.6 1.6 0 001.6-1.5l.9-12.1"/><path d="M10.4 10.6v6M13.6 10.6v6"/>'),
  pencil: wrap('<path d="M4.5 19.5l4.2-1 9.4-9.4a1.9 1.9 0 000-2.7l-.5-.5a1.9 1.9 0 00-2.7 0L5.5 15.3z"/><path d="M14.4 6.9l2.7 2.7"/>'),
  timer: wrap('<circle cx="12" cy="13.2" r="7.5"/><path d="M12 9.6v3.8l2.4 1.6M9.4 2.8h5.2"/>'),
  /* --- 力量 / 1RM --- */
  bolt: wrap('<path d="M13.2 2.8L5.4 13.4h5.3l-.9 7.8 7.8-10.6h-5.3z"/>'),
  chart: wrap('<path d="M4 20.2h16"/><path d="M7.2 20.2v-6.4M11.6 20.2V7.4M16 20.2v-9"/>'),
  user: wrap('<circle cx="12" cy="8.2" r="3.7"/><path d="M4.8 20.2a7.2 7.2 0 0114.4 0"/>'),
  info: wrap('<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.2"/><circle cx="12" cy="7.9" r=".7" fill="currentColor"/>'),
} as const;

export type IconName = keyof typeof icons;

/** 取一个图标元素，可选附加额外类名（如 search__icon / brand__mark） */
export function iconEl(name: IconName, cls?: string): Element {
  const node = fromHTML(icons[name]).cloneNode(true) as Element;
  if (cls) node.classList.add(cls);
  return node;
}
