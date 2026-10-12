/**
 * Open-Meteo 数据层
 *
 * Open-Meteo 完全免费、无需注册、无需 API Key，非常适合作为公开数据源。
 * 文档：https://open-meteo.com/en/docs
 *
 * 注意：本项目 next.config.ts 开启了 cacheComponents: true，
 * 因此这里不做任何缓存声明（Next.js 16 默认就是不缓存），
 * 调用方需要用 <Suspense> 包裹。
 */

/** 城市配置：经纬度 + 时区 */
export type City = {
  id: string;
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
};

export const CITIES: City[] = [
  { id: "beijing", name: "北京", country: "中国", latitude: 39.9042, longitude: 116.4074, timezone: "Asia/Shanghai" },
  { id: "shanghai", name: "上海", country: "中国", latitude: 31.2304, longitude: 121.4737, timezone: "Asia/Shanghai" },
  { id: "guangzhou", name: "广州", country: "中国", latitude: 23.1291, longitude: 113.2644, timezone: "Asia/Shanghai" },
  { id: "chengdu", name: "成都", country: "中国", latitude: 30.5728, longitude: 104.0668, timezone: "Asia/Shanghai" },
  { id: "tokyo", name: "东京", country: "日本", latitude: 35.6762, longitude: 139.6503, timezone: "Asia/Tokyo" },
  { id: "london", name: "伦敦", country: "英国", latitude: 51.5074, longitude: -0.1278, timezone: "Europe/London" },
  { id: "newyork", name: "纽约", country: "美国", latitude: 40.7128, longitude: -74.006, timezone: "America/New_York" },
  { id: "sydney", name: "悉尼", country: "澳大利亚", latitude: -33.8688, longitude: 151.2093, timezone: "Australia/Sydney" },
];

export function getCity(id: string): City {
  return CITIES.find((c) => c.id === id) ?? CITIES[0];
}

/** WMO 天气代码 → 中文描述 + 图标标识 */
export const WEATHER_CODES: Record<number, { label: string; icon: string }> = {
  0: { label: "晴", icon: "sun" },
  1: { label: "晴间多云", icon: "sun-cloud" },
  2: { label: "多云", icon: "cloud-sun" },
  3: { label: "阴", icon: "cloud" },
  45: { label: "雾", icon: "fog" },
  48: { label: "雾凇", icon: "fog" },
  51: { label: "小毛毛雨", icon: "drizzle" },
  53: { label: "毛毛雨", icon: "drizzle" },
  55: { label: "大毛毛雨", icon: "drizzle" },
  56: { label: "冻毛毛雨", icon: "drizzle" },
  57: { label: "强冻毛毛雨", icon: "drizzle" },
  61: { label: "小雨", icon: "rain" },
  63: { label: "中雨", icon: "rain" },
  65: { label: "大雨", icon: "rain" },
  66: { label: "冻雨", icon: "rain" },
  67: { label: "强冻雨", icon: "rain" },
  71: { label: "小雪", icon: "snow" },
  73: { label: "中雪", icon: "snow" },
  75: { label: "大雪", icon: "snow" },
  77: { label: "雪粒", icon: "snow" },
  80: { label: "小阵雨", icon: "rain" },
  81: { label: "阵雨", icon: "rain" },
  82: { label: "强阵雨", icon: "rain" },
  85: { label: "小阵雪", icon: "snow" },
  86: { label: "大阵雪", icon: "snow" },
  95: { label: "雷暴", icon: "storm" },
  96: { label: "雷暴伴小冰雹", icon: "storm" },
  99: { label: "雷暴伴大冰雹", icon: "storm" },
};

export function describeWeather(code: number) {
  return WEATHER_CODES[code] ?? { label: "未知", icon: "cloud" };
}

/** 单个小时的数据点 */
export type HourlyPoint = {
  time: string; // ISO 字符串
  hourLabel: string; // "14:00"
  temperature: number;
  humidity: number;
  precipitationProbability: number;
  windSpeed: number;
};

/** 单日预报 */
export type DailyPoint = {
  date: string;
  weekday: string;
  dateLabel: string;
  weatherCode: number;
  tempMax: number;
  tempMin: number;
  precipitationProbability: number;
  sunrise: string;
  sunset: string;
};

/** 完整的天气数据包 */
export type WeatherData = {
  city: City;
  current: {
    temperature: number;
    apparentTemperature: number;
    humidity: number;
    windSpeed: number;
    windDirection: number;
    weatherCode: number;
    isDay: boolean;
    pressure: number;
    precipitation: number;
  };
  hourly: HourlyPoint[];
  daily: DailyPoint[];
  fetchedAt: string;
};

const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

