/** 训练计划模板。动作 id 均已在 1324 条数据集里核对存在。 */

export interface PlanItem {
  /** 动作 id，指向动作库 */
  id: string;
  /** 组数 */
  sets: number;
  /** 次数区间或固定次数 */
  reps: string;
  /** 简短提示 */
  note?: string;
}

export interface PlanDay {
  /** 训练日名称，如「A · 全身」 */
  name: string;
  /** 主打部位 */
  focus: string;
  items: PlanItem[];
}

export interface Plan {
  key: string;
  name: string;
  /** 适用水平 */
  level: "新手" | "进阶" | "高级";
  /** 每周训练天数 */
  days: number;
  /** 训练目标 */
  goal: "增肌" | "力量" | "减脂" | "综合";
  /** 一句话说明 */
  desc: string;
  days_detail: PlanDay[];
}

/* ------------------------------------------------------------------ 动作速记
 * 0025 杠铃卧推        0047 杠铃上斜卧推    0033 杠铃下斜卧推
 * 0289 哑铃卧推        0308 哑铃飞鸟        0251 胸臂屈伸
 * 0043 杠铃全程深蹲    0042 杠铃前蹲        0760 史密斯机腿举
 * 0585 器械腿屈伸      0586 器械仰卧腿弯举  0108 杠铃站姿提踵
 * 0088 杠铃坐姿提踵    0032 杠铃硬拉        0085 杠铃罗马尼亚硬拉
 * 0117 杠铃相扑硬拉    0091 杠铃坐姿过头推举 0361 哑铃单臂肩推
 * 0178 绳索侧平举      0041 杠铃前平举      0095 杠铃耸肩
 * 0027 杠铃俯身划船    0064 杠铃单臂俯身划船 0652 引体向上
 * 0673 器械反握背阔肌下拉 0180 绳索低坐姿划船
 * 0031 杠铃弯举        0023 杠铃交替弯举    0241 绳索肱三头肌下压
 * 0200 绳索下压（绳）   0472 悬垂抬腿        0175 绳索跪姿卷腹
 * 0464 前平板支撑（转体）
 * ------------------------------------------------------------------------- */

