# Monkey 炸雞券獎勵系統 — 設計

日期:2026-07-31
狀態:規則定案,實作中

## 1. 目標與範圍

Monkey 每達成一次 weekly quest,核發一張**炸雞券**。券累積在一個**票券夾**裡,可用的隨時看得到,
用掉的蓋上 `USED` 戳記留著當紀錄。

**範圍**:只有 Monkey。`dashboard-captain.html` 與 `data/Captain/` 完全不動,達標判定也只看 Monkey 自己的成績。

### 兩個頁面

| 檔案 | 角色 |
|---|---|
| `dashboard-monkey.html` | 只放**入口卡**:可用張數 + 最近一張的取得日 + 進入連結 |
| `wallet-monkey.html` | 票券夾本體:`AVAILABLE` / `USED` 兩個 tab,完整清單 |

券會一直累積,清單放 dashboard 上會把每天要看的東西(PR 榜、配速、熱力圖)推到很下面——
20 張券時票券夾在手機上高 1118px,PR 榜被推到 1521px 處。所以清單獨立成頁,dashboard 只留張數。

## 2. 獎勵規則

| 項目 | 規則 |
|---|---|
| 達標條件 | 該週 `runs ≥ 3` **且** `minutes ≥ 150`(即現有 `WEEKLY_GOAL`) |
| 週定義 | 週一 00:00 ~ 週日 23:59 |
| 發券數量 | 一週達標 = 1 張,**每週上限 1 張** |
| 券的主鍵 | 該週的 `week_start`(週一日期) |
| 發券時機 | 達標當下即發,不等週結算 |
| 取得日 | 兩個條件**同時**滿足的那一天 |
| 起算週 | `2026-07-27`。此週之前的週一律不發,不回溯 |
| 有效期 | 永不過期 |
| 券狀態 | `available` / `used`,沒有第三種 |

達標判定沿用 metrics 既有的 `weekStart` / `weekAgg` / `isCompleteWeek`,**不另寫一份**,否則規則會偷偷分岔。

起算週寫成常數,與 `WEEKLY_GOAL` 並排:

```js
const REWARD_START_WEEK = "2026-07-27";
```

## 3. 資料契約

### 唯一要存的東西:使用紀錄

發券完全由訓練資料推導,**不存**。唯一無法推導、必須落地的是「哪張券被用掉了」。

`data/Monkey/rewards/redemptions.json` — 單一 ledger,一個陣列:

```json
[
  { "week_start": "2026-08-03", "used_on": "2026-08-10", "note": "繼光香香雞" },
  { "week_start": "2026-08-10", "used_on": "2026-08-15", "note": null }
]
```

| 欄位 | 必填 | 說明 |
|---|---|---|
| `week_start` | 是 | 用掉的是哪一張券(該週的週一日期) |
| `used_on` | 是 | 什麼時候用掉 |
| `note` | 否 | 吃了什麼,可為 `null` |

**不存張數、不存餘額、不存券本身**——全是推導值,存了就會有跟來源互相矛盾的一天。

### 為什麼放在 `rewards/` 子資料夾

`build_dashboard.js` 把 `data/<人名>/*.json` 全部當成訓練 session 讀進來。ledger 若直接放在
`data/Monkey/` 底下會被當成一筆缺 `date` 的訓練紀錄,build 直接失敗。放進子資料夾,session 掃描器
自動忽略,不需要在腳本裡硬寫檔名特例。

### 注入頁面

ledger 由 build 腳本注入 `/*REWARDS_DATA_START*/`…`/*REWARDS_DATA_END*/` 標記區塊,規則與
`WORKOUT_DATA` 相同——**只能由腳本改寫**。

`wallet-monkey.html` 是自含檔,但**主題與規則都不自己寫一份**,由 build 從 `dashboard-monkey.html`
複製過去:

| 標記區塊 | 來源 | 理由 |
|---|---|---|
| `/*THEME_START*/`…`/*THEME_END*/` | dashboard 的 `:root { … }` | 配色改一次兩頁一起變 |
| `/*METRICS_START*/`…`/*METRICS_END*/` | dashboard 的 `<script id="metrics">` | 達標規則只有一份來源 |
| `WORKOUT_DATA` / `REWARDS_DATA` | 同 dashboard | 同一份資料 |

版面與元件樣式(卡片、tab、券的外觀)才是各頁自己的。

`dashboard-captain.html` 沒有 REWARDS 標記區塊,`data/Captain/rewards/` 與 `wallet-captain.html`
也都不存在。缺席時腳本靜默跳過,不報錯。**唯一的例外**:ledger 存在但頁面沒有標記區塊會 exit 1,
免得資料被無聲忽略。

## 4. 驗證規則

以下三種情況 build 一律 exit 1,連帶讓部署失敗:

1. `week_start` 指向一個**沒達標的週**(幽靈券)
2. 同一個 `week_start` 在 ledger 出現**兩次**(一張券用兩次)
3. `used_on` **早於該張券的取得日**(券還沒發就用掉)

第 1 點會在「事後修改訓練資料、導致某個舊週不再達標」時觸發。這是刻意的:要人工判斷是資料錯還是券發錯,
不能靜默把已經吃掉的炸雞變不見。

## 5. 計算層

metrics 區塊新增 `coupons(dayRuns, redemptions)`,掛上 `window.MonkeyMetrics`。發券只看訓練資料與
ledger,與「今天是幾號」無關。

```js
{
  coupons: [
    {
      week_start: "2026-08-03",
      week_end:   "2026-08-09",
      earned_on:  "2026-08-08",   // 兩項條件同時滿足的那一天
      status:     "available",     // 或 "used"
      used_on:    null,            // status = "used" 時才有值
      note:       null
    }
  ],
  available: 1,                    // 可用張數
  used: 0,                         // 已使用張數
  problems: []                     // 對不上的使用紀錄,見第 4 節
}
```

券依 `week_start` 由新到舊排列。`problems` 非空時 build 失敗,對應的使用紀錄一律不生效
(券維持 `available`),不會靜默吃掉別週的券。

改動 metrics 後必須跑 `node scripts/test_monkey_metrics.js`。測試至少涵蓋:剛好達標、差一項不達標、
起算週之前的達標週不發券、同週重複使用、使用紀錄對不上任何達標週。

## 6. 頁面呈現

### 入口卡(dashboard-monkey.html)

接在 WEEKLY QUEST 下面——券是 quest 的產物,因果相連,手機第一屏內看得到。整張卡是連往票券夾的連結。

- 可用張數的大數字 + `LATEST <取得日> · <n> USED`
- 一張券都沒有時改顯示 `Complete a weekly quest to earn your first coupon`

### 票券夾(wallet-monkey.html)

- 頁首:`‹ MONKEY` 返回連結、標題、`<n> EARNED · <n> AVAILABLE · <n> USED`
- 兩個 tab:`AVAILABLE` / `USED`,各自帶張數,預設 `AVAILABLE`
- 一張券一列:🍗 票根 + 撕線虛線 + `EARNED <取得日>`,已使用的多一個 `note`
  - 已使用:整列灰階 + 內容淡化,右邊一枚紅框 `USED <日期>` 戳記
  - 可用的券**不放狀態標籤**——列是亮的就代表可用,標籤留給戳記才有意義
- 手機一欄一張,桌機 `auto-fill` 補成多欄,免得每列右邊空一大片
- note 過長時省略,**日期不換行**

兩個 tab 分開的理由:可用的是要行動的資訊,已使用的是歷史,混在一起兩邊都難掃。

## 7. 明確排除

- 券的有效期與過期狀態
- 回溯補發 `2026-07-27` 之前的券
- 在頁面上直接點按使用券(GitHub Pages 是靜態唯讀,寫不回 repo)。使用紀錄一律走 ledger + commit
- Captain 的任何獎勵機制
