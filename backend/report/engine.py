"""
LifeScope 報告用試算引擎（Python 版）

這是 lib/calculator.ts 的逐行移植：複利試算、FIRE 年數、租買比較、目標回推。
維持與前端完全相同的複利慣例（有效月利率、月初投入、貸款用名目利率 /12），
這樣 PDF 報告上的數字會與網站畫面對得起來。

蒙地卡羅不在這裡重寫，直接 import backend/monte_carlo/lambda_function.run_simulation。
"""
from __future__ import annotations

import math
import os
import sys
from dataclasses import dataclass, field
from typing import Optional

# 讓 report 套件可以直接重用 Lambda 引擎，不複製一份程式碼
_MC_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "monte_carlo")
if _MC_DIR not in sys.path:
    sys.path.insert(0, _MC_DIR)
from lambda_function import run_simulation  # noqa: E402

FAMILY_MULTIPLIERS = {1: 1.0, 2: 1.6, 3: 2.2, 4: 2.8, 5: 3.4, 6: 4.0}

# 與 components/simulator/MonteCarloTab.tsx 的 CRISIS_SCENARIOS 同步
CRISIS_SCENARIOS = {
    "none": {"name": "無突發崩盤", "events": []},
    "custom": {"name": "單次自訂崩盤", "events": []},
    "dotcom_2008": {"name": "千禧年雙重打擊（網路泡沫 + 金融海嘯）",
                    "events": [{"year": 0, "drop": 40}, {"year": 8, "drop": 50}]},
    "great_depression": {"name": "1929 經濟大恐慌（連跌三年）",
                         "events": [{"year": 0, "drop": 30}, {"year": 1, "drop": 25}, {"year": 2, "drop": 25}]},
    "covid_inflation": {"name": "新冠恐慌與通膨緊縮（短期雙跌）",
                        "events": [{"year": 0, "drop": 30}, {"year": 2, "drop": 25}]},
}


# ---------------------------------------------------------------------------
# 參數資料類別（欄位名稱刻意沿用前端 camelCase，方便直接吃網站的劇本 JSON）
# ---------------------------------------------------------------------------
@dataclass
class CustomEvent:
    year: int
    name: str
    amount: float
    type: str = "one-time"  # one-time | interruption
    duration: int = 1
    isInsurable: bool = False


@dataclass
class BasicParams:
    currentAssets: float = 500_000
    monthlyIncome: float = 50_000
    monthlyExpense: float = 30_000
    monthlyInvestment: float = 15_000
    annualReturn: float = 7.0
    investmentYears: int = 30
    inflationRate: float = 2.0
    salaryGrowthRate: float = 3.0
    leverageAmount: float = 0.0
    leverageRate: float = 2.5
    leverageYears: int = 7
    leverageRecurYears: int = 0
    isLeverageEnabled: bool = False
    isEventsEnabled: bool = False
    customEvents: list[CustomEvent] = field(default_factory=list)
    frictionRate: float = 0.3
    isInsuranceEnabled: bool = False
    insurancePremium: float = 1_500
    isBankerEnabled: bool = False

    @classmethod
    def from_dict(cls, d: dict) -> "BasicParams":
        d = dict(d or {})
        events = [CustomEvent(**{k: v for k, v in e.items() if k in CustomEvent.__dataclass_fields__})
                  for e in d.pop("customEvents", []) or []]
        known = {k: v for k, v in d.items() if k in cls.__dataclass_fields__}
        p = cls(**known)
        p.customEvents = events
        return p


@dataclass
class HousingParams:
    initialCapital: float = 5_000_000
    housePrice: float = 15_000_000
    downPaymentPercent: float = 20
    loanRate: float = 2.1
    loanYears: int = 30
    monthlyRent: float = 18_000
    rentIncreaseRate: float = 2
    investReturn: float = 7
    maintenanceRate: float = 1
    houseAppreciationRate: float = 2
    yearsToCompare: int = 50
    graceYears: int = 0

    @classmethod
    def from_dict(cls, d: dict) -> "HousingParams":
        return cls(**{k: v for k, v in (d or {}).items() if k in cls.__dataclass_fields__})


