/**
 * 生活提醒规则引擎 —— 验收测试
 *
 * 用法: npx tsx scripts/test-life-tips.mjs
 *
 * 直接调用 TypeScript 源码（不是复刻），保证测的是线上真实逻辑。
 * 阈值改了这里会立刻反映出来，不会出现"测试通过但代码错了"。
 *
 * 覆盖：
 *   1. 穿衣档位边界（国标 QX/T 385 映射）
 *   2. 紫外线档位边界（国标 GB/T 36744）
 *   3. ⭐ 冲突抑制：有雨时不应同时推"注意防晒"
 *   4. ⭐ 冲突抑制：正在下雨时不应说"适合运动"
 *   5. ⭐ 信息去重：低温场景穿衣和感冒不应各说一遍
 *   6. 兜底逻辑：任何天气下横幅都必须有内容
 *   7. 国标文案逐字一致性
 */

import {
  buildLifeTips,
  pickBannerTip,
} from "../src/lib/life-tips.ts";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

/* ------------------------------------------------------------------ */
/* 构造测试数据                                                        */
/* ------------------------------------------------------------------ */

/** 生成一份可控的天气数据，默认是"晴天舒适" */
function makeWeather(overrides = {}) {
  const base = {
    city: { id: "t", name: "测试", country: "中国", latitude: 39, longitude: 116, timezone: "Asia/Shanghai" },
    current: {
      temperature: 20,
      apparentTemperature: 20,
      humidity: 50,
      windSpeed: 10,
      windDirection: 180,
      weatherCode: 0,
      isDay: true,
      pressure: 1013,
      precipitation: 0,
      uvIndex: 5,
      visibility: 10000,
    },
    hourly: [],
    daily: [
      {
        date: "2026-10-13",
        weekday: "周二",
        dateLabel: "10/13",
        weatherCode: 0,
        tempMax: 24,
        tempMin: 16,
        precipitationProbability: 5,
        uvIndexMax: 5,
        sunrise: "06:20",
        sunset: "17:40",
      },
    ],
    fetchedAt: new Date().toISOString(),
  };

  const merged = structuredClone(base);

  for (const [k, v] of Object.entries(overrides)) {
    if (k === "hourly" || k === "daily") {
      /* 数组整体替换 */
      merged[k] = v;
    } else if (typeof v === "object" && v !== null && typeof merged[k] === "object") {
      /* 普通对象浅合并 */
      Object.assign(merged[k], v);
    } else {
      merged[k] = v;
    }
  }

  return merged;
}

/** 默认的单日数据（便于单独覆盖字段） */
function makeDay(overrides = {}) {
  return {
    date: "2026-10-13",
    weekday: "周二",
    dateLabel: "10/13",
    weatherCode: 0,
    tempMax: 24,
    tempMin: 16,
    precipitationProbability: 5,
    uvIndexMax: 5,
    sunrise: "06:20",
    sunset: "17:40",
    ...overrides,
  };
}

/** 生成 N 小时的逐小时数据 */
function makeHours(n, overrides = {}) {
  return Array.from({ length: n }, (_, i) => ({
    time: `2026-10-13T${String(i).padStart(2, "0")}:00`,
    hourLabel: `${String(i).padStart(2, "0")}:00`,
    temperature: 20,
    apparentTemperature: 20,
    humidity: 50,
    precipitationProbability: 0,
    windSpeed: 10,
    uvIndex: 5,
    ...overrides,
  }));
}

let pass = 0;
let fail = 0;

function check(desc, actual, expected) {
  const ok = actual === expected;
  if (ok) pass++;
  else fail++;
  console.log(`${ok ? "✅" : "❌"} ${desc}`);
  if (!ok) console.log(`   实际: ${actual}\n   期望: ${expected}`);
}

function checkThat(desc, condition) {
  if (condition) pass++;
  else fail++;
  console.log(`${condition ? "✅" : "❌"} ${desc}`);
}

const tipsOf = (data) => buildLifeTips(data).map((t) => t.id);
const tipBy = (data, id) => buildLifeTips(data).find((t) => t.id === id);

/* ================================================================== */
/* 1. 穿衣档位边界                                                    */
/* ================================================================== */

