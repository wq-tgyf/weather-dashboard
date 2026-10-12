"use client";

/**
 * 数字滚动组件（Count-up）
 *
 * 关键点（来自 Framer Motion v14 调研）：
 * - import 必须来自 "framer-motion"，不能用 "motion/react"（那是另一个包）
 * - 用 useMotionValue + animate() 驱动，动画过程不触发 React 重渲染
 * - motion.span 可以直接把 MotionValue 作为 children 渲染
 */

import { useEffect, useRef } from "react";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";

type CountUpProps = {
  value: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
  className?: string;
};

export function CountUp({
  value,
  decimals = 0,
  suffix = "",
  prefix = "",
  duration = 1.1,
  className,
}: CountUpProps) {
  const count = useMotionValue(0);
  const hasAnimated = useRef(false);

  // 格式化为固定小数位
  const display = useTransform(() =>
    count.get().toLocaleString("zh-CN", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  );

  useEffect(() => {
    // 只在首次挂载时从 0 滚到目标值；后续数值变化直接跳到新值
    const from = hasAnimated.current ? count.get() : 0;
    hasAnimated.current = true;

    const controls = animate(count, value, {
      duration,
      ease: [0.16, 1, 0.3, 1], // easeOutExpo，收尾很顺
    });

    return () => controls.stop();
  }, [value, count, duration]);

  return (
    <span className={className}>
      {prefix}
      <motion.span>{display}</motion.span>
      {suffix}
    </span>
  );
}
