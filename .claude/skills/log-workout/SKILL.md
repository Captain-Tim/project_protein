---
name: log-workout
description: 將 Strong、Apple Watch、跑步機或健身車截圖，以及使用者的文字輸入，整理成 Captain 或 Monkey 的訓練紀錄。使用者要記錄、新增或補登重訓與有氧時使用。確認後才寫入資料、重建頁面並提交。
---

# 記錄一次訓練

將輸入轉成 `data/<人名>/<YYYY-MM-DD>-<6碼小寫十六進位亂數>.json`。

**先確認，再寫檔。** 確認前可以讀取既有資料與程式，但不得建立或修改檔案，也不得 commit。使用者回答互動問題不等於確認，仍須顯示完整紀錄並取得明確同意。

## 流程

1. 確認紀錄屬於 Captain 或 Monkey。沒有提供就詢問，不要猜
2. 解析日期、訓練類型、動作、組數及量測值
3. 查詢該人的既有紀錄，統一動作名稱、單位與訓練類型
4. 若出現查不到的動作名稱，先確認它是既有動作的不同寫法，還是真的要新增動作。在使用者明確確認前，不得修改任何檔案
5. 補問缺少的必填資訊，並指出與歷史紀錄明顯矛盾的數字
6. 檢查該人同一天的紀錄，疑似重複時先詢問，不要重複寫入
7. 用繁體中文列出完整結果，取得確認後才寫檔
8. 重建頁面、執行驗證並依專案根目錄 `CLAUDE.md` 的 Git 流程提交

## 擁有者與輸出

| 人 | 資料夾 | 重建頁面 |
|---|---|---|
| Captain | `data/Captain/` | `dashboard-captain.html` |
| Monkey | `data/Monkey/` | `dashboard-monkey.html`、`wallet-monkey.html` |

資料夾表示擁有者，JSON 不存人名欄位。兩人的資料 schema 相同，但 Captain 的新重訓動作需要頁面分類，Monkey 新增紀錄後需要檢查炸雞券。

## 共通資料格式

最外層格式：

```json
{
  "date": "2026-07-11",
  "type": "Chest/Back Day",
  "strength": [],
  "cardio": [],
  "note": null
}
```

- `date` 使用 `YYYY-MM-DD`
- `type` 只能是 `Leg/Shoulder Day`、`Chest/Back Day`、`Cardio`
- 最外層 `note`：使用者有主動說明就依原意記錄，否則填 `null`
- 動作層的 `note`：使用者有主動說明才加入，否則省略。不要主動追問，也不要自行撰寫訓練評語
- 截圖或敘述沒有日期時使用本機今天，並在確認訊息明確標示「日期使用今天」
- 不儲存能由來源欄位推導的值，例如配速與總訓練量

## 重訓

格式：

```json
{
  "date": "2026-07-11",
  "type": "Chest/Back Day",
  "strength": [
    {
      "exercise": "Bench Press",
      "unit": "lb",
      "sets": [
        { "weight": 35, "reps": 8 },
        { "weight": 35, "reps": 8 }
      ]
    }
  ],
  "cardio": [],
  "note": null
}
```

### 名稱、單位與類型

- 去掉 Strong 的器材後綴，例如 `Bench Press (Barbell)` 正規化為 `Bench Press`
- 已有動作以**該人最近一筆同名紀錄**為準，沿用 `exercise`、`unit` 與 `type`
- 不要只看截圖單位，也不要拿另一人的器材單位當成答案
- 名稱疑似相同但拼法不同時，不得自行判定。先列出輸入名稱與可能對應的既有名稱，詢問使用者要沿用既有動作，還是建立新動作
- 查不到同一人的既有同名動作時，立即停在確認階段。不得因為判定為新動作，就直接修改 dashboard、加入小卡、更新 `EXERCISE_PART`、spec 或測試
- 使用者明確確認要建立新動作後，才詢問 `type` 與 `unit`。Captain 還要詢問頁籤分類：`Leg`、`Shoulder`、`Chest` 或 `Back`
- 新動作的名稱、`type`、`unit` 與 Captain 頁籤分類全部確認完成後，才能將紀錄寫入。需要更新頁面分類時，僅修改 `dashboard-captain.html` 中 build 標記以外的 `EXERCISE_PART`
- 同一次同時包含重訓與有氧時，先詢問這筆紀錄要使用哪一個 `type`

## 有氧

