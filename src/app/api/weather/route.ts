/**
 * 天气数据接口
 *
 * 用法：GET /api/weather?city=beijing
 *
 * 注意（Next.js 16）：
 * - Route Handler 签名是 (request, context)
 * - 本项目开启了 cacheComponents，GET handler 与页面走相同的预渲染模型；
 *   这里用 searchParams 读参数，属于运行时数据，因此显式声明为动态。
 */

import { NextResponse } from "next/server";

import { CITIES, fetchWeather, getCity } from "@/lib/weather";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cityId = searchParams.get("city") ?? CITIES[0].id;

  const city = getCity(cityId);

  try {
    const data = await fetchWeather(city);
    return NextResponse.json(data, {
      headers: {
        // 短缓存，避免频繁切换城市时重复打上游
        "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "获取天气数据失败";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
