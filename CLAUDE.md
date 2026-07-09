# Project Protein — Dashboard 專案

> 與使用者溝通一律繁體中文,不要出現簡體字。動到外部系統(GitHub repo 可見度、Pages 設定等)時,
> 必須在回覆中明確說明改了什麼、有什麼後果。

## 1. 專案目標

把訓練紀錄做成單一自含的 **本機 HTML dashboard**(`dashboard.html`),資料完全在地維護、GitHub 版控,
並用 GitHub Pages 公開一個唯讀連結分享。

## 2. 架構與約束

- **`data/sessions/*.json` = 唯一真相來源**。Repo `Captain-Tim/project_protein` 是 **public**(GitHub Pages
  免費方案要求),分支 `master`。
- **資料流**:手機拍照 → claude.ai(GitHub connector)寫入 `data/pending/` → `review.cmd` 核准搬進
  `data/sessions/` → `scripts/build_dashboard.js` 注入 `dashboard.html` → `publish.cmd` push →
  GitHub Actions 部署到 Pages。
- **`dashboard.html` 的 `/*WORKOUT_DATA_START*/`…`/*WORKOUT_DATA_END*/` 標記區塊只能用
  `scripts/build_dashboard.js` 改寫,禁止手動編輯其間內容。**
- 專案腳本一律 Node.js(`scripts/*.js`,Node 18+)——既有慣例,不要改寫成 Python 或混用。

## 3. 機密與公開性

- 目前**沒有任何 token 檔案**。`.gitignore` 的 `*token*.txt`/`*secret*`/`*.key`/`*.pem` 安全網保留,
  日後新增機密檔案會自動被擋。
- GitHub Pages 部署用 Actions 內建 OIDC(`id-token: write`),**不要**為此新增任何 secret。

## 4. 資料模型

`data/sessions/<date>-<random6>.json`(`data/pending/` 核准前同格式、同檔名規則):

```json
{
  "date": "2026-04-25",
  "type": "Cardio",
  "quality": 5,
  "strength": [{ "exercise": "...", "unit": "kg|lb", "sets": [{ "weight": 0, "reps": 0 }] }],
  "cardio": [{ "exercise": "...", "duration_min": 0 }],
  "note": null
}
```

`type` 三選:`Leg/Shoulder Day` | `Chest/Back Day` | `Cardio`。實際讀取欄位以
`scripts/build_dashboard.js`、`dashboard.html` 為準。

**手機端寫入合約**(給改寫 `notion-project-protein-log-workout` skill 用):寫進
`Captain-Tim/project_protein` / `master` 分支的 `data/pending/<date>-<亂數6碼>.json`,內容為上述 schema。
**不要**直接寫 `data/sessions/`——一定要先進 `pending`,由使用者 `review.cmd` 核准後才進正式區。

## 5. 檔案與日常流程

- `update.cmd`:自己看——`git pull` + 重建 dashboard + 開檔案(不 push)。
- `review.cmd`:核准手機新紀錄——列 `data/pending` 摘要,一鍵搬進 `data/sessions`。
- `publish.cmd`:分享——重建 + commit + push,觸發 GitHub Actions 部署。
- `scripts/build_dashboard.js`:讀 `data/sessions/*.json` 注入 `dashboard.html`,零網路、不需 token。
- `scripts/promote_pending.js`:`review.cmd` 呼叫的核准邏輯。
- `scripts/migrate_from_notion.js`、`sync_block.js`、`dump_rows.js`、`fetch_content.js`、
  `build_proposed.js`、`write_blocks.js`、`archive_pages.js`:Notion 時期一次性/手動工具,已完成階段性
  任務,不會被日常流程呼叫,不要刪除(歷史備查)。
- Dashboard 視覺/版面大改是獨立任務,另用 brainstorming skill 討論,不要順手改。

## 6. 驗證

```bash
# JS 語法快檢(不需瀏覽器)
node -e 'const fs=require("fs");const h=fs.readFileSync("dashboard.html","utf8");const a=[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).pop();try{new Function(a);console.log("OK")}catch(e){console.log("ERR",e.message)}'

# headless Chrome 抓 console 錯誤/數元素:複製成 _t.html(已 gitignore),
# 在 </body> 前注入 <script> 把要看的數字寫進 document.title,dump-dom 後 grep <title>,看完刪掉 _t.html
"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless --disable-gpu --dump-dom "file:///<repo>/_t.html" | grep -oE "<title>.*</title>"
```

## 7. 使用者偏好(務必遵守)

- 一律繁體中文,無簡體字。
- 客觀中立,直接點出問題與建議,不過度稱讚;資訊不足或語意不清直接講,不要硬回答。
- 任務細節未釐清前不要急著產出程式碼;第一步永遠先確認任務細節。
- 一個問題有多解時先簡述各解法,不要一次全部詳列。
- 動到外部系統(GitHub repo 可見度、Pages 設定等)時明確說明改了什麼。
