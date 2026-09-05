import Link from "next/link";
import { SITE } from "@/lib/site";

export default function Footer() {
  return (
    <footer className="mt-auto border-t" style={{ background: "var(--bg-secondary)", borderColor: "var(--border-subtle)" }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm" style={{ background: "var(--gradient-button)" }}>
                <span className="font-bold" style={{ color: "var(--bg-primary)" }}>L</span>
              </div>
              <span className="font-bold text-base" style={{ color: "var(--text-primary)" }}>
                Life<span style={{ color: "var(--accent-primary)" }}>Scope</span>
              </span>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
              用機率思維，規劃你的財務人生。
            </p>
            <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>
              by{" "}
              <a
                href={SITE.github.profileUrl}
                target="_blank"
                rel="noreferrer author"
                className="transition-colors hover:text-[var(--accent-primary)]"
                style={{ color: "var(--text-secondary)" }}
              >
                {SITE.author.name}
              </a>
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold text-sm mb-3" style={{ color: "var(--text-secondary)" }}>功能</h4>
            <ul className="space-y-2">
              <li><a href="/simulator" className="text-sm transition-colors hover:text-[var(--accent-primary)]" style={{ color: "var(--text-muted)" }}>複利試算器</a></li>
              <li><a href="/simulator?tab=goal" className="text-sm transition-colors hover:text-[var(--accent-primary)]" style={{ color: "var(--text-muted)" }}>目標回推</a></li>
              <li><a href="/simulator?tab=mc" className="text-sm transition-colors hover:text-[var(--accent-primary)]" style={{ color: "var(--text-muted)" }}>蒙地卡羅模擬</a></li>
              <li><a href="/simulator?tab=housing" className="text-sm transition-colors hover:text-[var(--accent-primary)]" style={{ color: "var(--text-muted)" }}>租屋 vs 買房</a></li>
              {SITE.thescopeLineUrl && (
                <li><a href={SITE.thescopeLineUrl} target="_blank" rel="noreferrer" className="text-sm transition-colors hover:text-[var(--accent-primary)]" style={{ color: "var(--text-muted)" }}>Thescope 投資紀律 LINE ↗</a></li>
              )}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold text-sm mb-3" style={{ color: "var(--text-secondary)" }}>法律資訊</h4>
            <ul className="space-y-2">
              <li><Link href="/privacy" className="text-sm transition-colors hover:text-[var(--accent-primary)]" style={{ color: "var(--text-muted)" }}>隱私權政策</Link></li>
              <li><Link href="/terms" className="text-sm transition-colors hover:text-[var(--accent-primary)]" style={{ color: "var(--text-muted)" }}>服務條款</Link></li>
            </ul>
          </div>

          {/* Developer */}
          <div className="md:col-span-1">
            <h4 className="font-semibold text-sm mb-3" style={{ color: "var(--text-secondary)" }}>開發者資訊</h4>
            <ul className="space-y-2">
              <li><a href={SITE.github.repoUrl} target="_blank" rel="noreferrer" className="text-sm transition-colors hover:text-[var(--accent-primary)] flex items-center gap-2" style={{ color: "var(--text-muted)" }}>GitHub Repo</a></li>
            </ul>
          </div>
        </div>

        {/* Developer Claim & Disclaimer */}
        <div className="mt-8 pt-6 border-t space-y-4" style={{ borderColor: "var(--border-subtle)" }}>
          <div className="p-4 rounded-xl" style={{ background: "rgba(139, 92, 246, 0.05)", border: "1px solid rgba(139, 92, 246, 0.2)" }}>
            <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
              <span className="font-semibold" style={{ color: "var(--accent-secondary)" }}>開發者聲明：</span>
              本工具由開發者於業餘時間獨立建置，作為 <strong>Next.js 前端框架與 AWS Serverless 雲端運算架構</strong>之實作練習。本站不向使用者收取使用費用，所有試算功能完整開放、無付費牆。站內可能出現第三方合作連結（例如券商開戶推薦）或自願性支持管道；若您透過合作連結完成註冊，本站可能獲得推薦回饋——<strong>此類合作不影響試算引擎的邏輯與結果</strong>。若您有發現系統 Bug、對演算法有優化建議，或單純想進行技術交流，歡迎透過 GitHub Issue 與我聯繫。
            </p>
          </div>
          
          <div className="p-4 rounded-xl" style={{ background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.2)" }}>
            <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
              <span className="font-semibold" style={{ color: "var(--accent-warning)" }}>免責聲明：</span>
              本工具僅提供客觀數據運算與情境模擬，所有試算結果均基於使用者自行輸入之假設參數，不代表未來實際投資績效。
              本站不提供任何特定金融商品之買賣建議、投資分析或投資推薦，亦不構成《證券投資信託及顧問法》所規範之投資顧問服務。
              投資有風險，使用者應自行判斷並承擔所有投資決策之結果。
            </p>
          </div>
          <p className="text-xs mt-4 text-center" style={{ color: "var(--text-muted)" }}>
            © {new Date().getFullYear()} LifeScope. 原始碼採 PolyForm Noncommercial 授權（僅供非商業使用）。
          </p>
        </div>
      </div>
    </footer>
  );
}
