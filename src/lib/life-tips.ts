/**
 * 生活提醒 —— 规则引擎
 *
 * 设计约束（来自需求与调研）：
 *   ✅ 纯函数，无副作用
 *   ❌ 不做持久化（用户明确说「不用历史记录」）
 *   ✅ buildLifeTips 保证至少返回 1 条（用户说「需要一直有类似提示」）
 *   ✅ 便于单元测试阈值边界
 *
 * 数据来源标注在每条 tip 的 source 字段，增强可信度。
 */

import type { WeatherData } from "./weather";
import {
  CERTAINTY_FACTOR,
  COLD,
  DISPLAY,
  DRESSING_LEVELS,
  SEVERITY_WEIGHT,
  SPORT_LEVELS,
  TIMELINESS_FACTOR,
  UMBRELLA,
  UV_LEVELS,
} from "./life-tips.data";

export type LifeTip = {
  /** 唯一标识 */
  id: string;
  /** emoji 图标 */
  icon: string;
  /** 短文案（4-8 字），卡片位显示 */
  title: string;
  /** 完整建议（20-45 字），展开位显示 */
  detail: string;
  /** 严重程度，决定配色 */
  severity: "info" | "advice" | "warning";
  /** 排序分数，越大越靠前 */
  score: number;
  /** 依据来源 */
  source?: string;
  /** 是否适合放进顶部横幅（最高优先级的那条） */
  bannerWorthy: boolean;
};

/* ------------------------------------------------------------------ */
/* 工具函数                                                            */
/* ------------------------------------------------------------------ */

/** 取未来 N 小时的降水概率最大值，同时返回出现的时段 */
function peakPrecipitation(
  data: WeatherData,
  hours: number
): { probability: number; from: string; to: string } {
  const slice = data.hourly.slice(0, hours);
  if (slice.length === 0) return { probability: 0, from: "", to: "" };

  let max = 0;
  let fromIdx = -1;
  let toIdx = -1;

  slice.forEach((h, i) => {
    if (h.precipitationProbability > max) {
      max = h.precipitationProbability;
      fromIdx = i;
      toIdx = i;
    } else if (
      h.precipitationProbability === max &&
      max > 0 &&
      i === toIdx + 1
    ) {
      toIdx = i;
    }
  });

  return {
    probability: max,
    from: fromIdx >= 0 ? slice[fromIdx].hourLabel : "",
    to: toIdx >= 0 ? slice[toIdx].hourLabel : "",
  };
}

/** 判断是否雨天/雪天（WMO 代码） */
function isRainCode(code: number): boolean {
  return (code >= 51 && code <= 67) || (code >= 80 && code <= 82);
}
function isSnowCode(code: number): boolean {
  return (code >= 71 && code <= 77) || (code >= 85 && code <= 86);
}
function isStormCode(code: number): boolean {
  return code >= 95;
}

/** 匹配穿衣档位 */
function pickDressing(apparent: number) {
  return (
    DRESSING_LEVELS.find(
      (l) => l.maxApparent === null || apparent < l.maxApparent
    ) ?? DRESSING_LEVELS[DRESSING_LEVELS.length - 1]
  );
}

/** 匹配紫外线档位 */
function pickUv(uvi: number) {
  return UV_LEVELS.find((l) => uvi <= l.maxUvi) ?? UV_LEVELS[UV_LEVELS.length - 1];
}

/** 匹配运动档位 */
function pickSport(
  apparent: number,
  windSpeed: number,
  precipProbability: number
) {
  for (const level of SPORT_LEVELS) {
    if (
      apparent >= level.minApparent &&
      apparent < level.maxApparent &&
      windSpeed < level.maxWindSpeed &&
      precipProbability < level.maxPrecipProbability
    ) {
      return level;
    }
  }
  return SPORT_LEVELS[SPORT_LEVELS.length - 1];
}

/* ------------------------------------------------------------------ */
/* 各条提醒的生成函数                                                  */
/* ------------------------------------------------------------------ */

