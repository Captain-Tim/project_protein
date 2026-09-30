# 生日帽

生日當天開啟 dashboard 時，頁首頭像顯示皇冠，隔天自動隱藏。判斷使用瀏覽器本地日期，不依賴訓練資料，也不在 build 時計算。

## 資料契約

資料位於：

- `data/Captain/profile/profile.json`
- `data/Monkey/profile/profile.json`

```json
{ "birthday": "08-14" }
```

- `birthday` 必須是合法的 `MM-DD`
- 只存月日，不存出生年或歲數
- `02-29` 合法，平年如何顯示尚未定義
- 檔案不存在時，build 注入 `null`，該人物不顯示生日帽
- profile 資料存在但頁面缺少 `PROFILE_DATA` 標記時，build 必須失敗，避免資料被無聲忽略

profile 放在子資料夾，避免被 `data/<人名>/*.json` 的訓練資料掃描誤讀。它與根目錄存放頭像圖片的 `profile/` 無關。

## 頁面行為

- `scripts/build_dashboard.js` 驗證資料並注入 `window.PROFILE_DATA`
- `dashboard-captain.html` 與 `dashboard-monkey.html` 在頁面載入時比較 `TODAY.slice(5)` 與 `birthday`
- `TODAY` 使用瀏覽器本地時區
- 皇冠是 `aria-hidden` 的純裝飾元素，位於頭像定位容器 `.avaWrap` 內
- 皇冠尺寸與位移由頁首的 `--ava` 推導，調整桌機或手機頭像尺寸時應一起檢查
- hover 套在 `.avaWrap`，確保頭像與皇冠一起縮放
- `wallet-monkey.html` 沒有頭像，不注入 profile，也不顯示皇冠

## 不做

- 不顯示歲數
- 不提供網址預覽開關
- 不在頭像放大檢視中顯示皇冠
- 不增加生日文字、紙屑或其他動畫

## 驗證

- 執行兩人的 dashboard build
- 暫時以今天月日測試顯示後，恢復原資料並重建，確認沒有殘留 diff
- 依 [verification.md](../verification.md) 檢查手機寬度下沒有裁切或水平溢出
