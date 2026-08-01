---
name: log-workout
description: 把訓練照片(Strong app 截圖)或使用者文字輸入(跑步機/有氧的時間與距離)解析成訓練紀錄,經使用者確認後寫入 data/<人名>/、重建 dashboard 並 commit。當使用者上傳訓練照片、輸入有氧數據、或表示要記錄/新增一次訓練時使用。
---

# 記錄一次訓練

把使用者上傳的訓練照片轉成 `data/<人名>/<date>-<亂數6碼>.json`,重建 dashboard,commit 並 push。

**先確認,再寫檔。** 使用者確認之前不要建立任何檔案、不要 commit。這是唯一的人工關卡,不要跳過。

## 這是誰的紀錄?

兩個人的資料完全分開,**資料夾就是唯一真相**(JSON 裡沒有人名欄位,不要自己加):

| 人 | 資料夾 | 頁面 |
|---|---|---|
| **Captain** | `data/Captain/` | `dashboard-captain.html` |
| **Monkey** | `data/Monkey/` | `dashboard-monkey.html` |

**規則對兩個人完全一樣**,差別只有寫進哪個資料夾、重建哪一頁。
使用者沒講是誰的紀錄 → **停下來問**,不要猜。

## 流程

1. 先確定是誰的紀錄。
2. 讀照片或使用者輸入的文字,依 §解析規則 抽出資料。
3. 用繁體中文列出解析結果給使用者確認(格式見下)。有疑慮的地方主動指出。
4. 使用者確認或訂正後,才寫檔 → 重建 → commit → push。

### 確認訊息的格式

```
2026-07-11 · Captain · Chest/Back Day

Bench Press (lb)
  35 × 8, 35 × 8, 35 × 8, 35 × 8, 35 × 8
Lat Pulldown (kg)
  20 × 10, 20 × 10, 22.5 × 8

以上正確嗎?確認後我就寫入並更新 dashboard。
```

有氧:

```
2026-07-11 · Monkey · Cardio

Running — 45 分鐘 · 7.2 km(配速 6:15/km)

以上正確嗎?確認後我就寫入並更新 dashboard。
```

## 解析規則

照片通常是 **Strong app 的訓練摘要截圖**(純文字表格:動作名、每組 `重量 × 次數`、單位、日期),
或**跑步機/使用者文字輸入**(有氧的時間與距離)。

### 重訓

- **動作名稱**:去掉 Strong 的器材後綴 —— `Bench Press (Barbell)` → `Bench Press`。
  **一律優先沿用下表既有名稱**,不要自創同義寫法(`Lateral Raises`、`Lat Pull-down` 都是錯的)。
  名稱不一致會讓同一個動作在 dashboard 上裂成兩條線,長期趨勢就毀了。
- **單位跟著「動作」走,不是跟著這次訓練走**(取決於那台器材的刻度)。照下表填,不要看截圖上顯示什麼。
  同一次訓練裡不同動作單位不同是正常的。
- **`type` 由動作反推**,見下表。

### 有氧

**`duration_min` 和 `distance_km` 缺一不可。** 配速、距離、熱力圖濃淡全都算自這兩個數字。
**讀不到就停下來問使用者**,拿到數字才能寫。不要猜、不要略過、不要「先記時間之後再補距離」。
`scripts/build_dashboard.js` 會擋下不完整的資料並讓部署失敗。

- `exercise`:`Zone 2` / `HIIT` / `Running` 三選一。
- **配速不記錄**——它是 `duration_min ÷ distance_km` 算出來的,存了只會有跟來源數字互相矛盾的一天。
- 以下三個是**選填欄位**,共通規則:照片/敘述有給就記,沒有就**整個欄位省略**(不要填 `null`)。
  它們都是量到的來源值、不是推導值,所以可以存;`build_dashboard.js` 不檢查也不擋這些欄位。
  三個都會顯示在熱力圖點開的日卡片上。
  - `avg_hr_bpm` — 平均心率,單位 bpm。跑步機螢幕顯示 `0` 代表沒握感應器、沒量到,**這種情況要省略欄位**。
  - `incline_level` — 跑步機坡度**檔位**(不是百分比,所以欄位名不要用 `_pct`、卡片上也不要標 `%`)。
    檔位 0 是有意義的實測值,可以填 `0`。
  - `calories_kcal` — 卡路里,單位 kcal。注意 Vision 跑步機第 4 格上排是火焰(卡路里)、下排標 `METS`,
    **只有火焰那個指示燈亮時才是卡路里**;METS 是強度指數(個位數等級),看到三位數就是卡路里。

