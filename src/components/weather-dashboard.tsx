"use client";

/**
 * 天气看板主界面（客户端组件）
 *
 * 动效清单：
 * 1. 数字滚动        —— CountUp（useMotionValue + animate）
 * 2. 卡片 hover 抬起  —— whileHover
 * 3. 滚动进入淡入     —— whileInView + viewport.once
 * 4. 图表动态绘制     —— Recharts 内建动画
 * 5. 城市切换过渡     —— AnimatePresence + layout
 * 6. 鼠标跟随光晕     —— onMouseMove + CSS 变量
 */

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Droplets, Gauge, Sunrise, Sunset, Wind } from "lucide-react";

import { CountUp } from "@/components/count-up";
import { WeatherIcon } from "@/components/weather-icon";
import { CitySearch } from "@/components/city-search";
import { LifeTipBanner, LifeTipGrid } from "@/components/life-tips";
import {
  describeWeather,
  windDirectionLabel,
  type WeatherData,
} from "@/lib/weather";
import { type CityEntry } from "@/lib/city-search";
import { buildLifeTips, pickBannerTip, pickGridTips } from "@/lib/life-tips";

/* ---------------------------------- 动效预设 --------------------------------- */

const spring = { type: "spring" as const, stiffness: 260, damping: 26 };

/* ---------------------------------- 小组件 ---------------------------------- */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <motion.h2
      className="mb-4 text-[1.3125rem] font-semibold leading-snug text-ink"
      initial={{ opacity: 0, x: -12 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, amount: 0.6 }}
      transition={{ duration: 0.45 }}
    >
      {children}
    </motion.h2>
  );
}

/**
 * 卡片
 *
 * 苹果风做法：白卡浮在 #f5f5f7 页面上，靠 2% 亮度差造层次 ——
 * 无边框、无阴影。阴影只留给 hover 态。
 *
 * 注意：不要用阴影"补层次"，这是深色玻璃拟态迁移到浅色时最容易做砸的地方。
 */
function GlassCard({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={`rounded-[11px] bg-white p-5 transition-shadow duration-300 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] ${className}`}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      whileHover={{ y: -2 }}
      transition={{ ...spring, delay }}
    >
      {children}
    </motion.div>
  );
}

/** 指标小卡（带数字滚动） */
function MetricCard({
  icon,
  label,
  value,
  suffix,
  decimals = 0,
  delay = 0,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  suffix?: string;
  decimals?: number;
  delay?: number;
}) {
  return (
    <GlassCard className="flex items-center gap-4" delay={delay}>
      <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent-tint text-accent">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-ink-secondary">{label}</p>
        <p className="mt-0.5 text-[1.75rem] font-light leading-none tabular-nums text-ink">
          <CountUp value={value} suffix={suffix} decimals={decimals} />
        </p>
      </div>
    </GlassCard>
  );
}

/* ---------------------------------- 主组件 ---------------------------------- */

