"use client";
import { useState } from "react";
import Link from "next/link";

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50" style={{ background: "rgba(11,15,26,0.85)", backdropFilter: "blur(12px)", borderBottom: "1px solid var(--border-subtle)" }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg" style={{ background: "var(--gradient-button)" }}>
              <span className="font-bold" style={{ color: "var(--bg-primary)" }}>L</span>
            </div>
            <span className="font-bold text-lg tracking-tight" style={{ color: "var(--text-primary)" }}>
              Life<span style={{ color: "var(--accent-primary)" }}>Scope</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
          </div>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/simulator" className="btn-accent text-sm !py-2 !px-5 inline-block">
              開始沙盤推演
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            id="mobile-menu-toggle"
            className="md:hidden p-2 rounded-lg cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
            style={{ color: "var(--text-secondary)" }}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "關閉選單" : "開啟選單"}
            aria-expanded={mobileOpen}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden border-t" style={{ background: "var(--bg-secondary)", borderColor: "var(--border-subtle)" }}>
          <div className="px-4 py-3 space-y-1">
            <div className="pt-2">
              <Link href="/simulator" onClick={() => setMobileOpen(false)} className="btn-accent text-sm !py-2 block text-center">
                開始沙盤推演
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
