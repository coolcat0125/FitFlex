/**
 * 最大肌力（1RM）估算。
 *
 * 单一公式都有偏差，所以同时给出多个经典公式的结果并取均值，
 * 同时提示「可信区间」——次数越大，公式外推误差越大。
 */

export type Unit = "kg" | "lb";

export const KG_PER_LB = 0.45359237;

export const toKg = (v: number, u: Unit): number => (u === "kg" ? v : v * KG_PER_LB);
export const fromKg = (v: number, u: Unit): number => (u === "kg" ? v : v / KG_PER_LB);

/** 重量取整：kg 到 0.5，lb 到 1 */
export function roundWeight(v: number, u: Unit): number {
  return u === "kg" ? Math.round(v * 2) / 2 : Math.round(v);
}

export function fmtWeight(v: number, u: Unit): string {
  const r = roundWeight(v, u);
  return (Number.isInteger(r) ? r.toFixed(0) : r.toFixed(1)) + " " + u;
}

/* ------------------------------------------------------------------ *
 * 公式
 * ------------------------------------------------------------------ */

export interface Formula {
  key: string;
  name: string;
  /** 原始出处，界面上用 tooltip 展示 */
  note: string;
  calc: (w: number, r: number) => number;
}

export const FORMULAS: readonly Formula[] = [
  {
    key: "epley",
    name: "Epley",
    note: "1RM = 重量 × (1 + 次数 / 30)，1985 年提出，应用最广",
    calc: (w, r) => w * (1 + r / 30),
  },
  {
    key: "brzycki",
    name: "Brzycki",
    note: "1RM = 重量 × 36 / (37 − 次数)，1993 年提出，低次数段较准",
    calc: (w, r) => (r >= 37 ? w : (w * 36) / (37 - r)),
  },
  {
    key: "lombardi",
    name: "Lombardi",
    note: "1RM = 重量 × 次数 ^ 0.10，1989 年提出，结果偏保守",
    calc: (w, r) => w * Math.pow(r, 0.1),
  },
  {
    key: "oconner",
    name: "O'Conner",
    note: "1RM = 重量 × (1 + 次数 / 40)，1989 年提出，外推较温和",
    calc: (w, r) => w * (1 + r / 40),
  },
  {
    key: "wathan",
    name: "Wathan",
    note: "1RM = 重量 × 100 / (48.8 + 53.8 × e^(−0.075 × 次数))，1994 年提出",
    calc: (w, r) => (w * 100) / (48.8 + 53.8 * Math.exp(-0.075 * r)),
  },
  {
    key: "lander",
    name: "Lander",
    note: "1RM = 重量 × 100 / (101.3 − 2.67123 × 次数)，1985 年提出",
    calc: (w, r) => {
      const d = 101.3 - 2.67123 * r;
      return d <= 0 ? w : (w * 100) / d;
    },
  },
];

export interface Estimate {
  key: string;
  name: string;
  value: number;
  /** 与均值的偏离百分比 */
  delta: number;
}

export interface OneRmResult {
  weight: number;
  reps: number;
  estimates: Estimate[];
  /** 各公式均值，作为推荐值 */
  average: number;
  /** 公式之间的最大分歧（百分比），越大说明越不可信 */
  spread: number;
  /** 可信度：次数 ≤ 5 高，6-10 中，>10 低 */
  confidence: "high" | "medium" | "low";
}

export function estimateOneRm(weight: number, reps: number): OneRmResult | null {
  if (!Number.isFinite(weight) || weight <= 0) return null;
  if (!Number.isFinite(reps) || reps < 1) return null;
  if (reps > 30) reps = 30; // 超过 30 次，任何公式都没有意义
  if (reps === 1) {
    // 单次即最大重量，无需估算
    return {
      weight,
      reps,
      estimates: FORMULAS.map((f) => ({ key: f.key, name: f.name, value: weight, delta: 0 })),
      average: weight,
      spread: 0,
      confidence: "high",
    };
  }

  const raw = FORMULAS.map((f) => ({ key: f.key, name: f.name, value: f.calc(weight, reps) }));
  const avg = raw.reduce((s, e) => s + e.value, 0) / raw.length;
  const estimates = raw.map((e) => ({ ...e, delta: ((e.value - avg) / avg) * 100 }));
  const min = Math.min(...raw.map((e) => e.value));
  const max = Math.max(...raw.map((e) => e.value));

  return {
    weight,
    reps,
    estimates,
    average: avg,
    spread: ((max - min) / avg) * 100,
    confidence: reps <= 5 ? "high" : reps <= 10 ? "medium" : "low",
  };
}

