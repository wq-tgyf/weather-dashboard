/**
 * 坐标正确性核对脚本
 * 用法: node scripts/verify-coords.mjs
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cities = JSON.parse(
  readFileSync(join(__dirname, "..", "src", "lib", "cities.json"), "utf8")
);

const filled = cities.filter((c) => c.lat !== null && c.lon !== null);

console.log("=== 概况 ===");
console.log(`总城市: ${cities.length}`);
console.log(`已补坐标: ${filled.length}`);
console.log(`未补: ${cities.length - filled.length}`);

console.log("\n=== 前 15 条已补记录 ===");
for (const c of filled.slice(0, 15)) {
  const prov = c.province || "-";
  console.log(
    `${c.name.padEnd(8)} ${prov.padEnd(10)} lat=${String(c.lat).padEnd(9)} lon=${String(c.lon).padEnd(10)} ${c.coordSource ?? "-"}`
  );
}

/* 已知真实坐标，用于核对准确性 */
const KNOWN = {
  北京: [39.9042, 116.4074],
  上海: [31.2304, 121.4737],
  广州: [23.1291, 113.2644],
  深圳: [22.5431, 114.0579],
  天津: [39.3434, 117.3616],
  重庆: [29.563, 106.5516],
  杭州: [30.2741, 120.1551],
  成都: [30.5728, 104.0668],
  武汉: [30.5928, 114.3055],
  西安: [34.3416, 108.9398],
};

console.log("\n=== 坐标准确性核对（偏差 < 0.5 度算正确）===");
let pass = 0;
let notFilled = 0;
let missing = 0;
let wrong = 0;

for (const [name, [tLat, tLon]] of Object.entries(KNOWN)) {
  const c = cities.find((x) => x.name === name && x.level === 1);
  if (!c) {
    console.log(`  ❓ ${name}: 数据中没有此城市`);
    missing++;
    continue;
  }
  if (c.lat === null) {
    console.log(`  ⏳ ${name}: 坐标尚未补齐`);
    notFilled++;
    continue;
  }
  const dLat = Math.abs(c.lat - tLat);
  const dLon = Math.abs(c.lon - tLon);
  const ok = dLat < 0.5 && dLon < 0.5;
  if (ok) pass++;
  else wrong++;
  console.log(
    `  ${ok ? "✅" : "⚠️"} ${name}: 实际(${c.lat}, ${c.lon}) 期望(${tLat}, ${tLon}) 偏差(${dLat.toFixed(3)}, ${dLon.toFixed(3)})`
  );
}

console.log(
  `\n结果: 正确 ${pass} / 错误 ${wrong} / 未补 ${notFilled} / 缺失 ${missing}`
);

/* 坐标来源分布 */
const sources = {};
for (const c of filled) {
  const s = c.coordSource ?? "unknown";
  sources[s] = (sources[s] ?? 0) + 1;
}
console.log("\n=== 坐标来源分布 ===");
for (const [s, n] of Object.entries(sources)) {
  console.log(`  ${s}: ${n}`);
}
