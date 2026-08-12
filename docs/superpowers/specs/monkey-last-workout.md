# Monkey 最近一次訓練卡：設計

日期：2026-08-12

## 目標

在 `dashboard-monkey.html` 加一張 `LAST WORKOUT` 卡，回答一個現在要點開熱力圖才知道的問題：**上一次動是什麼時候、做了什麼**。

同時移除 `AVG PACE · LAST 5 RUNS` 卡，由 `LAST WORKOUT` 接手那個位置。

系統只做兩件事：

1. **報告最近一個訓練日的內容**。項目、距離、時間、配速、選配欄位
2. **點開看那天的明細**。重用熱力圖已經在用的當日詳情彈窗

不新增任何資料欄位。這張卡的每一個數字都由既有的 `data/Monkey/*.json` 推導。

## 資料層：完全不動

`data/Monkey/` 的 schema 不變、不新增檔案、不新增欄位。

這符合硬規則「推導得出的值不要存」：「最近一筆是哪一筆」「距今幾天」「配速」「跟上次差多少」全部是查詢與計算的結果，存下來就會有跟來源數字互相矛盾的一天。

## 單位：一天算一次訓練

**一個訓練日 = 一筆**。同一天有多筆 session 或多筆 cardio 就合併：距離相加、時間相加、配速用合併後的總數算。

這與 `streak`、`currentQuest`、`personalRecords` 共用的 `buildDayRuns` 是同一套語彙。同一天在頁面上永遠只有一組數字，不會出現 quest 環算 1 次、這張卡報另一個數字的情況。

### 與 buildDayRuns 的差別

`buildDayRuns` 只掃 `cardio`，純重訓日（`cardio: []`）不在它的輸出裡。這張卡要涵蓋純重訓日，所以**不能**直接取 `buildDayRuns` 的最後一筆，要另外掃 `sessions`。

Monkey 目前 7 筆紀錄全是單筆 cardio、無重訓，所以三種算法現在畫出來一模一樣。差別在將來。

## 新函式 `lastWorkout(sessions)`

放進 `<script id="metrics">` 區塊，跟其他規則同一個地方。

```js
lastWorkout(sessions) -> null | {
  date:     "2026-08-01",
  kind:     "cardio" | "strength",
  names:    ["Zone 2"],     // cardio 的 exercise 去重，純重訓日改用 session.type
  km:       5.15,           // 當日 cardio 距離合計，純重訓日為 0
  min:      51.8,           // 當日 cardio 時間合計，純重訓日為 0
  hr:       140,            // 以下三個只在「當日恰好一筆 cardio」時有值，否則 undefined
  incline:  3,
  kcal:     330,
  exCount:  0,              // 以下三個給純重訓日用
  setCount: 0,
  exNames:  []
}
```

- 沒有任何 session 時回傳 `null`
- `kind` 由當日有沒有 cardio 決定，有就是 `cardio`
- 選配欄位（`hr` / `incline` / `kcal`）**只在當日恰好一筆 cardio 時填**。兩筆以上時心率無法相加、坡度無法平均，硬湊出來的數字沒有意義，寧可不顯示
- `incline` 的 0 是有效實測值，判斷用 `!= null`，不能用真假值

### 殘缺資料

不重複驗證。缺 `date` / `duration_min` / `distance_km` 的紀錄，`buildDayRuns` 已經會收進 `invalid`、`build_dashboard.js` 會 exit 1 擋在入庫前。這張卡拿到的資料必然完整。

## 新函式 `prevCardioDay(sessions, beforeDate)`

給 `▲▼` 用，回傳 `beforeDate` 之前**最近一個有 cardio 的訓練日**的 `{ date, km, min }`，沒有就回傳 `null`。

跳過純重訓日：那些日子沒有距離與配速可比。

### `▲▼` 的算法與文案

```
距離差 = lw.km - prev.km
配速差（秒）= (prev.min / prev.km - lw.min / lw.km) × 60
```

