// 唯讀:對每筆「真實 session」(Type != Report)抓頁面內文 block,
// 抽出表格儲存格(逐列逐格純文字)與段落/標題文字,dump 成 scripts/_content.json。
// 不寫回任何東西。給 migration 的 dry-run 還原對照用。
const fs = require("fs");
const path = require("path");

const TOKEN = fs
  .readFileSync(path.join(__dirname, "..", "notion_token.txt"), "utf8")
  .trim();
const NOTION_VERSION = "2022-06-28";

async function api(url) {
  const resp = await fetch(url, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Notion-Version": NOTION_VERSION,
    },
  });
  if (!resp.ok) throw new Error(`${resp.status} ${await resp.text()}`);
  return resp.json();
}

function rich(arr) {
  return (arr ?? []).map((x) => x.plain_text).join("");
}

async function childrenAll(blockId) {
  const out = [];
  let cursor = undefined;
  do {
    const u = new URL(`https://api.notion.com/v1/blocks/${blockId}/children`);
    u.searchParams.set("page_size", "100");
    if (cursor) u.searchParams.set("start_cursor", cursor);
    const data = await api(u.toString());
    out.push(...data.results);
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);
  return out;
}

async function extract(blockId) {
  const blocks = await childrenAll(blockId);
  const out = [];
  for (const b of blocks) {
    const t = b.type;
    if (t === "table") {
      const rows = await childrenAll(b.id);
      const cells = rows.map((r) =>
        (r.table_row?.cells ?? []).map((c) => rich(c).trim())
      );
      out.push({ kind: "table", rows: cells });
    } else if (b[t]?.rich_text) {
      const txt = rich(b[t].rich_text).trim();
      if (txt) out.push({ kind: t, text: txt });
    } else if (t === "divider") {
      // skip
    } else {
      out.push({ kind: t });
    }
  }
  return out;
}

(async () => {
  const rows = JSON.parse(
    fs.readFileSync(path.join(__dirname, "_rows.json"), "utf8")
  );
  const sessions = rows.filter((r) => r.Type !== "Report");
  const result = [];
  for (const s of sessions) {
    process.stderr.write(`fetching ${s.Date} ${s.Type} ${s.id}\n`);
    const content = await extract(s.id);
    result.push({
      id: s.id,
      Date: s.Date,
      Type: s.Type,
      title: s.title,
      props: Object.fromEntries(
        Object.entries(s).filter(
          ([k]) =>
            !["id", "Date", "Type", "title", "url", "Quality", "Energy"].includes(k)
        )
      ),
      content,
    });
  }
  const outPath = path.join(__dirname, "_content.json");
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2), "utf8");
  console.log("sessions:", result.length, "wrote:", outPath);
})();
