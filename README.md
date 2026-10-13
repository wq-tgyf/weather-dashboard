# 全球天气看板 · Weather Dashboard

一个基于 **Next.js 16** 的实时天气数据看板：全国 3563 个城市/区县搜索、实时天气可视化、基于国标的生活提醒。

数据来源为 [Open-Meteo](https://open-meteo.com/) 开放 API —— 完全免费、无需注册、无需 API Key。

**线上地址**：https://weather-dashboard-pied-alpha.vercel.app

---

## 功能

- **城市搜索**：支持中文名、拼音、简拼、别名，覆盖 3563 个城市与区县
  - `杭州` / `hangzhou` / `hz` / `北` 都能搜到
  - 重名城市用「省 · 市」标注消歧义（如搜「西湖」会区分杭州/南昌/苗栗）
  - 键盘操作：`/` 聚焦、`↑↓` 选择、`Enter` 确认、`Esc` 关闭
- **实时天气**：温度、体感温度、天气状况、湿度、风速风向、气压、降水量
- **24 小时趋势**：温度变化曲线图 + 降水概率柱状图
- **7 天预报**：每日天气、最高/最低温、降水概率、日出日落时间
- **生活提醒**：带伞、穿衣、紫外线、运动、感冒温差，共 5 项
  - 穿衣依据气象行业标准 **QX/T 385—2017**，紫外线依据国标 **GB/T 36744—2018**，文案逐字抄录
  - 顶部横幅始终有内容（兜底策略），网格最多 5 条，点击展开完整建议与依据来源
  - 无事不扰：没雨不提示带伞、紫外线最弱不提示防晒
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
| `city` | 兼容旧路径：固定城市 id（`beijing` 等） |
| （无参数） | 默认北京 |

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

## License

MIT
