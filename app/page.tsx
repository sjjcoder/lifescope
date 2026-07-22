import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Link from "next/link";
import { SITE } from "@/lib/site";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
          {/* Background glow effects */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-20 blur-[120px]" style={{ background: "var(--accent-primary)" }} />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full opacity-15 blur-[120px]" style={{ background: "var(--accent-secondary)" }} />

          <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-20 text-center">
            {/* Badge */}
            <div className="animate-fade-in-up inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium mb-8" style={{ background: "var(--accent-primary-dim)", color: "var(--accent-primary)", border: "1px solid var(--border-accent)" }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--accent-primary)" }} />
              台灣唯一 · 蒙地卡羅財務模擬引擎
            </div>

            {/* Headline */}
            <h1 className="animate-fade-in-up animate-delay-100 text-4xl sm:text-5xl md:text-6xl font-bold leading-tight tracking-tight mb-6">
              你的退休計畫
              <br />
              <span className="gradient-text">有多少 % 成功率？</span>
            </h1>

            {/* Subtitle */}
            <p className="animate-fade-in-up animate-delay-200 text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              別再用固定報酬率騙自己。我們用 1,000 次平行宇宙模擬，
              <br className="hidden sm:block" />
              壓力測試你的現金流極限，找出計畫的破綻。
            </p>

            {/* CTA Buttons */}
            <div className="animate-fade-in-up animate-delay-300 flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/simulator" className="btn-accent text-base !py-3.5 !px-8 inline-block">
                🚀 免費開始沙盤推演
              </Link>
            </div>

            {/* Social proof */}
            <div className="animate-fade-in-up animate-delay-400 mt-12 flex items-center justify-center gap-6 text-sm" style={{ color: "var(--text-muted)" }}>
              <div className="flex items-center gap-1.5">
                <span style={{ color: "var(--accent-primary)" }}>✦</span> 完全免費
              </div>
              <div className="flex items-center gap-1.5">
                <span style={{ color: "var(--accent-primary)" }}>✦</span> 不用註冊
              </div>
              <div className="flex items-center gap-1.5">
                <span style={{ color: "var(--accent-primary)" }}>✦</span> 手機可用
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 relative">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                不只是<span style={{ color: "var(--accent-primary)" }}>計算機</span>，是人生沙盤推演
              </h2>
              <p className="text-base max-w-xl mx-auto" style={{ color: "var(--text-secondary)" }}>
                把你的收入、支出、投資計畫、人生大事全部放上時間軸，看看未來 30 年會怎麼走。
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Feature 1 */}
              <div className="glass-card p-7">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-5" style={{ background: "var(--accent-primary-dim)" }}>
                  📈
                </div>
                <h3 className="font-semibold text-xl mb-2">即時複利試算</h3>
                <p className="text-base leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  拖動滑桿即時看到資產成長曲線。支援自訂月投入、年化報酬率、通膨調整，秒算你幾年後有多少錢。
                </p>
              </div>

              {/* Feature 2 */}
              <div className="glass-card p-7">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-5" style={{ background: "var(--accent-secondary-dim)" }}>
                  🏠
                </div>
                <h3 className="font-semibold text-xl mb-2">租屋 vs 買房</h3>
                <p className="text-base leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  將頭期款拿去投資 vs 拿去買房，30 年後誰的淨資產更高？用數據說話，不再被話術綁架。
                </p>
              </div>

              {/* Feature 3 */}
              <div className="glass-card p-7">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-5" style={{ background: "rgba(139, 92, 246, 0.15)" }}>
                  🎲
                </div>
                <h3 className="font-semibold text-xl mb-2">蒙地卡羅壓測</h3>
                <p className="text-base leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  真實世界不是固定報酬率。我們用隨機模擬幫你跑 1,000 次平行宇宙，告訴你破產的機率有多高。
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-24" style={{ background: "var(--bg-secondary)" }}>
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">三步驟完成推演</h2>
            </div>

            <div className="space-y-8">
              {[
                { step: "01", title: "輸入你的財務現況", desc: "月收入、月支出、現有存款、每月投資金額。" },
                { step: "02", title: "設定投資假設", desc: "選擇年化報酬率、投資年限，或直接用「租屋 vs 買房」對比模式。" },
                { step: "03", title: "看見你的未來", desc: "即時圖表呈現資產成長曲線、財務自由年齡、關鍵數字摘要。" },
              ].map((item) => (
                <div key={item.step} className="flex gap-6 items-start">
                  <div className="shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-lg" style={{ background: "var(--accent-primary-dim)", color: "var(--accent-primary)" }}>
                    {item.step}
                  </div>
                  <div>
                    <h3 className="font-semibold text-xl mb-1">{item.title}</h3>
                    <p className="text-base" style={{ color: "var(--text-secondary)" }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Cross-promo → Thescope (gated on config; hidden until the LINE URL is set) */}
        {SITE.thescopeLineUrl && (
          <section className="py-24" style={{ background: "var(--bg-secondary)" }}>
            <div className="max-w-4xl mx-auto px-4 sm:px-6">
              <div className="glass-card p-8 sm:p-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-5" style={{ background: "var(--accent-secondary-dim)", color: "var(--accent-secondary)", border: "1px solid var(--border-accent)" }}>
                  <span>🛡️</span> 延伸工具
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold mb-4">
                  算完之後，<span className="gradient-text">誰陪你走那 20 年？</span>
                </h2>
                <p className="text-base leading-relaxed mb-8 max-w-2xl" style={{ color: "var(--text-secondary)" }}>
                  退休計畫要跑 20、30 年，難的從來不是算出數字，是這一路上不被市場的漲跌嚇跑。
                  <strong style={{ color: "var(--text-primary)" }}>Thescope</strong> 是我做的另一個免費工具——一個 LINE 機器人，
                  幫長期投資人過濾雜訊，在你追蹤的標的大跌時，提醒你當初買進的理由還在不在。
                </p>
                <a
                  href={SITE.thescopeLineUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-accent text-base !py-3.5 !px-8 inline-block"
                >
                  加入 Thescope LINE 好友（免費）
                </a>
                <p className="text-sm mt-4" style={{ color: "var(--text-muted)" }}>
                  同樣免費、不用註冊。
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Final CTA */}
        <section className="py-24 relative overflow-hidden">
          <div className="absolute inset-0 opacity-30" style={{ background: "radial-gradient(ellipse at center, var(--accent-primary) 0%, transparent 70%)" }} />
          <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold mb-6">
              你的財務計畫，<span className="gradient-text">經得起考驗嗎？</span>
            </h2>
            <p className="text-lg mb-8" style={{ color: "var(--text-secondary)" }}>
              免費、不用註冊、立即開始。
            </p>
            <Link href="/simulator" className="btn-accent text-lg !py-4 !px-10 inline-block animate-pulse-glow">
              開始沙盤推演
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
