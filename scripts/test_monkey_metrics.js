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

test("heatmap:過去 365 天 = 53 欄,首欄的區間外格子與今天之後的格子皆為 null", () => {
  const { runs } = M.buildDayRuns([S("2026-07-08", [run(38, 6.2)])]);
  const h = M.heatmap(runs, "2026-07-11"); // 週六
  // 365 天 = 52 週 + 1 天 -> 首欄是不完整的一週
  assert.equal(h.weeks.length, 53);
  assert.equal(h.weeks[0].length, 7);
  assert.equal(h.firstDate, "2025-07-12"); // today - 364(同為週六)
  // 首欄週一 2025-07-07 ~ 週五 2025-07-11 在 365 天之前 -> null,週六起才進範圍
  assert.equal(h.weeks[0][0], null);
  assert.equal(h.weeks[0][4], null);
  assert.equal(h.weeks[0][5].date, "2025-07-12");
  assert.equal(h.weeks[0][6].date, "2025-07-13");

  const last = h.weeks[52];
  assert.equal(last[6], null);            // 本週日還沒到
  assert.equal(last[5].date, "2026-07-11"); // 週六 = 今天
  const wed = last[2];
  assert.equal(wed.date, "2026-07-08");
  assert.equal(wed.km, 6.2);
  assert.equal(wed.level, 3);
  assert.equal(h.totalRuns, 1);
});

test("heatmap:剛好滿 365 天的那筆算進去,再早一天的不算", () => {
  const { runs } = M.buildDayRuns([
    S("2025-07-12", [run(30, 5)]), // today - 364,邊界內
    S("2025-07-11", [run(30, 5)]), // today - 365,邊界外
  ]);
  const h = M.heatmap(runs, "2026-07-11");
  assert.equal(h.totalRuns, 1);
});

test("heatmapYear:2026 年以週一起算是 53 欄,年度外的格子為 null", () => {
  const { runs } = M.buildDayRuns([S("2026-01-01", [run(30, 5)])]);
  const h = M.heatmapYear(runs, 2026, "2026-07-11");
  assert.equal(h.weeks.length, 53); // 2026-01-01 是週四 -> 首欄週一 = 2025-12-29
  assert.equal(h.firstDate, "2026-01-01");
  // 首欄:2025-12-29 ~ 12-31 在 2026 之外 -> null;元旦(週四)才有格子
  assert.equal(h.weeks[0][0], null);
  assert.equal(h.weeks[0][2], null);
  assert.equal(h.weeks[0][3].date, "2026-01-01");
  assert.equal(h.weeks[0][3].km, 5);
  assert.equal(h.totalRuns, 1);
});

test("heatmapYear:今天之後的格子為 null(當年還沒過完)", () => {
  const { runs } = M.buildDayRuns([S("2026-07-08", [run(30, 5)])]);
  const h = M.heatmapYear(runs, 2026, "2026-07-11");
  const cells = h.weeks.flat().filter(Boolean);
  assert.equal(cells[cells.length - 1].date, "2026-07-11"); // 最後一格就是今天
});

test("heatmapYear:過去年份整年都有格子,且只計該年的 run", () => {
  const { runs } = M.buildDayRuns([
    S("2025-03-05", [run(30, 5)]),
    S("2026-03-05", [run(30, 5)]), // 別年的不計入 2025
  ]);
  const h = M.heatmapYear(runs, 2025, "2026-07-11");
  const cells = h.weeks.flat().filter(Boolean);
  assert.equal(cells.length, 365);
  assert.equal(cells[0].date, "2025-01-01");
  assert.equal(cells[364].date, "2025-12-31");
  assert.equal(h.totalRuns, 1);
});

test("heatmapYears:最早有資料的年份 ~ 今年,連續且由新到舊", () => {
  const { runs } = M.buildDayRuns([S("2024-05-01", [run(30, 5)])]);
  assert.deepEqual(M.heatmapYears(runs, "2026-07-11"), [2026, 2025, 2024]); // 2025 沒資料也要列,tab 才不跳號
});

test("heatmapYears:沒有任何資料時只回今年", () => {
  assert.deepEqual(M.heatmapYears([], "2026-07-11"), [2026]);
});

test("heatmapYears:未來日期的資料不會憑空生出未來年份的 tab", () => {
  const { runs } = M.buildDayRuns([S("2027-01-01", [run(30, 5)])]);
  assert.deepEqual(M.heatmapYears(runs, "2026-07-11"), [2026]);
});