export const PLANS: Plan[] = [
  {
    key: "fullbody",
    name: "新手全身 · 3 天",
    level: "新手",
    days: 3,
    goal: "综合",
    desc: "每次都练全身，动作少、频率高，最适合前 3 个月打基础。A/B 交替。",
    days_detail: [
      {
        name: "A · 全身",
        focus: "深蹲 / 推 / 拉",
        items: [
          { id: "0043", sets: 3, reps: "5-8", note: "主项，控制离心" },
          { id: "0025", sets: 3, reps: "5-8" },
          { id: "0027", sets: 3, reps: "6-10" },
          { id: "0091", sets: 3, reps: "6-10" },
          { id: "0175", sets: 3, reps: "12-15" },
        ],
      },
      {
        name: "B · 全身",
        focus: "硬拉 / 推 / 拉",
        items: [
          { id: "0032", sets: 3, reps: "5", note: "主项，注意腰背中立" },
          { id: "0047", sets: 3, reps: "8-10" },
          { id: "0180", sets: 3, reps: "8-12" },
          { id: "0178", sets: 3, reps: "12-15" },
          { id: "0031", sets: 3, reps: "10-12" },
        ],
      },
    ],
  },
  {
    key: "upperlower",
    name: "上下肢分化 · 4 天",
    level: "进阶",
    days: 4,
    goal: "增肌",
    desc: "每个部位每周练两次，容量与频率平衡得最好的经典分化。",
    days_detail: [
      {
        name: "上肢 A",
        focus: "胸 / 背 / 肩",
        items: [
          { id: "0025", sets: 4, reps: "6-8", note: "主项" },
          { id: "0047", sets: 3, reps: "8-12" },
          { id: "0652", sets: 3, reps: "8-12", note: "做不了就换高位下拉" },
          { id: "0027", sets: 3, reps: "8-12" },
          { id: "0361", sets: 3, reps: "8-12" },
          { id: "0241", sets: 3, reps: "10-15" },
        ],
      },
      {
        name: "下肢 A",
        focus: "股四 / 腘绳 / 小腿",
        items: [
          { id: "0043", sets: 4, reps: "6-8", note: "主项" },
          { id: "0760", sets: 3, reps: "10-12" },
          { id: "0586", sets: 3, reps: "10-12" },
          { id: "0585", sets: 3, reps: "10-12" },
          { id: "0108", sets: 4, reps: "12-15" },
        ],
      },
      {
        name: "上肢 B",
        focus: "背 / 胸 / 手臂",
        items: [
          { id: "0064", sets: 4, reps: "8-10" },
          { id: "0673", sets: 3, reps: "10-12" },
          { id: "0289", sets: 3, reps: "10-12" },
          { id: "0308", sets: 3, reps: "12-15" },
          { id: "0023", sets: 3, reps: "10-12" },
          { id: "0200", sets: 3, reps: "12-15" },
        ],
      },
      {
        name: "下肢 B",
        focus: "髋 / 腘绳 / 小腿",
        items: [
          { id: "0085", sets: 4, reps: "8-10", note: "主项，感受腘绳拉伸" },
          { id: "0042", sets: 3, reps: "8-10" },
          { id: "0586", sets: 3, reps: "12-15" },
          { id: "0088", sets: 4, reps: "15-20" },
        ],
      },
    ],
  },
  {
    key: "ppl",
    name: "推拉腿 PPL · 3 天",
    level: "进阶",
    days: 3,
    goal: "增肌",
    desc: "按动作模式分：推（胸肩三头）、拉（背二头）、腿。一周一轮，也可跑两轮。",
    days_detail: [
      {
        name: "推 · Push",
        focus: "胸 / 肩 / 三头",
        items: [
          { id: "0025", sets: 4, reps: "6-8", note: "主项" },
          { id: "0047", sets: 3, reps: "8-12" },
          { id: "0361", sets: 3, reps: "8-12" },
          { id: "0178", sets: 3, reps: "12-15" },
          { id: "0251", sets: 3, reps: "10-15" },
          { id: "0241", sets: 3, reps: "12-15" },
        ],
      },
      {
        name: "拉 · Pull",
        focus: "背 / 二头 / 后束",
        items: [
          { id: "0032", sets: 3, reps: "5", note: "主项" },
          { id: "0652", sets: 3, reps: "8-12" },
          { id: "0027", sets: 3, reps: "8-12" },
          { id: "0180", sets: 3, reps: "10-12" },
          { id: "0031", sets: 3, reps: "10-12" },
          { id: "0095", sets: 3, reps: "12-15" },
        ],
      },
      {
        name: "腿 · Legs",
        focus: "股四 / 腘绳 / 小腿",
        items: [
          { id: "0043", sets: 4, reps: "6-8", note: "主项" },
          { id: "0760", sets: 3, reps: "10-12" },
          { id: "0586", sets: 3, reps: "10-12" },
          { id: "0585", sets: 3, reps: "12-15" },
          { id: "0108", sets: 4, reps: "12-15" },
          { id: "0088", sets: 3, reps: "15-20" },
        ],
      },
    ],
  },
  {
    key: "bro5",
    name: "五分化 · 5 天",
    level: "进阶",
    days: 5,
    goal: "增肌",
    desc: "每天一个部位，单部位容量拉满。适合有余力、追求细节的人。",
    days_detail: [
      {
        name: "胸",
        focus: "胸 / 三头",
        items: [
          { id: "0025", sets: 4, reps: "6-8", note: "主项" },
          { id: "0047", sets: 4, reps: "8-12" },
          { id: "0289", sets: 3, reps: "10-12" },
          { id: "0308", sets: 3, reps: "12-15" },
          { id: "0251", sets: 3, reps: "10-15" },
        ],
      },
      {
        name: "背",
        focus: "背 / 二头",
        items: [
          { id: "0032", sets: 3, reps: "5" },
          { id: "0027", sets: 4, reps: "8-12" },
          { id: "0673", sets: 3, reps: "10-12" },
          { id: "0180", sets: 3, reps: "10-12" },
          { id: "0031", sets: 3, reps: "10-12" },
        ],
      },
      {
        name: "腿",
        focus: "股四 / 腘绳 / 小腿",
        items: [
          { id: "0043", sets: 4, reps: "6-8" },
          { id: "0760", sets: 4, reps: "10-12" },
          { id: "0586", sets: 4, reps: "10-12" },
          { id: "0585", sets: 3, reps: "12-15" },
          { id: "0108", sets: 4, reps: "12-15" },
        ],
      },
      {
        name: "肩",
        focus: "三角肌 / 斜方",
        items: [
          { id: "0091", sets: 4, reps: "6-8", note: "主项" },
          { id: "0361", sets: 3, reps: "8-12" },
          { id: "0178", sets: 4, reps: "12-15" },
          { id: "0041", sets: 3, reps: "10-12" },
          { id: "0095", sets: 3, reps: "12-15" },
        ],
      },
      {
        name: "手臂 + 核心",
        focus: "二头 / 三头 / 腹",
        items: [
          { id: "0031", sets: 4, reps: "8-12" },
          { id: "0023", sets: 3, reps: "10-12" },
          { id: "0241", sets: 4, reps: "10-15" },
          { id: "0200", sets: 3, reps: "12-15" },
          { id: "0472", sets: 3, reps: "10-15" },
          { id: "0464", sets: 3, reps: "30-60秒" },
        ],
      },
    ],
  },
  {
    key: "strength5x5",
    name: "力量 5×5 · 3 天",
    level: "新手",
    days: 3,
    goal: "力量",
    desc: "经典线性递增。每次只加 2.5kg，稳扎稳打把三大项顶上去。",
    days_detail: [
      {
        name: "A · 深蹲日",
        focus: "深蹲 / 推 / 拉",
        items: [
          { id: "0043", sets: 5, reps: "5", note: "主项，每次 +2.5kg" },
          { id: "0025", sets: 5, reps: "5", note: "主项，每次 +2.5kg" },
          { id: "0027", sets: 5, reps: "5", note: "主项，每次 +2.5kg" },
        ],
      },
      {
        name: "B · 硬拉日",
        focus: "深蹲 / 推 / 拉",
        items: [
          { id: "0043", sets: 5, reps: "5" },
          { id: "0091", sets: 5, reps: "5", note: "主项，每次 +2.5kg" },
          { id: "0032", sets: 1, reps: "5", note: "主项，每次 +5kg" },
        ],
      },
    ],
  },
  {
    key: "cut",
    name: "减脂保持 · 3 天",
    level: "新手",
    days: 3,
    goal: "减脂",
    desc: "热量缺口期保肌肉。容量降下来，强度保持，别把自己练垮。",
    days_detail: [
      {
        name: "A · 下肢 + 核心",
        focus: "腿 / 腹",
        items: [
          { id: "0043", sets: 3, reps: "8-10" },
          { id: "0085", sets: 3, reps: "8-10" },
          { id: "0760", sets: 3, reps: "12-15" },
          { id: "0586", sets: 3, reps: "12-15" },
          { id: "0472", sets: 3, reps: "10-15" },
        ],
      },
      {
        name: "B · 上肢推",
        focus: "胸 / 肩 / 三头",
        items: [
          { id: "0025", sets: 3, reps: "8-10" },
          { id: "0361", sets: 3, reps: "8-10" },
          { id: "0178", sets: 3, reps: "12-15" },
          { id: "0241", sets: 3, reps: "12-15" },
        ],
      },
      {
        name: "C · 上肢拉",
        focus: "背 / 二头",
        items: [
          { id: "0027", sets: 3, reps: "8-10" },
          { id: "0652", sets: 3, reps: "8-12" },
          { id: "0180", sets: 3, reps: "10-12" },
          { id: "0031", sets: 3, reps: "10-12" },
          { id: "0464", sets: 3, reps: "30-60秒" },
        ],
      },
    ],
  },
];

export function planByKey(key: string): Plan | undefined {
  return PLANS.find((p) => p.key === key);
}

/** 计划里用到的全部动作 id（去重），便于一次性校验 */
export function allPlanIds(): string[] {
  const s = new Set<string>();
  for (const p of PLANS) {
    for (const d of p.days_detail) {
      for (const it of d.items) s.add(it.id);
    }
  }
  return [...s];
}
