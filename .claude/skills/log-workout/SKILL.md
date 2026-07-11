---
name: log-workout
description: 把訓練照片(Strong app 截圖、健身器材螢幕)解析成訓練紀錄,經使用者確認後寫入 data/sessions/、重建 dashboard 並 commit。當使用者上傳訓練照片、或表示要記錄/新增一次訓練時使用。
---

# 記錄一次訓練

把使用者上傳的訓練照片轉成 `data/sessions/<date>-<亂數6碼>.json`,重建 dashboard,commit 並 push。

**先確認,再寫檔。** 使用者確認之前不要建立任何檔案、不要 commit。這是唯一的人工關卡,不要跳過。

## 流程

1. 讀照片,依 §解析規則 抽出資料。
2. 用繁體中文列出解析結果給使用者確認(格式見下)。有疑慮的地方主動指出。
3. 使用者確認或訂正後,才寫檔 → 重建 → commit → push。

### 確認訊息的格式

```
2026-07-11 · Chest/Back Day

Bench Press (lb)
  35 × 8, 35 × 8, 35 × 8, 35 × 8, 35 × 8
Lat Pulldown (kg)
  20 × 10, 20 × 10, 22.5 × 8

以上正確嗎?確認後我就寫入並更新 dashboard。
```

有氧:

```
2026-07-11 · Cardio

Zone 2 — 60 分鐘

以上正確嗎?
```

## 解析規則

照片通常是 **Strong app 的訓練摘要截圖**(純文字表格:動作名、每組 `重量 × 次數`、單位、日期),
偶爾是**器材螢幕**(有氧的時間)。

- **動作名稱**:去掉 Strong 的器材後綴 —— `Bench Press (Barbell)` → `Bench Press`。
  **一律優先沿用下表既有名稱**,不要自創同義寫法(`Lateral Raises`、`Lat Pull-down` 都是錯的)。
  名稱不一致會讓同一個動作在 dashboard 上裂成兩條線,長期趨勢就毀了。
- **單位跟著「動作」走,不是跟著這次訓練走**(取決於那台器材的刻度)。照下表填,不要看截圖上顯示什麼。
  同一次訓練裡不同動作單位不同是正常的。
- **`type` 由動作反推**,見下表。
- **`quality`、`note`(含動作層的 `note`)一律填 `null`**。不要問使用者,不要自己編。
- **日期**取自截圖;截圖上沒有日期就用今天,並在確認訊息裡講明「日期用今天」。
- **有氧的 `duration_min`** 取自截圖或器材螢幕的時間。器材螢幕上的距離、卡路里、心率**不記錄**
  (schema 沒有對應欄位)。

## 動作對照表

| 動作 | type | 單位 |
|---|---|---|
| Bench Press | Chest/Back Day | lb |
| Lat Pulldown | Chest/Back Day | kg |
| Seated Row | Chest/Back Day | kg |
| Triceps Pushdown | Chest/Back Day | kg |
| Sumo Squat | Leg/Shoulder Day | kg |
| Hack Squat | Leg/Shoulder Day | lb |
| Split Squat | Leg/Shoulder Day | lb |
| Lateral Raise | Leg/Shoulder Day | kg |
| Face Pull | Leg/Shoulder Day | kg |
| Zone 2 | Cardio | (無) |
| HIIT | Cardio | (無) |
| Running | Cardio | (無) |

## 邊界情況

- **表上沒有的新動作** → 停下來問使用者:這個動作算 `Chest/Back Day` 還是 `Leg/Shoulder Day`?單位是 kg 還是 lb?
  拿到答案後**把它加進上面的對照表**,連同資料一起 commit。同一個動作只會問這一次。
- **同一次同時有重訓和有氧**(至今未發生過)→ 問使用者要記成哪一個 type。
- **數字與既有紀錄明顯矛盾**(例如同一動作重量突然變成三倍)→ 在確認訊息裡直接指出,不要默默寫進去。

## 寫檔

`data/sessions/<YYYY-MM-DD>-<6碼小寫十六進位亂數>.json`,例如 `data/sessions/2026-07-11-a3f9c2.json`。

```json
{
  "date": "2026-07-11",
  "type": "Chest/Back Day",
  "quality": null,
  "strength": [
    {
      "exercise": "Bench Press",
      "unit": "lb",
      "sets": [{ "weight": 35, "reps": 8 }, { "weight": 35, "reps": 8 }]
    }
  ],
  "cardio": [],
  "note": null
}
```

有氧那筆的 `cardio` 長這樣,`strength` 留空陣列:

```json
"cardio": [{ "exercise": "Zone 2", "duration_min": 60 }]
```

`type` 只有三個值:`Leg/Shoulder Day`、`Chest/Back Day`、`Cardio`。

## 收尾

```bash
node scripts/build_dashboard.js   # 重建 dashboard.html 的 WORKOUT_DATA 區塊
```

**不要手動編輯 `dashboard.html`**,一定要跑這支腳本。

然後 commit 新的 JSON 和 `dashboard.html`(如果有改到 SKILL.md 的對照表,一起 commit),push。

- push 到 `master` 成功 → 告訴使用者 GitHub Actions 正在部署,約 30-60 秒後
  https://captain-tim.github.io/project_protein/ 就是最新的。
- 環境限制只能推到自己的分支 → 開 PR,並明確告訴使用者「**PR 已開,請點 merge**」,merge 之後才會部署。
