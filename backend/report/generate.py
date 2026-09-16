"""
LifeScope 個人化報告產生器

用法：
    python generate.py order.json -o report.pdf
    python generate.py --sample            # 用 sample_order.json 跑一份範例

order.json 的格式見 sample_order.json；欄位名稱與網站的劇本 JSON 相同，
所以也可以直接把網站「儲存劇本」的內容貼進 params / housingParams / mcParams。
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import charts  # noqa: E402
from engine import (BasicParams, CRISIS_SCENARIOS, HousingParams, MCParams, build_mc_payload,  # noqa: E402
                    calculate_fire_year, calculate_housing_compare, calculate_projection, format_twd,
                    housing_crossover_year, monthly_loan_payment, project_goal_fv, required_monthly_investment,
                    required_return, required_years, run_mc)

DEFAULT_STAGES = [{"endYear": 10, "familySize": 1}, {"endYear": 30, "familySize": 3}, {"endYear": 50, "familySize": 2}]
STAGE_NAMES = {1: "單身", 2: "兩人", 3: "三人", 4: "四人", 5: "五人", 6: "六人"}


def _pct(x: float) -> str:
    return f"{x:.1f}%"


def compute(order: dict) -> dict:
    p = BasicParams.from_dict(order.get("params", {}))
    if "isLeverageEnabled" in order:
        p.isLeverageEnabled = bool(order["isLeverageEnabled"])
    mc = MCParams.from_dict(order.get("mcParams") or order.get("mc") or {})
    stages = order.get("lifeStages") or DEFAULT_STAGES
    stages = sorted(stages, key=lambda s: s["endYear"])
    goal_in = order.get("goal") or {}
    target = float(goal_in.get("targetAssets", 30_000_000))
    goal_years = int(goal_in.get("targetYears", 20))
    seed = int(order.get("seed", 20260916))
    client = order.get("client") or {}

    # ---- 1. 複利 ----
    rows = calculate_projection(p)
    fire = calculate_fire_year(p, stages)
    milestones = [r for r in rows if r["year"] % 5 == 0 or r["year"] == rows[-1]["year"]]
    last = rows[-1]
    real_ratio = last["realAssets"] / last["assets"] if last["assets"] else 0
    proj_comment = (
        f"照目前每月投入 {format_twd(p.monthlyInvestment)}、年調薪 {p.salaryGrowthRate:g}%、預期報酬 {p.annualReturn:g}% 走，"
        f"{p.investmentYears} 年後名目淨資產約 {format_twd(last['assets'])}，其中本金 {format_twd(last['invested'])}、"
        f"報酬 {format_twd(last['returns'])}。以 {p.inflationRate:g}% 通膨折算，這筆錢相當於今天的 {format_twd(last['realAssets'])}，"
        f"購買力只剩名目的 {real_ratio:.0%}。看規劃時請用「今日購買力」那條線，名目數字會讓人高估。"
    )
    if fire is not None:
        proj_comment += f" 依 4% 法則，第 {fire} 年起淨資產的 4% 就能支付當年的家庭開支。"
    else:
        proj_comment += " 依 4% 法則，這組參數在 100 年內無法讓 4% 的淨資產覆蓋家庭開支；需要提高投入或降低支出。"

    # ---- 2. 目標 ----
    pace = [project_goal_fv(p.currentAssets, p.monthlyInvestment, p.annualReturn, y * 12, p.salaryGrowthRate)
            for y in range(goal_years + 1)]
    req_m = required_monthly_investment(target, goal_years, p.annualReturn, p.currentAssets, p.salaryGrowthRate)
    req_r = required_return(target, goal_years, p.monthlyInvestment, p.currentAssets, p.salaryGrowthRate)
    req_y = required_years(target, p.monthlyInvestment, p.annualReturn, p.currentAssets, p.salaryGrowthRate)
    gap = target - pace[-1]
    if gap <= 0:
        goal_comment = (f"照目前步調，{goal_years} 年後約有 {format_twd(pace[-1])}，已超過目標 {format_twd(target)}，"
                        f"多出 {format_twd(-gap)}。可以考慮把多出的空間拿來降低風險或提前達標。")
    else:
        goal_comment = (f"照目前步調，{goal_years} 年後約有 {format_twd(pace[-1])}，距離目標 {format_twd(target)} 還差 {format_twd(gap)}。"
                        f"三條補齊的路：每月投入從 {format_twd(p.monthlyInvestment)} 提高到 {format_twd(req_m)}；")
        goal_comment += (f"或把年化報酬拉到 {req_r:g}%（波動也會跟著變大）；" if req_r is not None
                         else "或提高報酬率，但連 100% 年化都不夠，這條路不成立；")
        goal_comment += (f"或把期限延長到約 {req_y:g} 年。三者可以混搭，每月多投一點、多等一兩年，通常比追高報酬實際。"
                         if req_y is not None else "或延長期限，但 100 年內也達不到。")

    # ---- 3. 蒙地卡羅：三個情境 ----
    scenario_specs = [("none", "無突發崩盤（基準）", None)]
    chosen = mc.scenarioId if mc.isScenarioEnabled else "dotcom_2008"
    if chosen not in ("none",):
        scenario_specs.append((chosen, CRISIS_SCENARIOS.get(chosen, {"name": chosen})["name"], mc.blackSwanYear))
    if chosen != "great_depression":
        scenario_specs.append(("great_depression", CRISIS_SCENARIOS["great_depression"]["name"], mc.blackSwanYear))
    else:
        scenario_specs.append(("dotcom_2008", CRISIS_SCENARIOS["dotcom_2008"]["name"], mc.blackSwanYear))

    mc_results = []
    for i, (sid, name, start) in enumerate(scenario_specs):
        payload = build_mc_payload(p, mc, stages, scenario_id=sid, black_swan_year=start)
        res = run_mc(payload, seed=seed + i)
        events = payload["blackSwanEvents"]
        title = f"爆發於第 {start} 年" if events else ""
        mc_results.append({
            "id": sid, "name": name, "events": events,
            "successRate": res["successRate"], "medianEndingWealth": res["medianEndingWealth"],
            "p10_end": res["percentilePaths"][-1]["p10"], "p90_end": res["percentilePaths"][-1]["p90"],
            "chart": charts.fan_chart(res["percentilePaths"], events, title),
        })
    base = mc_results[0]
    # 累積期常常三個情境都是 100% 不破產，改用中位數決勝，才不會把「基準」誤判成最嚴苛
    worst = min(mc_results[1:] or mc_results, key=lambda r: (r["successRate"], r["medianEndingWealth"]))
    phase_text = ("累積期：每月持續投入，不提領" if mc.phase == "accumulation"
                  else f"提領期：每月提領 {format_twd(p.monthlyExpense)}（隨通膨與家庭規模調整），不再投入")
    mc_intro = (f"模式為{phase_text}。年化報酬 {payload['expectedReturn']:g}%、波動率 {mc.volatility:g}%，"
                f"每個情境各跑 1,000 條路徑。扇形越寬代表結果越不確定；「不破產」指投資帳戶在整段期間內從未歸零。")
    mc_comment = (f"基準情境的不破產機率 {_pct(base['successRate'])}，期末中位數 {format_twd(base['medianEndingWealth'])}。"
                  f"最嚴苛的「{worst['name']}」把不破產機率壓到 {_pct(worst['successRate'])}，中位數降到 {format_twd(worst['medianEndingWealth'])}。")
    if mc.phase == "accumulation":
        mc_comment += (" 累積期只要每月投入大於支出，帳戶不會歸零，所以重點不是破產率，而是最差 10% 與中位數的差距有多大，"
                       "那就是您要有心理準備承受的波動幅度。")
    else:
        if worst["successRate"] < 80:
            mc_comment += " 最差情境低於 80%，代表退休初期遇到崩盤時，這個提領水準有明顯的耗盡風險；可考慮降低提領、延後退休或啟用動態提領。"
        else:
            mc_comment += " 三個情境都維持在 80% 以上，這個提領水準對歷史級別的崩盤有一定緩衝。"

    # ---- 4. 房 ----
    housing = None
    h_in = order.get("housingParams") or order.get("housing")
    if h_in is not None:
        hp = HousingParams.from_dict(h_in)
        hrows = calculate_housing_compare(hp)
        cross = housing_crossover_year(hrows)
        loan = hp.housePrice * (1 - hp.downPaymentPercent / 100)
        mortgage = monthly_loan_payment(loan, hp.loanRate, max(1, hp.loanYears - hp.graceYears))
        end = hrows[-1]
        diff = end["buyNetWorth"] - end["rentNetWorth"]
        winner = "買房" if diff > 0 else "租屋"
        h_comment = (f"在相同的每月現金流下，{hp.yearsToCompare} 年後{winner}方案的淨資產多出 {format_twd(abs(diff))}。")
        h_comment += (f" 買房淨資產在第 {cross} 年追過租屋。" if cross is not None else " 比較期內買房淨資產從未追過租屋。")
        h_comment += (f" 結果最敏感的兩個假設是房價年漲幅（{hp.houseAppreciationRate:g}%）與投資報酬（{hp.investReturn:g}%），"
                      "兩者差距每變動 1 個百分點，勝負就可能翻轉；這是一張比較表，不是買房或租屋的建議。")
        housing = {
            "params": hp, "rows": hrows, "crossover": cross,
            "crossover_text": f"第 {cross} 年" if cross is not None else "未追過",
            "monthly_mortgage": mortgage, "commentary": h_comment,
            "chart": charts.housing_chart(hrows, cross),
        }

    # ---- 總覽 ----
    if p.isLeverageEnabled and p.leverageAmount > 0 and p.leverageYears > 0:
        lev_text = f"借 {format_twd(p.leverageAmount)} / {p.leverageRate:g}% / {p.leverageYears} 年"
    else:
        lev_text = "未啟用"
    stages_text = "、".join(f"到第 {s['endYear']} 年 {STAGE_NAMES.get(s['familySize'], s['familySize'])}" for s in stages)

    return {
        "client": client,
        "params": p,
        "mc": mc,
        "seed": seed,
        "generated_at": dt.date.today().strftime("%Y 年 %m 月 %d 日"),
        "overview": {
            "final_assets": last["assets"], "final_real": last["realAssets"],
            "fire_text": f"第 {fire} 年" if fire is not None else "100 年內未達",
            "mc_base_success": base["successRate"],
            "leverage_text": lev_text, "stages_text": stages_text,
        },
        "projection": {"rows": rows, "milestones": milestones, "commentary": proj_comment,
                       "chart": charts.projection_chart(rows)},
        "goal": {
            "target": target, "years": goal_years, "current_pace_fv": pace[-1],
            "req_monthly_text": format_twd(req_m) if req_m > 0 else "0（本金自己就夠）",
            "req_return_text": f"{req_r:g}%" if req_r is not None else "超過 100%",
            "req_years_text": f"{req_y:g} 年" if req_y is not None else "超過 100 年",
            "commentary": goal_comment, "chart": charts.goal_chart(pace, target, goal_years),
        },
        "montecarlo": {"intro": mc_intro, "scenarios": mc_results, "commentary": mc_comment,
                       "compare_chart": charts.scenario_bars(mc_results)},
        "housing": housing,
    }


def main():
    ap = argparse.ArgumentParser(description="LifeScope 個人化報告產生器")
    ap.add_argument("order", nargs="?", help="訂單參數 JSON")
    ap.add_argument("-o", "--output", default=None, help="輸出 PDF 路徑（預設與訂單同名）")
    ap.add_argument("--sample", action="store_true", help="用 sample_order.json 產生範例報告")
    args = ap.parse_args()

    order_path = os.path.join(HERE, "sample_order.json") if args.sample else args.order
    if not order_path:
        ap.print_help()
        sys.exit(1)
    with open(order_path, encoding="utf-8") as f:
        order = json.load(f)

    out = args.output or os.path.splitext(order_path)[0] + ".pdf"
    from pdf import build_pdf  # 延後 import：字型註冊只在真的要輸出時做
    result = compute(order)
    build_pdf(result, out)
    print(f"完成：{out}")


if __name__ == "__main__":
    main()
