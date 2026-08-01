---
name: use-coupon
description: 把「用掉一張炸雞券」記錄下來:列出可用的券、經使用者確認後寫入 data/Monkey/rewards/redemptions.json、重建頁面並 commit。當使用者說要用掉/兌換/吃掉炸雞券,或問還有幾張券時使用。
---

# 用掉一張炸雞券

炸雞券有兩種來源,**只有 Monkey 有,Captain 沒有這套東西**:

| 種類 | `kind` | 來源 | 主鍵 `id` |
|---|---|---|---|
| 達標券 | `quest` | 達成 weekly quest(3 次 + 150 分鐘),完全推導、不存 | `quest:<week_start>` |
| 特別券 | `special` | 人工核發(慶祝、鼓勵…),存在 grants ledger | grant 自己的 `id` |

**用掉的時候兩種完全一樣**,先進先出、不接受指定哪一張。

**先確認,再寫檔。** 使用者確認之前不要改 ledger、不要 commit。這是唯一的人工關卡,不要跳過。

## 要存的東西

**達標券完全由訓練資料推導,不存。** 會落地的只有兩件推導不出來的事實:

### 1. 哪張券被用掉了 — `data/Monkey/rewards/redemptions.json`

```json
[
  { "id": "quest:2026-08-03", "used_on": "2026-08-10", "note": "繼光香香雞" }
]
```

| 欄位 | 必填 | 說明 |
|---|---|---|
| `id` | 是 | 用掉的是哪一張券,照 `list_coupons.js` 印出來的 `id` 原樣填 |
| `used_on` | 是 | 什麼時候用掉 |
| `note` | 是 | 吃了什麼。使用者沒講就填 `null` |

### 2. 手動核發了哪些特別券 — `data/Monkey/rewards/grants.json`

特別券是人做的決定、**本來就推導不出來**,所以必須存。這不違反「不存推導值」。

```json
[
  { "id": "special:2026-08-01-launch", "granted_on": "2026-08-01", "reason": "炸雞系統上線 & 本週完成 3 次訓練" }
]
```

| 欄位 | 必填 | 說明 |
|---|---|---|
| `id` | 是 | 全域唯一,習慣用 `special:<日期>-<短名>`。**不可以 `quest:` 開頭**(那是達標券的命名空間,會被擋下來) |
| `granted_on` | 是 | 核發日。券在這天之前不存在,`used_on` 不能早於它 |
| `reason` | 是 | 為什麼發這張。會顯示在票券夾上,不能省略也不要填 `null` |

**發特別券前一定要先問過使用者**——這是繞過達標規則的例外,不是你可以自己決定的事。

**不要存張數、餘額、達標券本身**——全是推導值,存了就會有跟訓練資料互相矛盾的一天。

## 流程

1. **先看目前有哪些券**(不要自己算,規則只有一份來源):

   ```bash
   node scripts/list_coupons.js Monkey
   ```

   輸出 `available` / `used` 兩個清單,以及 `problems`。

2. **挑最舊的可用券**(`available` 陣列的最後一筆,券依取得日由新到舊排),先進先出。

   券彼此沒有差別(達標券、特別券一視同仁),**不接受指定哪一張**。使用者若講了某一週或指名特別券,
   說明一律先進先出,然後照最舊的那張走。使用者說「用兩張」→ 從最舊的開始挑兩張,寫兩筆。
   寫進 ledger 的是那張券的 `id`。

3. **`used_on` 用今天**,除非使用者明講是哪一天用掉的。

4. **`note` 看使用者有沒有主動講吃了什麼**,有講就照原文記,沒講就填 `null`。
   **不要主動問「你吃了什麼」,也不要自己編。**

5. 用繁體中文列出來給使用者確認(格式見下)。

6. 確認後才寫檔 → 重建 → commit → push。

### 確認訊息的格式

```
用掉 1 張炸雞券

券:quest:2026-08-03(取得日 2026-08-08)
用掉日期:2026-08-10
吃了:繼光香香雞

用掉後還剩 2 張可用。以上正確嗎?確認後我就寫入並更新頁面。
```

沒有 note 時就不要放「吃了」那一行。

## 邊界情況

全部都是**停下來問,不要自己決定**:

- **一張可用的券都沒有** → 告訴使用者目前沒有券,以及本週 quest 還差多少(看 `dashboard-monkey.html` 上的
  WEEKLY QUEST,或直接跑 `node scripts/list_coupons.js Monkey` 確認)。不要寫任何東西。
- **使用者要求的 `used_on` 早於該張券的取得日** → 券那時候還不存在,停下來問。硬寫下去 build 會 exit 1。
- **`list_coupons.js` 的 `problems` 非空** → ledger 已經有問題了,先處理它,不要在壞掉的資料上再加一筆。
- **使用者說的是 Captain** → Captain 沒有獎勵系統,直接講明,不要自己幫他建一套。

## 寫檔

編輯 `data/Monkey/rewards/redemptions.json`,**append 一筆**,不要動既有的內容。
(核發特別券則是 append 到 `data/Monkey/rewards/grants.json`。)
陣列順序不影響結果,接在最後面即可。

## 收尾

```bash
node scripts/build_dashboard.js Monkey    # -> dashboard-monkey.html + wallet-monkey.html
```

**不要手動編輯頁面的標記區塊**,一定要跑腳本。腳本會驗證使用紀錄,對不上就 exit 1——
**build 失敗代表資料有問題,去修資料,不要繞過檢查**。三種會被擋下來的情況:

- `id` 指向一張不存在的券(幽靈券)
- 同一個 `id` 出現兩次(一張券用兩次)
- `used_on` 早於該張券的取得日
- grant 缺 `id` / `granted_on` / `reason`、`id` 重複、或 `id` 用了 `quest:` 開頭

然後 commit ledger 和兩個 HTML,push。

- push 到 `master` 成功 → 告訴使用者 GitHub Actions 正在部署,約 30-60 秒後
  https://captain-tim.github.io/project_protein/ 就是最新的。
- 環境限制只能推到自己的分支 → **開 PR(base `master`)→ 直接 merge**,做法與 `log-workout` 相同。
