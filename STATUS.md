# STATUS — 交接給接手的 Claude Code

> 目的:讓你(接手的 Claude Code)讀完這一份就能直接上工,不用重問。
> 最後更新:**2026-07-09**(由 Luna 整理;Notion 全面退場、改本地資料 + GitHub Pages)。先讀本檔,再視需要讀 `CLAUDE.md`。

---

## 0. 一分鐘上手(START HERE)

- 這是把訓練紀錄視覺化的**本機 HTML dashboard**專案,現在資料**完全本地維護、GitHub 版控**。完整設計與決策在 `CLAUDE.md`。
- 資料流(單向):手機拍照 → claude.ai(GitHub connector)→ push 進 `data/pending/` → 使用者回家用
  `review.cmd` 核准 → `data/sessions/*.json`(真相來源)→ `node scripts/build_dashboard.js` → 注入 `dashboard.html`
  → `publish.cmd` push → GitHub Actions 自動部署到 GitHub Pages。**Notion 已完全退場**,不再是資料來源也不當備援。
- **看成果**:直接雙擊 `dashboard.html`(離線可開,不需 server),或雙擊 `update.cmd`(先刷新再開)。
- **審查手機新紀錄**:雙擊 `review.cmd`(自己先看過 `data/pending` 內容,OK 就核准搬進 `data/sessions`)。
- **要分享**:雙擊 `publish.cmd`(重建 dashboard → commit+push → GitHub Actions 自動部署 →
  印出公開連結 `https://captain-tim.github.io/project_protein/`)。
- 跟使用者一律**繁體中文**(見 CLAUDE.md §7)。

---

## 1. ⚠️ 環境須知(最容易踩雷,先看)

### 1a. 本機資訊

**2026-07(現況,再次換機後)**
- 機器路徑:`d:\tim_hou\Desktop\project_protein`(Windows 11,使用者 `tim_hou`,磁碟機 D)。
- GitHub:repo `Captain-Tim/project_protein`,**2026-07 已從 private 轉 public**(改用免費 GitHub Pages 需要),
  預設分支 `master`。
- 換機當下沒有帶著 `notion_token.txt` 等機密檔——確認過已刪除,現行流程也不再需要任何 token。

**2026-06(舊紀錄,備查)**
- 機器路徑:`C:\Users\Ting\Documents\GitHub\project_protein`(Windows 10,使用者 `Ting`)。
  已脫離 Google Drive(原本在 `Desktop\project_protein` 被 Drive 鏡像,會與 git 打架;改放 Documents\GitHub)。
- **Node v24.16.0**(用 `winget install OpenJS.NodeJS.LTS --scope user` 裝的,已在 PATH)。
- **git 2.54**、**gh CLI 2.94**。也有 GitHub Desktop。
- 沒有可用的 Python(`python` 是 Microsoft Store 假 stub)。所有腳本都是 `.js`,用 `node xxx.js` 跑。
- `update.cmd`/`publish.cmd`/`review.cmd` 會先找 PATH 的 `node`,找不到才退回 winget 安裝路徑當保險。
- **換機注意**:新機器必須裝 **Node 18+**,否則腳本跑不起來。

### 1b. 記憶與對話歷史「不在」專案資料夾裡
- Claude Code 的記憶存在 `C:\Users\Ting\.claude\projects\c--Users-Ting-Documents-GitHub-project-protein\memory\`,**不在** `project_protein` 內。
  (key 由專案絕對路徑推導;從 Desktop 搬到 Documents 後 key 已改,Desktop 時期的舊記憶不會跟過來——靠本檔接手即可。)
- 記憶以**專案絕對路徑**當 key。換機若路徑或 Windows 使用者名不同 → 舊記憶對不上,但**專案檔照常運作**,靠本檔 + `CLAUDE.md` 接手即可。

### 1c. 機密(2026-07 起已無機密檔案)
- `notion_token.txt`:Notion 全面退場後已刪除(遷移驗證完成後刪的,見 §2)。
- `netlify_token.txt`、`scripts/netlify_site.txt`:Netlify 退場後已刪除。
- `.gitignore` 仍保留 `*token*.txt`/`*secret*`/`*.key`/`*.pem` 等通用安全網,日後若又有機密檔案會自動被擋。
- GitHub Pages 部署不需要手動 secret,用 Actions 內建 OIDC。
- **repo 現在是 public**:`data/pending`、`data/sessions` 的原始內容在 GitHub 上任何人都看得到,見 CLAUDE.md §3。

---

## 2. 進度

| # | 項目 | 狀態 |
|---|---|---|
| 1 | Migration:session 寫入「📦 Workout Data (JSON)」code block | ✅ 完成並驗證 |
| 2 | Schema 清理:刪舊頁、DROP 舊動作數字欄、移除 Type 的 Report 選項 | ✅ |
| 3 | 換機修復(2026-06):裝 Node/git/gh、修 .cmd fallback 路徑、清孤兒檔 | ✅ |
| 4 | 上 GitHub | ✅ |
| 5 | **Notion → 本地資料遷移**(`scripts/migrate_from_notion.js`) | ✅ 完成並逐欄位驗證(2026-07-09) |
| 6 | **Notion 全面退場**(`notion_token.txt` 已刪、`export.js`/`sync_block.js` 停用) | ✅ |
| 7 | **`data/pending` → `review.cmd` → `data/sessions` 審查流程上線** | ✅ 腳本已寫好,待實測 |
| 8 | **Netlify 退場,改 GitHub Pages**(`.github/workflows/pages.yml`) | ✅ 腳本/workflow 已寫好,待 repo 轉 public 後驗證部署 |
| 9 | **repo 轉 public** | ⏳ 待使用者最終確認 |
| 10 | `dashboard.html`:dark mode、多視圖 | ✅(排版暫定,大改是未來獨立任務) |

**資料現況**:本地 `data/sessions/` 共 **36 筆**——其中 34 筆是 2026-06-14 前的 Notion 舊資料(已逐欄位比對
與舊 dashboard 內嵌資料完全一致),另外 2 筆(`2026-06-19` Leg/Shoulder Day、`2026-06-27` Cardio)是之後才
記錄、STATUS.md 尚未反映過的新紀錄,一併遷移進來了。

---

## 3. 待辦(TODO,依重要性)

1. **確認 repo 轉 public**,`Settings → Pages → Source` 設成 GitHub Actions,push 後驗證 `https://captain-tim.github.io/project_protein/` 可正常開啟。
2. **改寫 `notion-project-protein-log-workout` skill**(在 claude.ai 網頁端,不在本機):啟用 GitHub connector、改成寫入 CLAUDE.md §5 的合約路徑 `data/pending/<date>-<random6>.json`。
3. **(待使用者決定)** All time 模式下那顆 badge(😴/👍/🔥)要不要也拿掉。
4. **(未來獨立任務)** dashboard 視覺/版面大改,用 brainstorming skill 另開一輪。

