# 兩頁版面

**這是版面順序的唯一出處。** 各 spec 只寫自己那一塊的規則，不重述整頁順序。新增或移除區塊時改這裡。

## 共通

兩頁都是一疊卡片，每張卡有一個 13px `<b>` title。排列原則：**每天要看的在上，回顧型的在下**。

`TRAINING LOG` 卡裡的子區塊用 11px 白字小標（`.tlSub`）＋細線分段（`.tlSect`），
**不做成卡中卡**：兩種深度的盒子並排很吵。唯一保留自己邊框的內層是 PR 三格——
NEW 的流動光弧畫在邊框上，沒有邊框就沒有那個效果。

手機（≤ 640px）：桌機的左右並排一律改上下堆疊，`#lastWorkout` 以 `order: -1` 排到趨勢圖之前
（最近一次比長期趨勢即時）。因為 DOM 順序沒變，`.tlRow` 的分隔線要從圖表格的 `border-right`
換成 `border-top`，否則那條線會落在整個區塊的最上面。

各區塊在手機上的內部調整（環縮小、PR 三格縮字級、熱力圖橫向捲動等）寫在各自的 spec 或就近的註解。

## Captain

`dashboard-captain.html` 整體以**選中的動作**為脈絡：動作 tab 選什麼，PR 榜、趨勢圖、
LAST WORKOUT 就全部跟著換。這是它跟 Monkey 最根本的差異（Monkey 是「一天算一次訓練」的軸），
刻意不為了對稱而統一，見 `last-workout.md`。

| 卡片 | 元素 | 規則出自 |
|---|---|---|
| 頁首：頭像、累積數字、🔥 week streak | `header.hero` | — |
| DAILY TASK & WEEKLY QUEST | `#quest` | `captain-program.md` |
| TRAINING LOG | `#trainingLog` | 下表 |
| ACTIVITY 熱力圖 | `#activity` | — |

`TRAINING LOG` 由上而下：

| 子區塊 | 元素 | 規則出自 |
|---|---|---|
| 兩層動作 tab（部位 → 動作） | `#tabs1` `#tabs2` | — |
| 🏆 PERSONAL RECORDS，三格 | `#prHeading` `#prBoard` | — |
| 趨勢圖與 LAST WORKOUT 並排 | `#trendRow` | `last-workout.md`、`strength-weight-trend.md` |

第三塊的左欄隨 tab 換：cardio 是 `WEEKLY DISTANCE` 柱狀圖（`#weeklyDist`），strength 是
`<動作> TREND` 折線圖（`#weightTrendCard`）。兩者都是 `flex: 2.3`、`#lastWorkout` 是 `flex: 0.9`，
切 tab 時右欄不會跳寬度。折線圖裡面的規則（取樣幾次、y 軸格線畫在哪）在 `strength-weight-trend.md`。

部位色（`--tab-c` / `--tab-glow`）設在 `#trainingLog` 一次，子區塊跟著走；tab 按鈕各自帶 inline 值。

頁首沒有連到 Monkey 的按鈕，兩頁之間沒有互連。

## Monkey

手機是主場，桌機是附帶。

| 卡片 | 元素 | 規則出自 |
|---|---|---|
| 頁首：頭像、累積數字、🔥 week streak | `header.hero` | `monkey-cardio-dashboard.md`「頁首 Header」 |
| WEEKLY QUEST，底部含炸雞券入口 | `#quest` | `monkey-cardio-dashboard.md`、`monkey-fried-chicken-award.md` |
| TRAINING LOG | `#trainingLog` | 下表 |
| ACTIVITY 熱力圖 | `#activity` | `monkey-cardio-dashboard.md` |
| SLEEP 集章卡 | `#sleep` | `monkey-sleep-log.md` |

`#sleep` 在沒有任何已過去的睡眠紀錄時整塊不出現。

`TRAINING LOG` 由上而下（沒有動作 tab，那是 Captain 特有的軸）：

| 子區塊 | 元素 | 規則出自 |
|---|---|---|
| 🏆 PERSONAL RECORDS，三格 | `#prBoard` | `monkey-cardio-dashboard.md` |
| WEEKLY DISTANCE 與 LAST WORKOUT 並排 | `#weeklyDist` `#lastWorkout` | `monkey-cardio-dashboard.md`、`last-workout.md` |

## 彈窗

不佔版面位置，由點擊觸發，覆蓋整頁。

| 彈窗 | 觸發 | 頁 | 規則出自 |
|---|---|---|---|
| 當日訓練詳情 | 點 ACTIVITY 有紀錄的格子，或點 LAST WORKOUT | 兩頁 | `last-workout.md`、`monkey-cardio-dashboard.md` |
| 當晚睡眠詳情 | 點 SLEEP 集章卡的格子 | Monkey | `monkey-sleep-log.md` |
| 頭像原圖 | 點頁首頭像 | 兩頁 | — |
