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

/** 按严重程度决定配色 */
const SEVERITY_STYLE = {
  warning: {
    ring: "ring-amber-400/30",
    bg: "bg-amber-500/10",
    text: "text-amber-200",
    icon: "text-amber-300",
  },
  advice: {
    ring: "ring-sky-400/30",
    bg: "bg-sky-500/10",
    text: "text-sky-200",
    icon: "text-sky-300",
  },
  info: {
    ring: "ring-white/10",
    bg: "bg-white/5",
    text: "text-white/70",
    icon: "text-white/50",
  },
} as const;

/* ------------------------------------------------------------------ */
/* 顶部横幅                                                            */
/* ------------------------------------------------------------------ */

export function LifeTipBanner({ tip }: { tip: LifeTip }) {
  const style = SEVERITY_STYLE[tip.severity];

  return (
    <motion.div
      className={`mb-6 flex items-center gap-3 rounded-2xl px-4 py-3 ring-1 backdrop-blur-xl ${style.bg} ${style.ring}`}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
    >
      <span className="text-xl leading-none" aria-hidden>
        {tip.icon}
      </span>
      <span className={`text-sm font-medium ${style.text}`}>{tip.title}</span>
      {tip.source && (
        <span className="ml-auto hidden text-[11px] text-white/25 sm:inline">
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
      className={`cursor-pointer rounded-2xl p-4 ring-1 backdrop-blur-xl transition-colors ${style.bg} ${style.ring} hover:bg-white/10`}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      whileHover={{ y: -4 }}
      transition={{ ...spring, delay: index * 0.05 }}
      onClick={() => setExpanded((e) => !e)}
    >
      <div className="flex items-start gap-3">
        <span className="text-xl leading-none" aria-hidden>
          {tip.icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-medium ${style.text}`}>{tip.title}</p>

          <AnimatePresence initial={false}>
            {expanded && (
              <motion.p
                className="mt-2 text-xs leading-relaxed text-white/50"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                {tip.detail}
                {tip.source && (
                  <span className="mt-1 block text-[10px] text-white/25">
                    依据：{tip.source}
                  </span>
                )}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <ChevronDown
          className={`size-4 shrink-0 text-white/25 transition-transform ${
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
        className="mb-4 text-sm font-medium tracking-wide text-muted-foreground"
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
