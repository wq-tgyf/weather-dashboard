/**
 * 城市数据生成脚本
 *
 * 数据源：AreaCity-JsSpider-StatsGov（https://github.com/xiangyuecn/AreaCity-JsSpider-StatsGov）
 * 输入：scripts/raw-areacity.csv
 * 输出：src/lib/cities.json
 *
 * 用法：
 *   node scripts/build-cities.mjs
 *
 * 这个脚本处理了数据源里的几个坑（都是实测发现，不是猜测）：
 *
 * 【坑 1】pinyin_prefix 字段名骗人 —— 它是「首字母」(b) 不是「简拼」(bj)
 *         所以简拼必须从 pinyin 自己拆算。
 * 【坑 2】重庆在城市级被拆成「重庆城区」+「重庆郊县」，没有单独的「重庆」
 *         不处理的话用户搜"重庆"搜不到。
 * 【坑 3】台湾/香港/澳门的 pinyin_prefix 是损坏值（~1 ~2），同样证明别用它。
 * 【坑 4】name 是简称（"北京"），全称在 ext_name（"北京市"），搜索时两个都要能匹配。
 * 【坑 5】简拼冲突严重（bj 对应 7 个城市），需要靠排序 + 多结果展示解决。
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CSV_PATH = join(__dirname, "raw-areacity.csv");
const OUT_PATH = join(__dirname, "..", "src", "lib", "cities.json");

/* ------------------------------------------------------------------ */
/* 1. 解析 CSV                                                         */
/* ------------------------------------------------------------------ */

/** 解析一行 CSV，正确处理双引号包裹的字段 */
function parseCsvLine(line) {
  const fields = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      fields.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  fields.push(cur);
  return fields;
}

const raw = readFileSync(CSV_PATH, "utf8").replace(/^\uFEFF/, "");
const lines = raw.split(/\r?\n/).filter((l) => l.trim());
const header = parseCsvLine(lines[0]);
const idx = Object.fromEntries(header.map((h, i) => [h.trim(), i]));

console.log(`表头: ${header.join(", ")}`);
console.log(`数据行: ${lines.length - 1}`);

const rows = [];
for (let i = 1; i < lines.length; i++) {
  const f = parseCsvLine(lines[i]);
  if (f.length < header.length) continue;

  const deep = Number(f[idx.deep]);
  const name = f[idx.name]?.trim() ?? "";
  const pinyin = f[idx.pinyin]?.trim() ?? "";
  const extName = f[idx.ext_name]?.trim() ?? "";

  if (!name) continue;

  rows.push({
    id: f[idx.id]?.trim() ?? "",
    pid: f[idx.pid]?.trim() ?? "",
    deep,
    name,
    pinyin,
    extName,
  });
}

/* ------------------------------------------------------------------ */
/* 2. 过滤：只要城市级和区县级（deep 1 和 2）                            */
/*    deep=0 是省级，deep=3 是乡镇级，都不需要                          */
/* ------------------------------------------------------------------ */

const kept = rows.filter((r) => r.deep === 1 || r.deep === 2);
console.log(`过滤后（deep 1-2）: ${kept.length} 条`);

/* 建立 id -> 省份名 的映射，用于标注所属省份 */
const provinceById = new Map();
for (const r of rows) {
  if (r.deep === 0) provinceById.set(r.id, r.name);
}
const cityById = new Map();
for (const r of rows) {
  if (r.deep === 1) cityById.set(r.id, r);
}

/* ------------------------------------------------------------------ */
/* 3. 处理【坑 2】重庆                                                  */
/*    数据源里重庆被拆成「重庆城区」(5001) 和「重庆郊县」(5002)           */
/*    这里把 5001 还原成「重庆」，并丢弃郊县，避免搜"重庆"搜不到          */
/* ------------------------------------------------------------------ */

const CHONGQING_CITY_ID = "5001";
const CHONGQING_DISTRICT_ID = "5002";

/* ------------------------------------------------------------------ */
/* 4. 手工别名表                                                       */
/*    这些是约定俗成的缩写，数据集里没有（【坑 5】的补充）                */
/* ------------------------------------------------------------------ */

