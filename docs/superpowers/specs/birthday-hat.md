# 生日帽

生日當天打開自己的 dashboard，頁首頭像的左上角戴上一頂皇冠。隔天自動消失。

**這頂帽子是 `(生日日期, 今天日期)` 的單純函數。** 它不讀訓練紀錄、不記錄任何狀態，
所以不需要維護，也不會跟其他資料互相矛盾。

**判斷發生在頁面打開的當下，不在 build。** 頁面是靜態部署的，不會每天重 build，
build 時算出來的「今天是不是生日」隔天就過期了。

## 資料層

### 位置

`data/Captain/profile/profile.json`、`data/Monkey/profile/profile.json`

**必須放 `profile/` 子資料夾。** `build_dashboard.js` 掃 `data/<人名>/*.json` 時不遞迴，
放在根目錄會被當成一筆訓練紀錄，然後因為缺 `date` 而擋下 build。理由跟 `rewards/`、
`sleep/`、`program/` 完全一樣。

這個資料夾跟 repo 根目錄的 `profile/`（頭像圖檔）同名但無關，兩者路徑不同、內容不同。

### 結構

```json
{ "birthday": "08-14" }
```

| 欄位 | 型別 | 說明 |
|---|---|---|
| `birthday` | string | `MM-DD`。**只存月日，不存出生年** |

**不存出生年。** repo 是 public，而且沒有任何地方會用到年份。要算歲數才需要年，
但顯示歲數不在範圍內。

### 驗證

`build_dashboard.js` 負責，不合格就 exit 1：

- `profile.json` 必須是一個物件
- `birthday` 必須是字串，且符合 `MM-DD`
- 月份在 `01`–`12` 之間
- 日期在 `01` 到該月天數之間，二月上限 `29`

**只存月日就判斷不了閏年，所以 `02-29` 一律視為合法。** 真的有人是 2 月 29 日生的時候
再處理「平年要不要提前一天」，現在兩個人都不是。

**檔案不存在不是錯誤。** 注入 `null`，那個人就永遠不會出現帽子。跟 `PROGRAM_DATA` 同一個
模式，替以後可能加入的人留路。

**檔案存在但頁面沒有 `PROFILE_DATA` 標記區塊就 exit 1**，否則資料會被無聲忽略。
跟 `REWARDS`、`SLEEP`、`PROGRAM` 同一個模式。

### 注入

```js
/*PROFILE_DATA_START*/window.PROFILE_DATA={"birthday":"08-14"};/*PROFILE_DATA_END*/
```

**不注入 `wallet-monkey.html`。** 那一頁沒有頭像。

## 頁面層

兩頁的實作完全一樣，只有頭像圖檔與人物色不同。

### 標記

頭像外面包一層定位用的容器，帽子是它的第二個子元素：

```html
<div class="avaWrap">
  <img class="avatar" id="avatar" src="profile/monkey-avatar.jpg" alt="Monkey" title="Tap to view" />
  <div class="bhat" id="bhat" aria-hidden="true" hidden>👑</div>
</div>
```

`aria-hidden` 是因為帽子純裝飾，讀螢幕的人不需要聽到它。

原本掛在 `.avatar` 上的 `flex: 0 0 auto` 移到 `.avaWrap`，它現在才是 flex 的子項。
放大檢視的 click handler 仍然綁在 `#avatar` 這個 `img` 上，不受影響。

### 幾何

頭像尺寸抽成 `header.hero` 上的 `--ava`，桌機 `62px`，手機的 media query 覆寫成 `52px`。
帽子的所有尺寸都從它算出來，兩種寬度共用同一組算式：

```css
header.hero { --ava: 62px; }
.avaWrap { position: relative; display: inline-block; line-height: 0; flex: 0 0 auto;
  transition: transform .15s; }
.avatar  { width: var(--ava); height: var(--ava); display: block; }
.bhat {
  position: absolute; left: 0; top: 0;
  width: calc(var(--ava) * .51);
  font-size: calc(var(--ava) * .4692);
  line-height: 1; text-align: center;
  transform-origin: 60% 100%;
  transform: translateY(calc(var(--ava) * -.30)) rotate(-40deg);
  pointer-events: none;
}
```

