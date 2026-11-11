import { el, append, clear } from "../core/dom";
import { iconEl } from "../components/icons";
import { loadMyPlans, saveMyPlans } from "../core/plan";
import type { PlanItem } from "../core/plan";
import { state } from "../core/store";
import { navigate } from "../router";
import { toast } from "./toast";

/**
 * 「加入训练计划」选择抽屉（动作详情页入口）。
 *
 * 刻意复用计划编辑器的既有路径，不另造一套存储或交互：
 * - 写入目标与编辑器一致：fitflex:my-plans（loadMyPlans / saveMyPlans）
 * - 新增条目与编辑器「添加动作」同参：3 组 × 10-12 · 休息 90s
 * - 只列「我的计划」：内置模板只读，要先复制——与编辑器的约束一致
 * - UI 复用底部抽屉 .sheet 的结构与全部主题令牌
 */

/** 与 planEditor「添加动作」完全相同的默认组次安排 */
function newItem(exId: string): PlanItem {
  return { exId, sets: 3, reps: "10-12", rest: 90 };
}

export function openJoinPlan(exId: string): void {
  const exName = state.byId.get(exId)?.zh ?? exId;
  // 打开时读一次快照用于展示；落盘前会重新读最新数据
  const plans = loadMyPlans();
  let planId = plans[0]?.id ?? "";
  let dayIdx = 0;

  const overlay = el("div", { class: "sheet", attrs: { role: "dialog", "aria-label": "加入训练计划" } });
  const panel = el("div", { class: "sheet__panel" });
  const bodyEl = el("div", { class: "sheet__body" });

  append(panel, [
    el(
      "div",
      { class: "sheet__head" },
      el("button", { class: "sheet__btn", text: "取消", attrs: { type: "button" }, on: { click: () => close() } }),
      el("div", { class: "sheet__title", text: "加入训练计划" }),
      el(
        "button",
        {
          class: "sheet__btn sheet__btn--primary",
          text: "加入",
          attrs: { type: "button" },
          on: { click: () => confirmAdd() },
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
  // 锁住背景滚动：与计划编辑抽屉同一套处理
  const prevOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  requestAnimationFrame(() => overlay.setAttribute("data-show", "true"));

  function close(): void {
    overlay.setAttribute("data-show", "false");
    document.body.style.overflow = prevOverflow;
    window.setTimeout(() => overlay.remove(), 240);
  }

  function renderBody(): void {
    clear(bodyEl);
    bodyEl.appendChild(
      el("div", { class: "join-hint", text: `选择计划与训练日，「${exName}」会加到该日动作末尾` }),
    );

    // 无计划引导：内置模板只读，先去复制一份
    if (!plans.length) {
      bodyEl.appendChild(
        el(
          "div",
          { class: "empty empty--compact" },
          iconEl("clipboard", "empty__icon"),
          el("p", { class: "empty__title", text: "还没有自己的计划" }),
          el("p", {
            class: "empty__hint",
            text: "内置模板是只读的，复制一份到「我的计划」后就能往里加动作",
          }),
          el("button", {
            class: "chip",
            style: { marginTop: "16px" },
            attrs: { type: "button" },
            text: "去创建计划",
            on: {
              click: () => {
                close();
                navigate({ name: "plans" });
              },
            },
          }),
        ),
      );
      return;
    }

    // 计划选择
    const planList = el("div", { class: "join-plans" });
    plans.forEach((p) => {
      planList.appendChild(
        el(
          "button",
          {
            class: "join-plan",
            attrs: { type: "button", "data-active": String(p.id === planId) },
            on: {
              click: () => {
                planId = p.id;
                dayIdx = 0;
                renderBody();
              },
            },
          },
          el(
            "div",
            { class: "join-plan__main" },
            el("div", { class: "join-plan__name", text: p.name }),
            el("div", { class: "join-plan__meta", text: `${p.days.length} 个训练日` }),
          ),
          iconEl("check", "join-plan__check"),
        ),
      );
    });
    bodyEl.appendChild(
      el("div", { class: "sheet__group" }, el("div", { class: "sheet__label", text: "选择计划" }), planList),
    );

    // 所选计划内的训练日
    const plan = plans.find((x) => x.id === planId);
    if (plan && plan.days.length) {
      const dayChips = el("div", { class: "chips chips--scroll" });
      plan.days.forEach((d, i) => {
        dayChips.appendChild(
          el("button", {
            class: "chip",
            attrs: { type: "button", "data-active": String(i === dayIdx) },
            text: d.name,
            on: {
              click: () => {
                dayIdx = i;
                renderBody();
              },
            },
          }),
        );
      });
      bodyEl.appendChild(
        el("div", { class: "sheet__group" }, el("div", { class: "sheet__label", text: "训练日" }), dayChips),
      );
    }
  }

  function confirmAdd(): void {
    // 落盘前重新读最新数据，避免覆盖抽屉打开期间其他页面的改动
    const list = loadMyPlans();
    const plan = list.find((x) => x.id === planId);
    if (!plan || !plan.days.length) {
      toast("计划不存在或没有训练日");
      close();
      return;
    }
    const day = plan.days[Math.min(dayIdx, plan.days.length - 1)];
    day.items.push(newItem(exId));
    saveMyPlans(list);
    close();
    toast(`已加入「${plan.name} · ${day.name}」`);
  }

  renderBody();
}
