import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

// 爬蟲政策：想被 AI 答案引擎「引用」，但不無償供應「只拿去訓練」的爬蟲。
//
// 關鍵前提是同一家公司通常有兩支不同的 bot，分屬不同用途：
//   OpenAI    OAI-SearchBot（ChatGPT 搜尋結果與引用）  vs  GPTBot（模型訓練）
//   Anthropic Claude-SearchBot（Claude 搜尋與引用）    vs  ClaudeBot（模型訓練）
//   Google    Googlebot（搜尋，AI Overviews 也用這個）  vs  Google-Extended（Gemini 訓練）
//   Apple     Applebot（Spotlight／Siri 搜尋）          vs  Applebot-Extended（Apple Intelligence 訓練）
// 因此封鎖訓練型並不會讓網站從 AI 答案或搜尋結果中消失——前提是檢索型要放行。
//
// ⚠️ robots.txt 只是君子協定，惡意爬蟲可以偽裝 UA 直接忽略它。
// 真正的濫用與帳單防護在 API Gateway 的速率限制與 Lambda 的 Origin 檢查（見 backend/README.md）。

// 檢索／回答型：會把使用者帶回來或標註引用來源，全部放行。
const SEARCH_AND_ANSWER_BOTS = [
  "Googlebot",
  "Bingbot",
  "Applebot",
  "DuckAssistBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
];

// 純訓練／資料轉售型：不帶流量也不標來源，封鎖。日後要增減直接改這個陣列。
const TRAINING_ONLY_BOTS = [
  "GPTBot",
  "ClaudeBot",
  "anthropic-ai",
  "Google-Extended",
  "Applebot-Extended",
  "CCBot",
  "Bytespider",
  "Meta-ExternalAgent",
];

export default function robots(): MetadataRoute.Robots {
  const base = SITE.url.replace(/\/$/, "");
  return {
    rules: [
      { userAgent: SEARCH_AND_ANSWER_BOTS, allow: "/" },
      { userAgent: TRAINING_ONLY_BOTS, disallow: "/" },
      // 其餘一律放行（一般搜尋引擎、監測服務等）。robots.txt 是取「最相符」的 UA 群組，
      // 所以上面兩組不會被這條蓋掉。
      { userAgent: "*", allow: "/" },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
