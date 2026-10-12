"use client";

/**
 * 城市搜索框
 *
 * 交互设计：
 * - 输入即搜（无防抖需求：本地 3462 条数据过滤是微秒级）
 * - 键盘操作：↑↓ 选择，Enter 确认，Esc 关闭
 * - 点击外部关闭
 * - 空输入时展示热门城市
 * - 结果里显示「省 · 市」消歧义（因为有重名城市，如西湖区杭州/南昌都有）
 * - 已选中的城市打勾标记
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, MapPin, Search, X } from "lucide-react";

import { getHotCities, searchCities, type CityEntry } from "@/lib/city-search";

type CitySearchProps = {
  /** 当前选中的城市 */
  current: CityEntry;
  /** 选中某城市 */
  onSelect: (city: CityEntry) => void;
  /** 是否正在加载天气 */
  loading?: boolean;
};

export function CitySearch({ current, onSelect, loading }: CitySearchProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* 搜索结果（本地过滤，无需请求） */
  const results = useMemo(() => {
    if (!query.trim()) return getHotCities();
    return searchCities(query, { limit: 8 });
  }, [query]);

  /* 高亮项归零 */
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  /* 点击外部关闭 */
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  /* 全局快捷键：按 / 聚焦搜索框 */
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "/" && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  function choose(city: CityEntry) {
    onSelect(city);
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const city = results[activeIndex];
      if (city) choose(city);
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  }

  const showEmpty = open && query.trim() !== "" && results.length === 0;

  return (
    <div ref={containerRef} className="relative w-full sm:max-w-md">
      {/* 输入框 */}
      <motion.div
        className="relative flex items-center"
        whileFocus={{ scale: 1.01 }}
      >
        <Search className="pointer-events-none absolute left-3.5 size-4 text-ink-tertiary" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="搜索城市，支持拼音 / 简拼（如 bj、sjz）"
          aria-label="搜索城市"
          className="w-full rounded-full border border-transparent bg-white py-3 pl-11 pr-11 text-[15px] font-normal text-ink placeholder:text-ink-quaternary outline-none transition-all focus:border-accent/30 focus:ring-4 focus:ring-accent/10"
        />

        {/* 清除按钮 / 加载指示 */}
        <div className="absolute right-4 flex items-center gap-1">
          <AnimatePresence>
            {loading && (
              <motion.span
                className="size-3.5 rounded-full border-2 border-separator border-t-accent"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, rotate: 360 }}
                exit={{ opacity: 0 }}
                transition={{
                  rotate: { repeat: Infinity, duration: 0.8, ease: "linear" },
                  opacity: { duration: 0.15 },
                }}
              />
            )}
          </AnimatePresence>

          {query && (
            <button
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              aria-label="清除搜索"
              className="rounded-full p-0.5 text-ink-tertiary transition-colors hover:text-ink"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </motion.div>

      {/* 结果面板 */}
      <AnimatePresence>
        {open && (results.length > 0 || showEmpty) && (
          <motion.div
            className="absolute z-50 mt-2 w-full overflow-hidden rounded-[11px] bg-white shadow-[0_8px_32px_rgba(0,0,0,0.12)]"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
          >
            {!query.trim() && (
              <p className="px-4 pt-3 pb-1 text-[11px] font-normal tracking-wide text-ink-tertiary">
                热门城市
              </p>
            )}

            {showEmpty ? (
              <div className="px-4 py-6 text-center">
                <p className="text-sm font-normal text-ink-secondary">
                  没有找到「{query}」对应的城市
                </p>
                <p className="mt-1 text-xs font-normal text-ink-tertiary">
                  试试输入城市名的拼音，如 hangzhou
                </p>
              </div>
            ) : (
              <ul className="max-h-80 overflow-y-auto py-1">
                {results.map((city, i) => {
                  const isActive = i === activeIndex;
                  const isCurrent = city.id === current.id;
                  return (
                    <li key={`${city.id}-${city.level}-${city.name}`}>
                      <button
                        onMouseEnter={() => setActiveIndex(i)}
                        onClick={() => choose(city)}
                        className={`flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors ${
                          isActive ? "bg-canvas" : "hover:bg-canvas"
                        }`}
                      >
                        <MapPin
                          className={`size-4 shrink-0 ${
                            isActive ? "text-accent" : "text-ink-tertiary"
                          }`}
                        />

                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline gap-2">
                            <span className="truncate text-[15px] font-normal text-ink">
                              {city.name}
                            </span>
                            {city.level === 2 && (
                              <span className="shrink-0 rounded bg-canvas px-1.5 py-0.5 text-[10px] text-ink-secondary">
                                区县
                              </span>
                            )}
                          </span>
                          {city.region && (
                            <span className="mt-0.5 block truncate text-xs font-normal text-ink-secondary">
                              {city.region}
                            </span>
                          )}
                        </span>

                        {isCurrent && (
                          <Check className="size-4 shrink-0 text-accent" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* 底部提示 */}
            <div className="flex items-center gap-3 border-t border-separator px-4 py-2 text-[11px] font-normal text-ink-tertiary">
              <span>↑↓ 选择</span>
              <span>Enter 确认</span>
              <span>Esc 关闭</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
