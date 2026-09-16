"""
報告圖表（matplotlib → PNG bytes）

色彩沿用 dataviz 參考調色盤：類別色固定順序（藍 → 橘 → 青），
區間用單一藍色由淺到深，格線與座標軸退到背景。文字一律用墨色，不用系列色。
"""
from __future__ import annotations

import io
import os
from typing import Optional

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
from matplotlib import font_manager  # noqa: E402
from matplotlib.ticker import FuncFormatter  # noqa: E402

# --- 調色盤 -----------------------------------------------------------------
SERIES = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100"]  # 固定順序，不循環
SEQ = {"100": "#cde2fb", "200": "#9ec5f4", "350": "#5598e7", "550": "#1c5cab"}
INK = "#0b0b0b"
INK_2 = "#52514e"
MUTED = "#898781"
GRID = "#e1e0d9"
AXIS = "#c3c2b7"
SURFACE = "#ffffff"
CRITICAL = "#d03b3b"

_FONT_CANDIDATES = [
    r"C:\Windows\Fonts\msjh.ttc",  # 微軟正黑體
    "/System/Library/Fonts/PingFang.ttc",
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
    "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
]


def find_cjk_font() -> Optional[str]:
    env = os.environ.get("LIFESCOPE_FONT")
    if env and os.path.exists(env):
        return env
    for path in _FONT_CANDIDATES:
        if os.path.exists(path):
            return path
    return None


def _setup_font():
    path = find_cjk_font()
    if path:
        font_manager.fontManager.addfont(path)
        name = font_manager.FontProperties(fname=path).get_name()
        plt.rcParams["font.family"] = name
    plt.rcParams["axes.unicode_minus"] = False


_setup_font()


def _twd_tick(value, _pos=None) -> str:
    if abs(value) >= 1e8:
        return f"{value / 1e8:g} 億"
    if abs(value) >= 1e4:
        return f"{value / 1e4:,.0f} 萬"
    return f"{value:,.0f}"


def _style(ax, ylabel: str = ""):
    ax.set_facecolor(SURFACE)
    for side in ("top", "right"):
        ax.spines[side].set_visible(False)
    for side in ("left", "bottom"):
        ax.spines[side].set_color(AXIS)
        ax.spines[side].set_linewidth(0.8)
    ax.tick_params(colors=MUTED, labelsize=8, length=0)
    ax.yaxis.set_major_formatter(FuncFormatter(_twd_tick))
    ax.grid(axis="y", color=GRID, linewidth=0.6)
    ax.set_axisbelow(True)
    if ylabel:
        ax.set_ylabel(ylabel, color=INK_2, fontsize=8)
    ax.set_xlabel("年", color=INK_2, fontsize=8)


def _finish(fig) -> bytes:
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=200, bbox_inches="tight", facecolor=SURFACE)
    plt.close(fig)
    return buf.getvalue()


def _end_label(ax, x, y, text, color=INK_2):
    ax.annotate(text, (x, y), xytext=(4, 0), textcoords="offset points",
                va="center", fontsize=7.5, color=color)


# ---------------------------------------------------------------------------
def projection_chart(rows: list[dict]) -> bytes:
    years = [r["year"] for r in rows]
    fig, ax = plt.subplots(figsize=(7.2, 3.4))
    ax.fill_between(years, [r["assets"] for r in rows], color=SERIES[0], alpha=0.12, linewidth=0)
    ax.plot(years, [r["assets"] for r in rows], color=SERIES[0], linewidth=2, label="名目淨資產")
    ax.plot(years, [r["realAssets"] for r in rows], color=SERIES[2], linewidth=2, linestyle=(0, (4, 2)),
            label="通膨調整後（今日購買力）")
    ax.plot(years, [r["invested"] for r in rows], color=SERIES[1], linewidth=2, label="累計投入本金")
    last = rows[-1]
    _end_label(ax, last["year"], last["assets"], _twd_tick(last["assets"]))
    _end_label(ax, last["year"], last["realAssets"], _twd_tick(last["realAssets"]))
    _end_label(ax, last["year"], last["invested"], _twd_tick(last["invested"]))
    ax.set_xlim(0, last["year"] * 1.12)
    ax.set_ylim(bottom=0)
    _style(ax)
    ax.legend(frameon=False, fontsize=8, loc="upper left", labelcolor=INK_2)
    return _finish(fig)


