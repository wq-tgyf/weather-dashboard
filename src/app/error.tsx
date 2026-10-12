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
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-canvas px-6 text-center text-ink">
      <div className="max-w-md rounded-[11px] bg-white p-8">
        <h1 className="text-[1.3125rem] font-semibold leading-snug">
          天气数据加载失败
        </h1>
        <p className="mt-2 text-sm font-normal leading-relaxed text-ink-secondary">
          {error.message || "无法连接到天气数据服务，请稍后重试。"}
        </p>
        {error.digest && (
          <p className="mt-2 font-mono text-xs text-ink-tertiary">
            错误标识：{error.digest}
          </p>
        )}
        <button
          onClick={() => retry()}
          className="mt-6 rounded-full bg-accent px-5 py-2.5 text-[15px] font-normal text-white transition-colors hover:bg-accent-hover"
        >
          重新加载
        </button>
      </div>
    </div>
  );
}
