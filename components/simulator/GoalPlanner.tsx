"use client";

import React, { useMemo } from "react";
import {
  BasicParams,
  calculateRequiredMonthlyInvestment,
  calculateRequiredReturn,
  calculateRequiredYears,
  formatTWD,
} from "@/lib/calculator";
import GoalComparisonChart, { GoalTrajectoryPoint } from "@/components/charts/GoalComparisonChart";
import { SectionHeader, SliderInput, InfoBox, formatNumber } from "./SimulatorInputs";

const TARGET_ASSET_PRESETS = [
  { label: "2000萬", value: 20000000 },
  { label: "3000萬", value: 30000000 },
  { label: "5000萬", value: 50000000 },
  { label: "1億", value: 100000000 },
];

const TARGET_YEARS_PRESETS = [
  { label: "10年", value: 10 },
  { label: "20年", value: 20 },
  { label: "30年", value: 30 },
];

function PresetChips<T extends number>({
  presets,
  activeValue,
  onSelect,
}: {
  presets: { label: string; value: T }[];
  activeValue: T;
  onSelect: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-2 mb-1">
      {presets.map((p) => {
        const isSelected = activeValue === p.value;
        return (
          <button
            key={p.label}
            type="button"
            onClick={() => onSelect(p.value)}
            className={`px-2.5 py-1 text-[11px] rounded-full border transition-all cursor-pointer active:scale-95 ${isSelected ? "" : "chip-button"}`}
            style={
              isSelected
                ? {
                    borderColor: "var(--accent-primary)",
                    background: "var(--accent-primary-dim)",
                    color: "var(--accent-primary)",
                    fontWeight: 600,
                  }
                : undefined
            }
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}

interface GoalTargets {
  targetAssets: number;
  setTargetAssets: (v: number) => void;
  targetYears: number;
  setTargetYears: (v: number) => void;
}

interface GoalPlannerInputsProps extends GoalTargets {
  basicParams: BasicParams;
  updateBasic: <K extends keyof BasicParams>(key: K, val: BasicParams[K]) => void;
}

// 左側輸入面板：目前每月投資額（與其他頁籤共用同一份設定）+ 這個分頁自己的兩個目標參數
export function GoalPlannerInputs({
  targetAssets,
  setTargetAssets,
  targetYears,
  setTargetYears,
  basicParams,
  updateBasic,
}: GoalPlannerInputsProps) {
  return (
    <>
      <SectionHeader icon="🎯" title="設定回推目標" colorHex="var(--accent-secondary)" bgColorHex="var(--accent-primary-dim)" />
      <SliderInput
        id="goalMonthlyInvestment"
        label="月投資額"
        value={basicParams.monthlyInvestment}
        onChange={(v) => updateBasic("monthlyInvestment", v)}
        min={0}
        max={1000000}
        step={5000}
        unit="元"
        hint="與「複利試算」「蒙地卡羅壓測」共用同一份設定，調整這裡其他頁籤也會一起變動。"
      />

      <div className="mt-6">
        <SliderInput
          id="targetAssets"
          label="目標淨資產"
          value={targetAssets}
          onChange={setTargetAssets}
          min={1000000}
          max={200000000}
          step={1000000}
          unit="元"
        />
      </div>
      <PresetChips presets={TARGET_ASSET_PRESETS} activeValue={targetAssets} onSelect={setTargetAssets} />

      <div className="mt-6">
        <SliderInput
          id="targetYears"
          label="預計達成年限"
          value={targetYears}
          onChange={setTargetYears}
          min={1}
          max={50}
          step={1}
          unit="年"
        />
      </div>
      <PresetChips presets={TARGET_YEARS_PRESETS} activeValue={targetYears} onSelect={setTargetYears} />

      <p className="text-[11px] mt-4 opacity-60 leading-relaxed" style={{ color: "var(--text-muted)" }}>
        💡 現有資產、年化報酬率沿用上方「全局基礎參數」。
      </p>
    </>
  );
}

interface GoalPlannerResultsProps extends Pick<GoalTargets, "targetAssets" | "targetYears"> {
  currentAssets: number;
  currentReturn: number;
  currentInvestment: number;
}

// 右側結果面板：三種回推槓桿 + 目前步調 vs 所需步調 對比曲線
export function GoalPlannerResults({
  currentAssets,
  currentReturn,
  currentInvestment,
  targetAssets,
  targetYears,
}: GoalPlannerResultsProps) {
  const requiredMonthly = useMemo(
    () => calculateRequiredMonthlyInvestment(targetAssets, targetYears, currentReturn, currentAssets),
    [targetAssets, targetYears, currentReturn, currentAssets]
  );

  const requiredReturn = useMemo(
    () => calculateRequiredReturn(targetAssets, targetYears, currentInvestment, currentAssets),
    [targetAssets, targetYears, currentInvestment, currentAssets]
  );

  const requiredYears = useMemo(
    () => calculateRequiredYears(targetAssets, currentInvestment, currentReturn, currentAssets),
    [targetAssets, currentInvestment, currentReturn, currentAssets]
  );

  const trajectory: GoalTrajectoryPoint[] = useMemo(() => {
    const r = currentReturn / 100 / 12;
    const fv = (monthly: number, months: number) =>
      r === 0
        ? currentAssets + monthly * months
        : currentAssets * Math.pow(1 + r, months) + monthly * ((Math.pow(1 + r, months) - 1) / r);

    const points: GoalTrajectoryPoint[] = [];
    for (let year = 0; year <= targetYears; year++) {
      const months = year * 12;
      points.push({
        year,
        current: fv(currentInvestment, months),
        required: fv(requiredMonthly, months),
      });
    }
    return points;
  }, [currentAssets, currentReturn, currentInvestment, requiredMonthly, targetYears]);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <InfoBox colorHex="#10b981" dashed className="flex flex-col justify-between !mb-0">
          <div>
            <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>每月最低應投資金額</p>
            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>(假設年化報酬率為 {currentReturn}%)</p>
          </div>
          <p className="text-xl font-bold mt-2 text-emerald-500">
            {requiredMonthly > 0 ? `${formatNumber(requiredMonthly)} 元` : "0 元 (現有資產已足夠)"}
          </p>
          <p className="text-[10px] mt-1 opacity-60" style={{ color: "var(--text-muted)" }}>
            當前月投資：{formatNumber(currentInvestment)} 元
          </p>
        </InfoBox>

        <InfoBox colorHex="#3b82f6" dashed className="flex flex-col justify-between !mb-0">
          <div>
            <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>需要達成的年化報酬率</p>
            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>(假設每月投入 {formatNumber(currentInvestment)} 元)</p>
          </div>
          <p className="text-xl font-bold mt-2 text-blue-500">
            {requiredReturn !== null ? `${requiredReturn}%` : "100%+ (目標過高需調整)"}
          </p>
          <p className="text-[10px] mt-1 opacity-60" style={{ color: "var(--text-muted)" }}>
            當前預期報酬率：{currentReturn}%
          </p>
        </InfoBox>

        <InfoBox colorHex="#f59e0b" dashed className="flex flex-col justify-between !mb-0">
          <div>
            <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>維持現況需要幾年達成</p>
            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>(月投資 {formatNumber(currentInvestment)} 元、報酬率 {currentReturn}%)</p>
          </div>
          <p className="text-xl font-bold mt-2 text-amber-500">
            {requiredYears !== null ? `${requiredYears} 年` : "100 年+ (目標過高需調整)"}
          </p>
          <p className="text-[10px] mt-1 opacity-60" style={{ color: "var(--text-muted)" }}>
            目標年限：{targetYears} 年
          </p>
        </InfoBox>
      </div>

      <div className="glass-card p-5">
        <h3 className="font-semibold text-base mb-4" style={{ color: "var(--text-secondary)" }}>目前步調 vs 達成目標所需步調</h3>
        <GoalComparisonChart data={trajectory} targetAssets={targetAssets} />
      </div>
    </>
  );
}
