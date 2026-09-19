/**
 * 主题皮肤（Theme skins）。
 *
 * 5 套皮肤共用同一套组件代码，只换颜色令牌 —— 切换就是改 `<html data-theme>`。
 * 旧版本只有 dark / light 两态，读取时自动迁移到对应的新皮肤。
 */

export type ThemeKey = "carbon" | "hevy" | "strava" | "steel" | "paper";

export interface ThemeDef {
  key: ThemeKey;
  name: string;
  tagline: string;
  scheme: "dark" | "light";
  /** 选择器预览色块：[底色, 卡片色, 强调色, 文字色] */
  swatch: readonly [string, string, string, string];
}

export const THEMES: readonly ThemeDef[] = [
  {
    key: "carbon",
    name: "Carbon Lime",
    tagline: "碳黑 · 荧光青柠",
    scheme: "dark",
    swatch: ["#0a0c10", "#14181f", "#c8f135", "#f2f5f7"],
  },
  {
    key: "hevy",
    name: "Hevy Blue",
    tagline: "近黑 · 电蓝",
    scheme: "dark",
    swatch: ["#0a0a0a", "#191a1b", "#1d83ea", "#f7f9fb"],
  },
  {
    key: "strava",
    name: "Strava Ember",
    tagline: "纯黑 · 烈焰橙",
    scheme: "dark",
    swatch: ["#000000", "#1c1c19", "#fc5200", "#f9f8f5"],
  },
  {
    key: "steel",
    name: "Steel Forge",
    tagline: "深灰 · 蓝与金",
    scheme: "dark",
    swatch: ["#121212", "#1f2629", "#35a7ff", "#ffffff"],
  },
  {
    key: "paper",
    name: "Paper Neon",
    tagline: "亮白 · 霓虹绿",
    scheme: "light",
    swatch: ["#ffffff", "#f4f6f8", "#c6ff00", "#0f1216"],
  },
];

const KEY = "fitflex:theme";
const VALID = new Set<string>(THEMES.map((t) => t.key));

/** 旧版两态取值 → 新皮肤名 */
const LEGACY: Record<string, ThemeKey> = { dark: "carbon", light: "paper" };

export const DEFAULT_THEME: ThemeKey = "carbon";

export function currentTheme(): ThemeKey {
  try {
    const saved = localStorage.getItem(KEY);
    if (!saved) return DEFAULT_THEME;
    if (VALID.has(saved)) return saved as ThemeKey;
    return LEGACY[saved] ?? DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function themeDef(key: ThemeKey): ThemeDef {
  return THEMES.find((t) => t.key === key) ?? THEMES[0];
}

export function isDark(key: ThemeKey): boolean {
  return themeDef(key).scheme === "dark";
}

export function applyTheme(key: ThemeKey): void {
  document.documentElement.setAttribute("data-theme", key);
  // 状态栏 / 地址栏颜色跟随皮肤底色，否则换到浅色皮肤后状态栏还是黑的
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", themeDef(key).swatch[0]);
}

export function saveTheme(key: ThemeKey): void {
  try {
    localStorage.setItem(KEY, key);
  } catch {
    /* 隐私模式写入失败可忽略 */
  }
}

/** 深色 ↔ 浅色皮肤之间快速切换，保留原有主题按钮的行为 */
export function nextSchemeTheme(key: ThemeKey): ThemeKey {
  return isDark(key) ? "paper" : "carbon";
}

/** 视图层拿到的主题上下文 */
export interface ThemeCtx {
  theme: () => ThemeKey;
  setTheme: (k: ThemeKey) => void;
  toggleTheme: () => void;
  isDark: () => boolean;
}
