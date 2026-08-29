// build_dashboard.js — 讀 data/<人名>/*.json,注入 dashboard-<人名>.html 的 WORKOUT_DATA 標記區塊。
// 零網路、不需要任何 token。
//
//   node scripts/build_dashboard.js Captain
//   node scripts/build_dashboard.js Monkey
//
// 兩個人共用這一支,規則完全一樣——刻意不做成兩支腳本,否則規則遲早偷偷分岔。
//
// 壞資料不能入庫(見 CLAUDE.md):每一筆 cardio 都必須有 duration_min + distance_km,
// HIIT 另外必須有 work_speed_kmh + work_min(見 specs/hiit-intervals.md)。
// 缺任何一個就 exit 1,連帶讓 GitHub Actions 部署失敗。build 失敗代表資料有問題,去修資料。
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

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
    // HIIT 的總時間與總距離含暖身收操,兩者都不反映訓練強度。真正定義這次間歇的是
    // 「衝多快、衝多久」,而那是設定出來的、每次一定知道,所以可以要求必填。
    if (c.exercise === "HIIT") {
      if (!num(c.work_speed_kmh)) problems.push(where + " cardio[" + j + "]:HIIT 缺 work_speed_kmh(衝刺段速度 km/h)");
      if (!num(c.work_min)) problems.push(where + " cardio[" + j + "]:HIIT 缺 work_min(衝刺段長度,分鐘)");
    }
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

// 頁面裡的 metrics 區塊是規則的唯一來源。這裡把它抽出來在 Node 跑,而不是在腳本
// 裡重寫一次判定,否則改規則時兩邊會偷偷分岔。metrics 區塊本身不會被 build 改寫,
// 所以抽一次就夠。
let metricsCache = null;
function loadMetrics(why) {
  if (metricsCache) return metricsCache;
  const block = html.match(/<script id="metrics">([\s\S]*?)<\/script>/);
  if (!block) throw new Error(path.basename(dashPath) + " 有 " + why + ' 標記但找不到 <script id="metrics"> 區塊');
  const win = {};
  new Function("window", block[1])(win);
  metricsCache = win.MonkeyMetrics;
  return metricsCache;
}

// 本地時區的今天。睡眠紀錄的「date 不能晚於今天」用它判斷。
const now = new Date();
const todayStr =
  now.getFullYear() + "-" +
  String(now.getMonth() + 1).padStart(2, "0") + "-" +
  String(now.getDate()).padStart(2, "0");

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

  const M = loadMetrics("REWARDS");

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

// 睡眠與用藥紀錄(目前只有 Monkey 的頁面有 SLEEP 標記區塊)。一晚一檔,放在
// sleep/ 子資料夾——上面掃訓練紀錄的 readdirSync 不遞迴,所以不會被誤抓,理由跟
// rewards/ 完全一樣。
//
// 減藥計畫不在這裡,也不在任何地方:它隨睡眠狀況變動,存了就會跟實際脫節。
// 資料層只有事實。
const sleepRe = /\/\*SLEEP_DATA_START\*\/[\s\S]*?\/\*SLEEP_DATA_END\*\//;
const sleepDir = path.join(dir, "sleep");
const sleepFiles = fs.existsSync(sleepDir)
  ? fs.readdirSync(sleepDir).filter((f) => f.endsWith(".json")).sort()
  : [];
let nights = [];

if (!sleepRe.test(html) && sleepFiles.length) {
  console.error("[!] " + sleepDir + " 有資料,但 " + path.basename(dashPath) + " 沒有 SLEEP 標記區塊,資料會被無聲忽略");
  process.exit(1);
}

if (sleepRe.test(html)) {
  const entries = sleepFiles.map((f) => ({
    file: f,
    data: JSON.parse(fs.readFileSync(path.join(sleepDir, f), "utf8")),
  }));

  // 必填缺一不可(見 CLAUDE.md)。缺就 exit 1,連帶讓部署失敗。
  // 注意這裡「不」檢查有沒有漏記某幾晚——漏記是集章卡上的空格,是要被看見的事實,
  // 不是要被擋下的錯誤。
  const problems = loadMetrics("SLEEP").validateNights(entries, todayStr);
  if (problems.length) {
    console.error(
      "[!] " + person + " 的睡眠紀錄不完整,中止 build:\n  " +
        problems.map((p) => p.file + ":" + p.reason).join("\n  ")
    );
    process.exit(1);
  }

  nights = entries.map((e) => e.data).sort((a, b) => a.date.localeCompare(b.date));
  html = html.replace(
    sleepRe,
    "/*SLEEP_DATA_START*/window.SLEEP_DATA=" + JSON.stringify({ nights: nights }) + ";/*SLEEP_DATA_END*/"
  );
}

