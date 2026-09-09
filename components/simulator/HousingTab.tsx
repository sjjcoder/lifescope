"use client";

import React from "react";
import { HousingParams, calculateMonthlyMortgage } from "@/lib/calculator";
import {
  SectionHeader,
  SliderInput,
  SubSectionHeader,
  InfoBox,
  formatNumber,
} from "./SimulatorInputs";

interface HousingTabProps {
  housingParams: HousingParams;
  updateHousing: (key: keyof HousingParams, val: number) => void;
  computedMortgage: number;
}

export default function HousingTab({
  housingParams,
  updateHousing,
  computedMortgage,
}: HousingTabProps) {
  const { housePrice, downPaymentPercent, loanRate, loanYears, graceYears = 0 } = housingParams;
  const loanAmount = housePrice * (1 - downPaymentPercent / 100);
  const monthlyInterestOnly = Math.round(loanAmount * (loanRate / 100 / 12));
  const remainingYears = Math.max(1, loanYears - graceYears);
  const monthlyMortgageAfterGrace = Math.round(calculateMonthlyMortgage(loanAmount, loanRate, remainingYears));

  return (
    <>
      <SectionHeader
        icon="🏠"
        title="全局資金與時程"
        colorHex="var(--accent-secondary)"
        bgColorHex="var(--accent-secondary-dim)"
      />
      <SliderInput
        id="initialCapital"
        label="初始總資金"
        value={housingParams.initialCapital}
        onChange={(v) => updateHousing("initialCapital", v)}
        min={1000000}
        max={150000000}
        step={500000}
        unit="元"
        hint="租屋全數投資；買房先付頭期，剩餘投資。"
      />
      <SliderInput
        id="yearsToCompare"
        label="比較年數"
        value={housingParams.yearsToCompare}
        onChange={(v) => updateHousing("yearsToCompare", v)}
        min={5}
        max={50}
        step={5}
        unit="年"
      />
      <SliderInput
        id="investReturn"
        label="投資報酬率"
        value={housingParams.investReturn}
        onChange={(v) => updateHousing("investReturn", v)}
        min={0}
        max={15}
        step={0.5}
        unit="%"
        hint="未動用資金與每月結餘投入市場的預期報酬率"
      />

      <SubSectionHeader title="買房專屬參數" colorHex="var(--accent-secondary)" />
      <SliderInput
        id="housePrice"
        label="預計購買總價"
        value={housingParams.housePrice}
        onChange={(v) => updateHousing("housePrice", v)}
        min={3000000}
        max={300000000}
        step={1000000}
        unit="元"
      />
      <SliderInput
        id="downPaymentPercent"
        label="頭期款成數"
        value={housingParams.downPaymentPercent}
        onChange={(v) => updateHousing("downPaymentPercent", v)}
        min={10}
        max={50}
        step={5}
        unit="%"
      />
      <SliderInput
        id="loanRate"
        label="房貸利率"
        value={housingParams.loanRate}
        onChange={(v) => updateHousing("loanRate", v)}
        min={1}
        max={5}
        step={0.1}
        unit="%"
        hint="首購房貸地板價約 2.185% 起（2026 年，會隨央行利率變動）"
      />
      <SliderInput
        id="loanYears"
        label="貸款年限"
        value={housingParams.loanYears}
        onChange={(v) => updateHousing("loanYears", v)}
        min={10}
        max={40}
        step={5}
        unit="年"
      />
      <SliderInput
        id="graceYears"
        label="房貸寬限期"
        value={graceYears}
        onChange={(v) => updateHousing("graceYears", v)}
        min={0}
        max={Math.min(10, housingParams.loanYears - 5)}
        step={1}
        unit="年"
        hint="寬限期內只還利息，不還本金。期滿後由賸餘年限等額本息攤還。"
      />

      {graceYears > 0 ? (
        <InfoBox colorHex="#8b5cf6" dashed>
          <div className="text-xs space-y-1.5" style={{ color: "var(--text-secondary)" }}>
            <p className="font-semibold flex justify-between items-center text-violet-400">
              <span>💡 房貸寬限期試算</span>
            </p>
            <p className="flex justify-between items-center">
              <span>第 1 ~ {graceYears} 年每月付息：</span>
              <span className="font-bold text-sm text-slate-100">{formatNumber(monthlyInterestOnly)} 元</span>
            </p>
            <p className="flex justify-between items-center">
              <span>第 {graceYears + 1} 年起每月本息攤還：</span>
              <span className="font-bold text-sm text-slate-100">{formatNumber(monthlyMortgageAfterGrace)} 元</span>
            </p>
          </div>
        </InfoBox>
      ) : (
        <InfoBox colorHex="#8b5cf6" dashed>
          <p className="text-sm font-medium flex justify-between items-center" style={{ color: "var(--accent-secondary)" }}>
            <span>💡 每月房貸本息攤還試算</span>
            <span className="text-base font-bold">{formatNumber(computedMortgage)} 元</span>
          </p>
        </InfoBox>
      )}

      <SliderInput
        id="houseAppreciationRate"
        label="房價年漲幅"
        value={housingParams.houseAppreciationRate}
        onChange={(v) => updateHousing("houseAppreciationRate", v)}
        min={-5}
        max={10}
        step={0.5}
        unit="%"
        hint="保守預估 2~3%"
      />
      <SliderInput
        id="maintenanceRate"
        label="年維護成本"
        value={housingParams.maintenanceRate}
        onChange={(v) => updateHousing("maintenanceRate", v)}
        min={0}
        max={3}
        step={0.1}
        unit="%"
        hint="抓房價 0.5~1% 作為稅金與修繕基金"
      />

      <SubSectionHeader title="租屋專屬參數" colorHex="var(--accent-primary)" />
      <SliderInput
        id="monthlyRent"
        label="預計月租金"
        value={housingParams.monthlyRent}
        onChange={(v) => updateHousing("monthlyRent", v)}
        min={5000}
        max={500000}
        step={5000}
        unit="元"
      />
      <SliderInput
        id="rentIncreaseRate"
        label="年租金漲幅"
        value={housingParams.rentIncreaseRate}
        onChange={(v) => updateHousing("rentIncreaseRate", v)}
        min={0}
        max={5}
        step={0.5}
        unit="%"
      />
    </>
  );
}
