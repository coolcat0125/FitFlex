/**
 * 训练计划：数据模型 + 内置模板 + 本地持久化。
 *
 * 设计取舍：
 * - 内置模板写在代码里（只读），用户「复制到我」后才可编辑，避免模板被改坏。
 * - 进度按「计划 → 训练日」记最近一次，不做完整历史表——手机端够用且省存储。
 * - 模板里的 exId 必须真实存在于动作库，`assertTemplateIds()` 会在启动时自检。
 */

export type GoalKey = "strength" | "hypertrophy" | "fatloss" | "general";
export type LevelKey = "beginner" | "intermediate" | "advanced";

export interface PlanItem {
  /** 动作库里的 id */
  exId: string;
  sets: number;
  /** 次数或时长，如 "8-10" / "45s" */
  reps: string;
  /** 组间休息（秒） */
  rest: number;
}

export interface PlanDay {
  id: string;
  name: string;
  items: PlanItem[];
}

export interface Plan {
  id: string;
  name: string;
  goal: GoalKey;
  level: LevelKey;
  daysPerWeek: number;
  desc: string;
  days: PlanDay[];
  /** 内置模板为 true，不可直接编辑 */
  builtin?: boolean;
}

export const GOAL_LABEL: Record<GoalKey, string> = {
  strength: "最大力量",
  hypertrophy: "增肌",
  fatloss: "减脂",
  general: "综合体能",
};

export const LEVEL_LABEL: Record<LevelKey, string> = {
  beginner: "新手",
  intermediate: "进阶",
  advanced: "高阶",
};

/* ------------------------------------------------------------------ *
 * 内置模板
 * ------------------------------------------------------------------ */

