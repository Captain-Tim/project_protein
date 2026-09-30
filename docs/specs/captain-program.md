# Captain 課表

Captain 頁顯示「今天表定要做什麼」。課表是兩週一循環（A／B）綁星期幾的固定表，
資料落地在 `data/Captain/program/current.json`，由 build 注入頁面。

**這張卡是 `(課表, 今天日期)` 的單純函數。** 它不讀訓練紀錄、不比對、不判定完成，
所以永遠不會跟紀錄互相矛盾。「本週進度」由既有的 WEEKLY QUEST 回答，兩者職責不重疊。

## 資料層

### 位置

`data/Captain/program/current.json`

**必須放 `program/` 子資料夾。** `build_dashboard.js` 掃 `data/Captain/*.json` 時不遞迴，
放在根目錄會被當成一筆訓練紀錄。理由跟 `rewards/`、`sleep/` 完全一樣。

### 結構

```json
{
  "anchor": { "week_start": "2026-08-10", "cycle": "A" },
  "cycles": {
    "A": {
      "mon": { "part": "Leg/Shoulder", "variant": "HEAVY",
               "exercises": ["Hack Squat", "Split Squat", "Leg Curl"],
               "note": "這是兩週內唯一以哈克深蹲為主的訓練日。深度控制在骨盆明顯捲起之前，不必強求蹲到底。" },
      "tue": { "part": "Cardio", "exercises": ["Zone 2"] },
      "wed": { "part": "Chest/Back", "variant": "HEAVY" },
      "thu": { "part": "Leg/Shoulder", "variant": "LIGHT",
               "exercises": ["Sumo Squat", "Leg Curl"],
               "note": "這堂以補充刺激為主，重量、組數及力竭程度都應低於主要訓練日，避免影響星期六 HIIT。" },
      "fri": { "part": "Cardio", "exercises": ["Zone 2"] },
      "sat": { "part": "Cardio", "exercises": ["HIIT"] },
      "sun": null
    },
    "B": {
      "mon": { "part": "Chest/Back", "variant": "HEAVY" },
      "tue": { "part": "Cardio", "exercises": ["Zone 2"] },
      "wed": { "part": "Leg/Shoulder", "variant": "HEAVY",
               "exercises": ["Sumo Squat", "Split Squat", "Leg Curl"] },
      "thu": { "part": "Cardio", "exercises": ["Zone 2"] },
      "fri": { "part": "Chest/Back", "variant": "LIGHT" },
      "sat": { "part": "Cardio", "exercises": ["Zone 2"] },
      "sun": null
    }
  }
}
```

### 欄位

| 欄位 | 必填 | 說明 |
|---|---|---|
| `anchor.week_start` | 是 | 錨點週的週一，`YYYY-MM-DD` |
| `anchor.cycle` | 是 | 錨點那一週是 `A` 還是 `B` |
| `cycles.A`、`cycles.B` | 是 | 各自要有 `mon`…`sun` 七個 key |
| `<day>` | 是 | 一天的內容，`null` 代表完全休息 |
| `<day>.part` | 是 | `Leg/Shoulder`、`Chest/Back`、`Cardio` 三者之一 |
| `<day>.variant` | 否 | `HEAVY` 或 `LIGHT` |
| `<day>.exercises` | 否 | 動作名稱陣列，只列名稱 |
| `<day>.note` | 否 | 該日的訓練要點 |

### 刻意的決定

- **用 `mon`…`sun` 而不是陣列 index。** 陣列看不出起算日是週一還是週日，改的時候容易數錯格
- **`sun: null` 明確寫出來，不是省略。** 「完全休息」和「還沒填」在頁面上要長得不一樣，
  跟睡眠紀錄「沒吃藥要寫 `taken: false`」同一個道理
- **動作名稱存英文。** 對得上頁面既有的 `EXERCISE_PART` 與 log-workout 對照表的命名
- **`exercises` 一律選填。** 胸背與肩沒有規劃動作，課表就不列。腿日之所以列，是因為要跟
  週六 HIIT 錯開強度，那是真的需要寫下來的決定
