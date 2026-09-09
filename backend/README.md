# LifeScope Monte Carlo Engine (AWS Lambda)

這份文件說明如何將蒙地卡羅壓測引擎部署到 AWS Lambda。我們刻意採取「Console 介面手動部署 + 內建 Layer」的策略，以避開 Windows 環境下編譯 `numpy` 的跨平台地雷組合。本後端專門負責高密集運算的 **蒙地卡羅壓力測試**，而基礎的複利試算（包含最近新增的「人生重大事件時間軸」模組）則全數在前端瀏覽器進行。

## 部署步驟

### 0. 先決條件：IAM 開發帳號權限檢查
採取安全實務（Root 只開權限，使用獨立的 IAM 帳號開發），在你用該開發者帳號登入 AWS Console 前，**請確保 Root 帳號有賦予這個開發帳號以下權限**：
1. 一定能建 Lambda 的權限（例如 `AWSLambda_FullAccess`）。
2. 一定能建 API Gateway 的權限（例如 `AmazonAPIGatewayAdministrator`）。
3. **最容易漏掉的：建 IAM Role 的權限**（例如具備 `iam:CreateRole` 與 `iam:AttachRolePolicy`）。這是因為當你在網頁點擊「建立 Lambda」時，AWS 會自動幫這支程式創建一個專屬的「執行角色 (Execution Role)」，好讓它可以合法寫 Log 到 CloudWatch 裡面。

*(如果你圖方便，直接給了這支開發帳號 `AdministratorAccess` 或 `PowerUserAccess` 政策，這步就可以安心跳過。)*

### 1. 建立 Lambda 函數
1. 登入 AWS Console 並前往 **Lambda** 服務。
2. 點擊右上角橘色按鈕 **[Create function]** (建立函式)。
3. 選擇 **Author from scratch** (從頭開始建立)。
4. 輸入函式名稱：`lifescope-monte-carlo`
5. Runtime 選擇：**Python 3.12**
6. Architecture 選擇：**x86_64**
7. 點擊最下方 **[Create function]**。

### 2. 加入 Numpy Layer 🚀 (關鍵避雷步驟)
Numpy 是 C++ 底層寫的，不能直接把 Windows 下載的 Numpy 上傳到 AWS。所以我們直接拿 AWS 官方幫我們編譯好的 Layer 開外掛。

1. 在你的 Lambda 函數畫面底部，找到 **Layers** 區塊，點擊 **[Add a layer]**。
2. 選擇 **AWS layers**。
3. 在下拉選單中找到並選擇 **`AWSSDKPandas-Python312`**。
4. Version 選擇最新的版本 (通常是最下面那個數字)。
5. 點擊 **[Add]**。

### 3. 上傳程式碼
1. 回到 Lambda 的 **Code** 頁籤。
2. 開啟內建的 `lambda_function.py`。
3. 將本資料夾底下的 `lambda_function.py` 的**所有程式碼複製並貼上**，完全覆蓋掉原本的。
4. 點擊上方白色的 **[Deploy]** (部署) 按鈕。

### 4. 調整 Timeout 時間
蒙地卡羅算 1000 次通常需要 0.5 秒 ~ 1.5 秒，預設的 3 秒可能在冷啟動 (Cold Start) 時會逾時。
1. 前往 **Configuration** 面板 -> 點擊 **General configuration** -> **[Edit]**。
2. 將 **Timeout** (逾時) 從 3 秒改為 **10 秒**。
3. 點擊 **[Save]**。

### 5. 架設 API Gateway (讓前端可以呼叫)
1. 在 Lambda 函數首頁上方圖形區域，點選 **[+ Add trigger]**。
2. 選擇 **API Gateway**。
3. 選擇 **Create a new API**。
4. API type 選擇 **HTTP API** (最便宜、延遲最低)。
5. Security 選擇 **Open**。
6. 點擊 **[Add]**。

### 6. 設定 CORS (避免前端被瀏覽器擋下)
1. 點開剛建立好的 API Gateway 連結，進入 API Gateway 控制台。
2. 在左側選單點選 **CORS**。
3. 點擊 **[Configure]**：
   - Access-Control-Allow-Origin: 輸入 `*` 然後按 Add（正式上線後改為你的 Vercel 網域）
   - Access-Control-Allow-Headers: 輸入 `Content-Type` 然後按 Add
   - Access-Control-Allow-Methods: 輸入 `POST`, `OPTIONS` 然後按 Add
