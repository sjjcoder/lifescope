"use client";

import React, { useState, useEffect, useRef } from "react";

// 格式化完整數字（帶千分位）
export function formatNumber(num: number): string {
  return Math.round(num).toLocaleString("zh-TW");
}

// 把使用者輸入的千分位字串轉回數字：先濾掉逗號等格式字元，保留負號與小數點
function parseFormattedNumber(raw: string): number {
  const cleaned = raw.replace(/,/g, "").trim();
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

// 千分位數字輸入框：編輯中顯示原始數字（方便打字、貼上），失焦/送出才格式化成千分位顯示。
// 用 type="text" + inputMode="decimal"，兼顧手機數字鍵盤與逗號顯示（原生 type="number" 無法顯示逗號）。
function FormattedNumberInput({
  value,
  onCommit,
  className,
  min,
  max,
  ariaLabel,
}: {
  value: number;
  onCommit: (v: number) => void;
  className?: string;
  min?: number;
  max?: number;
  ariaLabel?: string;
}) {
  const [text, setText] = useState(formatNumber(value));
  const editingRef = useRef(false);

  useEffect(() => {
    if (!editingRef.current) setText(formatNumber(value));
  }, [value]);

  const commit = () => {
    editingRef.current = false;
    let n = parseFormattedNumber(text);
    if (min !== undefined && n < min) n = min;
    if (max !== undefined && n > max) n = max;
    setText(formatNumber(n));
    onCommit(n);
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      aria-label={ariaLabel}
      value={text}
      onFocus={() => {
        editingRef.current = true;
        setText(String(parseFormattedNumber(text)));
      }}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          commit();
          (e.target as HTMLInputElement).blur();
        }
      }}
      className={className}
    />
  );
}

// 手風琴/收合區塊的開關軌道視覺（純樣式，不含互動）。互動交給外層 <label> 原生托管的 checkbox，
// 避免「外層 onClick + 內層 checkbox」疊加造成的雙重觸發問題。
export function ToggleTrack({ colorClass = "" }: { colorClass?: string }) {
  return (
    <div
      className={`w-9 h-5 rounded-full bg-[var(--bg-elevated)] peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all after:shadow-sm peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[var(--bg-secondary)] transition-colors relative shrink-0 ${colorClass}`}
      style={{ "--tw-ring-color": "var(--accent-primary)" } as React.CSSProperties}
    />
  );
}

export function SliderInput({
  label,
  value,
  onChange,
  min,
  max,
  step,
  unit,
  id,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  unit: string;
  id: string;
  hint?: string;
}) {
  const [localValue, setLocalValue] = useState(value);
  const [currentMax, setCurrentMax] = useState(max);

  // 當外部傳入的值變動時（例如載入劇本），同步更新局部狀態與最大值上限
  useEffect(() => {
    setLocalValue(value);
    if (value > currentMax) {
      setCurrentMax(Math.ceil(value * 1.5));
    }
  }, [value]);

  // 同步外部的最大值上限變動
  useEffect(() => {
    if (max > currentMax || (max !== currentMax && value <= max)) {
      setCurrentMax(max);
    }
  }, [max]);

  const handleRangeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(Number(e.target.value));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setLocalValue(val);
    if (val > currentMax) {
      setCurrentMax(Math.ceil(val * 1.5));
    }
  };

  const handleRangeCommit = () => {
    onChange(localValue);
  };

  const handleInputBlur = () => {
    let finalVal = localValue;
    if (finalVal < min) finalVal = min;
    if (finalVal > currentMax) {
      setCurrentMax(Math.ceil(finalVal * 1.5));
    }
    setLocalValue(finalVal);
    onChange(finalVal);
  };

  const handleIncrement = () => {
    const newVal = localValue + step;
    if (newVal > currentMax) {
      setCurrentMax(Math.ceil(newVal * 1.5));
    }
    setLocalValue(newVal);
    onChange(newVal);
  };

  const handleDecrement = () => {
    const newVal = Math.max(min, localValue - step);
    setLocalValue(newVal);
    onChange(newVal);
  };

  return (
    <div className="mb-5">
      <div className="flex justify-between items-center mb-1.5">
        <label htmlFor={id} className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          {label}
        </label>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleDecrement}
            aria-label={`減少${label}`}
            className="relative w-6 h-6 flex items-center justify-center rounded-md border transition-all text-xs font-bold select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 before:content-[''] before:absolute before:-inset-2"
            style={{ borderColor: "var(--border-subtle)", background: "var(--bg-secondary)", color: "var(--text-secondary)", "--tw-ring-color": "var(--accent-primary)" } as React.CSSProperties}
          >
            -
          </button>
          <FormattedNumberInput
            value={localValue}
            onCommit={(v) => {
              setLocalValue(v);
              if (v > currentMax) setCurrentMax(Math.ceil(v * 1.5));
              onChange(v < min ? min : v);
            }}
            ariaLabel={label}
            min={min}
            className="input-field text-right !w-28 !py-1 !px-2 text-sm number-display focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
          />
          <button
            type="button"
            onClick={handleIncrement}
            aria-label={`增加${label}`}
            className="relative w-6 h-6 flex items-center justify-center rounded-md border transition-all text-xs font-bold select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 before:content-[''] before:absolute before:-inset-2"
            style={{ borderColor: "var(--border-subtle)", background: "var(--bg-secondary)", color: "var(--text-secondary)", "--tw-ring-color": "var(--accent-primary)" } as React.CSSProperties}
          >
            +
          </button>
          <span className="text-sm ml-1 shrink-0 w-5" style={{ color: "var(--text-secondary)" }}>{unit}</span>
        </div>
      </div>
      <input
        type="range"
        id={id}
        aria-label={label}
        value={localValue}
        onChange={handleRangeChange}
        onMouseUp={handleRangeCommit}
        onTouchEnd={handleRangeCommit}
        min={min}
        max={currentMax}
        step={step}
        className="w-full cursor-ew-resize"
      />
      {hint && <p className="text-[11px] mt-1.5 opacity-60 leading-relaxed" style={{ color: "var(--text-muted)" }}>{hint}</p>}
    </div>
  );
}


