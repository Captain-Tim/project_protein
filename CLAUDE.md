# Project Protein

兩個人(Captain、Monkey)的訓練紀錄,各做成一個**單一自含的 HTML dashboard**,資料在地維護、
git 版控,用 GitHub Pages 公開唯讀連結分享。

**Stack**:純 HTML/CSS/vanilla JS(圖表全部手寫 SVG,頁面零外部依賴)+ Node 腳本(`scripts/*.js`,
Node 18+)。不要引入框架、圖表函式庫,也不要把腳本改寫成 Python。

## 硬規則

- **`data/<人名>/*.json` 是唯一真相**。`Captain` / `Monkey` 各一個資料夾。
  **資料夾就是擁有者——JSON 裡不放人名欄位**(重複的資訊遲早不一致)。
- **壞資料不能入庫。** 每一筆 cardio 必須有 `date` + `duration_min` + `distance_km`,缺一不可。
  讀不到就**停下來問使用者**,不要猜、不要略過、不要「先記時間之後補距離」。
  `build_dashboard.js` 會 exit 1 擋下來並讓部署失敗——**build 失敗是去修資料,不是繞過檢查**。
- **推導得出的值不要存**(例如配速 = 時間 ÷ 距離),存了就會有跟來源數字互相矛盾的一天。
- **HTML 裡所有 `/*…_START*/`…`/*…_END*/` 標記區塊只能由 build 腳本改寫**,禁止手動編輯其間內容
  (`WORKOUT_DATA`、`REWARDS_DATA`,以及 `wallet-monkey.html` 的 `THEME` 與 `METRICS`)。
- **炸雞券只有「哪張被用掉」要存**。券本身由達標週推導,存了就會跟訓練資料互相矛盾。
  使用紀錄對不上(幽靈券、重複使用、早於取得日)一律 exit 1,**去修資料,不要繞過**。
- **改動 metrics 邏輯後必須跑** `node scripts/test_monkey_metrics.js`。

## 指令

```bash
node scripts/build_dashboard.js Captain   # data/Captain/ -> dashboard-captain.html
node scripts/build_dashboard.js Monkey    # data/Monkey/  -> dashboard-monkey.html + wallet-monkey.html
node scripts/test_monkey_metrics.js       # 指標邏輯測試
node scripts/list_coupons.js Monkey       # 列出炸雞券(唯讀,不改檔)
```

## 檔案地圖

| 路徑 | 說明 |
|---|---|
| `data/Captain/`、`data/Monkey/` | 訓練紀錄,每次一個 JSON |
| `data/Monkey/rewards/redemptions.json` | 炸雞券的使用紀錄(唯一 ledger)。放子資料夾才不會被當成訓練紀錄掃進去 |
| `dashboard-captain.html`、`dashboard-monkey.html` | 兩人各自的頁面,完全獨立、互不影響 |
| `wallet-monkey.html` | Monkey 的炸雞券票券夾。主題與 metrics 由 build 從 dashboard 複製,不自己寫一份 |
| `scripts/build_dashboard.js <人名>` | 兩人共用一支(刻意不拆,否則規則會偷偷分岔) |
| `scripts/test_monkey_metrics.js` | 抽出頁面裡的 metrics 區塊在 Node 跑 |
| `scripts/list_coupons.js <人名>` | 列出炸雞券,唯讀。同樣抽 metrics 區塊來跑,不重寫發券規則 |
| `profile/` | 頭像 |

## 延伸文件(需要時再讀)

- `.claude/skills/log-workout/` — **新增紀錄的唯一權威**:schema、動作對照表、單位規則、
  寫檔前的人工確認關卡。要記錄一次訓練就照它做。
- `.claude/skills/use-coupon/` — **用掉炸雞券的唯一權威**:挑券規則、ledger 欄位、
  寫檔前的人工確認關卡。
- `docs/verification.md` — headless Chrome 探針、手機版驗證(`--window-size` 在 Windows 會騙人)。
- `docs/superpowers/specs/2026-07-11-monkey-cardio-dashboard-design.md` — Monkey 頁的視覺與指標定義
  (「一次 run」= 一天、weekly goal、streak、PR 榜的算法)。
- `docs/superpowers/specs/2026-07-31-monkey-fried-chicken-award.md` — 炸雞券的發券規則、ledger 格式、
  驗證條件、票券夾版面。要動獎勵系統就照它。

## 與使用者互動

- 一律繁體中文,無簡體字。
- 客觀中立,直接點出問題;資訊不足或語意不清就直說,不要硬回答。
- 任務細節未釐清前不要急著寫程式。一個問題有多解時先簡述各解法再推薦。
- 動到外部系統(GitHub repo 設定、Pages、公開性)時,明確說明改了什麼、有什麼後果。