// 課表(目前只有 Captain 的頁面有 PROGRAM 標記區塊)。一份檔,放在 program/ 子資料夾——
// 理由跟 rewards/、sleep/ 完全一樣:上面掃訓練紀錄的 readdirSync 不遞迴。
//
// 這裡只驗結構,不驗動作名稱。動作名稱是自由顯示文字:Leg Curl 還沒被練過、單位要看
// 器材才知道,拿 EXERCISE_PART 去驗會直接擋死 build,而把它加進對照表等於偷偷開了
// 記錄的門。打錯字的代價只是卡片少一行,一眼看得出來,不值得用 exit 1 換。
//
// 驗證寫在這裡而不是頁面的 metrics 區塊,因為 Captain 頁沒有那個區塊,而且這裡也沒有
// 規則要跟頁面共用:腳本管結構、頁面管渲染,不會分岔。
const PROGRAM_DOW = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const PROGRAM_PARTS = ["Leg/Shoulder", "Chest/Back", "Cardio"];
const PROGRAM_VARIANTS = ["HEAVY", "LIGHT"];

function validateProgram(p) {
  const out = [];
  const a = p && p.anchor;
  if (!a || typeof a.week_start !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(a.week_start)) {
    out.push("anchor.week_start 必須是 YYYY-MM-DD");
  } else if (new Date(a.week_start + "T00:00:00").getDay() !== 1) {
    out.push("anchor.week_start(" + a.week_start + ")不是星期一");
  }
  if (!a || (a.cycle !== "A" && a.cycle !== "B")) out.push("anchor.cycle 必須是 A 或 B");

  const cycles = p && p.cycles;
  if (!cycles) {
    out.push("缺 cycles");
    return out;
  }
  ["A", "B"].forEach((c) => {
    const week = cycles[c];
    if (!week) {
      out.push("缺 cycles." + c);
      return;
    }
    PROGRAM_DOW.forEach((d) => {
      // null 代表完全休息,是合法的值。缺 key 才是漏填——這兩件事在頁面上長得不一樣,
      // 所以驗證也要分開:檢查 key 在不在,而不是值是不是 truthy。
      if (!(d in week)) {
        out.push("cycles." + c + " 缺 " + d);
        return;
      }
      const day = week[d];
      if (day === null) return;
      if (!PROGRAM_PARTS.includes(day.part)) {
        out.push("cycles." + c + "." + d + ".part 不是已知部位:" + JSON.stringify(day.part));
      }
      if (day.variant != null && !PROGRAM_VARIANTS.includes(day.variant)) {
        out.push("cycles." + c + "." + d + ".variant 必須是 HEAVY 或 LIGHT,得到 " + JSON.stringify(day.variant));
      }
    });
  });
  return out;
}

const programRe = /\/\*PROGRAM_DATA_START\*\/[\s\S]*?\/\*PROGRAM_DATA_END\*\//;
const programPath = path.join(dir, "program", "current.json");
const hasProgram = fs.existsSync(programPath);
let program = null;

if (!programRe.test(html) && hasProgram) {
  console.error("[!] " + programPath + " 存在,但 " + path.basename(dashPath) + " 沒有 PROGRAM 標記區塊,資料會被無聲忽略");
  process.exit(1);
}

if (programRe.test(html)) {
  if (hasProgram) {
    program = JSON.parse(fs.readFileSync(programPath, "utf8"));
    const problems = validateProgram(program);
    if (problems.length) {
      console.error("[!] " + programPath + " 結構有問題,中止 build:\n  " + problems.join("\n  "));
      process.exit(1);
    }
  }
  // 沒有課表檔就注入 null,不是空物件:頁面靠 null 判斷要不要顯示課表區,
  // 語意比「有一個什麼都沒有的課表」清楚。
  html = html.replace(
    programRe,
    "/*PROGRAM_DATA_START*/window.PROGRAM_DATA=" + JSON.stringify(program) + ";/*PROGRAM_DATA_END*/"
  );
}

// 生日(兩人的頁面都有 PROFILE 標記區塊)。一份檔,放在 profile/ 子資料夾——理由跟 rewards/、
// sleep/、program/ 完全一樣:上面掃訓練紀錄的 readdirSync 不遞迴。
//
// 只存月日,不存出生年:repo 是 public,而且沒有任何地方用得到年份。
//
// 「今天是不是生日」在頁面打開時才算,不在這裡。頁面是靜態部署的、不會每天重 build,
// build 時算出來的答案隔天就過期了。
const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function validateProfile(p) {
  const out = [];
  if (!p || typeof p !== "object" || Array.isArray(p)) {
    out.push("必須是一個物件");
    return out;
  }
  if (typeof p.birthday !== "string" || !/^\d{2}-\d{2}$/.test(p.birthday)) {
    out.push("birthday 必須是 MM-DD 字串,得到 " + JSON.stringify(p.birthday));
    return out;
  }
  const mm = Number(p.birthday.slice(0, 2));
  const dd = Number(p.birthday.slice(3));
  // 只存月日就判斷不了閏年,所以 02-29 一律當合法。真的有人是那天生的再處理平年怎麼辦。
  if (mm < 1 || mm > 12) out.push("birthday 的月份不在 01-12:" + p.birthday);
  else if (dd < 1 || dd > DAYS_IN_MONTH[mm - 1]) out.push("birthday 的日期超出該月天數:" + p.birthday);
  return out;
}