4. 點擊 **[Save]**。

### 7. 🔒 安全強化：設定 CORS 鎖定網域（部署到 Vercel 後必做）
當你拿到 Vercel 正式網域後（例如 `https://lifescope.vercel.app`），請回來做以下設定：
1. 進入 Lambda 函數 → **Configuration** → **Environment variables** → **[Edit]**。
2. 新增一組環境變數：
   - **Key**: `ALLOWED_ORIGIN`
   - **Value**: `https://你的網域.vercel.app`
3. 點擊 **[Save]**。
4. 程式碼會自動讀取此環境變數來控制 CORS，只允許來自你網站的請求。

### 8. 🔒 安全強化：設定 API Gateway 流量限速（防止帳單爆炸）
> HTTP API **沒有 Usage Plan**，帳戶預設是 10,000 rps / burst 5,000——必須在 **Stage 層級** 設定才會生效。
1. 進入 **API Gateway Console** → 選取你的 API → 左側 **Stages** → 選 `$default`（或你的 stage）。
2. 在 **Default route throttling** 點 **[Edit]**：
   - **Rate**: `5` requests/second（每秒最多處理 5 個請求）
   - **Burst**: `10` requests（允許短暫的 10 個併發突發）
3. 點擊 **[Save]**。超出限制的請求會回傳 `429 Too Many Requests`，**不會**產生 Lambda 費用。
4. CORS 只擇一處設定：程式碼已經回傳 CORS 標頭並讀取 `ALLOWED_ORIGIN`，因此 **API Gateway 的 CORS 設定請留空**（步驟 6 只在你不想用程式碼控制時才做），兩邊都設會讓瀏覽器收到重複的 `Access-Control-Allow-Origin` 而拒絕回應。

### 9. 🔒 安全強化：Lambda Reserved concurrency（帳單硬上限）
API Gateway 限速是第一道牆，Reserved concurrency 是**不可能被繞過**的第二道牆（就算有人拿到 URL 直接用腳本打也一樣）。
1. Lambda → **Configuration** → **Concurrency** → **[Edit]**。
2. 選 **Reserve concurrency**，填 `5`（一次模擬約 1 秒，5 個併發對個人網站已經很寬裕）。
3. 點擊 **[Save]**。
4. 建議同時到 **AWS Budgets** 設一個每月 US$10 的費用警報。

### 10. 🔁 程式碼更新時的重新部署
`lambda_function.py` 有改動時（例如這次的輸入驗證強化、對數常態報酬、逐月現金流），重複步驟 3：把整個檔案貼上覆蓋 → **[Deploy]**。前端與 Lambda 是向下相容的：舊 Lambda 會忽略新的 `monthlyInsurance` 欄位，新 Lambda 也接受舊 payload。

### 引擎行為摘要（2026-09 版）
- 每年抽一個年報酬（**對數常態**，期望值 = 年化報酬率、標準差 = 波動率，因此單年不會跌破 -100%），換成月利率後**逐月**結算投入、支出、保費與貸款本息——與前端複利試算的複利慣例一致。
- 貸款逐月攤還，只在還有欠款時扣款；續借時重設欠款並重新攤還。
- 提領從第 1 年起就依通膨調整，並乘上人生階段的家庭開支乘數（階段會先依 `endYear` 排序）。
- 黑天鵝事件若落在模擬期之外會被**忽略**（不再夾到最後一年）。
- 破產定義：投資帳戶在任一年底歸零；回傳的百分位與中位數是**淨資產**（扣除未償貸款）。
- 輸入防護：body 上限 16 KB、拒絕 `NaN`/`Infinity`、所有數值夾在合理範圍、非物件 body 回 400、`ALLOWED_ORIGIN` 設定後會拒絕帶了其他 Origin 的請求（403）。

## 🎯 完工！
回到你的 Lambda 介面或者 API Gateway 看，你會得到一串類似 `https://xxxxxxx.execute-api.ap-northeast-1.amazonaws.com/default/lifescope-monte-carlo` 的 API endpoint URL。
> 請把這串 URL 填回前端的 `.env.local` 環境變數裡（`NEXT_PUBLIC_MC_API_URL`）！這樣前端就可以正式開始呼叫引擎做壓力測試了。

---

## 📊 API 接口與資料格式說明 (API Specification)

