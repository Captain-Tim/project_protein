// build_dashboard.js — 讀本地 data/sessions/*.json,注入 dashboard.html 的 WORKOUT_DATA 標記區塊。
// 零網路、不需要任何 token。取代原本 export.js 的注入邏輯(export.js 已刪除,它舊有的「即時打 Notion」
// 行為已不存在——Notion 資料改由 scripts/migrate_from_notion.js 一次性搬進本地,之後只讀本地檔案)。
const fs = require("fs");
const path = require("path");

const sessionsDir = path.join(__dirname, "..", "data", "sessions");
const files = fs.existsSync(sessionsDir)
  ? fs.readdirSync(sessionsDir).filter((f) => f.endsWith(".json"))
  : [];

const sessions = files.map((f) =>
  JSON.parse(fs.readFileSync(path.join(sessionsDir, f), "utf8"))
);
sessions.sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));

const payload = {
  generated_at: new Date().toISOString(),
  session_count: sessions.length,
  sessions,
};

const dashPath = path.join(__dirname, "..", "dashboard.html");
let html = fs.readFileSync(dashPath, "utf8");
const re = /\/\*WORKOUT_DATA_START\*\/[\s\S]*?\/\*WORKOUT_DATA_END\*\//;
if (!re.test(html)) throw new Error("dashboard.html 找不到 WORKOUT_DATA 標記,中止以免誤改版面");
html = html.replace(re, "/*WORKOUT_DATA_START*/window.WORKOUT_DATA=" + JSON.stringify(payload) + ";/*WORKOUT_DATA_END*/");
fs.writeFileSync(dashPath, html, "utf8");

console.log(JSON.stringify({ sessions: sessions.length, injectedInto: "dashboard.html" }));
