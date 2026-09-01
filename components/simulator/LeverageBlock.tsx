"use client";

import React from "react";
import { BasicParams } from "@/lib/calculator";
import {
  SubSectionHeader,
  InfoBox,
  SliderInput,
  formatNumber,
} from "./SimulatorInputs";

interface LeverageBlockProps {
  isLeverageEnabled: boolean;
  setIsLeverageEnabled: (v: boolean) => void;
  basicParams: BasicParams;
  updateBasic: <K extends keyof BasicParams>(key: K, val: BasicParams[K]) => void;
  computedMonthlyLoan: number;
}

export default function LeverageBlock({
  isLeverageEnabled,
  setIsLeverageEnabled,
  basicParams,
  updateBasic,
  computedMonthlyLoan,
}: LeverageBlockProps) {
  return (
    <>
      <SubSectionHeader
        title="⚖️ 財務槓桿策略 (信貸)"
        colorHex="#3b82f6"
        checked={isLeverageEnabled}
        onChange={(v) => {
          setIsLeverageEnabled(v);
          if (!v) updateBasic("leverageAmount", 0);
        }}
        toggleColorClass="peer-checked:bg-blue-500"
      />

      {isLeverageEnabled && (
        <InfoBox colorHex="#3b82f6" dashed>
          <div className="p-2.5 mb-5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs leading-relaxed text-amber-400">
            ⚠️ <b>現金流提醒：</b> 系統已自動從「月投資額」中扣除貸款本息。若投資額不足，將會自動變賣資產償還。
          </div>
          <SliderInput id="leverageAmount" label="借貸本金" value={basicParams.leverageAmount || 0} onChange={(v) => updateBasic("leverageAmount", v)} min={0} max={20000000} step={100000} unit="元" />
          <SliderInput id="leverageRate" label="貸款年利率" value={basicParams.leverageRate || 0} onChange={(v) => updateBasic("leverageRate", v)} min={1} max={15} step={0.1} unit="%" />
          <SliderInput id="leverageYears" label="貸款年限" value={basicParams.leverageYears || 0} onChange={(v) => updateBasic("leverageYears", v)} min={1} max={30} step={1} unit="年" />
          <SliderInput id="leverageRecurYears" label="自動續借頻率" value={basicParams.leverageRecurYears || 0} onChange={(v) => updateBasic("leverageRecurYears", v)} min={0} max={10} step={1} unit="年" hint="0 代表不續借。每隔 X 年自動補足本金並重置債務。" />
          
          {(basicParams.leverageAmount || 0) > 0 && (basicParams.leverageYears || 0) > 0 && (
            <div className="mt-5 p-2.5 rounded-lg text-xs font-medium flex justify-between items-center bg-blue-500/10 text-blue-400">
              <span>💡 試算每月還本付息：</span>
              <span className="text-sm font-bold">約 {formatNumber(computedMonthlyLoan)} 元</span>
            </div>
          )}
        </InfoBox>
      )}
    </>
  );
}