// ── 炸雞券 ────────────────────────────────────────────────────────────
// 起算週是 2026-07-27(一)。2026-08-03 ~ 08-09、2026-08-10 ~ 08-16 都是起算後的完整週。
const days = (rows) => M.buildDayRuns(rows.map(([d, min, km]) => S(d, [run(min, km)]))).runs;
const GOAL_WEEK = [["2026-08-04", 60, 8], ["2026-08-06", 60, 8], ["2026-08-08", 40, 5]];

test("炸雞券:一週達標核發一張,取得日是最後一項條件被滿足的那天", () => {
  const c = M.coupons(days(GOAL_WEEK), []);
  assert.equal(c.coupons.length, 1);
  assert.equal(c.coupons[0].week_start, "2026-08-03");
  assert.equal(c.coupons[0].week_end, "2026-08-09");
  assert.equal(c.coupons[0].earned_on, "2026-08-08");
  assert.equal(c.coupons[0].status, "available");
  assert.equal(c.available, 1);
  assert.equal(c.used, 0);
});

test("炸雞券:分鐘數先滿、次數後滿 -> 取得日是第三次那天", () => {
  const c = M.coupons(days([["2026-08-04", 60, 8], ["2026-08-06", 100, 12], ["2026-08-08", 20, 3]]), []);
  assert.equal(c.coupons[0].earned_on, "2026-08-08");
});

test("炸雞券:次數夠但分鐘數不足 -> 不發券", () => {
  const c = M.coupons(days([["2026-08-04", 30, 5], ["2026-08-06", 30, 5], ["2026-08-08", 30, 5]]), []);
  assert.deepEqual(c.coupons, []);
});

test("炸雞券:分鐘數夠但次數不足 -> 不發券", () => {
  const c = M.coupons(days([["2026-08-04", 90, 12], ["2026-08-06", 90, 12]]), []);
  assert.deepEqual(c.coupons, []);
});

test("炸雞券:一週最多一張,同週跑再多次也一樣", () => {
  const c = M.coupons(days(GOAL_WEEK.concat([["2026-08-09", 60, 8]])), []);
  assert.equal(c.coupons.length, 1);
});

test("炸雞券:起算週之前的達標週不回溯發券", () => {
  const c = M.coupons(days([["2026-07-21", 60, 8], ["2026-07-22", 60, 8], ["2026-07-23", 40, 5]]), []);
  assert.deepEqual(c.coupons, []);
});

test("炸雞券:起算週本身算數", () => {
  const c = M.coupons(days([["2026-07-28", 60, 8], ["2026-07-29", 60, 8], ["2026-07-30", 40, 5]]), []);
  assert.equal(c.coupons.length, 1);
  assert.equal(c.coupons[0].week_start, M.REWARD_START_WEEK);
});

test("炸雞券:使用紀錄把券標成 used,帶 used_on 與 note", () => {
  const c = M.coupons(days(GOAL_WEEK), [
    { week_start: "2026-08-03", used_on: "2026-08-10", note: "繼光香香雞" },
  ]);
  assert.equal(c.coupons[0].status, "used");
  assert.equal(c.coupons[0].used_on, "2026-08-10");
  assert.equal(c.coupons[0].note, "繼光香香雞");
  assert.equal(c.available, 0);
  assert.equal(c.used, 1);
  assert.deepEqual(c.problems, []);
});

test("炸雞券:使用紀錄指向沒發過券的週 -> 進 problems,且不吃掉別週的券", () => {
  const c = M.coupons(days(GOAL_WEEK), [{ week_start: "2026-08-10", used_on: "2026-08-11" }]);
  assert.equal(c.problems.length, 1);
  assert.equal(c.problems[0].week_start, "2026-08-10");
  assert.equal(c.coupons[0].status, "available");
});

test("炸雞券:同一張券用兩次 -> 第二筆進 problems,保留第一筆", () => {
  const c = M.coupons(days(GOAL_WEEK), [
    { week_start: "2026-08-03", used_on: "2026-08-10" },
    { week_start: "2026-08-03", used_on: "2026-08-11" },
  ]);
  assert.equal(c.used, 1);
  assert.equal(c.coupons[0].used_on, "2026-08-10");
  assert.equal(c.problems.length, 1);
});

test("炸雞券:used_on 早於取得日 -> 進 problems,券維持可用", () => {
  const c = M.coupons(days(GOAL_WEEK), [{ week_start: "2026-08-03", used_on: "2026-08-05" }]);
  assert.equal(c.problems.length, 1);
  assert.equal(c.coupons[0].status, "available");
});

