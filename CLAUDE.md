# Project Protein — Dashboard 專案

> 給 Claude Code 的專案說明。技術識別碼用英文,說明用繁體中文。
> 與使用者溝通一律繁體中文,不要出現簡體字。修改外部檔案(尤其 Notion)時,
> 必須在回覆中明確說明改了哪個檔案、改了什麼。

---

## 1. 專案目標

把 Notion「Workout Database」的運動紀錄,做成一個**本機 HTML dashboard**,做長期、多元的訓練分析。
瀏覽者只有使用者本人,不公開上網。

## 2. 架構

- **`data/sessions/*.json` = 版控中的真相來源**。程式碼與資料都以 **GitHub** 版控(**public repo**
  `Captain-Tim/project_protein`——2026-07 已從 private 轉 public,才能用免費的 GitHub Pages)。
  專案位置 `d:\tim_hou\Desktop\project_protein`。
  (歷史:2026-06 前曾用 Google Drive 同步整夾,後改 GitHub;2026-06 曾在 `C:\Users\Ting\Documents\GitHub\...`,
  2026-07 換機後在目前這台。)
- **資料流(單向)**:手機拍照 → claude.ai(GitHub connector)解析後直接 push 進 `data/pending/`(待審查)
  → 使用者回家雙擊 `review.cmd` 目測核准 → 搬進 `data/sessions/`(真相來源)→ `scripts/build_dashboard.js`
  注入 `dashboard.html` → 雙擊 `publish.cmd` push 上 GitHub → GitHub Actions 自動建置部署到 GitHub Pages。
  **Notion 已完全退場**(2026-07),不再是資料來源,也不當備援。
- **`dashboard.html` 是單一自含檔**:版面/圖表邏輯 + 內嵌資料(`window.WORKOUT_DATA={...}`,夾在
  `/*WORKOUT_DATA_START*/`…`/*WORKOUT_DATA_END*/` 之間)。雙擊即用、不需 server、離線也能開。
  `scripts/build_dashboard.js` 用正則替換這段標記區塊,**勿手改其間內容**。
- **沒有 Python**:這台機器的 `python` 是 MS Store stub(無法執行)。腳本一律 **Node.js**(`scripts/*.js`)。

## 3. 機密與公開性

- 目前**沒有任何 token 檔案**——Notion token 已隨 Notion 退場刪除,Netlify token 已隨 Netlify 退場刪除。
  `.gitignore` 仍保留 `*token*.txt`/`*secret*`/`*.key`/`*.pem` 等通用安全網,日後若又有機密檔案會自動被擋。
- **GitHub Pages 部署不需要任何手動 secret**:`.github/workflows/pages.yml` 用 GitHub Actions 內建的
  OIDC(`id-token: write` 權限)取得部署授權。
- ⚠️ **repo 現在是 public**:`data/pending/`、`data/sessions/` 的原始 JSON 內容在 GitHub 上任何人都看得到
  (不是只有部署出去的 dashboard 才公開)。`data/pending/` 只保證「還沒核准的東西不會顯示在 dashboard 網站上」,
  不保證真正私密。資料本身是訓練紀錄,風險等級比照先前 Netlify 公開無密碼的作法。

## 4. Notion 識別碼(歷史參考,現行流程已不使用)

以下 id 僅供未來需要回頭查閱 Notion 既有歷史資料時使用;`scripts/migrate_from_notion.js` 已把當時全部紀錄
一次性搬進本地 `data/sessions/`,日常流程不再連線 Notion。

- Project Protein 頁面:`2f8a947a-dbb9-8013-93fd-d1b85c17ca5c`
- Workout Database(database):`2f8a947a-dbb9-8146-964b-dfc8e09e91e6`
- Data source(collection):`2f8a947a-dbb9-8150-9192-000ba5248e68`

## 5. 資料模型

每筆 session 是 `data/sessions/<date>-<random6>.json`(`data/pending/` 下核准前也是同樣格式、同樣檔名規則):

```json
{
  "date": "2026-04-25",
  "type": "Cardio",
  "quality": 5,
  "energy": "🚀 Supercharged",
  "strength": [{ "exercise": "...", "unit": "kg|lb", "sets": [{ "weight": 0, "reps": 0 }] }],
  "cardio": [{ "exercise": "...", "duration_min": 0 }],
  "note": null
}
```

實際讀取的欄位以 `scripts/build_dashboard.js`、`dashboard.html` 的程式碼為準;`type` 目前三選:
`Leg/Shoulder Day` | `Chest/Back Day` | `Cardio`。

**手機端寫入合約(給之後改寫 `notion-project-protein-log-workout` skill 用)**:
- 目標 repo/branch:`Captain-Tim/project_protein` / `master`
- 寫入路徑:`data/pending/<date:YYYY-MM-DD>-<亂數6碼,英數>.json`(亂數只是避免同天多筆撞名,不需要跟任何
  ID 對應)
- 檔案內容就是上面的 JSON schema
- **不要**直接寫進 `data/sessions/`——一定要先進 `data/pending/`,由使用者用 `review.cmd` 核准後才會進正式區。

## 6. 檔案與日常流程

- `scripts/migrate_from_notion.js`:**一次性**遷移腳本(已執行過),把 Notion 舊資料搬進 `data/sessions/`。
  保留當歷史紀錄,不會再被日常流程呼叫。
- `scripts/build_dashboard.js`:讀 `data/sessions/*.json` → 注入 `dashboard.html` 標記區塊。零網路、不需要
  任何 token。
- `scripts/promote_pending.js`:列出 `data/pending/*.json` 摘要,一次核准全部搬進 `data/sessions/`。
- `scripts/sync_block.js`、`dump_rows.js`、`fetch_content.js`、`build_proposed.js`、`write_blocks.js`、
  `archive_pages.js`:Notion 時期的一次性/手動修正工具,歷史備查,與現行流程無關。
- `update.cmd`:**自己看**——`git pull` + 重建 dashboard + 開本機檔案;若有待審查紀錄會提醒跑 `review.cmd`。
- `review.cmd`:**手機記錄回家後審查**——列出 `data/pending` 摘要,一鍵核准搬進 `data/sessions`。
- `publish.cmd`:**要分享時**——重建 dashboard → commit + push → GitHub Actions 自動部署 →
  印出 `https://captain-tim.github.io/project_protein/`。
- **記錄新訓練**:在 Claude 網頁/App 用改寫後的 `notion-project-protein-log-workout` skill(**主要上傳手機截圖**),
  透過 GitHub connector 直接寫進 §5 的合約路徑;該 skill 在網頁/App 端維護,**本機不保留 skill 檔**。

**Dashboard 視覺/版面大改**是獨立的後續任務(留待之後用 brainstorming skill 另開一輪),不在本次改動範圍。

## 7. 使用者偏好(務必遵守)

- 一律繁體中文,無簡體字。
- 客觀中立,直接點出問題與建議,不過度稱讚;資訊不足或語意不清直接講,不要硬回答。
- 任務細節未釐清前不要急著產出程式碼;第一步永遠先確認任務細節。
- 一個問題有多解時先簡述各解法,不要一次全部詳列。
- 改外部檔案(Notion 等)時明確說明改了什麼。
- 可自稱 Luna。
