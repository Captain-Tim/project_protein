// 刪除(archive 到垃圾桶)待刪頁:全部 Type=Report + 2 筆空場次。
// 只動這兩類,絕不碰其他真實 session。
const fs = require("fs");
const path = require("path");

const TOKEN = fs
  .readFileSync(path.join(__dirname, "..", "notion_token.txt"), "utf8")
  .trim();
const H = {
  Authorization: `Bearer ${TOKEN}`,
  "Notion-Version": "2022-06-28",
  "Content-Type": "application/json",
};

const rows = JSON.parse(fs.readFileSync(path.join(__dirname, "_rows.json"), "utf8"));
const proposed = JSON.parse(
  fs.readFileSync(path.join(__dirname, "_proposed.json"), "utf8")
);

const reports = rows.filter((r) => r.Type === "Report");
const empties = proposed.filter(
  (p) => ((p.json.strength || []).length + (p.json.cardio || []).length) === 0
);

const targets = [
  ...reports.map((r) => ({ id: r.id, why: "Report", Date: r.Date })),
  ...empties.map((e) => ({ id: e.id, why: "empty", Date: e.Date })),
];

(async () => {
  if (targets.length !== 14) {
    console.error(`預期 14 筆,實際 ${targets.length},中止以策安全`);
    process.exit(1);
  }
  for (const t of targets) {
    const r = await fetch(`https://api.notion.com/v1/pages/${t.id}`, {
      method: "PATCH",
      headers: H,
      body: JSON.stringify({ archived: true }),
    });
    if (!r.ok) throw new Error(`${t.Date} ${r.status} ${await r.text()}`);
    process.stderr.write(`archived ${t.Date} (${t.why})\n`);
  }
  console.log(JSON.stringify({ archived: targets.length }));
})();
