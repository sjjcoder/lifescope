"use client";

import React, { useState } from "react";
import { Scenario } from "@/lib/scenarios";

interface ScenarioManagerProps {
  scenarios: Scenario[];
  saveName: string;
  setSaveName: (v: string) => void;
  handleSave: () => void;
  handleLoad: (scenario: Scenario) => void;
  handleDelete: (id: string) => void;
  saveMessage: string;
}

export default function ScenarioManager({
  scenarios,
  saveName,
  setSaveName,
  handleSave,
  handleLoad,
  handleDelete,
  saveMessage,
}: ScenarioManagerProps) {
  // 刪除採兩段式確認，避免一鍵誤刪（localStorage 沒有回收桶）
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  return (
    <div className="mt-6 pt-5 border-t" style={{ borderColor: "var(--border-subtle)" }}>
      <p className="text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>
        💾 儲存劇本（{scenarios.length}/3）
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          aria-label="劇本名稱"
          placeholder="劇本名稱..."
          value={saveName}
          onChange={(e) => setSaveName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
          }}
          className="input-field !py-2 text-sm flex-1"
          maxLength={20}
        />
        <button onClick={handleSave} className="btn-accent !py-2 !px-4 text-sm shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-[var(--bg-card)]">
          存檔
        </button>
      </div>
      {/* 常駐的 live region：訊息出現／消失時螢幕閱讀器會播報 */}
      <p aria-live="polite" className="text-xs mt-2 min-h-[1rem]" style={{ color: "var(--accent-primary)" }}>
        {saveMessage}
      </p>
      {scenarios.length > 0 && (
        <ul className="mt-2 space-y-2">
          {scenarios.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between p-2.5 rounded-lg text-sm"
              style={{ background: "var(--bg-secondary)" }}
            >
              <button
                onClick={() => handleLoad(s)}
                aria-label={`載入劇本「${s.name}」`}
                className="text-left flex-1 truncate font-medium hover:text-[var(--accent-primary)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] rounded"
                style={{ color: "var(--text-secondary)" }}
              >
                {s.name}
              </button>
              {confirmDeleteId === s.id ? (
                <div className="flex items-center gap-1 ml-2 shrink-0">
                  <button
                    onClick={() => {
                      handleDelete(s.id);
                      setConfirmDeleteId(null);
                    }}
                    className="text-xs px-2 py-1.5 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                  >
                    確定刪除
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className="text-xs px-2 py-1.5 rounded hover:bg-white/10 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
                    style={{ color: "var(--text-muted)" }}
                  >
                    取消
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDeleteId(s.id)}
                  aria-label={`刪除劇本「${s.name}」`}
                  className="ml-2 w-7 h-7 flex items-center justify-center text-xs rounded hover:bg-red-500/20 hover:text-red-400 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                  style={{ color: "var(--text-muted)" }}
                >
                  ✕
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
