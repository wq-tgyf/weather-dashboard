/**
 * 省名兜底 + 搜索回归测试
 * 用法: npx tsx scripts/test-province-fallback.mjs
 */

import { searchCities } from "../src/lib/city-search.ts";

let pass = 0;
let fail = 0;

function check(desc, actual, expected) {
  const ok = actual === expected;
  if (ok) pass++;
  else fail++;
  console.log(`${ok ? "✅" : "❌"} ${desc}`);
  if (!ok) console.log(`   实际: ${actual}\n   期望: ${expected}`);
}

function checkThat(desc, cond) {
  if (cond) pass++;
  else fail++;
  console.log(`${cond ? "✅" : "❌"} ${desc}`);
}

console.log("=== 省名兜底 ===\n");

{
  const tw = searchCities("台湾");
  checkThat("搜「台湾」不再空结果", tw.length > 0);
  check("「台湾」首项是台北", tw[0]?.name, "台北");
  checkThat("结果全部属于台湾省", tw.every((c) => c.province === "台湾"));

  const zj = searchCities("浙江");
  check("「浙江」首项是杭州", zj[0]?.name, "杭州");

  const gd = searchCities("广东");
  check("「广东」首项是广州", gd[0]?.name, "广州");

  const twEn = searchCities("taiwan");
  check("「taiwan」也命中", twEn[0]?.name, "台北");

  /* 注意：「tw」是屏东县泰武乡的简拼，城市精确命中优先于省名兜底 ——
     兜底只在城市完全搜不到时才启用，这是设计。 */
  const twAbbr = searchCities("tw");
  check("「tw」命中真实城市（泰武）而非兜底", twAbbr[0]?.name, "泰武");

  /* 「海南」有同名区县（青海海南州/区级记录），完整匹配优先 —— 正确。
     真正会触发兜底的是数据里完全不存在的省名。 */
  const hn = searchCities("海南");
  checkThat("「海南」有结果（命中同名区县，不触发兜底）", hn.length > 0);

  /* 数据里没有与省同名的城市记录，才会走到兜底 */
  const xz = searchCities("西藏");
  checkThat("「西藏」触发兜底（无同名城市）", xz.length > 0);
  checkThat("「西藏」结果全部属于西藏省", xz.every((c) => c.province === "西藏"));
}

console.log("\n=== 不干扰正常搜索 ===\n");

{
  /* 「北」仍然正常搜城市，不触发兜底 */
  const b = searchCities("北");
  check("「北」首项仍是北京", b[0]?.name, "北京");

  /* 空查询仍然返回空 */
  check("空查询返回空", searchCities("").length, 0);

  /* 无意义查询仍为空（无省份匹配） */
  check("xyz123 仍为空", searchCities("xyz123").length, 0);

  /* 普通城市搜索不受影响 */
  check("「杭州」仍是杭州", searchCities("杭州")[0]?.name, "杭州");
  check("「bj」仍是北京", searchCities("bj")[0]?.name, "北京");
}

console.log("\n" + "=".repeat(40));
console.log(`结果: 通过 ${pass} / 失败 ${fail}`);
process.exit(fail > 0 ? 1 : 0);
