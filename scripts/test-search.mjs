/**
 * 搜索功能验证
 * 用法: node scripts/test-search.mjs
 *
 * 验收清单来自需求文档，逐条验证。
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

/* 直接复用生成的数据，模拟搜索逻辑（与 city-search.ts 保持一致） */
const cities = JSON.parse(
  readFileSync(join(__dirname, "..", "src", "lib", "cities.json"), "utf8")
).filter((c) => c.lat !== null && c.lon !== null);

function scoreCity(city, q) {
  const name = city.name.toLowerCase();
  const full = city.full.toLowerCase();
  const pinyin = city.pinyin.toLowerCase();
  const initials = city.initials.toLowerCase();
  const aliases = (city.alias || "").toLowerCase().split(/\s+/).filter(Boolean);

  if (name === q) return 100;
  if (pinyin === q) return 95;
  if (initials === q) return 90;
  if (aliases.includes(q)) return 85;
  if (name.startsWith(q)) return 80;
  if (pinyin.startsWith(q)) return 70;
  if (initials.startsWith(q)) return 60;
  if (aliases.some((a) => a.startsWith(q))) return 50;
  if (name.includes(q)) return 40;
  if (full.includes(q)) return 30;
  return 0;
}

const CITY_WEIGHT = {
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
const weightOf = (n) => CITY_WEIGHT[n] ?? 0;

function search(query, limit = 8) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const out = [];
  for (const c of cities) {
    const s = scoreCity(c, q);
    if (s <= 0) continue;
    const levelBonus = c.level === 1 ? 5 : 0;
    const lengthPenalty = Math.min(c.name.length, 20) * 0.1;
    const weightBonus = weightOf(c.name) * 0.1;
    out.push({ score: s + levelBonus + weightBonus - lengthPenalty, city: c });
  }
  out.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.city.level !== b.city.level) return a.city.level - b.city.level;
    return a.city.name.localeCompare(b.city.name, "zh");
  });
  return out.slice(0, limit).map((r) => r.city);
}

/* ------------------------------------------------------------------ */
/* 验收用例                                                            */
/* ------------------------------------------------------------------ */

const CASES = [
  { q: "上海", expectFirst: "上海", desc: "① 中文完整匹配" },
  { q: "杭州", expectFirst: "杭州", desc: "② 中文完整匹配（地级市）" },
  { q: "bj", expectFirst: "北京", desc: "③ 简拼匹配" },
  { q: "sjz", expectFirst: "石家庄", desc: "④ 简拼匹配（三字母）" },
  { q: "hhht", expectFirst: "呼和浩特", desc: "⑤ 简拼匹配（四字母）" },
  { q: "hrb", expectFirst: "哈尔滨", desc: "⑥ 别名匹配（数据集里是 haerbin）" },
  { q: "cq", expectFirst: "重庆", desc: "⑦ 简拼匹配（坑 2 验证）" },
  { q: "beijing", expectFirst: "北京", desc: "⑧ 全拼匹配" },
  { q: "hangzhou", expectFirst: "杭州", desc: "⑨ 全拼匹配" },
  { q: "北", expectFirst: "北京", desc: "⑩ 中文前缀匹配" },
  { q: "xyz123", expectEmpty: true, desc: "⑪ 无结果" },
];

let pass = 0;
let fail = 0;

console.log("=== 搜索功能验收 ===\n");

for (const c of CASES) {
  const r = search(c.q);
  const first = r[0]?.name ?? "(无结果)";
  let ok;

  if (c.expectEmpty) {
    ok = r.length === 0;
  } else {
    ok = r[0]?.name === c.expectFirst;
  }

  if (ok) pass++;
  else fail++;

  console.log(
    `${ok ? "✅" : "❌"} ${c.desc}\n   输入「${c.q}」→ ${r.slice(0, 5).map((x) => x.name).join("、") || "(无结果)"}`
  );
  if (!ok && c.expectFirst) {
    console.log(`      期望首项: ${c.expectFirst}`);
  }
}

console.log(`\n结果: 通过 ${pass} / 失败 ${fail}`);

/* ------------------------------------------------------------------ */
/* 额外检查：重名城市的层级展示                                          */
/* ------------------------------------------------------------------ */

console.log("\n=== 重名城市消歧义检查 ===");
for (const q of ["朝阳", "西湖", "鼓楼"]) {
  const r = search(q, 5);
  console.log(`\n输入「${q}」:`);
  for (const c of r) {
    const region =
      c.level === 1
        ? c.province === c.name
          ? "直辖市"
          : c.province
        : `${c.province} · ${c.city}`;
    console.log(`   ${c.name.padEnd(6)} [${region}] ${c.level === 2 ? "区县" : "地级市"}`);
  }
}

/* ------------------------------------------------------------------ */
/* 数据完整性检查                                                       */
/* ------------------------------------------------------------------ */

console.log("\n=== 数据完整性 ===");
const all = JSON.parse(
  readFileSync(join(__dirname, "..", "src", "lib", "cities.json"), "utf8")
);
console.log(`总记录: ${all.length}`);
console.log(`有坐标: ${all.filter((c) => c.lat !== null).length}`);
console.log(`缺坐标: ${all.filter((c) => c.lat === null).length}`);
console.log(`地级市: ${all.filter((c) => c.level === 1).length}`);
console.log(`区县:   ${all.filter((c) => c.level === 2).length}`);

/* 抽查坐标合理性 */
console.log("\n=== 坐标范围合理性（中国境内应有 lon 73-135, lat 3-54）===");
const outOfRange = all.filter(
  (c) => c.lat !== null && (c.lon < 70 || c.lon > 140 || c.lat < 0 || c.lat > 56)
);
console.log(`超出范围的记录: ${outOfRange.length}`);
for (const c of outOfRange.slice(0, 10)) {
  console.log(`   ${c.name} (${c.province}) lat=${c.lat} lon=${c.lon}`);
}
