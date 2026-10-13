/**
 * 真正导入源码的生活提醒测试
 *
 * 用法: npx tsx scripts/test-life-tips-live.mjs
 *
 * 为什么要这个脚本：
 *   之前的 test-life-tips.mjs 是「复刻阈值」而不是「导入源码」，
 *   意味着它测的是副本，源码改了它也不知道 —— 等于没测。
 *   这个脚本用 tsx 直接跑 TS 源码，才是真测试。
 */

import { searchCities, getHotCities, getDefaultCity } from "../src/lib/city-search.ts";
import { buildLifeTips, pickBannerTip, pickGridTips } from "../src/lib/life-tips.ts";

let pass = 0, fail = 0;
function check(desc, cond, extra = "") {
  if (cond) { pass++; console.log(`  ✅ ${desc}`); }
  else { fail++; console.log(`  ❌ ${desc}${extra ? "  " + extra : ""}`); }
}

/** 构造一份可控的天气数据 */
function mockWeather(overrides = {}) {
  const now = new Date();
  const iso = (h) => {
    const d = new Date(now);
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + h);
    return `${d.toISOString().slice(0, 13)}:00`;
  };

  const hourly = Array.from({ length: 24 }, (_, i) => ({
    time: iso(i),
    hourLabel: iso(i).slice(11, 16),
    temperature: 20,
    apparentTemperature: 20,
    humidity: 50,
    precipitationProbability: 0,
    windSpeed: 5,
    uvIndex: 0,
    ...(overrides.hourly?.[i] ?? {}),
  }));

  const daily = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    return {
      date: d.toISOString().slice(0, 10),
      weekday: "周一",
      dateLabel: "10/13",
      weatherCode: 0,
      tempMax: 22,
      tempMin: 12,
      precipitationProbability: 0,
      uvIndexMax: 3,
      sunrise: "06:20",
      sunset: "17:40",
      ...(overrides.daily?.[i] ?? {}),
    };
  });

  return {
    city: { id: "test", name: "测试", country: "中国", latitude: 39.9, longitude: 116.4, timezone: "Asia/Shanghai" },
    current: {
      temperature: 20, apparentTemperature: 20, humidity: 50, windSpeed: 5,
      windDirection: 0, weatherCode: 0, isDay: true, pressure: 1013,
      precipitation: 0, uvIndex: 3, visibility: 10000,
      ...(overrides.current ?? {}),
    },
    hourly, daily,
    fetchedAt: new Date().toISOString(),
  };
}

console.log("=== A. 搜索（真源码）===");
check("bj → 北京第一", searchCities("bj")[0]?.name === "北京");
check("hangzhou → 杭州", searchCities("hangzhou")[0]?.name === "杭州");
check("xyz123 → 空", searchCities("xyz123").length === 0);
check("空查询 → 空", searchCities("").length === 0);
check("热门城市非空", getHotCities().length > 0);
check("默认城市是北京", getDefaultCity().name === "北京");
check("结果数受 limit 控制", searchCities("a", { limit: 3 }).length <= 3);

console.log("\n=== B. 生活提醒（真源码）===");

// B1. 边界：体感正好 5℃ 应落在「棉衣」档
{
  const tips = buildLifeTips(mockWeather({ current: { apparentTemperature: 5 } }));
  const dress = tips.find((t) => t.id === "dressing");
  check("体感 5℃ → 棉衣/皮衣（边界含本档）", dress?.title === "棉衣 / 皮衣", `实际: ${dress?.title}`);
}

// B2. 边界：体感正好 28℃ 应落在「薄衬衣」档
{
  const tips = buildLifeTips(mockWeather({ current: { apparentTemperature: 28 } }));
  const dress = tips.find((t) => t.id === "dressing");
  check("体感 28℃ → 薄衬衣/长裙（边界含本档）", dress?.title === "薄衬衣 / 长裙", `实际: ${dress?.title}`);
}

