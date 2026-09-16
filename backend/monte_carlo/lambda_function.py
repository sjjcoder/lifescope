import base64
import json
import math
import os

import numpy as np

# ---------------------------------------------------------------------------
# LifeScope Monte Carlo engine
#
# 與前端 lib/calculator.ts 的複利試算對齊：
#   * 年化報酬率 → 每年抽一個「年報酬」，再換成有效月利率逐月複利（月初投入、月支出、貸款本息）
#   * 年報酬採對數常態（lognormal）並精確配對使用者輸入的「期望年報酬」與「年波動率」，
#     所以單年最差不會低於 -100%，不會再出現常態分配抽到 -120% 造成的假破產
#   * 貸款逐月攤還、只在還有欠款時扣款；續借時重設欠款並重新攤還
#   * 提領金額從第 1 年就開始依通膨調整（與前端 discountFactor 一致）
# ---------------------------------------------------------------------------

MAX_BODY_BYTES = 16_384
NUM_SIMULATIONS = 1000
MAX_YEARS = 100
FAMILY_MULTIPLIERS = {1: 1.0, 2: 1.6, 3: 2.2, 4: 2.8, 5: 3.4, 6: 4.0}


class BadRequest(ValueError):
    pass


class PayloadTooLarge(ValueError):
    pass


def _reject_constant(name):
    # Python 的 json 預設會接受 NaN / Infinity 字面值，這裡一律拒絕
    raise BadRequest(f"non-finite JSON literal: {name}")


def _num(data, key, default, lo, hi, cast=float):
    """取數值欄位並夾在 [lo, hi]；非數字、布林、NaN/inf 一律視為錯誤輸入。"""
    value = data.get(key, default)
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise BadRequest(f"{key} must be a number")
    if not math.isfinite(value):
        raise BadRequest(f"{key} must be finite")
    return max(lo, min(cast(value), hi))


def _response(status, headers, body):
    return {"statusCode": status, "headers": headers, "body": json.dumps(body)}


def _parse_body(event):
    body = event.get("body", "{}")
    if event.get("isBase64Encoded") and isinstance(body, str):
        body = base64.b64decode(body).decode("utf-8")
    if isinstance(body, str):
        if len(body.encode("utf-8")) > MAX_BODY_BYTES:
            raise PayloadTooLarge()
        data = json.loads(body, parse_constant=_reject_constant) if body.strip() else {}
    else:
        data = body
    if not isinstance(data, dict):
        raise BadRequest("body must be a JSON object")
    return data


def _build_family_multipliers(raw_stages, years):
    """依人生階段建立每年的家庭開支乘數（index 0 = 第 1 年）。階段先依 endYear 排序，避免順序影響結果。"""
    stages = []
    if isinstance(raw_stages, list):
        for stage in raw_stages[:10]:
            if not isinstance(stage, dict):
                continue
            try:
                end_year = max(1, min(int(stage.get("endYear", years)), MAX_YEARS))
                family_size = max(1, min(int(stage.get("familySize", 1)), 6))
            except (TypeError, ValueError):
                continue
            stages.append((end_year, FAMILY_MULTIPLIERS.get(family_size, 1.0)))
    stages.sort(key=lambda s: s[0])

    multipliers = np.ones(years)
    prev_end = 0
    for end_year, mult in stages:
        upper = min(end_year, years)
        if upper > prev_end:
            multipliers[prev_end:upper] = mult
            prev_end = upper
    if stages and prev_end < years:
        multipliers[prev_end:] = stages[-1][1]  # 最後一個階段延續到模擬結束
    return multipliers


def _build_crash_map(data, years):
    """黑天鵝事件：year -> 跌幅（0~1）。超出模擬期的事件直接忽略，不夾到最後一年。"""
    raw_events = data.get("blackSwanEvents", [])
    events = list(raw_events[:20]) if isinstance(raw_events, list) else []

    legacy_year = data.get("blackSwanYear")
    if legacy_year is not None:  # 舊版單一事件 payload
        events.append({"year": legacy_year, "drop": data.get("blackSwanDrop", 30.0)})

    crash_map = {}
    for event in events:
        if not isinstance(event, dict):
            continue
        try:
            year = int(event.get("year", 0))
            drop = max(0.0, min(float(event.get("drop", 0.0)), 100.0)) / 100.0
        except (TypeError, ValueError):
            continue
        if 1 <= year <= years:
            crash_map[year] = drop
    return crash_map


