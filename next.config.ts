import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// 蒙地卡羅 API 所在的 origin（只允許瀏覽器連到這一個外部主機）。
// 從環境變數推導，換 API Gateway 網址時不用改這裡。
const mcApiOrigin = (() => {
  try {
    return process.env.NEXT_PUBLIC_MC_API_URL ? new URL(process.env.NEXT_PUBLIC_MC_API_URL).origin : "";
  } catch {
    return "";
  }
})();

// 靜態頁面無法使用 nonce（Next.js 會強制改成動態渲染），因此 script-src 保留 'unsafe-inline'
// 給 App Router 的 RSC inline script；其餘指令維持嚴格。開發模式 React 需要 'unsafe-eval' 與 HMR websocket。
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self' data:",
  `connect-src 'self' ${mcApiOrigin}${isDev ? " ws: wss:" : ""}`.trim(),
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // `next dev` 會把 _clientMiddlewareManifest.js 以 application/json 回應，開 nosniff 會讓瀏覽器拒絕執行並在 console 報錯；
  // 正式建置輸出的是真正的 .js 檔，所以只在 production 加這個標頭。
  ...(isDev ? [] : [{ key: "X-Content-Type-Options", value: "nosniff" }]),
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
