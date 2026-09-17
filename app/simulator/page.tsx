"use client";

import { useState, useMemo, useCallback, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ProjectionChart from "@/components/charts/ProjectionChart";
import FanChart from "@/components/charts/FanChart";
import CompareChart from "@/components/charts/CompareChart";
import {
  BasicParams,
  HousingParams,
  LifeStage,
  FAMILY_MULTIPLIERS,
  calculateProjection,
  calculateHousingCompare,
  calculateFIREAge,
  formatTWD,
  calculateMonthlyMortgage,
  calculateMonthlyLoanPayment,
  MCParams,
  MCResult,
} from "@/lib/calculator";
import {
  getScenarios,
  saveScenario,
  deleteScenario,
  canSaveMore,
  Scenario,
} from "@/lib/scenarios";
import {
  CompactInput,
  StatCard,
} from "@/components/simulator/SimulatorInputs";
import BasicTab from "@/components/simulator/BasicTab";
import HousingTab from "@/components/simulator/HousingTab";
import MonteCarloTab, { CRISIS_SCENARIOS } from "@/components/simulator/MonteCarloTab";
import ScenarioManager from "@/components/simulator/ScenarioManager";
import { GoalPlannerInputs, GoalPlannerResults } from "@/components/simulator/GoalPlanner";



// 市場假設快捷鍵：一律以「資產類別」命名，**不得出現任何具名有價證券**（個股、ETF 代號或名稱）。
// 原因：《證券投資信託及顧問法》第 4 條將「對有價證券提供分析意見或推介建議並取得報酬」定義為證券投資顧問，
// 無照經營者可處 5 年以下有期徒刑併科 5,000 萬元以下罰金。實務見解特別點名「內置特定參數、
// 使用者無需自行設定即可得出結論的軟體」屬違法態樣。把標的名稱換成資產類別後，這些數字回歸
// 一般性的歷史市場統計（合法側：公開資訊與歷史數據），使用者仍可自行輸入任何數值。
// 這也與 /terms 的聲明一致 —— 該頁承諾本站「絕不提供任何特定金融商品之買賣建議、投資分析或推薦」。
// ⚠️ 本站若開始收費，或啟用券商推薦等聯盟收益（構成「間接自第三人取得報酬」），此限制更形重要，請勿改回具名標的。
const MARKET_PRESETS = [
  { name: "美股大盤型", return: 10, vol: 15 },
  { name: "科技成長型", return: 13, vol: 20 },
  { name: "全球股市型", return: 8, vol: 14 },
  { name: "台股市值型", return: 9, vol: 16 },
  { name: "保守股債配置", return: 6, vol: 8 }
];

const STAGE_LABELS = ["🧒 年輕養成期", "👨‍👩‍👧 家庭壯年期", "🧓 退休空巢期"];

type TabId = "basic" | "goal" | "mc" | "housing";
const TAB_ORDER: TabId[] = ["basic", "goal", "mc", "housing"];

// 蒙地卡羅 API 回應先驗證形狀再進 state：API Gateway 錯誤頁、後端改版或代理快取回傳 200 但內容不對時，
// 不會在 render 期間 TypeError 白屏。
function isMCResult(value: unknown): value is MCResult {
  if (!value || typeof value !== "object") return false;
  const r = value as Record<string, unknown>;
  if (typeof r.successRate !== "number" || typeof r.medianEndingWealth !== "number") return false;
  if (!Array.isArray(r.percentilePaths) || r.percentilePaths.length === 0) return false;
  return r.percentilePaths.every((p) => {
    if (!p || typeof p !== "object") return false;
    const point = p as Record<string, unknown>;
    return ["year", "p90", "p75", "p50", "p25", "p10"].every((k) => Number.isFinite(point[k]));
  });
}
const FAMILY_OPTIONS = [
  { value: 1, label: "👤 單身 (1人)" },
  { value: 2, label: "👥 兩人世界" },
  { value: 3, label: "👨‍👩‍👧 核心家庭 (3人)" },
  { value: 4, label: "👨‍👩‍👧‍👦 四口之家" },
  { value: 5, label: "🏡 大家庭 (5人)" },
  { value: 6, label: "🏡 三代同堂 (6人+)" },
];


function SimulatorContent() {
  const searchParams = useSearchParams();
  const tabFromParam = (v: string | null): TabId =>
    v === "housing" || v === "mc" || v === "goal" ? v : "basic";
  const initialTab = tabFromParam(searchParams.get("tab"));

  const [activeTab, setActiveTab] = useState<TabId>(initialTab);

  // 分頁列的方向鍵導覽（WAI-ARIA tabs pattern）
  const onTabKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const idx = TAB_ORDER.indexOf(activeTab);
    let next: number | null = null;
    if (e.key === "ArrowRight") next = (idx + 1) % TAB_ORDER.length;
    else if (e.key === "ArrowLeft") next = (idx - 1 + TAB_ORDER.length) % TAB_ORDER.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = TAB_ORDER.length - 1;
    if (next === null) return;
    e.preventDefault();
    setActiveTab(TAB_ORDER[next]);
    document.getElementById(`tab-${TAB_ORDER[next]}`)?.focus();
  };

  useEffect(() => {
    setActiveTab(tabFromParam(searchParams.get("tab")));
  }, [searchParams]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [saveName, setSaveName] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  // Goal Planner (目標回推) targets
  const [targetAssets, setTargetAssets] = useState(30000000); // 預設 3,000 萬
  const [targetYears, setTargetYears] = useState(20); // 預設 20 年

  // Basic params
  const [basicParams, setBasicParams] = useState<BasicParams>({
    currentAssets: 500000,
    monthlyIncome: 50000,
    monthlyExpense: 30000,
    monthlyInvestment: 15000,
    annualReturn: 7,
    investmentYears: 30,
    inflationRate: 2,
    salaryGrowthRate: 3,
    leverageAmount: 0,
    leverageRate: 2.5,
    leverageYears: 7,
    leverageRecurYears: 0,
    isEventsEnabled: false,
    customEvents: [],
    frictionRate: 0.3,
    isInsuranceEnabled: false,
    insurancePremium: 1500,
    isBankerEnabled: false,
  });

  const [isLeverageEnabled, setIsLeverageEnabled] = useState(false);

  // Life stages (global)
  const [lifeStages, setLifeStages] = useState<LifeStage[]>([
    { endYear: 10, familySize: 1 },
    { endYear: 30, familySize: 3 },
    { endYear: 50, familySize: 2 },
  ]);

  // Housing params
  const [housingParams, setHousingParams] = useState<HousingParams>({
    initialCapital: 5000000,
    housePrice: 15000000,
    downPaymentPercent: 20,
    loanRate: 2.1,
    loanYears: 30,
    monthlyRent: 18000,
    rentIncreaseRate: 2,
    investReturn: 7,
    maintenanceRate: 1,
    houseAppreciationRate: 2,
    yearsToCompare: 50,
    graceYears: 0,
  });

  useEffect(() => {
    setScenarios(getScenarios());
  }, []);

  const [mcParams, setMcParams] = useState<MCParams>({
    phase: "accumulation",
    volatility: 15,
    isScenarioEnabled: false,
    scenarioId: "custom",
    blackSwanYear: 5, // 滑桿最小值是 1；若為 0 會讓劇本靜默不生效
    blackSwanDrop: 30,
    isJumpEnabled: false,
    jumpProbability: 5,
    jumpImpact: 20,
    isDynamic: false,
    dynamicRatio: 20,
  });
  const [mcResult, setMcResult] = useState<MCResult | null>(null);
  const [isLoadingMC, setIsLoadingMC] = useState(false);
  const [mcError, setMcError] = useState("");
  // 記住上次成功模擬時的輸入快照；任何會影響結果的參數一變動就與快照不同 → 結果過期，結果區顯示重新執行提示
  const [mcResultInputsKey, setMcResultInputsKey] = useState<string | null>(null);
  const mcInputsKey = JSON.stringify({ mcParams, basicParams, lifeStages, isLeverageEnabled });
  const isMcStale = mcResult !== null && mcResultInputsKey !== mcInputsKey;

  const updateMC = useCallback(<K extends keyof MCParams>(key: K, val: MCParams[K]) => {
    setMcParams((p) => ({ ...p, [key]: val }));
  }, []);


  const runMonteCarlo = async () => {
    setIsLoadingMC(true);
    setMcError("");
    try {
      let scenarioEvents: { year: number, drop: number }[] = [];
      if (mcParams.isScenarioEnabled && mcParams.scenarioId !== "none") {
        const activeScenario = CRISIS_SCENARIOS.find(s => s.id === mcParams.scenarioId);
        const startYear = mcParams.blackSwanYear;

        scenarioEvents = activeScenario?.id === "custom"
          ? (startYear > 0 ? [{ year: startYear, drop: mcParams.blackSwanDrop }] : [])
          : (startYear > 0 ? (activeScenario?.events.map(ev => ({ year: startYear + ev.year, drop: ev.drop })) || []) : []);
        // 落在模擬期之外的事件直接丟掉，避免被後端夾到最後一年憑空製造崩盤
        scenarioEvents = scenarioEvents.filter(ev => ev.year >= 1 && ev.year <= basicParams.investmentYears);
      }

      // 與複利試算同一套假設：理專模式下報酬率扣摩擦損耗、保費逐月扣款
      const frictionAdjustedReturn = basicParams.isBankerEnabled
        ? Math.max(0, basicParams.annualReturn - (basicParams.frictionRate ?? 0))
        : basicParams.annualReturn;
      const monthlyInsurance = basicParams.isBankerEnabled && basicParams.isInsuranceEnabled
        ? (basicParams.insurancePremium ?? 0)
        : 0;

      const payload = {
        initialAssets: basicParams.currentAssets,
        monthlyContribution: mcParams.phase === "accumulation" ? basicParams.monthlyInvestment : 0,
        monthlyWithdrawal: mcParams.phase === "decumulation" ? basicParams.monthlyExpense : 0,
        monthlyInsurance,
        years: basicParams.investmentYears,
        expectedReturn: frictionAdjustedReturn,
        volatility: mcParams.volatility,
        inflationMean: basicParams.inflationRate,
        blackSwanEvents: scenarioEvents,
        jumpProbability: mcParams.isJumpEnabled ? mcParams.jumpProbability : 0,
        jumpImpact: mcParams.jumpImpact,
        isDynamic: mcParams.isDynamic,
        dynamicRatio: mcParams.dynamicRatio,
        lifeStages: lifeStages,
        salaryGrowthRate: basicParams.salaryGrowthRate,
        leverageAmount: isLeverageEnabled ? (basicParams.leverageAmount || 0) : 0,
        leverageRate: isLeverageEnabled ? (basicParams.leverageRate || 0) : 0,
        leverageYears: isLeverageEnabled ? (basicParams.leverageYears || 0) : 0,
        leverageRecurYears: isLeverageEnabled ? (basicParams.leverageRecurYears || 0) : 0,
      };

      const API_URL = process.env.NEXT_PUBLIC_MC_API_URL;
      if (!API_URL) {
        throw new Error("Missing API URL configured in environment variables.");
      }

      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: unknown = await res.json();
      if (!isMCResult(data)) throw new Error("Unexpected response shape");
      setMcResult(data);
      setMcResultInputsKey(mcInputsKey);
    } catch {
      setMcError("模擬失敗，請稍後再試或檢查網路連線。");
    } finally {
      setIsLoadingMC(false);
    }
  };

  const updateBasic = useCallback(<K extends keyof BasicParams>(key: K, val: BasicParams[K]) => {
    setBasicParams((p) => ({ ...p, [key]: val }));
  }, []);

  const updateHousing = useCallback((key: keyof HousingParams, val: number) => {
    setHousingParams((p) => ({ ...p, [key]: val }));
  }, []);

  // Compute results
  const projectionData = useMemo(() => calculateProjection(basicParams), [basicParams]);
  const housingData = useMemo(() => calculateHousingCompare(housingParams), [housingParams]);
  const fireYears = useMemo(() => calculateFIREAge(basicParams, lifeStages), [basicParams, lifeStages]);

  const computedMonthlyLoan = useMemo(() => {
    return Math.round(calculateMonthlyLoanPayment(basicParams.leverageAmount || 0, basicParams.leverageRate || 0, basicParams.leverageYears || 0));
  }, [basicParams.leverageAmount, basicParams.leverageRate, basicParams.leverageYears]);

  const computedMortgage = useMemo(() => {
    const downPayment = housingParams.housePrice * (housingParams.downPaymentPercent / 100);
    const loanAmount = housingParams.housePrice - downPayment;
    return Math.round(calculateMonthlyMortgage(loanAmount, housingParams.loanRate, housingParams.loanYears));
  }, [housingParams.housePrice, housingParams.downPaymentPercent, housingParams.loanRate, housingParams.loanYears]);

  // 有寬限期時，StatCard 顯示寬限期後的本息攤還（與左側試算卡一致）
  const displayMortgage = useMemo(() => {
    const graceYears = housingParams.graceYears ?? 0;
    if (graceYears <= 0) return computedMortgage;
    const loanAmount = housingParams.housePrice * (1 - housingParams.downPaymentPercent / 100);
    const remainingYears = Math.max(1, housingParams.loanYears - graceYears);
    return Math.round(calculateMonthlyMortgage(loanAmount, housingParams.loanRate, remainingYears));
  }, [computedMortgage, housingParams.graceYears, housingParams.housePrice, housingParams.downPaymentPercent, housingParams.loanRate, housingParams.loanYears]);

  const finalAssets = projectionData[projectionData.length - 1]?.assets || 0;
  const finalPortfolio = projectionData[projectionData.length - 1]?.portfolioValue || 0;
  const finalLoan = projectionData[projectionData.length - 1]?.loanBalance || 0;
  const totalInvested = projectionData[projectionData.length - 1]?.invested || 0;
  const totalReturns = projectionData[projectionData.length - 1]?.returns || 0;
  const monthlyPassiveIncome = finalAssets * 0.04 / 12;

  const housingFinal = housingData[housingData.length - 1];
  const housingDiff = housingFinal ? housingFinal.rentNetWorth - housingFinal.buyNetWorth : 0;

  const handleSave = () => {
    if (!saveName.trim()) {
      setSaveMessage("請輸入劇本名稱");
      return;
    }
    if (!canSaveMore()) {
      setSaveMessage("最多可存 3 組劇本，請先刪除一組再存檔");
      return;
    }
    const result = saveScenario({
      name: saveName.trim(),
      params: basicParams,
      housingParams,
      mcParams,
      lifeStages,
    });
    if (result) {
      setScenarios(getScenarios());
      setSaveName("");
      setSaveMessage("✅ 已儲存！");
      setTimeout(() => setSaveMessage(""), 2000);
    }
  };

  const handleLoad = (scenario: Scenario) => {
    setBasicParams({
      frictionRate: 0.3,
      isInsuranceEnabled: false,
      insurancePremium: 1500,
      isBankerEnabled: false,
      ...scenario.params,
    });
    if (scenario.housingParams) {
      setHousingParams({
        graceYears: 0,
        ...scenario.housingParams,
      });
    }
    if (scenario.mcParams) {
      setMcParams((prev) => ({
        ...prev,
        ...scenario.mcParams,
        isJumpEnabled: scenario.mcParams?.isJumpEnabled || false,
        isScenarioEnabled: scenario.mcParams?.isScenarioEnabled || false,
        blackSwanYear: Math.max(1, scenario.mcParams?.blackSwanYear || 1), // 舊劇本可能存了 0
      }));
    }
    if (Array.isArray(scenario.lifeStages) && scenario.lifeStages.length === 3) {
      setLifeStages(scenario.lifeStages);
    }
    setIsLeverageEnabled((scenario.params.leverageAmount || 0) > 0);
    setSaveMessage(`✅ 已載入「${scenario.name}」`);
    setTimeout(() => setSaveMessage(""), 2000);
  };


  const handleDelete = (id: string) => {
    deleteScenario(id);
    setScenarios(getScenarios());
  };

  const handleEventClick = useCallback((year: number, index: number) => {
    const element = document.getElementById(`life-event-${year}-${index}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      element.classList.add("highlight-blink");
      setTimeout(() => {
        element.classList.remove("highlight-blink");
      }, 3000);
    }
  }, []);


  return (
    <>
      <Navbar />
      <main className="flex-1 pt-20 pb-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl sm:text-4xl font-bold mb-3">
              財務<span style={{ color: "var(--accent-primary)" }}>沙盤推演</span>
            </h1>
            <p className="text-base" style={{ color: "var(--text-secondary)" }}>
              拖動滑桿即時看到你的財務未來走向。複利試算、目標回推與租屋 vs 買房完全在你的瀏覽器中完成、資料不會上傳；蒙地卡羅壓測因運算量大，會將你設定的參數傳送到雲端進行 1,000 次模擬。
            </p>
          </div>

          {/* Tabs — kept above any content that changes size per tab, so the nav row itself never jumps when switching */}
          <div
            role="tablist"
            aria-label="分析模式"
            onKeyDown={onTabKeyDown}
            className="flex gap-2 mb-6 p-1 rounded-xl w-fit max-w-full overflow-x-auto no-print"
            style={{ background: "var(--bg-secondary)" }}
          >
            {([
              ["basic", "📈 複利試算"],
              ["goal", "🎯 目標回推"],
              ["mc", "🎲 蒙地卡羅壓測"],
              ["housing", "🏠 租屋 vs 買房"],
            ] as [TabId, string][]).map(([id, label]) => (
              <button
                key={id}
                id={`tab-${id}`}
                role="tab"
                aria-selected={activeTab === id}
                aria-controls={`panel-${id}`}
                tabIndex={activeTab === id ? 0 : -1}
                className={`tab-button shrink-0 whitespace-nowrap ${activeTab === id ? "active" : ""}`}
                onClick={() => setActiveTab(id)}
              >
                {label}
              </button>
            ))}
          </div>

          {/* === Global Config Band (basic/mc/goal only — housing uses its own independent params) === */}
          {activeTab !== "housing" && (
            <div className="glass-card p-5 mb-6 relative overflow-hidden" style={{ border: "1px solid var(--accent-primary-dim)" }}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--accent-primary)" }}>
                    <span className="w-1.5 h-4 rounded-full bg-blue-500" />
                    全局基礎參數
                  </span>
                  <span className="text-xs opacity-70" style={{ color: "var(--text-muted)" }}>（影響「複利試算」「蒙地卡羅壓測」與「目標回推」）</span>
                </div>

                {/* 市場假設快捷鍵（資產類別，非具名標的 —— 見 MARKET_PRESETS 上方註解） */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-medium mr-1" style={{ color: "var(--text-secondary)" }}>
                    快速套用市場假設<span className="font-normal" style={{ color: "var(--text-muted)" }}>（各資產類別的歷史統計，可自行調整）</span>：
                  </span>
                  {MARKET_PRESETS.map((preset) => {
                    const isSelected = basicParams.annualReturn === preset.return && mcParams.volatility === preset.vol;
                    return (
                    <button
                      key={preset.name}
                      onClick={() => {
                        updateBasic("annualReturn", preset.return);
                        updateMC("volatility", preset.vol);
                      }}
                      className={`px-2.5 py-1 text-[11px] rounded-full border transition-all cursor-pointer active:scale-95 ${isSelected ? "" : "chip-button"}`}
                      style={isSelected ? {
                        borderColor: "var(--accent-primary)",
                        background: "var(--accent-primary-dim)",
                        color: "var(--accent-primary)",
                        fontWeight: 600,
                      } : undefined}
                    >
                      {preset.name}
                    </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-6 gap-y-4">
                <CompactInput label="現有資產" value={basicParams.currentAssets} onChange={(v) => updateBasic("currentAssets", v)} unit="元" step={100000} min={0} max={150000000} />
                <CompactInput label="計畫年數" value={basicParams.investmentYears} onChange={(v) => updateBasic("investmentYears", v)} unit="年" step={1} min={1} max={50} />
                <CompactInput label="年化報酬率" value={basicParams.annualReturn} onChange={(v) => updateBasic("annualReturn", v)} unit="%" step={0.5} min={0} max={20} />
                <CompactInput label="通膨率" value={basicParams.inflationRate} onChange={(v) => updateBasic("inflationRate", v)} unit="%" step={0.5} min={0} max={10} />
                <CompactInput label="年調薪幅度" value={basicParams.salaryGrowthRate} onChange={(v) => updateBasic("salaryGrowthRate", v)} unit="%" step={0.5} min={0} max={10} />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* ===== Left Panel: Tab-Specific Controls ===== */}
            <div className="lg:col-span-4">
              {/* 短視窗時面板可自行捲動，避免 sticky 把底部滑桿卡在畫面外 */}
              <div className="glass-card p-6 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
                {activeTab === "basic" && (
                  <BasicTab
                    basicParams={basicParams}
                    updateBasic={updateBasic}
                    isLeverageEnabled={isLeverageEnabled}
                    setIsLeverageEnabled={setIsLeverageEnabled}
                    computedMonthlyLoan={computedMonthlyLoan}
                  />
                )}

                {activeTab === "housing" && (
                  <HousingTab
                    housingParams={housingParams}
                    updateHousing={updateHousing}
                    computedMortgage={computedMortgage}
                  />
                )}

                {activeTab === "mc" && (
                  <MonteCarloTab
                    mcParams={mcParams}
                    updateMC={updateMC}
                    basicParams={basicParams}
                    updateBasic={updateBasic}
                    isLeverageEnabled={isLeverageEnabled}
                    setIsLeverageEnabled={setIsLeverageEnabled}
                    computedMonthlyLoan={computedMonthlyLoan}
                    runMonteCarlo={runMonteCarlo}
                    isLoadingMC={isLoadingMC}
                  />
                )}

                {activeTab === "goal" && (
                  <GoalPlannerInputs
                    targetAssets={targetAssets}
                    setTargetAssets={setTargetAssets}
                    targetYears={targetYears}
                    setTargetYears={setTargetYears}
                    basicParams={basicParams}
                    updateBasic={updateBasic}
                  />
                )}

                {(activeTab === "basic" || activeTab === "housing") && (
                  <ScenarioManager
                    scenarios={scenarios}
                    saveName={saveName}
                    setSaveName={setSaveName}
                    handleSave={handleSave}
                    handleLoad={handleLoad}
                    handleDelete={handleDelete}
                    saveMessage={saveMessage}
                  />
                )}
              </div>
            </div>

            {/* ===== Right Panel: Results ===== */}
            <div className="lg:col-span-8 space-y-6" role="tabpanel" id={`panel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>

              {/* === Life Path Panel (basic + mc only) === */}
              {(activeTab === "basic" || activeTab === "mc") && (
                <div className="glass-card p-5">
                  <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
                    <span className="w-1.5 h-4 rounded-full bg-violet-500" />
                    🧬 人生路徑發展 (Life Path)
                    <span className="text-xs font-normal ml-1" style={{ color: "var(--text-muted)" }}>— 設定各階段家庭規模，自動套用經濟學遞減開支模型</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {lifeStages.map((stage, i) => (
                      <div key={i} className="p-4 rounded-xl flex flex-col gap-3" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)" }}>
                        <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{STAGE_LABELS[i]}</div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs shrink-0" style={{ color: "var(--text-muted)" }}>至第</span>
                          <input
                            type="number"
                            aria-label={`${STAGE_LABELS[i]} 持續到第幾年`}
                            value={stage.endYear}
                            onChange={(e) => { const v = [...lifeStages]; v[i] = {...v[i], endYear: Math.max(1, Math.min(50, Number(e.target.value)))}; setLifeStages(v); }}
                            className="input-field !w-20 !py-1 !px-2 text-sm text-center"
                            min={1} max={50}
                          />
                          <span className="text-xs shrink-0" style={{ color: "var(--text-muted)" }}>年</span>
                        </div>
                        <select
                          aria-label={`${STAGE_LABELS[i]} 家庭規模`}
                          value={stage.familySize}
                          onChange={(e) => { const v = [...lifeStages]; v[i] = {...v[i], familySize: Number(e.target.value)}; setLifeStages(v); }}
                          className="w-full p-2 rounded-lg border text-sm"
                          style={{ background: "var(--bg-primary)", borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
                        >
                          {FAMILY_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                        <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                          開支乘數：<span className="font-semibold" style={{ color: "var(--accent-primary)" }}>{FAMILY_MULTIPLIERS[stage.familySize]}x</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* === Tab-specific Results === */}
              {activeTab === "basic" ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <StatCard 
                      label="最終淨資產" 
                      value={formatTWD(finalAssets)} 
                      sub={`${basicParams.investmentYears} 年後`} 
                      color="var(--accent-primary)" 
                    />
                    <StatCard 
                      label="最終投資市值" 
                      value={formatTWD(finalPortfolio)} 
                      sub={finalLoan > 0 ? `(含未還貸款 ${formatTWD(finalLoan)})` : "投資總規模"} 
                      color="#3b82f6" 
                    />
                    <StatCard label="投資報酬" value={formatTWD(totalReturns)} sub={`報酬率 ${totalInvested > 0 ? ((totalReturns / totalInvested) * 100).toFixed(0) : 0}%`} color="var(--accent-success)" />
                    <StatCard label="月被動收入" value={formatTWD(monthlyPassiveIncome)} sub="最終名目淨資產 × 4% ÷ 12" color="var(--accent-secondary)" />
                  </div>

                  {fireYears !== null ? (
                    <div className="glass-card p-5 flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl animate-float" style={{ background: "var(--accent-primary-dim)" }}>🔥</div>
                      <div>
                        <p className="text-base" style={{ color: "var(--text-secondary)" }}>預計達成財務自由</p>
                        <p className="text-3xl font-bold my-1"><span style={{ color: "var(--accent-primary)" }}>{fireYears}</span> 年後</p>
                        <p className="text-sm" style={{ color: "var(--text-muted)" }}>被動收入 ≥ 通膨調整後年支出（4% 法則）</p>
                      </div>
                    </div>
                  ) : (
                    <div className="glass-card p-5 flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl" style={{ background: "rgba(239, 68, 68, 0.15)" }}>⚠️</div>
                      <div>
                        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>以目前參數，100 年內無法達成財務自由</p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>試試提高月投資額或年化報酬率</p>
                      </div>
                    </div>
                  )}

                  <div className="glass-card p-5">
                    <h3 className="font-semibold text-base mb-4" style={{ color: "var(--text-secondary)" }}>資產成長曲線</h3>
                    <ProjectionChart
                      data={projectionData}
                      events={basicParams.isEventsEnabled ? basicParams.customEvents : []}
                      onEventClick={handleEventClick}
                    />
                  </div>

                  <div className="glass-card p-5">
                    <h3 className="font-semibold text-sm mb-3" style={{ color: "var(--text-secondary)" }}>📋 圖表名詞說明</h3>
                    <ul className="space-y-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
                      {isLeverageEnabled && (
                        <li>• <b>投資帳戶總市值</b>：帳戶內全部資金的市值，含借貸投入市場的錢，尚未扣除還欠的貸款本金。</li>
                      )}
                      <li>• <b>名目總資產</b>：{isLeverageEnabled ? "投資帳戶總市值再扣除尚未還清的貸款本金" : "投資帳戶市值"}，也就是當年帳面上的實際淨資產（未考慮通膨）。</li>
                      <li>• <b>真實淨資產</b>：把名目總資產換算成「今天的購買力」，反映通膨侵蝕後實際能買到多少東西。</li>
                      <li>• <b>投入本金</b>：累計自己實際投入的資金（不含借貸），作為對照市場報酬貢獻的基準線。</li>
                      <li>• 年限越長、通膨累積越多，名目總資產與真實淨資產兩線會逐漸拉開。</li>
                    </ul>
                  </div>
                </>
              ) : activeTab === "housing" ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <StatCard label="租屋淨資產" value={formatTWD(housingFinal?.rentNetWorth || 0)} sub={`${housingParams.yearsToCompare} 年後`} color={housingDiff > 0 ? "var(--accent-primary)" : "var(--text-secondary)"} />
                    <StatCard label="買房淨資產" value={formatTWD(housingFinal?.buyNetWorth || 0)} sub={`${housingParams.yearsToCompare} 年後`} color={housingDiff <= 0 ? "var(--accent-primary)" : "var(--text-secondary)"} />
                    <StatCard label="差額" value={`${housingDiff > 0 ? "租屋勝" : "買房勝"} ${formatTWD(Math.abs(housingDiff))}`} color={housingDiff > 0 ? "var(--accent-success)" : "var(--accent-secondary)"} />
                    <StatCard label={(housingParams.graceYears ?? 0) > 0 ? "月房貸 (寬限期後)" : "月房貸"} value={formatTWD(displayMortgage)} sub={`vs 月租 ${formatTWD(housingParams.monthlyRent)}`} />
                  </div>
                  <div className="glass-card p-5">
                    <h3 className="font-semibold text-base mb-4" style={{ color: "var(--text-secondary)" }}>淨資產對比曲線</h3>
                    <CompareChart data={housingData} loanYears={housingParams.loanYears} yearsToCompare={housingParams.yearsToCompare} />
                  </div>
                  <div className="glass-card p-5">
                    <h3 className="font-semibold text-sm mb-3" style={{ color: "var(--text-secondary)" }}>📋 模型假設說明</h3>
                    <ul className="space-y-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
                      <li>• <b>核心公平假設</b>：兩者每月拿出口袋的現金總額完全相同，較便宜的一方將每月盈餘全額投入市場。</li>
                      <li>• 首月兩方案的起跑淨資產完全相同（皆等於「初始總資金」）。</li>
                      <li>• 租屋方案資產 100% 來自投資市值；買房方案 = 房屋市值 + 投資市值 - 剩餘房貸。</li>
                      <li>• 為求單純化，未計入交易成本落差（仲介費、土增稅、契稅等）。</li>
                      <li>• 本比較僅供推演參考，不構成買賣建議。</li>
                    </ul>
                  </div>
                </>
              ) : activeTab === "mc" ? (
                <>
                  {!mcResult ? (
                    <div className="glass-card p-10 flex flex-col items-center justify-center text-center min-h-[400px]">
                      <div className="text-6xl mb-4 opacity-50 animate-float">🎲</div>
                      <h3 className="text-xl font-bold mb-2">準備好進行真實世界壓力測試了嗎？</h3>
                      <p className="text-sm max-w-md mx-auto" style={{ color: "var(--text-secondary)" }}>
                        真實市場不會永遠每年穩定成長。蒙地卡羅演算法將根據波動率與基礎參數，透過 AWS 雲端瞬間模擬 1,000 種不同的經濟走勢，統整出你的財富生存機率。
                      </p>
                      <button
                        onClick={runMonteCarlo}
                        disabled={isLoadingMC}
                        className="mt-6 px-6 py-2 rounded-full font-medium cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2"
                        style={{ background: "var(--accent-primary-dim)", color: "var(--accent-primary)", "--tw-ring-color": "var(--accent-primary)" } as React.CSSProperties}
                      >
                        {isLoadingMC ? "模擬中…" : "🚀 立即開始模擬"}
                      </button>
                      {mcError && (
                        <div role="alert" className="mt-4 px-4 py-2.5 rounded-lg text-sm" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }}>
                          ⚠️ {mcError}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {isMcStale && (
                        <div role="status" className="px-4 py-2.5 rounded-lg text-sm flex flex-wrap items-center justify-between gap-3" style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", color: "#fbbf24" }}>
                          <span>⚠️ 參數已變更，以下結果是用舊參數算出來的。</span>
                          <button
                            onClick={runMonteCarlo}
                            disabled={isLoadingMC}
                            className="shrink-0 font-semibold underline underline-offset-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded"
                          >
                            {isLoadingMC ? "重新模擬中…" : "重新執行模擬"}
                          </button>
                        </div>
                      )}
                      {mcError && (
                        <div role="alert" className="px-4 py-2.5 rounded-lg text-sm" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }}>
                          ⚠️ {mcError}
                        </div>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="glass-card p-5 relative overflow-hidden flex flex-col justify-center">
                          <div className={`absolute top-0 right-0 w-24 h-24 blur-3xl opacity-20 ${mcResult.successRate > 90 ? 'bg-green-500' : mcResult.successRate > 70 ? 'bg-yellow-500' : 'bg-red-500'}`} />
                          <p className="text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>財務安全大動脈 (成功率)</p>
                          <p className="text-4xl font-bold" style={{ color: mcResult.successRate > 90 ? 'var(--accent-success)' : mcResult.successRate > 70 ? '#f59e0b' : '#ef4444' }}>
                            {mcResult.successRate}%
                          </p>
                          <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
                            {mcResult.successRate > 90 ? "安全" : mcResult.successRate > 70 ? "需留意" : "高風險"} · 1,000 次模擬中未破產機率
                          </p>
                        </div>
                        <div className="glass-card p-5 flex flex-col justify-center">
                          <p className="text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>中位數淨資產 (P50)</p>
                          <p className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>{formatTWD(mcResult.medianEndingWealth)}</p>
                          <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>第 {basicParams.investmentYears} 年有 50% 機率高於此值</p>
                        </div>
                        <div className="glass-card p-5 flex flex-col justify-center">
                          <p className="text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>極端慘況底線 (P10)</p>
                          <p className="text-3xl font-bold text-red-400">
                            {formatTWD(mcResult.percentilePaths[mcResult.percentilePaths.length - 1].p10)}
                          </p>
                          <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>連跌加上黑天鵝的最差 10% 運氣</p>
                        </div>
                      </div>
                      <div className="glass-card p-5">
                        <h3 className="font-semibold text-base mb-4" style={{ color: "var(--text-secondary)" }}>1,000 次平行宇宙扇形軌跡 (Fan Chart)</h3>
                        <FanChart data={mcResult.percentilePaths} />
                      </div>
                      <div className="glass-card p-5">
                        <h3 className="font-semibold text-sm mb-3" style={{ color: "var(--text-secondary)" }}>📋 模型假設說明</h3>
                        <ul className="space-y-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
                          <li>• 每次執行固定模擬 1,000 條路徑：每年抽一個年報酬（對數常態分佈，期望值 = 年化報酬率、標準差 = 波動率），再換成月利率逐月結算投入、支出與貸款本息。</li>
                          <li>• <b>破產定義</b>：投資帳戶在任一年底歸零、無法再支付支出或貸款。成功率 = 未破產路徑的比例；財富累積期若每月投入大於支出，破產機率必為 0。</li>
                          <li>• 圖表與中位數顯示的是<b>名目淨資產</b>（已扣除尚未還清的貸款，未折算通膨），與複利試算的「真實淨資產」基準不同。</li>
                          <li>• 退休提領金額每年依通膨率成長並乘上人生路徑的家庭開支乘數；每月投入依年調薪幅度成長。</li>
                          <li>• 歷史災難劇本會讓該年所有路徑同步下跌指定幅度；跳躍擴散則是每年以設定機率額外承受一次崩盤；動態提領在前一年報酬為負時按比例縮減當年生活費。</li>
                          <li>• 理專模式的摩擦損耗會從年化報酬率扣除、保費逐月扣款；<b>未納入</b>人生重大事件。</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </>
              ) : activeTab === "goal" ? (
                <GoalPlannerResults
                  currentAssets={basicParams.currentAssets}
                  currentReturn={basicParams.annualReturn}
                  currentInvestment={basicParams.monthlyInvestment}
                  salaryGrowthRate={basicParams.salaryGrowthRate}
                  targetAssets={targetAssets}
                  targetYears={targetYears}
                />
              ) : null}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function SimulatorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex text-center items-center justify-center pt-20">載入中...</div>}>
      <SimulatorContent />
    </Suspense>
  );
}
