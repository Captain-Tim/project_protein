# Project Protein — Dashboard 專案

> 與使用者溝通一律繁體中文,不要出現簡體字。動到外部系統(GitHub repo 可見度、Pages 設定等)時,
> 必須在回覆中明確說明改了什麼、有什麼後果。

## 1. 專案目標

把兩個人的訓練紀錄各做成一個單一自含的 **本機 HTML dashboard**(`dashboard-captain.html`、
`dashboard-monkey.html`),資料完全在地維護、GitHub 版控,
並用 GitHub Pages 公開一個唯讀連結分享。

## 2. 架構與約束

- **`data/<人名>/*.json` = 唯一真相來源**。兩個人的資料完全分開:**`data/Captain/`**(重訓 + 有氧)、
  **`data/Monkey/`**(只有跑步/有氧)。**資料夾就是擁有者,JSON 裡沒有人名欄位,不要加**——
  重複的資訊遲早會不一致。
  Repo `Captain-Tim/project_protein` 是 **public**(GitHub Pages 免費方案要求),分支 `master`。
- **資料流**:手機拍照 → 用 Claude Code 網頁版(claude.ai/code)開這個 repo → `log-workout` skill 解析照片、
  經使用者確認後寫入 `data/<人名>/` → build 腳本注入對應的 HTML → commit/push →
  GitHub Actions 部署到 Pages。在本機自己改資料時,改完跑 `publish.cmd` 發佈。
- **兩個 HTML 的 `/*WORKOUT_DATA_START*/`…`/*WORKOUT_DATA_END*/` 標記區塊只能用
  `scripts/build_dashboard.js <人名>` 改寫,禁止手動編輯其間內容。**
- 專案腳本一律 Node.js(`scripts/*.js`,Node 18+)——既有慣例,不要改寫成 Python 或混用。

### 壞資料不能入庫(硬性規則)

**資料不完整就不是有效紀錄,不准寫檔、不准 commit。** 寧可停下來問使用者,也不要先寫一筆殘缺的進去。
規則**對兩個人一視同仁**,不因人而異。

- **每一筆 cardio 必須有 `date` + `duration_min` + `distance_km`**,缺一不可。照片讀不到距離就
  **停下來問**,不要猜、不要略過、不要「先記時間之後補距離」。
- **推導得出的值不要存**(例如配速 = 時間 ÷ 距離)。存了就會有跟來源數字互相矛盾的一天。
- `scripts/build_dashboard.js` 在資料殘缺時 **exit 1**,連帶讓 GitHub Actions 部署失敗。
  **build 失敗代表資料有問題,去修資料,不要繞過檢查。**
- 頁面本身還有第二道網:讀到殘缺紀錄會在頁尾顯示 DATA ERROR 並列出日期,**不會靜默略過**。
  無聲算錯比壞掉更危險。
- **沒有任何例外。** Captain 2026-07 之前的有氧原本沒有 `distance_km`(當時 schema 沒這欄位),
  已於 2026-07-11 全數補上:15 筆由當時備註記下的跑步機速度 × 時間推算,
  2 筆(2026-01-26、2026-02-19 的 Zone 2)速度不可考,以 7 km/h 推估並在 note 中註明。

## 3. 機密與公開性

- 目前**沒有任何 token 檔案**。`.gitignore` 的 `*token*.txt`/`*secret*`/`*.key`/`*.pem` 安全網保留,
  日後新增機密檔案會自動被擋。
- GitHub Pages 部署用 Actions 內建 OIDC(`id-token: write`),**不要**為此新增任何 secret。

## 4. 資料模型

`data/<人名>/<date>-<random6>.json`(`<人名>` = `Captain` 或 `Monkey`,兩人同一套 schema):

```json
{
  "date": "2026-04-25",
  "type": "Cardio",
  "quality": 5,
  "strength": [{ "exercise": "...", "unit": "kg|lb", "sets": [{ "weight": 0, "reps": 0 }] }],
  "cardio": [{ "exercise": "...", "duration_min": 0, "distance_km": 0 }],
  "note": null
}
```

`type` 三選:`Leg/Shoulder Day` | `Chest/Back Day` | `Cardio`。實際讀取欄位以 build 腳本與兩個 HTML 為準。

