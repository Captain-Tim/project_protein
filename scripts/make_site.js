// make_site.js — 把要上線的檔案複製進 _site/。
// GitHub Pages 上只有 _site 裡的東西,漏抄就是線上 404、本地開卻完全正常。
//
// 部署(pages.yml 的 deploy)和 PR 檢查(check_site_links.js)讀的是同一份 SITE 清單,
// 所以「新增頁面」只要改這裡一行,兩邊不會偷偷分岔。
//
//   node scripts/make_site.js
const fs = require("fs");
const path = require("path");

// from:repo 內的路徑(檔案或資料夾)。to:放進 _site 的位置,省略就同名。
// 新增頁面 = 這裡加一行 + pages.yml 的 paths 觸發清單加一筆。
const SITE = [
  // Captain 頁同時當首頁,也保留原檔名(已分享出去的連結不會壞)
  { from: "dashboard-captain.html", to: "index.html" },
  { from: "dashboard-captain.html" },
  { from: "dashboard-monkey.html" },
  { from: "wallet-monkey.html" },
  { from: "profile" },
  // 加到主畫面用的圖示,漏抄的話主畫面圖示會變空白
  { from: "icons" },
];

const root = path.join(__dirname, "..");
const outDir = path.join(root, "_site");

function makeSite() {
  const missing = SITE.filter((e) => !fs.existsSync(path.join(root, e.from)));
  if (missing.length) {
    console.error("[!] SITE 清單指到不存在的來源:" + missing.map((e) => e.from).join(", "));
    process.exit(1);
  }

  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  SITE.forEach((e) => {
    const dest = path.join(outDir, e.to || e.from);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.cpSync(path.join(root, e.from), dest, { recursive: true });
  });
}

module.exports = { SITE, root, outDir };

if (require.main === module) {
  makeSite();
  console.log(JSON.stringify({ entries: SITE.length, outDir: "_site" }));
}
