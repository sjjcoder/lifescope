"""
把試算結果排成 PDF（reportlab platypus）。

排版原則：每一節「一張圖 + 三到五個關鍵數字 + 兩三句白話解讀」。
所有解讀文字都是對「這組參數」的客觀描述，不出現任何金融商品或買賣字眼。
"""
from __future__ import annotations

import datetime as dt
import io
from typing import Optional

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (Image, KeepTogether, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table,
                                TableStyle)

from charts import find_cjk_font
from engine import format_twd

INK = colors.HexColor("#0b0b0b")
INK_2 = colors.HexColor("#52514e")
MUTED = colors.HexColor("#898781")
GRID = colors.HexColor("#e1e0d9")
ACCENT = colors.HexColor("#2a78d6")
PLANE = colors.HexColor("#f4f4f1")

FONT = "LifeScopeCJK"
FONT_BOLD = "LifeScopeCJK-Bold"


def _register_fonts():
    path = find_cjk_font()
    if not path:
        raise RuntimeError("找不到中文字型。請安裝微軟正黑體或 Noto Sans CJK，或用環境變數 LIFESCOPE_FONT 指定 .ttf/.ttc 路徑。")
    pdfmetrics.registerFont(TTFont(FONT, path, subfontIndex=0))
    bold_path = path.replace("msjh.ttc", "msjhbd.ttc")
    try:
        pdfmetrics.registerFont(TTFont(FONT_BOLD, bold_path, subfontIndex=0))
    except Exception:  # 沒有粗體檔就用同一個字型
        pdfmetrics.registerFont(TTFont(FONT_BOLD, path, subfontIndex=0))
    # 讓 Paragraph 裡的 <b> 能切到粗體檔
    pdfmetrics.registerFontFamily(FONT, normal=FONT, bold=FONT_BOLD, italic=FONT, boldItalic=FONT_BOLD)


_register_fonts()

S = {
    "title": ParagraphStyle("title", fontName=FONT_BOLD, fontSize=24, leading=32, textColor=INK, spaceAfter=4),
    "subtitle": ParagraphStyle("subtitle", fontName=FONT, fontSize=12, leading=18, textColor=INK_2),
    "h1": ParagraphStyle("h1", fontName=FONT_BOLD, fontSize=16, leading=22, textColor=INK, spaceBefore=6, spaceAfter=6),
    "h2": ParagraphStyle("h2", fontName=FONT_BOLD, fontSize=11, leading=16, textColor=INK, spaceBefore=8, spaceAfter=3),
    "body": ParagraphStyle("body", fontName=FONT, fontSize=9.5, leading=15, textColor=INK, alignment=TA_LEFT),
    "small": ParagraphStyle("small", fontName=FONT, fontSize=8, leading=12, textColor=INK_2),
    "muted": ParagraphStyle("muted", fontName=FONT, fontSize=7.5, leading=11, textColor=MUTED),
    "kpi_v": ParagraphStyle("kpi_v", fontName=FONT_BOLD, fontSize=15, leading=19, textColor=INK),
    "kpi_l": ParagraphStyle("kpi_l", fontName=FONT, fontSize=7.5, leading=10, textColor=INK_2),
}

DISCLAIMER = (
    "本報告僅依您提供的參數進行客觀數學運算與情境模擬，結果不代表未來實際績效。"
    "報告不涉及、亦不推薦任何特定金融商品，不構成投資顧問服務或買賣建議。"
    "投資有風險，任何財務決策請自行判斷並承擔結果；如有需要請諮詢具備執照的專業人員。"
)


def P(text: str, style: str = "body") -> Paragraph:
    return Paragraph(text, S[style])


def kpi_row(items: list[tuple[str, str]], width: float) -> Table:
    """一排關鍵數字卡。items = [(數值, 標籤), ...]"""
    cells = [[Paragraph(v, S["kpi_v"]), ] for v, _ in items]
    labels = [[Paragraph(l, S["kpi_l"]), ] for _, l in items]
    data = [[c[0] for c in cells], [l[0] for l in labels]]
    col_w = width / len(items)
    t = Table(data, colWidths=[col_w] * len(items))
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), PLANE),
        ("BOX", (0, 0), (-1, -1), 0, PLANE),
        ("LINEAFTER", (0, 0), (-2, -1), 0.6, colors.white),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, 0), 8), ("BOTTOMPADDING", (0, 0), (-1, 0), 0),
        ("TOPPADDING", (0, 1), (-1, 1), 0), ("BOTTOMPADDING", (0, 1), (-1, 1), 8),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
    ]))
    return t


def data_table(header: list[str], rows: list[list[str]], width: float, col_ratios: Optional[list[float]] = None) -> Table:
    n = len(header)
    ratios = col_ratios or [1] * n
    total = sum(ratios)
    widths = [width * r / total for r in ratios]
    body = [[Paragraph(h, S["small"]) for h in header]] + [[Paragraph(c, S["body"]) for c in r] for r in rows]
    t = Table(body, colWidths=widths, repeatRows=1)
    t.setStyle(TableStyle([
        ("LINEBELOW", (0, 0), (-1, 0), 0.8, INK_2),
        ("LINEBELOW", (0, 1), (-1, -1), 0.4, GRID),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 2), ("RIGHTPADDING", (0, 0), (-1, -1), 2),
    ]))
    return t


