/**
 * 城市搜索
 *
 * 数据来源：scripts/build-cities.mjs 从 AreaCity 数据集生成
 * 坐标来源：scripts/fill-coords.mjs 从 Open-Meteo Geocoding 补齐
 *
 * 搜索策略（按优先级打分）：
 *   100  完整匹配中文名        「北京」→ 北京
 *    95  完整匹配拼音          「beijing」→ 北京
 *    90  完整匹配简拼          「bj」→ 北京
 *    85  完整匹配别名          「hrb」→ 哈尔滨
 *    80  中文名前缀            「北」→ 北京
 *    70  拼音前缀              「bei」→ 北京
 *    60  简拼前缀              「b」→ 北京
 *    50  别名前缀
 *    40  中文名包含            「京」→ 北京、南京
 *    30  全称包含              「北京市」→ 北京
 *
 * 同分时按行政级别排序（地级市优先于区县），避免搜「朝阳」时
 * 先出现某个不认识的区。
 */

import rawCities from "./cities.json";

/** 生成脚本输出的城市记录 */
type RawCity = {
  id: string;
  name: string;
  full: string;
  pinyin: string;
  py: string;
  initials: string;
  province: string;
  city: string;
  level: 1 | 2;
  alias: string;
  lat: number | null;
  lon: number | null;
  coordSource?: string;
};

/** 对外暴露的城市结构 */
export type CityEntry = {
  id: string;
  name: string;
  full: string;
  pinyin: string;
  initials: string;
  /** 所属省份 */
  province: string;
  /** 所属地级市（区县才有） */
  city: string;
  /** 1 = 地级市，2 = 区县 */
  level: 1 | 2;
  latitude: number;
  longitude: number;
  /** 展示用的层级描述，如「浙江省 · 杭州市」 */
  region: string;
  /** 别名（简拼补充，如哈尔滨的 hrb），空格分隔 */
  alias: string;
  /** 搜索结果中的排序分数（仅搜索时存在） */
  _score?: number;
};

const ALL: RawCity[] = rawCities as RawCity[];

/** 只保留有坐标的城市（没有坐标的无法查天气） */
const CITIES: CityEntry[] = ALL.filter(
  (c) => c.lat !== null && c.lon !== null
).map((c) => ({
  id: c.id,
  name: c.name,
  full: c.full,
  pinyin: c.pinyin,
  initials: c.initials,
  province: c.province,
  city: c.city,
  level: c.level,
  latitude: c.lat as number,
  longitude: c.lon as number,
  region: buildRegion(c),
  alias: c.alias ?? "",
}));

/** 拼出「浙江省 · 杭州市」这样的层级描述 */
function buildRegion(c: RawCity): string {
  const parts: string[] = [];

  if (c.level === 1) {
    // 地级市：显示省份（直辖市不重复显示）
    if (c.province && c.province !== c.name) {
      parts.push(c.province);
    }
  } else {
    // 区县：显示「省 · 市」
    if (c.province) parts.push(c.province);
    if (c.city && c.city !== c.province) parts.push(c.city);
  }

  return parts.join(" · ");
}

export const CITY_COUNT = CITIES.length;
export const CITY_COUNT_LEVEL1 = CITIES.filter((c) => c.level === 1).length;

/** 按 id 取城市（用于 URL 参数反查） */
export function getCityById(id: string): CityEntry | null {
  return CITIES.find((c) => c.id === id) ?? null;
}

/** 默认城市 */
export function getDefaultCity(): CityEntry {
  return (
    CITIES.find((c) => c.name === "北京" && c.level === 1) ?? CITIES[0]
  );
}

/* ------------------------------------------------------------------ */
/* 搜索                                                                */
/* ------------------------------------------------------------------ */

/**
 * 热门城市权重。
 *
 * 为什么需要：搜「bj」时，宝鸡、毕节、保靖的简拼都是 bj，与北京同分。
 * 如果不加权，会按拼音排序导致「宝鸡」排在「北京」前面 —— 这不符合
 * 用户预期。用户输入 bj 时，绝大多数想找的是北京。
 *
 * 权重只影响同分排序，不会让低热度城市挤掉高匹配度的结果。
 */
const CITY_WEIGHT: Record<string, number> = {
  北京: 100, 上海: 100, 广州: 98, 深圳: 98,
  杭州: 92, 成都: 92, 重庆: 92, 武汉: 90,
  西安: 90, 南京: 90, 天津: 88, 苏州: 86,
  长沙: 84, 郑州: 84, 青岛: 84, 东莞: 82,
  宁波: 82, 佛山: 80, 合肥: 80, 福州: 78,
  厦门: 78, 大连: 78, 沈阳: 78, 济南: 78,
  哈尔滨: 76, 昆明: 76, 无锡: 76, 南昌: 74,
  贵阳: 74, 南宁: 74, 温州: 72, 石家庄: 74,
  太原: 72, 长春: 74, 兰州: 70, 海口: 70,
  乌鲁木齐: 70, 呼和浩特: 68, 银川: 66, 西宁: 66,
  拉萨: 66, 香港: 90, 澳门: 84, 台北: 80,
};

function weightOf(name: string): number {
  return CITY_WEIGHT[name] ?? 0;
}

type Scored = { score: number; city: CityEntry };

export type SearchOptions = {
  /** 最多返回几条，默认 8 */
  limit?: number;
  /** 是否包含区县（默认包含） */
  includeDistricts?: boolean;
};

/**
 * 搜索城市。
 *
 * 空查询返回空数组（不返回全部城市，避免首屏渲染 3600 条）。
 */
