/**
 * 坐标准确性审计
 *
 * 用法: node scripts/audit-coords.mjs
 *
 * 检查项：
 *   1. 坐标是否在中国合理范围内
 *   2. 区县坐标与所属地级市的距离是否过远（超过 1.5 度约 150km 视为可疑）
 *   3. 同一地级市下所有区县坐标是否完全相同（说明用了兜底坐标）
 *   4. 统计坐标来源分布
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cities = JSON.parse(
  readFileSync(join(__dirname, "..", "src", "lib", "cities.json"), "utf8")
);

const filled = cities.filter((c) => c.lat !== null && c.lon !== null);

console.log("=".repeat(60));
console.log("坐标准确性审计");
console.log("=".repeat(60));

console.log(`\n总记录: ${cities.length}`);
console.log(`有坐标: ${filled.length} (${((filled.length / cities.length) * 100).toFixed(1)}%)`);
console.log(`缺坐标: ${cities.length - filled.length}`);

/* ---------------- 1. 范围检查 ---------------- */

console.log("\n【1】坐标范围检查（中国: lon 73-136, lat 3-54）");
const outOfRange = filled.filter(
  (c) => c.lon < 73 || c.lon > 136 || c.lat < 3 || c.lat > 54
);
console.log(`  超出范围: ${outOfRange.length}`);
for (const c of outOfRange.slice(0, 20)) {
  console.log(`    ⚠️ ${c.name} (${c.province} ${c.city}) lat=${c.lat} lon=${c.lon}`);
}

/* ---------------- 2. 区县与所属城市的距离 ---------------- */

console.log("\n【2】区县与所属地级市的距离检查");

const cityByName = new Map();
for (const c of cities) {
  if (c.level === 1) cityByName.set(c.name, c);
}

let tooFar = [];
let sameCoord = 0;
let checkedDistricts = 0;

for (const d of filled) {
  if (d.level !== 2) continue;
  const parent = cityByName.get(d.city);
  if (!parent || parent.lat === null) continue;

  checkedDistricts++;

  const dLat = d.lat - parent.lat;
  const dLon = d.lon - parent.lon;
  const dist = Math.sqrt(dLat * dLat + dLon * dLon);

  /* 坐标完全相同 -> 用了兜底 */
  if (dist === 0) sameCoord++;

  /* 超过 1.5 度（约 150km）视为可疑 */
  if (dist > 1.5) {
    tooFar.push({ d, parent, dist });
  }
}

console.log(`  检查了 ${checkedDistricts} 个区县`);
console.log(`  与所属城市坐标完全相同: ${sameCoord}（用了兜底或同一坐标）`);
console.log(`  距离所属城市 > 1.5 度: ${tooFar.length}`);

tooFar.sort((a, b) => b.dist - a.dist);
for (const t of tooFar.slice(0, 20)) {
  console.log(
    `    ⚠️ ${t.d.name} (${t.d.province}·${t.d.city}) 距 ${t.parent.name} ${t.dist.toFixed(2)}° [${t.d.lat},${t.d.lon}]`
  );
}

/* ---------------- 3. 地级市坐标抽查 ---------------- */

console.log("\n【3】地级市坐标抽查（对比已知真实值）");

const KNOWN = {
  北京: [39.9042, 116.4074],
  上海: [31.2304, 121.4737],
  广州: [23.1291, 113.2644],
  深圳: [22.5431, 114.0579],
  杭州: [30.2741, 120.1551],
  成都: [30.5728, 104.0668],
  武汉: [30.5928, 114.3055],
  西安: [34.3416, 108.9398],
  重庆: [29.563, 106.5516],
  哈尔滨: [45.8038, 126.535],
  乌鲁木齐: [43.8256, 87.6168],
  拉萨: [29.65, 91.1],
  三亚: [18.2528, 109.5119],
  漠河: [52.9722, 122.5389],
};

let okCount = 0;
let badCount = 0;
for (const [name, [tLat, tLon]] of Object.entries(KNOWN)) {
  const c = cities.find((x) => x.name === name && x.level === 1);
  if (!c) {
    console.log(`  ❓ ${name}: 数据中无此地级市`);
    continue;
  }
  if (c.lat === null) {
    console.log(`  ⏳ ${name}: 坐标未补`);
    continue;
  }
  const dLat = Math.abs(c.lat - tLat);
  const dLon = Math.abs(c.lon - tLon);
  const ok = dLat < 0.5 && dLon < 0.5;
  if (ok) okCount++;
  else badCount++;
  console.log(
    `  ${ok ? "✅" : "❌"} ${name}: (${c.lat}, ${c.lon}) 期望 (${tLat}, ${tLon}) 偏差 ${Math.max(dLat, dLon).toFixed(3)}°`
  );
}

console.log(`\n  正确 ${okCount} / 错误 ${badCount}`);

/* ---------------- 4. 来源分布 ---------------- */

console.log("\n【4】坐标来源分布");
const sources = {};
for (const c of filled) {
  const s = c.coordSource ?? "unknown";
  sources[s] = (sources[s] ?? 0) + 1;
}
for (const [s, n] of Object.entries(sources).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${s}: ${n}`);
}

/* ---------------- 5. 结论 ---------------- */

console.log("\n" + "=".repeat(60));
console.log("审计结论");
console.log("=".repeat(60));

const issues = [];
if (outOfRange.length > 0) issues.push(`坐标超范围: ${outOfRange.length} 条`);
if (tooFar.length > 0) issues.push(`区县距所属城市过远: ${tooFar.length} 条`);
if (badCount > 0) issues.push(`地级市坐标错误: ${badCount} 个`);

if (issues.length === 0) {
  console.log("✅ 未发现明显问题");
} else {
  console.log("发现的问题:");
  for (const i of issues) console.log(`  - ${i}`);
}
