// export.js — 讀 Workout Database 各頁的 JSON code block + session 屬性,
// 把資料「注入」dashboard.html 的 /*WORKOUT_DATA_START/END*/ 標記區塊,
// 讓 dashboard.html 成為單一自含檔(可單檔分享、手機離線開)。不再產 data.js。
// 唯讀 Notion;只改本機 dashboard.html 的資料區塊。Stop hook 可自動跑 `node scripts/export.js`。
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
  const sessions = [];
  const warnings = [];
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
    sessions.push({
      date,
      type,
      quality: starCount(pr.Quality?.select?.name),
      energy: pr.Energy?.select?.name ?? null,
      strength: data.strength ?? [],
      cardio: data.cardio ?? [],
      note: data.note ?? null,
    });
  }
  sessions.sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));

  const payload = {
    generated_at: new Date().toISOString(),
    session_count: sessions.length,
    sessions,
  };
  // 把資料注入 dashboard.html 的標記區塊(單一自含檔,可單檔分享,不再產 data.js)
  const dashPath = path.join(__dirname, "..", "dashboard.html");
  let html = fs.readFileSync(dashPath, "utf8");
  const re = /\/\*WORKOUT_DATA_START\*\/[\s\S]*?\/\*WORKOUT_DATA_END\*\//;
  if (!re.test(html)) throw new Error("dashboard.html 找不到 WORKOUT_DATA 標記,中止以免誤改版面");
  html = html.replace(re, "/*WORKOUT_DATA_START*/window.WORKOUT_DATA=" + JSON.stringify(payload) + ";/*WORKOUT_DATA_END*/");
  fs.writeFileSync(dashPath, html, "utf8");
  console.log(JSON.stringify({ sessions: sessions.length, warnings, injectedInto: "dashboard.html" }));
})();
