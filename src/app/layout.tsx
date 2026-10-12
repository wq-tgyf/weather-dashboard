import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

/**
 * 字体方案（苹果风）
 *
 * SF Pro 是苹果私有字体，授权协议 §2B 明确禁止用于 website content，
 * 因此不能自托管 webfont。但系统字体栈（-apple-system）是合法的 ——
 * 它只是调用用户本机已装字体，苹果官网自己也是这么做的。
 *
 * 西文/数字：Inter（可变字重，覆盖 200 到 600；大温度数字需要 200）
 * 中文：一律走系统栈（苹方 → 微软雅黑），绝不加载中文 webfont（单文件 5-20MB）
 *
 * 注意：微软雅黑只有 Regular/Bold，中文的 500/600 是伪合成会发虚，
 * 所以中文层级主要靠字号 + 颜色，字重只做辅助。
 */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  weight: ["200", "300", "400", "500", "600"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "全球天气看板",
  description: "基于 Open-Meteo 实时数据的天气可视化看板",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="zh-CN"
      className={`${inter.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-canvas text-ink">
        {children}
      </body>
    </html>
  );
}
