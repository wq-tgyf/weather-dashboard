/**
 * 骨架屏（苹果风浅色版）
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
    <div className="min-h-screen bg-canvas text-ink">
      <div className="mx-auto max-w-6xl animate-pulse px-5 py-10 sm:px-8 sm:py-14">
        {/* 标题 */}
        <div className="mb-10">
          <div className="h-9 w-56 rounded-lg bg-[#e8e8ed]" />
          <div className="mt-3 h-4 w-40 rounded bg-[#e8e8ed]/70" />
        </div>

        {/* 搜索框 + 当前城市 */}
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="h-11 w-full rounded-full bg-white sm:max-w-md" />
          <div className="h-8 w-40 rounded-full bg-[#e8e8ed]/70" />
        </div>

        {/* 提醒横幅 */}
        <div className="mb-6 h-12 w-full rounded-[11px] bg-[#e8e8ed]/60" />

        {/* 主卡 */}
        <div className="mb-6 rounded-[11px] bg-white p-5">
          <div className="flex items-center justify-between gap-8">
            <div className="flex-1">
              <div className="h-4 w-32 rounded bg-[#e8e8ed]" />
              <div className="mt-3 h-20 w-52 rounded-lg bg-[#e8e8ed]" />
              <div className="mt-4 h-4 w-40 rounded bg-[#e8e8ed]/70" />
            </div>
            <div className="size-28 rounded-full bg-[#e8e8ed]/60" />
          </div>
          <div className="mt-6 flex gap-8 border-t border-separator pt-5">
            <div className="h-4 w-24 rounded bg-[#e8e8ed]/70" />
            <div className="h-4 w-24 rounded bg-[#e8e8ed]/70" />
            <div className="h-4 w-32 rounded bg-[#e8e8ed]/70" />
          </div>
        </div>

        {/* 指标格 */}
        <div className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 rounded-[11px] bg-white p-5"
            >
              <div className="size-11 rounded-full bg-[#e8e8ed]/70" />
              <div className="flex-1">
                <div className="h-3 w-16 rounded bg-[#e8e8ed]/70" />
                <div className="mt-2 h-6 w-20 rounded bg-[#e8e8ed]" />
              </div>
            </div>
          ))}
        </div>

        {/* 生活提醒 */}
        <div className="mb-4 h-6 w-24 rounded bg-[#e8e8ed]" />
        <div className="mb-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 rounded-[11px] bg-[#e8e8ed]/60" />
          ))}
        </div>

        {/* 图表 */}
        <div className="mb-4 h-6 w-48 rounded bg-[#e8e8ed]" />
        <div className="mb-10 h-64 w-full rounded-[11px] bg-white" />

        {/* 7 天 */}
        <div className="mb-4 h-6 w-24 rounded bg-[#e8e8ed]" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-40 rounded-[11px] bg-white" />
          ))}
        </div>
      </div>
    </div>
  );
}
