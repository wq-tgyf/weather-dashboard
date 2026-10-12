"use client";

/**
 * 错误边界
 *
 * Next.js 16 要求：error.tsx 必须是客户端组件。
 * props 为 { error, retry }，其中 retry() 会重新取数（推荐用它而非 reset()）。
 */

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[#070b14] px-6 text-center text-white">
      <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-8 backdrop-blur-xl">
        <h1 className="text-xl font-semibold">天气数据加载失败</h1>
        <p className="mt-2 max-w-md text-sm text-white/70">
          {error.message || "无法连接到天气数据服务，请稍后重试。"}
        </p>
        {error.digest && (
          <p className="mt-2 font-mono text-xs text-white/40">
            错误标识：{error.digest}
          </p>
        )}
        <button
          onClick={() => retry()}
          className="mt-6 rounded-full bg-white/10 px-5 py-2 text-sm transition-colors hover:bg-white/20"
        >
          重新加载
        </button>
      </div>
    </div>
  );
}