/** 缩写：动作 id 全部核对过存在性 */
const T: Plan[] = [
  {
    id: "ppl",
    name: "推拉腿三分化",
    goal: "hypertrophy",
    level: "intermediate",
    daysPerWeek: 6,
    desc: "经典 PPL 分化：推日练胸肩三头，拉日练背二头，腿日练下肢核心。可练 3 天（每周一轮）或 6 天（每周两轮）。",
    days: [
      {
        id: "push",
        name: "推 · 胸肩三头",
        items: [
          { exId: "0025", sets: 4, reps: "6-8", rest: 150 },
          { exId: "0047", sets: 3, reps: "8-10", rest: 120 },
          { exId: "0405", sets: 3, reps: "8-10", rest: 120 },
          { exId: "0334", sets: 3, reps: "12-15", rest: 75 },
          { exId: "0200", sets: 3, reps: "10-12", rest: 75 },
          { exId: "0092", sets: 3, reps: "10-12", rest: 75 },
        ],
      },
      {
        id: "pull",
        name: "拉 · 背二头",
        items: [
          { exId: "0652", sets: 4, reps: "6-10", rest: 150 },
          { exId: "0027", sets: 4, reps: "6-8", rest: 150 },
          { exId: "0861", sets: 3, reps: "10-12", rest: 90 },
          { exId: "0383", sets: 3, reps: "12-15", rest: 60 },
          { exId: "0031", sets: 3, reps: "8-12", rest: 75 },
          { exId: "0313", sets: 3, reps: "10-12", rest: 60 },
        ],
      },
      {
        id: "legs",
        name: "腿 · 下肢核心",
        items: [
          { exId: "0043", sets: 4, reps: "6-8", rest: 180 },
          { exId: "0085", sets: 3, reps: "8-10", rest: 120 },
          { exId: "0739", sets: 3, reps: "10-12", rest: 120 },
          { exId: "0586", sets: 3, reps: "10-12", rest: 75 },
          { exId: "0108", sets: 4, reps: "12-15", rest: 60 },
          { exId: "0472", sets: 3, reps: "10-15", rest: 60 },
        ],
      },
    ],
  },
  {
    id: "ul4",
    name: "上下肢两分化",
    goal: "hypertrophy",
    level: "intermediate",
    daysPerWeek: 4,
    desc: "上肢/下肢交替，每周四练。频率与恢复平衡得较好，适合练了一两年想稳定进步的人。",
    days: [
      {
        id: "upper-a",
        name: "上肢 A · 水平推拉",
        items: [
          { exId: "0025", sets: 4, reps: "6-8", rest: 150 },
          { exId: "0027", sets: 4, reps: "6-8", rest: 150 },
          { exId: "0405", sets: 3, reps: "8-10", rest: 120 },
          { exId: "0652", sets: 3, reps: "6-10", rest: 120 },
          { exId: "0031", sets: 3, reps: "10-12", rest: 75 },
          { exId: "0200", sets: 3, reps: "10-12", rest: 75 },
        ],
      },
      {
        id: "lower-a",
        name: "下肢 A · 蹲为主",
        items: [
          { exId: "0043", sets: 4, reps: "6-8", rest: 180 },
          { exId: "0085", sets: 3, reps: "8-10", rest: 120 },
          { exId: "0054", sets: 3, reps: "10-12", rest: 90 },
          { exId: "0585", sets: 3, reps: "12-15", rest: 75 },
          { exId: "0108", sets: 4, reps: "12-15", rest: 60 },
          { exId: "0464", sets: 3, reps: "45s", rest: 45 },
        ],
      },
      {
        id: "upper-b",
        name: "上肢 B · 垂直推拉",
        items: [
          { exId: "0047", sets: 4, reps: "8-10", rest: 120 },
          { exId: "0861", sets: 4, reps: "8-12", rest: 120 },
          { exId: "0673", sets: 3, reps: "10-12", rest: 90 },
          { exId: "0334", sets: 3, reps: "12-15", rest: 60 },
          { exId: "0313", sets: 3, reps: "10-12", rest: 60 },
          { exId: "0092", sets: 3, reps: "10-12", rest: 75 },
        ],
      },
      {
        id: "lower-b",
        name: "下肢 B · 髋为主",
        items: [
          { exId: "0032", sets: 4, reps: "5-6", rest: 180 },
          { exId: "0739", sets: 4, reps: "10-12", rest: 120 },
          { exId: "0586", sets: 3, reps: "10-12", rest: 75 },
          { exId: "1409", sets: 3, reps: "10-12", rest: 90 },
          { exId: "0108", sets: 4, reps: "15-20", rest: 60 },
          { exId: "0472", sets: 3, reps: "10-15", rest: 60 },
        ],
      },
    ],
  },
  {
    id: "bro5",
    name: "五分化训练",
    goal: "hypertrophy",
    level: "advanced",
    daysPerWeek: 5,
    desc: "胸/背/腿/肩/臂各占一天，单部位容量拉满。适合训练年限较长、恢复能力强的人。",
    days: [
      {
        id: "chest",
        name: "胸",
        items: [
          { exId: "0025", sets: 4, reps: "6-8", rest: 150 },
          { exId: "0047", sets: 4, reps: "8-10", rest: 120 },
          { exId: "0289", sets: 3, reps: "10-12", rest: 90 },
          { exId: "0308", sets: 3, reps: "12-15", rest: 75 },
          { exId: "0251", sets: 3, reps: "8-12", rest: 90 },
        ],
      },
      {
        id: "back",
        name: "背",
        items: [
          { exId: "0652", sets: 4, reps: "6-10", rest: 150 },
          { exId: "0032", sets: 3, reps: "5-6", rest: 180 },
          { exId: "0027", sets: 4, reps: "8-10", rest: 120 },
          { exId: "0861", sets: 3, reps: "10-12", rest: 90 },
          { exId: "0237", sets: 3, reps: "12-15", rest: 60 },
          { exId: "0095", sets: 3, reps: "12-15", rest: 60 },
        ],
      },
      {
        id: "legs5",
        name: "腿",
        items: [
          { exId: "0043", sets: 4, reps: "6-8", rest: 180 },
          { exId: "0042", sets: 3, reps: "8-10", rest: 150 },
          { exId: "0085", sets: 3, reps: "8-10", rest: 120 },
          { exId: "0739", sets: 3, reps: "10-12", rest: 120 },
          { exId: "0586", sets: 3, reps: "10-12", rest: 75 },
          { exId: "0108", sets: 4, reps: "12-15", rest: 60 },
        ],
      },
      {
        id: "shoulders",
        name: "肩",
        items: [
          { exId: "0091", sets: 4, reps: "6-8", rest: 150 },
          { exId: "0405", sets: 3, reps: "8-10", rest: 120 },
          { exId: "0334", sets: 4, reps: "12-15", rest: 60 },
          { exId: "0310", sets: 3, reps: "12-15", rest: 60 },
          { exId: "0383", sets: 3, reps: "12-15", rest: 60 },
        ],
      },
      {
        id: "arms",
        name: "手臂",
        items: [
          { exId: "0031", sets: 4, reps: "8-10", rest: 90 },
          { exId: "0447", sets: 3, reps: "10-12", rest: 75 },
          { exId: "0313", sets: 3, reps: "10-12", rest: 60 },
          { exId: "0060", sets: 4, reps: "8-10", rest: 90 },
          { exId: "0200", sets: 3, reps: "10-12", rest: 75 },
          { exId: "0092", sets: 3, reps: "12-15", rest: 60 },
        ],
      },
    ],
  },
  {
    id: "fullbody",
    name: "新手全身训练",
    goal: "general",
    level: "beginner",
    daysPerWeek: 3,
    desc: "每周三练，每次覆盖全身主要肌群。动作少、以复合动作为主，适合刚开始接触力量训练的人打基础。",
    days: [
      {
        id: "fb-a",
        name: "全身 A",
        items: [
          { exId: "0043", sets: 3, reps: "8-10", rest: 150 },
          { exId: "0025", sets: 3, reps: "8-10", rest: 120 },
          { exId: "0027", sets: 3, reps: "8-10", rest: 120 },
          { exId: "0405", sets: 2, reps: "10-12", rest: 90 },
          { exId: "0464", sets: 3, reps: "30s", rest: 45 },
        ],
      },
      {
        id: "fb-b",
        name: "全身 B",
        items: [
          { exId: "0032", sets: 3, reps: "6-8", rest: 180 },
          { exId: "0047", sets: 3, reps: "8-10", rest: 120 },
          { exId: "0673", sets: 3, reps: "10-12", rest: 90 },
          { exId: "0334", sets: 2, reps: "12-15", rest: 60 },
          { exId: "0472", sets: 3, reps: "10-12", rest: 60 },
        ],
      },
      {
        id: "fb-c",
        name: "全身 C",
        items: [
          { exId: "0042", sets: 3, reps: "8-10", rest: 150 },
          { exId: "0289", sets: 3, reps: "10-12", rest: 120 },
          { exId: "0861", sets: 3, reps: "10-12", rest: 90 },
          { exId: "0313", sets: 2, reps: "10-12", rest: 60 },
          { exId: "0200", sets: 2, reps: "10-12", rest: 60 },
        ],
      },
    ],
  },
  {
    id: "s5x5",
    name: "力量优先 5×5",
    goal: "strength",
    level: "intermediate",
    daysPerWeek: 3,
    desc: "围绕深蹲/卧推/硬拉/推举的低次数大重量训练，每次只练三个动作，逐次加重。目标是提升 1RM。",
    days: [
      {
        id: "a",
        name: "A 日",
        items: [
          { exId: "0043", sets: 5, reps: "5", rest: 210 },
          { exId: "0025", sets: 5, reps: "5", rest: 210 },
          { exId: "0027", sets: 5, reps: "5", rest: 180 },
        ],
      },
      {
        id: "b",
        name: "B 日",
        items: [
          { exId: "0043", sets: 5, reps: "5", rest: 210 },
          { exId: "0091", sets: 5, reps: "5", rest: 210 },
          { exId: "0032", sets: 1, reps: "5", rest: 240 },
        ],
      },
    ],
  },
];

