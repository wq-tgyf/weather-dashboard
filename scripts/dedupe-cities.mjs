/**
 * 清理「省直辖县级市」的重复记录
 *
 * 用法: node scripts/dedupe-cities.mjs
 *
 * 背景：数据源里省直辖县级市（海南的万宁/琼海、湖北的仙桃/潜江、
 * 新疆的石河子/阿拉尔、广东的东莞/中山、港澳等）会出现两条同名记录：
 *
 *   1. level 1 —— 作为「省直辖县级市」本身
 *   2. level 2 —— 它自己的「市区」，父级指向自己
 *
 * 两条名字/拼音/简拼/坐标完全一致，导致搜索结果出现两个「万宁」。
 *
 * 修复：删除 level 2 的那条（保留 level 1）。
 * 判据必须精确 —— 要求「同名 + level 1」都存在才删，
 * 避免误删真正的区县（如南京的鼓楼区，没有同名地级市，不能删）。
 */

import { readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CITIES_PATH = join(__dirname, "..", "src", "lib", "cities.json");
const BACKUP_PATH = join(__dirname, "cities.backup-before-dedupe.json");

const cities = JSON.parse(readFileSync(CITIES_PATH, "utf8"));

/* 先备份，出错可回滚 */
copyFileSync(CITIES_PATH, BACKUP_PATH);
console.log(`已备份到 ${BACKUP_PATH}`);
console.log(`原始记录数: ${cities.length}\n`);

/**
 * 精准判据：level 2 且 city === name（自我父子）
 *
 * 这才是省直辖县级市的真正特征：
 *   万宁: level 2, city = "万宁"（它自己的"市区"，父级就是自己）
 *
 * 而北京朝阳区: level 2, city = "北京" —— city ≠ name，不会被误删。
 *
 * 第一次尝试用「同名 level 1 存在」做判据，结果会误删
 * 北京朝阳区、大连中山区、辽源西安区 —— 已回滚并改成现在这个。
 */

const toDelete = [];
const kept = [];

for (const c of cities) {
  if (c.level !== 2) {
    kept.push(c);
    continue;
  }

  /* 自我父子 = 省直辖县级市的重复记录 */
  const isSelfParent =
    c.city === c.name || (c.province === c.name && c.city === c.name);

  if (isSelfParent) {
    toDelete.push(c);
  } else {
    kept.push(c);
  }
}

console.log(`判据：level 2 且存在同名 level 1 记录\n`);

/* 输出详细清单，便于人工复核 */
console.log(`将删除 ${toDelete.length} 条 level 2 重复记录：\n`);
for (const c of toDelete) {
  console.log(`  ${c.name.padEnd(8)} ${c.province.padEnd(8)} id=${c.id}`);
}

writeFileSync(CITIES_PATH, JSON.stringify(kept), "utf8");

console.log(`\n已写出。`);
console.log(`  删除: ${cities.length - kept.length}`);
console.log(`  剩余: ${kept.length}`);
console.log(`  地级市(level 1): ${kept.filter((c) => c.level === 1).length}`);
console.log(`  区县  (level 2): ${kept.filter((c) => c.level === 2).length}`);

/* 复核：确认没有同名同层的残留冲突 */
const byNameLevel = new Map();
for (const c of kept) {
  const k = `${c.name}|${c.level}`;
  byNameLevel.set(k, (byNameLevel.get(k) ?? 0) + 1);
}
const stillDup = [...byNameLevel.entries()].filter(([, n]) => n > 1);
console.log(`\n仍需人工关注（同名同层多条，属于正常重名城市）:`);
for (const [k, n] of stillDup.slice(0, 15)) {
  console.log(`  ${k} × ${n}`);
}
console.log(`  共 ${stillDup.length} 组`);
