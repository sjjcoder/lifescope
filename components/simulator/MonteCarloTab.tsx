"use client";

import React from "react";
import { BasicParams, MCParams } from "@/lib/calculator";
import {
  SectionHeader,
  SliderInput,
  SubSectionHeader,
  InfoBox,
} from "./SimulatorInputs";
import LeverageBlock from "./LeverageBlock";

export const CRISIS_SCENARIOS = [
  { id: "none", name: "祈禱世界和平 (無突發崩盤)", events: [], description: "風平浪靜地度過，僅受預設市場波動率影響。" },
  { id: "custom", name: "設定單次破釜沉舟打擊 (自訂)", events: [], description: "由你自行決定在未來的哪一年，遭遇多達多少比例的單次毀滅性崩盤。" },
  { id: "dotcom_2008", name: "千禧年雙重打擊 (網路泡沫 + 金融海嘯)", events: [{ year: 0, drop: 40 }, { year: 8, drop: 50 }], description: "模擬爆發當年遭遇網路泡沫 (-40%)，好不容易存活了 8 年，立刻又遭遇金融海嘯 (-50%) 的煉獄期。" },
  { id: "great_depression", name: "1929 經濟大恐慌 (連跌三年重創)", events: [{ year: 0, drop: 30 }, { year: 1, drop: 25 }, { year: 2, drop: 25 }], description: "模擬美股史上最慘烈的連環熊市，爆發後連續三年分別遭遇 -30%、-25%、-25% 的毀滅性連擊。" },
  { id: "covid_inflation", name: "新冠恐慌與通膨緊縮 (短期雙跌)", events: [{ year: 0, drop: 30 }, { year: 2, drop: 25 }], description: "模擬爆發當年引發疫情式閃崩 (-30%)，短暫恢復後，短短兩年內隨即迎來通膨緊縮股災 (-25%)。" },
];

interface MonteCarloTabProps {
  mcParams: MCParams;
  updateMC: <K extends keyof MCParams>(key: K, val: MCParams[K]) => void;
  basicParams: BasicParams;
  updateBasic: <K extends keyof BasicParams>(key: K, val: BasicParams[K]) => void;
  isLeverageEnabled: boolean;
  setIsLeverageEnabled: (v: boolean) => void;
  computedMonthlyLoan: number;
  runMonteCarlo: () => Promise<void>;
  isLoadingMC: boolean;
}

