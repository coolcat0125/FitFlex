import { el } from "../core/dom";
import { iconEl } from "../components/icons";
import { BUILTIN_PLANS, loadMyPlans, loadProgress } from "../core/plan";
import { getOfflineStatus } from "../core/offline";
import type { OfflineStatus } from "../core/offline";
import { state } from "../core/store";
import { navigate } from "../router";
import type { HomeCtx } from "./home";

const RM_KEY = "fitflex:1rm-records";

function rmCount(): number {
  try {
    const raw = localStorage.getItem(RM_KEY);
    const v = raw ? (JSON.parse(raw) as unknown[]) : [];
    return Array.isArray(v) ? v.length : 0;
  } catch {
    return 0;
  }
}

function statCard(label: string, value: string, onClick?: () => void): HTMLElement {
  return el(
    onClick ? "button" : "div",
    {
      class: "stat",
      attrs: onClick ? { type: "button" } : {},
      on: onClick ? { click: onClick } : {},
    },
    el("div", { class: "stat__value", text: value }),
    el("div", { class: "stat__label", text: label }),
  );
}

function offlineCard(s: OfflineStatus): HTMLElement {
  if (!s.supported) {
    return el(
      "div",
      { class: "tip-card" },
      iconEl("info", "tip-card__icon"),
      el("div", {
        class: "tip-card__text",
        text: "当前环境不支持离线缓存（需要 HTTPS 或 localhost）。检索、计划、力量计算等功能都不受影响。",
      }),
    );
  }

  const pct = s.dataTarget ? Math.min(100, Math.round((s.data / s.dataTarget) * 100)) : 0;
  const title = s.ready ? "离线已就绪" : s.active ? "正在准备离线缓存" : "离线缓存未启动";
  const desc = s.ready
    ? "断网也能打开任意动作详情、训练计划和 1RM 工具。"
    : `正在后台缓存数据（${s.data} / ${s.dataTarget}），保持联网片刻即可完成。`;

  return el(
    "div",
    { class: "offline", attrs: { "data-ready": String(s.ready) } },
    el(
      "div",
      { class: "offline__head" },
      el("span", { class: "offline__dot" }),
      el("span", { class: "offline__title", text: title }),
    ),
    el("div", { class: "offline__desc", text: desc }),
    el(
      "div",
      { class: "offline__bar" },
      el("div", { class: "offline__fill", style: { width: `${pct}%` } }),
    ),
    el("div", {
      class: "offline__meta",
      text: `外壳 ${s.shell} 项 · 数据 ${s.data}/${s.dataTarget} · 媒体 ${s.media} 项`,
    }),
  );
}

export function renderMe(ctx: HomeCtx): HTMLElement {
  const myPlans = loadMyPlans();
  const prog = loadProgress();
  const finishedDays = Object.values(prog).reduce(
    (n, days) => n + Object.values(days).filter((d) => Object.keys(d.done).length > 0).length,
    0,
  );

  const offlineSlot = el("div", { class: "section" });

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
          iconEl("user", "brand__mark"),
          el("span", { class: "brand__name", text: "我的" }),
        ),
      ),
    ),

    // 数据概览
    el(
      "div",
      { class: "section" },
      el(
        "div",
        { class: "stats" },
        statCard("收藏动作", String(state.favorites.size), () => navigate({ name: "favorites" })),
        statCard("我的计划", String(myPlans.length), () => navigate({ name: "plans" })),
        statCard("训练记录", String(finishedDays)),
        statCard("1RM 记录", String(rmCount())),
      ),
    ),

    // 离线状态（异步填充）
    offlineSlot,

    // 入口
    el(
      "div",
      { class: "section" },
      el("div", { class: "menu" },
        menuItem("star", "我的收藏", state.favorites.size ? `${state.favorites.size} 个动作` : "还没有收藏", () =>
          navigate({ name: "favorites" }),
        ),
        menuItem("clipboard", "训练计划", `${BUILTIN_PLANS.length} 套模板 · ${myPlans.length} 个自定义`, () =>
          navigate({ name: "plans" }),
        ),
        menuItem("bolt", "最大肌力", "1RM 估算与配重表", () => navigate({ name: "strength" })),
      ),
    ),

    // 外观
    el(
      "div",
      { class: "section" },
      el(
        "div",
        { class: "menu" },
        menuItem(
          ctx.theme() === "dark" ? "moon" : "sun",
          "外观主题",
          ctx.theme() === "dark" ? "深色（默认）" : "浅色",
          ctx.toggleTheme,
        ),
      ),
    ),

    // 关于
    el(
      "div",
      { class: "section" },
      el(
        "div",
        { class: "panel" },
        el("div", { class: "panel__label", text: "关于" }),
        el(
          "div",
          { style: { fontSize: "var(--fs-sm)", color: "var(--text-2)", lineHeight: "var(--lh-base)" } },
          el("div", { text: "FitFlex · 健身动作库" }),
          el("div", {
            style: { marginTop: "6px" },
            text: `${state.meta?.count ?? 1324} 个动作，按肌群、器械、类型快速检索，并支持训练计划与最大肌力估算。`,
          }),
          el("div", {
            style: { marginTop: "6px", color: "var(--text-3)" },
            text: "动作数据来自 exercises-dataset（MIT），图片与动画 © Gym visual，仅作演示用途。",
          }),
          el("div", {
            style: { marginTop: "6px", color: "var(--text-3)" },
            text: "收藏、计划进度与 1RM 记录都保存在本机浏览器，不会上传。",
          }),
        ),
      ),
    ),
  );

  // 缓存状态要等浏览器答复，先渲染再异步补上
  const shardCount = state.meta?.shards?.length ?? 37;
  void getOfflineStatus(shardCount).then((s) => {
    if (!offlineSlot.isConnected) return;
    offlineSlot.replaceChildren(offlineCard(s));
  });

  return screen;
}

function menuItem(
  icon: Parameters<typeof iconEl>[0],
  title: string,
  sub: string,
  onClick: () => void,
): HTMLElement {
  return el(
    "button",
    { class: "menu__item", attrs: { type: "button" }, on: { click: onClick } },
    el("span", { class: "menu__icon" }, iconEl(icon)),
    el(
      "span",
      { class: "menu__body" },
      el("span", { class: "menu__title", text: title }),
      el("span", { class: "menu__sub", text: sub }),
    ),
    el("span", { class: "menu__chev" }, iconEl("chevronRight")),
  );
}