export function searchCities(
  query: string,
  options: SearchOptions = {}
): CityEntry[] {
  const { limit = 8, includeDistricts = true } = options;

  const q = query.trim().toLowerCase();
  if (!q) return [];

  const results: Scored[] = [];

  for (const city of CITIES) {
    if (!includeDistricts && city.level === 2) continue;

    const score = scoreCity(city, q);
    if (score <= 0) continue;

    /* 地级市加分：同等匹配下优先显示地级市 */
    const levelBonus = city.level === 1 ? 5 : 0;

    /* 越短的匹配越精确（「北京」匹配「北京」比匹配「北京路街道」好） */
    const lengthPenalty = Math.min(city.name.length, 20) * 0.1;

    /* 热门城市加权：让「bj」时北京排在宝鸡前面 */
    const weightBonus = weightOf(city.name) * 0.1;

    results.push({
      score: score + levelBonus + weightBonus - lengthPenalty,
      city,
    });
  }

  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    /* 同分时：地级市优先，然后按名称排序保证稳定 */
    if (a.city.level !== b.city.level) return a.city.level - b.city.level;
    return a.city.name.localeCompare(b.city.name, "zh");
  });

  if (results.length > 0) {
    return results.slice(0, limit).map((r) => ({
      ...r.city,
      _score: r.score,
    }));
  }

  /* 城市搜不到时，试试是不是在搜省名（如「台湾」「浙江」）——
     返回该省的城市列表，而不是空结果 */
  return provinceFallback(q, limit);
}

/** 给单个城市打分，返回 0 表示不匹配 */
function scoreCity(city: CityEntry, q: string): number {
  const name = city.name.toLowerCase();
  const full = city.full.toLowerCase();
  const pinyin = city.pinyin.toLowerCase();
  const initials = city.initials.toLowerCase();
  const aliases = (city.alias || "").toLowerCase().split(/\s+/).filter(Boolean);

  /* 完整匹配 */
  if (name === q) return 100;
  if (pinyin === q) return 95;
  if (initials === q) return 90;
  if (aliases.includes(q)) return 85;

  /* 前缀匹配 */
  if (name.startsWith(q)) return 80;
  if (pinyin.startsWith(q)) return 70;
  if (initials.startsWith(q)) return 60;
  if (aliases.some((a) => a.startsWith(q))) return 50;

  /* 包含匹配 */
  if (name.includes(q)) return 40;
  if (full.includes(q)) return 30;

  return 0;
}

/* ------------------------------------------------------------------ */
/* 省名兜底                                                            */
/* ------------------------------------------------------------------ */

/**
 * 收集所有省份名（含别名）。
 *
 * 数据源（AreaCity level 3）从城市级开始，没有省级条目，
 * 导致搜「台湾」「海南」「浙江」这类省名时一无所获。
 * 兜底：搜到省名时返回该省的热门城市，而不是空结果。
 */
const PROVINCES = (() => {
  const map = new Map<string, string>();
  for (const c of CITIES) {
    if (c.province && !map.has(c.province)) map.set(c.province, c.province);
  }
  return map;
})();

/** 省名 → 常用拼音/简拼映射（覆盖数据里没有拼音的省名） */
const PROVINCE_ALIASES: Record<string, string[]> = {
  台湾: ["taiwan", "tw"],
  海南: ["hainan", "hn"],
  浙江: ["zhejiang", "zj"],
  广东: ["guangdong", "gd"],
  江苏: ["jiangsu", "js"],
  四川: ["sichuan", "sc"],
  湖北: ["hubei", "hb"],
  湖南: ["hunan", "hn2"],
  河南: ["henan", "hn3"],
  河北: ["hebei", "hb2"],
  山东: ["shandong", "sd"],
  山西: ["shanxi", "sx"],
  陕西: ["shaanxi", "sx2"],
  安徽: ["anhui", "ah"],
  福建: ["fujian", "fj"],
  江西: ["jiangxi", "jx"],
  辽宁: ["liaoning", "ln"],
  吉林: ["jilin", "jl"],
  青海: ["qinghai", "qh"],
  甘肃: ["gansu", "gs"],
  贵州: ["guizhou", "gz2"],
  云南: ["yunnan", "yn"],
  内蒙古: ["neimenggu", "nmg"],
  广西: ["guangxi", "gx"],
  西藏: ["xizang", "xz"],
  宁夏: ["ningxia", "nx"],
  新疆: ["xinjiang", "xj"],
  黑龙江: ["heilongjiang", "hlj"],
};

/**
 * 省名兜底：query 恰好是某个省的名字（或其拼音）时，
 * 返回该省的若干城市（地级市优先，按热度权重排序）。
 * 只在城市本身搜不到任何结果时才启用，避免干扰正常搜索。
 */
function provinceFallback(q: string, limit: number): CityEntry[] {
  for (const [province, aliases] of Object.entries(PROVINCE_ALIASES)) {
    const match =
      province === q || province.toLowerCase() === q || aliases.includes(q);
    if (!match) continue;

    return CITIES.filter((c) => c.province === province && c.level === 1)
      .sort(
        (a, b) =>
          (weightOf(b.name) ?? 0) - (weightOf(a.name) ?? 0) ||
          a.name.localeCompare(b.name, "zh")
      )
      .slice(0, limit);
  }
  return [];
}

/* ------------------------------------------------------------------ */
/* 热门城市（搜索框为空时展示）                                          */
/* ------------------------------------------------------------------ */

const HOT_CITY_NAMES = [
  "北京",
  "上海",
  "广州",
  "深圳",
  "杭州",
  "成都",
  "武汉",
  "西安",
  "南京",
  "重庆",
  "天津",
  "苏州",
];

export function getHotCities(): CityEntry[] {
  return HOT_CITY_NAMES.map((n) =>
    CITIES.find((c) => c.name === n && c.level === 1)
  ).filter((c): c is CityEntry => Boolean(c));
}