def _monthly_loan_payment(principal, annual_rate, years):
    """等額本息（名目年利率 / 12，與台灣銀行牌告一致）。"""
    if principal <= 0 or years <= 0:
        return 0.0
    months = years * 12
    if annual_rate <= 0:
        return principal / months
    r = annual_rate / 12
    factor = (1 + r) ** months
    return principal * r * factor / (factor - 1)


def run_simulation(data, seed=None):
    """seed 只給離線工具（backend/report）用來產生可重現的報告；HTTP 請求不會經過這個參數。"""
    initial_assets = _num(data, "initialAssets", 10_000_000, 0.0, 10_000_000_000)
    monthly_contribution = _num(data, "monthlyContribution", 10_000, 0.0, 10_000_000)
    monthly_withdrawal = _num(data, "monthlyWithdrawal", 50_000, 0.0, 10_000_000)
    monthly_insurance = _num(data, "monthlyInsurance", 0.0, 0.0, 1_000_000)
    years = _num(data, "years", 40, 1, MAX_YEARS, int)
    expected_return = _num(data, "expectedReturn", 7.0, -50.0, 100.0) / 100.0
    volatility = _num(data, "volatility", 15.0, 0.0, 100.0) / 100.0
    inflation_mean = _num(data, "inflationMean", 2.0, 0.0, 50.0) / 100.0
    salary_growth_rate = _num(data, "salaryGrowthRate", 0.0, 0.0, 20.0) / 100.0

    jump_probability = _num(data, "jumpProbability", 0.0, 0.0, 100.0) / 100.0
    jump_impact = _num(data, "jumpImpact", 20.0, 0.0, 100.0) / 100.0
    is_dynamic = bool(data.get("isDynamic", False))
    dynamic_ratio = _num(data, "dynamicRatio", 20.0, 0.0, 100.0) / 100.0

    leverage_amount = _num(data, "leverageAmount", 0.0, 0.0, 10_000_000_000)
    leverage_rate = _num(data, "leverageRate", 0.0, 0.0, 100.0) / 100.0
    leverage_years = _num(data, "leverageYears", 0, 0, MAX_YEARS, int)
    leverage_recur_years = _num(data, "leverageRecurYears", 0, 0, MAX_YEARS, int)
    if leverage_years == 0:
        leverage_amount = 0.0  # 沒有還款年限的借款等於白拿本金，視為未啟用

    family_multipliers = _build_family_multipliers(data.get("lifeStages", []), years)
    crash_map = _build_crash_map(data, years)

    rng = np.random.default_rng(seed)

    # --- 年報酬：對數常態，配對 E[1+r] = 1+μ、Std[r] = σ ---
    if volatility > 0:
        sigma2 = math.log(1 + volatility ** 2 / (1 + expected_return) ** 2)
        mu_log = math.log(1 + expected_return) - sigma2 / 2
        annual_returns = np.exp(rng.normal(mu_log, math.sqrt(sigma2), size=(years, NUM_SIMULATIONS))) - 1
    else:
        annual_returns = np.full((years, NUM_SIMULATIONS), expected_return)

    # 跳躍擴散：以乘法套用，確保單年不會跌破 -100%
    if jump_probability > 0:
        has_jump = rng.random((years, NUM_SIMULATIONS)) < jump_probability
        annual_returns = (1 + annual_returns) * (1 - has_jump * jump_impact) - 1

    # 歷史劇本：該年所有路徑同步崩盤
    for year, drop in crash_map.items():
        annual_returns[year - 1, :] = -drop

    monthly_rates = np.power(1 + annual_returns, 1 / 12) - 1

    # --- 貸款 ---
    loan_payment_amt = _monthly_loan_payment(leverage_amount, leverage_rate, leverage_years)
    loan_monthly_rate = leverage_rate / 12
    loan_balance = leverage_amount

    balance = np.full(NUM_SIMULATIONS, initial_assets + leverage_amount)
    paths = np.zeros((years + 1, NUM_SIMULATIONS))
    paths[0] = balance
    loan_balances = np.zeros(years + 1)
    loan_balances[0] = loan_balance
    ever_ruined = np.zeros(NUM_SIMULATIONS, dtype=bool)
    prev_year_returns = np.zeros(NUM_SIMULATIONS)

    for y in range(1, years + 1):
        # 借新還舊：補足本金並重置債務
        if (
            leverage_recur_years > 0
            and y > 1
            and (y - 1) % leverage_recur_years == 0
            and leverage_amount > 0
            and loan_balance < leverage_amount
        ):
            balance = balance + (leverage_amount - loan_balance)
            loan_balance = leverage_amount

        contribution = monthly_contribution * (1 + salary_growth_rate) ** (y - 1)
        base_withdrawal = monthly_withdrawal * (1 + inflation_mean) ** y * family_multipliers[y - 1]
        if is_dynamic and y > 1:
            # 動態提領：前一年市場為負，該年生活費縮減
            withdrawal = np.where(prev_year_returns < 0, base_withdrawal * (1 - dynamic_ratio), base_withdrawal)
        else:
            withdrawal = np.full(NUM_SIMULATIONS, base_withdrawal)

        r_m = monthly_rates[y - 1]
        for _ in range(12):
            loan_payment = 0.0
            if loan_balance > 0:
                interest = loan_balance * loan_monthly_rate
                principal = min(max(0.0, loan_payment_amt - interest), loan_balance)
                loan_payment = interest + principal
                loan_balance -= principal

            balance = balance * (1 + r_m) + contribution - withdrawal - loan_payment - monthly_insurance
            balance = np.maximum(balance, 0.0)

        # 投資帳戶一旦歸零就無法再支付支出／貸款 → 視為破產（累積期若投入大於支出不會發生）
        ever_ruined |= balance <= 0
        paths[y] = balance
        loan_balances[y] = loan_balance
        prev_year_returns = annual_returns[y - 1]

    ruin_probability = float(ever_ruined.mean() * 100.0)
    success_rate = 100.0 - ruin_probability

    # 回報淨資產（扣除未償貸款）
    net_worth_paths = paths - loan_balances[:, np.newaxis]
    net_worth_paths = np.nan_to_num(net_worth_paths, nan=0.0, posinf=0.0, neginf=0.0)
    median_ending_wealth = float(np.median(net_worth_paths[-1]))

    pct_matrix = np.percentile(net_worth_paths, [90, 75, 50, 25, 10], axis=1)  # shape (5, years+1)
    percentile_paths = [
        {
            "year": y,
            "p90": round(float(pct_matrix[0][y])),
            "p75": round(float(pct_matrix[1][y])),
            "p50": round(float(pct_matrix[2][y])),
            "p25": round(float(pct_matrix[3][y])),
            "p10": round(float(pct_matrix[4][y])),
        }
        for y in range(years + 1)
    ]

    return {
        "successRate": round(success_rate, 2),
        "ruinProbability": round(ruin_probability, 2),
        "medianEndingWealth": round(median_ending_wealth),
        "percentilePaths": percentile_paths,
    }


