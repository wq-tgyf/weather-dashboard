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

import { useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionTemplate,
  useMotionValue,
} from "framer-motion";
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
import {
  CITIES,
  describeWeather,
  windDirectionLabel,
  type City,
  type WeatherData,
} from "@/lib/weather";

/* ---------------------------------- 动效预设 --------------------------------- */

const spring = { type: "spring" as const, stiffness: 260, damping: 26 };

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
};

/* ---------------------------------- 小组件 ---------------------------------- */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <motion.h2
      className="mb-4 text-sm font-medium tracking-wide text-muted-foreground"
      initial={{ opacity: 0, x: -12 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, amount: 0.6 }}
      transition={{ duration: 0.45 }}
    >
      {children}
    </motion.h2>
  );
}

/** 玻璃质感卡片 */
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
      className={`rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl ${className}`}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      whileHover={{ y: -6, scale: 1.015 }}
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
      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white/80">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold tabular-nums text-white">
          <CountUp value={value} suffix={suffix} decimals={decimals} />
        </p>
      </div>
    </GlassCard>
  );
}

/* ---------------------------------- 主组件 ---------------------------------- */

export function WeatherDashboard({
  initialData,
}: {
  initialData: WeatherData;
}) {
  const [selected, setSelected] = useState<City>(initialData.city);
  const [cache, setCache] = useState<Record<string, WeatherData>>({
    [initialData.city.id]: initialData,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 鼠标跟随光晕
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const glow = useMotionTemplate`radial-gradient(520px circle at ${mouseX}px ${mouseY}px, rgba(96,165,250,0.18), transparent 70%)`;
  const containerRef = useRef<HTMLDivElement>(null);

  const data = cache[selected.id] ?? initialData;

  async function selectCity(city: City) {
    if (city.id === selected.id) return;
    setSelected(city);
    setError(null);

    if (cache[city.id]) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/weather?city=${city.id}`);
      if (!res.ok) throw new Error(`请求失败（${res.status}）`);
      const json: WeatherData = await res.json();
      setCache((prev) => ({ ...prev, [city.id]: json }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "未知错误");
    } finally {
      setLoading(false);
    }
  }

  const currentDesc = describeWeather(data.current.weatherCode);
  const today = data.daily[0];

  return (
    <div
      ref={containerRef}
      onMouseMove={(e) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        mouseX.set(e.clientX - rect.left);
        mouseY.set(e.clientY - rect.top);
      }}
      className="relative min-h-screen overflow-hidden bg-[#070b14] text-white"
    >
      {/* 背景光晕层 */}
      <motion.div
        className="pointer-events-none absolute inset-0"
        style={{ background: glow }}
      />
      {/* 顶部渐变色带 */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-blue-500/10 to-transparent" />

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
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                全球天气看板
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
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

        {/* 城市切换 */}
        <motion.div
          className="mb-8 flex flex-wrap gap-2"
          initial="hidden"
          animate="visible"
          variants={{
            visible: { transition: { staggerChildren: 0.05 } },
          }}
        >
          {CITIES.map((city) => {
            const active = city.id === selected.id;
            return (
              <motion.button
                key={city.id}
                onClick={() => selectCity(city)}
                variants={{
                  hidden: { opacity: 0, y: 10 },
                  visible: { opacity: 1, y: 0 },
                }}
                whileHover={{ scale: 1.06, y: -2 }}
                whileTap={{ scale: 0.96 }}
                transition={spring}
                className={`relative rounded-full px-4 py-1.5 text-sm transition-colors ${
                  active
                    ? "text-white"
                    : "text-white/60 hover:text-white/90"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="city-pill"
                    className="absolute inset-0 rounded-full bg-blue-500/25 ring-1 ring-blue-400/40"
                    transition={spring}
                  />
                )}
                <span className="relative">{city.name}</span>
              </motion.button>
            );
          })}
        </motion.div>

        {error && (
          <motion.p
            className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
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
            {/* 当前天气主卡 */}
            <GlassCard className="mb-6 overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-8">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {data.city.name} · {data.city.country}
                  </p>
                  <div className="mt-2 flex items-end gap-4">
                    <span className="text-6xl font-bold tabular-nums leading-none sm:text-7xl">
                      <CountUp value={data.current.temperature} decimals={1} />
                    </span>
                    <span className="pb-2 text-2xl text-white/60">°C</span>
                  </div>
                  <p className="mt-3 text-base text-white/80">
                    {currentDesc.label}
                    <span className="ml-3 text-sm text-muted-foreground">
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
                  className="text-blue-300"
                  initial={{ scale: 0.6, opacity: 0, rotate: -20 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  transition={{ ...spring, delay: 0.15 }}
                >
                  <WeatherIcon name={currentDesc.icon} className="size-28" />
                </motion.div>
              </div>

              {today && (
                <div className="mt-6 flex flex-wrap gap-x-8 gap-y-3 border-t border-white/10 pt-5 text-sm">
                  <span className="flex items-center gap-2 text-white/70">
                    <Sunrise className="size-4 text-amber-300" />
                    日出 {today.sunrise}
                  </span>
                  <span className="flex items-center gap-2 text-white/70">
                    <Sunset className="size-4 text-orange-300" />
                    日落 {today.sunset}
                  </span>
                  <span className="text-white/70">
                    最高{" "}
                    <CountUp value={today.tempMax} decimals={0} suffix="°" />
                    {" / "}
                    最低{" "}
                    <CountUp value={today.tempMin} decimals={0} suffix="°" />
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
                        <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="#60a5fa" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.07)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="hourLabel"
                      stroke="rgba(255,255,255,0.4)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      interval={3}
                    />
                    <YAxis
                      stroke="rgba(255,255,255,0.4)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      unit="°"
                      domain={["dataMin - 2", "dataMax + 2"]}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "rgba(10,15,28,0.92)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                      labelStyle={{ color: "rgba(255,255,255,0.7)" }}
                      formatter={(v) => [`${v}°C`, "温度"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="temperature"
                      stroke="#60a5fa"
                      strokeWidth={2.5}
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
                      stroke="rgba(255,255,255,0.07)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="hourLabel"
                      stroke="rgba(255,255,255,0.4)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      interval={3}
                    />
                    <YAxis
                      stroke="rgba(255,255,255,0.4)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      unit="%"
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(255,255,255,0.05)" }}
                      contentStyle={{
                        background: "rgba(10,15,28,0.92)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                      formatter={(v) => [`${v}%`, "降水概率"]}
                    />
                    <Bar
                      dataKey="precipitationProbability"
                      fill="#38bdf8"
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
                    <p className="text-xs text-muted-foreground">
                      {i === 0 ? "今天" : day.weekday}
                    </p>
                    <p className="mt-0.5 text-[11px] text-white/40">
                      {day.dateLabel}
                    </p>
                    <motion.div
                      className="my-3 flex justify-center text-blue-300"
                      initial={{ scale: 0.7, opacity: 0 }}
                      whileInView={{ scale: 1, opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ ...spring, delay: 0.1 + i * 0.04 }}
                    >
                      <WeatherIcon name={desc.icon} className="size-8" />
                    </motion.div>
                    <p className="text-xs text-white/60">{desc.label}</p>
                    <p className="mt-2 text-sm font-semibold tabular-nums">
                      {Math.round(day.tempMax)}°
                      <span className="ml-1 font-normal text-white/40">
                        {Math.round(day.tempMin)}°
                      </span>
                    </p>
                    <p className="mt-1 text-[11px] text-sky-300/80">
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
              className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs backdrop-blur-xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
            >
              正在获取 {selected.name} 的数据…
            </motion.div>
          )}
        </AnimatePresence>

        <motion.footer
          className="mt-16 border-t border-white/10 pt-6 text-center text-xs text-muted-foreground"
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
