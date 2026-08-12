# Monkey 頁版面

`dashboard-monkey.html` 由上而下有哪些區塊、每一塊的規則寫在哪份 spec。

**這是版面順序的唯一出處。** 各 spec 只寫自己那一塊的內容與規則，不重述整頁順序。新增或移除區塊時改這裡，不用回頭巡每一份 spec。

`dashboard-captain.html` 不在此文件範圍，兩頁刻意獨立、互不影響。

## 桌機

| 區塊 | 元素 | 規則出自 |
|---|---|---|
| 頁首：頭像、累積數字、🔥 week streak | `header.hero` | `monkey-cardio-dashboard.md`「頁首 Header」 |
| WEEKLY QUEST，底部含炸雞券入口 | `#quest` | `monkey-cardio-dashboard.md`「WEEKLY QUEST（本週任務）」、`monkey-fried-chicken-award.md` |
| 🏆 PERSONAL RECORDS，三格 | `#prBoard` | `monkey-cardio-dashboard.md`「🏆 PERSONAL RECORDS（PR 榜，三格）」 |
| WEEKLY DISTANCE 與 LAST WORKOUT 並排 | `#weeklyDist` `#lastWorkout` | `monkey-cardio-dashboard.md`「WEEKLY DISTANCE（柱狀圖）」、`last-workout.md` |
| ACTIVITY 熱力圖 | `#activity` | `monkey-cardio-dashboard.md`「ACTIVITY（GitHub 式熱力圖）」 |
| SLEEP 集章卡 | `#sleep` | `monkey-sleep-log.md` |

排列原則：**每天要看的在上，回顧型的在下**。

`#sleep` 在沒有任何已過去的睡眠紀錄時整塊不出現。

## 手機（≤ 640px，主要使用情境）

Monkey 主要在手機看，手機是主場，桌機是附帶。

- 所有桌機的左右並排一律改上下堆疊
- `#lastWorkout` 以 `order: -1` 排到 `#weeklyDist` 之前
- 其餘順序與桌機相同

各區塊在手機上的內部調整（環縮小、PR 三格縮字級、熱力圖橫向捲動等）寫在各自的 spec，不列在這裡。

## 彈窗

不佔版面位置，由點擊觸發，覆蓋整頁：

| 彈窗 | 觸發 | 規則出自 |
|---|---|---|
| 當日訓練詳情 | 點 ACTIVITY 熱力圖有紀錄的格子 | `monkey-cardio-dashboard.md` |
| 當晚睡眠詳情 | 點 SLEEP 集章卡的格子 | `monkey-sleep-log.md` |
| 頭像原圖 | 點頁首頭像 | 無專門 spec |