test("炸雞券:缺 week_start 或 used_on 的使用紀錄 -> 進 problems", () => {
  const c = M.coupons(days(GOAL_WEEK), [{ week_start: "2026-08-03" }, { used_on: "2026-08-10" }]);
  assert.equal(c.problems.length, 2);
  assert.equal(c.used, 0);
});

test("炸雞券:多張券由新到舊排列", () => {
  const c = M.coupons(
    days(GOAL_WEEK.concat([["2026-08-11", 60, 8], ["2026-08-13", 60, 8], ["2026-08-15", 40, 5]])), []);
  assert.deepEqual(c.coupons.map((x) => x.week_start), ["2026-08-10", "2026-08-03"]);
  assert.equal(c.available, 2);
});

test("炸雞券:沒有資料 / redemptions 傳 null 都不會炸", () => {
  const c = M.coupons([], null);
  assert.deepEqual(c.coupons, []);
  assert.equal(c.available, 0);
  assert.deepEqual(c.problems, []);
});

test("炸雞券:達標券的 id 是 quest:<week_start>,kind 是 quest", () => {
  const c = M.coupons(days(GOAL_WEEK), []);
  assert.equal(c.coupons[0].id, "quest:2026-08-03");
  assert.equal(c.coupons[0].kind, "quest");
  assert.equal(c.coupons[0].reason, null);
});

// ── 特別券(手動核發)──────────────────────────────────────────────────
const GRANT = { id: "special:2026-08-01-launch", granted_on: "2026-08-01", reason: "系統上線" };

test("特別券:沒達標也發得出來,kind 是 special 並帶 reason", () => {
  const c = M.coupons([], [], [GRANT]);
  assert.equal(c.coupons.length, 1);
  assert.equal(c.coupons[0].id, GRANT.id);
  assert.equal(c.coupons[0].kind, "special");
  assert.equal(c.coupons[0].earned_on, "2026-08-01");
  assert.equal(c.coupons[0].reason, "系統上線");
  assert.equal(c.coupons[0].week_start, null);
  assert.equal(c.available, 1);
  assert.deepEqual(c.problems, []);
});

test("特別券:不綁週,同一週的達標券照樣會另外發一張", () => {
  // 特別券發在 08-01;GOAL_WEEK 的達標券在 08-03 那一週,兩張要並存
  const c = M.coupons(days(GOAL_WEEK), [], [GRANT]);
  assert.equal(c.coupons.length, 2);
  assert.deepEqual(c.coupons.map((x) => x.kind), ["quest", "special"]); // 新的在前
  assert.equal(c.available, 2);
});

test("特別券:grant 缺 id / granted_on / reason -> 進 problems,不發券", () => {
  const c = M.coupons([], [], [
    { granted_on: "2026-08-01", reason: "x" },
    { id: "special:a", reason: "x" },
    { id: "special:b", granted_on: "2026-08-01" },
  ]);
  assert.equal(c.problems.length, 3);
  assert.deepEqual(c.coupons, []);
});

test("特別券:id 不可冒充達標券", () => {
  const c = M.coupons(days(GOAL_WEEK), [], [
    { id: "quest:2026-08-03", granted_on: "2026-08-01", reason: "想蓋掉達標券" },
  ]);
  assert.equal(c.problems.length, 1);
  assert.equal(c.coupons.length, 1); // 原本那張達標券沒被動到
  assert.equal(c.coupons[0].kind, "quest");
});

test("特別券:重複的 id -> 第二筆進 problems", () => {
  const c = M.coupons([], [], [GRANT, { ...GRANT, reason: "重複" }]);
  assert.equal(c.coupons.length, 1);
  assert.equal(c.coupons[0].reason, "系統上線");
  assert.equal(c.problems.length, 1);
});

test("特別券:可以用 id 兌換,規則跟達標券一樣", () => {
  const c = M.coupons([], [{ id: GRANT.id, used_on: "2026-08-02", note: "鹹酥雞" }], [GRANT]);
  assert.equal(c.coupons[0].status, "used");
  assert.equal(c.coupons[0].note, "鹹酥雞");
  assert.equal(c.used, 1);
  assert.deepEqual(c.problems, []);
});

test("特別券:used_on 早於發券日 -> 進 problems,券維持可用", () => {
  const c = M.coupons([], [{ id: GRANT.id, used_on: "2026-07-31" }], [GRANT]);
  assert.equal(c.problems.length, 1);
  assert.equal(c.coupons[0].status, "available");
});