/**
 * 内置模板统一打上 builtin 标记。
 * 不在每个模板里手写 `builtin: true`——漏一个就会让内置计划被当成用户计划，
 * 界面上直接变成「编辑」而不是「复制」，这个坑踩过一次。
 */
export const BUILTIN_PLANS: readonly Plan[] = T.map((p) => ({ ...p, builtin: true }));

/* ------------------------------------------------------------------ *
 * 持久化
 * ------------------------------------------------------------------ */

const MY_KEY = "fitflex:my-plans";
const PROG_KEY = "fitflex:plan-progress";

/** planId → dayId → 最近一次训练记录 */
export interface DayProgress {
  date: string;
  /** 动作序号 → 已完成组数 */
  done: Record<string, number>;
}

export type ProgressMap = Record<string, Record<string, DayProgress>>;

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* 隐私模式写入失败可忽略 */
  }
}

export function loadMyPlans(): Plan[] {
  const list = readJSON<Plan[]>(MY_KEY, []);
  return Array.isArray(list) ? list.filter((p) => p && p.id && Array.isArray(p.days)) : [];
}

export function saveMyPlans(list: Plan[]): void {
  writeJSON(MY_KEY, list);
}

export function loadProgress(): ProgressMap {
  return readJSON<ProgressMap>(PROG_KEY, {});
}

export function saveProgress(p: ProgressMap): void {
  writeJSON(PROG_KEY, p);
}

/* ------------------------------------------------------------------ *
 * 工具
 * ------------------------------------------------------------------ */

/** 今天（本地时区）的 YYYY-MM-DD */
export function today(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function uid(prefix = "p"): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** 一个训练日的总组数 */
export function totalSets(day: PlanDay): number {
  return day.items.reduce((n, it) => n + it.sets, 0);
}

/** 估算一个训练日的时长（分钟）：按 组数 ×（组间休息 + 约 35 秒做功） */
export function estimateMinutes(day: PlanDay): number {
  const sec = day.items.reduce((n, it) => n + it.sets * (it.rest + 35), 0);
  return Math.max(10, Math.round(sec / 60));
}

/** 按 id 找计划（先我的，后内置） */
export function findPlan(id: string, mine: Plan[]): Plan | null {
  return mine.find((p) => p.id === id) ?? BUILTIN_PLANS.find((p) => p.id === id) ?? null;
}

/** 深拷贝一份计划（用于「复制到我」） */
export function clonePlan(src: Plan, nameSuffix = "（副本）"): Plan {
  return {
    ...src,
    id: uid("my"),
    name: src.name + nameSuffix,
    builtin: false,
    days: src.days.map((d) => ({
      ...d,
      id: uid("d"),
      items: d.items.map((it) => ({ ...it })),
    })),
  };
}

/**
 * 启动自检：模板里的动作 id 是否都在动作库里。
 * 数据源更新后模板可能引用到已消失的 id，早报错好过线上点开是空白。
 */
export function assertTemplateIds(exists: (id: string) => boolean): string[] {
  const bad: string[] = [];
  for (const p of BUILTIN_PLANS) {
    for (const d of p.days) {
      for (const it of d.items) {
        if (!exists(it.exId)) bad.push(`${p.id}/${d.id} → ${it.exId}`);
      }
    }
  }
  return bad;
}