export function CompactInput({
  label,
  value,
  onChange,
  unit,
  step = 1,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  unit: string;
  step?: number;
  min?: number;
  max?: number;
}) {
  return (
    <div>
      <label className="text-xs block mb-1 font-medium" style={{ color: "var(--text-secondary)" }}>{label}</label>
      <div className="flex items-center gap-1.5">
        <FormattedNumberInput
          value={value}
          onCommit={onChange}
          ariaLabel={label}
          min={min}
          max={max}
          className="input-field !py-1.5 !px-2 text-sm number-display flex-1 text-right focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
        />
        <span className="text-xs shrink-0 w-4" style={{ color: "var(--text-secondary)" }}>{unit}</span>
      </div>
    </div>
  );
}

export function SectionHeader({
  icon,
  title,
  colorHex,
  bgColorHex,
}: {
  icon: string;
  title: string;
  colorHex: string;
  bgColorHex: string;
}) {
  return (
    <h2 className="font-bold text-lg mb-5 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
      <span className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shadow-sm" style={{ background: bgColorHex, color: colorHex }}>
        {icon}
      </span>
      {title}
    </h2>
  );
}

export function SubSectionHeader({
  title,
  colorHex,
  checked,
  onChange,
  toggleColorClass,
  children,
}: {
  title: string;
  colorHex: string;
  /** 提供 checked+onChange 時，整列標題（含圖示與文字）都會變成可點擊的開關；不提供時維持純標題分段用法 */
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  toggleColorClass?: string;
  children?: React.ReactNode;
}) {
  const titleContent = (
    <span className="text-base font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
      <span className="w-1.5 h-4 rounded-full shadow-sm shrink-0" style={{ background: colorHex }} />
      {title}
    </span>
  );

  return (
    <div className="mt-8 mb-5 border-t pt-6" style={{ borderColor: "var(--border-subtle)" }}>
      {onChange ? (
        // 整列包在同一個 <label> 裡：點文字、色點或開關都會原生觸發 checkbox，
        // 不用另外寫 onClick，也不會有「外層點擊 + 內層 checkbox」疊加雙重觸發的風險。
        <label className="flex items-center justify-between cursor-pointer select-none -m-2 p-2 rounded-lg transition-colors hover:bg-white/[0.03]">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={!!checked}
            onChange={(e) => onChange(e.target.checked)}
          />
          {titleContent}
          <ToggleTrack colorClass={toggleColorClass} />
        </label>
      ) : (
        <div className="flex items-center justify-between">
          {titleContent}
          {children}
        </div>
      )}
    </div>
  );
}

export function InfoBox({
  children,
  colorHex,
  dashed = false,
  className = "",
}: {
  children: React.ReactNode;
  colorHex: string;
  dashed?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`p-3.5 rounded-xl mb-4 ${className}`}
      style={{
        background: `${colorHex}08`,
        border: `1px ${dashed ? "dashed" : "solid"} ${colorHex}30`,
      }}
    >
      {children}
    </div>
  );
}

export function ToggleSwitch({
  checked,
  onChange,
  colorClass,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  colorClass: string;
}) {
  return (
    <label className="relative inline-flex items-center cursor-pointer p-2 -m-2">
      <input type="checkbox" className="sr-only peer" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <ToggleTrack colorClass={colorClass} />
    </label>
  );
}

export function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="stat-card">
      <p className="text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>{label}</p>
      <p className="text-2xl sm:text-3xl font-bold number-display" style={{ color: color || "var(--text-primary)" }}>{value}</p>
      {sub && <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>{sub}</p>}
    </div>
  );
}