test("炸雞券:使用紀錄指向不存在的券 -> 進 problems", () => {
  const c = M.coupons([], [{ id: "special:nope", used_on: "2026-08-02" }], [GRANT]);
  assert.equal(c.problems.length, 1);
  assert.equal(c.problems[0].reason, "no such coupon");
  assert.equal(c.coupons[0].status, "available");
});

// ---- 睡眠與用藥 -------------------------------------------------------------
// 一晚一檔的事實紀錄。集章卡最右一格是「昨晚」,今晚不佔格子。

const night = (date, over) =>
  Object.assign(
    {
      date,
      medication: { taken: true },
      bedtime: "23:10",
      wake_time: "07:00",
      quality: 3,
      morning_grogginess: false,
    },
    over
  );
const entry = (file, data) => ({ file, data });

test("躺床時數:跨午夜要加 24 小時", () => {
  assert.equal(M.timeInBed(night("2026-08-04")), 7 + 50 / 60);
});

test("躺床時數:同日內的區間不加 24 小時", () => {
  assert.equal(M.timeInBed(night("2026-08-04", { bedtime: "01:00", wake_time: "09:30" })), 8.5);
});

test("躺床時數:wake_time 等於 bedtime 視為整整 24 小時,不是 0", () => {
  assert.equal(M.timeInBed(night("2026-08-04", { bedtime: "23:00", wake_time: "23:00" })), 24);
});

test("躺床時數:時間格式壞掉回 null,不亂算一個數字出來", () => {
  assert.equal(M.timeInBed(night("2026-08-04", { bedtime: "25:00" })), null);
  assert.equal(M.timeInBed(night("2026-08-04", { wake_time: "7:00" })), null);
});

test("formatHours 補零到分鐘", () => {
  assert.equal(M.formatHours(7 + 50 / 60), "7h50");
  assert.equal(M.formatHours(6 + 5 / 60), "6h05");
  assert.equal(M.formatHours(null), "—");
});

test("集章卡:從第一筆紀錄畫到昨晚,今晚不佔格子", () => {
  const st = M.sleepStamps([night("2026-08-04"), night("2026-08-05")], "2026-08-05");
  assert.deepEqual(st.map((s) => s.date), ["2026-08-04"]);
});

test("集章卡:開始記錄之前的日子不畫格子", () => {
  const st = M.sleepStamps([night("2026-08-04")], "2026-08-05");
  assert.equal(st.length, 1);
  assert.equal(st[0].date, "2026-08-04");
});

test("集章卡:只有今晚一筆,連一格都不畫", () => {
  assert.deepEqual(M.sleepStamps([night("2026-08-05")], "2026-08-05"), []);
});

test("集章卡:一筆資料都沒有回空陣列,不會爆掉", () => {
  assert.deepEqual(M.sleepStamps([], "2026-08-05"), []);
});

test("集章卡:資料超過上限時只畫最近 STAMP_NIGHTS 格", () => {
  const ns = [];
  for (let i = 1; i <= 30; i++) ns.push(night(M.addDays("2026-08-05", -i)));
  const st = M.sleepStamps(ns, "2026-08-05");
  assert.equal(st.length, M.STAMP_NIGHTS);
  assert.equal(st[st.length - 1].date, "2026-08-04");
  assert.equal(st[0].date, M.addDays("2026-08-05", -M.STAMP_NIGHTS));
});

test("集章卡:範圍內的漏記仍然是空格,那是真的漏記", () => {
  const st = M.sleepStamps([night("2026-08-01"), night("2026-08-04")], "2026-08-05");
  assert.deepEqual(st.map((s) => s.state), ["taken", "none", "none", "taken"]);
});

test("集章卡:三種狀態各自對上", () => {
  const st = M.sleepStamps(
    [night("2026-08-01"), night("2026-08-04", { medication: { taken: false } })],
    "2026-08-05"
  );
  const byDate = Object.fromEntries(st.map((s) => [s.date, s.state]));
  assert.equal(byDate["2026-08-01"], "taken");
  assert.equal(byDate["2026-08-04"], "skipped");
  assert.equal(byDate["2026-08-02"], "none");
});

test("lastNight 取的是昨晚,不是今晚", () => {
  const ns = [night("2026-08-04", { quality: 2 }), night("2026-08-05", { quality: 5 })];
  assert.equal(M.lastNight(ns, "2026-08-05").quality, 2);
});

test("lastNight:昨晚沒記錄回 null", () => {
  assert.equal(M.lastNight([night("2026-08-03")], "2026-08-05"), null);
});