### 共通

- **`note`(含動作層的 `note`)看使用者有沒有主動提供文字說明**:使用者有講(照片旁的敘述、額外補充)就照原意記錄,
  沒講就填 `null`。**不要主動問,也不要自己編**。
- **日期**取自截圖;截圖上沒有日期就用今天,並在確認訊息裡講明「日期用今天」。

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

- **沒講是誰的紀錄** → 停下來問,不要猜。
- **有氧照片缺距離或時間** → 停下來問,不要寫檔(見上)。
- **表上沒有的新動作** → 停下來問使用者:這個動作算 `Chest/Back Day` 還是 `Leg/Shoulder Day`?
  單位是 kg 還是 lb?拿到答案後**把它加進上面的對照表**,連同資料一起 commit。同一個動作只會問這一次。
- **同一次同時有重訓和有氧**(至今未發生過)→ 問使用者要記成哪一個 type。
- **數字與既有紀錄明顯矛盾**(例如同一動作重量突然變成三倍)→ 在確認訊息裡直接指出,不要默默寫進去。

## 寫檔

`data/<人名>/<YYYY-MM-DD>-<6碼小寫十六進位亂數>.json`,例如 `data/Monkey/2026-07-11-a3f9c2.json`。

重訓:

```json
{
  "date": "2026-07-11",
  "type": "Chest/Back Day",
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

有氧(`strength` 留空陣列;`distance_km` 必填):

```json
{
  "date": "2026-07-11",
  "type": "Cardio",
  "strength": [],
  "cardio": [{ "exercise": "Running", "duration_min": 45, "distance_km": 7.2 }],
  "note": null
}
```

`type` 只有三個值:`Leg/Shoulder Day`、`Chest/Back Day`、`Cardio`。

## 收尾

```bash
node scripts/build_dashboard.js Captain   # -> dashboard-captain.html
node scripts/build_dashboard.js Monkey    # -> dashboard-monkey.html + wallet-monkey.html
```

只改了一個人的資料就只跑那一個人的。
**不要手動編輯 `dashboard-captain.html` / `dashboard-monkey.html`** 的標記區塊,一定要跑腳本。
腳本會擋下不完整的資料並 exit 1——**build 失敗代表資料有問題,去修資料,不要繞過檢查**。

### Monkey:這次有沒有拿到炸雞券

達成 weekly quest(3 次 + 150 分鐘)會核發一張炸雞券。**達標當下即發**,所以剛記完的這一筆
就可能是讓它成立的那一次——那是這套系統最有感的一刻,不要讓它靜悄悄地過去。

build 完跑一次:

```bash
node scripts/list_coupons.js Monkey
```

`available` 裡若有一張券的 `earned_on` **正好是這次記錄的日期**,就是這次賺到的,在回覆裡講明:

```
🍗 本週 quest 達標,拿到一張炸雞券,目前有 3 張可用。
```

沒有就不用提。券的使用另見 `.claude/skills/use-coupon/`。

然後 commit 新的 JSON 和對應的 HTML(如果有改到 SKILL.md 的對照表,一起 commit),push。

- push 到 `master` 成功 → 告訴使用者 GitHub Actions 正在部署,約 30-60 秒後
  https://captain-tim.github.io/project_protein/ 就是最新的。
- 環境限制只能推到自己的分支 → **開 PR(base `master`)→ 直接 merge**:
  1. `mcp__github__create_pull_request`(owner `Captain-Tim`、repo `project_protein`、
     head 自己的分支、base `master`)開 PR。
  2. 開好後用 `mcp__github__merge_pull_request`(`merge_method: squash`)直接 merge——
     這個環境有 merge 權限,不用叫使用者自己點。
  3. merge 成功後告訴使用者 GitHub Actions 正在部署,約 30-60 秒後
     https://captain-tim.github.io/project_protein/ 就是最新的。
  merge 若被擋(權限、衝突、CI)才回頭請使用者手動處理,並說明卡在哪。
