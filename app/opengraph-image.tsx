import { ImageResponse } from "next/og";

export const alt = "LifeScope — Monte Carlo retirement & FIRE simulator";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// 說明:next/og 內建字型不含中文字形,故 OG 圖文字一律用拉丁字母/數字(中文會變成方框)。
// 品牌名 LifeScope 本身是拉丁字,足以承載識別;細節文案用英文,安全且在 LINE/社群預覽都能正確顯示。
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0B0F1A",
          padding: "72px 80px",
          fontFamily: "sans-serif",
        }}
      >
        {/* top accent gradient bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "1200px",
            height: "10px",
            background: "linear-gradient(90deg, #00D4AA 0%, #3B82F6 50%, #8B5CF6 100%)",
          }}
        />

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 24,
              letterSpacing: 4,
              color: "#00D4AA",
              fontWeight: 700,
            }}
          >
            MONTE CARLO RETIREMENT SIMULATOR
          </div>
          <div style={{ display: "flex", marginTop: 28, fontSize: 128, fontWeight: 800, letterSpacing: -3 }}>
            <span style={{ color: "#F1F5F9" }}>Life</span>
            <span style={{ color: "#00D4AA" }}>Scope</span>
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 24,
              fontSize: 40,
              color: "#94A3B8",
              lineHeight: 1.35,
              maxWidth: 900,
            }}
          >
            1,000 simulated futures. See your plan&rsquo;s real success rate.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {["Free", "No signup", "Runs in your browser"].map((t) => (
            <div
              key={t}
              style={{
                display: "flex",
                fontSize: 26,
                color: "#CBD5E1",
                border: "1px solid #26324a",
                borderRadius: 999,
                padding: "10px 24px",
              }}
            >
              {t}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
