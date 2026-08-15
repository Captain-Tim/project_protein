# Project Protein

兩個人（Captain、Monkey）的訓練紀錄，各做成一個**單一自含的 HTML dashboard**，資料在地維護、
git 版控，用 GitHub Pages 公開唯讀連結分享。

**Stack**：純 HTML/CSS/vanilla JS（圖表全部手寫 SVG，頁面零外部依賴）+ Node 腳本（`scripts/*.js`，
Node 18+）。不要引入框架、圖表函式庫，也不要把腳本改寫成 Python。

## 硬規則

- **`data/<人名>/*.json` 是唯一真相。** 資料夾就是擁有者，JSON 裡不放人名欄位。
- **推導得出的值不要存**（例如配速 = 時間 ÷ 距離），存了就會有跟來源數字互相矛盾的一天。
- **壞資料不能入庫，但規則不用你記：** `build_dashboard.js` 會驗證所有資料並在不合格時 exit 1，
  訊息直接指出哪一筆缺什麼。**build 失敗是去修資料，不是繞過檢查。**
  欄位讀不到就**停下來問使用者**，不要猜、不要略過、不要先寫一半之後補。
- **HTML 裡 `/*…_START*/`…`/*…_END*/` 標記區塊只能由 build 腳本改寫**，不要手動編輯其間內容。
  手改會被 `git diff --exit-code` 抓到。
- **`<script id="freshness">` 三個頁面必須一字不差**（`test_freshness.js` 會擋）。它讓加到手機
  主畫面的頁面在部署後自己更新——壞掉沒有任何症狀，頁面照常顯示，只是手機永遠停在舊版。
  它比對的 `BUILD_ID` 是**頁面內容的 hash**，不是 build 時間、也不是 commit hash：那兩個每跑一次
  就變，會讓 `git diff --exit-code` 永遠失敗（`generated_at` 踩過同一個坑）。
- **所有變更走 PR，不直接推 `master`。** master = 已上線，merge 是部署動作。
  流程：開分支 → commit → **使用者自己 push**（本機禁止 `git push`，把指令給他就好）→
  **等使用者說**才開 PR、squash merge。
  PR 上 `validate` 沒過就不 merge。
- **新增頁面要改兩處**：`scripts/make_site.js` 的 `SITE` 清單（漏了就線上 404、本地正常，
  `check_site_links.js` 會擋）、`pages.yml` 的 `paths`（漏了就改那頁不觸發部署，沒有東西會擋）。

## 指令

```bash
node scripts/build_dashboard.js Captain   # data/Captain/ -> dashboard-captain.html
node scripts/build_dashboard.js Monkey    # data/Monkey/  -> dashboard-monkey.html + wallet-monkey.html
node scripts/test_monkey_metrics.js       # 指標邏輯測試
node scripts/test_freshness.js            # 頁面自動更新機制的測試
node scripts/list_coupons.js Monkey       # 列出炸雞券(唯讀,不改檔)
node scripts/make_site.js                 # 產生 _site/(部署與 PR 檢查共用同一份清單)
node scripts/check_site_links.js          # 檢查 _site 有沒有漏抄頁面/圖片
```

PR 上的 `validate` 就是把上面這幾支跑一遍，外加 `git diff --exit-code`
確認頁面真的是 build 出來的。想知道 PR 會不會過，本地照這個順序跑一次就知道。

## 檔案地圖

