// publish.js — 把本機 dashboard.html 部署到 Netlify(production),回傳公開連結。
// 與 export.js 同一套 Node + fetch 寫法,不需安裝 Netlify CLI。
//
// 一次性設定:
//   1) Netlify → User settings → Applications → Personal access tokens → 產一個 token,
//      存成專案根目錄的 netlify_token.txt(純文字一行)。
//   2) 第一次跑會自動找到你的 site(優先比對 SITE_NAME,否則帳號只有一個 site 時直接用),
//      並把 site id 記到 scripts/netlify_site.txt,之後都部署到同一個站(網址固定)。
//
// 注意:這個 token 是「整個 Netlify 帳號」的權限,會隨 Google Drive 同步;
//       建議用一個專門放這個 dashboard 的 Netlify 帳號,降低 blast radius。
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.join(__dirname, "..");
const SITE_NAME = "cheery-fox-4d37b2"; // 你的 Netlify 站名(網址前綴);換站就改這裡

function readToken() {
  const f = path.join(ROOT, "netlify_token.txt");
  if (!fs.existsSync(f)) throw new Error("找不到 netlify_token.txt(請先在 Netlify 產 token 並存進專案根目錄)");
  const t = fs.readFileSync(f, "utf8").trim();
  if (!t) throw new Error("netlify_token.txt 是空的");
  return t;
}
const TOKEN = readToken();
const H = { Authorization: `Bearer ${TOKEN}` };

async function api(url, opts = {}) {
  const r = await fetch(url, opts);
  if (!r.ok) throw new Error(`${opts.method || "GET"} ${url} → ${r.status} ${await r.text()}`);
  return r.json();
}

async function resolveSiteId() {
  const f = path.join(__dirname, "netlify_site.txt");
  if (fs.existsSync(f)) {
    const id = fs.readFileSync(f, "utf8").trim();
    if (id) return id;
  }
  const sites = await api("https://api.netlify.com/api/v1/sites?per_page=100", { headers: H });
  const site = sites.find((s) => s.name === SITE_NAME) || (sites.length === 1 ? sites[0] : null);
  if (!site) throw new Error(`找不到站 '${SITE_NAME}';你帳號下的站:` + (sites.map((s) => s.name).join(", ") || "(無)"));
  fs.writeFileSync(f, site.id, "utf8");
  return site.id;
}

(async () => {
  const siteId = await resolveSiteId();
  const buf = fs.readFileSync(path.join(ROOT, "dashboard.html"));
  const sha = crypto.createHash("sha1").update(buf).digest("hex");

  // 1) 建 deploy:宣告要部署 index.html(= dashboard.html 的內容),讓網址根目錄就能開
  const deploy = await api(`https://api.netlify.com/api/v1/sites/${siteId}/deploys`, {
    method: "POST",
    headers: { ...H, "Content-Type": "application/json" },
    body: JSON.stringify({ files: { "/index.html": sha } }),
  });

  // 2) 若 Netlify 還沒有這份內容,上傳它
  if ((deploy.required || []).includes(sha)) {
    const r = await fetch(`https://api.netlify.com/api/v1/deploys/${deploy.id}/files/index.html`, {
      method: "PUT",
      headers: { ...H, "Content-Type": "application/octet-stream" },
      body: buf,
    });
    if (!r.ok) throw new Error(`上傳失敗 ${r.status} ${await r.text()}`);
  }

  // 3) 等部署 ready,印出公開連結
  let state = deploy.state, url = deploy.ssl_url || deploy.url, tries = 0;
  while (state !== "ready" && tries++ < 30) {
    await new Promise((res) => setTimeout(res, 1000));
    const d = await api(`https://api.netlify.com/api/v1/deploys/${deploy.id}`, { headers: H });
    state = d.state; url = d.ssl_url || d.url || url;
  }
  console.log("\n✅ 已發布:" + (url || `https://${SITE_NAME}.netlify.app`));
})().catch((e) => { console.error("\n✗ publish 失敗:", e.message); process.exit(1); });
