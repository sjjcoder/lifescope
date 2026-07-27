import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export default function TermsOfServicePage() {
  return (
    <>
      <Navbar />
      <main className="flex-1 pt-24 pb-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="glass-card p-8">
            <h1 className="text-2xl font-bold mb-6">服務條款 (Terms of Service)</h1>
            
            <div className="space-y-6 text-sm" style={{ color: "var(--text-secondary)" }}>
              <section>
                <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>1. 服務聲明</h2>
                <p className="leading-relaxed">
                  本平台（LifeScope）為開發者獨立建置之開源技術專案。提供之所有試算工具、圖表與數據結果，均為基於數學模型與歷史數據之模擬運算，對使用者完全免費（無付費牆、無訂閱方案），且僅供使用者個人財務規劃與技術交流之參考。
                </p>
                <p className="leading-relaxed mt-3">
                  本站不向使用者收取使用費用。站內可能出現第三方合作連結（例如券商開戶推薦）或自願性支持管道；若您透過合作連結完成註冊，本站可能自該第三方獲得推薦回饋。<strong>此類合作不影響試算引擎之邏輯與運算結果</strong>，亦不構成對任何金融商品之推薦，使用者無義務使用該等連結。
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>2. 免責聲明（重要）</h2>
                <p className="leading-relaxed">
                  本平台<strong>絕不提供任何特定金融商品之買賣建議、投資分析或推薦</strong>，亦不構成任何形式之投資顧問服務。所有運算結果不保證未來實際投資績效。投資市場具有風險，使用者應自行查證並承擔所有投資決策之最終結果與責任。
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>3. 資料準確性</h2>
                <p className="leading-relaxed">
                  「租屋 vs 買房」與「複利試算」等模型均存在簡化之假設條件（如：固定通膨率、忽略不預期支出、未計入房屋交易摩擦成本等）。真實世界之財務狀況更為複雜，包含稅務變更、法規修改與突發事件，平台之結果無法涵蓋所有變數，請勿將本平台結果作為唯一決策依據。
                </p>
              </section>
              
              <section>
                <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>4. 服務修改與終止</h2>
                <p className="leading-relaxed">
                  作為個人開源作品，我們保留隨時修改、暫停或終止平台部分或全部功能之權利，且不需事前承擔通知義務。平台不保證服務之永久存續與伺服器之穩定性。
                </p>
              </section>
            </div>
            
            <div className="mt-8 pt-6 border-t border-dashed" style={{ borderColor: "var(--border-subtle)" }}>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                最後更新日期：2026年4月
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
