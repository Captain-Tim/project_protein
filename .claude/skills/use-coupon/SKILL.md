---
name: use-coupon
description: 把「用掉一張炸雞券」記錄下來:列出可用的券、經使用者確認後寫入 data/Monkey/rewards/redemptions.json、重建頁面並 commit。當使用者說要用掉/兌換/吃掉炸雞券,或問還有幾張券時使用。
---

# 用掉一張炸雞券

炸雞券是 Monkey 達成 weekly quest(3 次 + 150 分鐘)的獎勵。**只有 Monkey 有,Captain 沒有這套東西。**

**先確認,再寫檔。** 使用者確認之前不要改 ledger、不要 commit。這是唯一的人工關卡,不要跳過。

## 唯一要存的東西

發券**完全由訓練資料推導,不存**。整套系統只有一件事要落地:**哪張券被用掉了**。

`data/Monkey/rewards/redemptions.json` — 單一陣列:

```json
[
  { "week_start": "2026-08-03", "used_on": "2026-08-10", "note": "繼光香香雞" }
]
```

| 欄位 | 必填 | 說明 |
|---|---|---|
| `week_start` | 是 | 用掉的是哪一張券。這是券的主鍵,一週最多一張 |
| `used_on` | 是 | 什麼時候用掉 |
| `note` | 是 | 吃了什麼。使用者沒講就填 `null` |

**不要存張數、餘額、券本身**——全是推導值,存了就會有跟訓練資料互相矛盾的一天。

## 流程

1. **先看目前有哪些券**(不要自己算,規則只有一份來源):

   ```bash
   node scripts/list_coupons.js Monkey
   ```

   輸出 `available` / `used` 兩個清單,以及 `problems`。

2. **挑一張券**:
   - 使用者沒指定 → **挑最舊的可用券**(`available` 陣列的最後一筆,券依取得日由新到舊排),先進先出
   - 使用者指定了某一週 → 用那一張,但要在 `available` 裡找得到
   - 使用者說「用兩張」→ 從最舊的開始挑兩張,寫兩筆

3. **`used_on` 用今天**,除非使用者明講是哪一天用掉的。

4. **`note` 看使用者有沒有主動講吃了什麼**,有講就照原文記,沒講就填 `null`。
   **不要主動問「你吃了什麼」,也不要自己編。**

5. 用繁體中文列出來給使用者確認(格式見下)。

6. 確認後才寫檔 → 重建 → commit → push。

### 確認訊息的格式

```
用掉 1 張炸雞券

券:2026-08-03 那週(取得日 2026-08-08)
用掉日期:2026-08-10
吃了:繼光香香雞

用掉後還剩 2 張可用。以上正確嗎?確認後我就寫入並更新頁面。
```

沒有 note 時就不要放「吃了」那一行。

## 邊界情況

全部都是**停下來問,不要自己決定**:

- **一張可用的券都沒有** → 告訴使用者目前沒有券,以及本週 quest 還差多少(看 `dashboard-monkey.html` 上的
  WEEKLY QUEST,或直接跑 `node scripts/list_coupons.js Monkey` 確認)。不要寫任何東西。
- **使用者指定的那一週不在 `available` 裡** → 講明是「那週沒達標所以沒發券」還是「那張已經用掉了」,
  兩者都不要硬寫。
- **使用者要求的 `used_on` 早於該張券的取得日** → 券那時候還不存在,停下來問。硬寫下去 build 會 exit 1。
- **`list_coupons.js` 的 `problems` 非空** → ledger 已經有問題了,先處理它,不要在壞掉的資料上再加一筆。
- **使用者說的是 Captain** → Captain 沒有獎勵系統,直接講明,不要自己幫他建一套。

## 寫檔

編輯 `data/Monkey/rewards/redemptions.json`,**append 一筆**,不要動既有的內容。
陣列順序不影響結果,接在最後面即可。

## 收尾

```bash
node scripts/build_dashboard.js Monkey    # -> dashboard-monkey.html + wallet-monkey.html
```

**不要手動編輯頁面的標記區塊**,一定要跑腳本。腳本會驗證使用紀錄,對不上就 exit 1——
**build 失敗代表資料有問題,去修資料,不要繞過檢查**。三種會被擋下來的情況:

- `week_start` 指向一個沒達標的週(幽靈券)
- 同一個 `week_start` 出現兩次(一張券用兩次)
- `used_on` 早於該張券的取得日

然後 commit ledger 和兩個 HTML,push。

- push 到 `master` 成功 → 告訴使用者 GitHub Actions 正在部署,約 30-60 秒後
  https://captain-tim.github.io/project_protein/ 就是最新的。
- 環境限制只能推到自己的分支 → **開 PR(base `master`)→ 直接 merge**,做法與 `log-workout` 相同。