- **`variant` 存而不推導。** 它剛好等於「該週該部位的第一次」，但那是巧合不是定義。
  哪天想讓第二次當主要訓練日，推導版會擅自改掉這個意圖。
  這跟「配速 = 時間 ÷ 距離」不同，後者是數學恆等式，存了必然矛盾
- **不存顏色。** 顏色是呈現不是計畫。整張卡一套色（見「配色」），沒有部位到顏色的對照表

## A／B 循環的算法

```
cycleFor(date):
  n = (weekStart(date) - anchor.week_start) / 7 天
  同位 = ((n % 2) + 2) % 2 === 0
  回傳 同位 ? anchor.cycle : 另一個
```

- `weekStart` 沿用頁面既有的實作（週一起算，`(getDay() + 6) % 7`）
- `((n % 2) + 2) % 2` 是為了讓早於錨點的日期也算得對，`n` 會是負數
- 星期幾 → `mon`…`sun` 的 key

**A／B 照日曆交替，不跟著實際訓練走。** 某週整週沒練，下一週還是照序輪到 B，
不會停在原地等補完。這是「不比對紀錄」的必然結果，也是刻意的：課表是表定，不是進度。

## 驗證

`build_dashboard.js` 只擋「整張卡會壞掉」的結構問題。

### 擋（exit 1）

- `anchor.week_start` 不是 `YYYY-MM-DD`，或那天不是週一
- `anchor.cycle` 不是 `A` 或 `B`
- `cycles` 缺，或 `cycles.A`、`cycles.B` 缺任何一個
- 任一 cycle 的 `mon`…`sun` 缺 key（值可以是 `null`，但 key 要在）
- `part` 不是三個已知部位之一
- `variant` 存在但不是 `HEAVY` 或 `LIGHT`
- `data/Captain/program/` 有檔，但頁面沒有 `PROGRAM_DATA` 標記區塊
  （資料會被無聲忽略，跟 `rewards/`、`sleep/` 同一條規則）

### 不擋

- **動作名稱。** 課表的動作名稱是自由顯示文字，不比對 `EXERCISE_PART`。
  `Leg Curl` 還沒進對照表，驗證會直接擋死 build，而把它加進對照表等於開了記錄的門，
  那是另一件事。代價是打錯字不會被發現，但那只會讓卡片少一行，一眼看得出來
- 缺 `exercises`、`note`、`variant`

## 版面

課表併入現有的 WEEKLY QUEST 卡（`#quest`），不另開一張卡。桌機上課表內容不足以撐滿全寬，
單獨一張卡會留一大塊白。

### 結構

- **卡片 title：`DAILY TASK & WEEKLY QUEST`**，`<b>` 13px，跟頁面其他卡同一個層級。
  一張卡裝兩件事，title 一次講完，不在兩欄各標一次
- 頂部右邊 `<N> DAYS LEFT`，`.lbl`
- 今天的日期 `<M/D DDD>` 放左欄課表的最上方而不是卡片標頭，離它描述的內容最近
- 主體兩欄：左欄課表，右欄 QUEST 的三個圓環，中間 `border-left` 分隔
- 底部 QUEST 進度條橫跨整張卡
- 手機（`max-width: 640px`）兩欄改直排，分隔線從 `border-left` 換成 `border-top`
- 沒有課表檔時 title 退成 `WEEKLY QUEST`，並在旁邊補回本週日期範圍（見「沒有課表檔的時候」）

### 課表區的規格

| 元素 | 規格 |
|---|---|
| 部位名 | Consolas 800、20px、`letter-spacing: .4px`、原樣大小寫（`Leg / Shoulder`） |
| 膠囊 | 線框、700、11px。強度與動作同一套樣式，沒有差別 |
| 膠囊列 | `flex-wrap: wrap`，`min-height` 保留一列高度 |
| 卡片邊框 | 維持 `--border` 灰色 |
| 光暈 | 無 |

### 配色

**整張卡走本頁的藍 `--hm3`（`#5cd0ff`，跟熱力圖同一支），不用全站金色 `--accent`。**

