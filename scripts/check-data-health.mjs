/**
 * 城市数据健康检查
 * 用法: npx tsx scripts/check-data-health.mjs
 */
import raw from "../src/lib/cities.json";
import { searchCities, CITY_COUNT } from "../src/lib/city-search.ts";

const cities = raw;

console.log("=== 数据总量 ===");
console.log("  总记录:", cities.length);
console.log("  有坐标:", cities.filter((c) => c.lat !== null && c.lon !== null).length);
console.log("  地级市:", cities.filter((c) => c.level === 1).length);
console.log("  区县:", cities.filter((c) => c.level === 2).length);
console.log("  搜索可用索引:", CITY_COUNT);

/* id 唯一性 */
const ids = cities.map((c) => c.id);
const dup = ids.filter((v, i) => ids.indexOf(v) !== i);
console.log("\n=== id 唯一性 ===");
console.log("  重复 id:", new Set(dup).size, new Set(dup).size ? [...new Set(dup)].slice(0, 8) : "");

/* 字段异常 */
const issues = [];
for (const c of cities) {
  if (!c.name || !c.pinyin || !c.initials) issues.push(`${c.id}: 缺 name/pinyin/initials`);
  if (c.lat === null || c.lon === null) issues.push(`${c.id} ${c.name}: 无坐标`);
  if (c.lat !== null && (c.lat < -90 || c.lat > 90)) issues.push(`${c.id} ${c.name}: lat 越界`);
  if (c.lon !== null && (c.lon < -180 || c.lon > 180)) issues.push(`${c.id} ${c.name}: lon 越界`);
}
console.log("\n=== 字段异常 ===");
console.log("  异常数:", issues.length);
issues.slice(0, 10).forEach((i) => console.log("   ", i));

/* 坐标范围（中国） */
const outOfChina = cities.filter(
  (c) => c.lat !== null && (c.lon < 73 || c.lon > 136 || c.lat < 3 || c.lat > 54)
);
console.log("\n=== 坐标范围 ===");
console.log("  超出中国范围:", outOfChina.length);
outOfChina.slice(0, 8).forEach((c) => console.log("   ", c.name, c.province, c.lat, c.lon));

/* 同名城市 */
const byName = {};
for (const c of cities) (byName[c.name] = byName[c.name] || []).push(c);
const dupNames = Object.entries(byName).filter(([, v]) => v.length > 1);
console.log("\n=== 同名城市（需消歧义）===");
console.log("  同名组数:", dupNames.length);
dupNames.slice(0, 5).forEach(([n, v]) =>
  console.log("   ", n, "×", v.length, "->", v.slice(0, 4).map((x) => `${x.province}${x.city ? "/" + x.city : ""}`).join(", "))
);

/* 港澳台可用性 */
console.log("\n=== 港澳台搜索可用性 ===");
for (const q of ["香港", "xianggang", "澳门", "aomen", "台北", "台湾"]) {
  const r = searchCities(q, { limit: 3 });
  console.log(`  「${q}」→ ${r.length ? r.map((x) => x.name).join(", ") : "❌ 无结果"}`);
}

/* 坐标来源分布 */
const src = {};
for (const c of cities) {
  if (c.coordSource) src[c.coordSource] = (src[c.coordSource] || 0) + 1;
}
console.log("\n=== 坐标来源 ===");
Object.entries(src).sort((a, b) => b[1] - a[1]).forEach(([k, v]) =>
  console.log(`   ${k}: ${v} (${((v / cities.length) * 100).toFixed(1)}%)`)
);