配速差**正值代表變快**（這次每公里少花幾秒），與被移除的 `AVG PACE` 的 `deltaSec` 同一個方向約定，箭頭語彙也一致：`▲` 綠＝進步、`▼` 紅＝退步。

| 情況 | 顯示 | 顏色 |
|---|---|---|
| 距離差 ≥ 0.01 km | `▲ +2.15 km` | `--pos` |
| 距離差 ≤ -0.01 km | `▼ -0.11 km` | `--neg` |
| 距離差在 ±0.01 km 內 | `same distance` | `--muted` |
| 配速差 ≥ 1 秒 | `▲ 23 sec faster` | `--pos` |
| 配速差 ≤ -1 秒 | `▼ 7 sec slower` | `--neg` |
| 配速差在 ±1 秒內 | `same pace` | `--muted` |

紅色兩列就是目前資料算出來的值（8/12 對 8/01），綠色兩列是假想值。

兩個差值各自判斷、各自上色，距離退步配速進步時就是一綠一紅。持平的門檻是為了擋掉浮點殘渣，不是為了美化。

## 版面

### 那一排的組成

```
移除前：  [ WEEKLY DISTANCE  flex 2.2 ] [ AVG PACE flex 1 ]
移除後：  [ WEEKLY DISTANCE  flex 2.3 ] [ LAST WORKOUT flex 0.9 ]
```

- `AVG PACE` 卡整張移除
- 位置與外層 `.row` 不變，`LAST WORKOUT` 直接接手
- 桌機 1100px 容器下實測 **WEEKLY DISTANCE 744px · LAST WORKOUT 312px**。純按 flex 比例算是 759 / 297，實際 LAST WORKOUT 略寬一些，因為它的內容有最小寬度需求，flex-shrink 收不到那麼小

### 卡片內容

`data/Monkey/` 目前最後一筆（2026-08-12 Running），對照日 2026-08-12：

```
LAST WORKOUT                          TODAY
Running
8/12 (WED)

5.04         51.3         10:11
KM           MIN          MIN / KM

▼ -0.11 km       ▼ 7 sec slower
─────────────────────────────────────
145 BPM    2 INCLINE    292 KCAL

                          VIEW DETAIL ›
```

同一張卡在破紀錄且久沒動的情況下（假想）：

```
LAST WORKOUT                    16 DAYS AGO
Zone 2  🥇 NEW PR  ⏱️ NEW PR
7/27 (MON)

6.20         62.4          10:03
KM           MIN          MIN / KM

▲ +1.05 km      ▲ 23 sec faster
─────────────────────────────────────
140 BPM    3 INCLINE    330 KCAL

                          VIEW DETAIL ›
```

由上而下：

| 列 | 內容 | 條件 |
|---|---|---|
| 標題列 | `LAST WORKOUT` + 距今天數 | 永遠 |
| 項目名 | `names` 以 `·` 串接 + PR 標籤 | 永遠 |
| 日期 | `M/D (WK)` | 永遠 |
| 主數值 | KM / MIN / MIN&nbsp;/&nbsp;KM 三欄均分 | `kind === "cardio"` |
| 主數值 | EXERCISES / SETS 兩欄均分 | `kind === "strength"` |
| `▲▼` | 距離差、配速差 | `kind === "cardio"` 且找得到 `prevCardioDay` |
| 選配欄位 | BPM / INCLINE / KCAL，上方有分隔線 | 該欄位有值才出現 |
| 動作名稱 | `exNames` 以 `·` 串接 | `kind === "strength"` |
| 頁尾 | `VIEW DETAIL ›` 靠右 | 永遠 |

**不列 `note`**。note 在當日詳情彈窗裡看得到，卡片上再列一次是同一句話說兩遍，而且長度不可控會把卡片撐開。

### 對齊：主數值均分撐滿

三個主數值各 `flex: 1 1 0`，撐滿卡片寬度，數字起點對齊出一條隱形網格。

其餘各列（`▲▼`、選配欄位）維持靠左 `gap` 排列，與彈窗的 `.dcMeta` 同一套排法。只有主數值均分是因為它們是這張卡的主角，其他列拉開後會讓「哪些數字重要」的層次變平。

