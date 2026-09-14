import { el } from "../core/dom";
import { iconEl } from "../components/icons";
import {
  BUILTIN_PLANS,
  GOAL_LABEL,
  LEVEL_LABEL,
  estimateMinutes,
  loadMyPlans,
  totalSets,
} from "../core/plan";
import type { Plan } from "../core/plan";
import { navigate } from "../router";

function planCard(p: Plan): HTMLElement {
  const dayCount = p.days.length;
  const sets = p.days.reduce((n, d) => n + totalSets(d), 0);
  const mins = Math.round(p.days.reduce((n, d) => n + estimateMinutes(d), 0) / Math.max(1, dayCount));

  return el(
    "button",
    {
      class: "plan-card",
      attrs: { type: "button", "data-builtin": String(Boolean(p.builtin)) },
      on: { click: () => navigate({ name: "plan", id: p.id }) },
    },
    el(
      "div",
      { class: "plan-card__top" },
      el("div", { class: "plan-card__name", text: p.name }),
      el("div", { class: "plan-card__tags" },
        el("span", { class: "tag tag--target", text: GOAL_LABEL[p.goal] }),
        el("span", { class: "tag", text: LEVEL_LABEL[p.level] }),
      ),
    ),
    el("div", { class: "plan-card__desc", text: p.desc }),
    el(
      "div",
      { class: "plan-card__meta" },
      el("span", { text: `${dayCount} 个训练日` }),
      el("span", { class: "plan-card__dot" }),
      el("span", { text: `每周 ${p.daysPerWeek} 练` }),
      el("span", { class: "plan-card__dot" }),
      el("span", { text: `约 ${mins} 分钟/次` }),
      el("span", { class: "plan-card__dot" }),
      el("span", { text: `${sets} 组` }),
    ),
    el("div", { class: "plan-card__chev" }, iconEl("chevronRight")),
  );
}

export function renderPlans(): HTMLElement {
  const mine = loadMyPlans();

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
          iconEl("clipboard", "brand__mark"),
          el("span", { class: "brand__name", text: "训练计划" }),
        ),
        el("div", { class: "topbar__spacer" }),
        el(
          "button",
          {
            class: "icon-btn",
            attrs: { type: "button", "aria-label": "新建计划" },
            on: { click: () => newPlanHint() },
          },
          iconEl("plus"),
        ),
      ),
    ),
    el(
      "div",
      { class: "section" },
      el(
        "div",
        { class: "section__head" },
        el("h2", { class: "section__title", text: "我的计划" }),
        el("span", { class: "section__hint", text: mine.length ? `${mine.length} 个` : "" }),
      ),
      mine.length
        ? el("div", { class: "plans" }, ...mine.map(planCard))
        : el(
            "div",
            { class: "empty empty--compact" },
            iconEl("clipboard", "empty__icon"),
            el("p", { class: "empty__title", text: "还没有自己的计划" }),
            el("p", {
              class: "empty__hint",
              text: "从下面的模板复制一份，就能自由增删动作和调整组数",
            }),
          ),
    ),
    el(
      "div",
      { class: "section" },
      el(
        "div",
        { class: "section__head" },
        el("h2", { class: "section__title", text: "模板库" }),
        el("span", { class: "section__hint", text: "点开可直接跟练" }),
      ),
      el("div", { class: "plans" }, ...BUILTIN_PLANS.map(planCard)),
    ),
    el(
      "div",
      { class: "section" },
      el(
        "div",
        { class: "tip-card" },
        iconEl("info", "tip-card__icon"),
        el("div", {
          class: "tip-card__text",
          text: "计划里的动作都可以点开看图文和动画演示。训练时点动作右侧的组数圆点即可打卡，进度自动保存在本机。",
        }),
      ),
    ),
  );

  return screen;
}

/** 新建计划暂时引导用户走「复制模板」这条路 */
function newPlanHint(): void {
  const tip = document.querySelector(".tip-card");
  if (!tip) return;
  tip.classList.add("tip-card--flash");
  tip.scrollIntoView({ behavior: "smooth", block: "center" });
  window.setTimeout(() => tip.classList.remove("tip-card--flash"), 1400);
}