// B3. 带伞：降水概率 80%
{
  const tips = buildLifeTips(mockWeather({
    hourly: Array.from({ length: 24 }, () => ({ precipitationProbability: 80 })),
  }));
  const u = tips.find((t) => t.id === "umbrella");
  check("降水 80% → 出现带伞提醒", !!u, u ? "" : "未生成");
  check("带伞文案含概率数字", u?.detail?.includes("80"), u?.detail ?? "");
}

// B4. 无雨时不生成带伞
{
  const tips = buildLifeTips(mockWeather());
  check("无雨 → 无带伞提醒", !tips.some((t) => t.id === "umbrella"));
}

// B5. 紫外线：UVI 1 → 不生成（一级最弱，无需防护）
{
  const tips = buildLifeTips(mockWeather({
    current: { uvIndex: 1 },
    daily: Array.from({ length: 7 }, () => ({ uvIndexMax: 1 })),
  }));
  check("UVI 1 → 无紫外线提醒", !tips.some((t) => t.id === "uv"));
}

// B6. 紫外线：UVI 8 → 生成且用国标文案
{
  const tips = buildLifeTips(mockWeather({
    current: { uvIndex: 8 },
    daily: Array.from({ length: 7 }, () => ({ uvIndexMax: 8 })),
  }));
  const uv = tips.find((t) => t.id === "uv");
  check("UVI 8 → 紫外线提醒存在", !!uv);
  check("UVI 8 → 四级国标文案", uv?.detail?.includes("上午 10 点至下午 4 点"), uv?.detail ?? "");
  check("UVI 8 → 标注国标来源", uv?.source?.includes("GB/T 36744"), uv?.source ?? "");
}

// B7. 兜底：完全平稳的天气仍至少有一条
{
  const tips = buildLifeTips(mockWeather());
  check("平稳天气 → 至少 1 条（兜底）", tips.length >= 1);
  const banner = pickBannerTip(tips);
  check("横幅非空", !!banner?.title);
}

// B8. 温差
{
  const tips = buildLifeTips(mockWeather({
    daily: [{ tempMax: 25, tempMin: 8 }, ...Array.from({ length: 6 }, () => ({}))],
  }));
  const cold = tips.find((t) => t.id === "cold");
  check("温差 17℃ → 感冒提醒", !!cold);
  check("温差文案含数值", cold?.title?.includes("17"), cold?.title ?? "");
}

// B9. 已删的「体感低温感冒提醒」不应复活
{
  const tips = buildLifeTips(mockWeather({
    current: { apparentTemperature: 2 },
    daily: [{ tempMax: 10, tempMin: 5 }, ...Array.from({ length: 6 }, () => ({}))],
  }));
  const cold = tips.find((t) => t.id === "cold");
  check("体感 2℃ 但温差小 → 不触发感冒（避免与穿衣重复）", !cold, cold?.title ?? "");
}

// B10. 网格上限
{
  const tips = buildLifeTips(mockWeather({
    hourly: Array.from({ length: 24 }, () => ({ precipitationProbability: 90 })),
    current: { apparentTemperature: 2, uvIndex: 9 },
    daily: Array.from({ length: 7 }, () => ({ tempMax: 20, tempMin: 2, uvIndexMax: 9 })),
  }));
  const grid = pickGridTips(tips);
  check("网格不超过 5 条", grid.length <= 5, `实际 ${grid.length}`);
  check("网格全部是合法 tip", grid.every((t) => t.id && t.title && t.detail && t.icon));
}

// B11. 排序：安全类应排在最前
{
  const tips = buildLifeTips(mockWeather({
    current: { weatherCode: 95, apparentTemperature: 20 },
    hourly: Array.from({ length: 24 }, () => ({ precipitationProbability: 50 })),
  }));
  check("雷暴（天气码95）出现在结果中", tips.some((t) => t.title?.includes("雷暴")), tips.map(t=>t.title).join(" / "));
}

console.log(`\n结果: 通过 ${pass} / 失败 ${fail}`);
process.exit(fail > 0 ? 1 : 0);