### 窄欄縮字級

`LAST WORKOUT` 在桌機只有約 312px，比當日詳情彈窗（430px）還窄，字級要收。

**窄欄的值就是基準值**，手機再用既有的 `@media (max-width: 640px)` 放大回去。桌機才是那個窄的情境，把它寫成基準比寫成例外少一層覆蓋：

| 元素 | 基準（桌機窄欄） | 手機放大 |
|---|---|---|
| 項目名 | 16px | 19px |
| 主數值 | 20px | 24px |
| 主數值間距 | 14px | 22px |
| `▲▼` | 10px | 11px |

PR 標籤跟在項目名後面，窄欄放不下時**允許換行**，不縮字也不截斷。三項全破時本來就該佔兩行。

### 長條圖拉高填滿

同一排的卡片會被拉成等高，`LAST WORKOUT` 內容較多，`WEEKLY DISTANCE` 底部會空出一截。

`#weeklyDist` 改成 `display: flex; flex-direction: column`，`.bars` 從固定 `height: 88px` 改成 `flex: 1; min-height: 88px`，長高填滿那段留白。88px 保留為下限，卡片不夠高時不會把長條壓扁。

手機上兩張卡各自獨立、不再等高，`.bars` 維持固定 74px。**`min-height` 要一起歸零**，否則桌機那條 `min-height: 88px` 會把手機的 74px 頂上去，headless 探針量出來就是 88。

## 距今天數：三段號誌

| 天數 | 顏色 | CSS 變數 |
|---|---|---|
| 0–7 天 | 綠 | `--pos` `#34d399` |
| 8–14 天 | 橘 | `--streak` `#ffb648` |
| 15 天以上 | 紅 | `--neg` `#f87171` |

文案：0 天 `TODAY`、1 天 `YESTERDAY`、其餘 `N DAYS AGO`。

綠色用 `--pos` 而不是主色 `--accent`：萊姆綠在這一頁到處都是（數值、streak 徽章、按鈕），拿它當狀態燈號會失去對比。`--pos` / `--streak` / `--neg` 三個湊成一組號誌，也沿用了頁面既有的「綠＝好、紅＝差」語彙。

天數以本地時區的今天為準，與 quest、streak、熱力圖最右一格用同一個 `TODAY`。

## PR 標籤

最近這次剛好破了紀錄時，在項目名旁掛標籤：`⚡ NEW PR`（最快配速）、`🥇 NEW PR`（最長距離）、`⏱️ NEW PR`（最長時間）。

判定直接取既有的 `personalRecords(runs).isNew`，不另外算一套規則。

**只在 `lastWorkout().date` 等於 `buildDayRuns` 最後一筆的日期時才顯示。** `isNew` 的定義是「PR 日期等於最後一個 **cardio** 日」，若最近一次是純重訓日，兩者會指向不同的日子，直接掛上去會把更早那天的 PR 貼到今天。

破紀錄時會與正下方 PR 榜的 `NEW!` 標籤指向同一件事。這是刻意的：PR 榜講「歷史最佳是多少」，這張卡講「你上一次就是那一次」，兩者相鄰時互相印證。

目前資料下沒有任何標籤：8/12 的 5.04 km 與 51.3 min 都沒有超過 8/01 的 5.15 km 與 51.8 min，最快配速仍是 7/18 的 9:41。

## 互動

整張卡可點，點下去開既有的當日詳情彈窗 `openDayModal(date)`，也就是熱力圖點格子跳出來的那一張。不新寫彈窗。

hover 時邊框轉為 `--accent-dim`、上浮 1px，`VIEW DETAIL ›` 加底線，與票券夾入口 `#wallet` 同一套回饋。

## 沒有紀錄時

`lastWorkout()` 回傳 `null` 時整張卡不出現，`WEEKLY DISTANCE` 自動撐滿那一排。

與 `SLEEP` 區塊「沒有已過去的紀錄就整個 section 不出現」一致。空卡片講一句「還沒有紀錄」對使用者沒有幫助，長條圖全空已經講完同一件事。

