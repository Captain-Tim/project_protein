# Monkey Cardio Dashboard

`dashboard-monkey.html` 以有氧訓練的日期為統計單位，呈現本週任務、個人紀錄、最近訓練、八週距離與活動熱力圖。介面文字使用英文，使用者輸入的 note 保留原文。

頁面是單一自含 HTML，不依賴外部框架或圖表函式庫。資料由 `scripts/build_dashboard.js` 注入 `WORKOUT_DATA`，核心計算集中在 `<script id="metrics">`，並由 `scripts/test_monkey_metrics.js` 測試。

## Day-run

**一次 run 等於一個有 cardio 紀錄的日期。** 同日多筆 session 或 cardio entry 合併為一筆 day-run：

- 距離相加
- 時間相加
- 配速以合併後的總時間除以總距離
- runs 計算有 cardio 的天數，不計 entry 數量

這個定義同時用於總計、weekly quest、streak、PR、八週距離、熱力圖與炸雞券，避免同一天拆成多筆就被算成多次訓練。

每筆 cardio 必須有日期、正數 `duration_min` 與正數 `distance_km`。build 會擋下不完整資料，頁面 metrics 也保留 `invalid` 回報，不能靜默略過。

## Weekly Quest 與 Streak

```js
const WEEKLY_GOAL = { runs: 3, minutes: 150 };
```

- 一週從星期一開始，到星期日結束
- 達標必須同時滿足 3 個 day-runs 與 150 分鐘
- `QUEST PROGRESS` 是兩項達成率各自封頂 100% 後的平均
- streak 從最近已結束的一週往回計算
- 本週尚未達標不會中斷 streak，本週已達標則計入

炸雞券入口位於 quest 卡底部，規則見 [monkey-fried-chicken-award.md](monkey-fried-chicken-award.md)。

## Personal Records

| 指標 | 定義 |
|---|---|
| `FASTEST PACE` | 距離至少 2 km 的 day-run 中，`duration_min / distance_km` 最小者 |
| `LONGEST RUN` | 單一 day-run 的最大總距離 |
| `LONGEST TIME` | 單一 day-run 的最大總時間 |

- 平手保留較早達成的日期
- 紀錄日期等於最近 cardio 日期時顯示 `NEW!`
- 配速只推導與顯示，不寫入資料

## Weekly Distance

- 顯示最近八週，包含本週
- 每根柱代表該週所有 day-runs 的總距離
- 本週使用強調色，其餘週使用較弱色
- 與 LAST WORKOUT 並排，手機版改為直排

## Activity 熱力圖

- 一欄一週，週一到週日共七列
- `RECENT` 顯示包含今天的最近 365 天
- 年份 tab 顯示完整日曆年，從最早資料年份連續列到今年
- 區間外與未來日期使用透明格，不算 0 km
- 每格依當日總距離分四階：0、0 至 3、3 至 6、超過 6 km
- 手機版可水平捲動。包含今天的視圖捲到最右，歷史年份停在最左

## LAST WORKOUT

Monkey 的 LAST WORKOUT 取全頁最近一個訓練日，不按動作篩選。最近一天若只有重訓，使用重訓摘要作為退化顯示。詳細比較與互動規則見 [last-workout.md](last-workout.md)。

## 維護原則

- 指標規則只改 `dashboard-monkey.html` 的 metrics 區塊，不在 build 腳本或 wallet 重寫一份
- `wallet-monkey.html` 的 metrics 由 build 從 dashboard 複製
- 指標改動必須同步更新 `scripts/test_monkey_metrics.js`
- 整頁區塊順序以 [page-layout.md](../page-layout.md) 為準
- 手機版是主要使用情境，斷點為 640px。驗證方式以 [verification.md](../verification.md) 為準

## 不做

- 不儲存配速或其他推導值
- 不提供獨立 pace trend 或 recent runs 清單
- 不加入體重、體脂或 BMI
- 不把同日多筆 cardio 算成多次 run