@dataclass
class MCParams:
    phase: str = "accumulation"  # accumulation | decumulation
    volatility: float = 15
    isScenarioEnabled: bool = False
    scenarioId: str = "custom"
    blackSwanYear: int = 5
    blackSwanDrop: float = 30
    isJumpEnabled: bool = False
    jumpProbability: float = 5
    jumpImpact: float = 20
    isDynamic: bool = False
    dynamicRatio: float = 20

    @classmethod
    def from_dict(cls, d: dict) -> "MCParams":
        return cls(**{k: v for k, v in (d or {}).items() if k in cls.__dataclass_fields__})


# ---------------------------------------------------------------------------
# 基本工具
# ---------------------------------------------------------------------------
def annual_to_monthly_rate(annual_pct: float) -> float:
    """年化報酬率 → 有效月利率。貸款不要用這個（貸款是名目利率 /12）。"""
    return (1 + annual_pct / 100) ** (1 / 12) - 1


def monthly_loan_payment(principal: float, annual_rate_pct: float, years: int) -> float:
    if principal <= 0 or years <= 0:
        return 0.0
    if annual_rate_pct <= 0:
        return principal / (years * 12)
    r = annual_rate_pct / 100 / 12
    n = years * 12
    power = (1 + r) ** n
    return principal * r * power / (power - 1)


def family_multiplier(year: int, life_stages: list[dict]) -> float:
    if not life_stages:
        return 1.0
    for stage in life_stages:
        if year <= stage["endYear"]:
            return FAMILY_MULTIPLIERS.get(stage["familySize"], 1.0)
    return FAMILY_MULTIPLIERS.get(life_stages[-1]["familySize"], 1.0)


def format_twd(amount: float) -> str:
    """與前端 formatTWD 相同：≥1 億顯示「億」、≥1 萬顯示「萬」。"""
    if abs(amount) < 0.5:
        return "0"
    if abs(amount) >= 1e8:
        return f"{amount / 1e8:.2f} 億"
    if abs(amount) >= 1e4:
        return f"{amount / 1e4:.1f} 萬"
    return f"{round(amount):,}"


# ---------------------------------------------------------------------------
# 複利試算（calculateProjection）
# ---------------------------------------------------------------------------
def calculate_projection(p: BasicParams) -> list[dict]:
    actual_friction = p.frictionRate if p.isBankerEnabled else 0.0
    effective_return = max(0.0, p.annualReturn - actual_friction)
    monthly_rate = annual_to_monthly_rate(effective_return)

    lev_amount = p.leverageAmount if p.isLeverageEnabled else 0.0
    lev_years = p.leverageYears if p.isLeverageEnabled else 0
    lev_rate = p.leverageRate if p.isLeverageEnabled else 0.0
    lev_recur = p.leverageRecurYears if p.isLeverageEnabled else 0

    loan_principal = lev_amount if lev_years > 0 else 0.0
    loan_monthly_rate = lev_rate / 100 / 12
    assets = p.currentAssets + loan_principal
    total_invested = p.currentAssets
    payment = monthly_loan_payment(loan_principal, lev_rate, lev_years)
    remaining_loan = loan_principal

    data = [{
        "year": 0,
        "assets": round(assets - remaining_loan),
        "realAssets": round(assets - remaining_loan),
        "invested": round(total_invested),
        "returns": 0,
        "portfolioValue": round(assets),
        "loanBalance": round(remaining_loan),
        "eventImpact": 0,
    }]

    insurance = p.insurancePremium if (p.isBankerEnabled and p.isInsuranceEnabled) else 0.0

    for year in range(1, p.investmentYears + 1):
        is_recur = lev_recur > 0 and year > 1 and (year - 1) % lev_recur == 0
        if is_recur and loan_principal > 0 and remaining_loan < loan_principal:
            assets += loan_principal - remaining_loan
            remaining_loan = loan_principal

        adjusted_investment = p.monthlyInvestment * (1 + p.salaryGrowthRate / 100) ** (year - 1)

        for _ in range(12):
            loan_payment = 0.0
            if remaining_loan > 0:
                interest = remaining_loan * loan_monthly_rate
                principal_paid = min(max(0.0, payment - interest), remaining_loan)
                loan_payment = interest + principal_paid
                remaining_loan -= principal_paid
            assets = assets * (1 + monthly_rate) + adjusted_investment - loan_payment - insurance
            total_invested += adjusted_investment

        event_total = 0.0
        if p.isEventsEnabled:
            for ev in p.customEvents:
                if ev.type in (None, "one-time"):
                    active = ev.year == year
                elif ev.type == "interruption":
                    active = ev.year <= year < ev.year + (ev.duration or 1)
                else:
                    active = False
                if not active:
                    continue
                impact = ev.amount
                if ev.type == "interruption" and p.isBankerEnabled and p.isInsuranceEnabled and ev.isInsurable:
                    impact = 0.0
                event_total += impact
            assets += event_total
            total_invested += event_total

        discount = (1 + p.inflationRate / 100) ** year
        net = assets - remaining_loan
        data.append({
            "year": year,
            "assets": round(net),
            "realAssets": round(net / discount),
            "invested": round(total_invested),
            "returns": round(net - total_invested),
            "portfolioValue": round(assets),
            "loanBalance": round(remaining_loan),
            "eventImpact": event_total,
        })
    return data


