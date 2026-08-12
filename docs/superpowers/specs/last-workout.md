# LAST WORKOUT 卡：設計

兩頁都有一張 `LAST WORKOUT` 卡，回答一個原本要點開熱力圖才知道的問題：**上一次動是什麼時候、做了什麼**。

共通的規則寫在「共通規則」一節，兩頁各自的差異寫在自己那一節。分兩份寫遲早會分岔。

| | Monkey | Captain |
|---|---|---|
| 範圍 | 全頁**最近一個訓練日**，不分動作 | **選中動作**的最近一次，跟著 tab 走 |
| 位置 | `WEEKLY DISTANCE` 旁邊 | `TRAINING LOG` 的趨勢圖旁邊 |
| 取代了 | `AVG PACE · LAST 5 RUNS` | `AVG PACE` 與 `AVG WEIGHT` |
| 形態 | cardio 一種（純重訓日退化顯示） | cardio 與 strength 兩種 |

---

## 共通規則

### 資料層完全不動

`data/` 的 schema 不變、不新增檔案、不新增欄位。

符合硬規則「推導得出的值不要存」：「最近一筆是哪一筆」「距今幾天」「配速」「跟上次差多少」全部是查詢與計算的結果，存下來就會有跟來源數字互相矛盾的一天。

### 距今天數：三段號誌

| 天數 | 顏色 | 變數 |
|---|---|---|
| 0–7 天 | 綠 | `--pos` `#34d399` |
| 8–14 天 | 橘 | `--streak`（Monkey）／`#ffb648`（Captain） |
| 15 天以上 | 紅 | `--neg` `#f87171` |

文案：0 天 `TODAY`、1 天 `YESTERDAY`、其餘 `N DAYS AGO`。

綠色用 `--pos` 而不是各頁的主色：主色在頁面上到處都是（數值、streak、按鈕），拿它當狀態燈號會失去對比。綠橘紅三個湊成一組號誌，也沿用了兩頁既有的「綠＝好、紅＝差」語彙。

天數以本地時區的今天為準，與 quest、streak、熱力圖最右一格用同一個 `TODAY`。

**Captain 頁的三段號誌不套 `--tab-c`**，維持綠橘紅。它講的是「多久沒練這個動作」，跟練哪個部位無關。

### `▲▼` 的算法與文案

跟**上一次**比，不是跟平均比。

```
距離差 = last.km - prev.km
配速差（秒）= (prev.min / prev.km - last.min / last.km) × 60
重量差 = last.maxWeight - prev.maxWeight
容量差 = last.volume - prev.volume
```

配速差**正值代表變快**（這次每公里少花幾秒），與被移除的 `AVG PACE` 的 `deltaSec` 同一個方向約定。箭頭語彙一致：`▲` 綠＝進步、`▼` 紅＝退步。

| 情況 | 顯示 | 顏色 |
|---|---|---|
| 距離差 ≥ 0.01 km | `▲ +2.15 km` | `--pos` |
| 距離差 ≤ -0.01 km | `▼ -0.11 km` | `--neg` |
| 距離差在 ±0.01 km 內 | `same distance` | `--muted` |
| 配速差 ≥ 1 秒 | `▲ 23 sec faster` | `--pos` |
| 配速差 ≤ -1 秒 | `▼ 7 sec slower` | `--neg` |
| 配速差在 ±1 秒內 | `same pace` | `--muted` |
| 重量差 ≥ 0.01 | `▲ +2.5 kg` | `--pos` |
| 重量差 ≤ -0.01 | `▼ -10 kg` | `--neg` |
| 重量差在 ±0.01 內 | `same weight` | `--muted` |
| 容量差 ≥ 1 | `▲ +100 vol` | `--pos` |
| 容量差 ≤ -1 | `▼ -80 vol` | `--neg` |
| 容量差在 ±1 內 | `same volume` | `--muted` |

兩個差值各自判斷、各自上色，一綠一紅是正常的（例如重量持平但容量退步）。持平的門檻是為了擋掉浮點殘渣，不是為了美化。

### 對齊：主數值均分撐滿

三個主數值各 `flex: 1 1 0`，撐滿卡片寬度，數字起點對齊出一條隱形網格。

其餘各列（`▲▼`、選配欄位、組數明細）維持靠左 `gap` 排列，與當日詳情彈窗的 `.dcMeta` 同一套排法。只有主數值均分是因為它們是這張卡的主角，其他列拉開後會讓「哪些數字重要」的層次變平。

### 窄欄縮字級

兩頁的這張卡在桌機都只有約 300px，比當日詳情彈窗（430px）還窄。**窄欄的值就是基準值**，手機再用既有的 `@media (max-width: 640px)` 放大回去。桌機才是那個窄的情境，寫成基準比寫成例外少一層覆蓋。

