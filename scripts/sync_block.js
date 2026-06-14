// 把指定 session 頁面「既有的」JSON code block,用 _proposed.json 的最新內容重寫。
// 用法:node sync_block.js <pageId>  (修正某筆後重新同步該頁)
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

async function api(url, method = "GET", body) {
  const r = await fetch(url, { method, headers: H, body: body ? JSON.stringify(body) : undefined });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.json();
}
const chunk = (s, n = 1900) => {
  const o = [];
  for (let i = 0; i < s.length; i += n) o.push(s.slice(i, i + n));
  return o.length ? o : [""];
};

(async () => {
  const id = process.argv[2];
  if (!id) throw new Error("需要 pageId 參數");
  const proposed = JSON.parse(fs.readFileSync(path.join(__dirname, "_proposed.json"), "utf8"));
  const sess = proposed.find((p) => p.id.replace(/-/g, "") === id.replace(/-/g, ""));
  if (!sess) throw new Error("_proposed.json 找不到該 id");

  const kids = await api(`https://api.notion.com/v1/blocks/${id}/children?page_size=100`);
  const code = kids.results.find((b) => b.type === "code");
  if (!code) throw new Error("該頁沒有 code block");

  const jsonStr = JSON.stringify(sess.json, null, 2);
  await api(`https://api.notion.com/v1/blocks/${code.id}`, "PATCH", {
    code: { language: "json", rich_text: chunk(jsonStr).map((c) => ({ type: "text", text: { content: c } })) },
  });
  console.log("synced", sess.Date, sess.Type);
})();
