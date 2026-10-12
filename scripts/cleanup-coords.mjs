/**
 * 最终清洗：把距离所属城市过远的区县坐标拉回父城市
 *
 * 用法: node scripts/cleanup-coords.mjs
 *
 * 背景：台湾和自治州的区县名在内地有重名（如台中的「北屯」匹配到新疆北屯），
 *   geocoding 会给出完全错误的坐标。这些区县数量不多，且用户搜索它们的
 *   概率很低，因此直接继承父城市坐标比保留错误坐标更安全。
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CITIES_PATH = join(__dirname, "..", "src", "lib", "cities.json");
const cities = JSON.parse(readFileSync(CITIES_PATH, "utf8"));

/* 地级市索引 */
const cityIndex = new Map();
for (const c of cities) {
  if (c.level === 1) cityIndex.set(c.name, c);
}

/** 阈值：区县距所属城市超过这个度数就判定为错误坐标 */
const MAX_DIST = 2.0;

let fixed = 0;
const fixedNames = [];

for (const c of cities) {
  if (c.level !== 2 || c.lat === null) continue;
  if (!c.city) continue;

  const parent = cityIndex.get(c.city);
  if (!parent || parent.lat === null) continue;

  const d = Math.sqrt((c.lat - parent.lat) ** 2 + (c.lon - parent.lon) ** 2);

  if (d > MAX_DIST) {
    fixedNames.push(`${c.name}(${c.city}) 偏差${d.toFixed(1)}°`);
    c.lat = parent.lat;
    c.lon = parent.lon;
    c.coordSource = "fallback-city";
    fixed++;
  }
}

writeFileSync(CITIES_PATH, JSON.stringify(cities), "utf8");

console.log(`清洗了 ${fixed} 个区县坐标（改为继承所属城市）`);
console.log("\n受影响的区县（前 25）:");
for (const n of fixedNames.slice(0, 25)) console.log(`  ${n}`);

/* 复查 */
let stillBad = 0;
for (const c of cities) {
  if (c.level !== 2 || c.lat === null || !c.city) continue;
  const parent = cityIndex.get(c.city);
  if (!parent || parent.lat === null) continue;
  const d = Math.sqrt((c.lat - parent.lat) ** 2 + (c.lon - parent.lon) ** 2);
  if (d > MAX_DIST) stillBad++;
}

console.log(`\n复查：仍超阈值的区县 ${stillBad} 个`);

const outOfChina = cities.filter(
  (c) => c.lat !== null && (c.lon < 73 || c.lon > 136 || c.lat < 3 || c.lat > 54)
).length;
console.log(`复查：仍在国外的坐标 ${outOfChina} 个`);
