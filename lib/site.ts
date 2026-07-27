// 對外連結與品牌資訊的單一設定來源。網域／GitHub 帳號／LINE 官方帳號確定後,只改這裡,
// metadata、OG、JSON-LD、sitemap、robots、頁尾連結全部會自動跟著更新。

// GitHub 帳號名稱 —— 改名時只需要改這一行(頁尾連結、作者 schema、@id 都由此衍生)。
// ⚠️ 改名後仍需手動處理的兩處:①README.md 裡的 GitHub 連結 ②git remote set-url
const GITHUB_USER = "sjjcoder";
const GITHUB_REPO = "lifescope";

export const SITE = {
  name: "LifeScope",
  // LifeScope 自己的正式網址(綁定自訂網域後改成新網域即可,全站 SEO/OG/schema 會一起更新)。
  url: "https://lifescope-three.vercel.app",
  title: "LifeScope — 人生財務沙盤推演平台",
  description:
    "台灣唯一的蒙地卡羅退休模擬器。用 1,000 次平行宇宙測試你的財務計畫成功率,壓力測試你的現金流極限。免費、免註冊、手機可用。",
  locale: "zh_TW",

  github: {
    user: GITHUB_USER,
    profileUrl: `https://github.com/${GITHUB_USER}`,
    repoUrl: `https://github.com/${GITHUB_USER}/${GITHUB_REPO}`,
    issuesUrl: `https://github.com/${GITHUB_USER}/${GITHUB_REPO}/issues`,
  },

  // 開發者身份 —— AEO/GEO 的 author entity 錨點(讓 AI 答案引擎把作品歸屬到同一人)。
  // 各平台請一律使用同一個 name 字串,一致性是這件事唯一的複利。
  author: {
    name: "sjjcoder",
    url: `https://github.com/${GITHUB_USER}`,
  },

  // Thescope LINE 官方帳號「加好友」連結。留空字串時,首頁與頁尾的 Thescope 互導入口會自動隱藏。
  thescopeLineUrl: "https://line.me/R/ti/p/@534silxe",
};
