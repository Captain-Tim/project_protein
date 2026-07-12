# Monkey 的 Cardio Dashboard — 頁面模板設計

日期:2026-07-11
狀態:設計定案,待實作

## 1. 目標與範圍

替第二個人(Monkey)做一個獨立的訓練紀錄頁面 `dashboard-monkey.html`。
Monkey 目前只做 **cardio(以跑步為主)**,紀錄含距離與時間。

**本次範圍**:只做「頁面模板」——版面、視覺、指標定義、以及頁面從什麼資料形狀算出這些數字。
**不在本次範圍**:資料怎麼寫入、怎麼審核、build 腳本怎麼注入、手機端登錄流程。模板先用內嵌樣本資料渲染。

**明確不動的東西**:`dashboard.html`(第一個人)的版面與視覺完全不改,只在頁首加一個切換連結。

## 2. 視覺方向

- 參考風格:黑底 + 螢光綠的遊戲化 fitness dashboard(暗色、大圓角卡片、環形進度、經驗值條、獎盃、🔥 連續紀錄)
- **介面文案一律英文**(與 `dashboard.html` 的 Trends / Sessions 一致)。使用者寫的 note 若是中文,照原文顯示。
- 配色:
  - 背景 `#070708`,卡片 `#111214`,卡片邊框 `#212328`
  - 主 accent(數據、進度、圖表)螢光綠 `#c9f24d`,深階 `#7fae35`
  - 人物色(頭像外框、頁首光暈)紫 `#b558ff` — 取自 Monkey 的頭像配色,與資料色分工:**人物是紫的,數據是綠的**
  - 🔥 streak 徽章橘 `#ffb648`,底 `#1a1408`
  - 文字 `#e9ecef`,次要文字 `#7f858e`
- 數字一律等寬字(`Consolas`/`ui-monospace`),標籤小字大寫加字距
- 熱力圖的橫向捲軸自訂成細螢光綠(`::-webkit-scrollbar` + `scrollbar-color`),不用瀏覽器預設灰捲軸
- 頭像:`profile/monkey.jpg`(已由 `.jfif` 改名,避免 GitHub Pages MIME 問題)。**repo 是 public,此圖等同公開**——已與使用者確認,圖為動漫角色非真人照。

## 3. 頁面內容(由上而下)

### 3.1 頁首 Header
- 圓形頭像(紫框 + 紫光暈)
- `MONKEY · CARDIO`
- 累積數字一行:`TOTAL <總距離> km · <總次數> RUNS · <總時數> HRS`
- 右側:🔥 **WEEK STREAK** 徽章(大數字 = 連續達標週數)
- 右上角:切到 `dashboard.html` 的小連結(`Tim ›`)

### 3.2 WEEKLY QUEST(本週任務)
- 週定義:**週一 ~ 週日**(與 `dashboard.html` 現有的 week bucket 一致)
- 兩個獨立目標,各一個環:
  - **RUNS** — 目標 **3 次/週**
  - **TIME** — 目標 **150 分鐘/週**
- 環達成時加綠色光暈 + `✓ COMPLETE`
- 右側一條經驗值條 = **QUEST PROGRESS**,值為兩項達成率(各自上限 100%)的平均
- 卡片右上顯示 `<N> DAYS LEFT`(距本週日結束)
- 目標數字寫成腳本頂端的常數,改一處即可:
  ```js
  const WEEKLY_GOAL = { runs: 3, minutes: 150 };
  ```

### 3.3 🏆 PERSONAL RECORDS(PR 榜,三格)
- ⚡ **FASTEST PACE** — 最快配速(min/km),附日期與該次距離
  - 只計 **距離 ≥ 2 km** 的跑步,避免短跑刷出失真的配速
- 🥇 **LONGEST RUN** — 最長單次距離(km),附日期
- ⏱️ **LONGEST TIME** — 最長單次時間(min),附日期
- 破紀錄的那一格:綠色描邊 + 光暈 + `NEW!` 標籤
  - 判定:該紀錄是在**最近一次 session** 產生的

### 3.4 AVG PACE(獨立一格大數字)
- **最近 5 次跑步**的加權平均配速 = (最近 5 次總距離) ÷ (最近 5 次總時間)
  - 不是「5 個配速直接平均」——那會讓 1 km 跟 10 km 同等權重,失真
- 下方一行變化量:與**前 5 次**的同樣算法相比,快/慢幾秒
  - 例:`▲ 8 sec faster than previous 5`
- 不足 5 次時:有幾次算幾次,變化量隱藏

### 3.5 WEEKLY DISTANCE(柱狀圖)
- 最近 **8 週**(含本週),每根 = 一週總距離
- 本週那根用亮綠漸層,其餘用灰
- 右上顯示 `THIS WEEK <x> km`

### 3.6 ACTIVITY(GitHub 式熱力圖)
- 一欄一週(週一~週日,共 7 列),上方標月份
- **右上有 tab 切換視圖**,預設 `RECENT`:
  - `RECENT` = **過去 365 天**(含今天)→ 365 = 52 週 + 1 天,所以是 53 欄,首欄不完整
  - `2026`、`2025`… = **該日曆年 1/1–12/31**(當年還沒過完就留空)。
    年份清單 = 最早有資料的年份 ~ 今年,**連續列出**(中間沒資料的年份也列,否則 tab 會跳號)
  - 兩種視圖走同一個區間產生器 `heatmapRange(from, to, today)`,規則只有一份
