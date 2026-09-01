"use client";

import React, { useState } from "react";
import { BasicParams, CustomEvent } from "@/lib/calculator";
import {
  SectionHeader,
  SliderInput,
  SubSectionHeader,
  ToggleTrack,
  InfoBox,
} from "./SimulatorInputs";
import LeverageBlock from "./LeverageBlock";

interface BasicTabProps {
  basicParams: BasicParams;
  updateBasic: <K extends keyof BasicParams>(key: K, val: BasicParams[K]) => void;
  isLeverageEnabled: boolean;
  setIsLeverageEnabled: (v: boolean) => void;
  computedMonthlyLoan: number;
}

export default function BasicTab({
  basicParams,
  updateBasic,
  isLeverageEnabled,
  setIsLeverageEnabled,
  computedMonthlyLoan,
}: BasicTabProps) {
  return (
    <>
      <SectionHeader
        icon="⚙"
        title="現況與收支設定"
        colorHex="var(--accent-primary)"
        bgColorHex="var(--accent-primary-dim)"
      />
      <SliderInput
        id="monthlyIncome"
        label="月收入"
        value={basicParams.monthlyIncome}
        onChange={(v) => updateBasic("monthlyIncome", v)}
        min={0}
        max={2000000}
        step={5000}
        unit="元"
      />
      <SliderInput
        id="monthlyExpense"
        label="月支出"
        value={basicParams.monthlyExpense}
        onChange={(v) => updateBasic("monthlyExpense", v)}
        min={0}
        max={1000000}
        step={5000}
        unit="元"
      />
      <SliderInput
        id="monthlyInvestment"
        label="月投資額"
        value={basicParams.monthlyInvestment}
        onChange={(v) => updateBasic("monthlyInvestment", v)}
        min={0}
        max={1000000}
        step={5000}
        unit="元"
      />

      <LeverageBlock
        isLeverageEnabled={isLeverageEnabled}
        setIsLeverageEnabled={setIsLeverageEnabled}
        basicParams={basicParams}
        updateBasic={updateBasic}
        computedMonthlyLoan={computedMonthlyLoan}
      />

      {/* 🏦 理專進階實務建議設定 */}
      <SubSectionHeader
        title="🏦 理專進階實務建議設定"
        colorHex="var(--accent-warning)"
        checked={basicParams.isBankerEnabled || false}
        onChange={(v) => updateBasic("isBankerEnabled", v)}
        toggleColorClass="peer-checked:bg-amber-500"
      />

      {basicParams.isBankerEnabled && (
        <InfoBox colorHex="var(--accent-warning)" dashed>
          <SliderInput
            id="frictionRate"
            label="交易與稅務摩擦損耗"
            value={basicParams.frictionRate || 0}
            onChange={(v) => updateBasic("frictionRate", v)}
            min={0}
            max={3}
            step={0.1}
            unit="%"
            hint="模擬交易手續費、ETF 內扣管理費與稅務拖累。台灣指數化投資建議設為 0.3% ~ 0.5%。"
          />
          
          <label className="flex items-center justify-between py-2 border-t border-dashed border-amber-500/10 cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={basicParams.isInsuranceEnabled || false}
              onChange={(e) => updateBasic("isInsuranceEnabled", e.target.checked)}
            />
            <div>
              <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>配置風險防禦保險 (Insurance Overlay)</p>
              <p className="text-[10px] opacity-70" style={{ color: "var(--text-muted)" }}>規避人生中斷型財務黑天鵝事件的威脅</p>
            </div>
            <ToggleTrack colorClass="peer-checked:bg-emerald-500" />
          </label>

          {basicParams.isInsuranceEnabled && (
            <SliderInput
              id="insurancePremium"
              label="每月壽險/醫療險保費"
              value={basicParams.insurancePremium || 1500}
              onChange={(v) => updateBasic("insurancePremium", v)}
              min={0}
              max={20000}
              step={500}
              unit="元"
              hint="保費將作為必需支出按月自現金流扣除，但在遭遇「保險理賠範圍」的意外中斷事件時可獲得全額理賠。"
            />
          )}
        </InfoBox>
      )}

      <SubSectionHeader
        title="🌟 人生重大事件 (Life Events)"
        colorHex="#ec4899"
        checked={basicParams.isEventsEnabled || false}
        onChange={(v) => updateBasic("isEventsEnabled", v)}
        toggleColorClass="peer-checked:bg-pink-500"
      />

      {basicParams.isEventsEnabled && (
        <InfoBox colorHex="#ec4899" dashed>
          <div className="flex justify-end mb-3">
            <button
              onClick={() => {
                const newEvents: CustomEvent[] = [
                  ...(basicParams.customEvents || []),
                  { year: 5, name: "買車", amount: -800000, type: "one-time", duration: 1, isInsurable: false },
                ];
                updateBasic("customEvents", newEvents);
              }}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium hover:bg-white/10 border border-pink-500/30 hover:border-pink-500 transition-colors text-pink-400 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
            >
              ＋ 新增事件
            </button>
          </div>

          {(basicParams.customEvents || []).length === 0 ? (
            <p className="text-xs text-center text-pink-400/70 py-4">
              尚未新增事件。可加入一次性收支或多期意外中斷事件。
            </p>
          ) : (
            <div className="space-y-4 mb-4">
              {(basicParams.customEvents || []).map((ev, i) => (
                <div
                  key={i}
                  id={`life-event-${ev.year}-${i}`}
                  className="flex flex-col gap-3 p-3 rounded-lg bg-black/20 border border-pink-500/20 transition-all duration-300"
                >
                  {/* 第一行: 項目名稱、年份、刪除按鈕 */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={ev.name}
                      onChange={(e) => {
                        const newEvents = [...(basicParams.customEvents || [])];
                        newEvents[i].name = e.target.value;
                        updateBasic("customEvents", newEvents);
                      }}
                      className="input-field !py-1 !px-2 text-xs flex-1 min-w-[80px]"
                      placeholder="事件名稱"
                    />
                    <div className="flex items-center gap-1 shrink-0 w-24">
                      <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>第</span>
                      <input
                        type="number"
                        value={ev.year}
                        onChange={(e) => {
                          const newEvents = [...(basicParams.customEvents || [])];
                          newEvents[i].year = Math.max(1, Number(e.target.value));
                          updateBasic("customEvents", newEvents);
                        }}
                        className="input-field !py-1 !px-2 text-xs text-center flex-1 min-w-0"
                      />
                      <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>年</span>
                    </div>
                    <button
                      onClick={() => {
                        const newEvents = [...(basicParams.customEvents || [])];
                        newEvents.splice(i, 1);
                        updateBasic("customEvents", newEvents);
                      }}
                      className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-red-500/20 text-red-500 transition-colors shrink-0 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>

                  {/* 第二行: 金額、事件類型、中斷年期與保險勾選 */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex-1 min-w-[140px] flex items-center gap-1.5">
                      <span className="text-[10px] shrink-0" style={{ color: "var(--text-muted)" }}>每年金額:</span>
                      <input
                        type="number"
                        value={ev.amount}
                        onChange={(e) => {
                          const newEvents = [...(basicParams.customEvents || [])];
                          newEvents[i].amount = Number(e.target.value);
                          updateBasic("customEvents", newEvents);
                        }}
                        className={`input-field !py-1 !px-2 text-xs text-right font-medium flex-1 ${
                          ev.amount >= 0 ? "text-green-500" : "text-red-400"
                        }`}
                        placeholder="金額 (+/-)"
                      />
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>類型:</span>
                      <select
                        value={ev.type || "one-time"}
                        onChange={(e) => {
                          const newEvents = [...(basicParams.customEvents || [])];
                          const typeVal = e.target.value as "one-time" | "interruption";
                          newEvents[i].type = typeVal;
                          if (typeVal === "one-time") {
                            newEvents[i].duration = 1;
                            newEvents[i].isInsurable = false;
                          } else {
                            newEvents[i].duration = 3;
                            newEvents[i].isInsurable = true;
                          }
                          updateBasic("customEvents", newEvents);
                        }}
                        className="p-1 rounded text-xs border border-transparent outline-none cursor-pointer focus-visible:border-[var(--accent-primary)]"
                        style={{ color: "var(--text-primary)", background: "var(--bg-secondary)" }}
                      >
                        <option value="one-time">單次收支</option>
                        <option value="interruption">意外中斷</option>
                      </select>
                    </div>

                    {(ev.type === "interruption") && (
                      <div className="flex items-center gap-2 w-full mt-1.5 pt-1.5 border-t border-dashed border-pink-500/10 justify-between">
                        <div className="flex items-center gap-1 w-24">
                          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>持續:</span>
                          <input
                            type="number"
                            value={ev.duration || 1}
                            onChange={(e) => {
                              const newEvents = [...(basicParams.customEvents || [])];
                              newEvents[i].duration = Math.max(1, Math.min(10, Number(e.target.value)));
                              updateBasic("customEvents", newEvents);
                            }}
                            className="input-field !py-0.5 !px-1 text-[11px] text-center flex-1"
                            min={1}
                            max={10}
                          />
                          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>年</span>
                        </div>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={ev.isInsurable || false}
                            onChange={(e) => {
                              const newEvents = [...(basicParams.customEvents || [])];
                              newEvents[i].isInsurable = e.target.checked;
                              updateBasic("customEvents", newEvents);
                            }}
                            className="w-3.5 h-3.5 cursor-pointer accent-emerald-500"
                          />
                          <span className="text-[10px] select-none text-emerald-500 font-semibold">屬保險理賠範圍</span>
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="text-[11px] opacity-60 leading-relaxed mt-2" style={{ color: "var(--text-muted)" }}>
            💡 正數代表一筆意外之財 (如遺產)，負數代表大筆支出 (如買車)。這將在該年直接加減您的淨資產與投入本金。
          </p>
        </InfoBox>
      )}
    </>
  );
}