def img(png: bytes, width: float) -> Image:
    im = Image(io.BytesIO(png))
    ratio = im.imageHeight / im.imageWidth
    im.drawWidth = width
    im.drawHeight = width * ratio
    return im


def _footer(canvas, doc):
    canvas.saveState()
    canvas.setFont(FONT, 7.5)
    canvas.setFillColor(MUTED)
    canvas.drawString(doc.leftMargin, 12 * mm, "LifeScope 個人化財務模擬報告 · 僅供參考，非投資建議")
    canvas.drawRightString(A4[0] - doc.rightMargin, 12 * mm, f"第 {doc.page} 頁")
    canvas.restoreState()


def build_pdf(result: dict, output_path: str) -> None:
    """result 是 generate.compute() 產出的完整結果字典。"""
    doc = SimpleDocTemplate(output_path, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm,
                            topMargin=18 * mm, bottomMargin=20 * mm,
                            title="LifeScope 個人化財務模擬報告", author="LifeScope")
    W = A4[0] - doc.leftMargin - doc.rightMargin
    story = []
    c = result["client"]
    p = result["params"]
    ov = result["overview"]

    # ---- 封面 / 摘要 --------------------------------------------------------
    story += [
        Spacer(1, 10 * mm),
        P("LifeScope 個人化財務模擬報告", "title"),
        P(f"為 {c.get('name') or '您'} 製作 · {result['generated_at']}", "subtitle"),
        Spacer(1, 6 * mm),
        P("這份報告用您提供的參數，跑了四組模型：複利試算、目標回推、蒙地卡羅壓力測試，以及租屋與買房的淨資產比較。"
          "所有數字都是同一套假設算出來的，可以互相對照。", "body"),
        Spacer(1, 5 * mm),
        P("一頁看懂", "h1"),
        kpi_row([
            (format_twd(ov["final_assets"]), f"{p.investmentYears} 年後名目淨資產"),
            (format_twd(ov["final_real"]), "換成今日購買力"),
            (ov["fire_text"], "達到 4% 法則財務自由"),
            (f"{ov['mc_base_success']:.1f}%", "壓力測試不破產機率（基準）"),
        ], W),
        Spacer(1, 4 * mm),
        P("您提供的主要參數", "h2"),
        data_table(
            ["項目", "數值", "項目", "數值"],
            [
                ["現有資產", format_twd(p.currentAssets), "月收入 / 月支出", f"{format_twd(p.monthlyIncome)} / {format_twd(p.monthlyExpense)}"],
                ["每月投入", format_twd(p.monthlyInvestment), "年調薪", f"{p.salaryGrowthRate:g}%"],
                ["預期年化報酬", f"{p.annualReturn:g}%", "波動率（壓力測試）", f"{result['mc'].volatility:g}%"],
                ["通膨率", f"{p.inflationRate:g}%", "模擬年數", f"{p.investmentYears} 年"],
                ["槓桿", ov["leverage_text"], "人生階段", ov["stages_text"]],
            ],
            W, [1.1, 1.3, 1.4, 1.6],
        ),
        Spacer(1, 4 * mm),
        P(DISCLAIMER, "muted"),
        PageBreak(),
    ]

    # ---- 1. 複利試算 --------------------------------------------------------
    pr = result["projection"]
    rows = pr["rows"]
    story += [
        P("1. 複利試算：照這個步調走，資產會長成什麼樣", "h1"),
        img(pr["chart"], W),
        Spacer(1, 3 * mm),
        kpi_row([
            (format_twd(rows[-1]["assets"]), "期末名目淨資產"),
            (format_twd(rows[-1]["realAssets"]), "期末今日購買力"),
            (format_twd(rows[-1]["invested"]), "累計投入本金"),
            (format_twd(rows[-1]["returns"]), "累計報酬（名目）"),
        ], W),
        Spacer(1, 3 * mm),
        P(pr["commentary"], "body"),
        Spacer(1, 3 * mm),
        P("每五年的里程碑", "h2"),
        data_table(
            ["年", "名目淨資產", "今日購買力", "累計投入", "累計報酬"],
            [[str(r["year"]), format_twd(r["assets"]), format_twd(r["realAssets"]), format_twd(r["invested"]),
              format_twd(r["returns"])] for r in pr["milestones"]],
            W, [0.6, 1.3, 1.3, 1.3, 1.3],
        ),
        PageBreak(),
    ]

    # ---- 2. 目標回推 --------------------------------------------------------
    g = result["goal"]
    story += [
        P(f"2. 目標回推：{g['years']} 年內累積到 {format_twd(g['target'])}，需要什麼條件", "h1"),
        img(g["chart"], W),
        Spacer(1, 3 * mm),
        kpi_row([
            (format_twd(g["current_pace_fv"]), "照目前步調的期末資產"),
            (g["req_monthly_text"], "維持目前報酬，每月需投入"),
            (g["req_return_text"], "維持目前投入，需要的年化報酬"),
            (g["req_years_text"], "維持目前兩者，需要的年數"),
        ], W),
        Spacer(1, 3 * mm),
        P(g["commentary"], "body"),
        Spacer(1, 2 * mm),
        P("目標回推刻意只看「現有資產 + 每月投入 + 報酬率」三個變數，不含槓桿、保費與人生事件，所以會和第 1 節的曲線略有差異。", "small"),
        PageBreak(),
    ]

    # ---- 3. 蒙地卡羅 --------------------------------------------------------
    mc = result["montecarlo"]
    story += [
        P("3. 壓力測試：1,000 個平行宇宙裡，這個計畫撐得住嗎", "h1"),
        P(mc["intro"], "body"),
        Spacer(1, 2 * mm),
    ]
    for sc in mc["scenarios"]:
        block = [
            P(f"情境：{sc['name']}", "h2"),
            img(sc["chart"], W),
            kpi_row([
                (f"{sc['successRate']:.1f}%", "不破產機率"),
                (format_twd(sc["medianEndingWealth"]), "期末淨資產中位數"),
                (format_twd(sc["p10_end"]), "最差 10% 的期末淨資產"),
                (format_twd(sc["p90_end"]), "最好 10% 的期末淨資產"),
            ], W),
            Spacer(1, 4 * mm),
        ]
        story.append(KeepTogether(block))
    story += [
        KeepTogether([
            P("三種情境並排", "h2"),
            img(mc["compare_chart"], W),
            Spacer(1, 2 * mm),
            P(mc["commentary"], "body"),
        ]),
        PageBreak(),
    ]

    # ---- 4. 租屋 vs 買房 ----------------------------------------------------
    h = result.get("housing")
    if h:
        hp = h["params"]
        story += [
            P("4. 租屋 vs 買房：同樣的每月現金流，哪一邊淨資產長得快", "h1"),
            img(h["chart"], W),
            Spacer(1, 3 * mm),
            kpi_row([
                (format_twd(h["rows"][-1]["rentNetWorth"]), f"{hp.yearsToCompare} 年後租屋淨資產"),
                (format_twd(h["rows"][-1]["buyNetWorth"]), f"{hp.yearsToCompare} 年後買房淨資產"),
                (h["crossover_text"], "買房追過租屋的年份"),
                (format_twd(h["monthly_mortgage"]), "寬限期後每月房貸"),
            ], W),
            Spacer(1, 3 * mm),
            P(h["commentary"], "body"),
            Spacer(1, 2 * mm),
            P(f"假設：房價 {format_twd(hp.housePrice)}、頭期款 {hp.downPaymentPercent:g}%、房貸 {hp.loanRate:g}% / {hp.loanYears} 年"
              f"（寬限 {hp.graceYears} 年）、月租 {format_twd(hp.monthlyRent)} 年漲 {hp.rentIncreaseRate:g}%、"
              f"房價年漲 {hp.houseAppreciationRate:g}%、維護費 {hp.maintenanceRate:g}%、投資報酬 {hp.investReturn:g}%。"
              "兩邊每月拿出口袋的錢完全一樣，差額全部投入市場。", "small"),
            PageBreak(),
        ]

    # ---- 附錄 --------------------------------------------------------------
    story += [
        P("附錄：模型假設與名詞", "h1"),
        P("<b>複利慣例</b>　年化報酬率換成有效月利率 (1+r) 的 1/12 次方減 1，逐月複利，每月投入在月初。貸款採等額本息，月利率為名目年利率 ÷ 12，與台灣銀行牌告一致。", "body"),
        P("<b>通膨調整</b>　「今日購買力」= 名目金額 ÷ (1+通膨率) 的年數次方。", "body"),
        P("<b>4% 法則</b>　當淨資產的 4% 足以支付當年（含通膨與家庭規模乘數）的年支出，視為達到財務自由。家庭規模乘數：1 人 1.0、2 人 1.6、3 人 2.2、4 人 2.8、5 人 3.4、6 人 4.0。", "body"),
        P("<b>蒙地卡羅</b>　每年抽一個年報酬（對數常態，期望值 = 年化報酬率、標準差 = 波動率），1,000 條路徑逐月結算投入、支出、保費與貸款。投資帳戶任一年底歸零視為破產。歷史劇本是把指定年份的所有路徑同步套用跌幅。", "body"),
        P("<b>租買比較</b>　兩方案每月現金支出強制相等，多出的錢全部投資。買房淨資產 = 房屋市值 + 投資 - 未償房貸。維護費隨當年房屋市值計算。", "body"),
        Spacer(1, 4 * mm),
        P(f"隨機種子：{result['seed']}（同一組參數與種子可重現本報告數字）", "muted"),
        Spacer(1, 2 * mm),
        P(DISCLAIMER, "muted"),
    ]

    doc.build(story, onFirstPage=_footer, onLaterPages=_footer)
