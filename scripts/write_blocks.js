// 把 _proposed.json 的每筆 session JSON,以 code block 附加到對應 Notion 頁面內文。
// 只「新增」一個 divider + heading + json code block,不動屬性與原表格。
// 安全機制:跳過空場次;頁面若已有 code block 視為已遷移而跳過(可重跑)。
const fs = require("fs");
const path = require("path");

const TOKEN = fs
  .readFileSync(path.join(__dirname, "..", "notion_token.txt"), "utf8")
  .trim();
const NOTION_VERSION = "2022-06-28";

async function api(url, method = "GET", body) {
  const resp = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!resp.ok) throw new Error(`${resp.status} ${await resp.text()}`);
  return resp.json();
}

function chunk(str, size = 1900) {
  const out = [];
  for (let i = 0; i < str.length; i += size) out.push(str.slice(i, i + size));
  return out.length ? out : [""];
}

function isEmpty(json) {
  const s = json.strength || [];
  const c = json.cardio || [];
  return s.length === 0 && c.length === 0;
}

async function hasCodeBlock(pageId) {
  const data = await api(
    `https://api.notion.com/v1/blocks/${pageId}/children?page_size=100`
  );
  return data.results.some((b) => b.type === "code");
}

async function append(pageId, json) {
  const jsonStr = JSON.stringify(json, null, 2);
  const children = [
    { type: "divider", divider: {} },
    {
      type: "heading_2",
      heading_2: {
        rich_text: [{ type: "text", text: { content: "📦 Workout Data (JSON)" } }],
      },
    },
    {
      type: "code",
      code: {
        language: "json",
        rich_text: chunk(jsonStr).map((c) => ({
          type: "text",
          text: { content: c },
        })),
      },
    },
  ];
  await api(`https://api.notion.com/v1/blocks/${pageId}/children`, "PATCH", {
    children,
  });
}

(async () => {
  const sessions = JSON.parse(
    fs.readFileSync(path.join(__dirname, "_proposed.json"), "utf8")
  );
  let written = 0,
    skippedEmpty = 0,
    skippedDone = 0;
  for (const s of sessions) {
    if (isEmpty(s.json)) {
      skippedEmpty++;
      process.stderr.write(`skip(empty) ${s.Date} ${s.Type}\n`);
      continue;
    }
    if (await hasCodeBlock(s.id)) {
      skippedDone++;
      process.stderr.write(`skip(done)  ${s.Date} ${s.Type}\n`);
      continue;
    }
    await append(s.id, s.json);
    written++;
    process.stderr.write(`wrote       ${s.Date} ${s.Type}\n`);
  }
  console.log(
    JSON.stringify({ total: sessions.length, written, skippedEmpty, skippedDone })
  );
})();
