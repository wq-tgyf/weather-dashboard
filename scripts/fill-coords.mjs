/**
 * 坐标补齐脚本
 *
 * 数据源：Open-Meteo Geocoding API（免费，无需 Key）
 *   https://geocoding-api.open-meteo.com/v1/search?name=北京&count=1&language=zh&format=json
 *
 * 用法：
 *   node scripts/fill-coords.mjs          # 全量补齐
 *   node scripts/fill-coords.mjs --limit 50   # 只补前 50 条（测试用）
 *   node scripts/fill-coords.mjs --retry      # 只补之前失败的
 *
 * 特点：
 *   - 断点续传：已补过的坐标会保留，中断后重跑不会重复请求
 *   - 自动节流：默认每次请求间隔 120ms，避免触发限流
 *   - 失败重试：单条失败重试 2 次
 *   - 保守策略：地名匹配不上时，区县用所属城市的坐标兜底
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CITIES_PATH = join(__dirname, "..", "src", "lib", "cities.json");
const CACHE_PATH = join(__dirname, "coords-cache.json");

/* 命令行参数 */
const args = process.argv.slice(2);
const LIMIT = args.includes("--limit")
  ? Number(args[args.indexOf("--limit") + 1])
  : Infinity;
const RETRY_ONLY = args.includes("--retry");
const DELAY_MS = args.includes("--delay")
  ? Number(args[args.indexOf("--delay") + 1])
  : 120;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const cities = JSON.parse(readFileSync(CITIES_PATH, "utf8"));

/** 坐标缓存：{ [城市名]: { lat, lon } } —— 跨运行保留 */
let cache = {};
if (existsSync(CACHE_PATH)) {
  cache = JSON.parse(readFileSync(CACHE_PATH, "utf8"));
  console.log(`已加载缓存: ${Object.keys(cache).length} 条`);
}

/** 查询单个地名的坐标 */
async function geocode(name, adminHint) {
  const key = adminHint ? `${name}|${adminHint}` : name;
  if (cache[key]) return cache[key];

  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", name);
  url.searchParams.set("count", "5");
  url.searchParams.set("language", "zh");
  url.searchParams.set("format", "json");

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(15000),
      });
      if (res.status === 429) {
        // 被限流，退避等待
        console.log(`    ⏸ 限流，等待 5 秒...`);
        await sleep(5000);
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json = await res.json();
      const results = json.results ?? [];

      let hit = null;

      if (adminHint) {
        // 优先选行政区划匹配的
        hit = results.find(
          (r) =>
            (r.admin1 && r.admin1.includes(adminHint)) ||
            (r.name && name.startsWith(r.name))
        );
      }
      hit = hit ?? results[0];

      if (hit) {
        const val = {
          lat: Number(hit.latitude.toFixed(4)),
          lon: Number(hit.longitude.toFixed(4)),
          source: "geocoding",
        };
        cache[key] = val;
        return val;
      }

      cache[key] = null;
      return null;
    } catch (e) {
      if (attempt === 2) {
        console.log(`    ❌ ${name}: ${e.message}`);
        return null;
      }
      await sleep(800);
    }
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* 主流程                                                              */
/* ------------------------------------------------------------------ */

const targets = RETRY_ONLY
  ? cities.filter((c) => c.lat === null)
  : cities;

const work = targets.slice(0, LIMIT === Infinity ? targets.length : LIMIT);

console.log(`\n待补坐标: ${work.length} 条`);
console.log(`请求间隔: ${DELAY_MS}ms`);
console.log(
  `预计耗时: ${((work.length * DELAY_MS) / 1000 / 60).toFixed(1)} 分钟\n`
);

let ok = 0;
let fail = 0;
let skipped = 0;

for (let i = 0; i < work.length; i++) {
  const c = work[i];

  /* 已有坐标 -> 跳过（断点续传） */
  if (c.lat !== null && c.lon !== null && !RETRY_ONLY) {
    skipped++;
    continue;
  }

  /* 区县优先用「城市名」查询，拿不到再用区县名 */
  let coords = null;
  if (c.level === 2 && c.city) {
    coords = await geocode(c.city, c.province);
    await sleep(DELAY_MS);
  }
  if (!coords) {
    coords = await geocode(c.name, c.province);
  }

  if (coords) {
    c.lat = coords.lat;
    c.lon = coords.lon;
    c.coordSource = coords.source;
    ok++;
  } else {
    /* 兜底：区县用所属城市的坐标 */
    if (c.city) {
      const cityCoords = cache[c.city] ?? cache[`${c.city}|${c.province}`];
      if (cityCoords) {
        c.lat = cityCoords.lat;
        c.lon = cityCoords.lon;
        c.coordSource = "fallback-city";
        ok++;
      } else {
        fail++;
      }
    } else {
      fail++;
    }
  }

  /* 进度输出 */
  if ((i + 1) % 100 === 0 || i === work.length - 1) {
    console.log(
      `  进度 ${i + 1}/${work.length}  ok=${ok} fail=${fail} skip=${skipped}`
    );
    /* 定期保存，防中断丢数据 */
    writeFileSync(CITIES_PATH, JSON.stringify(cities), "utf8");
    writeFileSync(CACHE_PATH, JSON.stringify(cache), "utf8");
  }

  await sleep(DELAY_MS);
}

/* 最终写出 */
writeFileSync(CITIES_PATH, JSON.stringify(cities), "utf8");
writeFileSync(CACHE_PATH, JSON.stringify(cache), "utf8");

const withCoords = cities.filter((c) => c.lat !== null && c.lon !== null).length;

console.log(`\n完成！`);
console.log(`  补齐成功: ${ok}`);
console.log(`  失败: ${fail}`);
console.log(`  跳过（已有）: ${skipped}`);
console.log(`  有坐标的城市: ${withCoords}/${cities.length}`);