def calculate_fire_year(p: BasicParams, life_stages: list[dict]) -> Optional[int]:
    """4% 法則：淨資產 × 4% ≥ 通膨與家庭規模調整後的年支出。100 年內達不到回傳 None。"""
    yearly_expense = p.monthlyExpense * 12
    long = BasicParams(**{**p.__dict__, "investmentYears": 100})
    for point in calculate_projection(long):
        if point["year"] == 0:
            continue
        mult = family_multiplier(point["year"], life_stages)
        adjusted = yearly_expense * mult * (1 + p.inflationRate / 100) ** point["year"]
        if point["assets"] * 0.04 >= adjusted:
            return point["year"]
    return None


# ---------------------------------------------------------------------------
# 租屋 vs 買房（calculateHousingCompare）
# ---------------------------------------------------------------------------
def _remaining_loan_balance(principal, annual_rate_pct, total_years, years_paid):
    r = annual_rate_pct / 100 / 12
    n = total_years * 12
    paid = years_paid * 12
    if r == 0:
        return principal * (1 - paid / n)
    f1 = (1 + r) ** n
    f2 = (1 + r) ** paid
    return principal * (f1 - f2) / (f1 - 1)


def calculate_housing_compare(h: HousingParams) -> list[dict]:
    down = h.housePrice * h.downPaymentPercent / 100
    loan = h.housePrice - down
    years_after_grace = max(1, h.loanYears - h.graceYears)
    mortgage_after_grace = monthly_loan_payment(loan, h.loanRate, years_after_grace)
    interest_only = loan * (h.loanRate / 100 / 12)
    m_rate = annual_to_monthly_rate(h.investReturn)

    rent_assets = h.initialCapital
    rent_cum = 0.0
    rent = h.monthlyRent
    buy_extra = h.initialCapital - down
    buy_cum = down
    house_value = h.housePrice

    data = [{
        "year": 0,
        "rentNetWorth": round(rent_assets),
        "buyNetWorth": round(house_value + buy_extra - loan),
        "rentCumCost": 0,
        "buyCumCost": round(down),
    }]
    for year in range(1, h.yearsToCompare + 1):
        maintenance = house_value * h.maintenanceRate / 100
        for _ in range(12):
            if year <= h.graceYears:
                mortgage = interest_only
            elif year <= h.loanYears:
                mortgage = mortgage_after_grace
            else:
                mortgage = 0.0
            buy_cost = mortgage + maintenance / 12
            rent_cost = rent
            budget = max(buy_cost, rent_cost)
            rent_assets = rent_assets * (1 + m_rate) + (budget - rent_cost)
            rent_cum += rent_cost
            buy_extra = buy_extra * (1 + m_rate) + (budget - buy_cost)
            buy_cum += buy_cost
        rent *= 1 + h.rentIncreaseRate / 100
        house_value *= 1 + h.houseAppreciationRate / 100

        if year <= h.graceYears:
            remaining = loan
        elif year < h.loanYears:
            remaining = _remaining_loan_balance(loan, h.loanRate, years_after_grace, year - h.graceYears)
        else:
            remaining = 0.0
        data.append({
            "year": year,
            "rentNetWorth": round(rent_assets),
            "buyNetWorth": round(house_value + buy_extra - remaining),
            "rentCumCost": round(rent_cum),
            "buyCumCost": round(buy_cum),
        })
    return data


def housing_crossover_year(rows: list[dict]) -> Optional[int]:
    """買房淨資產第一次追過租屋的年份（黃金交叉）。從未追過回傳 None。"""
    for row in rows[1:]:
        if row["buyNetWorth"] > row["rentNetWorth"]:
            return row["year"]
    return None


