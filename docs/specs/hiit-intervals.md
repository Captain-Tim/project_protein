# HIIT 間歇紀錄

HIIT 的主要強度指標是間歇設定，不是包含暖身、休息與收操的平均配速或總距離。因此 HIIT 使用獨立欄位與 PR 規則。

## 資料契約

每筆 HIIT 仍須具備所有有氧共通欄位，包含 `duration_min` 與 `distance_km`。另外必填：

| 欄位 | 說明 |
|---|---|
| `work_speed_kmh` | 衝刺段速度（km/h） |
| `work_min` | 衝刺段長度（分鐘） |
| `rest_speed_kmh` | 休息段速度（km/h） |
| `rest_min` | 休息段長度（分鐘） |
| `rounds` | 循環數，正整數 |
| `calories_kcal` | 本次總卡路里 |

`build_dashboard.js` 對上述欄位執行驗證，缺少或格式不合法時中止 build。輸入與來源優先序由 [.claude/skills/log-workout/SKILL.md](../../.claude/skills/log-workout/SKILL.md) 定義。

- `rounds` 入庫供日後檢視，但不作為 PR
- 不儲存 `work_min × rounds` 等可推導數值
- `max_hr_bpm` 可以記錄並顯示，但不作為 PR

## Captain PR 榜

HIIT 的 `CARDIO_PR.HIIT` 固定顯示：

```text
🚀 TOP SPEED    🔥 WEEK STREAK    ⛽ MOST CALORIES
```

- `TOP SPEED`：所有 HIIT 日的最大 `work_speed_kmh`
- `WEEK STREAK`：連續有 HIIT 的週數。本週尚未做不算中斷，本週已做則計入
- `MOST CALORIES`：單日最高 `calories_kcal`
- streak 不顯示 `NEW!`

HIIT 不使用最快平均配速、最長距離或最長總時間作為 PR，因為暖身、休息與收操會讓這些數字無法代表間歇強度。也不使用最高心率作為 PR，因為心率是身體反應，不是訓練目標。

## LAST WORKOUT

- 第三個主數值顯示 `work_speed_kmh`，單位為 `KM / H`
- `▲▼` 與前一次 HIIT 的衝刺速度比較
- 判斷依據是結果資料是否有 `speed`，不要另寫動作名稱分支
- 其他欄位與互動沿用 [last-workout.md](last-workout.md)
