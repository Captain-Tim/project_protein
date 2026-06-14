# STATUS — 交接給接手的 Claude Code

> 目的:讓你(接手的 Claude Code)讀完這一份就能直接上工,不用重問。
> 最後更新:**2026-06-14**(由 Luna 整理;本次換機 + 上 GitHub)。先讀本檔,再視需要讀 `CLAUDE.md`。

---

## 0. 一分鐘上手(START HERE)

- 這是把 Notion「Workout Database」視覺化的**本機 HTML dashboard**專案。完整設計與決策在 `CLAUDE.md`。
- 資料流(單向):`Notion(真相來源) → node scripts/export.js → 注入 dashboard.html`。
  **已不再產生 `data.js`**;`dashboard.html` 是單一自含檔,資料直接內嵌在
  `/*WORKOUT_DATA_START*/`…`/*WORKOUT_DATA_END*/` 標記區塊裡。
- **看成果**:直接雙擊 `dashboard.html`(離線可開,不需 server),或雙擊 `update.cmd`(先刷新再開)。
- **更新資料**:`node scripts/export.js`(從 Notion 重拉、覆寫 dashboard.html 的標記區塊),或雙擊 `update.cmd`。
- **要分享**:雙擊 `publish.cmd`(export → 部署 Netlify → 印公開連結 `cheery-fox-4d37b2.netlify.app`)。
- 跟使用者一律**繁體中文**;改 Notion 等外部檔案時要明講改了什麼(見 CLAUDE.md §7)。

---

## 1. ⚠️ 環境須知(最容易踩雷,先看)

### 1a. 本機資訊(2026-06 換機 + 上 GitHub 後)
- 機器路徑:`C:\Users\Ting\Documents\GitHub\project_protein`(Windows 10,使用者 `Ting`)。
  **已脫離 Google Drive**(原本在 `Desktop\project_protein` 被 Drive 鏡像,會與 git 打架;改放 Documents\GitHub)。
- GitHub:private repo `Captain-Tim/project_protein`,預設分支 `master`。日常 `git`/`gh` 操作即可。
- **Node v24.16.0**(2026-06 用 `winget install OpenJS.NodeJS.LTS --scope user` 裝的,已在 PATH)。
- **git 2.54**、**gh CLI 2.94**(GitHub 操作用 gh)。也有 GitHub Desktop。
- 沒有可用的 Python(`python` 是 Microsoft Store 假 stub)。所有腳本都是 `.js`,用 `node xxx.js` 跑。
- `update.cmd` / `publish.cmd` 會先找 PATH 的 `node`,找不到才退回 winget 安裝路徑當保險。
- **換機注意**:新機器必須裝 **Node 18+**,否則 `export.js` 跑不起來。

