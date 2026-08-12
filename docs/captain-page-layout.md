# Captain 頁版面

`dashboard-captain.html` 由上而下有哪些卡片、每一塊的規則寫在哪份 spec。

**這是版面順序的唯一出處。** 各 spec 只寫自己那一塊的內容與規則，不重述整頁順序。新增或移除區塊時改這裡，不用回頭巡每一份 spec。

`dashboard-monkey.html` 不在此文件範圍，見 `monkey-page-layout.md`。兩頁刻意獨立、互不影響。

## 這一頁的軸：選中的動作

Captain 頁整體以**選中的動作**為脈絡。動作 tab 選什麼，PR 榜、趨勢圖、LAST WORKOUT 就全部跟著換。
這是它跟 Monkey 頁最根本的差異（Monkey 是「一天算一次訓練」的軸），刻意不為了對稱而統一，
見 `last-workout.md`。

## 桌機

頁面是一疊卡片，每張卡都有一個 13px 的 title。

| 卡片 | 元素 | 規則出自 |
|---|---|---|
| 頁首：頭像、累積數字、🔥 week streak | `header.hero` | 無專門 spec |
| DAILY TASK & WEEKLY QUEST | `#quest` | `captain-program.md` |
| TRAINING LOG | `#trainingLog` | 見下方「TRAINING LOG 卡的內部」 |
| ACTIVITY 熱力圖 | `#activity` | 無專門 spec |

排列原則：**每天要看的在上，回顧型的在下**。

頁首沒有連到 Monkey 頁的按鈕，兩頁之間沒有互連，各自用網址進入。

### TRAINING LOG 卡的內部

三個子區塊，由上而下。子區塊用 11px 白字小標（`.tlSub`），彼此以細線分段（`.tlSect`），
**不做成卡中卡**：兩種深度的盒子並排很吵。

| 子區塊 | 元素 | 規則出自 |
|---|---|---|
| 兩層動作 tab（部位 → 動作） | `#tabs1` `#tabs2` | 無專門 spec |
| 🏆 PERSONAL RECORDS，三格 | `#prHeading` `#prBoard` | 無專門 spec |
| 趨勢圖與 LAST WORKOUT 並排 | `#trendRow` 內的 `#weeklyDist`／`#weightTrendCard`、`#lastWorkout` | `last-workout.md` |

第三塊的左欄隨 tab 換內容：cardio 是 `WEEKLY DISTANCE` 柱狀圖（`#weeklyDist`），
strength 是 `<動作> TREND` 折線圖（`#weightTrendCard`）。兩者都是 `flex: 2.3`，
`#lastWorkout` 是 `flex: 0.9`，切 tab 時右欄不會跳寬度。

PR 三格是唯一保留自己邊框的內層：NEW 的流動光弧畫在邊框上，沒有邊框就沒有那個效果。

部位色（`--tab-c`／`--tab-glow`）設在 `#trainingLog` 一次，整張卡的子區塊跟著走。
tab 按鈕各自帶 inline 的 `--tab-c`，不受卡片層級影響。

## 手機（≤ 640px）

- 所有桌機的左右並排一律改上下堆疊
- `#quest` 的課表與 Quest 圓環由左右改上下，分隔線從 `border-left` 換成 `border-top`
- `#lastWorkout` 以 `order: -1` 排到趨勢圖之前
- 因為 DOM 順序沒變，`.tlRow` 的分隔線要從 `.lwCell` 換掛到 `.chartCell`，
  否則那條線會出現在整個區塊的最上面
- PR 三格維持橫排（`#prBoard` 的 `flex-direction: row !important`），不堆疊
- 其餘順序與桌機相同

各卡片在手機上的內部調整（圓環縮小、PR 三格縮字級、熱力圖橫向捲動等）寫在各自的 spec 或就近的註解，
不列在這裡。

## 彈窗

不佔版面位置，由點擊觸發，覆蓋整頁：

| 彈窗 | 觸發 | 規則出自 |
|---|---|---|
| 當日訓練詳情 | 點 ACTIVITY 熱力圖有紀錄的格子，或點 LAST WORKOUT | `last-workout.md` |
| 頭像原圖 | 點頁首頭像 | 無專門 spec |
