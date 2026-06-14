// 純轉換(不連網、不寫回):讀 _content.json,套用已確認的還原/單位/刪除規則,
// 產出 _proposed.json(每筆 session 的 §5 JSON)。同時印出安全檢查(未對應的動作名/重量)。
const fs = require("fs");
const path = require("path");

const content = JSON.parse(
  fs.readFileSync(path.join(__dirname, "_content.json"), "utf8")
);

// --- 規則 ---
const UNIT = {
  "Bench Press": "lb",
  "Split Squat": "lb",
  "Lat Pulldown": "kg",
  "Seated Row": "kg",
  "Triceps Pushdown": "kg",
  "Sumo Squat": "kg",
  "Lateral Raise": "kg",
  "Face Pull": "kg",
};

// 動作名正規化;回傳 {key, drop} 。drop=true 代表本次決議移除。
function normName(raw) {
  const s = raw.trim();
  const has = (t) => s.includes(t);
  if (has("HIIT")) return { key: "HIIT" };
  if (has("Zone 2") || has("有氧")) return { key: "Zone 2" };
  if (has("臥推") || has("Bench")) return { key: "Bench Press" };
  // 三頭(三頭下拉/三頭下壓)要先判,否則「三頭下拉」會被「下拉」誤判成 Lat Pulldown
  if (has("三頭") || has("Triceps")) return { key: "Triceps Pushdown" };
  if (has("下拉") || has("Lat Pulldown")) return { key: "Lat Pulldown" };
  if (has("划船") || has("Seated Row")) return { key: "Seated Row" };
  if (has("Sumo")) return { key: "Sumo Squat" };
  if (has("Split")) return { key: "Split Squat" };
  if (has("哈克") || has("Hack")) return { key: "Hack Squat", drop: "hack" };
  if (has("Face Pull")) return { key: "Face Pull" };
  if (has("側平舉") || has("Lateral Raise")) {
    // 啞鈴期(無「滑輪/Cable」字樣)整段刪除,只留滑輪
    const cable = has("滑輪") || has("Cable");
    return { key: "Lateral Raise", drop: cable ? undefined : "dumbbell-lateral" };
  }
  return { key: s, unknown: true };
}

const warnings = [];

function parseNum(cell) {
  const m = String(cell).match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}

// 重量還原:早期被 ×0.45359237 的值 → 機器讀數;Bench 16kg 面 → 35 lb。
function restore(key, w) {
  if (w === null) return null;
  if (key === "Bench Press") {
    const m = { "15.88": 35, "18.14": 40, "16": 35 };
    return m[String(w)] ?? w; // 35 / "35kg"→35 原樣
  }
  const m = { "9.07": 20, "10.89": 24, "5.67": 12.5, "4.54": 10, "6.8": 15 };
  return m[String(w)] ?? w;
}

function sessionNote(blocks) {
  // 收集 📝 區段之後的段落/清單文字當作 session 層級 note
  const out = [];
  let inNotes = false;
  for (const b of blocks) {
    if (b.kind === "table") continue;
    const txt = (b.text || "").trim();
    if (!txt) continue;
    if (txt.startsWith("📝")) {
      inNotes = true;
      continue;
    }
    if (inNotes) out.push(txt);
  }
  return out.join("\n");
}

function buildStrength(table) {
  // 同動作多列 → 合併到同一 exercise 的 sets;逐組展開 (sets × reps)
  const order = [];
  const byKey = {};
  for (let i = 1; i < table.rows.length; i++) {
    const r = table.rows[i];
    if (!r.length || !r[0]) continue;
    const { key, drop, unknown } = normName(r[0]);
    if (unknown) warnings.push(`未知動作: "${r[0]}"`);
    if (drop) continue; // Hack / 啞鈴側平舉 移除
    const wRaw = parseNum(r[1]);
    const w = restore(key, wRaw);
    const sets = parseNum(r[2]) ?? 1;
    const reps = parseNum(r[3]);
    const note = (r[4] || "").trim();
    if (!byKey[key]) {
      byKey[key] = { exercise: key, unit: UNIT[key] || "kg", sets: [], notes: [] };
      order.push(key);
    }
    for (let s = 0; s < sets; s++) {
      byKey[key].sets.push({ weight: w, reps: reps });
    }
    if (note) byKey[key].notes.push(note);
  }
  return order.map((k) => {
    const e = byKey[k];
    const o = { exercise: e.exercise, unit: e.unit, sets: e.sets };
    if (e.notes.length) o.note = e.notes.join("；");
    return o;
  });
}

function buildCardio(table) {
  const out = [];
  for (let i = 1; i < table.rows.length; i++) {
    const r = table.rows[i];
    if (!r.length || !r[0]) continue;
    const { key } = normName(r[0]);
    const duration = parseNum(r[1]);
    const extra = [];
    // 名稱括號內補充(如「(跑步 7 km/h)」)
    const paren = r[0].match(/[（(]([^)）]+)[)）]/);
    if (paren) extra.push(paren[1].trim());
    for (let c = 2; c < r.length; c++) if ((r[c] || "").trim()) extra.push(r[c].trim());
    const o = { exercise: key, duration_min: duration };
    if (extra.length) o.note = extra.join(", ");
    out.push(o);
  }
  return out;
}

const proposed = [];
for (const s of content) {
  const table = s.content.find((b) => b.kind === "table");
  const isCardio = s.Type === "Cardio";
  let json;
  if (isCardio) {
    json = { cardio: table ? buildCardio(table) : [] };
  } else {
    json = { strength: table ? buildStrength(table) : [] };
  }
  const note = sessionNote(s.content);
  if (note) json.note = note;
  proposed.push({ id: s.id, Date: s.Date, Type: s.Type, json });
}

fs.writeFileSync(
  path.join(__dirname, "_proposed.json"),
  JSON.stringify(proposed, null, 2),
  "utf8"
);

// 安全檢查
const empty = proposed.filter(
  (p) => (p.json.strength && p.json.strength.length === 0) || (p.json.cardio && p.json.cardio.length === 0)
);
console.log("sessions:", proposed.length);
console.log("empty (無動作):", empty.map((e) => `${e.Date}/${e.Type}`).join(", ") || "無");
console.log("warnings:", warnings.length ? [...new Set(warnings)] : "無");
