import { el, append, clear } from "../core/dom";
import { iconEl } from "../components/icons";
import {
  CONFIDENCE_LABEL,
  FORMULAS,
  ZONES,
  barWeight,
  estimateOneRm,
  fmtWeight,
  fromKg,
  loadTable,
  plateInventory,
  platesFor,
  roundWeight,
  toKg,
} from "../core/onerm";
import type { Unit } from "../core/onerm";
import { state } from "../core/store";
import { navigate } from "../router";
import { toast } from "../components/toast";

/* ------------------------------ 1RM 档案 ------------------------------ */

interface RmRecord {
  exId: string;
  /** 统一以 kg 存储 */
  oneRmKg: number;
  date: string;
  fromWeight: number;
  fromReps: number;
  unit: Unit;
}

const RM_KEY = "fitflex:1rm-records";

function loadRecords(): RmRecord[] {
  try {
    const raw = localStorage.getItem(RM_KEY);
    const v = raw ? (JSON.parse(raw) as RmRecord[]) : [];
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function saveRecords(list: RmRecord[]): void {
  try {
    localStorage.setItem(RM_KEY, JSON.stringify(list.slice(0, 200)));
  } catch {
    /* 忽略 */
  }
}

function todayStr(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/* ------------------------------ 数字输入 ------------------------------ */

function numberField(
  label: string,
  placeholder: string,
  onInput: (v: string) => void,
  opts: { suffix?: string; step?: boolean } = {},
): { node: HTMLElement; input: HTMLInputElement } {
  const input = el("input", {
    attrs: {
      type: "text",
      inputmode: "decimal",
      autocomplete: "off",
      placeholder,
      "aria-label": label,
    },
  }) as HTMLInputElement;

  input.addEventListener("input", () => {
    // 只允许数字与一个小数点
    const cleaned = input.value.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1");
    if (cleaned !== input.value) input.value = cleaned;
    onInput(cleaned);
  });

  const wrap = el(
    "div",
    { class: "field" },
    el("div", { class: "field__label", text: label }),
    el(
      "div",
      { class: "field__box" },
      input,
      opts.suffix ? el("span", { class: "field__suffix", text: opts.suffix }) : null,
    ),
  );
  return { node: wrap, input };
}

/* ------------------------------ 主视图 ------------------------------ */

type TabKey = "est" | "table" | "plates";

const TAB_LABEL: Record<TabKey, string> = {
  est: "估算 1RM",
  table: "配重表",
  plates: "杠铃片",
};

export function renderStrength(): HTMLElement {
  let unit: Unit = "kg";
  let tab: TabKey = "est";

  // 各 Tab 的输入状态（切 Tab 不丢）
  let estWeight = "";
  let estReps = "";
  let tableRm = "";
  let plateTarget = "";
  let pickExId = "";

  const unitSwitch = el("div", { class: "seg" });
  const tabsEl = el("div", { class: "seg seg--wide" });
  const body = el("div", { class: "st-body" });
  const recordSlot = el("div");

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
          iconEl("bolt", "brand__mark"),
          el("span", { class: "brand__name", text: "最大肌力" }),
        ),
        el("div", { class: "topbar__spacer" }),
        unitSwitch,
      ),
    ),
    el("div", { class: "section" }, tabsEl),
    el("div", { class: "section" }, body),
    el("div", { class: "section" }, recordSlot),
  );

  function renderUnits(): void {
    clear(unitSwitch);
    (["kg", "lb"] as Unit[]).forEach((u) => {
      unitSwitch.appendChild(
        el("button", {
          class: "seg__item",
          text: u,
          attrs: { type: "button", "data-active": String(u === unit) },
          on: {
            click: () => {
              if (unit === u) return;
              unit = u;
              estWeight = estReps = tableRm = plateTarget = "";
              renderUnits();
              render();
            },
          },
        }),
      );
    });
  }

  function renderTabs(): void {
    clear(tabsEl);
    (Object.keys(TAB_LABEL) as TabKey[]).forEach((k) => {
      tabsEl.appendChild(
        el("button", {
          class: "seg__item",
          text: TAB_LABEL[k],
          attrs: { type: "button", "data-active": String(k === tab) },
          on: {
            click: () => {
              tab = k;
              renderTabs();
              render();
            },
          },
        }),
      );
    });
  }

  /* ---------------- Tab：估算 ---------------- */

  function renderEstimate(): void {
    const wField = numberField("重量", "如 100", (v) => {
      estWeight = v;
      paintResult();
    }, { suffix: unit });
    const rField = numberField("次数", "如 5", (v) => {
      estReps = v;
      paintResult();
    }, { suffix: "次" });
    wField.input.value = estWeight;
    rField.input.value = estReps;

    const resultSlot = el("div", { class: "st-result" });

    function paintResult(): void {
      clear(resultSlot);
      const w = parseFloat(estWeight);
      const r = parseInt(estReps, 10);
      const res = estimateOneRm(w, r);

      if (!res) {
        resultSlot.appendChild(
          el(
            "div",
            { class: "st-hint" },
            el("div", { class: "st-hint__text", text: "填入重量和次数，估算你的最大肌力" }),
            el("div", {
              class: "st-hint__sub",
              text: "例：用 100 kg 推起 5 次 → 估算 1RM 约 112 kg",
            }),
          ),
        );
        return;
      }

      const conf = res.confidence;
      resultSlot.appendChild(
        el(
          "div",
          { class: "st-hero", attrs: { "data-conf": conf } },
          el("div", { class: "st-hero__label", text: "估算 1RM（6 种公式均值）" }),
          el("div", { class: "st-hero__value", text: fmtWeight(res.average, unit) }),
          el(
            "div",
            { class: "st-hero__meta" },
            el("span", { class: "tag", text: CONFIDENCE_LABEL[conf] }),
            el("span", { class: "tag", text: `${res.weight} ${unit} × ${res.reps} 次` }),
            res.spread > 0.5
              ? el("span", { class: "tag", text: `公式分歧 ${res.spread.toFixed(1)}%` })
              : null,
          ),
        ),
      );

      // 各公式明细
      const rows = el("div", { class: "st-formulas" });
      for (const e of res.estimates) {
        rows.appendChild(
          el(
            "div",
            { class: "st-formula" },
            el("div", { class: "st-formula__name", text: e.name, attrs: { title: FORMULAS.find((f) => f.key === e.key)?.note ?? "" } }),
            el("div", { class: "st-formula__val", text: fmtWeight(e.value, unit) }),
            el("div", {
              class: "st-formula__delta",
              attrs: { "data-sign": e.delta >= 0 ? "up" : "down" },
              text: `${e.delta >= 0 ? "+" : ""}${e.delta.toFixed(1)}%`,
            }),
          ),
        );
      }
      resultSlot.appendChild(
        el(
          "div",
          { class: "st-card" },
          el("div", { class: "st-card__title", text: "各公式结果" }),
          rows,
          el("div", {
            class: "st-card__note",
            text: "次数越多，公式外推误差越大。1-5 次的结果最接近真实 1RM。",
          }),
        ),
      );

      // 快速跳到配重表
      resultSlot.appendChild(
        el(
          "button",
          {
            class: "btn btn--primary st-cta",
            attrs: { type: "button" },
            on: {
              click: () => {
                tableRm = String(roundWeight(res.average, unit));
                tab = "table";
                renderTabs();
                render();
              },
            },
          },
          el("span", { text: "用这个值看配重表" }),
        ),
      );

      // 保存记录
      resultSlot.appendChild(saveRow(res.average, w, r));
    }

    append(body, [
      el(
        "div",
        { class: "st-grid" },
        wField.node,
        rField.node,
      ),
      resultSlot,
    ]);
    paintResult();
  }

  function saveRow(oneRm: number, weight: number, reps: number): HTMLElement {
    const select = el("select", { class: "st-select", attrs: { "aria-label": "选择动作" } }) as HTMLSelectElement;
    select.appendChild(el("option", { text: "（可选）关联动作", attrs: { value: "" } }));
    // 只列出常见复合动作，避免 1324 条塞满下拉
    const COMMON = ["0025", "0043", "0032", "0091", "0027", "0085", "0652", "0405", "0739", "0047"];
    for (const id of COMMON) {
      const ex = state.byId.get(id);
      if (ex) select.appendChild(el("option", { text: ex.zh, attrs: { value: id } }));
    }
    select.value = pickExId;
    select.addEventListener("change", () => {
      pickExId = select.value;
    });

    return el(
      "div",
      { class: "st-save" },
      select,
      el(
        "button",
        {
          class: "btn btn--ghost st-save__btn",
          attrs: { type: "button" },
          on: {
            click: () => {
              const list = loadRecords();
              list.unshift({
                exId: pickExId,
                oneRmKg: toKg(oneRm, unit),
                date: todayStr(),
                fromWeight: weight,
                fromReps: reps,
                unit,
              });
              saveRecords(list);
              toast("已保存到 1RM 档案");
              renderRecords();
            },
          },
        },
        iconEl("check"),
        el("span", { text: "保存记录" }),
      ),
    );
  }

  /* ---------------- Tab：配重表 ---------------- */

  function renderTable(): void {
    const f = numberField("你的 1RM", "如 112.5", (v) => {
      tableRm = v;
      paint();
    }, { suffix: unit });
    f.input.value = tableRm;

    const slot = el("div");

    function paint(): void {
      clear(slot);
      const rm = parseFloat(tableRm);
      if (!Number.isFinite(rm) || rm <= 0) {
        slot.appendChild(
          el(
            "div",
            { class: "st-hint" },
            el("div", { class: "st-hint__text", text: "填入 1RM，生成各强度区配重" }),
            el("div", { class: "st-hint__sub", text: "不知道 1RM？先用「估算 1RM」算一个" }),
          ),
        );
        return;
      }

      const rows = loadTable(rm, unit);
      const list = el("div", { class: "lt" });
      for (const r of rows) {
        list.appendChild(
          el(
            "div",
            { class: "lt__row", attrs: { "data-tone": r.tone } },
            el("div", { class: "lt__pct", text: `${r.pct}%` }),
            el("div", { class: "lt__weight", text: fmtWeight(r.weight, unit) }),
            el("div", { class: "lt__reps", text: `${r.reps} 次` }),
            el("div", { class: "lt__purpose", text: r.purpose }),
          ),
        );
      }
      slot.appendChild(
        el(
          "div",
          { class: "st-card" },
          el("div", { class: "st-card__title", text: `基于 1RM ${fmtWeight(rm, unit)} 的配重表` }),
          el(
            "div",
            { class: "lt__head" },
            el("div", { text: "强度" }),
            el("div", { text: "重量" }),
            el("div", { text: "次数" }),
            el("div", { text: "目标" }),
          ),
          list,
          el("div", {
            class: "st-card__note",
            text: "重量已按可加的杠铃片步进取整。次数是能完成的最大次数，训练时留 1-2 次余量更安全。",
          }),
        ),
      );

      // 强度区说明
      const zones = el("div", { class: "zones" });
      for (const z of ZONES) {
        zones.appendChild(
          el(
            "div",
            { class: "zone", attrs: { "data-tone": z.tone } },
            el("div", { class: "zone__pct", text: `${z.pct}%` }),
            el(
              "div",
              { class: "zone__body" },
              el("div", { class: "zone__purpose", text: z.purpose }),
              el("div", { class: "zone__detail", text: `${z.reps} 次 · ${z.sets} 组 · 休息 ${z.rest}` }),
            ),
          ),
        );
      }
      slot.appendChild(
        el(
          "div",
          { class: "st-card" },
          el("div", { class: "st-card__title", text: "强度区怎么用" }),
          zones,
        ),
      );
    }

    append(body, [f.node, slot]);
    paint();
  }

  /* ---------------- Tab：杠铃片 ---------------- */

  function renderPlates(): void {
    const f = numberField("目标重量（含杆）", "如 100", (v) => {
      plateTarget = v;
      paint();
    }, { suffix: unit });
    f.input.value = plateTarget;

    const slot = el("div");

    function paint(): void {
      clear(slot);
      const t = parseFloat(plateTarget);
      const bar = barWeight(unit);

      if (!Number.isFinite(t) || t <= 0) {
        slot.appendChild(
          el(
            "div",
            { class: "st-hint" },
            el("div", { class: "st-hint__text", text: "填入目标重量，算出每边该挂什么片" }),
            el("div", { class: "st-hint__sub", text: `标准奥杆 ${bar} ${unit}，可加片 ${plateInventory(unit).join(" / ")} ${unit}` }),
          ),
        );
        return;
      }

      const res = platesFor(t, unit);
      if (!res) {
        slot.appendChild(
          el(
            "div",
            { class: "st-hint" },
            el("div", { class: "st-hint__text", text: `目标重量不能小于杆重（${bar} ${unit}）` }),
            el("div", { class: "st-hint__sub", text: `试试 ${bar + 5} ${unit} 以上` }),
          ),
        );
        return;
      }

      // 可视化：杆 + 每边的片
      const side = el("div", { class: "bar" });
      side.appendChild(el("div", { class: "bar__shaft" }));
      const platesRow = el("div", { class: "bar__plates" });
      if (res.perSide.length === 0) {
        platesRow.appendChild(el("div", { class: "bar__none", text: "空杆" }));
      } else {
        const maxPlate = Math.max(...res.perSide);
        for (const p of res.perSide) {
          // 片高按重量比例，视觉上接近真实杠铃
          const h = Math.round(22 + (p / maxPlate) * 20);
          platesRow.appendChild(
            el("div", { class: "plate", text: String(p), style: { height: `${h}px` } }),
          );
        }
      }
      side.appendChild(platesRow);

      slot.appendChild(
        el(
          "div",
          { class: "st-card" },
          el("div", { class: "st-card__title", text: `每边挂片方案` }),
          el(
            "div",
            { class: "pl-sum" },
            el("div", { class: "pl-sum__row" }, el("span", { text: "杆重" }), el("b", { text: `${bar} ${unit}` })),
            el(
              "div",
              { class: "pl-sum__row" },
              el("span", { text: "每边" }),
              el("b", { text: res.perSide.length ? res.perSide.map((p) => `${p}`).join(" + ") + ` = ${res.perSide.reduce((a, b) => a + b, 0)} ${unit}` : `0 ${unit}` }),
            ),
            el(
              "div",
              { class: "pl-sum__row pl-sum__row--total" },
              el("span", { text: "实际总重" }),
              el("b", { text: fmtWeight(res.achieved, unit) }),
            ),
          ),
          side,
          Math.abs(res.diff) > 0.01
            ? el("div", {
                class: "st-card__note",
                text: `与目标差 ${res.diff > 0 ? "+" : ""}${res.diff.toFixed(1)} ${unit}——现有片凑不出这个重量，最接近的是 ${fmtWeight(res.achieved, unit)}。`,
              })
            : el("div", { class: "st-card__note", text: "刚好凑出目标重量。" }),
        ),
      );
    }

    append(body, [f.node, slot]);
    paint();
  }

  /* ---------------- 1RM 档案 ---------------- */

  function renderRecords(): void {
    clear(recordSlot);
    const list = loadRecords();
    if (!list.length) return;

    // 按动作分组，取最新一条作为当前值
    const latest = new Map<string, RmRecord>();
    const count = new Map<string, number>();
    for (const r of list) {
      const k = r.exId || "_";
      if (!latest.has(k)) latest.set(k, r);
      count.set(k, (count.get(k) ?? 0) + 1);
    }

    const rows = el("div", { class: "rm-list" });
    for (const [k, r] of latest) {
      const ex = k === "_" ? null : state.byId.get(k);
      const name = ex ? ex.zh : "未关联动作";
      const n = count.get(k) ?? 1;
      const prev = list.filter((x) => (x.exId || "_") === k)[1];
      const delta = prev ? r.oneRmKg - prev.oneRmKg : 0;

      rows.appendChild(
        el(
          "div",
          { class: "rm-item" },
          el(
            "div",
            { class: "rm-item__main" },
            ex
              ? el("button", {
                  class: "rm-item__name rm-item__name--link",
                  text: name,
                  attrs: { type: "button" },
                  on: { click: () => navigate({ name: "detail", id: k }) },
                })
              : el("div", { class: "rm-item__name", text: name }),
            el("div", { class: "rm-item__date", text: `${r.date} · 由 ${r.fromWeight}${r.unit} × ${r.fromReps} 次推得` }),
          ),
          el(
            "div",
            { class: "rm-item__val" },
            el("div", { class: "rm-item__num", text: fmtWeight(fromKg(r.oneRmKg, unit), unit) }),
            n > 1
              ? el("div", {
                  class: "rm-item__delta",
                  attrs: { "data-sign": delta >= 0 ? "up" : "down" },
                  text: `${delta >= 0 ? "+" : ""}${fromKg(delta, unit).toFixed(1)}`,
                })
              : null,
          ),
        ),
      );
    }

    append(recordSlot, [
      el(
        "div",
        { class: "section__head" },
        el("h2", { class: "section__title", text: "1RM 档案" }),
        el(
          "button",
          {
            class: "section__action",
            attrs: { type: "button" },
            text: "清空",
            on: {
              click: () => {
                saveRecords([]);
                renderRecords();
                toast("已清空档案");
              },
            },
          },
        ),
      ),
      rows,
    ]);
  }

  function render(): void {
    clear(body);
    if (tab === "est") renderEstimate();
    else if (tab === "table") renderTable();
    else renderPlates();
  }

  renderUnits();
  renderTabs();
  render();
  renderRecords();

  // 页面切换时不会自动清 body 之外的引用，这里无需额外清理
  return screen;
}
