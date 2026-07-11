// migrate_from_notion.js — 一次性遷移腳本。
// 把 Notion「Workout Database」現存的所有 session 頁面,寫成本地 data/Captain/<date>-<shortid>.json。
// 只在「Notion 退場」這次跑一次;跑完之後 notion_token.txt 就不再被任何腳本讀取。
// 之後的資料流全部改成 log-workout skill -> data/<人名>/ -> build 腳本。
const fs = require("fs");
const path = require("path");

const TOKEN = fs
  .readFileSync(path.join(__dirname, "..", "notion_token.txt"), "utf8")
  .trim();
const DATABASE_ID = "2f8a947a-dbb9-8146-964b-dfc8e09e91e6";
const H = {
  Authorization: `Bearer ${TOKEN}`,
  "Notion-Version": "2022-06-28",
  "Content-Type": "application/json",
};

async function api(url, method = "GET", body) {
  const r = await fetch(url, {
    method,
    headers: H,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.json();
}

async function queryAll() {
  const rows = [];
  let cursor;
  do {
    const body = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;
    const d = await api(
      `https://api.notion.com/v1/databases/${DATABASE_ID}/query`,
      "POST",
      body
    );
    rows.push(...d.results);
    cursor = d.has_more ? d.next_cursor : null;
  } while (cursor);
  return rows;
}

async function childrenAll(blockId) {
  const out = [];
  let cursor;
  do {
    const u = new URL(`https://api.notion.com/v1/blocks/${blockId}/children`);
    u.searchParams.set("page_size", "100");
    if (cursor) u.searchParams.set("start_cursor", cursor);
    const d = await api(u.toString());
    out.push(...d.results);
    cursor = d.has_more ? d.next_cursor : null;
  } while (cursor);
  return out;
}

function starCount(q) {
  if (!q) return null;
  return (q.match(/⭐/g) || []).length;
}

(async () => {
  const pages = await queryAll();
  const outDir = path.join(__dirname, "..", "data", "Captain");
  fs.mkdirSync(outDir, { recursive: true });

  const warnings = [];
  let written = 0;
  for (const p of pages) {
    const pr = p.properties;
    const date = pr.Date?.date?.start ?? null;
    const type = pr.Type?.select?.name ?? null;
    const blocks = await childrenAll(p.id);
    const code = blocks.find((b) => b.type === "code");
    let data = {};
    if (code) {
      const txt = code.code.rich_text.map((t) => t.plain_text).join("");
      try {
        data = JSON.parse(txt);
      } catch (e) {
        warnings.push(`${date}: JSON parse 失敗`);
      }
    } else {
      warnings.push(`${date}: 無 JSON code block`);
    }

    const session = {
      date,
      type,
      quality: starCount(pr.Quality?.select?.name),
      strength: data.strength ?? [],
      cardio: data.cardio ?? [],
      note: data.note ?? null,
    };

    const shortid = p.id.replace(/-/g, ""); // 用完整 id,8 碼縮寫曾在實測中撞名(兩筆 page id 前 16 碼幾乎相同)
    const file = path.join(outDir, `${date}-${shortid}.json`);
    fs.writeFileSync(file, JSON.stringify(session, null, 2), "utf8");
    written++;
  }

  console.log(JSON.stringify({ written, warnings }, null, 2));
})();