> `migrate_from_notion.js` 曾在實測中發現「page id 前 8 碼縮寫可能撞名」(`34da947a-dbb9-815a...` 與
> `34da947a-dbb9-8177...` 前 16 碼幾乎相同),已改用完整 page id 當檔名尾碼修正,遷移結果已重新驗證。

---

## 4. 檔案地圖

```
project_protein/
├─ dashboard.html            ← 主成品(單檔,vanilla JS + SVG,無 CDN,離線可用,資料內嵌)
├─ .gitignore                ← token glob 安全網(現無實際機密檔案)、node_modules 等
├─ .github/workflows/pages.yml ← push 到 master(限 data/sessions、dashboard.html 等路徑)→ 建置 → 部署 GitHub Pages
├─ CLAUDE.md                 ← 完整設計與決策(權威)
├─ STATUS.md                 ← 本檔
├─ update.cmd                ← 自己看:git pull + 重建 + 開 dashboard
├─ review.cmd                ← 審查手機新紀錄:data/pending → data/sessions
├─ publish.cmd               ← 要分享:重建 → commit+push → GitHub Actions 部署
├─ data/
│  ├─ pending/               ← 手機端(GitHub connector)寫入的待審查紀錄
│  └─ sessions/              ← 正式真相來源,build_dashboard.js 只讀這裡
└─ scripts/
   ├─ build_dashboard.js     ← 主要:data/sessions/*.json → 注入 dashboard.html
   ├─ promote_pending.js     ← data/pending → data/sessions(一鍵核准)
   ├─ migrate_from_notion.js ← (一次性)Notion → data/sessions,已執行過就留著備查
   ├─ sync_block.js          ← (Notion 時期,已停用)修正單頁 JSON block
   ├─ dump_rows.js           ← (一次性/唯讀,Notion 時期)列出所有列 → _rows.json
   ├─ fetch_content.js       ← (一次性/唯讀,Notion 時期)抓各頁內文表格 → _content.json
   ├─ build_proposed.js      ← (一次性,Notion 時期)_content.json → _proposed.json
   ├─ write_blocks.js        ← (一次性,Notion 時期,已執行過)
   ├─ archive_pages.js       ← (一次性,Notion 時期,已執行過)
   ├─ _rows.json / _content.json / _proposed.json / _dryrun.md ← Notion migration 歷史紀錄(備查)
```

> 已刪除:`data.js`(改成直接注入 dashboard.html)、`scripts/config.py`(舊 Python)、`scripts/export.js`、
> `scripts/publish.js`、`notion_token.txt`、`netlify_token.txt`、`scripts/netlify_site.txt`。

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
  --dump-dom "file:///D:/tim_hou/Desktop/project_protein/_t.html" | grep -oE "<title>.*</title>"
```

JS 語法快檢(不需瀏覽器):
```bash
node -e 'const fs=require("fs");const h=fs.readFileSync("dashboard.html","utf8");const a=[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).pop();try{new Function(a);console.log("OK")}catch(e){console.log("ERR",e.message)}'
```

---

## 8. Notion 識別碼(歷史參考,同 CLAUDE.md §4——現行流程已不使用)

- Project Protein 頁面:`2f8a947a-dbb9-8013-93fd-d1b85c17ca5c`
- Workout Database:`2f8a947a-dbb9-8146-964b-dfc8e09e91e6`
- Data source:`2f8a947a-dbb9-8150-9192-000ba5248e68`
- 每筆 session 頁面內文有一個 ` ```json ` code block(標題「📦 Workout Data (JSON)」),
  `scripts/migrate_from_notion.js` 讀的就是這個,一次性遷移完就不再連線。
