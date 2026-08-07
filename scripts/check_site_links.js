// check_site_links.js — 檢查 _site/ 真的能上線,不是缺一半的網站。
// 先跑 node scripts/make_site.js,再跑這支。
//
// 考兩題:
//   1. repo 根目錄的頁面有沒有漏進 make_site.js 的 SITE 清單
//   2. 頁面裡的本地連結(href / src / url())在 _site 裡找不找得到
//
// 這兩種壞法本地開起來都完全正常,只有部署後才看得到,所以要擋在 merge 之前。
//
//   node scripts/check_site_links.js
const fs = require("fs");
const path = require("path");
const { SITE, root, outDir } = require("./make_site.js");

const problems = [];

// --- 第 1 題:根目錄的頁面全都要在 SITE 清單裡 -------------------------------
// _*.html 是驗證用的暫存頁(見 .gitignore),不算。
const listed = new Set(SITE.map((e) => e.from));
fs.readdirSync(root)
  .filter((f) => f.endsWith(".html") && !f.startsWith("_"))
  .forEach((f) => {
    if (!listed.has(f)) {
      problems.push(f + " 沒有進 scripts/make_site.js 的 SITE 清單 -> 線上會是 404");
    }
  });

// --- 第 2 題:頁面裡的本地連結在 _site 裡都要存在 ---------------------------
if (!fs.existsSync(outDir)) {
  console.error("[!] 找不到 _site/,先跑 node scripts/make_site.js");
  process.exit(1);
}

const EXTERNAL = /^(?:[a-z][a-z0-9+.-]*:|\/\/|#|\?)/i;

function htmlFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) return htmlFiles(p);
    return d.name.endsWith(".html") ? [p] : [];
  });
}

htmlFiles(outDir).forEach((file) => {
  const html = fs.readFileSync(file, "utf8");
  const refs = [
    ...html.matchAll(/(?:href|src)\s*=\s*"([^"]+)"/g),
    ...html.matchAll(/(?:href|src)\s*=\s*'([^']+)'/g),
    ...html.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g),
  ].map((m) => m[1].trim());

  new Set(refs).forEach((ref) => {
    if (!ref || EXTERNAL.test(ref)) return;
    // 去掉 query 與 anchor,還原 %20 這類編碼
    let target = ref.split("#")[0].split("?")[0];
    if (!target) return;
    try {
      target = decodeURIComponent(target);
    } catch (e) {
      problems.push(path.relative(outDir, file) + " 的連結編碼壞掉:" + ref);
      return;
    }
    const base = target.startsWith("/") ? outDir : path.dirname(file);
    const resolved = path.join(base, target.replace(/^\//, ""));
    if (!fs.existsSync(resolved)) {
      problems.push(path.relative(outDir, file) + " 指向 " + target + ",但 _site 裡沒有這個檔");
    }
  });
});

if (problems.length) {
  console.error("[!] _site 檢查沒過:");
  problems.forEach((p) => console.error("  - " + p));
  console.error("\n修法:把缺的檔加進 scripts/make_site.js 的 SITE 清單,或修掉頁面裡的連結。");
  process.exit(1);
}

console.log(JSON.stringify({ pages: htmlFiles(outDir).length, problems: 0 }));
