// 唯讀:把 Workout Database 全部列(分頁拉完)dump 成 scripts/_rows.json。
// 只讀屬性,不碰頁面內文,不寫回。確認總列數、Type 分布、各動作數字。
const fs = require("fs");
const path = require("path");

const TOKEN = fs
  .readFileSync(path.join(__dirname, "..", "notion_token.txt"), "utf8")
  .trim();
const DATABASE_ID = "2f8a947a-dbb9-8146-964b-dfc8e09e91e6";
const NOTION_VERSION = "2022-06-28";
const NUMBER_PROPS = [
  "Bench Press", "Deadlift", "Lat Pulldown", "Triceps Pushdown", "Seated Row",
  "Sumo Squat", "Hack Squat", "Split Squat", "Lateral Raise", "Face Pull",
  "HIIT", "Zone 2",
];

async function queryAll() {
  const rows = [];
  let cursor = undefined;
  do {
    const body = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;
    const resp = await fetch(
      `https://api.notion.com/v1/databases/${DATABASE_ID}/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          "Notion-Version": NOTION_VERSION,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );
    if (!resp.ok) throw new Error(`${resp.status} ${await resp.text()}`);
    const data = await resp.json();
    rows.push(...data.results);
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);
  return rows;
}

function simplify(p) {
  const props = p.properties;
  const sel = (n) => props[n]?.select?.name ?? null;
  const num = (n) => props[n]?.number;
  const title = (props[""]?.title ?? []).map((x) => x.plain_text).join("");
  const out = {
    id: p.id,
    title,
    Date: props.Date?.date?.start ?? null,
    Type: sel("Type"),
    Quality: sel("Quality"),
    Energy: sel("Energy"),
    url: p.url,
  };
  for (const n of NUMBER_PROPS) {
    const v = num(n);
    if (v !== undefined && v !== null) out[n] = v;
  }
  return out;
}

(async () => {
  const rows = (await queryAll()).map(simplify);
  rows.sort((a, b) => (a.Date ?? "").localeCompare(b.Date ?? ""));
  const outPath = path.join(__dirname, "_rows.json");
  fs.writeFileSync(outPath, JSON.stringify(rows, null, 2), "utf8");
  const byType = {};
  for (const r of rows) byType[r.Type] = (byType[r.Type] ?? 0) + 1;
  console.log("total rows:", rows.length);
  console.log("by Type:", byType);
  console.log("date range:", rows[0]?.Date, "->", rows[rows.length - 1]?.Date);
  console.log("wrote:", outPath);
})();
