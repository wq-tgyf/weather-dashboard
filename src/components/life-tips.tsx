"use client";

/**
 * 顶部提醒横幅 + 生活提醒网格
 *
 * 设计依据（来自竞品调研）：
 *   - 顶部横幅固定 1 条，始终有内容（Apple Weather 的做法）
 *   - 网格区最多 5 条，图标 + 短句，点击展开完整建议
 *   - 不给用户看等级数字，直接给「图标 + 短句」
 *   - 文案：安全类命令式，生活类陈述式
 *   - 不用弹窗（看板场景弹窗打断感强），用展开
 */

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

import type { LifeTip } from "@/lib/life-tips";

const spring = { type: "spring" as const, stiffness: 300, damping: 28 };

/**
 * 按严重程度决定配色（苹果风浅色版）
 *
 * 用「-50 档底色 + -700 档文字」的组合，对比度全部 ≥4.5 达 WCAG AA。
 * 注意：不能沿用深色版的 /10 半透明底，浅色下会糊。
 */
const SEVERITY_STYLE = {
  warning: {
    bg: "bg-[#fff4e5]",
    text: "text-[#a05a00]",
    border: "border-[#ffd699]",
  },
  advice: {
    bg: "bg-[#e8f5e9]",
    text: "text-[#1d7a3e]",
    border: "border-[#a5d6a7]",
  },
  info: {
    bg: "bg-[#e8f2fd]",
    text: "text-[#0066cc]",
    border: "border-[#b3d7ff]",
  },
} as const;

/* ------------------------------------------------------------------ */
/* 顶部横幅                                                            */
/* ------------------------------------------------------------------ */

export function LifeTipBanner({ tip }: { tip: LifeTip }) {
  const style = SEVERITY_STYLE[tip.severity];

  return (
    <motion.div
      className={`mb-6 flex items-center gap-3 rounded-[11px] border px-4 py-3 ${style.bg} ${style.border}`}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
    >
      <span className="text-xl leading-none" aria-hidden>
        {tip.icon}
      </span>
      <span className={`text-[15px] font-medium ${style.text}`}>{tip.title}</span>
      {tip.source && (
        <span className="ml-auto hidden text-[11px] font-normal text-ink-tertiary sm:inline">
          {tip.source}
        </span>
      )}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* 提醒网格                                                            */
/* ------------------------------------------------------------------ */

function TipCard({ tip, index }: { tip: LifeTip; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const style = SEVERITY_STYLE[tip.severity];

  return (
    <motion.div
      layout
      className={`cursor-pointer rounded-[11px] border p-4 transition-shadow ${style.bg} ${style.border} hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)]`}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      whileHover={{ y: -2 }}
      transition={{ ...spring, delay: index * 0.05 }}
      onClick={() => setExpanded((e) => !e)}
    >
      <div className="flex items-start gap-3">
        <span className="text-xl leading-none" aria-hidden>
          {tip.icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className={`text-[15px] font-medium ${style.text}`}>{tip.title}</p>

          <AnimatePresence initial={false}>
            {expanded && (
              <motion.p
                className="mt-2 text-xs font-normal leading-relaxed text-ink-secondary"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                {tip.detail}
                {tip.source && (
                  <span className="mt-1 block text-[10px] text-ink-tertiary">
                    依据：{tip.source}
                  </span>
                )}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <ChevronDown
          className={`size-4 shrink-0 text-ink-tertiary transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </div>
    </motion.div>
  );
}

export function LifeTipGrid({ tips }: { tips: LifeTip[] }) {
  if (tips.length === 0) return null;

  return (
    <div className="mb-10">
      <motion.h2
        className="mb-4 text-[1.3125rem] font-semibold leading-snug text-ink"
        initial={{ opacity: 0, x: -12 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ duration: 0.45 }}
      >
        生活提醒
      </motion.h2>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tips.map((tip, i) => (
          <TipCard key={tip.id} tip={tip} index={i} />
        ))}
      </div>
    </div>
  );
}