| 元素 | 基準（桌機窄欄） | 手機放大 |
|---|---|---|
| 項目名 | 16px | 19px |
| 主數值 | 20px | 24px |
| 主數值間距 | 14px | 22px |
| `▲▼` | 10px | 11px |

破紀錄標籤跟在項目名後面，窄欄放不下時**允許換行**，不縮字也不截斷。

### 互動

整張卡可點，開既有的當日詳情彈窗 `openDayModal(date)`，就是熱力圖點格子跳出來的那一張。不新寫彈窗。

兩頁的掛法不同，各自沿用該頁既有的做法：Monkey 頁的卡片只渲染一次，直接 `addEventListener`；Captain 頁的卡片每次切 tab 都會重建，改成掛 `data-date` 讓 body 那個既有的委派接手，自己綁 listener 會一直重複掛。

hover 時邊框轉為強調色、上浮 1px，`VIEW DETAIL ›` 加底線。

**兩頁都有同一個 TDZ 陷阱**：渲染這張卡時會用到 `escHtml` / `esc`，那是 `const`，在宣告之前呼叫會爆。Monkey 的解法是把渲染的**呼叫**延到宣告之後；Captain 的 `renderAll()` 在檔案中段就跑了，改成把 `esc` 的**宣告**移到前面。點擊綁定寫成 `addEventListener` 的 callback 即可，callback 在點擊時才求值。

### 破紀錄標籤

最近這次剛好破了紀錄時，在項目名旁掛 `<icon> NEW PR` 標籤。判定直接取各頁既有的 `isNew`，不另外算一套規則。

破紀錄時會與 PR 榜的 `NEW!` 指向同一件事。這是刻意的：PR 榜講「歷史最佳是多少」，這張卡講「你上一次就是那一次」。

---

## Monkey 頁

### 單位：一天算一次訓練

**一個訓練日 = 一筆**。同一天有多筆 session 或多筆 cardio 就合併：距離相加、時間相加、配速用合併後的總數算。

與 `streak`、`currentQuest`、`personalRecords` 共用的 `buildDayRuns` 是同一套語彙。同一天在頁面上永遠只有一組數字，不會出現 quest 環算 1 次、這張卡報另一個數字。

`buildDayRuns` **只掃 cardio**，純重訓日（`cardio: []`）不在它的輸出裡。這張卡要涵蓋純重訓日，所以不能直接取它的最後一筆，要另外掃 `sessions`。

### `lastWorkout(sessions)`

放在 `<script id="metrics">` 區塊，跟其他規則同一個地方。

```js
lastWorkout(sessions) -> null | {
  date:     "2026-08-12",
  kind:     "cardio" | "strength",
  names:    ["Running"],    // cardio 的 exercise 去重，純重訓日改用 session.type
  km:       5.04,           // 當日 cardio 距離合計，純重訓日為 0
  min:      51.3,           // 當日 cardio 時間合計，純重訓日為 0
  hr:       145,            // 以下三個只在「當日恰好一筆 cardio」時有值，否則 undefined
  incline:  2,
  kcal:     292,
  exCount:  0,              // 以下三個給純重訓日用
  setCount: 0,
  exNames:  []
}
```

- 沒有任何 session 時回傳 `null`
- `kind` 由當日有沒有 cardio 決定，有就是 `cardio`
- 選配欄位（`hr` / `incline` / `kcal`）**只在當日恰好一筆 cardio 時填**。兩筆以上時心率無法相加、坡度無法平均，硬湊出來的數字沒有意義
- `incline` 的 0 是有效實測值，判斷用 `!= null`，不能用真假值

不重複驗證殘缺資料。缺 `date` / `duration_min` / `distance_km` 的紀錄，`buildDayRuns` 已經會收進 `invalid`、`build_dashboard.js` 會 exit 1 擋在入庫前。

### `prevCardioDay(sessions, beforeDate)`

給 `▲▼` 用，回傳 `beforeDate` 之前**最近一個有 cardio 的訓練日**的 `{ date, km, min }`，沒有就回傳 `null`。跳過純重訓日：那些日子沒有距離與配速可比。

### 版面

```
移除前：  [ WEEKLY DISTANCE  flex 2.2 ] [ AVG PACE flex 1 ]
移除後：  [ WEEKLY DISTANCE  flex 2.3 ] [ LAST WORKOUT flex 0.9 ]
```

桌機 1100px 容器下實測 **WEEKLY DISTANCE 744px · LAST WORKOUT 312px**。純按 flex 比例算是 759 / 297，實際 LAST WORKOUT 略寬，因為它的內容有最小寬度需求，`flex-shrink` 收不到那麼小。

由上而下：