- 每格 = 一天,顏色深淺 = **當天總距離**,四階:
  - 0 km → `#17191c`
  - 0 < d ≤ 3 km → `#2f4419`
  - 3 < d ≤ 6 km → `#5f8a26`
  - \> 6 km → `#c9f24d`(加光暈)
- 區間外與今天之後的格子畫成透明(`.empty`),不是 0 km 的深灰
- 標題下顯示 `<N> RUNS IN THE PAST 365 DAYS` / `<N> RUNS IN 2026`,下方 LESS ▸ MORE 圖例
- 桌機直接放得下;手機橫向捲動,**視圖若含今天就把今天那欄捲到最右;過去年份停在最左的一月**

## 4. 指標定義(全部釘死)

### 4.1 最重要的前提:「一次 run」= 一天

**同一天的多筆 cardio 紀錄一律合併成一次 run**(距離相加、時間相加)。
理由:weekly goal 是「3 runs」,若一天拆成兩段跑就算兩次,任務與 streak 都可以灌水。

所以頁面內部的計算單位是 **day-run**(一個有 cardio 紀錄的日期),而非 session、也非單筆 cardio entry:
- `runs` 計數 = 有跑的**天數**
- Longest run = 某**一天**的總距離
- 該天的 pace = 該天總距離 ÷ 該天總時間

### 4.2 定義表

| 指標 | 定義 |
|---|---|
| **Run** | **一個有 cardio 紀錄的日期**(同日多筆合併:距離相加、時間相加) |
| Pace | 每公里分鐘數 = `duration_min / distance_km`,顯示成 `m:ss`,**越小越快** |
| Total distance / runs / hours | 全部 day-run 的累加(runs = 天數) |
| Week | 週一 00:00 ~ 週日 23:59 |
| 達標週 | 該週 **runs(天數)≥ 3 且 minutes ≥ 150**(兩項都要) |
| Streak | 從最近一個**已結束**的週往回數,連續達標的週數。**本週還沒結束不算斷**;若本週已達標則計入 |
| Fastest pace | 距離 ≥ 2 km 的 day-run 中,pace 最小者 |
| Avg pace | 最近 5 個 day-run 的 `Σdistance / Σduration` |
| 熱力圖濃淡 | 該日的總距離 |

## 5. 手機版(主要使用情境)

Monkey 主要在手機看,手機是主場,桌機是附帶。

- 所有桌機的左右並排一律改上下堆疊,順序:
  **頁首 → 🔥 streak → WEEKLY QUEST → PR 榜 → AVG PACE → WEEKLY DISTANCE → ACTIVITY 熱力圖**
  (每天要看的在上,回顧型的在下)
- streak 徽章在手機上改成獨立一列、置中,不擠在頁首右側
- WEEKLY QUEST 的兩個環並排縮成 84px,讓一屏內還能看到 PR 榜
- PR 三格維持橫排但縮小字級
- 熱力圖橫向捲動 + 自動捲到今天那一欄;年份 tab 列在窄螢幕會換行到標題下方
- 斷點:640px(與現有 `dashboard.html` 一致)

## 6. 檔案與資料

### 檔案
- `dashboard-monkey.html` — 新頁面,單一自含檔(零外部依賴,與 `dashboard.html` 同慣例:純手寫 SVG/CSS,不引入圖表函式庫)
- `profile/monkey.jpg` — 頭像
- `dashboard.html` — 只加一個切到 Monkey 頁的小連結,其餘不動

### 資料契約(本次只定形狀,不做串接)
頁面從 `window.MONKEY_DATA` 讀資料,格式沿用現有 session schema,但 cardio 項目**必須有 `distance_km`**:

```json
{
  "generated_at": "2026-07-11T00:00:00.000Z",
  "sessions": [
    {
      "date": "2026-07-08",
      "type": "Cardio",
      "cardio": [
        { "exercise": "Zone 2", "duration_min": 38, "distance_km": 6.2, "note": null }
      ],
      "note": null
    }
  ]
}
```

- `distance_km` 是**現有 schema 沒有的欄位**,是這個頁面所有配速/距離指標的前提。串接階段必須補上。
- 資料同樣用 `/*WORKOUT_DATA_START*/…/*WORKOUT_DATA_END*/` 標記區塊注入,與 `dashboard.html` 同慣例。
- **本次實作**:標記區塊內先放樣本資料,讓模板能渲染;build 腳本與資料來源另案處理。

### 必填欄位(資料一定要完整)

每一筆 cardio 紀錄 **`date` / `duration_min` / `distance_km` 三者缺一不可**。
不接受「只有時間、沒有距離」的紀錄——資料不完整就不是有效紀錄。

- `exercise`、`note` 為選配,目前頁面沒有任何地方用到(Recent runs 清單已砍),但可保留給未來。
- `pace` **不記**,由 `duration_min ÷ distance_km` 算出,避免與距離/時間互相矛盾。
- 頁面若仍讀到缺欄位的紀錄:**不靜默略過**,在頁尾顯示明顯的資料錯誤提示(列出有問題的日期),否則統計會無聲地錯掉。

## 7. 已明確排除的東西

- Pace trend 折線圖(砍掉,avg pace 大數字取代)
- Recent runs 清單(砍掉)
- Best week PR(砍掉)
- 體重/體脂/BMI、心率、卡路里(沒有這些資料,不做空格子)
- 重訓相關的一切(Monkey 目前不做;未來擴充再談)