`renderQuest()` 把 `--tab-c` / `--tab-glow` / `--xp-dim` 設在卡片上，課表的部位名與膠囊、
Quest 的圓環與進度條就全部跟著同一個值走。這是頁面既有的做法，`activity` 卡本來就是
`$("activity").style.setProperty("--tab-c", "var(--hm3)")`。

| 元素 | 來源 |
|---|---|
| 部位名、膠囊邊框與文字、圓環 ✓ | `--tab-c` = `--hm3` |
| 圓環完成光暈、進度條光暈 | `--tab-glow` = `rgba(92, 208, 255, .34)` |
| 進度條漸層起點 | `--xp-dim` = `--hm1`（`#1f5a78`） |

`.ring` 與 `.xp` 只有這張卡在用，所以改它們的顏色來源不會波及其他卡。

**不跟著部位換色。** 部位色（`--c-leg` 等）是 TRAINING LOG 那一段的語言，跨到這張卡上會讓
同一張卡出現兩套配色系統。
- **強度膠囊沒有底色，跟動作膠囊完全一樣**，只有一個 CSS class。區分只靠排序：
  強度永遠排在膠囊列第一個。`HEAVY`／`LIGHT` 本身是短的全大寫詞，跟動作名稱在視覺上
  已經足夠不同，不需要再加底色
- **卡片不上彩色邊框、不加光暈**：光暈在這頁的既有語意是「破紀錄／最新」
  （`.pr.new`、`.bars i.on.cur`）。課表天天都在，天天發光會把那個訊號稀釋掉
- **膠囊列的 `min-height`**：休息日沒有膠囊，整列消失會讓左欄塌陷

### 休息日

`null` 的那天顯示 `Rest Day`，用 `--muted` 而不是 `--tab-c`，沒有膠囊。

### 沒有課表檔的時候

`data/Captain/program/` 不存在或沒有 `current.json` 時，頁面不顯示課表區，卡片回到單欄、
只有三個圓環與進度條。title 退成 `WEEKLY QUEST`，旁邊補回本週日期範圍（`8/10 → 8/16`）——
沒有課表時卡片只剩一件事，title 就只講那件事。配色仍然是藍的，那是卡片的顏色，
跟有沒有課表無關。

這張卡是加上去的一塊，不是 QUEST 的前提。

## 手機驗證

目標機型的 CSS viewport 寬度與量測方式見 `docs/verification.md`。那裡是唯一出處，
這份 spec 不重複數字。

## 刻意不做

- **不比對訓練紀錄、不顯示完成狀態。** 「今天做了沒」由 WEEKLY QUEST 與熱力圖回答
- **不顯示 A／B 標記。** 看內容就認得出來（`Hack Squat` 只出現在 A 週一）
- **不顯示組數、次數、重量。** 課表只列動作名稱
- **不動 TRAINING LOG 的 tab 列。** 實測目標機型寬度下兩排 tab 都是一行，目前沒有換行問題。
  等某個部位累積到第四個動作才會需要橫向滑動，屆時再處理
- **不動 WEEKLY QUEST 的三部位定義與 week streak**
- **併入後捨棄 QUEST 標頭的本週日期範圍**（原本是 `WEEKLY QUEST · 2026-08-10 → 2026-08-16`），
  只留 `<N> DAYS LEFT`。左邊要讓給今天的日期，而週的起訖日對「本週還剩幾天湊滿三種」
  沒有決策價值，`DAYS LEFT` 已經完整回答了
- **不支援 Monkey。** `build_dashboard.js` 兩人共用一支，沒有 `PROGRAM_DATA` 標記區塊就整段跳過，
  跟 `REWARDS`、`SLEEP` 同一個模式
- **`Leg Curl` 不進 `EXERCISE_PART` 與 log-workout 對照表。** 它還沒被練過，單位（kg／lb）
  要看器材才知道。記錄它是之後的事

## 相關檔案

| 路徑 | 角色 |
|---|---|
| `data/Captain/program/current.json` | 課表本體 |
| `dashboard-captain.html` | `PROGRAM_DATA` 標記區塊、課表區塊的樣式與渲染 |
| `scripts/build_dashboard.js` | 讀課表、驗證、注入標記區塊 |
| `docs/verification.md` | 手機寬度與 iframe 量測方式 |
