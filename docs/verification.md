# 驗證手冊

零依賴，不裝任何測試框架。改完頁面請照這裡驗，不要憑感覺說「應該沒問題」。

## 指標邏輯（必跑）

```bash
node scripts/test_monkey_metrics.js
```

從 `dashboard-monkey.html` 抽出 `<script id="metrics">` 在 Node 執行並斷言。
streak、配速加權、day-run 合併這些容易寫錯的地方都靠它。

## JS 語法快檢（不需瀏覽器）

```bash
node -e 'const fs=require("fs");const h=fs.readFileSync("dashboard-captain.html","utf8");const a=[...h.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]).pop();try{new Function(a);console.log("OK")}catch(e){console.log("ERR",e.message)}'
```

## 用 headless Chrome 看實際渲染結果

### 先找到 Chrome：路徑因機器而異

**兩個都可能，看安裝的是 64 位元還是 32 位元版：**

```
/c/Program Files/Google/Chrome/Application/chrome.exe
/c/Program Files (x86)/Google/Chrome/Application/chrome.exe
```

**路徑錯的失敗方式很糟：沒有輸出、也沒有錯誤訊息。** 看起來像「探針沒抓到東西」，
其實是 Chrome 根本沒被執行。曾經因此以為頁面壞了，實際上頁面好好的。

所以先解析成變數再用，不要把路徑寫死在指令裡：

```bash
for p in "/c/Program Files/Google/Chrome/Application/chrome.exe" \
         "/c/Program Files (x86)/Google/Chrome/Application/chrome.exe"; do
  [ -x "$p" ] && CHROME="$p" && break
done
echo "$CHROME"   # 空的就是兩個都找不到,先裝或先確認路徑,不要繼續往下跑
```

**不要用 `ls` 找。** 這個 shell 的 `ls` 帶 `-F`，執行檔後面會多一個 `*`，
`CHROME` 就變成不存在的路徑——然後又是上面那個沒輸出也沒報錯的失敗方式。
`[ -x ]` 直接測「檔案在且可執行」，沒有這個問題。

### 注入探針看數字

複製成 `_t.html`（已 gitignore），在 `</body>` 前注入探針把要看的數字寫進 `document.title`，
`--dump-dom` 之後 grep `<title>`，看完刪掉 `_t.html`：

```bash
"$CHROME" --headless --disable-gpu --virtual-time-budget=4000 \
  --dump-dom "file:///<repo>/_t.html" | grep -oE "<title>.*</title>"
```

**改複本不改本尊。** 兩個 dashboard 都有 build 標記區塊，直接注入探針會被
`git diff --exit-code` 抓到。

探針裡如果要等頁面算完再讀值（`setTimeout`），記得配 `--virtual-time-budget`，
否則 Chrome 會在探針跑完之前就把 DOM 倒出來。

探針的正規表示式小心 `\s` 在 shell 裡被吃掉——曾經因此誤判頁面文字有缺字。
拿不準就直接用 `textContent`，不要在探針裡做字串處理。

也可以直接截圖看：

```bash
"$CHROME" --headless --disable-gpu \
  --window-size=1200,1400 --screenshot="out.png" "file:///<repo>/dashboard-monkey.html"
```

## 驗手機版：不能用 `--window-size`

**目標機型的 CSS viewport 寬度：iPhone 15 / 16 = `393px`，iPhone 16 Pro = `402px`。**
驗窄版一律用 393（兩者較窄的那個）。換手機就改這一行。

**`--window-size=393,852` 是騙人的。** Windows 的視窗最小寬度會讓實際佈局變成 463px，
在那個寬度下量出來的「沒有橫向溢出」是假的——真的 393px 手機上早就爆版了。

要用 iframe 強制真實寬度（`--allow-file-access-from-files` 才讀得到 iframe 內容）：

```html
<!-- _t.html -->
<iframe id="f" src="dashboard-monkey.html" style="width:393px;height:1400px;border:0"></iframe>
<script>
document.getElementById("f").addEventListener("load", function () {
  var d = this.contentDocument;
  var vw = d.documentElement.clientWidth;
  var bad = [];
  d.querySelectorAll("*").forEach(function (e) {
    if (e.offsetWidth > vw + 1) bad.push(e.tagName + "." + (e.className || e.id));
  });
  document.title = "overflow=" + (d.documentElement.scrollWidth > vw) + " | 超寬元素: " + bad.join(", ");
});
</script>
```

```bash
"$CHROME" --headless --disable-gpu \
  --allow-file-access-from-files --virtual-time-budget=3000 \
  --dump-dom "file:///<repo>/_t.html" | grep -oE "<title>.*</title>"
```

預期 `overflow=false`。熱力圖的 `#hmGrid` 本來就比視窗寬（它在 `overflow-x:auto` 的容器裡自己捲動），
出現在「超寬元素」清單裡是正常的。

量出來的 `vw` 會比 iframe 寬度少 15px（桌機 Chrome 的垂直捲軸佔位，iPhone Safari 是浮動捲軸不佔位），
所以 393 的 iframe 量到 378。這個方向是偏保守的，量不到溢出就代表真機更不會溢出。
