import { el } from "../core/dom";
import { iconEl } from "./icons";
import type { IconName } from "./icons";
import { navigate, tabOf } from "../router";
import type { Route, TabKey } from "../router";

interface TabDef {
  key: TabKey;
  label: string;
  icon: IconName;
  to: Route;
}

const TABS: TabDef[] = [
  { key: "exercises", label: "动作", icon: "dumbbell", to: { name: "home" } },
  { key: "plans", label: "计划", icon: "clipboard", to: { name: "plans" } },
  { key: "strength", label: "力量", icon: "bolt", to: { name: "strength" } },
  { key: "me", label: "我的", icon: "user", to: { name: "me" } },
];

/** 底部主导航。页面切换时整棵重建，所以只按传入的 route 渲染一次即可。 */
export function createTabbar(route: Route): HTMLElement {
  const active = tabOf(route);
  const bar = el("nav", { class: "tabbar", attrs: { "aria-label": "主导航" } });

  for (const t of TABS) {
    const on = t.key === active;
    bar.appendChild(
      el(
        "button",
        {
          class: "tab",
          attrs: {
            type: "button",
            "data-active": String(on),
            "aria-current": on ? "page" : "false",
          },
          on: { click: () => navigate(t.to) },
        },
        iconEl(t.icon, "tab__icon"),
        el("span", { class: "tab__label", text: t.label }),
      ),
    );
  }
  return bar;
}
