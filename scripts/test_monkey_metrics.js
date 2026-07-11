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

test("weekStart 回傳該週的週一", () => {
  assert.equal(M.weekStart("2026-07-11"), "2026-07-06"); // 週六 -> 該週週一
  assert.equal(M.weekStart("2026-07-06"), "2026-07-06"); // 週一 -> 自己
  assert.equal(M.weekStart("2026-07-12"), "2026-07-06"); // 週日 -> 同一週的週一
});

test("weekAgg 依週彙總次數/距離/時間", () => {
  const { runs } = M.buildDayRuns([
    S("2026-07-06", [run(50, 8)]),
    S("2026-07-08", [run(60, 9)]),
    S("2026-07-13", [run(40, 6)]),
  ]);
  const agg = M.weekAgg(runs);
  assert.equal(agg.get("2026-07-06").runs, 2);
  assert.equal(agg.get("2026-07-06").min, 110);
  assert.equal(agg.get("2026-07-13").runs, 1);
});

test("達標週:runs >= 3 且 minutes >= 150 兩者都要", () => {
  assert.equal(M.isCompleteWeek({ runs: 3, km: 20, min: 150 }), true);
  assert.equal(M.isCompleteWeek({ runs: 3, km: 20, min: 149 }), false);
  assert.equal(M.isCompleteWeek({ runs: 2, km: 30, min: 200 }), false);
});

test("currentQuest 算出本週進度、上限 100%、剩餘天數", () => {
  const { runs } = M.buildDayRuns([
    S("2026-07-06", [run(60, 9)]),
    S("2026-07-07", [run(60, 9)]),
    S("2026-07-08", [run(60, 9)]),
  ]);
  const q = M.currentQuest(runs, "2026-07-11"); // 週六
  assert.equal(q.weekStart, "2026-07-06");
  assert.equal(q.weekEnd, "2026-07-12");
  assert.equal(q.runs, 3);
  assert.equal(q.minutes, 180);
  assert.equal(q.runsPct, 1);
  assert.equal(q.minutesPct, 1); // 180/150 上限 1,不會變成 1.2
  assert.equal(q.questPct, 1);
  assert.equal(q.complete, true);
  assert.equal(q.daysLeft, 2); // 週六 + 週日
});

test("currentQuest:兩項未達標時 questPct 是兩者平均", () => {
  const { runs } = M.buildDayRuns([S("2026-07-06", [run(75, 10)])]);
  const q = M.currentQuest(runs, "2026-07-08");
  assert.equal(q.runs, 1);
  assert.equal(q.minutes, 75);
  assert.equal(Math.round(q.questPct * 100), 42); // (1/3 + 75/150) / 2 = 0.4166…
  assert.equal(q.complete, false);
});

test("streak:連續達標週數,本週未達標不算斷", () => {
  // 每週 3 次 × 60 min = 180 min,達標。用 M.addDays 產生日期字串,避免 toISOString 的時區位移。
  const week = (mon) => [0, 1, 2].map((d) => S(M.addDays(mon, d), [run(60, 9)]));
  const sessions = [...week("2026-06-22"), ...week("2026-06-29"), ...week("2026-07-06")];
  const { runs } = M.buildDayRuns(sessions);
  assert.equal(M.streak(runs, "2026-07-08"), 3); // 本週已達標 -> 計入

  // 本週一次都還沒跑:前兩週達標,streak 仍是 2(本週未結束,不算斷)
  const { runs: r2 } = M.buildDayRuns([...week("2026-06-22"), ...week("2026-06-29")]);
  assert.equal(M.streak(r2, "2026-07-08"), 2);
});

test("streak:中間有一週沒達標就斷", () => {
  const { runs } = M.buildDayRuns([
    S("2026-06-22", [run(60, 9)]), S("2026-06-23", [run(60, 9)]), S("2026-06-24", [run(60, 9)]),
    S("2026-06-29", [run(60, 9)]), // 這週只有 1 次,沒達標
    S("2026-07-06", [run(60, 9)]), S("2026-07-07", [run(60, 9)]), S("2026-07-08", [run(60, 9)]),
  ]);
  assert.equal(M.streak(runs, "2026-07-08"), 1); // 只有本週
});

test("personalRecords:fastest pace 只計 >= 2 km 的 day-run", () => {
  const { runs } = M.buildDayRuns([
    S("2026-07-01", [run(4, 1)]),    // 4:00/km 但只有 1 km -> 不列入
    S("2026-07-02", [run(30, 5)]),   // 6:00/km
    S("2026-07-03", [run(29, 5)]),   // 5:48/km <- 應為最快
  ]);
  const pr = M.personalRecords(runs);
  assert.equal(pr.fastestPace.date, "2026-07-03");
  assert.equal(M.formatPace(pr.fastestPace.pace), "5:48");
});

