/**
 * 字重一致性检查
 * 用法: node scripts/check-font-weights.mjs
 *
 * 背景：layout.tsx 只加载了 Inter 的 200-600 字重（苹果风大数字需要 200）。
 * 如果代码用了 font-bold(700)/extrabold(800)/black(900)，浏览器会伪造粗体
 * （伪合成），微软雅黑场景下中文会发虚。
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = join(__dirname, "..", "src");

const LOADED = [200, 300, 400, 500, 600];
const CLASS_TO_WEIGHT = {
  "font-thin": 100,
  "font-extralight": 200,
  "font-light": 300,
  "font-normal": 400,
  "font-medium": 500,
  "font-semibold": 600,
  "font-bold": 700,
  "font-extrabold": 800,
  "font-black": 900,
};

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(p)) out.push(p);
  }
  return out;
}

const files = walk(SRC);
const findings = [];
const counts = {};

for (const f of files) {
  const lines = readFileSync(f, "utf8").split("\n");
  lines.forEach((line, i) => {
    for (const cls of Object.keys(CLASS_TO_WEIGHT)) {
      // 确保是完整类名，避免 font-bold 命中 font-bold-ish
      const re = new RegExp(`(^|["'\\s\`])${cls}(["'\\s\`]|$)`);
      if (re.test(line)) {
        const w = CLASS_TO_WEIGHT[cls];
        counts[cls] = (counts[cls] ?? 0) + 1;
        findings.push({ file: f.replace(SRC + "/", ""), line: i + 1, cls, weight: w });
      }
    }
  });
}

console.log("=== 字重使用统计 ===");
for (const k of Object.keys(CLASS_TO_WEIGHT)) {
  if (counts[k]) console.log(`  ${k.padEnd(16)} ${String(CLASS_TO_WEIGHT[k]).padStart(3)}  ${counts[k]} 处`);
}

const over = findings.filter((f) => !LOADED.includes(f.weight));
console.log(`\n=== 超出已加载字重（${LOADED.join(", ")}）===`);
if (over.length === 0) {
  console.log("  ✅ 无 —— 全部字重都在已加载范围内");
} else {
  console.log(`  ❌ ${over.length} 处，会触发伪合成（中文发虚）：`);
  for (const f of over) {
    console.log(`     ${f.file}:${f.line}  ${f.cls} (${f.weight})`);
  }
}

/* 检查 layout 加载的字重 */
console.log("\n=== layout.tsx 实际加载的字重 ===");
const layout = readFileSync(join(SRC, "..", "src", "app", "layout.tsx"), "utf8");
const m = layout.match(/weight:\s*\[([^\]]+)\]/);
if (m) {
  console.log(`  Inter weight: [${m[1]}]`);
} else {
  console.log("  未显式指定 weight（默认可能只加载 400）");
}
console.log(`  操作系统: ${process.platform}`);