| 路徑 | 說明 |
|---|---|
| `data/Captain/`、`data/Monkey/` | 訓練紀錄，每次一個 JSON |
| `data/Monkey/rewards/redemptions.json` | 炸雞券的使用紀錄（哪張被用掉）。放子資料夾才不會被當成訓練紀錄掃進去 |
| `data/Monkey/rewards/grants.json` | 手動核發的特別券。達標券是推導的、不存，特別券是人的決定，推導不出來所以要存 |
| `data/Monkey/sleep/` | 睡眠與助眠藥紀錄，一晚一個 JSON，檔名即日期。放子資料夾才不會被當成訓練紀錄掃進去 |
| `data/Captain/program/current.json` | Captain 的課表（表定要做什麼）。放子資料夾才不會被當成訓練紀錄掃進去 |
| `data/<人名>/profile/profile.json` | 生日，只有月日。放子資料夾才不會被當成訓練紀錄掃進去 |
| `dashboard-captain.html`、`dashboard-monkey.html` | 兩人各自的頁面，完全獨立、互不影響 |
| `wallet-monkey.html` | Monkey 的炸雞券票券夾。主題與 metrics 由 build 從 dashboard 複製，不自己寫一份 |
| `scripts/build_dashboard.js <人名>` | 兩人共用一支（刻意不拆，否則規則會偷偷分岔） |
| `scripts/test_freshness.js` | 抽出三個頁面的 freshness 區塊在 Node 跑（假的瀏覽器環境） |
| `scripts/test_monkey_metrics.js` | 抽出頁面裡的 metrics 區塊在 Node 跑 |
| `scripts/list_coupons.js <人名>` | 列出炸雞券，唯讀。同樣抽 metrics 區塊來跑，不重寫發券規則 |
| `scripts/make_site.js` | 產生 `_site/`。要上線的檔案清單只有這一份，部署與 PR 檢查都讀它 |
| `scripts/check_site_links.js` | 檢查根目錄的頁面有沒有漏進清單、頁面裡的本地連結在 `_site` 找不找得到 |
| `.github/workflows/pages.yml` | `validate`（PR 與 push 都跑）→ `build` → `deploy`。PR 只驗證不部署 |
| `profile/` | 頭像 |

## 延伸文件（需要時再讀）

- `.claude/skills/log-workout/` — **新增紀錄的唯一權威**：schema、單位規則、
  寫檔前的人工確認關卡。要記錄一次訓練就照它做。
- `.claude/skills/use-coupon/` — **用掉炸雞券的唯一權威**：挑券規則、ledger 欄位、
  寫檔前的人工確認關卡。
- `.claude/skills/log-sleep/` — **記錄睡眠的唯一權威**：欄位、口語對照表（品質 1–5）、
  日期歸屬（記就寢那天）、補記流程、寫檔前的人工確認關卡。
- `docs/verification.md` — headless Chrome 探針、手機版驗證（目標機型的 viewport 寬度是**唯一出處**，
  `--window-size` 在 Windows 會騙人）。
- `docs/page-layout.md` — **兩頁區塊順序的唯一出處**，以及每一塊的規則寫在哪份 spec。
  新增或移除區塊時改這裡，各 spec 不重述整頁順序。
- `docs/superpowers/specs/monkey-cardio-dashboard.md` — Monkey 頁的視覺與指標定義
  （「一次 run」= 一天、weekly goal、streak、PR 榜的算法）。
- `docs/superpowers/specs/monkey-fried-chicken-award.md` — 炸雞券的發券規則、ledger 格式、
  驗證條件、票券夾版面。要動獎勵系統就照它。
- `docs/superpowers/specs/monkey-sleep-log.md` — 睡眠與用藥紀錄的欄位、驗證規則、
  集章卡與彈窗版面，以及刻意不做的那些（趨勢圖、計畫遵守度）。要動睡眠系統就照它。
- `docs/superpowers/specs/last-workout.md` — **兩頁共用**：LAST WORKOUT 卡的三段配色、▲▼ 門檻、
  對齊與互動寫在「共通規則」，兩頁各自的範圍差異（Monkey 是最近一個訓練日，Captain 是選中動作的
  最近一次）寫在自己那一節。要動任一頁的這張卡就照它。
- `docs/superpowers/specs/birthday-hat.md` — 生日帽的資料格式、驗證規則、帽子幾何與顯示判斷，
  以及刻意不做的那些（沒有預覽參數、放大檢視的原圖不戴帽、不顯示歲數）。
- `docs/superpowers/specs/captain-program.md` — Captain 課表的資料格式、
  A／B 循環算法、驗證規則、併入 WEEKLY QUEST 的版面，以及刻意不做的那些（不比對紀錄、
  不顯示完成狀態）。要動課表就照它。

**spec 是活文件，不是開發日誌。** 檔名不帶日期就是這個意思：功能改了就回頭改對應的 spec，
讓它一直反映現況。建立日期在 git history 裡，不用寫進檔名。

## 與使用者互動

- 一律繁體中文，無簡體字。
- 客觀中立，直接點出問題，資訊不足或語意不清就直說，不要硬回答。
- 任務細節未釐清前不要急著寫程式。一個問題有多解時先簡述各解法再推薦。
- 動到外部系統（GitHub repo 設定、Pages、公開性）時，明確說明改了什麼、有什麼後果。
