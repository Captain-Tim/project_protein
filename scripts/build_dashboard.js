// build_dashboard.js — 讀 data/<人名>/*.json,注入 dashboard-<人名>.html 的 WORKOUT_DATA 標記區塊。
// 零網路、不需要任何 token。
//
//   node scripts/build_dashboard.js Captain
//   node scripts/build_dashboard.js Monkey
//
// 兩個人共用這一支,規則完全一樣——刻意不做成兩支腳本,否則規則遲早偷偷分岔。
//
// 壞資料不能入庫(見 CLAUDE.md):每一筆 cardio 都必須有 duration_min + distance_km。
// 缺任何一個就 exit 1,連帶讓 GitHub Actions 部署失敗。build 失敗代表資料有問題,去修資料。
const fs = require("fs");
const path = require("path");

const PEOPLE = ["Captain", "Monkey"];
const person = process.argv[2];
if (!PEOPLE.includes(person)) {
  console.error("用法:node scripts/build_dashboard.js <" + PEOPLE.join("|") + ">");
  process.exit(1);
}

const root = path.join(__dirname, "..");
const dir = path.join(root, "data", person);
const dashPath = path.join(root, "dashboard-" + person.toLowerCase() + ".html");

const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".json")) : [];
const sessions = files.map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")));
sessions.sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));

// 驗證:資料一定要完整
const num = (v) => typeof v === "number" && isFinite(v) && v > 0;
const problems = [];
sessions.forEach((s, i) => {
  const where = files[i] || s.date || "(unknown file)";
  if (!s.date) problems.push(where + ":缺 date");
  (s.cardio || []).forEach((c, j) => {
    if (!num(c.duration_min)) problems.push(where + " cardio[" + j + "]:缺 duration_min");
    if (!num(c.distance_km)) problems.push(where + " cardio[" + j + "]:缺 distance_km");
  });
});
if (problems.length) {
  console.error("[!] " + person + " 的資料不完整,中止 build:\n  " + problems.join("\n  "));
  process.exit(1);
}

const payload = {
  generated_at: new Date().toISOString(),
  session_count: sessions.length,
  sessions,
};

let html = fs.readFileSync(dashPath, "utf8");
const re = /\/\*WORKOUT_DATA_START\*\/[\s\S]*?\/\*WORKOUT_DATA_END\*\//;
if (!re.test(html)) throw new Error(path.basename(dashPath) + " 找不到 WORKOUT_DATA 標記,中止以免誤改版面");
html = html.replace(re, "/*WORKOUT_DATA_START*/window.WORKOUT_DATA=" + JSON.stringify(payload) + ";/*WORKOUT_DATA_END*/");
fs.writeFileSync(dashPath, html, "utf8");

console.log(JSON.stringify({ person, sessions: sessions.length, injectedInto: path.basename(dashPath) }));