## 移除 AVG PACE

| 檔案 | 動作 |
|---|---|
| `dashboard-monkey.html` | 移除 `#avgPace` 卡片 HTML、render 區塊的渲染程式、metrics 區塊的 `avgPace()` 與它的 export、手機版的 `#avgPace { order: -1 }` |
| `scripts/test_monkey_metrics.js` | 移除兩個 `avgPace` 測試 |
| `wallet-monkey.html` | 不手改。它的 `METRICS` 標記區塊由 build 從 dashboard 重抄，函式會自動消失 |
| `dashboard-captain.html` | **不動**。Captain 頁有自己一份獨立的 `avgPace`，繼續運作 |

不留沒人呼叫的函式。留著會讓下一個改 metrics 的人以為它還在用。Captain 頁保有同樣的邏輯，將來想加回來從那邊抄。

**這是移除功能，不只是搬位置。** `AVG PACE` 是頁面上唯一在講「近期狀態」的數字，`LAST WORKOUT` 的 `▲ 23 sec faster` 只跟單一一次比，波動比五次加權平均大得多，補不上它的位置。這是明知代價後的決定。

## 手機版

`.row` 在 640px 以下折成上下堆疊，兩張卡都是全寬，寬度比與窄欄字級都不生效。

`LAST WORKOUT` 沿用被移除的 `#avgPace { order: -1 }`：**排在 `WEEKLY DISTANCE` 之前**。最近一次比八週趨勢更即時，手機一屏能看到的東西少，即時的排前面。

## 改動清單

1. `dashboard-monkey.html`
   - CSS：新增 `.lw*` 系列、`#weeklyDist` 改 flex column、`.bars` 加 `flex: 1; min-height: 88px`、手機版 `#lastWorkout { order: -1 }` 與 `.bars { min-height: 0; height: 74px }`
   - CSS：移除 `#avgPace { order: -1 }`
   - HTML：`#avgPace` 換成 `#lastWorkout`，`#weeklyDist` 的 flex 2.2 改 2.3
   - metrics 區塊：新增 `lastWorkout()`、`prevCardioDay()` 與 export，移除 `avgPace()` 與 export
   - render 區塊：移除 AVG PACE 渲染，新增 LAST WORKOUT 渲染與點擊綁定
2. `scripts/test_monkey_metrics.js`：移除 2 個 `avgPace` 測試，新增 `lastWorkout` / `prevCardioDay` 測試
3. `wallet-monkey.html`、`dashboard-captain.html`：不手改

**不用改** `scripts/make_site.js` 與 `.github/workflows/pages.yml`，因為沒有新增頁面。

## 驗收

```bash
node scripts/build_dashboard.js Captain
node scripts/build_dashboard.js Monkey
node scripts/test_monkey_metrics.js
node scripts/make_site.js
node scripts/check_site_links.js
git diff --exit-code
```

外加 headless Chrome 探針（見 `docs/verification.md`）確認：

- 桌機 1100px：兩張卡寬度 744 / 312px，等高，`.bars` 從 88px 長到 156px
- 手機 390px：`LAST WORKOUT` 排在 `WEEKLY DISTANCE` 之前，兩張都是全寬
- 卡片內容為 2026-08-12 Running、`TODAY` 綠字、無 PR 標籤、兩個紅色 `▼`
- 點卡片會開出 2026-08-12 的當日詳情彈窗
- 主控台無錯誤

驗收時的對照值取自建置當下的 `data/Monkey/`。資料會繼續累積，日期與數字對不上時以當下資料重算，不要改程式去迎合這裡的數字。

## 明確不做

- **不存任何推導值**。這張卡不新增 JSON 欄位
- **不列 note**。彈窗裡已經有
- **不做「跟前 5 次平均比」**。那是被移除的 `AVG PACE`，不換一種形式復活
- **不動 Captain 頁**。兩人的頁面本來就獨立，Captain 沒有提出這個需求
- **不做連續休息天數的提醒文案**（例如「該動了」）。距今天數的顏色已經在講同一件事，加一句話是重複
