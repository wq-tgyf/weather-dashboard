/**
 * 天气数据接口
 *
 * 用法：
 *   GET /api/weather?lat=39.9&lon=116.4&name=北京   ← 主路径（搜索选中的城市）
 *   GET /api/weather                                 ← 无参数默认北京
 *
 * 注意（Next.js 16）：
 * - Route Handler 签名是 (request, context)
 * - 本项目开启了 cacheComponents，GET handler 与页面走相同的预渲染模型；
 *   这里用 searchParams 读参数，属于运行时数据。
 */

import { NextResponse } from "next/server";

import { fetchWeather } from "@/lib/weather";
import { getDefaultCity } from "@/lib/city-search";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const latParam = searchParams.get("lat");
  const lonParam = searchParams.get("lon");
  const nameParam = searchParams.get("name");

  let target: {
    name: string;
    country?: string;
    latitude: number;
    longitude: number;
  };

  if (latParam && lonParam) {
    /* 按坐标查询 —— 搜索选中的城市走这条路径 */
    const latitude = Number(latParam);
    const longitude = Number(lonParam);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return NextResponse.json({ error: "经纬度参数无效" }, { status: 400 });
    }
    if (
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return NextResponse.json(
        { error: "经纬度超出有效范围" },
        { status: 400 }
      );
    }

    target = {
      name: nameParam || "未知地点",
      country: "中国",
      latitude,
      longitude,
    };
  } else {
    /* 无参数 → 默认城市（与首页首屏一致，来自同一套城市体系） */
    const city = getDefaultCity();
    target = {
      name: city.name,
      country: "中国",
      latitude: city.latitude,
      longitude: city.longitude,
    };
  }

  try {
    const data = await fetchWeather(target);
    return NextResponse.json(data, {
      headers: {
        /* 短缓存，避免频繁切换城市时重复打上游 */
        "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "获取天气数据失败";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
