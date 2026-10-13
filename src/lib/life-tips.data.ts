/**
 * 生活提醒 —— 阈值常量表
 *
 * 与逻辑分离，方便调参。所有阈值都有来源，不自己拍脑袋。
 *
 * 来源：
 *   [1] QX/T 385—2017《穿衣气象指数》中国气象局行业标准
 *       https://www.cma.gov.cn/zfxxgk/gknr/flfgbz/bz/202209/P020220921693134561491.pdf
 *   [2] GB/T 36744—2018《紫外线指数预报方法》附录 B
 *       https://www.cma.gov.cn/zfxxgk/gknr/flfgbz/bz/202209/P020220921700668017734.pdf
 *   [3] 中国天气网「生活气象指数」科普（洗车指数逻辑）
 *       http://qxkp.net/qxbk/qxzs/202504/t20250429_7036000.html
 *   [4] 和风天气 / 华风爱科 指数 API 文档（运动指数 3 级分档）
 *       https://dev.qweather.com/docs/api/indices/indices-type/
 *
 * ⚠️ 重要设计约束（来自调研结论）：
 *   1. 穿衣不用「气温单值分档」—— 国标明确否定了网上流传的「26℃ 穿衣公式」，
 *      因为同样气温下南方北方、有风无风体感完全不同。这里用体感温度。
 *   2. 不给用户看等级数字 —— 中国天气网自己的页面就有「洗车三级=不适宜、
 *      行驶一级=好、晨练四级=适宜」的方向混乱问题。直接给文案。
 */

/* ------------------------------------------------------------------ */
/* 1. 穿衣 —— QX/T 385—2017 表 1 的工程近似映射                        */
/* ------------------------------------------------------------------ */

/**
 * 国标按「服装厚薄度 H」分档，H 需要当地历史气候数据（Tm 取历史第 90 百分位），
 * Open-Meteo 单次请求拿不到。
 *
 * 降级方案：用体感温度（apparentTemperature）映射。体感温度已经把湿度、
 * 风速、辐射算进去了，比裸气温更接近 H 的物理含义。
 *
 * 下面的温度区间是【依据国标 H 档位 + 体感温度语义反推的工程近似值】，
 * 不是国标原文。国标原文见 text 字段（逐字抄录）。
 */
export type DressingLevel = {
  /** 体感温度上限（不含），null 表示无穷大 */
  maxApparent: number | null;
  /** 国标原文服务用语（逐字） */
  text: string;
  /** 看板短文案 */
  short: string;
  /** 图标 */
  icon: string;
};

export const DRESSING_LEVELS: DressingLevel[] = [
  {
    maxApparent: -10,
    text: "适宜穿着厚羽绒服、戴手套等严冬装",
    short: "厚羽绒服 + 手套",
    icon: "🧥",
  },
  {
    maxApparent: 5,
    text: "适宜穿着棉衣、皮衣，内着厚毛衣等冬装",
    short: "棉衣 / 皮衣",
    icon: "🧥",
  },
  {
    maxApparent: 12,
    text: "适宜穿着夹克衫外套等初冬装",
    short: "夹克外套",
    icon: "🧥",
  },
  {
    maxApparent: 18,
    text: "适宜穿着套装、夹克衫等早春晚秋装",
    short: "套装 / 夹克",
    icon: "👕",
  },
  {
    maxApparent: 23,
    text: "适宜穿着棉衫、长袖 T 恤、牛仔服等春秋装",
    short: "长袖 T 恤",
    icon: "👕",
  },
  {
    maxApparent: 28,
    text: "适宜穿着轻薄的衬衣和长裙等夏装",
    short: "薄衬衣 / 长裙",
    icon: "👕",
  },
  {
    maxApparent: null,
    text: "适宜穿着短袖 T 恤、短裙、短裤等盛夏装",
    short: "短袖短裤",
    icon: "🩳",
  },
];

/* ------------------------------------------------------------------ */
/* 2. 紫外线 —— GB/T 36744—2018 附录 B 表 B.1（逐字抄录）              */
/* ------------------------------------------------------------------ */

export type UvLevel = {
  /** 紫外线指数上限（含） */
  maxUvi: number;
  /** 国标等级名 */
  level: string;
  /** 照射强度 */
  intensity: string;
  /** 国标原文防护措施（逐字） */
  text: string;
  /** 看板短文案 */
  short: string;
  icon: string;
};

export const UV_LEVELS: UvLevel[] = [
  {
    maxUvi: 2,
    level: "一级",
    intensity: "最弱",
    text: "不需要采取防护措施",
    short: "无需防晒",
    icon: "🌤️",
  },
  {
    maxUvi: 4,
    level: "二级",
    intensity: "弱",
    text: "可以适当采取一些防护措施，如：涂擦防护霜等",
    short: "可涂防晒霜",
    icon: "🧴",
  },
  {
    maxUvi: 6,
    level: "三级",
    intensity: "中等",
    text: "外出时戴好遮阳帽、太阳镜和太阳伞等，涂擦 SPF 指数大于 15 的防晒霜",
    short: "注意防晒",
    icon: "🕶️",
  },
  {
    maxUvi: 9,
    level: "四级",
    intensity: "强",
    text: "除上述防护措施外，上午 10 点至下午 4 点避免外出，或尽可能在遮荫处",
    short: "避开正午外出",
    icon: "🕶️",
  },
  {
    maxUvi: Infinity,
    level: "五级",
    intensity: "很强",
    text: "尽可能不在室外活动，必须外出时，需采取各种有效的防护措施",
    short: "避免室外活动",
    icon: "⚠️",
  },
];

