import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SITE } from "@/lib/site";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: SITE.title, template: `%s · ${SITE.name}` },
  description: SITE.description,
  keywords: ["理財", "退休規劃", "蒙地卡羅", "複利計算", "租屋買房", "FIRE", "財務自由", "退休試算"],
  applicationName: SITE.name,
  authors: SITE.author.name
    ? [{ name: SITE.author.name, url: SITE.author.url }]
    : [{ url: SITE.author.url }],
  creator: SITE.author.name || undefined,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: SITE.locale,
    url: SITE.url,
    siteName: SITE.name,
    title: SITE.title,
    description: SITE.description,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE.title,
    description: SITE.description,
  },
  robots: { index: true, follow: true },
};

// JSON-LD 結構化資料:讓搜尋引擎與 AI 答案引擎理解「這是什麼、免費、誰做的」。
// 作者 Person 用穩定的 @id,未來三個產品可共用同一個 @id 串成同一人作品(AEO/GEO 研究建議)。
const authorId = `${SITE.author.url}#me`;
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE.url}/#website`,
      url: SITE.url,
      name: SITE.name,
      description: SITE.description,
      inLanguage: "zh-Hant-TW",
      publisher: { "@id": authorId },
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${SITE.url}/#app`,
      name: SITE.name,
      url: SITE.url,
      applicationCategory: "FinanceApplication",
      operatingSystem: "Web",
      description: SITE.description,
      inLanguage: "zh-Hant-TW",
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "TWD" },
      author: { "@id": authorId },
    },
    {
      "@type": "Person",
      "@id": authorId,
      url: SITE.author.url,
      ...(SITE.author.name ? { name: SITE.author.name } : {}),
      sameAs: [SITE.author.url],
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-TW"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
          }}
        />
        {children}
      </body>
    </html>
  );
}
