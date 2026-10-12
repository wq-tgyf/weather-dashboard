/**
 * 骨架屏
 *
 * 两处使用：
 * 1. page.tsx 的 <Suspense fallback>（服务端取数期间）
 * 2. 可作为参考的加载态样式
 *
 * 用 animate-pulse 做呼吸效果，与最终界面的布局保持一致，
 * 避免数据到达时发生布局跳动（CLS）。
 */

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-[#070b14] text-white">
      <div className="mx-auto max-w-6xl animate-pulse px-5 py-10 sm:px-8 sm:py-14">
        {/* 标题 */}
        <div className="mb-10">
          <div className="h-9 w-56 rounded-lg bg-white/10" />
          <div className="mt-3 h-4 w-40 rounded bg-white/5" />
        </div>

        {/* 城市按钮 */}
        <div className="mb-8 flex flex-wrap gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-8 w-20 rounded-full bg-white/5" />
          ))}
        </div>

        {/* 主卡 */}
        <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center justify-between gap-8">
            <div className="flex-1">
              <div className="h-4 w-32 rounded bg-white/10" />
              <div className="mt-3 h-16 w-48 rounded-lg bg-white/10" />
              <div className="mt-4 h-4 w-40 rounded bg-white/5" />
            </div>
            <div className="size-28 rounded-full bg-white/10" />
          </div>
          <div className="mt-6 flex gap-8 border-t border-white/10 pt-5">
            <div className="h-4 w-24 rounded bg-white/5" />
            <div className="h-4 w-24 rounded bg-white/5" />
            <div className="h-4 w-32 rounded bg-white/5" />
          </div>
        </div>

        {/* 指标格 */}
        <div className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-5"
            >
              <div className="size-11 rounded-xl bg-white/10" />
              <div className="flex-1">
                <div className="h-3 w-16 rounded bg-white/5" />
                <div className="mt-2 h-6 w-20 rounded bg-white/10" />
              </div>
            </div>
          ))}
        </div>

        {/* 图表 */}
        <div className="mb-4 h-4 w-48 rounded bg-white/5" />
        <div className="mb-10 h-64 w-full rounded-2xl border border-white/10 bg-white/5" />

        {/* 7 天 */}
        <div className="mb-4 h-4 w-24 rounded bg-white/5" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="h-40 rounded-2xl border border-white/10 bg-white/5"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