def fan_chart(paths: list[dict], events: list[dict], title: str = "") -> bytes:
    years = [p["year"] for p in paths]
    fig, ax = plt.subplots(figsize=(7.2, 3.4))
    ax.fill_between(years, [p["p10"] for p in paths], [p["p90"] for p in paths],
                    color=SEQ["100"], linewidth=0, label="P10 – P90（80% 的未來落在這裡）")
    ax.fill_between(years, [p["p25"] for p in paths], [p["p75"] for p in paths],
                    color=SEQ["200"], linewidth=0, label="P25 – P75（一半的未來落在這裡）")
    ax.plot(years, [p["p50"] for p in paths], color=SEQ["550"], linewidth=2, label="中位數 P50")
    last = paths[-1]
    # 期末標籤：值太接近（例如提領期多條路徑歸零）就合併成一個標籤，避免文字疊在一起
    span = max(p["p90"] for p in paths) or 1
    groups: list[list[str]] = []
    group_vals: list[float] = []
    for key in ("p90", "p50", "p10"):
        v = last[key]
        if group_vals and abs(v - group_vals[-1]) < span * 0.06:
            groups[-1].append(key.upper())
        else:
            groups.append([key.upper()])
            group_vals.append(v)
    for keys, v in zip(groups, group_vals):
        _end_label(ax, last["year"], v, f"{' / '.join(keys)} {_twd_tick(v)}")
    ax.set_xlim(0, last["year"] * 1.16)
    ax.set_ylim(bottom=0)
    # 崩盤標記：畫在資料下方靠近 x 軸，相鄰年份交錯高度避免互相覆蓋
    y_top = ax.get_ylim()[1]
    for i, ev in enumerate(sorted(events, key=lambda e: e["year"])):
        ax.axvline(ev["year"], color=CRITICAL, linewidth=0.8, linestyle=(0, (2, 2)), ymax=0.55)
        ax.annotate(f"第 {ev['year']} 年 -{ev['drop']:g}%", (ev["year"], y_top * (0.56 + 0.06 * (i % 3))),
                    xytext=(3, 0), textcoords="offset points", fontsize=7, color=CRITICAL, va="bottom")
    _style(ax)
    if title:
        ax.set_title(title, fontsize=9, color=INK_2, loc="left")
    ax.legend(frameon=False, fontsize=7.5, loc="upper left", labelcolor=INK_2)
    return _finish(fig)


