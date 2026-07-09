// promote_pending.js — 把 data/pending/ 裡手機端寫入的新紀錄,審查後一次搬進 data/sessions/。
// 使用方式:自己先看過 data/pending 底下的檔案內容,覺得沒問題就跑這支,全部核准搬過去
// (不做逐筆互動確認)。純檔案操作,不做 git commit/push——commit/push 交給 publish.cmd。
const fs = require("fs");
const path = require("path");

const pendingDir = path.join(__dirname, "..", "data", "pending");
const sessionsDir = path.join(__dirname, "..", "data", "sessions");
fs.mkdirSync(pendingDir, { recursive: true });
fs.mkdirSync(sessionsDir, { recursive: true });

const files = fs.readdirSync(pendingDir).filter((f) => f.endsWith(".json"));
if (!files.length) {
  console.log("data/pending 目前沒有待審查的紀錄。");
  process.exit(0);
}

console.log(`即將核准 ${files.length} 筆紀錄:`);
for (const f of files) {
  const s = JSON.parse(fs.readFileSync(path.join(pendingDir, f), "utf8"));
  const exCount = (s.strength?.length ?? 0) + (s.cardio?.length ?? 0);
  console.log(`  ${f} — ${s.date ?? "?"} ${s.type ?? "?"} (${exCount} 個動作)`);
  fs.renameSync(path.join(pendingDir, f), path.join(sessionsDir, f));
}
console.log("已全部搬進 data/sessions。記得跑 publish.cmd 部署最新版本。");
