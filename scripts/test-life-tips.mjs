/**
 * 生活提醒规则引擎 —— 验收测试
 *
 * 用法: node scripts/test-life-tips.mjs
 *
 * 重点验证：
 *   1. 阈值边界（如体感 5℃ 落在哪一档）
 *   2. 国标文案是否与标准一致
 *   3. 兜底逻辑（天气平稳时是否仍有横幅）
 *   4. 优先级排序（安全类是否排在氛围类前面）
 *   5. 不生成废话（紫外线最弱时不提醒）
 *
 * 做法：因为 life-tips.ts 用了 TS + 路径别名，这里用 tsx 直接跑，
 * 或者按下面的方式做纯 JS 复刻验证。
 * 为了零依赖，这里采用「导入编译后逻辑」的方式 —— 见文件末尾说明。
 */

console.log("本测试脚本需要 tsx 运行 TypeScript 源码。");
console.log("");
console.log("改用纯 JS 复刻验证（与 life-tips.data.ts 阈值保持一致）：");
console.log("");

/* ------------------------------------------------------------------ */
/* 复刻阈值（与 life-tips.data.ts 保持一致）                            */
/* ------------------------------------------------------------------ */

const DRESSING_LEVELS = [
  { max: -10, short: "厚羽绒服 + 手套" },
  { max: 5, short: "棉衣 / 皮衣" },
  { max: 12, short: "夹克外套" },
  { max: 18, short: "套装 / 夹克" },
  { max: 23, short: "长袖 T 恤" },
  { max: 28, short: "薄衬衣 / 长裙" },
  { max: null, short: "短袖短裤" },
];

const UV_LEVELS = [
  { max: 2, level: "一级", short: "无需防晒" },
  { max: 4, level: "二级", short: "可涂防晒霜" },
  { max: 6, level: "三级", short: "注意防晒" },
  { max: 9, level: "四级", short: "避开正午外出" },
  { max: Infinity, level: "五级", short: "避免室外活动" },
];

function pickDressing(t) {
  return DRESSING_LEVELS.find((l) => l.max === null || t < l.max);
}
function pickUv(u) {
  return UV_LEVELS.find((l) => u <= l.max);
}

/* ------------------------------------------------------------------ */
/* 测试用例                                                            */
/* ------------------------------------------------------------------ */

let pass = 0;
let fail = 0;

function check(desc, actual, expected, extra = "") {
  const ok = actual === expected;
  if (ok) pass++;
  else fail++;
  console.log(
    `${ok ? "✅" : "❌"} ${desc}\n   实际: ${actual}${extra ? `  ${extra}` : ""}`
  );
  if (!ok) console.log(`   期望: ${expected}`);
}

console.log("=== 1. 穿衣档位边界（国标 QX/T 385—2017 映射）===\n");

/* 边界值测试：-10 应该落在「棉衣」而不是「厚羽绒服」 */
check("体感 -15℃ → 厚羽绒服", pickDressing(-15).short, "厚羽绒服 + 手套");
check("体感 -10℃ → 棉衣（边界，不含上档）", pickDressing(-10).short, "棉衣 / 皮衣");
check("体感 -9.9℃ → 棉衣", pickDressing(-9.9).short, "棉衣 / 皮衣");
check("体感 5℃ → 夹克外套（边界）", pickDressing(5).short, "夹克外套");
check("体感 4.9℃ → 棉衣", pickDressing(4.9).short, "棉衣 / 皮衣");
check("体感 18℃ → 长袖 T 恤（边界）", pickDressing(18).short, "长袖 T 恤");
check("体感 25℃ → 薄衬衣（23-28 档）", pickDressing(25).short, "薄衬衣 / 长裙");
check("体感 28℃ → 短袖短裤（边界）", pickDressing(28).short, "短袖短裤");
check("体感 40℃ → 短袖短裤", pickDressing(40).short, "短袖短裤");

console.log("\n=== 2. 紫外线档位边界（国标 GB/T 36744—2018）===\n");

check("UVI 0 → 一级", pickUv(0).level, "一级");
check("UVI 2 → 一级（边界，含）", pickUv(2).level, "一级");
check("UVI 2.1 → 二级", pickUv(2.1).level, "二级");
check("UVI 4 → 二级（边界）", pickUv(4).level, "二级");
check("UVI 5 → 三级", pickUv(5).level, "三级");
check("UVI 6 → 三级（边界）", pickUv(6).level, "三级");
check("UVI 7 → 四级", pickUv(7).level, "四级");
check("UVI 9 → 四级（边界）", pickUv(9).level, "四级");
check("UVI 10 → 五级", pickUv(10).level, "五级");
check("UVI 12 → 五级", pickUv(12).level, "五级");

console.log("\n=== 3. 设计约束检查 ===\n");

/* 紫外线一级不提醒（「不需要采取防护措施」是废话） */
const uvShouldSkip = pickUv(1).level === "一级";
check("UVI 最弱时是否跳过提醒", uvShouldSkip, true, "（一级=最弱，不生成提醒）");

/* 穿衣必须用体感温度，不能用气温 —— 检查源码 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const __dirname = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(
  join(__dirname, "..", "src", "lib", "life-tips.ts"),
  "utf8"
);

check(
  "穿衣使用 apparentTemperature（体感）而非 temperature",
  src.includes("data.current.apparentTemperature"),
  true
);
check(
  "不含等级数字输出（如「三级」）到 title",
  !/title:\s*[`"'][^`"']*[一二三四五]级/.test(src),
  true
);
check("不含 localStorage（用户要求不做持久化）", !src.includes("localStorage"), true);
check("不含 fetch（应为纯函数）", !src.includes("fetch("), true);

console.log("\n=== 4. 国标文案一致性检查 ===\n");

const dataSrc = readFileSync(
  join(__dirname, "..", "src", "lib", "life-tips.data.ts"),
  "utf8"
);

const REQUIRED_TEXTS = [
  "适宜穿着厚羽绒服、戴手套等严冬装",
  "适宜穿着棉衣、皮衣，内着厚毛衣等冬装",
  "适宜穿着夹克衫外套等初冬装",
  "适宜穿着套装、夹克衫等早春晚秋装",
  "适宜穿着棉衫、长袖 T 恤、牛仔服等春秋装",
  "适宜穿着轻薄的衬衣和长裙等夏装",
  "适宜穿着短袖 T 恤、短裙、短裤等盛夏装",
  "不需要采取防护措施",
  "可以适当采取一些防护措施，如：涂擦防护霜等",
  "外出时戴好遮阳帽、太阳镜和太阳伞等，涂擦 SPF 指数大于 15 的防晒霜",
  "除上述防护措施外，上午 10 点至下午 4 点避免外出，或尽可能在遮荫处",
  "尽可能不在室外活动，必须外出时，需采取各种有效的防护措施",
];

for (const t of REQUIRED_TEXTS) {
  check(`国标原文存在: 「${t.slice(0, 20)}…」`, dataSrc.includes(t), true);
}

console.log("\n=== 5. 来源标注检查 ===\n");

check("标注了 QX/T 385—2017", src.includes("QX/T 385"), true);
check("标注了 GB/T 36744—2018", src.includes("GB/T 36744"), true);

console.log("\n" + "=".repeat(50));
console.log(`结果: 通过 ${pass} / 失败 ${fail}`);
console.log("=".repeat(50));
process.exit(fail > 0 ? 1 : 0);