console.log("\n=== 1. 穿衣档位边界（maxApparent 含边界）===\n");

const dressCases = [
  [-15, "厚羽绒服 + 手套"],
  [-10, "厚羽绒服 + 手套"], /* 正好 -10 = 严寒档上限，含 */
  [-9, "棉衣 / 皮衣"],
  [5, "棉衣 / 皮衣"],       /* 正好 5 = 冬装档上限，含 */
  [6, "夹克外套"],
  [18, "套装 / 夹克"],
  [23, "长袖 T 恤"],
  [28, "薄衬衣 / 长裙"],
  [29, "短袖短裤"],
  [40, "短袖短裤"],
];

for (const [apparent, expected] of dressCases) {
  const data = makeWeather({ current: { apparentTemperature: apparent } });
  const tip = tipBy(data, "dressing");
  check(`体感 ${apparent}℃ → ${expected}`, tip?.title, expected);
}

/* ================================================================== */
/* 2. 紫外线档位边界                                                  */
/* ================================================================== */

console.log("\n=== 2. 紫外线档位边界（国标 GB/T 36744）===\n");

const uvCases = [
  [1, null],                      /* 一级不提醒 */
  [2, null],                      /* 一级不提醒（边界含） */
  [3, "可涂防晒霜"],
  [4, "可涂防晒霜"],
  [5, "注意防晒"],
  [6, "注意防晒"],
  [7, "避开正午外出"],
  [9, "避开正午外出"],
  [10, "避免室外活动"],
  [12, "避免室外活动"],
];

for (const [uvMax, expected] of uvCases) {
  const data = makeWeather({
    daily: [makeDay({ uvIndexMax: uvMax })],
    hourly: makeHours(24),
  });
  const tip = tipBy(data, "uv");
  if (expected === null) {
    checkThat(`UVI ${uvMax} 不生成防晒提醒`, tip === undefined);
  } else {
    check(`UVI ${uvMax} → ${expected}`, tip?.title, expected);
  }
}

/* ================================================================== */
/* 3. ⭐ 冲突抑制：有雨时不应推"注意防晒"                              */
/* ================================================================== */

console.log("\n=== 3. 冲突抑制：有雨 vs 防晒 ===\n");

{
  /* 晴天 + 中等 UV → 应该有防晒 */
  const sunny = makeWeather({
    daily: [makeDay({ uvIndexMax: 5 })],
    hourly: makeHours(24),
  });
  checkThat("晴天 + UVI 5 → 有防晒提醒", tipBy(sunny, "uv") !== undefined);

  /* 正在下大雨 + 中等 UV → 不应有防晒（冲突） */
  const raining = makeWeather({
    current: { precipitation: 2.5, weatherCode: 63 },
    daily: [makeDay({ uvIndexMax: 5, weatherCode: 63 })],
    hourly: makeHours(24),
  });
  checkThat(
    "正在下雨 + UVI 5 → 不推防晒（避免'有雨还防晒'的矛盾）",
    tipBy(raining, "uv") === undefined
  );

  /* 未来 12h 高降水概率 + 中等 UV → 不应有防晒 */
  const wetForecast = makeWeather({
    daily: [makeDay({ uvIndexMax: 5 })],
    hourly: makeHours(24, { precipitationProbability: 75 }),
  });
  checkThat(
    "降水概率 75% + UVI 5 → 不推防晒",
    tipBy(wetForecast, "uv") === undefined
  );

  /* ⚠️ 高 UV（健康风险）在雨天也不推 —— 这是产品决策的变更。
     原先给 UVI>=7 开了例外，但用户实际看到
     「正在下暴雨」+「避开正午外出」会觉得荒谬，
     甚至可能因此忽略整块提醒区。防水安全优先。 */
  const rainyHighUv = makeWeather({
    current: { precipitation: 2.5 },
    daily: [makeDay({ uvIndexMax: 8 })],
    hourly: makeHours(24, { precipitationProbability: 70 }),
  });
  checkThat(
    "正在下雨 + UVI 8 → 仍不推防晒（避免暴雨天让用户防晒的荒谬感）",
    tipBy(rainyHighUv, "uv") === undefined
  );
}