# ---------------------------------------------------------------------------
# 目標回推（GoalPlanner）
# ---------------------------------------------------------------------------
def project_goal_fv(initial, monthly, annual_pct, months, salary_growth=0.0):
    r = annual_to_monthly_rate(annual_pct)
    assets = initial
    for m in range(months):
        assets = assets * (1 + r) + monthly * (1 + salary_growth / 100) ** (m // 12)
    return assets


def required_monthly_investment(target, years, annual_pct, initial, salary_growth=0.0):
    if years <= 0:
        return 0
    months = years * 12
    from_principal = project_goal_fv(initial, 0, annual_pct, months, salary_growth)
    if from_principal >= target:
        return 0
    per_unit = project_goal_fv(0, 1, annual_pct, months, salary_growth)
    return round((target - from_principal) / per_unit)


def required_return(target, years, monthly, initial, salary_growth=0.0):
    if years <= 0:
        return None
    months = years * 12
    fv = lambda pct: project_goal_fv(initial, monthly, pct, months, salary_growth)  # noqa: E731
    if fv(0) >= target:
        return 0.0
    if fv(100) < target:
        return None
    lo, hi = 0.0, 100.0
    for _ in range(60):
        mid = (lo + hi) / 2
        v = fv(mid)
        if abs(v - target) < 100:
            return round(mid, 2)
        if v > target:
            hi = mid
        else:
            lo = mid
    return round((lo + hi) / 2, 2)


def required_years(target, monthly, annual_pct, initial, salary_growth=0.0):
    if initial >= target:
        return 0.0
    fv = lambda months: project_goal_fv(initial, monthly, annual_pct, months, salary_growth)  # noqa: E731
    lo, hi = 0, 100 * 12
    if fv(hi) < target:
        return None
    while lo < hi:
        mid = (lo + hi) // 2
        if fv(mid) >= target:
            hi = mid
        else:
            lo = mid + 1
    return round(lo / 12, 1)


# ---------------------------------------------------------------------------
# 蒙地卡羅 payload（與 app/simulator/page.tsx runMonteCarlo 相同的組法）
# ---------------------------------------------------------------------------
def build_mc_payload(p: BasicParams, mc: MCParams, life_stages: list[dict],
                     scenario_id: Optional[str] = None, black_swan_year: Optional[int] = None) -> dict:
    sid = scenario_id if scenario_id is not None else mc.scenarioId
    start = black_swan_year if black_swan_year is not None else mc.blackSwanYear
    events: list[dict] = []
    if sid != "none" and start > 0:
        if sid == "custom":
            events = [{"year": start, "drop": mc.blackSwanDrop}]
        else:
            events = [{"year": start + ev["year"], "drop": ev["drop"]}
                      for ev in CRISIS_SCENARIOS.get(sid, {"events": []})["events"]]
        events = [ev for ev in events if 1 <= ev["year"] <= p.investmentYears]

    friction_adjusted = max(0.0, p.annualReturn - p.frictionRate) if p.isBankerEnabled else p.annualReturn
    insurance = p.insurancePremium if (p.isBankerEnabled and p.isInsuranceEnabled) else 0.0
    lev = p.isLeverageEnabled
    return {
        "initialAssets": p.currentAssets,
        "monthlyContribution": p.monthlyInvestment if mc.phase == "accumulation" else 0,
        "monthlyWithdrawal": p.monthlyExpense if mc.phase == "decumulation" else 0,
        "monthlyInsurance": insurance,
        "years": p.investmentYears,
        "expectedReturn": friction_adjusted,
        "volatility": mc.volatility,
        "inflationMean": p.inflationRate,
        "blackSwanEvents": events,
        "jumpProbability": mc.jumpProbability if mc.isJumpEnabled else 0,
        "jumpImpact": mc.jumpImpact,
        "isDynamic": mc.isDynamic,
        "dynamicRatio": mc.dynamicRatio,
        "lifeStages": life_stages,
        "salaryGrowthRate": p.salaryGrowthRate,
        "leverageAmount": p.leverageAmount if lev else 0,
        "leverageRate": p.leverageRate if lev else 0,
        "leverageYears": p.leverageYears if lev else 0,
        "leverageRecurYears": p.leverageRecurYears if lev else 0,
    }


def run_mc(payload: dict, seed: Optional[int] = None) -> dict:
    return run_simulation(payload, seed=seed)