export function WeatherDashboard({
  initialData,
  initialCity,
}: {
  initialData: WeatherData;
  initialCity: CityEntry;
}) {
  const [selected, setSelected] = useState<CityEntry>(initialCity);
  const [cache, setCache] = useState<Record<string, WeatherData>>({
    [initialCity.id]: initialData,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const data = cache[selected.id] ?? initialData;

  async function selectCity(city: CityEntry) {
    if (city.id === selected.id) return;
    setError(null);

    /* 已缓存的直接切换（不发请求） */
    if (cache[city.id]) {
      setSelected(city);
      return;
    }

    /* 记住上一个城市：请求失败要回滚，否则界面会停留在
       "新城市名 + 旧城市数据" 的不一致状态 */
    const previous = selected;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        lat: String(city.latitude),
        lon: String(city.longitude),
        name: city.name,
      });
      const res = await fetch(`/api/weather?${params.toString()}`);
      if (!res.ok) throw new Error(`请求失败（${res.status}）`);
      const json: WeatherData = await res.json();

      /* 成功：写入缓存并切换 */
      setCache((prev) => ({ ...prev, [city.id]: json }));
      setSelected(city);
    } catch (e) {
      /* 失败：回滚到上一个城市，避免数据错乱 */
      setSelected(previous);
      setError(
        `${city.name} 的数据获取失败（${
          e instanceof Error ? e.message : "未知错误"
        }），已回到 ${previous.name}`
      );
    } finally {
      setLoading(false);
    }
  }

  const currentDesc = describeWeather(data.current.weatherCode);
  const today = data.daily[0];

  /* 生活提醒：纯函数计算，无持久化 */
  const lifeTips = buildLifeTips(data);
  const bannerTip = pickBannerTip(lifeTips);
  const gridTips = pickGridTips(lifeTips);

  return (
    <div className="relative min-h-screen bg-canvas text-ink">
      <div className="relative mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        {/* 标题 */}
        <motion.header
          className="mb-10"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold sm:text-4xl">
                全国天气看板
              </h1>
              <p className="mt-1.5 text-sm font-normal text-ink-secondary">
                数据来源 Open-Meteo · 实时更新
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              更新于{" "}
              {new Date(data.fetchedAt).toLocaleTimeString("zh-CN", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </motion.header>

        {/* 城市搜索 */}
        <motion.div
          className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <CitySearch current={selected} onSelect={selectCity} loading={loading} />

          {/* 当前城市标签 */}
          <motion.div
            key={selected.id}
            className="flex items-center gap-2 text-sm"
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={spring}
          >
            <span className="text-ink-tertiary">当前</span>
            <span className="rounded-full bg-accent-tint px-3 py-1 text-[15px] font-medium text-accent-strong">
              {selected.name}
            </span>
            {selected.region && (
              <span className="hidden text-xs text-ink-tertiary sm:inline">
                {selected.region}
              </span>
            )}
          </motion.div>
        </motion.div>

        {error && (
          <motion.p
            className="mb-6 rounded-[11px] border border-[#f5b5b0] bg-[#fdecea] px-4 py-3 text-sm font-medium leading-relaxed text-[#b3261e]"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {error}
          </motion.p>
        )}

        {/* 主内容区：切换城市时淡入淡出 */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selected.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.32, ease: "easeOut" }}
          >
            {/* 顶部提醒横幅：始终有内容（Apple Weather 的做法） */}
            <LifeTipBanner tip={bannerTip} />

            {/* 当前天气主卡 */}
            <GlassCard className="mb-6">
              <div className="flex flex-wrap items-center justify-between gap-8">
                <div>
                  <p className="text-[1.0625rem] font-normal text-ink-secondary">
                    {data.city.name} · {data.city.country}
                  </p>
                  {/* 苹果风：超大 + 极细字重（200）。纯数字可用，中文不可用 200 */}
                  <div className="mt-2 flex items-start gap-1">
                    <span className="text-[4.5rem] font-extralight leading-[0.9] tracking-tight tabular-nums text-ink sm:text-[6rem]">
                      <CountUp value={data.current.temperature} decimals={1} />
                    </span>
                    <span className="mt-2 text-2xl font-light text-ink-secondary">
                      °C
                    </span>
                  </div>
                  <p className="mt-3 text-[1.0625rem] font-normal leading-relaxed text-ink">
                    {currentDesc.label}
                    <span className="ml-3 text-sm font-normal text-ink-secondary">
                      体感{" "}
                      <CountUp
                        value={data.current.apparentTemperature}
                        decimals={1}
                        suffix="°C"
                      />
                    </span>
                  </p>
                </div>

                <motion.div
                  className="text-accent"
                  initial={{ scale: 0.75, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ ...spring, delay: 0.15 }}
                >
                  <WeatherIcon name={currentDesc.icon} className="size-28" />
                </motion.div>
              </div>

              {today && (
                <div className="mt-6 flex flex-wrap gap-x-8 gap-y-3 border-t border-separator pt-5 text-sm">
                  <span className="flex items-center gap-2 text-ink-secondary">
                    <Sunrise className="size-4 text-amber-600" />
                    日出 {today.sunrise}
                  </span>
                  <span className="flex items-center gap-2 text-ink-secondary">
                    <Sunset className="size-4 text-orange-600" />
                    日落 {today.sunset}
                  </span>
                  <span className="text-ink-secondary">
                    最高{" "}
                    <span className="font-medium tabular-nums text-ink">
                      <CountUp value={today.tempMax} decimals={0} suffix="°" />
                    </span>
                    {" / "}
                    最低{" "}
                    <span className="font-medium tabular-nums text-ink">
                      <CountUp value={today.tempMin} decimals={0} suffix="°" />
                    </span>
                  </span>
                </div>
              )}
            </GlassCard>

            {/* 指标格 */}
            <div className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <MetricCard
                icon={<Droplets className="size-5" />}
                label="相对湿度"
                value={data.current.humidity}
                suffix="%"
                delay={0}
              />
              <MetricCard
                icon={<Wind className="size-5" />}
                label={`风速 · ${windDirectionLabel(data.current.windDirection)}风`}
                value={data.current.windSpeed}
                suffix=" km/h"
                decimals={1}
                delay={0.06}
              />
              <MetricCard
                icon={<Gauge className="size-5" />}
                label="气压"
                value={data.current.pressure}
                suffix=" hPa"
                delay={0.12}
              />
              <MetricCard
                icon={<Droplets className="size-5" />}
                label="降水量"
                value={data.current.precipitation}
                suffix=" mm"
                decimals={1}
                delay={0.18}
              />
            </div>

            {/* 生活提醒网格 */}
            <LifeTipGrid tips={gridTips} />

            {/* 温度趋势图 */}
            <SectionTitle>未来 24 小时温度趋势</SectionTitle>
            <GlassCard className="mb-10">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={data.hourly}
                    margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0071e3" stopOpacity={0.28} />
                        <stop offset="60%" stopColor="#0071e3" stopOpacity={0.08} />
                        <stop offset="100%" stopColor="#0071e3" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#d2d2d7"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="hourLabel"
                      stroke="#d2d2d7"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      interval={3}
                      tick={{ fill: "#86868b" }}
                    />
                    <YAxis
                      stroke="#d2d2d7"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      unit="°"
                      domain={["dataMin - 2", "dataMax + 2"]}
                      allowDecimals={false}
                      tick={{ fill: "#86868b" }}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#ffffff",
                        border: "1px solid #d2d2d7",
                        borderRadius: 11,
                        fontSize: 12,
                        boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                      }}
                      labelStyle={{ color: "#6e6e73", fontWeight: 500 }}
                      itemStyle={{ color: "#1d1d1f" }}
                      formatter={(v) => [`${v}°C`, "温度"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="temperature"
                      stroke="#0071e3"
                      strokeWidth={2}
                      fill="url(#tempGrad)"
                      animationDuration={1400}
                      animationEasing="ease-out"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>

            {/* 降水概率 */}
            <SectionTitle>降水概率</SectionTitle>
            <GlassCard className="mb-10">
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.hourly}
                    margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#d2d2d7"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="hourLabel"
                      stroke="#d2d2d7"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      interval={3}
                      tick={{ fill: "#86868b" }}
                    />
                    <YAxis
                      stroke="#d2d2d7"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      unit="%"
                      tick={{ fill: "#86868b" }}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(0,113,227,0.04)" }}
                      contentStyle={{
                        background: "#ffffff",
                        border: "1px solid #d2d2d7",
                        borderRadius: 11,
                        fontSize: 12,
                        boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                      }}
                      labelStyle={{ color: "#6e6e73", fontWeight: 500 }}
                      itemStyle={{ color: "#1d1d1f" }}
                      formatter={(v) => [`${v}%`, "降水概率"]}
                    />
                    <Bar
                      dataKey="precipitationProbability"
                      fill="#0071e3"
                      radius={[4, 4, 0, 0]}
                      animationDuration={1100}
                      animationEasing="ease-out"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>

            {/* 7 天预报 */}
            <SectionTitle>未来 7 天</SectionTitle>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
              {data.daily.map((day, i) => {
                const desc = describeWeather(day.weatherCode);
                return (
                  <GlassCard
                    key={day.date}
                    className="text-center"
                    delay={i * 0.05}
                  >
                    <p className="text-xs font-normal text-ink-secondary">
                      {i === 0 ? "今天" : day.weekday}
                    </p>
                    <p className="mt-0.5 text-[11px] font-normal text-ink-tertiary">
                      {day.dateLabel}
                    </p>
                    <motion.div
                      className="my-3 flex justify-center text-accent"
                      initial={{ scale: 0.7, opacity: 0 }}
                      whileInView={{ scale: 1, opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ ...spring, delay: 0.1 + i * 0.04 }}
                    >
                      <WeatherIcon name={desc.icon} className="size-8" />
                    </motion.div>
                    <p className="text-xs font-normal text-ink-secondary">
                      {desc.label}
                    </p>
                    <p className="mt-2 text-sm font-medium tabular-nums text-ink">
                      {Math.round(day.tempMax)}°
                      <span className="ml-1 font-normal text-ink-tertiary">
                        {Math.round(day.tempMin)}°
                      </span>
                    </p>
                    {/* 11px 小字：用 #0066cc(5.11:1) 而非 #0071e3(4.70:1) */}
                    <p className="mt-1 text-[11px] font-normal text-accent-strong">
                      {day.precipitationProbability}%
                    </p>
                  </GlassCard>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* 加载指示（切城市时） */}
        <AnimatePresence>
          {loading && (
            <motion.div
              className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-white px-4 py-2 text-xs text-ink-secondary shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
            >
              正在获取 {selected.name} 的数据…
            </motion.div>
          )}
        </AnimatePresence>

        <motion.footer
          className="mt-16 border-t border-separator pt-6 text-center text-xs text-ink-secondary"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          数据来源：Open-Meteo 开放 API · 使用 Next.js 16 + Framer Motion 构建
        </motion.footer>
      </div>
    </div>
  );
}