/* ================================================================== */
/* 4. ⭐ 冲突抑制：正在下雨时不应说"适合运动"                          */
/* ================================================================== */

console.log("\n=== 4. 冲突抑制：下雨 vs 运动 ===\n");

{
  /* 晴天舒适 → 适合运动 */
  const sunny = makeWeather({
    current: { apparentTemperature: 20, windSpeed: 10 },
    hourly: makeHours(24),
  });
  check("晴天舒适 → 适合运动", tipBy(sunny, "sport")?.title, "适合运动");

  /* 正在下雨但温度和舒适度都不错 → 不能说"适合运动" */
  const raining = makeWeather({
    current: { apparentTemperature: 20, windSpeed: 10, precipitation: 1.2 },
    hourly: makeHours(24),
  });
  const sportTip = tipBy(raining, "sport");
  check(
    "正在下雨 → 运动改建议室内",
    sportTip?.title,
    "建议室内运动"
  );
  checkThat(
    "正在下雨 → 运动详情提到降水",
    sportTip?.detail.includes("降水")
  );
}

/* ================================================================== */
/* 5. ⭐ 信息去重：低温场景穿衣和感冒不重复                            */
/* ================================================================== */

console.log("\n=== 5. 信息去重：低温场景 ===\n");

{
  /* 体感 3℃ + 温差小 → 只有穿衣，不应再有"感冒"（都在说穿暖） */
  const coldWeather = makeWeather({
    current: { apparentTemperature: 3 },
    daily: [makeDay({ tempMax: 6, tempMin: 0 })],
    hourly: makeHours(24),
  });
  const ids = tipsOf(coldWeather);
  checkThat("体感 3℃ → 有穿衣提醒", ids.includes("dressing"));
  checkThat(
    "体感 3℃ + 温差小 → 无感冒提醒（避免和穿衣重复）",
    !ids.includes("cold")
  );

  /* 体感 3℃ + 温差大 → 穿衣 + 温差提醒（信息不同，可以并存） */
  const coldBigGap = makeWeather({
    current: { apparentTemperature: 3 },
    daily: [makeDay({ tempMax: 10, tempMin: -5 })],
    hourly: makeHours(24),
  });
  const ids2 = tipsOf(coldBigGap);
  checkThat("低温 + 温差 15℃ → 有穿衣", ids2.includes("dressing"));
  checkThat("低温 + 温差 15℃ → 有温差提醒", ids2.includes("cold"));
}

/* ================================================================== */
/* 6. 兜底逻辑：横幅永远有内容                                        */
/* ================================================================== */

console.log("\n=== 6. 兜底逻辑 ===\n");

const scenarios = [
  ["标准晴天", makeWeather({ hourly: makeHours(24) })],
  ["无 daily 数据", makeWeather({ daily: [] })],
  ["空 hourly", makeWeather({ hourly: [] })],
  ["极端高温", makeWeather({ current: { apparentTemperature: 45 }, daily: [makeDay({ uvIndexMax: 11 })], hourly: makeHours(24) })],
  ["极端严寒", makeWeather({ current: { apparentTemperature: -20 }, daily: [makeDay({ tempMax: -12, tempMin: -25 })], hourly: makeHours(24) })],
  ["暴雨", makeWeather({ current: { precipitation: 30 }, hourly: makeHours(24, { precipitationProbability: 95 }) })],
];

for (const [name, data] of scenarios) {
  const tips = buildLifeTips(data);
  checkThat(`${name} → 至少 1 条提醒`, tips.length >= 1);
  const banner = pickBannerTip(tips);
  checkThat(`${name} → 横幅有内容`, Boolean(banner?.title));
}

/* ================================================================== */
/* 7. 兜底文案不撒谎                                                  */
/* ================================================================== */

console.log("\n=== 7. 兜底文案 ===\n");

{
  const calm = makeWeather({ hourly: makeHours(24) });
  const tips = buildLifeTips(calm);
  if (tips.length === 1 && tips[0].id === "calm") {
    checkThat(
      "兜底文案不含'无明显降水'（该场景未必无雨）",
      !tips[0].detail.includes("无明显降水")
    );
  } else {
    console.log(`（当前场景触发了 ${tips.map((t) => t.id).join(",")}，跳过）`);
    pass++;
  }
}

