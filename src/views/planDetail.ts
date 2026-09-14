import { el, clear } from "../core/dom";
import { iconEl } from "../components/icons";
import {
  GOAL_LABEL,
  LEVEL_LABEL,
  clonePlan,
  estimateMinutes,
  findPlan,
  loadMyPlans,
  loadProgress,
  saveMyPlans,
  saveProgress,
  today,
  totalSets,
} from "../core/plan";
import type { DayProgress, Plan, PlanDay } from "../core/plan";
import { state } from "../core/store";
import { back, navigate } from "../router";
import { toast } from "../components/toast";
import { openPlanEditor } from "../components/planEditor";

function specText(sets: number, reps: string, rest: number): string {
  const r = reps.endsWith("s") ? reps : `${reps} 次`;
  return `${sets} 组 × ${r} · 休息 ${rest}s`;
}

export function renderPlanDetail(planId: string): HTMLElement {
  const mine = loadMyPlans();
  const plan = findPlan(planId, mine);
  if (!plan) return notFound();

  const isMine = !plan.builtin;
  let dayIdx = 0;

  const progress = loadProgress();
  const planProg: Record<string, DayProgress> = (progress[plan.id] ??= {});

  const dayChips = el("div", { class: "chips chips--scroll" });
  const listEl = el("div", { class: "pitems" });
  const summaryEl = el("div", { class: "pday-sum" });
  const barEl = el("div", { class: "pbar" });

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
          on: { click: () => back() },
        },
        iconEl("chevronLeft"),
      ),
      el("div", { class: "detail__bar-title", attrs: { "data-show": "true" }, text: plan.name }),
      el(
        "button",
        {
          class: "icon-btn",
          attrs: { type: "button", "aria-label": isMine ? "编辑计划" : "复制到我的计划" },
          on: {
            click: () => {
              if (isMine) openPlanEditor(plan, () => navigate({ name: "plan", id: plan.id }));
              else copyToMine(plan);
            },
          },
        },
        iconEl(isMine ? "pencil" : "plus"),
      ),
    ),
    el(
      "div",
      { class: "section" },
      el(
        "div",
        { class: "chips", style: { marginBottom: "10px" } },
        el("span", { class: "tag tag--target", text: GOAL_LABEL[plan.goal] }),
        el("span", { class: "tag", text: LEVEL_LABEL[plan.level] }),
        el("span", { class: "tag", text: `每周 ${plan.daysPerWeek} 练` }),
      ),
      el("div", { class: "plan-desc", text: plan.desc }),
    ),
    el("div", { class: "section" }, dayChips),
    el("div", { class: "section" }, summaryEl, listEl),
    el("div", { class: "section" }, barEl),
    el("div", { class: "detail__actions" },
      el(
        "button",
        {
          class: "btn btn--primary",
          attrs: { type: "button" },
          on: {
            click: () => {
              if (isMine) openPlanEditor(plan, () => navigate({ name: "plan", id: plan.id }));
              else copyToMine(plan);
            },
          },
        },
        iconEl(isMine ? "pencil" : "plus"),
        el("span", { text: isMine ? "编辑计划" : "复制到我的计划" }),
      ),
      el(
        "button",
        {
          class: "btn btn--ghost",
          attrs: { type: "button", "aria-label": "重置本日进度" },
          on: { click: () => resetDay() },
        },
        iconEl("refresh"),
      ),
    ),
  );

  function copyToMine(p: Plan): void {
    const list = loadMyPlans();
    const copy = clonePlan(p);
    list.unshift(copy);
    saveMyPlans(list);
    toast("已复制到我的计划");
    navigate({ name: "plan", id: copy.id }, true);
  }

  function curDay(): PlanDay {
    return plan!.days[dayIdx];
  }

  function dayProgress(d: PlanDay): DayProgress {
    return (planProg[d.id] ??= { date: today(), done: {} });
  }

  function resetDay(): void {
    const d = curDay();
    planProg[d.id] = { date: today(), done: {} };
    saveProgress(progress);
    renderDay();
    toast("已重置本日进度");
  }

  function setDone(itemIdx: number, n: number): void {
    const d = curDay();
    const p = dayProgress(d);
    p.date = today();
    if (n <= 0) delete p.done[String(itemIdx)];
    else p.done[String(itemIdx)] = n;
    saveProgress(progress);
    renderDay();
  }

  function renderChips(): void {
    clear(dayChips);
    plan!.days.forEach((d, i) => {
      const done = planProg[d.id]?.done ?? {};
      const finished = Object.values(done).reduce((a, b) => a + b, 0);
      const all = totalSets(d);
      const complete = finished >= all && all > 0;
      dayChips.appendChild(
        el(
          "button",
          {
            class: "chip",
            attrs: { type: "button", "data-active": String(i === dayIdx) },
            on: {
              click: () => {
                dayIdx = i;
                renderChips();
                renderDay();
              },
            },
          },
          el("span", { text: d.name }),
          complete ? iconEl("check", "chip__x") : null,
        ),
      );
    });
  }

  function renderDay(): void {
    const d = curDay();
    const p = dayProgress(d);
    const doneMap = p.done;

    clear(summaryEl);
    const doneSets = Object.values(doneMap).reduce((a, b) => a + b, 0);
    const allSets = totalSets(d);
    const pct = allSets ? Math.round((doneSets / allSets) * 100) : 0;

    summaryEl.appendChild(
      el(
        "div",
        { class: "pday-sum__head" },
        el("div", { class: "pday-sum__title", text: d.name }),
        el("div", {
          class: "pday-sum__meta",
          text: `约 ${estimateMinutes(d)} 分钟 · ${allSets} 组`,
        }),
      ),
    );
    summaryEl.appendChild(
      el(
        "div",
        { class: "pday-sum__bar" },
        el("div", { class: "pday-sum__fill", style: { width: `${pct}%` } }),
      ),
    );
    summaryEl.appendChild(
      el("div", {
        class: "pday-sum__stat",
        text: pct >= 100 ? "今日已完成 ✓" : `已完成 ${doneSets} / ${allSets} 组（${pct}%）`,
      }),
    );

    clear(listEl);
    d.items.forEach((it, i) => {
      const ex = state.byId.get(it.exId);
      const name = ex ? ex.zh : `未知动作 ${it.exId}`;
      const n = doneMap[String(i)] ?? 0;

      const dots = el("div", { class: "dots" });
      for (let k = 1; k <= it.sets; k++) {
        dots.appendChild(
          el("button", {
            class: "dot",
            attrs: {
              type: "button",
              "data-on": String(k <= n),
              "aria-label": `第 ${k} 组`,
            },
            on: {
              click: (ev) => {
                ev.stopPropagation();
                setDone(i, n === k ? k - 1 : k);
              },
            },
          }),
        );
      }

      listEl.appendChild(
        el(
          "div",
          { class: "pitem", attrs: { "data-done": String(n >= it.sets) } },
          el("div", { class: "pitem__idx", text: String(i + 1) }),
          el(
            "button",
            {
              class: "pitem__main",
              attrs: { type: "button" },
              on: { click: () => navigate({ name: "detail", id: it.exId }) },
            },
            el("div", { class: "pitem__name", text: name }),
            el("div", { class: "pitem__spec", text: specText(it.sets, it.reps, it.rest) }),
          ),
          dots,
        ),
      );
    });
  }

  function renderBar(): void {
    clear(barEl);
    const totalDays = plan!.days.length;
    const finishedDays = plan!.days.filter((d) => {
      const done = planProg[d.id]?.done ?? {};
      const sum = Object.values(done).reduce((a, b) => a + b, 0);
      return sum >= totalSets(d) && totalSets(d) > 0;
    }).length;
    barEl.appendChild(
      el(
        "div",
        { class: "tip-card" },
        iconEl("info", "tip-card__icon"),
        el("div", {
          class: "tip-card__text",
          text: `本轮已完成 ${finishedDays} / ${totalDays} 个训练日。进度只存在本机，换设备不会同步。`,
        }),
      ),
    );
  }

  renderChips();
  renderDay();
  renderBar();
  return screen;
}

function notFound(): HTMLElement {
  return el(
    "div",
    { class: "screen" },
    el(
      "div",
      { class: "empty", style: { paddingTop: "26vh" } },
      iconEl("alert", "empty__icon"),
      el("p", { class: "empty__title", text: "没有找到这个计划" }),
      el("button", {
        class: "chip",
        style: { marginTop: "16px" },
        attrs: { type: "button" },
        text: "返回计划列表",
        on: { click: () => navigate({ name: "plans" }) },
      }),
    ),
  );
}
