"use client";

import React, { useState, useMemo } from "react";
import {
  calculateRequiredMonthlyInvestment,
  calculateRequiredReturn,
  formatTWD,
} from "@/lib/calculator";
import { InfoBox, formatNumber } from "./SimulatorInputs";

interface GoalPlannerProps {
  currentAssets: number;
  currentReturn: number;
  currentInvestment: number;
}

export default function GoalPlanner({
  currentAssets,
  currentReturn,
  currentInvestment,
}: GoalPlannerProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [targetAssets, setTargetAssets] = useState(30000000); // 預設 3,000 萬
  const [targetYears, setTargetYears] = useState(20); // 預設 20 年

  // 計算所需每月投資額
  const requiredMonthly = useMemo(() => {
    return calculateRequiredMonthlyInvestment(
      targetAssets,
      targetYears,
      currentReturn,
      currentAssets
    );
  }, [targetAssets, targetYears, currentReturn, currentAssets]);

  // 計算所需報酬率
  const requiredReturn = useMemo(() => {
    return calculateRequiredReturn(
      targetAssets,
      targetYears,
      currentInvestment,
      currentAssets
    );
  }, [targetAssets, targetYears, currentInvestment, currentAssets]);

  return (
    <div className="glass-card p-5 transition-all">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between font-bold text-base cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 rounded-lg"
        style={{ color: "var(--text-primary)", "--tw-ring-color": "var(--accent-primary)", "--tw-ring-offset-color": "var(--bg-card)" } as React.CSSProperties}
      >
        <span className="flex items-center gap-2">
          <span className="w-1.5 h-4 rounded-full shadow-sm" style={{ background: "var(--accent-success)" }} />
          🎯 退休目標倒推規劃 (FIRE Goal Planner)
        </span>
        <span className={`text-xs transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} style={{ color: "var(--text-muted)" }}>
          ▼
        </span>
      </button>

      {isOpen && (
        <div className="mt-5 space-y-4 border-t pt-4" style={{ borderColor: "var(--border-subtle)" }}>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            輸入您理想的資產目標與年限，系統將自動逆向推演達成計畫所需的配置：
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--text-secondary)" }}>
                目標淨資產
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={targetAssets}
                  onChange={(e) => setTargetAssets(Math.max(0, Number(e.target.value)))}
                  className="input-field !py-1.5 text-sm number-display flex-1 text-right"
                  step={1000000}
                />
                <span className="text-xs w-10 shrink-0" style={{ color: "var(--text-muted)" }}>
                  元
                </span>
              </div>
              <span className="text-[10px] mt-1 block" style={{ color: "var(--accent-primary)" }}>
                （目前設定：{formatTWD(targetAssets)}）
              </span>
            </div>

            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--text-secondary)" }}>
                預計達成年限
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={targetYears}
                  onChange={(e) => setTargetYears(Math.max(1, Math.min(100, Number(e.target.value))))}
                  className="input-field !py-1.5 text-sm number-display flex-1 text-right"
                  min={1}
                  max={100}
                />
                <span className="text-xs w-10 shrink-0" style={{ color: "var(--text-muted)" }}>
                  年
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            <InfoBox colorHex="#10b981" dashed className="flex flex-col justify-between p-3.5 !mb-0">
              <div>
                <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                  每月最低應投資金額
                </p>
                <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                  (假設年化報酬率為 {currentReturn}%)
                </p>
              </div>
              <p className="text-xl font-bold mt-2 text-emerald-500">
                {requiredMonthly > 0 ? `${formatNumber(requiredMonthly)} 元` : "0 元 (現有資產已足夠)"}
              </p>
              <p className="text-[10px] mt-1 opacity-60" style={{ color: "var(--text-muted)" }}>
                當前月投資：{formatNumber(currentInvestment)} 元
              </p>
            </InfoBox>

            <InfoBox colorHex="#3b82f6" dashed className="flex flex-col justify-between p-3.5 !mb-0">
              <div>
                <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                  需要達成的年化報酬率
                </p>
                <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                  (假設每月投入 {formatNumber(currentInvestment)} 元)
                </p>
              </div>
              <p className="text-xl font-bold mt-2 text-blue-500">
                {requiredReturn !== null ? `${requiredReturn}%` : "100%+ (目標過高需調整)"}
              </p>
              <p className="text-[10px] mt-1 opacity-60" style={{ color: "var(--text-muted)" }}>
                當前預期報酬率：{currentReturn}%
              </p>
            </InfoBox>
          </div>
        </div>
      )}
    </div>
  );
}
