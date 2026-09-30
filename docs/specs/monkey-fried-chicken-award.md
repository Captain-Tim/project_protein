# Monkey 炸雞券

Monkey 的 weekly quest 達標後取得炸雞券。dashboard 只顯示本週進度與票券夾入口，完整券清單位於 `wallet-monkey.html`。

## 券的種類

| 種類 | 來源 | ID |
|---|---|---|
| 達標券 `quest` | 由訓練資料推導 | `quest:<week_start>` |
| 特別券 `special` | 人工核發並存入 ledger | 自訂唯一 ID，不得以 `quest:` 開頭 |

達標券規則：

- 一週從星期一開始
- 同時達到 3 次 day-runs 與 150 分鐘即發一張
- 每週最多一張，達標當下核發
- `earned_on` 是兩項條件首次同時成立的日期
- 只核發 `REWARD_START_WEEK = "2026-07-27"` 起的達標週，不回溯
- 永不過期，狀態只有 `available` 與 `used`

達標判定必須沿用 `dashboard-monkey.html` metrics 中的 `weekStart`、`weekAgg` 與 `isCompleteWeek`，不得另寫平行規則。

## 持久化資料

達標券本身、券數與餘額都不儲存。只保存無法由訓練資料推導的決定。

### 使用紀錄

`data/Monkey/rewards/redemptions.json`

```json
[
  { "id": "quest:2026-08-10", "used_on": "2026-08-20", "note": "寶島八號雞排" }
]
```

| 欄位 | 必填 | 說明 |
|---|---|---|
| `id` | 是 | 已存在券的 ID |
| `used_on` | 是 | 使用日期 |
| `note` | 否 | 使用內容，可為 `null` |

### 特別券

`data/Monkey/rewards/grants.json`

```json
[
  {
    "id": "special:2026-08-01-launch",
    "granted_on": "2026-08-01",
    "reason": "炸雞系統上線"
  }
]
```

| 欄位 | 必填 | 說明 |
|---|---|---|
| `id` | 是 | 全域唯一，不得以 `quest:` 開頭 |
| `granted_on` | 是 | 核發日期 |
| `reason` | 是 | 人工核發原因 |

特別券必須由使用者明確授權。兌換流程與先進先出規則由 [.claude/skills/use-coupon/SKILL.md](../../.claude/skills/use-coupon/SKILL.md) 定義。

## 驗證

`coupons(dayRuns, redemptions, grants)` 回傳券清單、可用與已用張數，以及 `problems`。build 在 `problems` 非空時失敗，包括：

- 使用紀錄缺少 ID 或日期
- ID 指向不存在的券
- 同一張券使用兩次
- `used_on` 早於 `earned_on`
- grant 缺少 `id`、`granted_on` 或 `reason`
- grant ID 重複或冒用 `quest:` 命名空間

事後修改訓練資料若讓已兌換的達標券失去來源，也必須失敗，交由人工判斷資料或兌換紀錄哪邊需要修正。

## Build 與頁面

- `scripts/build_dashboard.js` 讀取兩份 ledger，呼叫 metrics 驗證，再注入 `REWARDS_DATA`
- redemptions ledger 存在但頁面缺少 `REWARDS_DATA` 標記時，build 必須失敗
- wallet 的 theme、metrics、workout data 與 rewards data 都由 build 從 dashboard 或來源資料同步，不另維護一份規則
- dashboard 的 quest 卡顯示下一張券的差距、當週取得狀態、可用張數與 wallet 入口
- wallet 依取得日由新到舊排列，分為 `AVAILABLE` 與 `USED` 兩個 tab
- 特別券使用獨立徽章與配色
- 頁面上的 `USE?` 只提供當次瀏覽的預覽演出，不會修改 repo。重新載入即復原，正式兌換必須更新 ledger
- 已使用券可開啟詳情，顯示取得日、使用日與 note

## 不做

- 不提供過期狀態
- 不回溯核發起算週以前的券
- 不讓靜態 GitHub Pages 直接寫回資料
- 不替 Captain 建立獎勵系統