換算出來的實際值：

| | 頭像 | 帽子字級 | 往上位移 | 旋轉 |
|---|---|---|---|---|
| 桌機 | 62px | 29.1px | 18.6px | -40° |
| 手機 | 52px | 24.4px | 15.6px | -40° |

**`--ava` 掛在 `header.hero` 上，不是 `:root`。** `:root` 整塊會被 build 複製到
`wallet-monkey.html`，而那一頁沒有頭像。這是版面尺寸不是主題 token，放在用得到它的地方就好。

**帽子會往上超出頁首卡片上緣**，桌機約 4.6px，手機約 3.6px（位移減掉頁首自己的
上 padding）。頁面本體的 padding 接住它，不會被裁掉，也不會把下面的內容擠開。
393px 實測帽子的外框頂端在 8.3px、左緣在 15.0px，都還在頁面裡。

**hover 放大從 `.avatar` 移到 `.avaWrap`**，這樣滑過去的時候帽子跟頭像一起放大。
留在 `img` 上會變成頭像放大、帽子不動。

`.avatar` 的光暈脈動動畫不動，它作用在 `box-shadow` 上，跟帽子無關。

### 渲染

```js
const PF = window.PROFILE_DATA;
if (PF && TODAY.slice(5) === PF.birthday) bhat.hidden = false;
```

`TODAY` 是 `YYYY-MM-DD`，`slice(5)` 取出 `MM-DD` 跟資料直接比。取 DOM 元素的寫法
各頁沿用自己既有的那個 helper，Monkey 頁是 `el()`，Captain 頁是 `$()`。

`TODAY` 沿用兩頁既有的那一個，是瀏覽器的本地日期。**人在哪個時區，就照那邊的日曆過生日。**

## 刻意不做

- **不做預覽開關。** 沒有 `?birthday` 這類網址參數強制顯示。代價是線上頁面一年只有
  5/1 與 8/14 兩天看得到帽子（開發時仍可在本機暫時改資料來看，見下一節）
- **放大檢視的原圖不戴帽子。** 帽子屬於頁首那個 62px 的頭像，不屬於人
- **不加紙屑、不加動畫。** 帽子靜止不動
- **頁面其他地方完全不動。** 沒有生日字樣、沒有彩帶、沒有額外卡片
- **不顯示歲數。** 資料層只有月日，算不出來，也不想算
- **`wallet-monkey.html` 不做。** 那一頁沒有頭像
- **不擋「今天不是生日」以外的情況。** 補記、提前看、事後回顧都沒有意義，這是一個當天的裝飾

## 驗證

實作完成後，除了 `build_dashboard.js` 之外要另外確認兩件事：

- Monkey 頁在 8/14 當天直接看就好。Captain 頁把 `birthday` 暫時改成當天、重跑 build、
  確認帽子出現，然後改回 `05-01`、再重跑一次 build，確認帽子消失且 `git diff` 是乾淨的
- 用 `docs/verification.md` 的 iframe 方式在 393px 量一次，確認帽子沒有被裁掉、
  也沒有造成橫向溢出

## 相關檔案

| 路徑 | 角色 |
|---|---|
| `data/Captain/profile/profile.json`、`data/Monkey/profile/profile.json` | 生日日期 |
| `scripts/build_dashboard.js` | 讀生日、驗證、注入 `PROFILE_DATA` 標記區塊 |
| `dashboard-captain.html`、`dashboard-monkey.html` | 標記區塊、頭像容器、帽子樣式與顯示判斷 |
| `docs/page-layout.md` | 頁首在整頁的位置 |
| `docs/verification.md` | 手機寬度與 iframe 量測方式 |