### 1b. 記憶與對話歷史「不在」專案資料夾裡
- Claude Code 的記憶存在 `C:\Users\Ting\.claude\projects\c--Users-Ting-Documents-GitHub-project-protein\memory\`,**不在** `project_protein` 內。
  (key 由專案絕對路徑推導;從 Desktop 搬到 Documents 後 key 已改,Desktop 時期的舊記憶不會跟過來——靠本檔接手即可。)
- 記憶以**專案絕對路徑**當 key。換機若路徑或 Windows 使用者名不同 → 舊記憶對不上,但**專案檔照常運作**,靠本檔 + `CLAUDE.md` 接手即可。

### 1c. 機密(重要)
- `notion_token.txt`、`netlify_token.txt`、`token.txt` 是明文 token,**只存在本機**(已不再靠 Drive)。
- **已被 `.gitignore` 擋掉(含 glob 安全網),嚴禁進 git**;遠端已驗證為 404,確認沒上傳。
- token 不隨 git 走:在別台 clone 後要**手動補這幾個檔**(或重新 regenerate)才能跑 export/publish。
- Notion token 只分享給 Workout Database;Netlify token 是整個帳號權限(blast radius 大,別外傳)。
- `token.txt` 沒有任何腳本在用(遺留檔),可考慮刪;不確定就留著。

---

## 2. 進度

| # | 項目 | 狀態 |
|---|---|---|
| 1 | Migration:session 寫入「📦 Workout Data (JSON)」code block | ✅ 完成並驗證 |
| 2 | Schema 清理:刪舊頁、DROP 舊動作數字欄、移除 Type 的 Report 選項 | ✅ |
| 3 | `scripts/export.js`:Notion → 注入 dashboard.html | ✅ |
| 4 | `dashboard.html`:dark mode、多視圖 | ✅(排版暫定) |
| 5 | 換機修復:裝 Node/git/gh、修 .cmd fallback 路徑、清孤兒檔 | ✅(2026-06-14) |
| 6 | 上 GitHub(private repo)+ 驗證 token 不在遠端 | ✅(2026-06-14) |
| 7 | 脫離 Google Drive、搬到 `Documents\GitHub` | ⏳ 收尾(停 Drive 同步、刪桌面舊份) |
| 8 | **Stop hook**:session 結束自動跑 export | ⏳ **未做** |

現存 Notion **34 筆** active session;DB 欄位只剩 `Date / Type / Quality / Energy / 標題`,動作明細在頁面內文 JSON block。

---

## 3. 待辦(TODO,依重要性)

1. **脫離 Drive 收尾**(換機最後一哩):(a) 在 Google Drive 偏好設定→「我的電腦」停止同步桌面那份 `project_protein`;(b) VS Code 開新位置 `Documents\GitHub\project_protein`;(c) 刪掉 `Desktop\project_protein` 舊份。
2. **Stop hook**:在 `.claude/settings.json` 設 Stop hook 跑 `node scripts/export.js`,讓 dashboard 自動同步。可用 update-config skill。
3. **記錄新訓練**:在 Claude 網頁/App 用 `notion-project-protein-log-workout` skill 寫 JSON block 進 Notion(skill 在網頁端維護,本機不留 skill 檔)。
4. **(待使用者決定)** All time 模式下那顆 badge(😴/👍/🔥)要不要也拿掉。

---

## 4. 檔案地圖

```
project_protein/
├─ dashboard.html      ← 主成品(單檔,vanilla JS + SVG,無 CDN,離線可用,資料內嵌)
├─ notion_token.txt    ← Notion token(機密,gitignore)
├─ netlify_token.txt   ← Netlify token(機密,gitignore)
├─ token.txt           ← (機密,gitignore)
├─ .gitignore          ← 擋 token(含 glob 安全網)、netlify_site.txt、Drive 暫存夾、node_modules 等
├─ CLAUDE.md           ← 完整設計與決策(權威)
├─ STATUS.md           ← 本檔
├─ update.cmd          ← 自己看:export 刷新 + 開 dashboard
├─ publish.cmd         ← 要分享:export → publish → 印連結
└─ scripts/
   ├─ export.js        ← 主要:Notion → 注入 dashboard.html(Stop hook 要跑這支)
   ├─ publish.js       ← 部署 dashboard.html 到 Netlify(deploy 成 index.html)
   ├─ sync_block.js    ← 修正單頁 JSON block 後重新同步(node sync_block.js <pageId>)
   ├─ dump_rows.js     ← (一次性/唯讀)列出所有列 → _rows.json
   ├─ fetch_content.js ← (一次性/唯讀)抓各頁內文表格 → _content.json
   ├─ build_proposed.js← (一次性)_content.json → _proposed.json(migration 用)
   ├─ write_blocks.js  ← (一次性)把 JSON block 寫進各頁(已執行過)
   ├─ archive_pages.js ← (一次性)archive 待刪頁(已執行過)
   ├─ _rows.json       ← 全列屬性快照(含被刪欄位的舊值備份)
   ├─ _content.json    ← 各頁內文表格快照
   ├─ _proposed.json   ← migration 產出的最終 JSON(每筆 session)
   ├─ _dryrun.md       ← migration 對照報告 + 單位還原決策(重要紀錄)
   └─ netlify_site.txt ← (本機產生)Netlify site id,gitignore