| 列 | 內容 | 條件 |
|---|---|---|
| 標題列 | `LAST WORKOUT` + 距今天數 | 永遠 |
| 項目名 | `names` 以 `·` 串接 + PR 標籤 | 永遠 |
| 日期 | `M/D (WK)` | 永遠 |
| 主數值 | KM / MIN / MIN&nbsp;/&nbsp;KM | `kind === "cardio"` |
| 主數值 | EXERCISES / SETS | `kind === "strength"` |
| `▲▼` | 距離差、配速差 | `kind === "cardio"` 且找得到 `prevCardioDay` |
| 選配欄位 | BPM / INCLINE / KCAL | 該欄位有值才出現 |
| 動作名稱 | `exNames` 以 `·` 串接 | `kind === "strength"` |
| 頁尾 | `VIEW DETAIL ›` 靠右 | 永遠 |

**不列 `note`**。note 在當日詳情彈窗裡看得到，卡片上再列一次是同一句話說兩遍，而且長度不可控會把卡片撐開。

### 長條圖拉高填滿

同排卡片會被拉成等高，`LAST WORKOUT` 內容較多，`WEEKLY DISTANCE` 底部會空一截。

`#weeklyDist` 改成 `display: flex; flex-direction: column`，`.bars` 從固定 `height: 88px` 改成 `flex: 1; min-height: 88px`，長高填滿（實測 88 → 156px）。88px 保留為下限，卡片不夠高時不會把長條壓扁。

手機上兩張卡各自獨立、不再等高，`.bars` 維持固定 74px。**`min-height` 要一起歸零**，否則桌機那條 `min-height: 88px` 會把手機的 74px 頂上去。

### 沒有紀錄時

`lastWorkout()` 回傳 `null` 時整張卡不出現，`WEEKLY DISTANCE` 自動撐滿那一排。與 `SLEEP` 區塊一致。

### 手機版

`#lastWorkout { order: -1 }`，排在 `WEEKLY DISTANCE` 之前。最近一次比八週趨勢更即時，手機一屏能看到的東西少，即時的排前面。

### 移除 AVG PACE

`metrics` 的 `avgPace()`、它的 export、兩個對應測試一併刪掉，不留沒人呼叫的函式。`wallet-monkey.html` 的副本由 build 自動重抄而消失。

**這是移除功能，不只是搬位置。** `AVG PACE` 是頁面上唯一講「近期狀態」的數字，`▲▼` 只跟單一一次比，波動比五次加權平均大得多，補不上它的位置。這是明知代價後的決定。

---

## Captain 頁

### 單位：選中動作的最近一次

Captain 頁整體以「**當前選中的動作**」為脈絡（部位 tab + 動作 tab），PR 榜、趨勢圖全都是該動作的。這張卡跟著同一個脈絡，講的是**這個動作**上次做了什麼。

跟 Monkey 的「全頁最近一個訓練日」是不同的東西。同一天有多個 session 也不影響：每個動作各自找自己最近的一次。

### 兩種形態

| | cardio tab | strength tab |
|---|---|---|
| 主數值 | KM / MIN / MIN&nbsp;/&nbsp;KM | MAX `<unit>` / SETS / VOLUME `<unit>` |
| `▲▼` | 距離差、配速差 | 重量差、容量差 |
| 底部 | BPM / INCLINE / KCAL（有才顯示） | 組數明細，沿用彈窗的 `.dcSet` 藥丸 |

**單位跟著資料走**。`Bench Press` 是 `lb`，其他多半是 `kg`，`MAX KG` / `VOLUME KG` 的標籤不能寫死。

組數明細是重訓形態的重點：重訓真正想看的就是「上次推幾公斤幾下」。`AVG WEIGHT` 被取代之後，`MAX` 加組數明細補得回來，而且比一個平均值講得更細。

### 擴充既有函式，不新增平行的一套

`buildDayRuns(exercise)` 與 `strengthSessionStats(exercise)` 都已經回傳依日期排序的陣列，**最後一筆就是最近一次、倒數第二筆就是上一次**。不需要新函式，只要補上缺的欄位：

- `buildDayRuns` 加 `hr` / `incline` / `kcal`，且**只在當天只有一筆 cardio 時才帶**（同 Monkey 的理由）
- `strengthSessionStats` 加 `sets` / `setCount`

其他消費者（PR 榜、趨勢圖、週距離）不看這些新欄位，不受影響。

### 版面：兩個 tab 的寬度必須一致

改動前實測：

```
Cardio tab :  weeklyDist 713  |  avgPace 343
Leg tab    :  weightTrendCard 480  |  avgPace 576   ← 切一下跳 233px
```

`weightTrendCard` 的 `max-width: 480px` 讓它撐不滿，右卡的 `flex:1` 就吃掉全部剩餘空間。右邊只是個平均值時跳動不明顯，換成 LAST WORKOUT 會很礙眼。