格式：

```json
{
  "date": "2026-07-11",
  "type": "Cardio",
  "strength": [],
  "cardio": [
    {
      "exercise": "Running",
      "duration_min": 45,
      "distance_km": 7.2
    }
  ],
  "note": null
}
```

### 必填與選填欄位

- `exercise` 只能是 `Zone 2`、`HIIT`、`Running`、`Cycling`
- `Cycling` 統一表示臥式或立式健身車，不按器材另建名稱
- 每筆有氧都必須有正數 `duration_min` 與 `distance_km`。缺少時停下來問，不要猜、略過或先寫一半
- 配速只在確認訊息中由時間與距離算出，不寫入 JSON
- 選填量測欄位有值才加入，沒有就省略，不填 `null`
  - `avg_hr_bpm`：平均心率
  - `max_hr_bpm`：最高心率，不得拿平均心率代用
  - `calories_kcal`：卡路里
  - `incline_level`：跑步機坡度檔位，不是百分比
  - `resistance_level`：健身車阻力檔位，不得拿坡度代用
- `incline_level: 0` 與 `resistance_level: 0` 是有效實測值，不得因為是 0 而省略
- 跑步機平均心率顯示 0 代表未量到，應省略 `avg_hr_bpm`

### 量測來源優先序

Apple Watch 與器材同時提供資料時：

- `avg_hr_bpm`、`max_hr_bpm`、`calories_kcal` 採用 Apple Watch
- `calories_kcal` 只記 total calories，不記 active calories
- `incline_level` 與 `resistance_level` 採用跑步機或健身車
- Vision 跑步機第 4 格只有火焰指示燈亮時才是卡路里。`METS` 是強度指數，不得當成卡路里

### HIIT

HIIT 除了共通欄位，還必須包含：

- `work_speed_kmh`
- `work_min`
- `rest_speed_kmh`
- `rest_min`
- `rounds`，必須是正整數
- `calories_kcal`

截圖或文字沒提供間歇設定時，讀取**該人日期最近的一筆 HIIT**，將 `work_speed_kmh`、`work_min`、`rest_speed_kmh`、`rest_min`、`rounds` 與 `incline_level` 當成待確認的預設值。不要依檔案列出順序直接取最後一筆。

找不到歷史 HIIT 時，逐項詢問缺少的設定。`calories_kcal` 不沿用歷史值，必須取自本次輸入。坡度 0 仍須列在確認訊息中。

HIIT 欄位的設計與顯示規則以 `docs/specs/hiit-intervals.md` 為準。

## 確認訊息

重訓範例：

```text
2026-07-11 · Captain · Chest/Back Day

Bench Press（lb）
  35 × 8、35 × 8、35 × 8
Lat Pulldown（kg）
  20 × 10、20 × 10、22.5 × 8

以上正確嗎？確認後我會寫入並更新 dashboard。
```

HIIT 範例：

```text
2026-09-19 · Captain · Cardio

HIIT：49.9 分鐘 · 5.64 km
間歇：12 km/h × 1 分鐘／5 km/h × 2 分鐘，共 10 輪
坡度：0
最高心率：180 bpm
總卡路里：346 kcal

以上正確嗎？確認後我會寫入並更新 dashboard。
```

由歷史紀錄帶入的 HIIT 預設值、日期使用今天，以及任何不確定或異常之處，都必須在確認訊息中明確指出。

## 確認後

1. 產生 6 碼小寫十六進位亂數檔名，避免覆蓋既有檔案
2. 寫入 JSON
3. 執行該人的 `node scripts/build_dashboard.js <人名>`。不要手動修改 build 標記區塊
4. commit 前先確認 build 成功。commit 後依 `.github/workflows/pages.yml` 的 `validate` job 在本機重跑完整驗證
5. build 或測試失敗時修正資料或實作，不得繞過檢查
6. Git 分支、commit、push、PR 與 merge 一律遵守專案根目錄 `CLAUDE.md`，不要在這份 skill 維護另一套流程

### Monkey 的炸雞券

寫入前先記下 `node scripts/list_coupons.js Monkey` 列出的可用券 ID。寫入並 build 後再執行一次。若新增的可用券 `earned_on` 正好是本次紀錄日期，回覆時說明這次取得一張炸雞券及目前可用張數。沒有新增就不用提。

使用炸雞券時改用 `.claude/skills/use-coupon/SKILL.md`。
