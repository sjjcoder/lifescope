// 對外連結與品牌資訊的單一設定來源。網域／LINE 官方帳號確定後,只改這裡,
// metadata、OG、JSON-LD、sitemap、robots 全部會自動跟著更新。
export const SITE = {
  name: "LifeScope",
  // LifeScope 自己的正式網址(綁定自訂網域後改成新網域即可,全站 SEO/OG/schema 會一起更新)。
  url: "https://lifescope-three.vercel.app",
  title: "LifeScope — 人生財務沙盤推演平台",
  description:
    "台灣唯一的蒙地卡羅退休模擬器。用 1,000 次平行宇宙測試你的財務計畫成功率,壓力測試你的現金流極限。免費、免註冊、手機可用。",
  locale: "zh_TW",

  // 開發者身份 —— AEO/GEO 的 author entity 錨點(讓 AI 答案引擎把作品歸屬到同一人)。
  // 未來若有個人網站,可把 url 換成個人頁並在該頁放 Person schema;name 填了才會寫進 schema。
  author: {
    name: "",
    url: "https://github.com/a0955329835-code",
  },

  // Thescope LINE 官方帳號「加好友」連結。留空字串時,首頁與頁尾的 Thescope 互導入口會自動隱藏。
  thescopeLineUrl: "https://line.me/R/ti/p/@534silxe",
};