test("驗證:完整的一筆沒有問題", () => {
  assert.deepEqual(M.validateNights([entry("2026-08-04.json", night("2026-08-04"))], "2026-08-05"), []);
});

test("驗證:必填欄位缺一不可", () => {
  const required = ["bedtime", "wake_time", "quality", "morning_grogginess", "medication"];
  required.forEach((field) => {
    const n = night("2026-08-04");
    delete n[field];
    const problems = M.validateNights([entry("2026-08-04.json", n)], "2026-08-05");
    assert.equal(problems.length, 1, field + " 缺漏時應該只報一個問題");
  });
});

test("驗證:必填欄位是 null 一樣擋下來", () => {
  const problems = M.validateNights([entry("2026-08-04.json", night("2026-08-04", { quality: null }))], "2026-08-05");
  assert.equal(problems.length, 1);
});

test("驗證:medication.taken 必須是 true/false,不收 0/1 或字串", () => {
  [{ taken: 1 }, { taken: "yes" }, {}].forEach((med) => {
    const problems = M.validateNights([entry("2026-08-04.json", night("2026-08-04", { medication: med }))], "2026-08-05");
    assert.equal(problems.length, 1);
  });
});

test("驗證:medication.taken 為 false 是完全合法的紀錄", () => {
  const n = night("2026-08-04", { medication: { taken: false } });
  assert.deepEqual(M.validateNights([entry("2026-08-04.json", n)], "2026-08-05"), []);
});

test("驗證:quality 只收 1–5 的整數", () => {
  [0, 6, 3.5, "3"].forEach((q) => {
    const problems = M.validateNights([entry("2026-08-04.json", night("2026-08-04", { quality: q }))], "2026-08-05");
    assert.equal(problems.length, 1, "quality=" + q + " 應該被擋下");
  });
});

test("驗證:時間格式必須是 HH:MM", () => {
  ["7:00", "23:5", "2300", ""].forEach((t) => {
    const problems = M.validateNights([entry("2026-08-04.json", night("2026-08-04", { bedtime: t }))], "2026-08-05");
    assert.equal(problems.length, 1, "bedtime=" + t + " 應該被擋下");
  });
});

test("驗證:檔名日期與檔內 date 不一致 -> 報錯", () => {
  const problems = M.validateNights([entry("2026-08-03.json", night("2026-08-04"))], "2026-08-05");
  assert.equal(problems.length, 1);
  assert.match(problems[0].reason, /檔名日期/);
});

test("驗證:date 晚於今天 -> 報錯", () => {
  const problems = M.validateNights([entry("2026-08-06.json", night("2026-08-06"))], "2026-08-05");
  assert.equal(problems.length, 1);
  assert.match(problems[0].reason, /晚於今天/);
});

test("驗證:不存在的日期(2026-02-30)擋下來", () => {
  const problems = M.validateNights([entry("2026-02-30.json", night("2026-02-30"))], "2026-08-05");
  assert.ok(problems.length >= 1);
});

test("驗證:同一個日期出現兩次 -> 報錯", () => {
  const problems = M.validateNights(
    [entry("2026-08-04.json", night("2026-08-04")), entry("2026-08-04.json", night("2026-08-04"))],
    "2026-08-05"
  );
  assert.equal(problems.length, 1);
  assert.match(problems[0].reason, /重複/);
});

test("驗證:night_wakes 選填,但給了就要是 ≥ 0 的整數", () => {
  assert.deepEqual(M.validateNights([entry("2026-08-04.json", night("2026-08-04", { night_wakes: 0 }))], "2026-08-05"), []);
  assert.equal(M.validateNights([entry("2026-08-04.json", night("2026-08-04", { night_wakes: -1 }))], "2026-08-05").length, 1);
  assert.equal(M.validateNights([entry("2026-08-04.json", night("2026-08-04", { night_wakes: 1.5 }))], "2026-08-05").length, 1);
});

test("驗證:漏記某幾晚不是錯誤,不進 problems", () => {
  const ns = [entry("2026-08-01.json", night("2026-08-01")), entry("2026-08-04.json", night("2026-08-04"))];
  assert.deepEqual(M.validateNights(ns, "2026-08-05"), []);
});

test("驗證:一次回報所有壞掉的欄位,不是只報第一個", () => {
  const n = night("2026-08-04", { quality: 9, bedtime: "nope", morning_grogginess: "yes" });
  assert.equal(M.validateNights([entry("2026-08-04.json", n)], "2026-08-05").length, 3);
});
