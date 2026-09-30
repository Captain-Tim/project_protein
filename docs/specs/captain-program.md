# Captain 課表

Captain dashboard 依日期顯示當天表定課程。課表採 A／B 兩週循環，只描述計畫，不讀訓練紀錄、不判定完成，也不影響 WEEKLY QUEST。

## 資料契約

唯一資料來源是 `data/Captain/program/current.json`：

```json
{
  "anchor": { "week_start": "2026-08-10", "cycle": "A" },
  "cycles": {
    "A": {
      "mon": { "part": "Leg/Shoulder", "variant": "HEAVY", "exercises": ["Hack Squat"] },
      "tue": { "part": "Cardio", "exercises": ["Zone 2"] },
      "wed": null,
      "thu": null,
      "fri": null,
      "sat": null,
      "sun": null
    },
    "B": {
      "mon": null,
      "tue": null,
      "wed": null,
      "thu": null,
      "fri": null,
      "sat": null,
      "sun": null
    }
  }
}
```

| 欄位 | 必填 | 規則 |
|---|---|---|
| `anchor.week_start` | 是 | `YYYY-MM-DD`，且必須是星期一 |
| `anchor.cycle` | 是 | `A` 或 `B` |
| `cycles.A`、`cycles.B` | 是 | 都必須包含 `mon` 到 `sun` 七個 key |
| `<day>` | 是 | 物件或 `null`，`null` 代表休息日 |
| `<day>.part` | 是 | `Leg/Shoulder`、`Chest/Back`、`Cardio` |
| `<day>.variant` | 否 | `HEAVY` 或 `LIGHT` |
| `<day>.exercises` | 否 | 英文動作名稱陣列 |
| `<day>.note` | 否 | 當日訓練要點 |

- 休息日必須明確寫成 `null`，不可省略日期 key
- `variant` 表達課表意圖，不從一週中的出現順序推導
- 不儲存顏色或完成狀態
- 課表中的動作名稱是顯示文字，不由 build 對照 `EXERCISE_PART` 驗證。課表出現新名稱不代表已授權新增訓練動作

## 循環算法

1. 將目標日期與 `anchor.week_start` 都換算成週一
2. 計算相差的完整週數
3. 偶數週使用 `anchor.cycle`，奇數週使用另一個 cycle
4. 負週數也必須正確取模

A／B 依日曆持續交替，不因漏練或補記而停住。

## Build 與頁面

- `scripts/build_dashboard.js` 驗證結構並注入 `window.PROGRAM_DATA`
- 課表資料存在但頁面缺少 `PROGRAM_DATA` 標記時，build 必須失敗
- 沒有課表檔時注入 `null`，Captain 頁退回只有 WEEKLY QUEST 的版面
- 有課表時，`#quest` 顯示 `DAILY TASK & WEEKLY QUEST`
- 課表與 quest 共用 Captain 頁的藍色系統，不隨訓練部位換色
- `null` 顯示為 `Rest Day`
- 手機版改為直排，版面順序以 [page-layout.md](../page-layout.md) 為準

## 不做

- 不比對實際訓練，也不顯示今日課程是否完成
- 不顯示 A／B 標記
- 不在課表中保存組數、次數或重量
- 不支援 Monkey

## 維護入口

- 課表資料：`data/Captain/program/current.json`
- 驗證與注入：`scripts/build_dashboard.js`
- 循環與渲染：`dashboard-captain.html`
- 手機驗證：[verification.md](../verification.md)
