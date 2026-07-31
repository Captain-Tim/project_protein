// list_coupons.js — 列出某人目前的炸雞券(可用的、已使用的)。
// 零網路、不改任何檔案,純讀取。
//
//   node scripts/list_coupons.js Monkey
//
// 發券規則不在這裡重寫:抽出頁面的 <script id="metrics"> 來跑,
// 與 build_dashboard.js、test_monkey_metrics.js 同一份來源。改門檻只要改頁面那一處。
const fs = require("fs");
const path = require("path");

const PEOPLE = ["Captain", "Monkey"];
const person = process.argv[2];
if (!PEOPLE.includes(person)) {
  console.error("用法:node scripts/list_coupons.js <" + PEOPLE.join("|") + ">");
  process.exit(1);
}

const root = path.join(__dirname, "..");
const dir = path.join(root, "data", person);
const dashPath = path.join(root, "dashboard-" + person.toLowerCase() + ".html");
const ledgerPath = path.join(dir, "rewards", "redemptions.json");

const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".json")) : [];
const sessions = files.map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")));
const ledger = fs.existsSync(ledgerPath) ? JSON.parse(fs.readFileSync(ledgerPath, "utf8")) : [];

const html = fs.readFileSync(dashPath, "utf8");
const block = html.match(/<script id="metrics">([\s\S]*?)<\/script>/);
const win = {};
if (block) new Function("window", block[1])(win);
const M = win.MonkeyMetrics;
if (!M || !M.coupons) {
  console.error("[!] " + person + " 沒有炸雞券獎勵系統(" + path.basename(dashPath) + " 的 metrics 沒有 coupons())");
  process.exit(1);
}

const result = M.coupons(M.buildDayRuns(sessions).runs, ledger);
console.log(JSON.stringify({
  person,
  available: result.coupons.filter((c) => c.status === "available"),
  used: result.coupons.filter((c) => c.status === "used"),
  problems: result.problems,
}, null, 2));
