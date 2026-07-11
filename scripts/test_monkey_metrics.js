// 從 dashboard-monkey.html 抽出 <script id="metrics"> 區塊,在 Node 裡跑,驗證所有指標。
// 零依賴,直接 `node scripts/test_monkey_metrics.js`。
const fs = require("fs");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");

const HTML = fs.readFileSync(path.join(__dirname, "..", "dashboard-monkey.html"), "utf8");
const m = HTML.match(/<script id="metrics">([\s\S]*?)<\/script>/);
if (!m) throw new Error('找不到 <script id="metrics"> 區塊');
const win = {};
new Function("window", m[1])(win);
const M = win.MonkeyMetrics;
if (!M) throw new Error("metrics 區塊沒有掛上 window.MonkeyMetrics");

const S = (date, entries) => ({ date, type: "Cardio", cardio: entries, note: null });
const run = (duration_min, distance_km) => ({ exercise: "Running", duration_min, distance_km });

test("同一天的多筆 cardio 合併成一個 day-run", () => {
  const { runs } = M.buildDayRuns([S("2026-07-08", [run(30, 5), run(20, 3)])]);
  assert.equal(runs.length, 1);
  assert.equal(runs[0].km, 8);
  assert.equal(runs[0].min, 50);
});

test("day-run 依日期升冪排序", () => {
  const { runs } = M.buildDayRuns([S("2026-07-08", [run(30, 5)]), S("2026-07-01", [run(30, 5)])]);
  assert.deepEqual(runs.map((r) => r.date), ["2026-07-01", "2026-07-08"]);
});

test("缺 distance_km 的紀錄進 invalid,且不計入 runs", () => {
  const bad = { exercise: "Zone 2", duration_min: 40 };
  const { runs, invalid } = M.buildDayRuns([S("2026-07-08", [bad])]);
  assert.equal(runs.length, 0);
  assert.equal(invalid.length, 1);
  assert.equal(invalid[0].date, "2026-07-08");
});

test("缺 duration_min 的紀錄進 invalid", () => {
  const { invalid } = M.buildDayRuns([S("2026-07-08", [{ exercise: "Zone 2", distance_km: 5 }])]);
  assert.equal(invalid.length, 1);
});

test("同日一筆有效一筆殘缺:有效的照算,殘缺的照樣回報", () => {
  const { runs, invalid } = M.buildDayRuns([S("2026-07-08", [run(30, 5), { duration_min: 10 }])]);
  assert.equal(runs.length, 1);
  assert.equal(runs[0].km, 5);
  assert.equal(invalid.length, 1);
});

test("formatPace 把 min/km 轉成 m:ss", () => {
  assert.equal(M.formatPace(6.2), "6:12");
  assert.equal(M.formatPace(5.8), "5:48");
  assert.equal(M.formatPace(6), "6:00");
  assert.equal(M.formatPace(NaN), "—");
});