```

> 已刪除:`data.js`(export 改成直接注入 dashboard.html,不再產生)、`scripts/config.py`(舊 Python,無法執行)。

---

## 5. 關鍵決策摘要(細節見 `scripts/_dryrun.md`)

- **單位還原**:早期值被舊 skill ×0.45359237 存成「kg」,÷回即機器讀數。校準鐵證:04-11 那筆明寫「35 lbs / 20 lbs / 12.5 lbs」。
- **§6 單位表正確**:Bench Press、Split Squat = **lb**(啞鈴);其餘配重機 = **kg**。輸出 = 還原後機器數字 + 單位,不在 lb/kg 間換算。
- **Hack Squat 整段刪除**(使用者忘了健身房槓片單位,當沒做過;框架保留,日後再記)。
- **Lateral Raise 啞鈴期刪除**,只從滑輪起算(04-03 起);動作名統一 `Lateral Raise`。
- Seated Row 機器實為 kg,工作重量 24 kg。
- JSON 結構:逐組展開(sets×reps → N 個 `{weight,reps}`)+ 選用的 session 層級 `note`。

---

## 6. dashboard 現況(功能清單,避免你重看 code 才懂)

- **配色**:dark mode(底 `#0d1117`),主色鵝黃 `#e3b73f`;全站 Comic Sans 美漫字體;類型色 Leg=藍 / Chest=紫 / Cardio=琥珀 / HIIT=紅。
- **時間尺度切換**(右上 sticky):Week / Month / Quarter / Year / **All**。
  - 一般尺度:Stats=當期、圖表=該粒度。
  - **All = 只負責 All time Stats**;圖表用 `autoFine()` 安全粗粒度(短期=週、長期自動降月/季)。
- **STATS 區**:左 4 張數字卡 + 右大圓餅(當期部位分布)+ 上方「X – Y Stats 😴/👍/🔥」與進階提示副標(All time 下副標隱藏)。
  - badge 門檻:當期次數 ≥ `2×mult` 👍、≥ `5×mult` 🔥,mult=週/月/季/年 = 1/4/13/52。
- **Trends**(3×3 九宮格):8 個動作重量折線(原生單位,每張取當期最重工作組;最後一點脈動)+ 第 9 格 Cardio(min) 堆疊柱。動作圖自動涵蓋所有出現過的動作。
- **Frequency & Split**(滿版):每期訓練次數堆疊柱,圖例是可勾選核取方塊(可篩選顯示哪些類型)。

---

## 7. 驗證 dashboard 的招(很有用)

dashboard 是 file:// 開的純前端。可用 headless Chrome 注入探針抓 console 錯誤 + 數元素:

```bash
# 複製 dashboard.html 成 _t.html(已被 gitignore),在 </body> 前注入 <script> 把要看的數字寫進 document.title,
# 再用 Chrome --headless --dump-dom 載入,grep <title> 取結果;看完刪掉 _t.html。
"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless --disable-gpu \
  --dump-dom "file:///C:/Users/Ting/Desktop/project_protein/_t.html" | grep -oE "<title>.*</title>"
```

JS 語法快檢(不需瀏覽器):
```bash
node -e 'const fs=require("fs");const h=fs.readFileSync("dashboard.html","utf8");const a=[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).pop();try{new Function(a);console.log("OK")}catch(e){console.log("ERR",e.message)}'
```

---

## 8. Notion 識別碼(同 CLAUDE.md §4)

- Project Protein 頁面:`2f8a947a-dbb9-8013-93fd-d1b85c17ca5c`
- Workout Database:`2f8a947a-dbb9-8146-964b-dfc8e09e91e6`
- Data source:`2f8a947a-dbb9-8150-9192-000ba5248e68`
- 每筆 session 頁面內文有一個 ` ```json ` code block(標題「📦 Workout Data (JSON)」),export.js 就是讀這個。
