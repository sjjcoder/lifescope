"use client";

import { useEffect } from "react";
import Link from "next/link";

// 模擬器頁面的錯誤邊界：任何 render 期間的例外（例如壞掉的 localStorage 劇本）都會落到這裡，
// 而不是整頁白屏。提供重試與清除本機劇本兩個出口。
export default function SimulatorError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const clearLocalScenarios = () => {
    try {
      localStorage.removeItem("lifescope_scenarios");
    } catch {
      // 無法存取 localStorage 時忽略即可
    }
    reset();
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 pt-20">
      <div className="glass-card p-8 max-w-md w-full text-center">
        <div className="text-5xl mb-4">🧯</div>
        <h1 className="text-xl font-bold mb-2">模擬器暫時出了點問題</h1>
        <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
          可能是瀏覽器裡儲存的劇本資料損毀，或是一次暫時性的錯誤。你的輸入沒有被上傳，重試不會有任何損失。
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button onClick={reset} className="btn-accent text-sm !py-2.5 !px-6 cursor-pointer">
            重試
          </button>
          <button onClick={clearLocalScenarios} className="btn-secondary text-sm !py-2.5 !px-6 cursor-pointer">
            清除本機劇本並重試
          </button>
        </div>
        <Link href="/" className="inline-block mt-6 text-xs underline underline-offset-2" style={{ color: "var(--text-muted)" }}>
          回首頁
        </Link>
      </div>
    </main>
  );
}
