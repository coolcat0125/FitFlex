import { el, append, clear } from "../core/dom";
import { iconEl } from "../components/icons";
import { loadMyPlans, saveMyPlans, uid } from "../core/plan";
import type { Plan, PlanDay, PlanItem } from "../core/plan";
import { state } from "../core/store";
import { toast } from "./toast";

/**
 * 计划编辑面板（底部抽屉）。
 * 只编辑「我的计划」——内置模板是只读的，要先复制。
 * 保存后通过 onDone 通知调用方重渲染。
 */
export function openPlanEditor(plan: Plan, onDone: () => void): void {
  // 在副本上编辑，取消时原数据不受影响
  let draft: Plan = {
    ...plan,
    days: plan.days.map((d) => ({ ...d, items: d.items.map((it) => ({ ...it })) })),
  };
  let dayIdx = 0;
  let searching = false;

  const overlay = el("div", { class: "sheet", attrs: { role: "dialog", "aria-label": "编辑计划" } });
  const panel = el("div", { class: "sheet__panel" });
  const bodyEl = el("div", { class: "sheet__body" });

  const nameInput = el("input", {
    class: "sheet__name-input",
    attrs: { type: "text", "aria-label": "计划名称", maxlength: "24" },
  }) as HTMLInputElement;
  nameInput.value = draft.name;
  nameInput.addEventListener("input", () => {
    draft.name = nameInput.value.trim() || plan.name;
  });

  const dayChips = el("div", { class: "chips chips--scroll" });

  append(panel, [
    el(
      "div",
      { class: "sheet__head" },
      el(
        "button",
        {
          class: "sheet__btn",
          text: "取消",
          attrs: { type: "button" },
          on: { click: () => close() },
        },
      ),
      el("div", { class: "sheet__title", text: "编辑计划" }),
      el(
        "button",
        {
          class: "sheet__btn sheet__btn--primary",
          text: "保存",
          attrs: { type: "button" },
          on: { click: () => save() },
        },
      ),
    ),
    bodyEl,
  ]);

  overlay.appendChild(panel);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
  document.body.appendChild(overlay);
  // 锁住背景滚动：否则抽屉打开时页面还能滚，点击会落到错误的位置
  const prevOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  requestAnimationFrame(() => overlay.setAttribute("data-show", "true"));

  function close(): void {
    overlay.setAttribute("data-show", "false");
    document.body.style.overflow = prevOverflow;
    window.setTimeout(() => overlay.remove(), 240);
  }

  function save(): void {
    if (!draft.name.trim()) draft.name = plan.name;
    // 过滤掉空训练日
    draft.days = draft.days.filter((d) => d.items.length > 0);
    if (!draft.days.length) {
      toast("至少要保留一个训练日");
      return;
    }
    const list = loadMyPlans();
    const i = list.findIndex((p) => p.id === draft.id);
    if (i >= 0) list[i] = draft;
    else list.unshift(draft);
    saveMyPlans(list);
    close();
    toast("已保存");
    onDone();
  }

  function curDay(): PlanDay {
    return draft.days[dayIdx];
  }

  function renderChips(): void {
    clear(dayChips);
    draft.days.forEach((d, i) => {
      dayChips.appendChild(
        el("button", {
          class: "chip",
          attrs: { type: "button", "data-active": String(i === dayIdx) },
          text: d.name,
          on: {
            click: () => {
              dayIdx = i;
              render();
            },
          },
        }),
      );
    });
  }

  /** 组数 / 休息 的加减控件 */
  function stepper(
    value: number,
    step: number,
    min: number,
    max: number,
    onChange: (v: number) => void,
  ): HTMLElement {
    const val = el("span", { class: "stepper__val", text: String(value) });
    let v = value;
    const set = (n: number) => {
      v = Math.min(max, Math.max(min, n));
      val.textContent = String(v);
      onChange(v);
    };
    return el(
      "div",
      { class: "stepper" },
      el("button", {
        class: "stepper__btn",
        attrs: { type: "button", "aria-label": "减少" },
        text: "−",
        on: { click: () => set(v - step) },
      }),
      val,
      el("button", {
        class: "stepper__btn",
        attrs: { type: "button", "aria-label": "增加" },
        text: "+",
        on: { click: () => set(v + step) },
      }),
    );
  }

  function renderItems(): HTMLElement {
    const d = curDay();
    const list = el("div", { class: "edit-items" });

    if (!d.items.length) {
      list.appendChild(
        el("div", { class: "empty empty--compact" }, el("p", { class: "empty__hint", text: "这个训练日还没有动作" })),
      );
    }

    d.items.forEach((it, i) => {
      const ex = state.byId.get(it.exId);
      const repsInput = el("input", {
        class: "edit-reps",
        attrs: { type: "text", "aria-label": "次数", maxlength: "8" },
      }) as HTMLInputElement;
      repsInput.value = it.reps;
      repsInput.addEventListener("input", () => {
        it.reps = repsInput.value.trim() || "10";
      });

      list.appendChild(
        el(
          "div",
          { class: "edit-item" },
          el(
            "div",
            { class: "edit-item__head" },
            el("div", { class: "edit-item__idx", text: String(i + 1) }),
            el("div", { class: "edit-item__name", text: ex ? ex.zh : `未知动作 ${it.exId}` }),
            el("button", {
              class: "edit-item__del",
              attrs: { type: "button", "aria-label": "删除动作" },
              on: {
                click: () => {
                  d.items.splice(i, 1);
                  render();
                },
              },
            }, iconEl("trash")),
          ),
          el(
            "div",
            { class: "edit-item__fields" },
            el(
              "div",
              { class: "edit-field" },
              el("span", { class: "edit-field__label", text: "组数" }),
              stepper(it.sets, 1, 1, 12, (v) => {
                it.sets = v;
              }),
            ),
            el(
              "div",
              { class: "edit-field" },
              el("span", { class: "edit-field__label", text: "次数" }),
              repsInput,
            ),
            el(
              "div",
              { class: "edit-field" },
              el("span", { class: "edit-field__label", text: "休息" }),
              stepper(it.rest, 15, 0, 300, (v) => {
                it.rest = v;
              }),
              el("span", { class: "edit-field__unit", text: "s" }),
            ),
          ),
        ),
      );
    });

    return list;
  }

  function renderSearch(): HTMLElement {
    const input = el("input", {
      class: "edit-search__input",
      attrs: { type: "search", placeholder: "搜索要添加的动作", "aria-label": "搜索动作" },
    }) as HTMLInputElement;
    const results = el("div", { class: "edit-search__results" });

    const paint = () => {
      clear(results);
      const q = input.value.trim().toLowerCase();
      if (!q) {
        results.appendChild(
          el("div", { class: "edit-search__hint", text: "输入动作名或肌群，从 1324 个动作里挑" }),
        );
        return;
      }
      const hits = state.list
        .filter((e) => e.zh.toLowerCase().includes(q) || e.en.toLowerCase().includes(q))
        .slice(0, 20);
      if (!hits.length) {
        results.appendChild(el("div", { class: "edit-search__hint", text: "没有匹配的动作" }));
        return;
      }
      for (const e of hits) {
        results.appendChild(
          el(
            "button",
            {
              class: "edit-search__row",
              attrs: { type: "button" },
              on: {
                click: () => {
                  const item: PlanItem = { exId: e.id, sets: 3, reps: "10-12", rest: 90 };
                  curDay().items.push(item);
                  searching = false;
                  render();
                  toast(`已添加「${e.zh}」`);
                },
              },
            },
            el("span", { class: "edit-search__name", text: e.zh }),
            el("span", { class: "edit-search__en", text: e.en }),
          ),
        );
      }
    };

    input.addEventListener("input", paint);
    paint();

    return el(
      "div",
      { class: "edit-search" },
      el(
        "div",
        { class: "edit-search__bar" },
        iconEl("search", "search__icon"),
        input,
      ),
      results,
    );
  }

  function render(): void {
    clear(bodyEl);
    renderChips();
    bodyEl.appendChild(
      el(
        "div",
        { class: "sheet__group" },
        el("div", { class: "sheet__label", text: "计划名称" }),
        nameInput,
      ),
    );
    bodyEl.appendChild(
      el(
        "div",
        { class: "sheet__group" },
        el("div", { class: "sheet__label", text: "训练日" }),
        dayChips,
      ),
    );
    bodyEl.appendChild(
      el(
        "div",
        { class: "sheet__group" },
        el(
          "div",
          { class: "sheet__label-row" },
          el("span", { class: "sheet__label", text: curDay().name }),
          el("span", { class: "sheet__count", text: `${curDay().items.length} 个动作` }),
        ),
        renderItems(),
      ),
    );

    if (searching) {
      bodyEl.appendChild(el("div", { class: "sheet__group" }, renderSearch()));
    } else {
      bodyEl.appendChild(
        el(
          "button",
          {
            class: "edit-add",
            attrs: { type: "button" },
            on: {
              click: () => {
                searching = true;
                render();
                // 打开后聚焦搜索框
                window.setTimeout(() => {
                  bodyEl.querySelector<HTMLInputElement>(".edit-search__input")?.focus();
                }, 30);
              },
            },
          },
          iconEl("plus"),
          el("span", { text: "添加动作" }),
        ),
      );
    }
  }

  render();
}

/** 新建空白计划（供将来扩展用） */
export function blankPlan(name = "我的训练计划"): Plan {
  return {
    id: uid("my"),
    name,
    goal: "hypertrophy",
    level: "intermediate",
    daysPerWeek: 3,
    desc: "",
    builtin: false,
    days: [
      { id: uid("d"), name: "训练日 A", items: [] },
    ],
  };
}
