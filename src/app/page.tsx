/**
 * 首页（服务端组件）
 *
 * 数据流：
 *   服务端 fetch Open-Meteo → 传给客户端组件做动效渲染
 *
 * ⚠️ 关键：next.config.ts 开启了 cacheComponents: true，
 * 未缓存的 fetch 必须包在 <Suspense> 里，否则报 blocking-route 错误。
 * 同时首屏数据在服务端取，客户端组件切城市时再走 /api/weather。
 */

import { Suspense } from "react";

import { WeatherDashboard } from "@/components/weather-dashboard";
import { DashboardSkeleton } from "@/components/dashboard-skeleton";
import { fetchWeather } from "@/lib/weather";
import { getDefaultCity } from "@/lib/city-search";

async function DashboardData() {
  const city = getDefaultCity();
  const data = await fetchWeather(city);
  return <WeatherDashboard initialData={data} initialCity={city} />;
}

export default function Home() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardData />
    </Suspense>
  );
}