function formatHour(iso: string): string {
  // Open-Meteo 返回形如 "2024-01-01T14:00"
  const timePart = iso.split("T")[1] ?? "";
  return timePart.slice(0, 5);
}

function formatDateLabel(iso: string): string {
  const [, month, day] = iso.split("-");
  return `${Number(month)}/${Number(day)}`;
}

function weekdayOf(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return WEEKDAYS[d.getDay()] ?? "";
}

/**
 * 拉取某城市的天气数据。
 *
 * 使用 Open-Meteo forecast 接口，一次请求拿到 current / hourly / daily。
 *
 * 参数只需含坐标、时区和名称即可，因此 City 和 city-search 的 CityEntry
 * 都能直接传入 —— 用结构类型而不是绑定具体类型。
 */
export async function fetchWeather(
  city: Pick<City, "name"> & {
    country?: string;
    latitude: number;
    longitude: number;
    timezone?: string;
  }
): Promise<WeatherData> {
  const params = new URLSearchParams({
    latitude: String(city.latitude),
    longitude: String(city.longitude),
    current: [
      "temperature_2m",
      "relative_humidity_2m",
      "apparent_temperature",
      "is_day",
      "precipitation",
      "weather_code",
      "surface_pressure",
      "wind_speed_10m",
      "wind_direction_10m",
    ].join(","),
    hourly: [
      "temperature_2m",
      "relative_humidity_2m",
      "precipitation_probability",
      "wind_speed_10m",
    ].join(","),
    daily: [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "precipitation_probability_max",
      "sunrise",
      "sunset",
    ].join(","),
    timezone: city.timezone ?? "Asia/Shanghai",
    forecast_days: "7",
  });

  const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;

  const res = await fetch(url, {
    // 明确不缓存：天气数据希望每次都是最新的
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(
      `获取天气数据失败：${res.status} ${res.statusText}（城市：${city.name}）`
    );
  }

  const json = await res.json();

  const hourlyTimes: string[] = json.hourly?.time ?? [];
  const nowIso = json.current?.time as string | undefined;

  // 只保留从当前小时开始的 24 小时
  let startIndex = 0;
  if (nowIso) {
    const found = hourlyTimes.findIndex((t) => t >= nowIso);
    if (found >= 0) startIndex = found;
  }

  const hourly: HourlyPoint[] = hourlyTimes
    .slice(startIndex, startIndex + 24)
    .map((time, i) => {
      const idx = startIndex + i;
      return {
        time,
        hourLabel: formatHour(time),
        temperature: json.hourly.temperature_2m?.[idx] ?? 0,
        humidity: json.hourly.relative_humidity_2m?.[idx] ?? 0,
        precipitationProbability:
          json.hourly.precipitation_probability?.[idx] ?? 0,
        windSpeed: json.hourly.wind_speed_10m?.[idx] ?? 0,
      };
    });

  const dailyTimes: string[] = json.daily?.time ?? [];
  const daily: DailyPoint[] = dailyTimes.map((date, i) => ({
    date,
    weekday: weekdayOf(date),
    dateLabel: formatDateLabel(date),
    weatherCode: json.daily.weather_code?.[i] ?? 0,
    tempMax: json.daily.temperature_2m_max?.[i] ?? 0,
    tempMin: json.daily.temperature_2m_min?.[i] ?? 0,
    precipitationProbability:
      json.daily.precipitation_probability_max?.[i] ?? 0,
    sunrise: formatHour(json.daily.sunrise?.[i] ?? ""),
    sunset: formatHour(json.daily.sunset?.[i] ?? ""),
  }));

  return {
    city: {
      id: "id" in city ? String(city.id) : `${city.latitude},${city.longitude}`,
      name: city.name,
      country: city.country ?? "中国",
      latitude: city.latitude,
      longitude: city.longitude,
      timezone: city.timezone ?? "Asia/Shanghai",
    },
    current: {
      temperature: json.current?.temperature_2m ?? 0,
      apparentTemperature: json.current?.apparent_temperature ?? 0,
      humidity: json.current?.relative_humidity_2m ?? 0,
      windSpeed: json.current?.wind_speed_10m ?? 0,
      windDirection: json.current?.wind_direction_10m ?? 0,
      weatherCode: json.current?.weather_code ?? 0,
      isDay: json.current?.is_day === 1,
      pressure: json.current?.surface_pressure ?? 0,
      precipitation: json.current?.precipitation ?? 0,
    },
    hourly,
    daily,
    fetchedAt: new Date().toISOString(),
  };
}

/** 把角度转成中文风向 */
export function windDirectionLabel(deg: number): string {
  const dirs = ["北", "东北", "东", "东南", "南", "西南", "西", "西北"];
  const idx = Math.round(deg / 45) % 8;
  return dirs[idx] ?? "北";
}
