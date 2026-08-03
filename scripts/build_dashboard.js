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

// 只放頁面真的會讀的東西。曾經有 generated_at,但沒有任何頁面用它,
// 唯一的效果是每跑一次 build 就讓 HTML 變成 modified,真正的改動被假 diff 淹掉。
const payload = { sessions };

let html = fs.readFileSync(dashPath, "utf8");
const re = /\/\*WORKOUT_DATA_START\*\/[\s\S]*?\/\*WORKOUT_DATA_END\*\//;
if (!re.test(html)) throw new Error(path.basename(dashPath) + " 找不到 WORKOUT_DATA 標記,中止以免誤改版面");
html = html.replace(re, "/*WORKOUT_DATA_START*/window.WORKOUT_DATA=" + JSON.stringify(payload) + ";/*WORKOUT_DATA_END*/");

// 炸雞券的使用紀錄(目前只有 Monkey 的頁面有 REWARDS 標記區塊)。
// 券本身不存——由訓練資料推導。達標規則只有一份、在頁面的 metrics 區塊裡,
// 這裡把那個區塊抽出來跑,而不是在腳本裡重寫一次判定,否則改門檻時規則會偷偷分岔。
const rewardsRe = /\/\*REWARDS_DATA_START\*\/[\s\S]*?\/\*REWARDS_DATA_END\*\//;
const ledgerPath = path.join(dir, "rewards", "redemptions.json");
// 手動核發的特別券。它推導不出來(是人做的決定),所以跟 redemptions 一樣要落地。
const grantsPath = path.join(dir, "rewards", "grants.json");
const hasLedger = fs.existsSync(ledgerPath);
let couponSummary = null;
let ledger = [];
let grants = [];

if (!rewardsRe.test(html) && hasLedger) {
  console.error("[!] " + ledgerPath + " 存在,但 " + path.basename(dashPath) + " 沒有 REWARDS 標記區塊,資料會被無聲忽略");
  process.exit(1);
}

if (rewardsRe.test(html)) {
  ledger = hasLedger ? JSON.parse(fs.readFileSync(ledgerPath, "utf8")) : [];
  if (!Array.isArray(ledger)) {
    console.error("[!] " + ledgerPath + " 必須是一個陣列");
    process.exit(1);
  }

  grants = fs.existsSync(grantsPath) ? JSON.parse(fs.readFileSync(grantsPath, "utf8")) : [];
  if (!Array.isArray(grants)) {
    console.error("[!] " + grantsPath + " 必須是一個陣列");
    process.exit(1);
  }

  const block = html.match(/<script id="metrics">([\s\S]*?)<\/script>/);
  if (!block) throw new Error(path.basename(dashPath) + ' 有 REWARDS 標記但找不到 <script id="metrics"> 區塊');
  const win = {};
  new Function("window", block[1])(win);
  const M = win.MonkeyMetrics;

  const result = M.coupons(M.buildDayRuns(sessions).runs, ledger, grants);
  if (result.problems.length) {
    console.error(
      "[!] " + person + " 的炸雞券紀錄對不上,中止 build:\n  " +
        result.problems.map((p) => p.id + ":" + p.reason).join("\n  ")
    );
    process.exit(1);
  }

  html = html.replace(
    rewardsRe,
    "/*REWARDS_DATA_START*/window.REWARDS_DATA=" + JSON.stringify({ redemptions: ledger, grants: grants }) + ";/*REWARDS_DATA_END*/"
  );
  couponSummary = { available: result.available, used: result.used };
}

fs.writeFileSync(dashPath, html, "utf8");

// 票券夾獨立頁(目前只有 Monkey 有)。它是自含檔,但主題 token 與指標邏輯一律從 dashboard 複製,
// 不在那邊自己寫一份——顏色改一次兩頁一起變,達標規則也只有一份來源。
const walletPath = path.join(root, "wallet-" + person.toLowerCase() + ".html");
const injectedInto = [path.basename(dashPath)];

if (fs.existsSync(walletPath)) {
  const theme = html.match(/:root\s*\{[\s\S]*?\}/);
  const metrics = html.match(/<script id="metrics">([\s\S]*?)<\/script>/);
  if (!theme) throw new Error(path.basename(dashPath) + " 找不到 :root 主題區塊");
  if (!metrics) throw new Error(path.basename(dashPath) + ' 找不到 <script id="metrics"> 區塊');

  const parts = [
    // 不要自己加換行:硬寫的 \n 會在 CRLF 的檔案裡混進兩行純 LF,
    // git 每次 build 後都會把這個檔標成已修改,但 diff 又是空的。
    // 換行一律沿用來源檔既有的格式。
    [/\/\*THEME_START\*\/[\s\S]*?\/\*THEME_END\*\//, "/*THEME_START*/" + theme[0] + "/*THEME_END*/"],
    [/\/\*METRICS_START\*\/[\s\S]*?\/\*METRICS_END\*\//, "/*METRICS_START*/" + metrics[1] + "/*METRICS_END*/"],
    [re, "/*WORKOUT_DATA_START*/window.WORKOUT_DATA=" + JSON.stringify(payload) + ";/*WORKOUT_DATA_END*/"],
    [rewardsRe, "/*REWARDS_DATA_START*/window.REWARDS_DATA=" + JSON.stringify({ redemptions: ledger, grants: grants }) + ";/*REWARDS_DATA_END*/"],
  ];

  let wallet = fs.readFileSync(walletPath, "utf8");
  parts.forEach(([pattern, replacement]) => {
    if (!pattern.test(wallet)) {
      throw new Error(path.basename(walletPath) + " 找不到標記區塊 " + pattern + ",中止以免誤改版面");
    }
    wallet = wallet.replace(pattern, replacement);
  });
  fs.writeFileSync(walletPath, wallet, "utf8");
  injectedInto.push(path.basename(walletPath));
}

console.log(
  JSON.stringify({
    person,
    sessions: sessions.length,
    coupons: couponSummary,
    injectedInto,
  })
);
