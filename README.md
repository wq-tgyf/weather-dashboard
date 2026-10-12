# 全球天气看板 · Weather Dashboard

一个基于 **Next.js 16** 的实时天气数据看板，支持**全国 3600 个城市/区县**的搜索查询与可视化。

数据来源为 [Open-Meteo](https://open-meteo.com/) 开放 API —— 完全免费、无需注册、无需 API Key。

---

## 功能

- **城市搜索**：支持中文名、拼音、简拼、别名，覆盖 3600 个城市与区县
  - `杭州` / `hangzhou` / `hz` / `北` 都能搜到
  - 重名城市用「省 · 市」标注消歧义（如搜「西湖」会区分杭州/南昌/苗栗）
  - 键盘操作：`/` 聚焦、`↑↓` 选择、`Enter` 确认、`Esc` 关闭
- **实时天气**：温度、体感温度、天气状况、湿度、风速风向、气压、降水量
- **24 小时趋势**：温度变化曲线图 + 降水概率柱状图
- **7 天预报**：每日天气、最高/最低温、降水概率、日出日落时间
- **城市缓存**：已查询过的城市不重复请求

## 技术栈

| 层面 | 选择 |
|---|---|
| 框架 | Next.js 16.4（App Router + Turbopack） |
| 语言 | TypeScript 5 |
| UI 库 | React 19.3 |
| 样式 | Tailwind CSS v4 |
| 动效 | Framer Motion 14 |
| 图表 | Recharts 3 |
| 图标 | lucide-react |
| 组件 | shadcn/ui |
| 天气数据 | Open-Meteo Forecast API |
| 城市数据 | [AreaCity](https://github.com/xiangyuecn/AreaCity-JsSpider-StatsGov) + Open-Meteo Geocoding |

## 动效设计

界面上实现了这些交互动效：

1. **数字滚动** —— 所有数值指标从 0 滚动到目标值（`useMotionValue` + `animate`，动画过程不触发 React 重渲染）
2. **卡片悬浮** —— 鼠标悬停时卡片上浮并轻微放大（`whileHover`）
3. **滚动淡入** —— 内容随滚动进入视口时淡入上移（`whileInView` + `viewport.once`）
4. **图表动态绘制** —— 图表数据以动画方式生长
5. **城市切换过渡** —— 切换时内容淡出淡入（`AnimatePresence`）
6. **选中指示器滑动** —— 城市按钮的选中背景平滑移动（`layoutId`）
7. **鼠标跟随光晕** —— 背景光晕跟随鼠标位置（`useMotionTemplate`）

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
│   ├── layout.tsx              # 根布局（字体、元数据）
│   ├── page.tsx                # 首页（服务端组件 + Suspense）
│   ├── error.tsx               # 错误边界（客户端组件）
│   └── api/
│       └── weather/route.ts    # 天气数据接口（支持按坐标查询）
├── components/
│   ├── weather-dashboard.tsx   # 看板主界面（客户端组件，动效集中地）
│   ├── city-search.tsx         # 城市搜索框（键盘操作 + 消歧义）
│   ├── count-up.tsx            # 数字滚动组件
│   ├── weather-icon.tsx        # SVG 天气图标
│   └── dashboard-skeleton.tsx  # 骨架屏
└── lib/
    ├── weather.ts              # 天气数据层：类型定义 + API 调用
    ├── city-search.ts          # 城市搜索：打分排序算法
    ├── cities.json             # 城市数据（3600 条，由脚本生成）
    └── utils.ts                # 工具函数

scripts/                        # 数据生成脚本（一次性运行，非运行时依赖）
├── build-cities.mjs            # 从 AreaCity CSV 生成 cities.json
├── fill-coords.mjs             # 批量补齐经纬度（断点续传）
├── fix-coords.mjs              # 修正异常坐标
├── patch-missing-coords.mjs    # 补齐 geocoding 认不出的地名
├── cleanup-coords.mjs          # 最终清洗
├── audit-coords.mjs            # 坐标质量审计
└── test-search.mjs             # 搜索功能验收测试
```

## 城市数据

覆盖 **3600 个**中国城市与区县（391 个地级市 + 3209 个区县），全部含经纬度。

数据是**离线生成后提交进仓库的静态 JSON**，运行时零依赖 —— 不装任何城市数据 npm 包。

### 为什么这么做

调研发现，**没有任何 npm 包同时提供「城市名 + 拼音 + 经纬度」**：

| 类型 | 代表包 | 缺什么 |
|---|---|---|
| 行政区划包 | `cn-division`、`china-area-data` | 无经纬度、无拼音 |
| 拼音库 | `pinyin-pro` | 只有转换能力，无城市数据 |

而且 `china-division` 解压后 **190MB**，装进项目会拖垮构建。

### 生成方式

```bash
# 1. 生成城市数据（读取 scripts/raw-areacity.csv）
node scripts/build-cities.mjs

# 2. 批量补齐经纬度（约 7 分钟，支持断点续传）
node scripts/fill-coords.mjs

# 3. 修正异常坐标 + 补齐缺失
node scripts/fix-coords.mjs
node scripts/patch-missing-coords.mjs
node scripts/cleanup-coords.mjs

# 4. 质量审计
node scripts/audit-coords.mjs

# 5. 搜索功能验收
node scripts/test-search.mjs
```

### 数据源里踩过的坑

这些都是**实际验证发现的**，不是猜测：

1. **`pinyin_prefix` 字段名骗人** —— 它是「首字母」(`b`) 不是「简拼」(`bj`)。直接拿来做 `bj → 北京` 会完全失效，必须从 `pinyin` 字段自己拆算。
2. **重庆被拆成「重庆城区」+「重庆郊县」** —— 没有单独的「重庆」记录。不特殊处理的话用户搜「重庆」搜不到。
3. **geocoding API 是全球搜索** —— 「黑山」（辽宁锦州的一个区）会匹配到黑山共和国（欧洲），「张家口」会匹配到四川南充。必须做中国范围校验。
4. **通用地名会匹配错** —— 「城区」「郊区」这类名字在很多城市都有，geocoding 大概率给错。

## 数据流

```
服务端                          客户端
─────────────────────────       ─────────────────────────
fetchWeather(北京)               点击城市按钮
      ↓                              ↓
<WeatherDashboard                fetch('/api/weather?city=xxx')
   initialData={...} />              ↓
                                更新 state → 动效重放
```

- **首屏**：在服务端取数，直接渲染，无加载闪烁
- **切换城市**：客户端按需请求 API，已取过的城市走本地缓存

## API

### `GET /api/weather?city={cityId}`

返回指定城市的完整天气数据。

**参数**

| 参数 | 类型 | 说明 |
|---|---|---|
| `city` | string | 城市 ID，如 `beijing`、`tokyo`。默认 `beijing` |

**可用城市 ID**：`beijing` `shanghai` `guangzhou` `chengdu` `tokyo` `london` `newyork` `sydney`

**响应示例**（截取）

```json
{
  "city": {
    "id": "beijing",
    "name": "北京",
    "country": "中国",
    "latitude": 39.9042,
    "longitude": 116.4074,
    "timezone": "Asia/Shanghai"
  },
  "current": {
    "temperature": 19.0,
    "apparentTemperature": 19.4,
    "humidity": 70,
    "windSpeed": 4.4,
    "windDirection": 180,
    "weatherCode": 3,
    "isDay": true,
    "pressure": 1013,
    "precipitation": 0.0
  },
  "hourly": [ "24 条：time, hourLabel, temperature, humidity, ..." ],
  "daily":  [ "7 条：date, weekday, weatherCode, tempMax, tempMin, ..." ],
  "fetchedAt": "2025-10-12T10:25:31.000Z"
}
```

## 开发笔记

### Next.js 16 的几个坑

这个项目用的是 Next.js 16.4，与旧版本有一些破坏性差异：

- **`cacheComponents: true`**：项目开启了 Cache Components 模型，未缓存的 `fetch` **必须**包在 `<Suspense>` 里，否则会报 `blocking-route` 错误
- **`fetch` 默认不缓存**：v15 起默认就是不缓存，缓存需要显式 opt-in。想要每次都是最新数据，什么都不用加
- **`error.tsx` 必须是客户端组件**，props 是 `{ error, retry }`，用 `retry()` 而不是 `reset()`
- **`middleware.ts` 已改名 `proxy.ts`**（本项目未用到）
- **`next lint` 命令已移除**，改用 ESLint CLI

### Framer Motion 的包名陷阱

官方文档的示例都写 `import { motion } from "motion/react"`，但那是 **`motion` 包**的子路径。

本项目安装的是 **`framer-motion`**，它的子路径里**没有** `./react`，所以正确写法是：

```tsx
// 客户端组件
import { motion, AnimatePresence } from "framer-motion";

// 服务端组件（无需 'use client'）
import * as motion from "framer-motion/client";
```

### Recharts Y 轴的默认范围

Recharts 的 Y 轴**默认下限是 0**（源码 `defaultNumericDomain = [0, 'auto']`）。

这对温度图是错的 —— 如果一天温度在 16~23°C，Y 轴从 0 起会把曲线压扁在图表顶部。所以温度图显式设置了：

```tsx
<YAxis domain={["dataMin - 2", "dataMax + 2"]} allowDecimals={false} />
```

而**降水概率图不需要这个** —— 百分比从 0 开始才是正确的。

### 数字滚动的性能考虑

`CountUp` 组件用 `useMotionValue` 存储数值，通过 `motion.span` 直接渲染 MotionValue。

这样做的关键好处：**动画的每一帧都不触发 React 重渲染**，动画由 Framer Motion 在 DOM 层直接更新。如果用 `useState` 每帧 `setState`，会造成大量无谓的渲染。

## License

MIT