const profileRe = /\/\*PROFILE_DATA_START\*\/[\s\S]*?\/\*PROFILE_DATA_END\*\//;
const profilePath = path.join(dir, "profile", "profile.json");
const hasProfile = fs.existsSync(profilePath);
let profile = null;

if (!profileRe.test(html) && hasProfile) {
  console.error("[!] " + profilePath + " 存在,但 " + path.basename(dashPath) + " 沒有 PROFILE 標記區塊,資料會被無聲忽略");
  process.exit(1);
}

if (profileRe.test(html)) {
  if (hasProfile) {
    profile = JSON.parse(fs.readFileSync(profilePath, "utf8"));
    const problems = validateProfile(profile);
    if (problems.length) {
      console.error("[!] " + profilePath + " 結構有問題,中止 build:\n  " + problems.join("\n  "));
      process.exit(1);
    }
  }
  // 沒有檔就注入 null,不是空物件:頁面靠 null 判斷「這個人沒設生日」,永遠不顯示帽子。
  // 跟 PROGRAM_DATA 同一個模式,替以後可能加入的人留路。
  html = html.replace(
    profileRe,
    "/*PROFILE_DATA_START*/window.PROFILE_DATA=" + JSON.stringify(profile) + ";/*PROFILE_DATA_END*/"
  );
}
// 內容指紋。頁面靠它判斷「我手上這份是不是最新的」——加到 iOS 主畫面之後,手機會存一份
// 頁面在本機,之後打開捷徑是顯示存的那一份,不會回來拿新的。頁面尾端的 freshness 區塊
// 會拿這個值跟伺服器上那份比對,不一樣就重載。
//
// 值刻意「不是」build 時間、也不是 commit hash:那兩個每跑一次就變,CI 的
// `git diff --exit-code` 會因此永遠失敗——就是上面 generated_at 那個註解講的坑,
// 這裡不能再踩一次。改用頁面內容自己的 hash:內容沒變 -> 值不變 -> 重建無 diff;
// 資料或版面變了 -> 值變 -> 手機重載。
//
// 涵蓋範圍是整份頁面,不只 data:改了 CSS 或渲染程式,手機一樣該看到新版。
const BUILD_ID_BLANK = "/*BUILD_ID_START*//*BUILD_ID_END*/";
const buildIdRe = /\/\*BUILD_ID_START\*\/[\s\S]*?\/\*BUILD_ID_END\*\//;

function stampBuildId(source, fileName) {
  if (!buildIdRe.test(source)) {
    throw new Error(fileName + " 找不到 BUILD_ID 標記,中止以免誤改版面");
  }
  // 先把上一次的值清成空佔位再算,否則 hash 會餵到自己,同樣的內容每次算出不同的值。
  const bare = source.replace(buildIdRe, BUILD_ID_BLANK);
  // 換行正規化後才算:工作目錄在 Windows 是 CRLF、在 CI 是 LF。不正規化的話同一份
  // 內容會算出兩個值,git diff 一樣會炸,只是換個方式。
  const id = crypto.createHash("sha256").update(bare.replace(/\r\n/g, "\n")).digest("hex").slice(0, 12);
  return bare.replace(buildIdRe, '/*BUILD_ID_START*/window.BUILD_ID="' + id + '";/*BUILD_ID_END*/');
}

html = stampBuildId(html, path.basename(dashPath));
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
  // 票券夾自己算一份指紋,不是複製 dashboard 的:兩頁的內容不一樣(票券夾沒有睡眠、
  // 沒有課表),共用一個值會讓票券夾在自己完全沒變的時候也被重載。
  wallet = stampBuildId(wallet, path.basename(walletPath));
  fs.writeFileSync(walletPath, wallet, "utf8");
  injectedInto.push(path.basename(walletPath));
}

console.log(
  JSON.stringify({
    person,
    sessions: sessions.length,
    coupons: couponSummary,
    nights: nights.length,
    program: program ? program.anchor : null,
    birthday: profile ? profile.birthday : null,
    injectedInto,
  })
);