**新增紀錄一律經由 `.claude/skills/log-workout/`**(動作對照表、單位規則、type 反推規則都在那裡,
是唯一權威)。人工關卡是「寫檔前先把解析結果列給使用者確認」,不是事後審 JSON;沒有 pending 區。

## 5. 檔案與日常流程

- `.claude/skills/log-workout/`:從訓練照片記錄一次訓練(手機、本機皆適用),兩個人共用同一套規則。
- `update.cmd`:自己看——`git pull` + 重建兩頁 + 開檔案(不 push)。
- `publish.cmd`:分享——重建兩頁 + commit + push,觸發 GitHub Actions 部署。
- `scripts/build_dashboard.js <Captain|Monkey>`:讀 `data/<人名>/*.json` 注入 `dashboard-<人名>.html`,
  零網路、不需 token。**兩個人共用同一支腳本**(刻意不拆成兩支,否則規則遲早偷偷分岔);
  資料不完整會 exit 1。
- `scripts/migrate_from_notion.js`、`sync_block.js`、`dump_rows.js`、`fetch_content.js`、
  `build_proposed.js`、`write_blocks.js`、`archive_pages.js`:Notion 時期一次性/手動工具,已完成階段性
  任務,不會被日常流程呼叫,不要刪除(歷史備查)。
- Dashboard 視覺/版面大改是獨立任務,另用 brainstorming skill 討論,不要順手改。

### 第二個人:Monkey(cardio)

- `dashboard-monkey.html`:Monkey 的 cardio 頁面,與 `dashboard-captain.html` **完全獨立**(黑底螢光綠、遊戲化),
  兩頁頁首互有連結。視覺與指標定義見
  `docs/superpowers/specs/2026-07-11-monkey-cardio-dashboard-design.md`。
- 指標定義的關鍵前提:**「一次 run」= 一天**(同日多筆合併)。weekly goal 是 3 runs / 150 min,
  streak 只數「兩項都達標」的週。
- `scripts/test_monkey_metrics.js`:抽出 `dashboard-monkey.html` 的 `<script id="metrics">` 在 Node 執行並斷言。
  **改動任何指標邏輯後必須跑** `node scripts/test_monkey_metrics.js`。
- `profile/monkey.jpg`:頭像。repo 是 public,此圖等同公開。

## 6. 驗證

```bash
# JS 語法快檢(不需瀏覽器)
node -e 'const fs=require("fs");const h=fs.readFileSync("dashboard-captain.html","utf8");const a=[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).pop();try{new Function(a);console.log("OK")}catch(e){console.log("ERR",e.message)}'

# Monkey 頁的指標測試(改動 metrics 邏輯後必跑)
node scripts/test_monkey_metrics.js

# headless Chrome 抓 console 錯誤/數元素:複製成 _t.html(已 gitignore),
# 在 </body> 前注入 <script> 把要看的數字寫進 document.title,dump-dom 後 grep <title>,看完刪掉 _t.html
# 注意:Chrome 實際安裝在 Program Files (x86)。
"/c/Program Files (x86)/Google/Chrome/Application/chrome.exe" --headless --disable-gpu --dump-dom "file:///<repo>/_t.html" | grep -oE "<title>.*</title>"
```

**驗手機版不能用 `--window-size=390,844`**:Windows 的視窗最小寬度會讓實際佈局變成 463px,
量出來的「沒有溢出」是假的。要用 iframe 強制真實寬度(`--allow-file-access-from-files` 才能讀
iframe 內容):

```html
<!-- _t.html:量 390px 下的溢出與元素寬度 -->
<iframe id="f" src="dashboard-monkey.html" style="width:390px;height:1400px;border:0"></iframe>
<script>
document.getElementById("f").addEventListener("load", function () {
  var d = this.contentDocument;
  document.title = "overflow=" + (d.documentElement.scrollWidth > d.documentElement.clientWidth);
});
</script>
```

## 7. 使用者偏好(務必遵守)

- 一律繁體中文,無簡體字。
- 客觀中立,直接點出問題與建議,不過度稱讚;資訊不足或語意不清直接講,不要硬回答。
- 任務細節未釐清前不要急著產出程式碼;第一步永遠先確認任務細節。
- 一個問題有多解時先簡述各解法,不要一次全部詳列。
- 動到外部系統(GitHub repo 可見度、Pages 設定等)時明確說明改了什麼。
