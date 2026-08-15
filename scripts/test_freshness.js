// 從三個頁面抽出 <script id="freshness"> 區塊,在 Node 裡用假的瀏覽器環境跑。
// 零依賴,直接 `node scripts/test_freshness.js`。
//
// 這段程式負責讓加到 iOS 主畫面的頁面在部署後自己更新。它容易錯的地方有三個:
// 節流、防無限重載的保險、比對 BUILD_ID 的 regex。三個都在這裡驗。
//
// 真瀏覽器的行為(visibilitychange 何時送、cache:"reload" 有沒有真的寫回快取)這裡驗不到,
// 那是瀏覽器的事;這裡驗的是我們自己寫的判斷。
const fs = require("fs");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");

const root = path.join(__dirname, "..");
const PAGES = ["dashboard-captain.html", "dashboard-monkey.html", "wallet-monkey.html"];

function freshnessOf(file) {
  const html = fs.readFileSync(path.join(root, file), "utf8");
  const m = html.match(/<script id="freshness">([\s\S]*?)<\/script>/);
  if (!m) throw new Error(file + ' 找不到 <script id="freshness"> 區塊');
  return m[1];
}

const CODE = freshnessOf(PAGES[1]);

// 假的瀏覽器環境。回傳的 h 讓測試可以觸發事件、看有沒有重載、看發了幾次 fetch。
function harness(opts) {
  const o = opts || {};
  const h = {
    reloads: 0,
    fetches: [],
    listeners: {},
    now: o.now || 1000000,
    store: o.store || {},
  };

  const win = {
    BUILD_ID: "buildId" in o ? o.buildId : "aaaaaaaaaaaa",
    addEventListener: (type, fn) => { (h.listeners[type] = h.listeners[type] || []).push(fn); },
  };
  const doc = {
    visibilityState: "visible",
    addEventListener: (type, fn) => { (h.listeners[type] = h.listeners[type] || []).push(fn); },
  };
  h.doc = doc;
  const loc = {
    pathname: "/dashboard-monkey.html",
    search: "",
    reload: () => { h.reloads++; },
  };
  const storage = {
    getItem: (k) => (k in h.store ? h.store[k] : null),
    setItem: (k, v) => { h.store[k] = String(v); },
  };
  const fakeFetch = (url, init) => {
    h.fetches.push({ url, init });
    if (o.fetchFails) return Promise.reject(new Error("offline"));
    const body = o.remoteBody !== undefined
      ? o.remoteBody
      : '/*BUILD_ID_START*/window.BUILD_ID="' + (o.remoteId || "aaaaaaaaaaaa") + '";/*BUILD_ID_END*/';
    return Promise.resolve({ ok: o.ok === false ? false : true, text: () => Promise.resolve(body) });
  };
  // 程式裡用 new Date().getTime() 取現在時間。塞一個假的進去,節流才測得動。
  function FakeDate() {}
  FakeDate.prototype.getTime = () => h.now;

  h.fire = (type, ev) => (h.listeners[type] || []).forEach((fn) => fn(ev || {}));
  h.start = () => {
    new Function("window", "document", "location", "sessionStorage", "fetch", "Date", CODE)(
      win, doc, loc, storage, fakeFetch, FakeDate
    );
  };
  return h;
}

// fetch 的 .then 鏈是 microtask,跑完才看得到結果。
const settle = () => new Promise((r) => setImmediate(r));

test("三個頁面的 freshness 區塊必須一字不差", () => {
  const bodies = PAGES.map(freshnessOf);
  bodies.forEach((b, i) => {
    assert.equal(b, bodies[0], PAGES[i] + " 的 freshness 區塊跟 " + PAGES[0] + " 不一樣");
  });
});

