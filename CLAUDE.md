# Project Protein — Dashboard 專案

> 給 Claude Code 的專案說明。技術識別碼用英文,說明用繁體中文。
> 與使用者溝通一律繁體中文,不要出現簡體字。修改外部檔案(尤其 Notion)時,
> 必須在回覆中明確說明改了哪個檔案、改了什麼。

---

## 1. 專案目標

把 Notion「Workout Database」的運動紀錄,做成一個**本機 HTML dashboard**,做長期、多元的訓練分析。
瀏覽者只有使用者本人,不公開上網。

## 2. 架構

- **Notion = 唯一資料來源**(雲端)。程式碼與文件以 **GitHub** 版控(private repo `Captain-Tim/project_protein`);
  token 等機密是**本機檔、不進 git**(見 §3)。專案位置 `C:\Users\Ting\Documents\GitHub\project_protein`。
  (歷史:2026-06 前曾用 Google Drive 同步整夾,已改為 GitHub;Drive 與 git 同步會打架,勿再放回 Drive 同步夾。)
- **`dashboard.html` 是單一自含檔**:版面/圖表邏輯 + 內嵌資料(`window.WORKOUT_DATA={...}`,夾在
  `/*WORKOUT_DATA_START*/`…`/*WORKOUT_DATA_END*/` 之間)。雙擊即用、不需 server、**分享只需傳這一個檔**
  (手機離線也能開)。`export.js` 用正則替換這段標記區塊,**勿手改其間內容**。
- **沒有 Python**:這台機器的 `python` 是 MS Store stub(無法執行)。腳本一律 **Node.js**(`scripts/*.js`)。

## 3. Token / 機密

- token 存根目錄 `notion_token.txt`(純文字一行),腳本以 `fs.readFileSync` 讀取。**本機檔,被 `.gitignore` 擋住,
  不會上 GitHub**(已驗證遠端為 404)。token 檔僅存在本機;掉了就去 Notion 設定頁 regenerate。建議另存一份到密碼管理器備份。
- **資安界線(重要)**:此 integration **只能分享給 Workout Database**,不得加入任何敏感資料庫
  (如「家人用藥紀錄」)。若日後需 API 存取敏感 DB,**另開獨立 integration**,且 token 同樣不進 git / 不外流。
- token 隨時可在 integration 設定頁重新產生以撤銷舊的。
- **Netlify token**(`netlify_token.txt`):分享用的部署 token(見 §6 publish)。是**整個 Netlify 帳號**權限,
  同樣**本機檔、`.gitignore` 擋住、不上 GitHub**;建議用專用 Netlify 帳號降低 blast radius。別外傳、別上傳。
- `.gitignore` 已用 glob(`*token*.txt`、`*secret*`、`*.key`、`*.pem`)做安全網,日後新增 token 檔也會自動被擋。

## 4. Notion 識別碼

- Project Protein 頁面:`2f8a947a-dbb9-8013-93fd-d1b85c17ca5c`
- Workout Database(database):`2f8a947a-dbb9-8146-964b-dfc8e09e91e6`
- Data source(collection):`2f8a947a-dbb9-8150-9192-000ba5248e68`

## 5. 資料模型(這邊只負責讀)

職權切分:**Notion 的內容由網頁版 log-workout skill 寫入並維護格式**;這個 repo 假設 Notion 已規整,
只做 Notion → HTML 的解析與呈現。**JSON 寫入 schema 的權威在網頁版那份 skill,不在這裡**(避免兩邊同步)。

這邊需要知道的:
- **DB 屬性**:`Date`、`Type`(三選:`Leg/Shoulder Day` | `Chest/Back Day` | `Cardio`)、`Quality`、`Energy`。
- **動作明細**在每筆 session 頁面內文的一個 JSON code block(不是屬性),由 `export.js` 解析。
  實際讀取的欄位以 `export.js`、`dashboard.html` 的程式碼為準。

## 6. 檔案與日常流程

- `scripts/export.js`:讀 Notion → 注入 `dashboard.html` 標記區塊。**唯讀 Notion**,只改本機 dashboard。
- `scripts/sync_block.js`:修正單筆後,用 `_proposed.json` 重寫該頁 JSON code block。
- `scripts/_proposed.json`:遷移記錄(備查)。
- `scripts/publish.js`:把 dashboard.html 部署到 Netlify(deploy API,deploy 成 `index.html`),回傳公開連結。
- `update.cmd`:**自己看**——export 刷新 + 開本機 dashboard。
- `publish.cmd`:**要分享時**——export 刷新 → publish 部署 → 印出公開連結(固定站 `cheery-fox-4d37b2.netlify.app`,
  免費、公開無密碼)。只部署 dashboard.html 一個檔,不會洩漏任何 token。
- **記錄新訓練**:在 Claude 網頁/App 用 `notion-project-protein-log-workout` skill(**主要上傳手機截圖**)
  寫 §5 的 JSON block 回 Notion;該 skill 在網頁/App 端維護,**本機不保留 skill 檔**。

## 7. 使用者偏好(務必遵守)

- 一律繁體中文,無簡體字。
- 客觀中立,直接點出問題與建議,不過度稱讚;資訊不足或語意不清直接講,不要硬回答。
- 任務細節未釐清前不要急著產出程式碼;第一步永遠先確認任務細節。
- 一個問題有多解時先簡述各解法,不要一次全部詳列。
- 改外部檔案(Notion 等)時明確說明改了什麼。
- 可自稱 Luna。