function tipUmbrella(data: WeatherData): LifeTip | null {
  const { probability, from, to } = peakPrecipitation(
    data,
    UMBRELLA.lookaheadHours
  );
  const today = data.daily[0];
  const snowRisk =
    today &&
    today.tempMin <= UMBRELLA.freezeTemp &&
    probability >= UMBRELLA.freezeProbability;

  const raining = data.current.precipitation > 0;
  const weatherCode = data.current.weatherCode;

  /* 雨夹雪/结冰 —— 安全类，最高优先级 */
  if (snowRisk || isSnowCode(weatherCode)) {
    return {
      id: "umbrella",
      icon: "🌨️",
      title: "有雨夹雪，注意路滑",
      detail:
        "最低气温接近 0℃，降水可能导致路面结冰，出行注意防滑，带好雨具并注意保暖。",
      severity: "warning",
      score: SEVERITY_WEIGHT.safety * TIMELINESS_FACTOR.today * CERTAINTY_FACTOR.highProbability,
      source: "Open-Meteo 降水概率 + 最低气温",
      bannerWorthy: true,
    };
  }

  /* 雷暴 */
  if (isStormCode(weatherCode)) {
    return {
      id: "umbrella",
      icon: "⛈️",
      title: "有雷暴，减少外出",
      detail: "当前有雷暴天气，尽量避免户外活动，注意远离高大树木和金属物体。",
      severity: "warning",
      score: SEVERITY_WEIGHT.safety * TIMELINESS_FACTOR.within3h * CERTAINTY_FACTOR.happening,
      source: "Open-Meteo 天气代码",
      bannerWorthy: true,
    };
  }

  /* 正在下雨 */
  if (raining) {
    return {
      id: "umbrella",
      icon: "☔",
      title: "正在下雨，注意防雨",
      detail: "当前正在降水，出门记得带伞，注意路面湿滑。",
      severity: "advice",
      score: SEVERITY_WEIGHT.strongLife * TIMELINESS_FACTOR.within3h * CERTAINTY_FACTOR.happening,
      source: "Open-Meteo 实时降水量",
      bannerWorthy: true,
    };
  }

  /* 未来有雨 */
  if (probability >= UMBRELLA.mustBringProbability) {
    const timeHint = from ? `，主要集中在 ${from}${to && to !== from ? `–${to}` : ""}` : "";
    return {
      id: "umbrella",
      icon: "☂️",
      title: "有雨，记得带伞",
      detail: `未来 ${UMBRELLA.lookaheadHours} 小时降水概率最高 ${probability}%${timeHint}，出门带伞。`,
      severity: "advice",
      score: SEVERITY_WEIGHT.strongLife * TIMELINESS_FACTOR.today * CERTAINTY_FACTOR.highProbability,
      source: "Open-Meteo 逐小时降水概率",
      bannerWorthy: true,
    };
  }

  if (probability >= UMBRELLA.suggestProbability) {
    return {
      id: "umbrella",
      icon: "☂️",
      title: "可能有雨，带把伞",
      detail: `未来 ${UMBRELLA.lookaheadHours} 小时降水概率最高 ${probability}%，带把伞更稳妥。`,
      severity: "info",
      score: SEVERITY_WEIGHT.strongLife * TIMELINESS_FACTOR.today * CERTAINTY_FACTOR.mediumProbability,
      source: "Open-Meteo 逐小时降水概率",
      bannerWorthy: false,
    };
  }

  /* 无雨 -> 不生成（避免废话） */
  return null;
}

function tipDressing(data: WeatherData): LifeTip {
  const apparent = data.current.apparentTemperature;
  const level = pickDressing(apparent);

  let severity: LifeTip["severity"] = "info";
  if (apparent <= -10 || apparent >= 33) severity = "warning";
  else if (apparent <= 5 || apparent >= 28) severity = "advice";

  return {
    id: "dressing",
    icon: level.icon,
    title: level.short,
    detail: `体感 ${apparent.toFixed(0)}℃，${level.text}。`,
    severity,
    score:
      (apparent <= -10 || apparent >= 33
        ? SEVERITY_WEIGHT.health
        : SEVERITY_WEIGHT.generalLife) *
      TIMELINESS_FACTOR.today *
      CERTAINTY_FACTOR.happening,
    source: "QX/T 385—2017《穿衣气象指数》",
    bannerWorthy: apparent <= -10 || apparent >= 33,
  };
}

function tipUv(data: WeatherData): LifeTip | null {
  /* 用当日最大紫外线判断（防晒看的是全天峰值，不是此刻） */
  const todayMax = data.daily[0]?.uvIndexMax ?? data.current.uvIndex;

  /* 一级（最弱）不生成提醒 —— 「不需要采取防护措施」是废话 */
  if (todayMax <= 2) return null;

  const level = pickUv(todayMax);

  let severity: LifeTip["severity"] = "info";
  if (todayMax >= 7) severity = "warning";
  else if (todayMax >= 5) severity = "advice";

  return {
    id: "uv",
    icon: level.icon,
    title: level.short,
    detail: `今日紫外线指数最高 ${Math.round(todayMax)}（${level.level}·${level.intensity}），${level.text}。`,
    severity,
    score:
      (todayMax >= 7 ? SEVERITY_WEIGHT.health : SEVERITY_WEIGHT.generalLife) *
      TIMELINESS_FACTOR.today *
      (todayMax >= 7 ? CERTAINTY_FACTOR.highProbability : CERTAINTY_FACTOR.trend),
    source: "GB/T 36744—2018《紫外线指数预报方法》",
    bannerWorthy: todayMax >= 7,
  };
}

function tipSport(data: WeatherData): LifeTip {
  const apparent = data.current.apparentTemperature;
  const { probability } = peakPrecipitation(data, UMBRELLA.lookaheadHours);
  const wind = data.current.windSpeed;

  const level = pickSport(apparent, wind, probability);

  let severity: LifeTip["severity"] = "info";
  if (level.label === "较不宜") severity = "advice";

  return {
    id: "sport",
    icon: level.icon,
    title: level.short,
    detail: level.text,
    severity,
    score:
      SEVERITY_WEIGHT.generalLife *
      TIMELINESS_FACTOR.today *
      CERTAINTY_FACTOR.trend,
    source: "和风天气 / 华风爱科 运动指数分档",
    bannerWorthy: false,
  };
}