**解法：移除 `max-width`，兩個分支都用 `flex: 2.3 : 0.9`。** 實測兩個 tab 都是 **744 | 312**，切換不再跳。用 flex 比例而不是固定 px，視窗變窄時還能等比縮放。

### 折線圖的 viewBox 要一起改

`lineChart` 產出的 SVG 是 `viewBox` 配 CSS `svg { width:100%; height:auto }`，會**等比縮放**。`max-width: 480px` 原本就是在限制放大後的高度與字級。

拿掉 max-width 後卡片撐到約 744px，若 viewBox 維持 `320×128`，高度會從 192px 長到 298px、圖裡的字也跟著放大，把 LAST WORKOUT 拉出一片 135px 的空白。

**viewBox 改成 `480×128`**：744px 寬算出來的高度與字級，跟以前 320 塞進 480px 卡片時幾乎一樣。實測改完兩張卡自然等高（274 / 274），空白剩 1px。

### 顏色跟著 tab 走

所有數值用 `var(--tab-c, var(--accent))` — Cardio 黃、Leg 藍、Shoulder 綠、Chest 紫、Back 粉。這是 Captain 頁的既有語彙（`.accent` 本來就這樣定義）。

**已知的撞色**：`--c-shoulder` 是 `#34d399`，跟三段號誌的「7 天內綠」同一個值。切到 Shoulder tab 時數值與距今天數同色。目前接受，因為兩者位置分開、語意也不衝突。

### 手機版

`#lastWorkout { order: -1 }`，排在趨勢圖之前，理由同 Monkey。實測兩個 tab 都正確、全寬 366px、無橫向溢出。

### 移除 AVG PACE 與 AVG WEIGHT

`avgPace()` 與 `strengthAvgWeight()` 兩個函式一併刪除。

代價比 Monkey 那次更明確：**重訓 tab 失去了唯一的近期負重平均**。選擇「選中動作的最近一次」而不是「全頁最近一次」時就知道會這樣，靠 `MAX` 加組數明細補。

### 沒有測試覆蓋

**Captain 頁的 metrics 無法像 Monkey 那樣抽出來測。** 它只有兩個 `<script>`（一個資料注入、一個整份 IIFE），沒有 `id="metrics"` 標記也沒有 export 到 window，`test_monkey_metrics.js` 的做法在這裡行不通。

這是**既有的缺口**，不是這次引入的。這次的改動靠 headless 探針驗證渲染結果（見「驗收」）。要補測試得先把 metrics 抽成有標記的區塊並 export，那是獨立的一件事。

---

## 驗收

```bash
node scripts/build_dashboard.js Captain
node scripts/build_dashboard.js Monkey
node scripts/test_monkey_metrics.js
node scripts/make_site.js
node scripts/check_site_links.js
git diff --exit-code
```

headless Chrome 探針（iframe 強制真實寬度，不用 `--window-size`，見 `docs/verification.md`）：

**Monkey 頁**

- 桌機 1100px：兩張卡 744 / 312px，等高，`.bars` 88 → 156px
- 手機 390px：`#lastWorkout` 排在 `#weeklyDist` 之前，兩張全寬，`.bars` 74px
- 內容為當下最後一筆，距今天數的顏色符合三段號誌
- 點卡片開出對應日期的當日詳情彈窗，主控台無錯誤

**Captain 頁**

- 桌機：**Cardio / Leg / Chest 三個 tab 的卡片寬度都是 744 | 312**，切換不跳
- 重訓 tab：主數值為 `MAX <unit>` / `SETS` / `VOLUME <unit>`，單位跟著資料（Bench Press 是 `LB`）
- 重訓 tab：兩張卡等高，空白 ≤ 5px
- 數值顏色等於該 tab 的 `--tab-c`
- **點卡片會開出對應日期的彈窗**，cardio 與 strength 兩個 tab 都要測
- 手機 390px：`#lastWorkout` 在趨勢圖之前，全寬，無橫向溢出

驗收時的對照值取自建置當下的資料。資料會繼續累積，日期與數字對不上時以當下資料重算，不要改程式去迎合這裡的數字。

## 明確不做

- **不存任何推導值**。這張卡不新增 JSON 欄位
- **不列 `note`**。彈窗裡已經有
- **不做「跟前 N 次平均比」**。那是被移除的 `AVG PACE` / `AVG WEIGHT`，不換一種形式復活
- **不做連續休息天數的提醒文案**（例如「該動了」）。距今天數的顏色已經在講同一件事
- **不為了對稱而統一兩頁的範圍**。Monkey 是單一時間軸、Captain 是動作脈絡，這是兩頁本來的差異，不是不一致