export const CONFIDENCE_LABEL: Record<OneRmResult["confidence"], string> = {
  high: "可信度高",
  medium: "参考性中等",
  low: "误差较大，建议用更少的次数再测一次",
};

/* ------------------------------------------------------------------ *
 * 强度区
 * ------------------------------------------------------------------ */

export type ZoneTone = "max" | "strength" | "hyper" | "endurance";

export interface Zone {
  pct: number;
  reps: string;
  sets: string;
  rest: string;
  purpose: string;
  tone: ZoneTone;
}

/** 基于 %1RM 的经典强度区（NSCA 对应关系） */
export const ZONES: readonly Zone[] = [
  { pct: 100, reps: "1", sets: "—", rest: "—", purpose: "极限测试", tone: "max" },
  { pct: 95, reps: "2", sets: "3-5", rest: "3-5 分钟", purpose: "最大力量", tone: "max" },
  { pct: 90, reps: "4", sets: "3-5", rest: "3-5 分钟", purpose: "最大力量", tone: "strength" },
  { pct: 85, reps: "6", sets: "3-5", rest: "2-4 分钟", purpose: "力量", tone: "strength" },
  { pct: 80, reps: "8", sets: "3-5", rest: "2-3 分钟", purpose: "力量 · 增肌", tone: "strength" },
  { pct: 75, reps: "10", sets: "3-6", rest: "1-2 分钟", purpose: "增肌", tone: "hyper" },
  { pct: 70, reps: "12", sets: "3-6", rest: "1-2 分钟", purpose: "增肌", tone: "hyper" },
  { pct: 65, reps: "15", sets: "2-4", rest: "1 分钟", purpose: "增肌 · 肌耐力", tone: "endurance" },
  { pct: 60, reps: "20", sets: "2-4", rest: "30-60 秒", purpose: "肌耐力", tone: "endurance" },
];

export interface LoadRow {
  pct: number;
  weight: number;
  reps: string;
  purpose: string;
  tone: ZoneTone;
}

/** 由 1RM 生成配重表（重量按单位取整到可加的步进） */
export function loadTable(oneRm: number, unit: Unit): LoadRow[] {
  return ZONES.map((z) => ({
    pct: z.pct,
    weight: roundWeight((oneRm * z.pct) / 100, unit),
    reps: z.reps,
    purpose: z.purpose,
    tone: z.tone,
  }));
}

/** 该重量是 1RM 的百分之多少（用于反推当前训练强度落在哪个区） */
export function pctOfOneRm(weight: number, oneRm: number): number {
  if (oneRm <= 0) return 0;
  return (weight / oneRm) * 100;
}

/** 找到最接近的强度区 */
export function zoneOf(pct: number): Zone {
  let best = ZONES[0];
  for (const z of ZONES) {
    if (Math.abs(z.pct - pct) < Math.abs(best.pct - pct)) best = z;
  }
  return best;
}

/* ------------------------------------------------------------------ *
 * 杠铃片拆解
 * ------------------------------------------------------------------ */

interface PlateSpec {
  bar: number;
  plates: number[];
}

const PLATE_SPEC: Record<Unit, PlateSpec> = {
  kg: { bar: 20, plates: [25, 20, 15, 10, 5, 2.5, 1.25] },
  lb: { bar: 45, plates: [45, 35, 25, 10, 5, 2.5] },
};

export interface PlateResult {
  bar: number;
  perSide: number[];
  /** 实际能达到的总重 */
  achieved: number;
  /** 与目标差值（实际 − 目标） */
  diff: number;
  unit: Unit;
}

/**
 * 把目标重量拆成「每边挂哪些片」。
 * 贪心从大到小取片；杆重不够或重量不是可凑出的值时会返回实际可达重量。
 */
export function platesFor(target: number, unit: Unit): PlateResult | null {
  const spec = PLATE_SPEC[unit];
  if (!Number.isFinite(target) || target < spec.bar) return null;

  let perSide = (target - spec.bar) / 2;
  const used: number[] = [];
  for (const p of spec.plates) {
    while (perSide >= p - 1e-9) {
      used.push(p);
      perSide -= p;
    }
  }
  const achieved = spec.bar + used.reduce((s, p) => s + p, 0) * 2;
  return {
    bar: spec.bar,
    perSide: used,
    achieved,
    diff: achieved - target,
    unit,
  };
}

/** 列出该单位可用的杠铃片 */
export function plateInventory(unit: Unit): number[] {
  return [...PLATE_SPEC[unit].plates];
}

export function barWeight(unit: Unit): number {
  return PLATE_SPEC[unit].bar;
}