def scenario_bars(results: list[dict]) -> bytes:
    """results: [{name, successRate, medianEndingWealth}] — 兩張並排的小圖，同一組情境。"""
    names = [r["name"] for r in results]
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(7.2, 0.9 + 0.55 * len(results)))
    y = list(range(len(results)))[::-1]

    ax1.barh(y, [r["successRate"] for r in results], color=SERIES[0], height=0.55)
    for yi, r in zip(y, results):
        ax1.text(min(r["successRate"], 100) + 1.5, yi, f"{r['successRate']:.1f}%", va="center",
                 fontsize=8, color=INK_2)
    ax1.set_xlim(0, 118)
    ax1.set_title("不破產機率", fontsize=9, color=INK_2, loc="left")
    _style(ax1)
    ax1.yaxis.set_major_formatter(FuncFormatter(lambda v, _: names[len(names) - 1 - int(round(v))]
                                                if 0 <= int(round(v)) < len(names) else ""))
    ax1.set_yticks(y)
    ax1.tick_params(axis="y", labelsize=8, labelcolor=INK)
    ax1.xaxis.set_major_formatter(FuncFormatter(lambda v, _: f"{v:g}%"))
    ax1.set_xlabel("")
    ax1.grid(axis="y", visible=False)
    ax1.grid(axis="x", color=GRID, linewidth=0.6)

    med = [r["medianEndingWealth"] for r in results]
    ax2.barh(y, med, color=SERIES[0], height=0.55)
    all_zero = not med or max(med) <= 0
    top = 1.0 if all_zero else max(med)
    for yi, v in zip(y, med):
        ax2.text(v + top * 0.02, yi, _twd_tick(v), va="center", fontsize=8, color=INK_2)
    ax2.set_xlim(0, top * 1.3)
    ax2.set_title("期末淨資產中位數", fontsize=9, color=INK_2, loc="left")
    _style(ax2)
    ax2.set_yticks(y)
    ax2.yaxis.set_major_formatter(FuncFormatter(lambda v, _: ""))
    if all_zero:
        ax2.set_xticks([])
        ax2.text(0.5, -0.12, "三個情境的中位數路徑都在期末前耗盡", transform=ax2.transAxes,
                 ha="center", va="top", fontsize=7.5, color=MUTED)
    else:
        ax2.xaxis.set_major_formatter(FuncFormatter(_twd_tick))
    ax2.set_xlabel("")
    ax2.grid(axis="y", visible=False)
    ax2.grid(axis="x", color=GRID, linewidth=0.6)
    fig.tight_layout()
    return _finish(fig)


def housing_chart(rows: list[dict], crossover: Optional[int]) -> bytes:
    years = [r["year"] for r in rows]
    fig, ax = plt.subplots(figsize=(7.2, 3.4))
    ax.plot(years, [r["rentNetWorth"] for r in rows], color=SERIES[0], linewidth=2, label="租屋 + 全數投資")
    ax.plot(years, [r["buyNetWorth"] for r in rows], color=SERIES[1], linewidth=2, label="買房 + 剩餘投資")
    last = rows[-1]
    _end_label(ax, last["year"], last["rentNetWorth"], _twd_tick(last["rentNetWorth"]))
    _end_label(ax, last["year"], last["buyNetWorth"], _twd_tick(last["buyNetWorth"]))
    if crossover is not None:
        row = rows[crossover]
        ax.plot([crossover], [row["buyNetWorth"]], "o", color=SERIES[1], markersize=7,
                markeredgecolor=SURFACE, markeredgewidth=1.5)
        ax.annotate(f"第 {crossover} 年黃金交叉", (crossover, row["buyNetWorth"]), xytext=(6, 10),
                    textcoords="offset points", fontsize=8, color=INK_2)
    ax.set_xlim(0, last["year"] * 1.12)
    ax.set_ylim(bottom=0)
    _style(ax)
    ax.legend(frameon=False, fontsize=8, loc="upper left", labelcolor=INK_2)
    return _finish(fig)


def goal_chart(current_pace: list[float], target: float, years: int) -> bytes:
    xs = list(range(years + 1))
    fig, ax = plt.subplots(figsize=(7.2, 3.0))
    ax.plot(xs, current_pace, color=SERIES[0], linewidth=2, label="照目前步調")
    ax.axhline(target, color=SERIES[1], linewidth=1.5, linestyle=(0, (4, 2)), label="目標金額")
    _end_label(ax, years, current_pace[-1], _twd_tick(current_pace[-1]))
    _end_label(ax, years, target, _twd_tick(target))
    ax.set_xlim(0, years * 1.12)
    ax.set_ylim(bottom=0, top=max(target, max(current_pace)) * 1.3)
    _style(ax)
    ax.legend(frameon=False, fontsize=8, loc="upper left", labelcolor=INK_2)
    return _finish(fig)
