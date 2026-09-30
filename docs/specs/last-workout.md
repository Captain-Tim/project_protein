# LAST WORKOUT

Captain 與 Monkey dashboard 都在 TRAINING LOG 中顯示 LAST WORKOUT，但兩頁的查詢範圍不同：

| 頁面 | 範圍 |
|---|---|
| Monkey | 全部 session 中最近一個訓練日 |
| Captain | 目前選中動作的最近一次紀錄 |

卡片只查詢現有資料，不新增或保存任何推導欄位。整頁位置以 [page-layout.md](../page-layout.md) 為準。

## 共通行為

### 距今天數

| 天數 | 狀態 |
|---|---|
| 0 到 7 | 綠色 `fresh` |
| 8 到 14 | 橘色 `warn` |
| 15 以上 | 紅色 `stale` |

文案為 `TODAY`、`YESTERDAY` 或 `N DAYS AGO`。日期以瀏覽器本地時區為準。Captain 的狀態色不跟著部位色改變。

### 與前一次比較

比較基準是同一範圍內的前一次，不是歷史平均。

| 數值 | 持平門檻 | 進步方向 |
|---|---|---|
| 距離 | 小於 0.01 km | 增加 |
| 配速 | 小於 1 秒 | 每公里時間減少 |
| HIIT 衝刺速度 | 小於 0.01 km/h | 增加 |
| 重量 | 小於 0.01 | 增加 |
| Volume | 小於 1 | 增加 |

- `▲` 表示進步，使用綠色
- `▼` 表示退步，使用紅色
- 持平顯示 `— 0 <unit>`，使用次要文字色
- 差值放在其對應主數值下方，不另開一列

### 互動與呈現

- 整張卡可點擊，沿用既有的當日詳情彈窗
- PR 標籤直接使用該頁既有 `isNew` 結果，不重算
- 卡片不重複顯示 note，完整 note 留在彈窗
- 手機版排在趨勢圖之前並占滿寬度
- 桌機與旁邊圖表維持等高，卡內不加額外分隔線

## Monkey

- 最近日期相同的多筆 session 合併
- 有 cardio 時顯示 cardio 摘要，純重訓日則顯示動作與組數摘要
- cardio 距離與時間可相加，配速以合併值推導
- 平均心率、最高心率、坡度、阻力與卡路里只在當天恰好一筆 cardio 時顯示，不平均或相加
- 坡度與阻力的 0 都是有效值，判斷必須使用 `!= null`
- cardio 比較會跳過純重訓日，尋找更早的 cardio 日期
- 沒有任何 session 時隱藏整張卡，WEEKLY DISTANCE 撐滿該列

相關計算位於 `dashboard-monkey.html` 的 metrics 區塊，並由 `scripts/test_monkey_metrics.js` 覆蓋。

## Captain

Captain 卡片跟著目前選中的動作切換。

### Cardio

- 主數值為距離、時間與平均配速
- 若資料含 `work_speed_kmh`，第三欄改顯示衝刺速度，並與前一次衝刺速度比較
- HIIT 規則見 [hiit-intervals.md](hiit-intervals.md)
- 選填量測欄位與 Monkey 使用相同的單筆 cardio 限制

### Strength

- 主數值為最高單組重量、組數與 volume
- 顯示本次每組重量與次數
- 單位跟著資料，不可寫死為 kg
- 與同動作前一次的最高重量及 volume 比較

Captain 的 PR、趨勢圖與 LAST WORKOUT 必須維持同一個動作脈絡。cardio 與 strength 分支的圖表欄使用相同比例，避免切換 tab 時卡片寬度跳動。

## 驗證

執行完整 validate 後，依 [verification.md](../verification.md) 檢查：

- 兩頁的 LAST WORKOUT 與相鄰圖表等高
- Captain 切換各 tab 時卡片寬度不跳動
- 單位與目前動作資料一致
- 差值位於正確的主數值下方，方向與顏色正確
- 點擊 cardio 與 strength 卡片都會開啟正確日期的詳情
- 手機版無水平溢出

Captain 的相關計算目前未匯出為獨立 metrics 測試，因此畫面驗證不可省略。

## 不做

- 不保存距今天數、配速、差值或 PR 狀態
- 不與最近 N 次平均比較
- 不新增休息過久的提醒文案
- 不為追求對稱而統一 Captain 與 Monkey 的查詢範圍
