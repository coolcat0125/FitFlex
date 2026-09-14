import { el, fromHTML } from "../core/dom";

interface Region {
  part: string;
  /** SVG 形状简写，如 'rect x="44" y="29" ...' */
  shape: string;
  /** 后视图下的替代部位（躯干上部：正面=胸部，背面=背部） */
  altPart?: string;
}

const REGIONS: Region[] = [
  { part: "neck", shape: 'rect x="44" y="29" width="12" height="9" rx="3"' },
  { part: "shoulders", shape: 'rect x="24" y="38" width="52" height="13" rx="6"' },
  { part: "chest", altPart: "back", shape: 'rect x="31" y="48" width="38" height="27" rx="9"' },
  { part: "waist", shape: 'rect x="33" y="77" width="34" height="27" rx="8"' },
  { part: "upper arms", shape: 'rect x="13" y="49" width="14" height="33" rx="7"' },
  { part: "upper arms", shape: 'rect x="73" y="49" width="14" height="33" rx="7"' },
  { part: "lower arms", shape: 'rect x="12" y="84" width="12" height="30" rx="6"' },
  { part: "lower arms", shape: 'rect x="76" y="84" width="12" height="30" rx="6"' },
  { part: "upper legs", shape: 'rect x="32" y="106" width="16" height="46" rx="8"' },
  { part: "upper legs", shape: 'rect x="52" y="106" width="16" height="46" rx="8"' },
  { part: "lower legs", shape: 'rect x="34" y="154" width="13" height="38" rx="6"' },
  { part: "lower legs", shape: 'rect x="53" y="154" width="13" height="38" rx="6"' },
];

/** 非肌群轮廓（头、手、脚），不参与选中 */
const DECOR = [
  'ellipse cx="50" cy="17" rx="11" ry="13"',
  'circle cx="18" cy="120" r="6"',
  'circle cx="82" cy="120" r="6"',
  'rect x="33" y="191" width="15" height="6" rx="3"',
  'rect x="52" y="191" width="15" height="6" rx="3"',
];

const shape = (s: string): string => `<${s} />`;

function buildFigure(view: "front" | "back", active: string | null): SVGElement {
  const decor = DECOR.map(shape).join("");
  const regions = REGIONS.map((r) => {
    const key = view === "back" && r.altPart ? r.altPart : r.part;
    const on = active === key;
    return (
      `<g data-region="${key}" class="bodymap__region" ` +
      `fill="${on ? "var(--accent)" : "var(--body-region)"}" ` +
      `stroke="${on ? "var(--accent)" : "var(--border-strong)"}" stroke-width="1">` +
      `${shape(r.shape)}</g>`
    );
  }).join("");

  return fromHTML(
    `<svg class="bodymap__svg" viewBox="0 0 100 200" aria-hidden="true">` +
      `<g fill="var(--body-decor)">${decor}</g>${regions}</svg>`,
  ) as SVGElement;
}

export interface BodyPartFacet {
  key: string;
  zh: string;
  count: number;
}

export interface BodyMap {
  node: HTMLElement;
  update: (active: string | null) => void;
}

export function createBodyMap(
  initial: string | null,
  parts: BodyPartFacet[],
  onSelect: (part: string | null) => void,
): BodyMap {
  let view: "front" | "back" = "front";
  let active = initial;

  const figureSlot = el("div", { class: "bodymap__figure" });
  const mkSwitch = (label: string, v: "front" | "back") =>
    el("button", {
      text: label,
      attrs: { type: "button", "aria-label": v === "front" ? "查看正面肌群" : "查看背面肌群" },
      on: {
        click: () => {
          view = v;
          render();
        },
      },
    });
  const frontBtn = mkSwitch("正面", "front");
  const backBtn = mkSwitch("背面", "back");

  // 部位列表：把 SVG 上不存在的部位（有氧）也放进来，保证 1324 条都能点到
  const grid = el("div", { class: "bodymap__grid" });
  const btns = new Map<string, HTMLButtonElement>();
  for (const p of parts) {
    const btn = el(
      "button",
      {
        class: "muscle-btn",
        attrs: { type: "button", "data-part": p.key },
        on: { click: () => onSelect(active === p.key ? null : p.key) },
      },
      el("span", { class: "muscle-btn__zh", text: p.zh }),
      el("span", { class: "muscle-btn__n", text: `${p.count} 个` }),
    );
    btns.set(p.key, btn);
    grid.appendChild(btn);
  }

  const node = el(
    "div",
    { class: "bodymap" },
    figureSlot,
    grid,
  );

  function paintActive(): void {
    for (const [key, btn] of btns) {
      btn.setAttribute("data-active", String(active === key));
      btn.setAttribute("aria-pressed", String(active === key));
    }
  }

  function render(): void {
    const svg = buildFigure(view, active);
    figureSlot.replaceChildren(
      svg,
      el("div", { class: "bodymap__switch" }, frontBtn, backBtn),
    );
    frontBtn.setAttribute("data-active", String(view === "front"));
    backBtn.setAttribute("data-active", String(view === "back"));
    paintActive();

    svg.querySelectorAll<SVGGElement>("g[data-region]").forEach((g) => {
      const key = g.getAttribute("data-region")!;
      g.style.cursor = "pointer";
      g.setAttribute("role", "button");
      g.setAttribute("aria-label", key);
      g.addEventListener("click", () => onSelect(active === key ? null : key));
    });
  }

  render();

  return {
    node,
    update(next) {
      active = next;
      render();
    },
  };
}