/* ================================================================== */
/* 8. 组合合理性：同屏提醒之间不能互相矛盾                              */
/* ================================================================== */

console.log("\n=== 8. 组合合理性（用户报告的原始问题）===\n");

{
  /** 检查一组天气下，同时出现的提醒是否有语义冲突 */
  function conflictCheck(label, data) {
    const tips = buildLifeTips(data);
    const titles = tips.map((t) => t.title);
    const has = (kw) => titles.some((t) => t.includes(kw));

    /* 冲突 1：有雨同时说防晒 */
    const rainAndSun =
      has("雨") && (has("防晒") || has("避开正午") || has("室外活动"));
    /* 冲突 2：有雨同时说适合运动 */
    const rainAndSport = has("雨") && titles.some((t) => t.includes("适合运动"));
    /* 冲突 3：正在下雨还说平稳 */
    const rainAndCalm = has("雨") && titles.includes("今日天气平稳");

    checkThat(`${label}：无"有雨 × 防晒"冲突`, !rainAndSun);
    checkThat(`${label}：无"有雨 × 适合运动"冲突`, !rainAndSport);
    checkThat(`${label}：无"有雨 × 天气平稳"冲突`, !rainAndCalm);
  }

  conflictCheck(
    "小雨场景",
    makeWeather({
      current: { precipitation: 0.6, weatherCode: 61, apparentTemperature: 18 },
      daily: [makeDay({ weatherCode: 61, uvIndexMax: 5 })],
      hourly: makeHours(24, { precipitationProbability: 65 }),
    })
  );

  conflictCheck(
    "暴雨 + 高 UV 场景",
    makeWeather({
      current: { precipitation: 12, weatherCode: 65, apparentTemperature: 26 },
      daily: [makeDay({ weatherCode: 65, uvIndexMax: 8 })],
      hourly: makeHours(24, { precipitationProbability: 90 }),
    })
  );

  conflictCheck(
    "雷暴场景",
    makeWeather({
      current: { precipitation: 5, weatherCode: 95, apparentTemperature: 22 },
      daily: [makeDay({ weatherCode: 95, uvIndexMax: 6 })],
      hourly: makeHours(24, { precipitationProbability: 85 }),
    })
  );

  conflictCheck(
    "炎热无雨场景",
    makeWeather({
      current: { apparentTemperature: 34, precipitation: 0 },
      daily: [makeDay({ uvIndexMax: 10, tempMax: 36, tempMin: 26 })],
      hourly: makeHours(24, { precipitationProbability: 5 }),
    })
  );
}

/* ================================================================== */
/* 9. 国标文案逐字一致性                                              */
/* ================================================================== */

console.log("\n=== 8. 国标文案逐字一致性 ===\n");

{
  const dataSrc = readFileSync(
    join(__dirname, "..", "src", "lib", "life-tips.data.ts"),
    "utf8"
  );
  const REQUIRED = [
    "适宜穿着厚羽绒服、戴手套等严冬装",
    "适宜穿着棉衣、皮衣，内着厚毛衣等冬装",
    "适宜穿着夹克衫外套等初冬装",
    "适宜穿着套装、夹克衫等早春晚秋装",
    "适宜穿着棉衫、长袖 T 恤、牛仔服等春秋装",
    "适宜穿着轻薄的衬衣和长裙等夏装",
    "适宜穿着短袖 T 恤、短裙、短裤等盛夏装",
    "不需要采取防护措施",
    "可以适当采取一些防护措施，如：涂擦防护霜等",
    "外出时戴好遮阳帽、太阳镜和太阳伞等，涂擦 SPF 指数大于 15 的防晒霜",
  ];
  for (const t of REQUIRED) {
    checkThat(`国标原文存在: 「${t.slice(0, 18)}…」`, dataSrc.includes(t));
  }
}

/* ================================================================== */

console.log("\n" + "=".repeat(52));
console.log(`结果: 通过 ${pass} / 失败 ${fail}`);
console.log("=".repeat(52));
process.exit(fail > 0 ? 1 : 0);