test("三個頁面都有 BUILD_ID 標記,值是 12 位小寫 hex", () => {
  PAGES.forEach((f) => {
    const html = fs.readFileSync(path.join(root, f), "utf8");
    const m = html.match(/\/\*BUILD_ID_START\*\/window\.BUILD_ID="([0-9a-f]+)";\/\*BUILD_ID_END\*\//);
    assert.ok(m, f + " 沒有 BUILD_ID 標記,或格式跟 build 腳本寫出來的不一致");
    assert.equal(m[1].length, 12, f + " 的 BUILD_ID 長度不是 12");
  });
});

test("開啟頁面就檢查一次:這次打開的可能就是快取裡的舊頁面", async () => {
  const h = harness({});
  h.start();
  await settle();
  assert.equal(h.fetches.length, 1);
});

test("fetch 必須用 cache:reload——no-store 不會把新頁面寫回快取,重載會拿到舊的", async () => {
  const h = harness({});
  h.start();
  await settle();
  assert.equal(h.fetches[0].init.cache, "reload");
});

test("版本相同 -> 不重載", async () => {
  const h = harness({ buildId: "aaaaaaaaaaaa", remoteId: "aaaaaaaaaaaa" });
  h.start();
  await settle();
  assert.equal(h.reloads, 0);
});

test("版本不同 -> 重載", async () => {
  const h = harness({ buildId: "aaaaaaaaaaaa", remoteId: "bbbbbbbbbbbb" });
  h.start();
  await settle();
  assert.equal(h.reloads, 1);
});

test("重載前先把新版本記進 sessionStorage", async () => {
  const h = harness({ buildId: "aaaaaaaaaaaa", remoteId: "bbbbbbbbbbbb" });
  h.start();
  await settle();
  assert.equal(h.store["freshness-seen"], "bbbbbbbbbbbb");
});

test("同一個新版本只重載一次:重載後拿到的還是舊頁面也不會變成無限重載", async () => {
  const store = { "freshness-seen": "bbbbbbbbbbbb" };
  const h = harness({ buildId: "aaaaaaaaaaaa", remoteId: "bbbbbbbbbbbb", store: store });
  h.start();
  await settle();
  assert.equal(h.reloads, 0);
});

test("切回前景會再檢查一次,但要隔 30 秒以上", async () => {
  const h = harness({});
  h.start();
  await settle();
  assert.equal(h.fetches.length, 1);

  h.now += 29000; // 還不到 30 秒
  h.fire("visibilitychange");
  await settle();
  assert.equal(h.fetches.length, 1, "29 秒就再打一次 = 節流沒生效");

  h.now += 2000; // 累計 31 秒
  h.fire("visibilitychange");
  await settle();
  assert.equal(h.fetches.length, 2);
});

test("切到背景不檢查(visibilitychange 送兩次,只有回前景那次算)", async () => {
  const h = harness({});
  h.start();
  await settle();
  assert.equal(h.fetches.length, 1);

  h.now += 60000;
  h.doc.visibilityState = "hidden";
  h.fire("visibilitychange");
  await settle();
  assert.equal(h.fetches.length, 1, "頁面切到背景時不該打");

  h.doc.visibilityState = "visible";
  h.fire("visibilitychange");
  await settle();
  assert.equal(h.fetches.length, 2);
});

test("從 bfcache 復原(pageshow persisted)也會檢查", async () => {
  const h = harness({});
  h.start();
  await settle();
  h.now += 60000;
  h.fire("pageshow", { persisted: true });
  await settle();
  assert.equal(h.fetches.length, 2);
});

test("pageshow 但不是從 bfcache 復原就不重複檢查(頁面剛載入已經檢查過了)", async () => {
  const h = harness({});
  h.start();
  await settle();
  h.now += 60000;
  h.fire("pageshow", { persisted: false });
  await settle();
  assert.equal(h.fetches.length, 1);
});

test("fetch 失敗不重載也不炸", async () => {
  const h = harness({ fetchFails: true });
  h.start();
  await settle();
  await settle();
  assert.equal(h.reloads, 0);
});

test("HTTP 不是 200 就當作沒拿到,不重載", async () => {
  const h = harness({ ok: false, remoteId: "bbbbbbbbbbbb" });
  h.start();
  await settle();
  await settle();
  assert.equal(h.reloads, 0);
});

test("回應裡找不到 BUILD_ID 標記就不重載(拿到的可能是登入頁或錯誤頁)", async () => {
  const h = harness({ remoteBody: "<html>Sign in</html>" });
  h.start();
  await settle();
  assert.equal(h.reloads, 0);
});

test("比對的是 BUILD_ID 標記區塊,不會誤中 freshness 自己那段 regex 原始碼", async () => {
  // 真實頁面:BUILD_ID 標記在前、freshness 區塊在後,兩邊都含 BUILD_ID 字樣。
  const realPage = fs.readFileSync(path.join(root, "dashboard-monkey.html"), "utf8");
  const stamped = realPage.match(/\/\*BUILD_ID_START\*\/window\.BUILD_ID="([0-9a-f]+)"/)[1];
  const h = harness({ buildId: stamped, remoteBody: realPage });
  h.start();
  await settle();
  assert.equal(h.reloads, 0, "抓到的不是標記區塊裡那個值");
});

test("頁面還沒被 build 蓋過 BUILD_ID(值是空的)就不做事", async () => {
  const h = harness({ buildId: undefined, remoteId: "bbbbbbbbbbbb" });
  h.start();
  await settle();
  assert.equal(h.fetches.length, 0);
  assert.equal(h.reloads, 0);
});