const ALIASES = {
  北京: ["bj", "beijing"],
  上海: ["sh", "shanghai"],
  广州: ["gz", "guangzhou"],
  深圳: ["sz", "shenzhen"],
  杭州: ["hz", "hangzhou"],
  南京: ["nj", "nanjing"],
  成都: ["cd", "chengdu"],
  重庆: ["cq", "chongqing"],
  武汉: ["wh", "wuhan"],
  西安: ["xa", "xian"],
  天津: ["tj", "tianjin"],
  苏州: ["sz2", "suzhou"],
  哈尔滨: ["hrb", "haerbin"],
  呼和浩特: ["hhht", "huhehaote"],
  乌鲁木齐: ["wlmq", "wulumuqi"],
  石家庄: ["sjz", "shijiazhuang"],
  郑州: ["zz", "zhengzhou"],
  长沙: ["cs", "changsha"],
  青岛: ["qd", "qingdao"],
  大连: ["dl", "dalian"],
  厦门: ["xm", "xiamen"],
  宁波: ["nb", "ningbo"],
  合肥: ["hf", "hefei"],
  福州: ["fz", "fuzhou"],
  济南: ["jn", "jinan"],
  沈阳: ["sy", "shenyang"],
  长春: ["cc", "changchun"],
  昆明: ["km", "kunming"],
  贵阳: ["gy", "guiyang"],
  南宁: ["nn", "nanning"],
  海口: ["hk", "haikou"],
  兰州: ["lz", "lanzhou"],
  西宁: ["xn", "xining"],
  银川: ["yc", "yinchuan"],
  太原: ["ty", "taiyuan"],
  南昌: ["nc", "nanchang"],
  拉萨: ["ls", "lasa"],
  香港: ["hk2", "xianggang"],
  澳门: ["am", "aomen"],
  台北: ["tb", "taibei"],
};

/* ------------------------------------------------------------------ */
/* 5. 生成输出记录                                                     */
/* ------------------------------------------------------------------ */

/** 从 "bei jing" 拆出简拼 "bj" */
function makeInitials(pinyin) {
  return pinyin
    .split(/\s+/)
    .filter(Boolean)
    .map((s) => s[0])
    .join("");
}

/** 去掉拼音里的空格，得到 "beijing" */
function makePinyinJoined(pinyin) {
  return pinyin.replace(/\s+/g, "");
}

const seen = new Set();
const out = [];

for (const r of kept) {
  /* 【坑 2】跳过重庆郊县 */
  if (r.id === CHONGQING_DISTRICT_ID) continue;

  let name = r.name;
  let pinyin = r.pinyin;

  /* 【坑 2】重庆城区 -> 重庆 */
  if (r.id === CHONGQING_CITY_ID) {
    name = "重庆";
    pinyin = "chong qing";
  }

  if (!pinyin) continue;

  const isDirect = ["11", "12", "31", "50"].includes(r.pid); // 直辖市
  const provinceName = isDirect
    ? name
    : (provinceById.get(r.pid) ?? cityById.get(r.pid)?.name ?? "");

  /* 区县的省份取「市」这一级 */
  let cityName = "";
  if (r.deep === 2) {
    cityName = cityById.get(r.pid)?.name ?? "";
    if (r.pid === CHONGQING_CITY_ID) cityName = "重庆";
  }

  /* 去重：同一行政区划只保留一条
     注意：不能用「名字+层级」去重 —— 那样会把同名的不同城市误删
     （如北京朝阳区 vs 长春朝阳区，杭州西湖区 vs 南昌西湖区）。
     正确做法是用【父级 id + 名字】作为唯一键。 */
  const key = `${r.pid}|${name}`;
  if (seen.has(key)) continue;
  seen.add(key);

  const initials = makeInitials(pinyin);
  const pinyinJoined = makePinyinJoined(pinyin);
  const full = r.extName || name;

  /* 别名（只对地级市生效） */
  const aliasList = r.deep === 1 ? (ALIASES[name] ?? []) : [];

  out.push({
    id: r.id,
    name,
    full,
    pinyin: pinyinJoined,
    py: pinyin, // 带空格的，用于显示
    initials,
    province: provinceName,
    city: cityName,
    level: r.deep === 1 ? 1 : 2,
    alias: aliasList.join(" "),
    // 坐标稍后由 fill-coords.mjs 补
    lat: null,
    lon: null,
  });
}

console.log(`生成记录: ${out.length} 条`);
console.log(`  地级市(level 1): ${out.filter((c) => c.level === 1).length}`);
console.log(`  区县  (level 2): ${out.filter((c) => c.level === 2).length}`);

/* ------------------------------------------------------------------ */
/* 6. 抽查关键城市（验证【坑 2】是否修好）                               */
/* ------------------------------------------------------------------ */

const spotCheck = ["重庆", "北京", "单县", "乐清", "浚县"];
console.log("\n关键城市抽查：");
for (const n of spotCheck) {
  const found = out.filter((c) => c.name === n).slice(0, 2);
  if (found.length === 0) {
    console.log(`  ❌ ${n}: 未找到`);
  } else {
    for (const c of found) {
      console.log(
        `  ✅ ${c.name} (${c.province}) pinyin=${c.pinyin} initials=${c.initials} level=${c.level}`
      );
    }
  }
}

/* ------------------------------------------------------------------ */
/* 7. 写出                                                             */
/* ------------------------------------------------------------------ */

writeFileSync(OUT_PATH, JSON.stringify(out), "utf8");
const bytes = readFileSync(OUT_PATH).length;
console.log(`\n已写出: ${OUT_PATH}`);
console.log(`体积: ${(bytes / 1024).toFixed(1)} KB`);