export default function MonteCarloTab({
  mcParams,
  updateMC,
  basicParams,
  updateBasic,
  isLeverageEnabled,
  setIsLeverageEnabled,
  computedMonthlyLoan,
  runMonteCarlo,
  isLoadingMC,
}: MonteCarloTabProps) {
  const activeScenario = CRISIS_SCENARIOS.find((s) => s.id === mcParams.scenarioId);

  return (
    <>
      <SectionHeader
        icon="🎲"
        title="壓力測試參數"
        colorHex="#f59e0b"
        bgColorHex="rgba(245, 158, 11, 0.15)"
      />

      <div className="flex gap-2 mb-5 p-1 rounded-xl" style={{ background: "var(--bg-secondary)" }}>
        <button
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] ${
            mcParams.phase === "accumulation"
              ? "bg-white text-slate-900 shadow-sm"
              : "opacity-60 hover:opacity-100"
          }`}
          onClick={() => updateMC("phase", "accumulation")}
        >
          💪 財富累積期
        </button>
        <button
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] ${
            mcParams.phase === "decumulation"
              ? "bg-white text-slate-900 shadow-sm"
              : "opacity-60 hover:opacity-100"
          }`}
          onClick={() => updateMC("phase", "decumulation")}
        >
          🌴 退休提領期
        </button>
      </div>

      <InfoBox colorHex="#94a3b8">
        <p className="text-xs text-slate-400">
          {mcParams.phase === "accumulation"
            ? "💡 模擬工作期間：每月持續投入月投資額，不會變賣資產。破產機率為 0。"
            : "⚠️ 模擬退休期間：停止工作投入，每月變賣資產支付月支出，測驗資產存活率。"}
        </p>
      </InfoBox>

      {mcParams.phase === "accumulation" ? (
        <SliderInput
          id="monthlyInvestment"
          label="每月繼續投資"
          value={basicParams.monthlyInvestment}
          onChange={(v) => updateBasic("monthlyInvestment", v)}
          min={0}
          max={1000000}
          step={5000}
          unit="元"
        />
      ) : (
        <SliderInput
          id="monthlyExpense"
          label="退休每月支出"
          value={basicParams.monthlyExpense}
          onChange={(v) => updateBasic("monthlyExpense", v)}
          min={0}
          max={1000000}
          step={5000}
          unit="元"
        />
      )}

      <LeverageBlock
        isLeverageEnabled={isLeverageEnabled}
        setIsLeverageEnabled={setIsLeverageEnabled}
        basicParams={basicParams}
        updateBasic={updateBasic}
        computedMonthlyLoan={computedMonthlyLoan}
      />

      <SubSectionHeader title="📈 市場風險設定" colorHex="#f97316" />
      <SliderInput
        id="volatility"
        label="預估波動率 (市場風險)"
        value={mcParams.volatility}
        onChange={(v) => updateMC("volatility", v)}
        min={0}
        max={40}
        step={1}
        unit="%"
        hint="大盤歷史波動約 15%。含公債配置可降至 5~10%。"
      />

      <SubSectionHeader
        title="歷史災難壓力測試 (黑天鵝劇本)"
        colorHex="#ef4444"
        checked={mcParams.isScenarioEnabled}
        onChange={(v) => updateMC("isScenarioEnabled", v)}
        toggleColorClass="peer-checked:bg-red-500"
      />

      {mcParams.isScenarioEnabled && (
        <div className="mb-4">
          <select
            className="w-full p-2.5 rounded-lg border text-sm outline-none mb-3 font-medium transition-colors hover:border-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
            style={{
              background: "var(--bg-secondary)",
              borderColor: "var(--border-subtle)",
              color: "var(--text-primary)",
            }}
            value={mcParams.scenarioId}
            onChange={(e) => updateMC("scenarioId", e.target.value)}
          >
            {CRISIS_SCENARIOS.filter((s) => s.id !== "none").map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <InfoBox colorHex="#ef4444" dashed>
            <p className="text-xs mb-4 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              💡 {activeScenario?.description || CRISIS_SCENARIOS.find((s) => s.id === "custom")?.description}
            </p>
            <SliderInput
              id="blackSwanYear"
              label="劇本引爆時機 (第 X 年)"
              value={mcParams.blackSwanYear}
              onChange={(v) => updateMC("blackSwanYear", v)}
              min={1}
              max={basicParams.investmentYears}
              step={1}
              unit="年"
              hint="拉動決定災難何時降臨。"
            />
            {mcParams.scenarioId === "custom" && (
              <SliderInput
                id="blackSwanDrop"
                label="當年崩盤跌幅"
                value={mcParams.blackSwanDrop}
                onChange={(v) => updateMC("blackSwanDrop", v)}
                min={10}
                max={80}
                step={5}
                unit="%"
              />
            )}
          </InfoBox>
        </div>
      )}

      <SubSectionHeader
        title="跳躍擴散模型 (每年隨機崩盤)"
        colorHex="#6366f1"
        checked={mcParams.isJumpEnabled}
        onChange={(v) => updateMC("isJumpEnabled", v)}
        toggleColorClass="peer-checked:bg-indigo-500"
      />

      {mcParams.isJumpEnabled && (
        <InfoBox colorHex="#6366f1" dashed>
          <p className="text-xs mb-4" style={{ color: "var(--text-secondary)" }}>
            💡 除下方指定的歷史劇本外，每年額外觸發無預警黑天鵝的機率與跌幅。
          </p>
          <SliderInput
            id="jumpProbability"
            label="每年發生機率"
            value={mcParams.jumpProbability}
            onChange={(v) => updateMC("jumpProbability", v)}
            min={1}
            max={20}
            step={1}
            unit="%"
          />
          <SliderInput
            id="jumpImpact"
            label="單次崩盤跌幅"
            value={mcParams.jumpImpact}
            onChange={(v) => updateMC("jumpImpact", v)}
            min={5}
            max={50}
            step={5}
            unit="%"
          />
        </InfoBox>
      )}

      <SubSectionHeader
        title="動態提領防禦 (Dynamic Spending)"
        colorHex="#10b981"
        checked={mcParams.isDynamic}
        onChange={(v) => updateMC("isDynamic", v)}
        toggleColorClass="peer-checked:bg-emerald-500"
      />

      {mcParams.isDynamic && (
        <InfoBox colorHex="#10b981" dashed>
          <p className="text-xs mb-4" style={{ color: "var(--text-secondary)" }}>
            🛡️ 當遭遇市場下跌的年份，系統將自動縮減該年度的生活費，此防禦機制可大幅提升退休資產的存活機率！
          </p>
          <SliderInput
            id="dynamicRatio"
            label="縮減提領比例"
            value={mcParams.dynamicRatio}
            onChange={(v) => updateMC("dynamicRatio", v)}
            min={5}
            max={50}
            step={5}
            unit="%"
          />
        </InfoBox>
      )}

      <button
        onClick={runMonteCarlo}
        disabled={isLoadingMC}
        className="w-full mt-5 py-3.5 rounded-xl font-bold flex items-center justify-center transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        style={{ background: "var(--accent-primary)", color: "white", "--tw-ring-color": "var(--accent-primary)", "--tw-ring-offset-color": "var(--bg-secondary)" } as React.CSSProperties}
      >
        {isLoadingMC ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            量化模擬中...
          </span>
        ) : (
          "🚀 執行 1,000 次蒙地卡羅模擬"
        )}
      </button>
    </>
  );
}
