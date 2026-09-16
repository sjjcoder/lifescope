"""
對數字：engine.py（Python 移植）vs lib/calculator.ts（網站實際用的計算器）。

用 Node 24 原生的 type stripping 直接載入 .ts，三個確定性模型逐年比對，允許 1 元的四捨五入誤差。
    python test_engine_parity.py
"""
from __future__ import annotations

import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, HERE)

from engine import (BasicParams, HousingParams, calculate_fire_year, calculate_housing_compare,  # noqa: E402
                    calculate_projection, required_monthly_investment, required_return, required_years)

with open(os.path.join(HERE, "sample_order.json"), encoding="utf-8") as f:
    ORDER = json.load(f)

sys.stdout.reconfigure(encoding="utf-8")

# 讓槓桿與人生事件都跑到，覆蓋率高一點。
# 注意：calculator.ts 函式內的預設值是 0，engine.py 的預設值沿用網站初始畫面（2.5% / 7 年），
# 所以比對時三個槓桿欄位都要明確給值，才是在比「同一組輸入」。
ORDER["params"]["leverageAmount"] = 1_000_000
ORDER["params"]["leverageRate"] = 2.5
ORDER["params"]["leverageYears"] = 7
ORDER["params"]["leverageRecurYears"] = 7
ORDER["isLeverageEnabled"] = True
ORDER["params"]["isBankerEnabled"] = True
ORDER["params"]["isInsuranceEnabled"] = True

JS = r"""
import { calculateProjection, calculateFIREAge, calculateHousingCompare,
         calculateRequiredMonthlyInvestment, calculateRequiredReturn, calculateRequiredYears } from ROOT_CALC;
const order = JSON.parse(process.argv[2]);
const p = { ...order.params };
if (!order.isLeverageEnabled) { p.leverageAmount = 0; }
const stages = order.lifeStages;
const g = order.goal;
const out = {
  projection: calculateProjection(p),
  fire: calculateFIREAge(p, stages),
  housing: calculateHousingCompare(order.housingParams),
  reqMonthly: calculateRequiredMonthlyInvestment(g.targetAssets, g.targetYears, p.annualReturn, p.currentAssets, p.salaryGrowthRate),
  reqReturn: calculateRequiredReturn(g.targetAssets, g.targetYears, p.monthlyInvestment, p.currentAssets, p.salaryGrowthRate),
  reqYears: calculateRequiredYears(g.targetAssets, p.monthlyInvestment, p.annualReturn, p.currentAssets, p.salaryGrowthRate),
};
process.stdout.write(JSON.stringify(out));
"""


def run_ts(order: dict) -> dict:
    calc = os.path.join(ROOT, "lib", "calculator.ts").replace("\\", "/")
    script = JS.replace("ROOT_CALC", json.dumps("file:///" + calc.lstrip("/")))
    tmp = os.path.join(HERE, "_parity.mjs")
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(script)
    try:
        res = subprocess.run(["node", tmp, json.dumps(order)], capture_output=True, text=True, encoding="utf-8",
                             check=True)
    finally:
        os.remove(tmp)
    return json.loads(res.stdout)


def main() -> int:
    ts = run_ts(ORDER)
    p = BasicParams.from_dict(ORDER["params"])
    p.isLeverageEnabled = ORDER["isLeverageEnabled"]
    stages = ORDER["lifeStages"]
    g = ORDER["goal"]
    failures = 0

    py_rows = calculate_projection(p)
    for a, b in zip(py_rows, ts["projection"]):
        for key in ("assets", "realAssets", "invested", "returns", "loanBalance"):
            if abs(a[key] - b[key]) > 1:
                failures += 1
                print(f"[projection] year {a['year']} {key}: py={a[key]} ts={b[key]}")

    fire = calculate_fire_year(p, stages)
    if fire != ts["fire"]:
        failures += 1
        print(f"[fire] py={fire} ts={ts['fire']}")

    h = HousingParams.from_dict(ORDER["housingParams"])
    for a, b in zip(calculate_housing_compare(h), ts["housing"]):
        for key in ("rentNetWorth", "buyNetWorth", "rentCumCost", "buyCumCost"):
            if abs(a[key] - b[key]) > 1:
                failures += 1
                print(f"[housing] year {a['year']} {key}: py={a[key]} ts={b[key]}")

    checks = {
        "reqMonthly": required_monthly_investment(g["targetAssets"], g["targetYears"], p.annualReturn, p.currentAssets, p.salaryGrowthRate),
        "reqReturn": required_return(g["targetAssets"], g["targetYears"], p.monthlyInvestment, p.currentAssets, p.salaryGrowthRate),
        "reqYears": required_years(g["targetAssets"], p.monthlyInvestment, p.annualReturn, p.currentAssets, p.salaryGrowthRate),
    }
    for key, val in checks.items():
        if val != ts[key] and not (isinstance(val, float) and abs(val - ts[key]) < 0.011):
            failures += 1
            print(f"[goal] {key}: py={val} ts={ts[key]}")

    n = len(py_rows) + len(ts["housing"]) + 4
    print(f"比對 {n} 組數字，{'全部一致' if failures == 0 else f'{failures} 處不一致'}")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