/* ------------------------------------------------------------------ */
/* 3. 带伞 / 降水                                                      */
/* ------------------------------------------------------------------ */

/**
 * 时间窗取未来 12 小时。
 *
 * 依据：中国天气网会单独播报「下班天气」，说明按用户出行时段播报
 * 比按全天平均更有用。
 */
export const UMBRELLA = {
  /** 未来多少小时 */
  lookaheadHours: 12,
  /** 必带伞的降水概率阈值 */
  mustBringProbability: 60,
  /** 建议带伞的降水概率阈值 */
  suggestProbability: 40,
  /** 雨夹雪/结冰警告：最低温低于此值且降水概率高于阈值 */
  freezeTemp: 0,
  freezeProbability: 40,
} as const;

/* ------------------------------------------------------------------ */
/* 4. 运动 —— 和风 / 华风爱科 3 级分档                                 */
/* ------------------------------------------------------------------ */

export type SportLevel = {
  /** 体感温度舒适区间 */
  minApparent: number;
  maxApparent: number;
  maxWindSpeed: number;
  maxPrecipProbability: number;
  label: string;
  short: string;
  icon: string;
  text: string;
};

export const SPORT_LEVELS: SportLevel[] = [
  {
    minApparent: 15,
    maxApparent: 25,
    maxWindSpeed: 20,
    maxPrecipProbability: 30,
    label: "适宜",
    short: "适合运动",
    icon: "🏃",
    text: "天气不错，适合户外运动。",
  },
  {
    minApparent: 5,
    maxApparent: 30,
    maxWindSpeed: 35,
    maxPrecipProbability: 60,
    label: "较适宜",
    short: "可运动，注意热身",
    icon: "🏃",
    text: "可以运动，注意热身和补水。",
  },
  {
    minApparent: -Infinity,
    maxApparent: Infinity,
    maxWindSpeed: Infinity,
    maxPrecipProbability: Infinity,
    label: "较不宜",
    short: "建议室内运动",
    icon: "🏠",
    text: "天气条件不太理想，建议改为室内运动。",
  },
];

/* ------------------------------------------------------------------ */
/* 5. 感冒 / 温差                                                      */
/* ------------------------------------------------------------------ */

export const COLD = {
  /**
   * 昼夜温差超过此值提示感冒风险。
   *
   * 注意：原来还有「体感低于某温度」的触发条件，但它与穿衣提醒
   * 信息重复（都在说"天冷穿暖"），已移除。低温场景交给穿衣提醒。
   */
  tempGapThreshold: 10,
} as const;

/* ------------------------------------------------------------------ */
/* 5b. 洗车 / 晾晒（P2 新增）                                          */
/* ------------------------------------------------------------------ */

/**
 * 洗车指数 —— 核心是「向后看几天」，不是只看今天。
 *
 * 来源：中国天气网官方科普（北京市气象服务中心首席预报员介绍）：
 *   未来 4 天无降水/大风/沙尘 → 非常适宜
 *   未来 3 天无               → 适宜
 *   仅未来 1 天有             → 较不宜
 *   今天/明天就有             → 不宜
 * http://qxkp.net/qxbk/qxzs/202504/t20250429_7036000.html
 */
export const CARWASH = {
  /** 向后看的天数 */
  lookaheadDays: 4,
  /** 判定为「有降水」的概率阈值 */
  precipThreshold: 50,
  /** 大风降级阈值（km/h，风大易扬尘） */
  strongWind: 40,
} as const;

/**
 * 晾晒指数 —— 与洗车共享「未来 N 天无降水」逻辑（调研确认两者同源），
 * 但对「今天」要求更严：今天白天必须基本无雨才有意义（衣服是今天晾的）。
 * 分档参考和风天气 6 级（极适宜…不适宜），看板简化为 3 档。
 */
export const DRYING = {
  /** 判定为「有降水」的概率阈值 */
  precipThreshold: 50,
  /** 今天白天降水概率低于此值才考虑晾晒 */
  todayMaxProbability: 30,
} as const;

/* ------------------------------------------------------------------ */
/* 6. 通用：优先级权重与时效系数（调研第 5.2 节）                       */
/* ------------------------------------------------------------------ */

export const SEVERITY_WEIGHT = {
  /** 安全类：结冰、雷暴、大风、高温、严寒 */
  safety: 100,
  /** 健康类：紫外线强、感冒易发 */
  health: 80,
  /** 强生活相关：必带伞、温差大 */
  strongLife: 60,
  /** 一般生活类：穿衣、运动 */
  generalLife: 40,
  /** 氛围类 */
  ambient: 20,
} as const;

export const TIMELINESS_FACTOR = {
  /** 影响未来 3 小时内 */
  within3h: 1.5,
  /** 影响今天 */
  today: 1.2,
  /** 影响未来 2-7 天 */
  week: 1.0,
} as const;

export const CERTAINTY_FACTOR = {
  /** 当前实况（已在发生） */
  happening: 1.3,
  /** 概率 ≥ 70% */
  highProbability: 1.1,
  /** 概率 40-70% */
  mediumProbability: 0.9,
  /** 潜势/趋势类 */
  trend: 0.8,
} as const;

/* ------------------------------------------------------------------ */
/* 7. 展示约束                                                         */
/* ------------------------------------------------------------------ */

export const DISPLAY = {
  /** 顶部横幅始终显示 1 条 */
  bannerCount: 1,
  /** 网格区最多显示几条 */
  gridMax: 5,
} as const;
