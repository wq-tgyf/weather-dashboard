/**
 * 统一测试入口
 *
 * 用法: npm test
 *
 * 跑全部检查，任何一个失败就以非零退出码结束（CI 依赖这个）。
 *
 * 分层：
 *   [unit]  纯逻辑测试（真源码，tsx 跑 TS）—— 快到可以在每次提交前跑
 *   [data]  数据健康检查（不跑网络，读静态 JSON）
 *   [lint]  类型检查
 *
 * 不包含：需要网络的脚本（fill-coords 等抓取脚本）、一次性生成脚本。
 */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const SUITES = [
  // ---- 纯逻辑（无需网络）----
  {
    name: "搜索逻辑",
    file: "scripts/test-search.mjs",
    runner: "node",
    group: "unit",
  },
  {
    name: "生活提醒规则（真源码 38 用例）",
    file: "scripts/verify-life-tips-boundary.mjs",
    runner: "tsx",
    group: "unit",
  },
  // ---- 数据健康（读静态 JSON）----
  {
    name: "城市数据健康",
    file: "scripts/check-data-health.mjs",
    runner: "tsx",
    group: "data",
  },
  {
    name: "字重一致性",
    file: "scripts/check-font-weights.mjs",
    runner: "node",
    group: "data",
  },
];

function run(entry) {
  /*
   * Windows 上 npx 是 .cmd 文件，spawnSync(shell: false) 无法直接执行，
   * 会返回 status: null。所以统一走 shell，并把路径用引号包住。
   *
   * 注意 CI（Linux）上 shell 也能正常工作，所以不需要平台分支。
   */
  const res = spawnSync(entry.command, {
    cwd: ROOT,
    encoding: "utf8",
    shell: true,
  });
  return {
    ok: res.status === 0,
    status: res.status,
    stdout: res.stdout ?? "",
    stderr: res.stderr ?? "",
  };
}

console.log("=".repeat(60));
console.log("天气看板 · 测试套件");
console.log("=".repeat(60));

const results = [];
let currentGroup = "";

for (const suite of SUITES) {
  if (suite.group !== currentGroup) {
    currentGroup = suite.group;
    console.log(`\n--- ${currentGroup.toUpperCase()} ---`);
  }

  const file = join(ROOT, suite.file);
  if (!existsSync(file)) {
    console.log(`⚠️  SKIP  ${suite.name}（文件不存在: ${suite.file}）`);
    continue;
  }

  const cmd = suite.runner === "tsx" ? "npx tsx" : "node";
  const entry = { command: `${cmd} "${suite.file}"` };

  process.stdout.write(`  ${suite.name} ... `);
  const r = run(entry);
  console.log(r.ok ? "PASS" : `FAIL (exit ${r.status})`);
  results.push(r);

  if (!r.ok) {
    /* 失败时把输出打出来，方便定位 */
    const out = (r.stdout + r.stderr).trim();
    if (out) {
      console.log(
        out
          .split("\n")
          .map((l) => "      " + l)
          .join("\n")
      );
    }
  }
}

console.log("\n" + "=".repeat(60));
const passed = results.filter((r) => r.ok).length;
const failed = results.filter((r) => !r.ok).length;
console.log(`结果: ${passed} 通过 / ${failed} 失败`);
console.log("=".repeat(60));

process.exit(failed > 0 ? 1 : 0);
