# 全国天气看板

> **不是「查天气」，是「今天该怎么办」。**

普通的天气应用告诉你 **「18°C，阴」**。
这个看板告诉你 **「穿夹克外套」「下午有雨，带伞」「紫外线强，避开正午」** —— 并且**每一条都能追溯到国家标准的出处**。

数据来自 [Open-Meteo](https://open-meteo.com/)（完全免费、无需注册、无需 Key），前端零成本运行。

**🔗 线上地址**：https://weather-dashboard-pied-alpha.vercel.app

---

## 它解决了什么问题

### 问题：天气数据从来不缺，缺的是「该做什么」

| 普通天气 App 给的信息 | 用户实际要回答的问题 |
|---|---|
| 18°C、阴、湿度 61% | 穿什么？ |
| 降水概率 55% | 带不带伞？ |
| UV 指数 6 | 要不要防晒？ |

**用户看完数字，还得自己做一次判断。** 而这个判断，恰恰是可以标准化的。

### 解法：用国标把「判断」做成确定性的产品

不是拍脑袋定阈值，而是落地两份国家/行业标准：

| 提醒 | 依据 | 说明 |
|---|---|---|
| 🧥 **穿衣** | **QX/T 385—2017**《穿衣气象指数》 | 中国气象局行业标准，7 级分档，文案逐字抄录 |
| 🕶️ **紫外线** | **GB/T 36744—2018**《紫外线指数预报方法》 | 国家标准，5 级分档 + 官方防护措施 |
| ☂️ 带伞 | 中国天气网「按出行时段播报」思路 | 未来 12 小时降水概率峰值 + 时段 |
| 🏃 运动 | 和风天气 / 华风爱科 3 级分档 | 体感 + 降水 + 风速综合 |
| 🚗 洗车 | 中国天气网官方逻辑 | **向后看 4 天**，不是只看今天 |
| 👕 晾晒 | 和风天气 6 级简化为 3 档 | 与洗车同源，但对今天要求更严 |
| 🤧 感冒 | 昼夜温差 | 中国特色关注项 |
| 🌫️ 能见度 | Open-Meteo 能见度字段 | 低于 2km 提示（雾/霾） |

此外还有一个**兜底项**「今日天气平稳」——保证顶部横幅任何时候都有内容。

**为什么「用国标」很关键**：网上流传的「26℃ 穿衣公式」被中国气象局**公开否定** —— 同样气温，南方北方、有风无风体感完全不同。所以这里用的是**体感温度**（已综合湿度、风速、辐射），不是裸气温。

### 三个「不打扰用户」的克制

产品做减法比做加法难。这个看板刻意**不**做这些：

| 不做 | 原因 |
|---|---|
| **不显示等级数字** | 中国天气网自己的页面就有「洗车三级=不适宜、行驶一级=好、晨练四级=适宜」的方向混乱。直接给「带伞出门」。 |
| **无事不提示** | 没雨不提示带伞；紫外线最弱不提示防晒；今明有雨不提示洗车（带伞已覆盖）。**每条提醒都必须有信息量。** |
| **不堆砌指数** | 墨迹/中国天气网一次铺 20+ 项 → 用户会训练出「忽略整块区域」的习惯。这里最多 5 条，按「严重度 × 时效 × 确定性」排序。 |

---

## 功能

- **城市搜索**：支持中文名、拼音、简拼、别名，覆盖 3563 个城市与区县
  - `杭州` / `hangzhou` / `hz` / `北` 都能搜到
  - 重名城市用「省 · 市」标注消歧义（如搜「西湖」会区分杭州/南昌/苗栗）
  - 键盘操作：`/` 聚焦、`↑↓` 选择、`Enter` 确认、`Esc` 关闭
- **实时天气**：温度、体感温度、天气状况、湿度、风速风向、气压、降水量
- **24 小时趋势**：温度变化曲线图 + 降水概率柱状图
- **7 天预报**：每日天气、最高/最低温、降水概率、日出日落时间
- **生活提醒**：8 项判断 + 1 个兜底，顶部横幅始终有内容，网格最多 5 条，点击展开完整建议与**依据来源**
- **城市缓存**：已查询过的城市不重复请求

## 界面

苹果风浅色主题（色值取自 apple.com 线上实测）：

- 页面底 `#f5f5f7`，白卡浮于其上，**无边框无阴影** —— 靠 2% 亮度差造层次
- 全页只有一个彩色 `#0071e3`（苹果网页版蓝），只用于交互与图表
- 大数字温度 `font-extralight`（200 字重）—— 苹果的「大而细」
- 所有前景色对比度经 WCAG 实测达标（主文字 15.46:1，次要 4.86:1）

## 技术栈

| 层面 | 选择 |
|---|---|
| 框架 | Next.js 16.4（App Router + Turbopack + Cache Components） |
| 语言 | TypeScript 5 |
| UI 库 | React 19.3 |
| 样式 | Tailwind CSS v4 |
| 动效 | Framer Motion 14 |
| 图表 | Recharts 3 |
| 图标 | lucide-react |
| 字体 | Inter（西文/数字）+ 系统中文栈（苹方/雅黑，SF Pro 授权禁止 webfont） |
| 天气数据 | Open-Meteo Forecast API |
| 城市数据 | [AreaCity](https://github.com/xiangyuecn/AreaCity-JsSpider-StatsGov) + Open-Meteo Geocoding |

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

打开 http://localhost:3000 查看。

```bash
# 生产构建
npm run build

# 启动生产服务器
npm start
```

## 项目结构

```
src/
├── app/
│   ├── layout.tsx              # 根布局（Inter + 系统中文字体栈）
│   ├── page.tsx                # 首页（服务端组件 + Suspense）
│   ├── error.tsx               # 错误边界（客户端组件）
│   ├── globals.css             # 苹果风设计 token
│   └── api/
│       └── weather/route.ts    # 天气接口（按坐标或城市 id 查询）
├── components/
│   ├── weather-dashboard.tsx   # 看板主界面
│   ├── city-search.tsx         # 城市搜索框（键盘操作 + 消歧义）
│   ├── life-tips.tsx           # 生活提醒横幅 + 网格
│   ├── count-up.tsx            # 数字滚动
│   ├── weather-icon.tsx        # SVG 天气图标
│   └── dashboard-skeleton.tsx  # 骨架屏
└── lib/
    ├── weather.ts              # Open-Meteo 数据层
    ├── city-search.ts          # 城市搜索：打分排序
    ├── cities.json             # 城市数据（3563 条，脚本生成）
    ├── life-tips.ts            # 生活提醒规则引擎（纯函数）
    └── life-tips.data.ts       # 国标阈值常量（与逻辑分离）

scripts/                        # 数据生成与检查（非运行时依赖）
├── build-cities.mjs            # 从 AreaCity CSV 生成 cities.json
├── fill-coords.mjs             # 批量补齐经纬度（断点续传）
├── fix-coords.mjs              # 修正异常坐标
├── patch-missing-coords.mjs    # 补齐 geocoding 认不出的地名
├── cleanup-coords.mjs          # 最终清洗
├── audit-coords.mjs            # 坐标质量审计
├── test-search.mjs             # 搜索验收（node 直跑）
├── verify-life-tips-boundary.mjs  # 生活提醒 24 用例（tsx 跑真源码）
├── check-data-health.mjs       # 数据健康检查
└── check-font-weights.mjs      # 字重 vs 实际加载一致性
```

## 城市数据

覆盖 **3563 个**中国城市与区县（391 个地级市 + 3172 个区县），全部含经纬度，id 零重复。

数据是**离线生成后提交进仓库的静态 JSON**，运行时零依赖 —— 不装任何城市数据 npm 包。

### 为什么这么做

调研发现，**没有任何 npm 包同时提供「城市名 + 拼音 + 经纬度」**：

| 类型 | 代表包 | 缺什么 |
|---|---|---|
| 行政区划包 | `cn-division`、`china-area-data` | 无经纬度、无拼音 |
| 拼音库 | `pinyin-pro` | 只有转换能力，无城市数据 |

而且 `china-division` 解压后 **190MB**，装进项目会拖垮构建。

### 生成与检查

```bash
# 生成（读取 scripts/raw-areacity.csv）
node scripts/build-cities.mjs
node scripts/fill-coords.mjs        # 约 7 分钟，断点续传
node scripts/fix-coords.mjs
node scripts/patch-missing-coords.mjs
node scripts/cleanup-coords.mjs

# 检查（改完代码或数据后跑）
npx tsx scripts/verify-life-tips-boundary.mjs   # 生活提醒 24 用例
npx tsx scripts/check-data-health.mjs           # 数据健康
node scripts/check-font-weights.mjs             # 字重一致性
node scripts/test-search.mjs                    # 搜索用例
```

### 数据源里踩过的坑

这些都是**实际验证发现的**，不是猜测：

1. **`pinyin_prefix` 字段名骗人** —— 它是「首字母」(`b`) 不是「简拼」(`bj`)。直接拿来做 `bj → 北京` 会完全失效，必须从 `pinyin` 字段自己拆算。
2. **重庆被拆成「重庆城区」+「重庆郊县」** —— 没有单独的「重庆」记录。不特殊处理的话用户搜「重庆」搜不到。
3. **geocoding API 是全球搜索** —— 「黑山」（辽宁锦州的一个区）会匹配到黑山共和国（欧洲），「张家口」会匹配到四川南充。必须做中国范围校验。
4. **通用地名会匹配错** —— 「城区」「郊区」这类名字在很多城市都有，geocoding 大概率给错。

## 数据流

```
服务端                              客户端
─────────────────────────          ─────────────────────────
getDefaultCity() → 北京             搜索并选择城市
      ↓                                 ↓
fetchWeather(city)                  fetch('/api/weather?lat=..&lon=..')
      ↓                                 ↓
<WeatherDashboard                   更新 state → 动效重放
   initialData={...} />
```

- **首屏**：在服务端取数，直接渲染，无加载闪烁
- **切换城市**：客户端按坐标请求 API，已取过的城市走本地缓存
- **生活提醒**：`buildLifeTips(data)` 纯函数计算，无持久化

## API

### `GET /api/weather`

| 参数 | 说明 |
|---|---|
| `lat` + `lon` + `name` | **主路径**：按坐标查询（搜索选中的城市走这条） |
| （无参数） | 默认北京（与首页首屏同一套城市体系） |

坐标参数会做 `Number.isFinite` 与范围校验（lat ∈ [-90,90]，lon ∈ [-180,180]），非法返回 400。

**响应示例**（截取）

```json
{
  "city": { "id": "1101", "name": "北京", "latitude": 39.9075, "longitude": 116.3972 },
  "current": {
    "temperature": 17.6, "apparentTemperature": 15.4,
    "humidity": 54, "windSpeed": 11.8, "windDirection": 350,
    "weatherCode": 0, "isDay": true, "pressure": 1015,
    "precipitation": 0.0, "uvIndex": 0, "visibility": 14840
  },
  "hourly": [ "24 条：time, hourLabel, temperature, apparentTemperature, humidity, precipitationProbability, windSpeed, uvIndex" ],
  "daily":  [ "7 条：date, weekday, weatherCode, tempMax, tempMin, precipitationProbability, uvIndexMax, sunrise, sunset" ],
  "fetchedAt": "2026-10-13T00:09:00.000Z"
}
```

## 开发笔记

### 测试要测真源码，不是副本

项目里最早的 `test-life-tips.mjs` 把阈值**抄写**了一份再测 —— 源码改了它也不知道，等于没测。这个 bug 是做代码审查时发现的。

正确做法是用 `tsx` 直接 import TS 源码（见 `scripts/verify-life-tips-boundary.mjs`），测的才是真实逻辑。

### 字重必须与实际加载一致

`layout.tsx` 只加载了 Inter 的 **200-600**。如果代码里用了 `font-bold`(700)，浏览器会**伪合成粗体**，中文会发虚 —— 且类型检查、生产构建都发现不了。

`scripts/check-font-weights.mjs` 专门核对这件事。另外：中文标题**不要用负字距**（`tracking-tight` 只适合数字/西文）。

### 浅色主题的两个陷阱

1. **不要用阴影补层次** —— 白卡浮在 `#f5f5f7` 上，2% 亮度差本身就是层级。深色玻璃拟态迁移浅色时，本能加阴影是最大错误。
2. **强调色必须重新实测对比度** —— 深色版的亮蓝 `#60a5fa` 在白底只有 2.54:1（不达标）。浅色必须换深一档，且 11px 小字要用 `#0066cc`（`#0071e3` 只有 4.70:1）。

### Next.js 16 的几个坑

- **`cacheComponents: true`**：未缓存的 `fetch` **必须**包在 `<Suspense>` 里，否则报 `blocking-route` 错误
- **`fetch` 默认不缓存**：想要每次最新数据，什么都不用加
- **`error.tsx` 必须是客户端组件**，props 是 `{ error, retry }`，用 `retry()` 而不是 `reset()`
- **`middleware.ts` 已改名 `proxy.ts`**；**`next lint` 已移除**

### Framer Motion 的包名陷阱

官方文档示例写 `import { motion } from "motion/react"`，但那是 **`motion` 包**的子路径。本项目装的是 **`framer-motion`**，正确写法：

```tsx
import { motion, AnimatePresence } from "framer-motion";
```

### Recharts 的两个坑

1. **Y 轴默认从 0 起**（源码 `defaultNumericDomain = [0, 'auto']`）。温度图必须显式设 `domain={["dataMin - 2", "dataMax + 2"]}`，否则 16~23°C 的曲线会被压扁在顶部。降水概率图**不需要** —— 百分比从 0 起才对。
2. **`stroke` 只管轴线，不管刻度文字** —— 浅色下必须额外传 `tick={{ fill: "#86868b" }}`，否则刻度还是默认深灰。

### 数字滚动的性能考虑

`CountUp` 用 `useMotionValue` + `motion.span` 直接渲染 MotionValue：**动画每一帧都不触发 React 重渲染**。如果用 `useState` 每帧 `setState`，一页十几处数字滚动会造成大量无谓渲染。

---

## 工程实践

这个项目里有一些**踩过坑之后固化下来的做法**，比功能本身更值得参考。

### 自动化验证

```bash
npm run typecheck   # 类型检查
npm test            # 4 个测试套件
npm run build       # 生产构建
npm run verify      # 以上三步（本地模拟 CI）
```

`.github/workflows/ci.yml` 在每次 push/PR 时自动跑这三步。

### 测试要测真源码，不是副本

最早的生活提醒测试脚本是**把阈值抄一份**再测 —— 源码改了它照样绿。这叫「假测试」，比没测试更危险。

现在统一用 `tsx` 直接 import TS 源码：

```bash
npx tsx scripts/verify-life-tips-boundary.mjs   # 38 条用例，测真源码
```

**这条原则后来真的抓到了 bug**：穿衣/运动档位的边界值 `<` 应该写成 `<=`（体感正好 5℃ 会跳到下一档）。

### 删掉不成立的功能，而不是留着充数

曾经做过「省名搜索」—— 搜「浙江」「台湾」时返回该省城市列表。

实测 21 个用例，**11 个失效**：

| 输入 | 期望 | 实际 |
|---|---|---|
| `zj` | 浙江 | 湛江、镇江、昭觉 |
| `hn` | 湖南 | 海南、淮南、黄南 |
| `tw` | 台湾 | 泰武、汤旺、田尾 |

根因是简拼总能匹配到真实地名，兜底逻辑永远不会触发。更糟的是**测试把这个 bug 写成了正确行为**（「`tw` 命中真实城市而非兜底」✅）。

**最后选择删除而不是修** —— 修复成本高于价值，而一个谎称能用的功能比没有更糟。

完整决策记录见 [`docs/技术决策记录.md`](docs/技术决策记录.md)。

### 调研先于编码

很多坑不查文档绝对想不到：

| 坑 | 不查的后果 |
|---|---|
| `framer-motion` 的子路径**没有** `./react`（那是另一个包 `motion` 的） | 直接构建失败 |
| Next.js 16 的 `cacheComponents: true` 要求未缓存 fetch 必须包 `<Suspense>` | 报 `blocking-route` |
| Recharts Y 轴默认从 0 起 | 温度曲线被压扁在顶部 |
| `pinyin_prefix` 字段是「首字母」不是「简拼」 | 简拼搜索完全失效 |
| 深色版的亮蓝 `#60a5fa` 在白底只有 2.54:1 对比度 | 浅色版文字不达标 |

调研产出（都在 `docs/`）：
- [`生活提醒-竞品调研与设计方案.md`](docs/生活提醒-竞品调研与设计方案.md) —— 含国标阈值、7 家竞品对比、反面案例
- [`apple-light-design-research.md`](docs/apple-light-design-research.md) —— 含 apple.com 线上实测色值、SF Pro 授权条款、字体方案

## License

MIT
