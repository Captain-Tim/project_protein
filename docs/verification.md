# 驗證手冊

零依賴,不裝任何測試框架。改完頁面請照這裡驗,不要憑感覺說「應該沒問題」。

## 指標邏輯(必跑)

```bash
node scripts/test_monkey_metrics.js
```

從 `dashboard-monkey.html` 抽出 `<script id="metrics">` 在 Node 執行並斷言。
streak、配速加權、day-run 合併這些容易寫錯的地方都靠它。

## JS 語法快檢(不需瀏覽器)

```bash
node -e 'const fs=require("fs");const h=fs.readFileSync("dashboard-captain.html","utf8");const a=[...h.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]).pop();try{new Function(a);console.log("OK")}catch(e){console.log("ERR",e.message)}'
```

## 用 headless Chrome 看實際渲染結果

**Chrome 在 `Program Files (x86)`,不是 `Program Files`。**

複製成 `_t.html`(已 gitignore),在 `</body>` 前注入探針把要看的數字寫進 `document.title`,
`--dump-dom` 之後 grep `<title>`,看完刪掉 `_t.html`:

```bash
"/c/Program Files (x86)/Google/Chrome/Application/chrome.exe" --headless --disable-gpu \
  --dump-dom "file:///<repo>/_t.html" | grep -oE "<title>.*</title>"
```

探針的正規表示式小心 `\s` 在 shell 裡被吃掉——曾經因此誤判頁面文字有缺字。
拿不準就直接用 `textContent`,不要在探針裡做字串處理。

也可以直接截圖看:

```bash
"/c/Program Files (x86)/Google/Chrome/Application/chrome.exe" --headless --disable-gpu \
  --window-size=1200,1400 --screenshot="out.png" "file:///<repo>/dashboard-monkey.html"
```

## 驗手機版:不能用 `--window-size`

**`--window-size=390,844` 是騙人的。** Windows 的視窗最小寬度會讓實際佈局變成 463px,
在那個寬度下量出來的「沒有橫向溢出」是假的——真的 390px 手機上早就爆版了。

要用 iframe 強制真實寬度(`--allow-file-access-from-files` 才讀得到 iframe 內容):

```html
<!-- _t.html -->
<iframe id="f" src="dashboard-monkey.html" style="width:390px;height:1400px;border:0"></iframe>
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
"/c/Program Files (x86)/Google/Chrome/Application/chrome.exe" --headless --disable-gpu \
  --allow-file-access-from-files --virtual-time-budget=3000 \
  --dump-dom "file:///<repo>/_t.html" | grep -oE "<title>.*</title>"
```

預期 `overflow=false`。熱力圖的 `#hmGrid` 本來就比視窗寬(它在 `overflow-x:auto` 的容器裡自己捲動),
出現在「超寬元素」清單裡是正常的。