test("personalRecords:longest run / longest time 各自獨立", () => {
  const { runs } = M.buildDayRuns([
    S("2026-07-01", [run(72, 12)]),  // 最長距離 + 最長時間
    S("2026-07-02", [run(30, 5)]),
  ]);
  const pr = M.personalRecords(runs);
  assert.equal(pr.longestRun.km, 12);
  assert.equal(pr.longestRun.date, "2026-07-01");
  assert.equal(pr.longestTime.min, 72);
});

test("personalRecords:紀錄產生於最近一次 -> isNew 為 true", () => {
  const { runs } = M.buildDayRuns([
    S("2026-07-01", [run(30, 5)]),
    S("2026-07-08", [run(80, 14)]),  // 最新一次同時破距離與時間
  ]);
  const pr = M.personalRecords(runs);
  assert.equal(pr.isNew.longestRun, true);
  assert.equal(pr.isNew.longestTime, true);
  assert.equal(pr.isNew.fastestPace, true); // 80/14 = 5:43,比 6:00 更快
});

test("personalRecords:平手時取較早日期,不誤觸發 NEW", () => {
  const { runs } = M.buildDayRuns([
    S("2026-07-01", [run(30, 5)]),
    S("2026-07-08", [run(30, 5)]),   // 完全一樣
  ]);
  const pr = M.personalRecords(runs);
  assert.equal(pr.longestRun.date, "2026-07-01");
  assert.equal(pr.isNew.longestRun, false);
  assert.equal(pr.isNew.fastestPace, false);
});

test("personalRecords:沒有 >= 2 km 的紀錄時 fastestPace 為 null", () => {
  const { runs } = M.buildDayRuns([S("2026-07-01", [run(6, 1.5)])]);
  assert.equal(M.personalRecords(runs).fastestPace, null);
});

test("avgPace:最近 5 次的加權平均(Σmin / Σkm),不是配速直接平均", () => {
  const { runs } = M.buildDayRuns([
    S("2026-07-01", [run(60, 10)]),
    S("2026-07-02", [run(60, 10)]),
    S("2026-07-03", [run(60, 10)]),
    S("2026-07-04", [run(60, 10)]),
    S("2026-07-05", [run(12, 1)]),   // 12:00/km 的短跑
  ]);
  const a = M.avgPace(runs);
  // 加權:(60*4+12) / (10*4+1) = 252/41 = 6.146…  -> 6:09
  assert.equal(M.formatPace(a.pace), "6:09");
  assert.equal(a.sampleSize, 5);
  assert.equal(a.deltaSec, null); // 不足 10 次,沒有比較基準
});

test("avgPace:deltaSec 正值代表比前 5 次快", () => {
  const mk = (i, min, km) => S("2026-06-" + String(i).padStart(2, "0"), [run(min, km)]);
  const older = [1, 2, 3, 4, 5].map((i) => mk(i, 60, 9));    // 6:40/km
  const newer = [6, 7, 8, 9, 10].map((i) => mk(i, 60, 10));  // 6:00/km
  const { runs } = M.buildDayRuns([...older, ...newer]);
  const a = M.avgPace(runs);
  assert.equal(M.formatPace(a.pace), "6:00");
  assert.equal(Math.round(a.deltaSec), 40); // 快了 40 秒
});

test("weeklyDistance:回傳固定 8 週,沒跑的週為 0,最後一週是本週", () => {
  const { runs } = M.buildDayRuns([
    S("2026-07-08", [run(60, 10)]),
    S("2026-06-30", [run(30, 5)]), // 前一週
  ]);
  const w = M.weeklyDistance(runs, "2026-07-11");
  assert.equal(w.length, 8);
  assert.equal(w[7].weekStart, "2026-07-06");
  assert.equal(w[7].km, 10);
  assert.equal(w[7].isCurrent, true);
  assert.equal(w[6].km, 5);
  assert.equal(w[0].km, 0);
  assert.equal(w[0].isCurrent, false);
});

test("heatmapLevel:0 / <=3 / <=6 / >6 四階", () => {
  assert.equal(M.heatmapLevel(0), 0);
  assert.equal(M.heatmapLevel(2.9), 1);
  assert.equal(M.heatmapLevel(3), 1);
  assert.equal(M.heatmapLevel(6), 2);
  assert.equal(M.heatmapLevel(6.1), 3);
});

test("heatmap:52 欄 × 7 列,今天之後的格子為 null", () => {
  const { runs } = M.buildDayRuns([S("2026-07-08", [run(38, 6.2)])]);
  const h = M.heatmap(runs, "2026-07-11"); // 週六
  assert.equal(h.weeks.length, 52);
  assert.equal(h.weeks[51].length, 7);
  assert.equal(h.weeks[51][6], null); // 本週日還沒到
  assert.equal(h.weeks[51][5].date, "2026-07-11"); // 週六 = 今天
  const wed = h.weeks[51][2];
  assert.equal(wed.date, "2026-07-08");
  assert.equal(wed.km, 6.2);
  assert.equal(wed.level, 3);
  assert.equal(h.totalRuns, 1);
});