function tipCold(data: WeatherData): LifeTip | null {
  const today = data.daily[0];
  if (!today) return null;

  const gap = today.tempMax - today.tempMin;
  const apparent = data.current.apparentTemperature;

  const bigGap = gap >= COLD.tempGapThreshold;
  const cold = apparent < COLD.lowApparentThreshold;

  if (!bigGap && !cold) return null;

  if (bigGap) {
    return {
      id: "cold",
      icon: "🤧",
      title: `昼夜温差 ${Math.round(gap)}℃`,
      detail: `昼夜温差达 ${Math.round(gap)}℃，是感冒等呼吸系统疾病的高发期，建议洋葱式穿衣，注意预防。`,
      severity: gap >= 12 ? "advice" : "info",
      score:
        (gap >= 12 ? SEVERITY_WEIGHT.health : SEVERITY_WEIGHT.strongLife) *
        TIMELINESS_FACTOR.today *
        CERTAINTY_FACTOR.trend,
      source: "Open-Meteo 日最高/最低气温",
      bannerWorthy: gap >= 12,
    };
  }

  return {
    id: "cold",
    icon: "🤧",
    title: "气温偏低，注意保暖",
    detail: `体感仅 ${apparent.toFixed(0)}℃，是感冒等呼吸系统疾病的高发期，注意预防。`,
    severity: "advice",
    score:
      SEVERITY_WEIGHT.health * TIMELINESS_FACTOR.today * CERTAINTY_FACTOR.happening,
    source: "Open-Meteo 体感温度",
    bannerWorthy: false,
  };
}

/* ------------------------------------------------------------------ */
/* 兜底和主入口                                                        */
/* ------------------------------------------------------------------ */

/** 天气平稳时的兜底提醒 —— 保证横幅始终有内容 */
function tipCalm(data: WeatherData): LifeTip {
  const desc = data.current.weatherCode;
  const high = data.daily[0]?.tempMax ?? data.current.temperature;
  const low = data.daily[0]?.tempMin ?? data.current.temperature;

  return {
    id: "calm",
    icon: "🌤️",
    title: "天气平稳，适合出行",
    detail: `今天${high.toFixed(0)} / ${low.toFixed(0)}℃，无明显降水，适合正常出行。`,
    severity: "info",
    score: SEVERITY_WEIGHT.ambient,
    source: "Open-Meteo 综合判断",
    bannerWorthy: true,
  };
}

/** 空气质量提示（Open-Meteo 无 AQI，用能见度近似判断雾/霾） */
function tipVisibility(data: WeatherData): LifeTip | null {
  const v = data.current.visibility;
  if (v >= 2000) return null;

  return {
    id: "visibility",
    icon: "🌫️",
    title: "能见度低，注意安全",
    detail: `当前能见度约 ${(v / 1000).toFixed(1)} 公里，可能有雾或霾，驾车注意车距与车速。`,
    severity: v < 1000 ? "warning" : "advice",
    score:
      (v < 1000 ? SEVERITY_WEIGHT.safety : SEVERITY_WEIGHT.health) *
      TIMELINESS_FACTOR.within3h *
      CERTAINTY_FACTOR.happening,
    source: "Open-Meteo 能见度",
    bannerWorthy: v < 1000,
  };
}

/**
 * 生成生活提醒列表。
 *
 * 保证至少返回 1 条（兜底项），并按 score 降序排序。
 */
export function buildLifeTips(data: WeatherData): LifeTip[] {
  const candidates: (LifeTip | null)[] = [
    tipUmbrella(data),
    tipVisibility(data),
    tipDressing(data),
    tipUv(data),
    tipSport(data),
    tipCold(data),
  ];

  const tips = candidates.filter((t): t is LifeTip => t !== null);

  /* 一条都没有 -> 用兜底项 */
  if (tips.length === 0) {
    tips.push(tipCalm(data));
  }

  return tips.sort((a, b) => b.score - a.score);
}

/**
 * 取顶部横幅要显示的那一条。
 *
 * 策略：优先取 bannerWorthy 且分数最高的；都没有则取总分最高的。
 * 保证永远返回一条（用户要求「需要一直有提示」）。
 */
export function pickBannerTip(tips: LifeTip[]): LifeTip {
  if (tips.length === 0) {
    throw new Error("tips 不应为空 —— buildLifeTips 保证至少返回一条");
  }
  const worthy = tips.filter((t) => t.bannerWorthy);
  return (worthy.length > 0 ? worthy : tips)[0];
}

/** 取网格区要显示的若干条 */
export function pickGridTips(tips: LifeTip[]): LifeTip[] {
  return tips.slice(0, DISPLAY.gridMax);
}