後端蒙地卡羅運算引擎提供了一個 HTTP POST 接口，供前端傳送推演參數並回傳統計結果。

### 1. 請求 URL (API Endpoint)
* **Method**: `POST`
* **Content-Type**: `application/json`

### 2. 請求參數 (Request Payload JSON)

| 欄位名稱 | 型態 | 預設值 | 說明 | 限制/範圍 |
| :--- | :--- | :--- | :--- | :--- |
| `initialAssets` | float | `10000000` | 初始淨資產 (元) | `[0, 10,000,000,000]` |
| `monthlyContribution` | float | `10000` | 每月持續投入金額 (元) | `[0, 10,000,000]` |
| `monthlyWithdrawal` | float | `50000` | 每月提領金額 (元) | `[0, 10,000,000]` |
| `monthlyInsurance` | float | `0` | 每月保費等固定支出 (元)，逐月從帳戶扣除 | `[0, 1,000,000]` |
| `years` | int | `40` | 模擬年數 | `[1, 100]` |
| `expectedReturn` | float | `7.0` | 預期年化報酬率 (%) | `[-50.0, 100.0]` |
| `volatility` | float | `15.0` | 預估市場年化波動率 (%) | `[0.0, 100.0]` |
| `inflationMean` | float | `2.0` | 預估年化通膨率 (%) | `[0.0, 50.0]` |
| `salaryGrowthRate` | float | `0.0` | 每年調薪幅度 (%) | `[0.0, 20.0]` |
| `leverageAmount` | float | `0.0` | 借貸本金 (元)；`leverageYears` 為 0 時視為 0 | `[0.0, 10,000,000,000]` |
| `leverageRate` | float | `0.0` | 貸款年化利率 (%)（名目利率，月利率 = ÷12） | `[0.0, 100.0]` |
| `leverageYears` | int | `0` | 貸款年限 | `[0, 100]` |
| `leverageRecurYears` | int | `0` | 自動定期續借頻率 (年)，0 為不續借 | `[0, 100]` |
| `jumpProbability` | float | `0.0` | 隨機跳躍擴散年崩盤機率 (%) | `[0.0, 100.0]` |
| `jumpImpact` | float | `20.0` | 隨機跳躍擴散崩盤跌幅 (%) | `[0.0, 100.0]` |
| `isDynamic` | bool | `false` | 是否啟用動態提領機制 | `true` 或 `false` |
| `dynamicRatio` | float | `20.0` | 動態縮減提領比例 (%) | `[0.0, 100.0]` |
| `lifeStages` | array | `[]` | 人生不同階段設定列表 (上限 10 筆) | 內含 `{ endYear, familySize }` |
| `blackSwanEvents` | array | `[]` | 歷史黑天鵝重大崩盤年份設定 (上限 20 筆) | 內含 `{ year, drop }` |

*注：所有輸入數值皆會在 Lambda 端進行 strict clamp 範圍校驗；非數字、`NaN`/`Infinity`、非物件 body 回 `400`，body 超過 16 KB 回 `413`，Origin 不符 `ALLOWED_ORIGIN` 回 `403`。*

#### `lifeStages` 格式範例：
```json
[
  { "endYear": 10, "familySize": 1 },
  { "endYear": 30, "familySize": 3 },
  { "endYear": 50, "familySize": 2 }
]
```

#### `blackSwanEvents` 格式範例：
```json
[
  { "year": 5, "drop": 40 },
  { "year": 13, "drop": 50 }
]
```

---

### 3. 回傳參數 (Response JSON)

* **HTTP Status**: `200 OK`

```json
{
  "successRate": 98.5,           // 1,000 次模擬中，未破產（投資帳戶 > 0）的機率百分比
  "ruinProbability": 1.5,        // 破產率百分比 (100 - successRate)
  "medianEndingWealth": 54203100, // 第 N 年淨資產的中位數 (P50)
  "percentilePaths": [           // 每年各百分位數軌跡 (用於扇形信心圖)
    {
      "year": 0,
      "p90": 500000,
      "p75": 500000,
      "p50": 500000,
      "p25": 500000,
      "p10": 500000
    },
    ...
    {
      "year": 30,
      "p90": 120450000,
      "p75": 84210000,
      "p50": 54203100,
      "p25": 28450000,
      "p10": 9800000
    }
  ]
}
```

