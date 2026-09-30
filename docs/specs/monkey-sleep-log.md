# Monkey 睡眠紀錄

Monkey dashboard 記錄每晚是否服用助眠藥、躺床區間與主觀狀態。系統只保存事實並呈現最近紀錄，不提供醫療建議、減藥計畫或趨勢判讀。

新增與補記流程由 [.claude/skills/log-sleep/SKILL.md](../../.claude/skills/log-sleep/SKILL.md) 定義。

## 資料契約

一晚一個檔案：`data/Monkey/sleep/YYYY-MM-DD.json`

```json
{
  "date": "2026-08-05",
  "medication": { "taken": true },
  "bedtime": "23:10",
  "wake_time": "07:00",
  "quality": 3,
  "morning": "groggy",
  "night_wakes": 1,
  "note": null
}
```

| 欄位 | 必填 | 規則 |
|---|---|---|
| `date` | 是 | 合法的 `YYYY-MM-DD`，必須與檔名一致 |
| `medication.taken` | 是 | boolean |
| `bedtime` | 是 | 24 小時制 `HH:MM` |
| `wake_time` | 是 | 24 小時制 `HH:MM` |
| `quality` | 是 | 1 到 5 的整數 |
| `morning` | 是 | `groggy`、`normal`、`clear` |
| `night_wakes` | 否 | 大於等於 0 的整數 |
| `note` | 否 | 字串或 `null` |

`date` 表示就寢那一天。凌晨上床仍歸到前一晚，例如 `date: 2026-08-05` 與 `bedtime: 01:20` 表示 8 月 6 日凌晨上床、屬於 8 月 5 日晚上。

- 沒吃藥必須寫 `medication.taken: false`，不能省略
- 必填欄位不得為 `null`
- 睡眠資料放在子資料夾，避免被訓練 session 掃描誤讀
- 資料層不保存減藥計畫

## 驗證

`dashboard-monkey.html` metrics 中的 `validateNights` 負責資料規則，`scripts/build_dashboard.js` 呼叫它並在錯誤時中止 build。驗證包括：

- 檔名與日期格式合法，且兩者一致
- 日期不得晚於今天，同一日期不得出現多筆
- 六個必填欄位完整且型別正確
- `night_wakes` 與 `note` 存在時格式正確
- sleep 資料存在但頁面缺少 `SLEEP_DATA` 標記時不得靜默忽略

漏記某晚不是 build 錯誤。缺漏會在集章卡中顯示為空格，不得用假資料補齊。

## 推導值

- 躺床時數由 `wake_time - bedtime` 計算
- `wake_time <= bedtime` 時視為跨午夜並加 24 小時
- 頁面稱為 `IN BED`，不稱為睡眠時數，因為沒有記錄實際入睡時間
- 推導值不寫回 JSON

## 集章卡

- 最多顯示最近 14 晚
- 範圍從第一筆紀錄開始，到昨晚結束
- 今晚不佔格子，因為完整結果要到隔天起床後才知道
- 範圍內缺少資料顯示 `NOT LOGGED`
- 有紀錄且服藥顯示 `TAKEN`
- 有紀錄且未服藥顯示 `NOT TAKEN`
- 預設選取昨晚，點擊任一格使用既有 `dayModal` 顯示完整明細
- 沒有任何已過去的紀錄時，整張 SLEEP 卡不渲染
- 介面文字使用英文，note 保留使用者原文

整頁位置以 [page-layout.md](../page-layout.md) 為準，手機驗證以 [verification.md](../verification.md) 為準。

## 不做

- 不做品質、用藥或夜醒趨勢圖
- 不計算記錄完整度或連續記錄天數
- 不判斷是否遵守用藥計畫
- 不估算實際睡眠時數或入睡耗時
- 不支援裝置匯入
- 不建立獨立睡眠頁面
- 不支援 Captain
- 不提供劑量或停藥建議
