# LifeScope 個人化報告產生器

把網站上四個分頁（複利試算、目標回推、蒙地卡羅、租買比較）的結果，用同一組參數排成一份 A4 PDF。
用途：蝦皮「個人化退休模擬報告」商品的交付檔，或網站未來的付費下載功能。

## 需求

- Python 3.12、`numpy`、`matplotlib`、`reportlab`（`pip install numpy matplotlib reportlab`）
- 中文字型：Windows 直接用微軟正黑體；其他系統裝 Noto Sans CJK，或用環境變數 `LIFESCOPE_FONT` 指到 .ttf/.ttc

## 用法

```bash
cd backend/report
python generate.py --sample                 # 用 sample_order.json 產生範例
python generate.py order.json -o out.pdf    # 產生一份客戶報告
```

## 訂單格式

見 [sample_order.json](sample_order.json)。欄位名稱與網站的劇本 JSON（`lib/scenarios.ts` 的 `Scenario`）一致，
所以客戶如果在網站上「儲存劇本」再匯出，可以直接貼進來。

| 區塊 | 對應 | 必填 |
|---|---|---|
| `client.name` | 封面署名 | 否 |
| `params` | `BasicParams`（複利試算頁的所有欄位） | 是 |
| `isLeverageEnabled` | 槓桿開關（網站上是獨立 state） | 否，預設關 |
| `lifeStages` | 人生階段 | 否，預設三段 |
| `goal.targetAssets` / `goal.targetYears` | 目標回推 | 否，預設 3,000 萬 / 20 年 |
| `mcParams` | `MCParams`（蒙地卡羅頁） | 否 |
| `housingParams` | `HousingParams`；省略就不出第 4 節 | 否 |
| `seed` | 隨機種子，同參數同種子結果可重現 | 否 |

## 報告內容

1. 封面 + 一頁看懂（四個關鍵數字、參數表、免責）
2. 複利試算：資產曲線、每五年里程碑表
3. 目標回推：三條補齊的路（提高投入 / 提高報酬 / 延長年限）
4. 壓力測試：三個情境的扇形圖 + 並排比較。情境為「無崩盤」、客戶選的劇本（未選則用 2000+2008 雙擊）、1929 大恐慌
5. 租屋 vs 買房：淨資產曲線與黃金交叉年
6. 附錄：模型假設、隨機種子、免責

## 檔案

| 檔案 | 用途 |
|---|---|
| `engine.py` | `lib/calculator.ts` 的 Python 移植；蒙地卡羅直接 import `../monte_carlo/lambda_function.py` |
| `charts.py` | matplotlib 圖表，調色盤沿用 dataviz 參考色 |
| `pdf.py` | reportlab 版面 |
| `generate.py` | CLI 與各節的白話解讀 |
| `test_engine_parity.py` | 用原本的 TypeScript 計算器對數字（`python test_engine_parity.py`，需要 Node 24） |

## 合規邊界

報告內所有文字只描述「這組參數」的數學結果。不出現任何金融商品名稱、不出現買賣、加碼、減碼、
進場、出場等字眼。新增解讀文字時維持這條線。