def lambda_handler(event, context):
    # CORS：在 Lambda 環境變數設 ALLOWED_ORIGIN 為 Vercel 網域；'*' 只給本機開發用
    allowed_origin = os.environ.get("ALLOWED_ORIGIN", "*")
    headers = {
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Origin": allowed_origin,
        "Access-Control-Allow-Methods": "OPTIONS,POST",
        "Content-Type": "application/json",
        "X-Content-Type-Options": "nosniff",
    }

    http_method = event.get("httpMethod") or event.get("requestContext", {}).get("http", {}).get("method", "")
    if http_method == "OPTIONS":
        return {"statusCode": 200, "headers": headers, "body": ""}
    if http_method and http_method != "POST":
        return _response(405, headers, {"error": "Method not allowed"})

    # 軟性來源檢查：CORS 只約束瀏覽器，這裡再擋掉帶了不對 Origin 的請求（成本近零；真正的限流靠 API Gateway 與 reserved concurrency）
    request_headers = {str(k).lower(): v for k, v in (event.get("headers") or {}).items()}
    origin = request_headers.get("origin", "")
    if allowed_origin != "*" and origin and origin != allowed_origin:
        return _response(403, headers, {"error": "Forbidden"})

    try:
        data = _parse_body(event)
        return _response(200, headers, run_simulation(data))
    except PayloadTooLarge:
        return _response(413, headers, {"error": "Payload too large"})
    except (BadRequest, json.JSONDecodeError, UnicodeDecodeError, ValueError, TypeError, OverflowError) as exc:
        print(f"Bad request: {type(exc).__name__}")  # 只記錄錯誤類型，不記錄使用者輸入
        return _response(400, headers, {"error": "Invalid input"})
    except Exception as exc:  # noqa: BLE001
        print(f"Lambda error: {type(exc).__name__}")
        return _response(500, headers, {"error": "Internal server error"})
