const state = {
  selected: [],
  imported: [],
  notice: "",
  program: "cse",   // key into PROGRAMS (curriculum-data.js), same list as the CGPA calculator
  semester: 0,      // recommended semester number within the program (0 = none chosen)
  focus: "",        // key of the recommended chip currently shown in the list
  picks: {},        // elective slot key -> chosen course code
  sort: []          // section sort criteria, in priority order (first ticked = main), see SORT_GROUPS
};

const DEPARTMENTS = [
  ["CSE", "Department of Computer Science and Engineering"],
  ["ECE", "Department of Electrical and Computer Engineering"],
  ["EEE", "Department of Electrical and Electronic Engineering"],
  ["CE", "Department of Civil Engineering"],
  ["ENG", "Department of English"],
  ["MAT", "Department of Mathematics and Data Science"],
  ["PHY", "Department of Physics"],
  ["BA", "Department of Business Administration"],
  ["ECO", "Department of Economics"],
  ["LAW", "Department of Law"],
  ["IS", "Department of Information Studies"],
  ["GEB", "Department of Genetic Engineering and Biotechnology"],
  ["SOC", "Department of Sociology"],
  ["SR", "Department of Social Relations"],
  ["GDLFM", "GDLFM"],
  ["EDC", "Entrepreneurship Development Centre"],
  ["DSS", "DSS"],
  ["MBA", "MBA and EMBA Program"]
];
const knownDept = new Map(DEPARTMENTS);

function getPlannerData() {

  if (typeof PLANNER_DATA !== "undefined") return PLANNER_DATA;
  return window.PLANNER_DATA || {};
}
/* (ENG101 -> ENG7101). Treats both as the same course. */
function codeVariants(code) {
  const m = String(code).toUpperCase().match(/^([A-Z]+)(\d+)([A-Z]?)$/);
  if (!m) return [code];
  const [, prefix, digits, suffix] = m;
  const out = [`${prefix}${digits}${suffix}`];
  if (digits.length === 3) out.push(`${prefix}7${digits}${suffix}`);
  else if (digits.length === 4 && digits[0] === "7") out.push(`${prefix}${digits.slice(1)}${suffix}`);
  return out;
}
function curriculumEntry(code) {
  if (typeof COURSES === "undefined") return null;
  for (const c of codeVariants(code)) if (COURSES[c]) return COURSES[c];
  return null;
}
function plannerMeta(code) {
  const entry = curriculumEntry(code);
  if (entry) return entry[0];
  const meta = getPlannerData().courseMeta || {};
  for (const c of codeVariants(code)) if (meta[c]) return meta[c];
  return code;
}
function plannerCredit(code) {
  const entry = curriculumEntry(code);
  if (entry && entry[1] != null && Number.isFinite(Number(entry[1]))) return Number(entry[1]);
  const credits = getPlannerData().credits || {};
  for (const c of codeVariants(code)) if (credits[c] != null) return Number(credits[c]);
  return null;
}

async function importDepartmentPDF(file) {
  if (!window.pdfjsLib) throw new Error("PDF support could not load.");
  const parsed = await parseOfferedCoursesPdf(file);
  const dept = inferDepartment(file.name, parsed.codes);
  return { department: dept.code, departmentName: dept.name, fileName: file.name, sections: parsed.sections };
}

async function parseOfferedCoursesPdf(file) {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
  const allSections = new Map();
  const codes = new Set();
  for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
    const page = await pdf.getPage(pageNo);
    const content = await page.getTextContent();
    const records = parseOfferedPage(content.items);
    for (const rec of records) {
      codes.add(rec.code);
      const key = `${rec.code}::${rec.section}`;
      if (!allSections.has(key)) allSections.set(key, { code: rec.code, section: rec.section, meetings: [], enrolled: null, capacity: null, dedicated: "" });
      const s = allSections.get(key);
      if (s.capacity == null && rec.capacity) { s.enrolled = rec.capacity.enrolled; s.capacity = rec.capacity.total; }
      if (!s.dedicated && rec.dedicated) s.dedicated = rec.dedicated;
      if (!s.meetings.some(m => m.day === rec.meeting.day && m.start === rec.meeting.start && m.end === rec.meeting.end && m.room === rec.meeting.room)) s.meetings.push(rec.meeting);
    }
  }
  const sections = [...allSections.values()].filter(s => s.meetings.length);
  if (!sections.length) throw new Error("No offered course sections were detected in this department PDF.");
  return { sections, codes: [...codes] };
}

function parseOfferedPage(items) {
  const words = items.filter(i => String(i.str || "").trim()).map(i => ({
    text: String(i.str).trim(), x: Number(i.transform?.[4] || 0), y: Number(i.transform?.[5] || 0)
  }));

  const courseWords = words.filter(w => w.x < 90);
  const sectionWords = words.filter(w => w.x >= 88 && w.x < 130);
  const timingWords = words.filter(w => w.x >= 130 && w.x < 225);
  const roomWords = words.filter(w => w.x >= 225 && w.x < 410);
  const deptWords = words.filter(w => w.x >= 410 && w.x < 505);
  const capacityWords = words.filter(w => w.x >= 505);

  const courseRows = clusterByY(courseWords, 2.5).map(r => ({ y: r.centerY, text: r.text }));
  const sectionRows = clusterByY(sectionWords, 2.5).map(r => ({ y: r.centerY, text: r.text }));
  const timingRows = clusterByY(timingWords, 2.5);
  const roomRows = clusterByY(roomWords, 2.5);
  const deptRows = clusterByY(deptWords, 2.5);
  const capacityRows = clusterByY(capacityWords, 2.5);
  const timingBlocks = [];

  for (let i = 0; i < timingRows.length; i++) {
    const a = timingRows[i].text;
    const start = a.match(/^([SMTWRFA]{1,7})\s+(\d{1,2}:\d{2}\s*(?:AM|PM))\s*-\s*$/i) || a.match(/^([SMTWRFA]{1,7})\s+(\d{1,2}:\d{2}\s*(?:AM|PM))\s*-\s*(\d{1,2}:\d{2}\s*(?:AM|PM))$/i);
    if (!start) continue;
    let endClock = start[3] || null;
    let blockY = timingRows[i].centerY;
    if (!endClock && timingRows[i + 1]) {
      const end = timingRows[i + 1].text.match(/^(\d{1,2}:\d{2}\s*(?:AM|PM))$/i);
      if (end) { endClock = end[1]; blockY = (timingRows[i].centerY + timingRows[i + 1].centerY) / 2; i++; }
    }
    if (!endClock) continue;
    const startMin = toMinutes(start[2]);
    const endMin = toMinutes(endClock);
    if (endMin <= startMin) continue;
    const days = [...start[1].toUpperCase()].map(ch => DAY_MAP[ch]).filter(Boolean);
    if (!days.length) continue;
    timingBlocks.push({ y: blockY, days, start: startMin, end: endMin });
  }

  const records = [];
  for (const block of timingBlocks) {
    const course = nearestRow(courseRows, block.y, /\b[A-Z]{2,8}_?\d{3,5}[A-Z]?\b/i);
    if (!course) continue;
    const code = normalizeCourseCode((course.text.match(/\b([A-Z]{2,8}_?\d{3,5}[A-Z]?)\b/i) || ["", course.text])[1]);
    const sectionRow = nearestRow(sectionRows, block.y, /^\d{1,3}$/);
    if (!sectionRow) continue;
    const section = sectionRow.text.replace(/\s+/g, "");
    if (!/^\d{1,3}$/.test(section)) continue;
    const room = nearestRoom(roomRows, block.y);
    const capacity = nearestCapacity(capacityRows, block.y);
    const dedicated = nearestDedicated(deptRows, block.y);
    for (const day of block.days) records.push({ code, section, capacity, dedicated, meeting: { day, start: block.start, end: block.end, room } });
  }
  return records;
}

function clusterByY(words, tolerance) {
  const rows = [];
  [...words].sort((a, b) => b.y - a.y || a.x - b.x).forEach(word => {
    let row = rows.find(r => Math.abs(r.y - word.y) <= tolerance);
    if (!row) { row = { y: word.y, items: [] }; rows.push(row); }
    row.items.push(word);
  });
  return rows.sort((a, b) => b.y - a.y).map(r => ({
    centerY: r.items.reduce((s, x) => s + x.y, 0) / r.items.length,
    text: r.items.sort((a, b) => a.x - b.x).map(x => x.text).join(" ").replace(/\s+/g, " ").trim()
  }));
}
function nearestRow(rows, y, test) {
  return rows.filter(r => !test || test.test(r.text)).sort((a, b) => Math.abs(a.y - y) - Math.abs(b.y - y))[0] || null;
}
function nearestRoom(rows, y) {
  // A long room name wraps onto two lines (also across a page break), so join every line around the block.
  const nearby = rows.filter(r => Math.abs(r.centerY - y) <= 8).sort((a, b) => b.centerY - a.centerY);
  if (!nearby.length) return "Room TBA";
  let text = nearby.map(r => r.text).join(" ");
  text = text.replace(/\b\d+\s*\/\s*\d+\s*$/, "").trim();
  // Capacity/dedicated-department text can occasionally sneak into the room span.
  text = text.replace(/\s+(?:CSE|EEE|ECE|ENG|MAT|PHY|LAW|MDS|ECO|BA|SOC|SR|GEB|IS|DSS|MBA)\s*$/i, "").trim();
  return text || "Room TBA";
}
/* "19 / 40" -> { enrolled: 19, total: 40 }. The capacity and dedicated-department columns sit on the same line as the course code. */
function nearestCapacity(rows, y) {
  const row = rows.filter(r => Math.abs(r.centerY - y) <= 8 && /^\d+\s*\/\s*\d+$/.test(r.text)).sort((a, b) => Math.abs(a.centerY - y) - Math.abs(b.centerY - y))[0];
  if (!row) return null;
  const [enrolled, total] = row.text.split("/").map(n => Number(n.trim()));
  return { enrolled, total };
}
function nearestDedicated(rows, y) {
  const row = rows.filter(r => Math.abs(r.centerY - y) <= 8).sort((a, b) => Math.abs(a.centerY - y) - Math.abs(b.centerY - y))[0];
  return row ? row.text.trim() : "";
}
function normalizeCourseCode(code) { return String(code).replace(/_/g, "").toUpperCase(); }
function inferDepartment(fileName, codes) {
  const base = fileName.toUpperCase();
  const direct = [...knownDept.entries()].find(([code]) => new RegExp(`(^|[^A-Z])${code}([^A-Z]|$)`).test(base));
  if (direct) return { code: direct[0], name: direct[1] };
  const prefixCounts = {};
  for (const code of codes) {
    const prefix = (code.match(/^[A-Z]+/) || [""])[0];
    prefixCounts[prefix] = (prefixCounts[prefix] || 0) + 1;
  }
  const bestPrefix = Object.entries(prefixCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
  if (bestPrefix && knownDept.has(bestPrefix)) return { code: bestPrefix, name: knownDept.get(bestPrefix) };
  return { code: `IMPORTED-${Date.now()}`, name: `Imported — ${fileName.replace(/\.pdf$/i, "")}` };
}

function renderImported() {
  const el = $("importedDeptSummary");
  if (!state.imported.length) { el.innerHTML = "No department data imported"; return; }
  el.innerHTML = state.imported.map(d => `<span class="imported-pill"><strong>${esc(d.department)}</strong><span>${d.sections.length} sections</span><button type="button" data-remove-dept="${esc(d.department)}" aria-label="Remove ${esc(d.departmentName)}">×</button></span>`).join("");
  el.querySelectorAll("[data-remove-dept]").forEach(btn => btn.addEventListener("click", () => {
    state.imported = state.imported.filter(d => d.department !== btn.dataset.removeDept);
    reconcile(); renderImported(); renderCourseList(); renderSelected();
  }));
}
function allSections() { return state.imported.flatMap(d => d.sections.map(s => ({ ...s, department: d.department, departmentName: d.departmentName }))); }

/* ---------- Program / semester (recommended courses come from the curriculum data) ---------- */
function programSemesters() {
  const p = PROGRAMS[state.program];
  if (!p) return [];
  const out = [];
  let no = 0;
  for (const year of p.years) for (const sem of year.semesters) out.push({ no: ++no, year: year.name, courses: sem.courses });
  return out;
}
function renderProgramControls() {
  const programSelect = $("programSelect");
  programSelect.innerHTML = Object.values(PROGRAMS).map(p => `<option value="${esc(p.key)}">${esc(p.label)}</option>`).join("");
  if (!PROGRAMS[state.program]) state.program = Object.keys(PROGRAMS)[0];
  programSelect.value = state.program;
  const sems = programSemesters();
  if (!sems.some(s => s.no === state.semester)) state.semester = 0;
  $("recommendedSemester").innerHTML = `<option value="">Recommended semester</option>` + sems.map(s => `<option value="${s.no}">Semester ${s.no}</option>`).join("");
  $("recommendedSemester").value = state.semester ? String(state.semester) : "";
}
function slotPoolGroups(slot) {
  const p = PROGRAMS[state.program];
  let pool = slot.pool;
  if (!pool && slot.kind === "gen_ed") pool = p.generalEd;
  if (!pool && p.majorTracks && (slot.kind === "major" || slot.kind === "nonmajor")) {
    if (slot.kind === "major") return Object.entries(p.majorTracks).map(([k, codes]) => ({ label: p.trackLabels?.[k] || k, codes }));
    pool = Object.values(p.majorTracks).flat();
  }
  return pool && pool.length ? [{ label: "", codes: [...new Set(pool)] }] : [];
}

/* ---------- Offered sections ---------- */
function sectionIndex() {
  const idx = new Map();
  for (const d of state.imported) for (const s of d.sections) {
    if (!idx.has(s.code)) idx.set(s.code, []);
    idx.get(s.code).push({ ...s, department: d.department, departmentName: d.departmentName });
  }
  return idx;
}
function sectionsFor(code, idx) {
  return codeVariants(code).flatMap(c => idx.get(c) || []);
}

/* ---------- Rendering ---------- */
function renderImported() {
  const el = $("importedDeptSummary");
  if (!state.imported.length) { el.innerHTML = "No department data imported"; return; }
  el.innerHTML = state.imported.map(d => `<span class="imported-pill"><strong>${esc(d.department)}</strong><span>${d.sections.length} sections</span><button type="button" data-remove-dept="${esc(d.department)}" aria-label="Remove ${esc(d.departmentName)}">×</button></span>`).join("");
  el.querySelectorAll("[data-remove-dept]").forEach(btn => btn.addEventListener("click", () => {
    state.imported = state.imported.filter(d => d.department !== btn.dataset.removeDept);
    reconcile(); renderImported(); renderCourseList(); renderSelected();
  }));
}
function normalizeQuery(text) { return String(text).toLowerCase().replace(/[\s_-]+/g, ""); }
function courseMatches(code, q) {
  return normalizeQuery(code).includes(normalizeQuery(q)) || plannerMeta(code).toLowerCase().includes(q.toLowerCase());
}
function emptyList(icon, title, text) {
  return `<div class="list-empty"><div class="placeholder-icon">${icon}</div><strong>${esc(title)}</strong><span>${esc(text)}</span></div>`;
}

function renderCourseList() {
  renderRecommendedChips();
  const q = $("courseSearch").value.trim();
  let html;
  if (q) html = renderSearchResults(q);
  else if (state.focus && recommendedEntry(state.focus)) html = renderFocused();
  else if (state.imported.length) html = renderAllImported();
  else html = emptyList("⇧", "Import the offered-courses PDF", "Then pick a recommended course above, or search by course code.");
  $("courseList").innerHTML = html;
}
function deptBlock(dept, q) {
  const seen = new Set(); const codes = [];
  for (const s of dept.sections) if (!seen.has(s.code)) { seen.add(s.code); codes.push(s.code); }
  const courses = codes.filter(code => !q || courseMatches(code, q)).map(code => renderCourseBlock(code, dept.sections.filter(s => s.code === code).map(s => ({ ...s, department: dept.department, departmentName: dept.departmentName })))).join("");
  if (!courses) return "";
  return `<section class="dept-block"><header class="dept-head"><div><div class="dept-kicker">IMPORTED</div><strong>${esc(dept.departmentName)}</strong></div><span>${dept.sections.length} sections</span></header>${courses}</section>`;
}
function renderAllImported() {
  return state.imported.map(d => deptBlock(d, "")).join("");
}
function renderSearchResults(q) {
  if (!state.imported.length) return emptyList("⇧", "Import the offered-courses PDF first", "Search looks through every course in the imported PDFs.");
  return state.imported.map(d => deptBlock(d, q)).join("") || emptyList("🔍", "No matching courses", "Try another course code or name.");
}

function recommendedEntries() {
  const sem = programSemesters().find(x => x.no === state.semester);
  if (!sem) return [];
  return sem.courses.map(item => typeof item === "string"
    ? { key: item, label: item, item, semNo: sem.no }
    : { key: `${state.program}:${sem.no}:${item.code}`, label: item.code, item, semNo: sem.no });
}
function recommendedEntry(key) { return recommendedEntries().find(e => e.key === key); }
function renderRecommendedChips() {
  const entries = recommendedEntries();
  $("recommendedLabel").classList.toggle("d-none", !entries.length);
  if (!entries.length) { $("recommendedChips").innerHTML = ""; return; }
  const idx = sectionIndex();
  $("recommendedChips").innerHTML = entries.map(e => {
    const code = typeof e.item === "string" ? e.item : state.picks[e.key];
    const isSlot = typeof e.item !== "string";
    const label = code || e.label;
    const chosen = code && state.selected.some(sel => codeVariants(code).includes(sel.code));
    const offered = !code || !state.imported.length || sectionsFor(code, idx).length > 0;
    const cls = ["course-chip", state.focus === e.key && !$("courseSearch").value.trim() ? "active" : "", isSlot && !code ? "slot-chip" : "", chosen ? "chosen" : "", offered ? "" : "not-offered"].filter(Boolean).join(" ");
    return `<button type="button" class="${cls}" data-chip-key="${esc(e.key)}" title="${esc(code ? plannerMeta(code) : e.item.label)}">${esc(label)}${chosen ? " ✓" : ""}</button>`;
  }).join("");
}
function renderFocused() {
  const e = recommendedEntry(state.focus);
  const idx = sectionIndex();
  const body = typeof e.item === "string" ? renderCourseBlock(e.item, sectionsFor(e.item, idx)) : renderSlotBlock(e.item, e.semNo, idx);
  return `<section class="dept-block">${body}<div class="course-note course-note-foot">Not what you need? Search any course by code above.</div></section>`;
}
function renderCourseBlock(code, sections, opts = {}) {
  const shownCode = sections[0]?.code || code;
  const selected = state.selected.find(sel => sections.some(s => s.code === sel.code));
  const credit = plannerCredit(code);
  const body = sections.length
    ? `<div class="section-stack">${sortSections(sections).map(s => renderSection(s, selected)).join("")}</div>`
    : `<div class="course-note">${state.imported.length ? "Not offered in the imported PDFs." : "Import the offered-courses PDF to see sections."}</div>`;
  return `<section class="course-block"><header class="course-head"><div>${opts.kicker ? `<div class="dept-kicker">${esc(opts.kicker)}</div>` : ""}<div class="course-code-head">${esc(shownCode)}</div><div class="course-name">${esc(plannerMeta(code))}</div></div><span>${credit == null ? "Credit —" : `${trimNumber(credit)} cr`}</span></header>${opts.extra || ""}${body}</section>`;
}
function renderSlotBlock(slot, semNo, idx) {
  const key = `${state.program}:${semNo}:${slot.code}`;
  const picked = state.picks[key];
  if (picked) {
    return renderCourseBlock(picked, sectionsFor(picked, idx), {
      kicker: `${slot.code} · ${slot.label}`,
      extra: `<div class="slot-actions"><button type="button" class="btn btn-sm btn-link" data-clear-pick="${esc(key)}">Change elective</button></div>`
    });
  }
  const groups = slotPoolGroups(slot);
  const option = c => `<option value="${esc(c)}">${esc(c)} — ${esc(plannerMeta(c))}${state.imported.length && sectionsFor(c, idx).length ? " · offered" : ""}</option>`;
  const picker = groups.length
    ? `<select class="form-select slot-pick" data-slot-key="${esc(key)}" aria-label="Choose ${esc(slot.label)}"><option value="">Choose a course…</option>${groups.map(g => g.label ? `<optgroup label="${esc(g.label)}">${g.codes.map(option).join("")}</optgroup>` : g.codes.map(option).join("")).join("")}</select>`
    : `<div class="course-note">No fixed list for this slot. Search for the course code above.</div>`;
  return `<section class="course-block slot-block"><header class="course-head"><div><div class="dept-kicker">ELECTIVE</div><div class="course-code-head">${esc(slot.code)}</div><div class="course-name">${esc(slot.label)}</div></div><span>${esc(slot.credits)} cr</span></header><div class="slot-body"><div class="course-note">${esc(slot.hint)}</div>${picker}</div></section>`;
}
/* ---------- Sort / filter ---------- */
/* Tick several options: the first one ticked is the main order, later ones break ties.
   A group has two opposite choices (earliest / latest), so ticking one clears the other. */
const SORT_GROUPS = [
  { id: "time", label: "Time", options: [["time-asc", "Earliest start first"], ["time-desc", "Latest start first"]] },
  { id: "date", label: "Date", options: [["date-asc", "Earliest day first"], ["date-desc", "Latest day first"]] },
  { id: "cap", label: "Capacity", options: [["cap-desc", "Most seats left"], ["cap-asc", "Fewest seats left"]] }
];
const SORT_KEYS = new Set(SORT_GROUPS.flatMap(g => g.options.map(o => o[0])));
function cleanSort(value) {
  const list = Array.isArray(value) ? value : (typeof value === "string" ? [value] : []);
  const out = [];
  for (const key of list) if (SORT_KEYS.has(key) && !out.some(k => k.split("-")[0] === key.split("-")[0])) out.push(key);
  return out;
}
function firstStart(s) { return Math.min(...s.meetings.map(m => m.start)); }
function firstDay(s) { return Math.min(...s.meetings.map(m => DAY_ORDER[m.day] ?? 99)); }
function seatsLeft(s) { return s.capacity == null ? null : s.capacity - s.enrolled; }
function compareBy(key, a, b) {
  const dir = key.endsWith("-desc") ? -1 : 1;
  if (key.startsWith("time")) return dir * (firstStart(a) - firstStart(b));
  if (key.startsWith("date")) return dir * (firstDay(a) - firstDay(b));
  const la = seatsLeft(a), lb = seatsLeft(b);
  if (la == null || lb == null) return (la == null) - (lb == null); // sections without capacity data go last
  return key === "cap-desc" ? lb - la : la - lb;                    // cap-desc = most seats left first
}
function sortSections(sections) {
  const keys = state.sort;
  if (!keys || !keys.length) return sections;
  const secNo = s => Number(s.section) || 0;
  return [...sections].sort((a, b) => {
    for (const key of keys) { const d = compareBy(key, a, b); if (d) return d; }
    return secNo(a) - secNo(b);
  });
}
function renderSortPanel() {
  const row = ([key, label]) => {
    const rank = state.sort.indexOf(key) + 1;
    return `<label class="sort-option"><input type="checkbox" value="${key}" ${rank ? "checked" : ""}><span>${esc(label)}</span>${rank && state.sort.length > 1 ? `<b class="sort-rank" title="Priority ${rank}">${rank}</b>` : ""}</label>`;
  };
  $("sortPanel").innerHTML = `<div class="sort-title">Sort sections by</div><div class="sort-hint">Tick more than one. The first you tick is the main order.</div>${SORT_GROUPS.map(g => `<div class="sort-group"><div class="sort-group-label">${esc(g.label)}</div>${g.options.map(row).join("")}</div>`).join("")}<button type="button" class="sort-reset" data-sort-reset ${state.sort.length ? "" : "disabled"}>Clear all</button>`;
  const btn = $("sortBtn");
  btn.classList.toggle("active", state.sort.length > 0);
  btn.dataset.count = state.sort.length > 1 ? String(state.sort.length) : "";
}
function setSortOpen(open) {
  $("sortPanel").hidden = !open;
  $("sortBtn").setAttribute("aria-expanded", String(open));
}
function toggleSort(key, on) {
  const group = key.split("-")[0];
  const rest = state.sort.filter(k => k.split("-")[0] !== group); // drop the opposite choice of the same group
  const was = state.sort.indexOf(key);
  if (on) { // keep the group's old rank when flipping earliest <-> latest, otherwise add at the end
    const old = state.sort.findIndex(k => k.split("-")[0] === group);
    state.sort = old >= 0 ? state.sort.map(k => k.split("-")[0] === group ? key : k) : [...rest, key];
  } else if (was >= 0) state.sort = rest;
  renderSortPanel(); renderCourseList();
}
function clearSort() { state.sort = []; renderSortPanel(); renderCourseList(); }

const DAY_CODE = Object.fromEntries(Object.entries(DAY_MAP).map(([code, day]) => [day, code])); // Sunday -> S ... Thursday -> R, Saturday -> A
function renderSection(s, selected) {
  const selectedHere = selected?.section === s.section && selected?.code === s.code && (selected.department == null || selected.department === s.department);
  const locked = !!selected && !selectedHere;
  const dayText = s.meetings.map(m => DAY_CODE[m.day] || m.day.slice(0, 1)).join("/");
  const timeText = [...new Set(s.meetings.map(m => `${formatTime(m.start)}–${formatTime(m.end)}`))].join(" / ");
  const roomText = [...new Set(s.meetings.map(m => m.room).filter(Boolean))].join(" / ") || "Room TBA";
  const capacityText = s.capacity == null ? "—" : `${s.enrolled} / ${s.capacity}`;
  const dedicatedText = s.dedicated ? `${s.dedicated} Dept. Only` : "";
  const payload = JSON.stringify(s).replace(/</g, "\\u003c");
  return `<button type="button" class="section-row ${selectedHere ? "selected" : ""}" ${locked ? "disabled" : ""} data-add-section='${esc(payload)}'><div class="section-info"><strong>Section ${esc(s.section)}</strong><div class="section-facts"><span>Capacity: ${esc(capacityText)}</span>${dedicatedText ? `<span class="dedicated-tag">${esc(dedicatedText)}</span>` : ""}<span>Room: ${esc(roomText)}</span><span>Date: ${esc(dayText)}</span><span>Time: ${esc(timeText)}</span></div></div><span class="section-action">${selectedHere ? "Selected" : locked ? "Another section selected" : "Add"}</span></button>`;
}
function addSection(section) {
  const code = section.code;
  if (state.selected.some(s => s.code === code)) return setNotice(`${code} is already selected. Remove it before choosing another section.`);
  if (state.selected.length >= 6) return setNotice("6 courses reached. Remove a course before adding another.");
  const credit = plannerCredit(code);
  const next = selectedCredits() + (credit || 0);
  if (credit != null && next > 15) return setNotice(`Adding ${code} would exceed the 15-credit limit (${trimNumber(next)} credits).`);
  state.selected.push({ code, name: plannerMeta(code), credits: credit, section: section.section, department: section.department, meetings: section.meetings.map(m => ({ ...m })) });
  state.notice = "";
  renderCourseList(); renderSelected();
}
function selectedCredits() { return state.selected.reduce((sum, s) => sum + (Number(s.credits) || 0), 0); }
function removeSelected(code) { state.selected = state.selected.filter(s => s.code !== code); state.notice = ""; renderCourseList(); renderSelected(); }
function clashWarnings() {
  const out = [];
  for (let i = 0; i < state.selected.length; i++) for (let j = i + 1; j < state.selected.length; j++) {
    const a = state.selected[i], b = state.selected[j], days = new Set();
    for (const ma of a.meetings) for (const mb of b.meetings) if (ma.day === mb.day && ma.start < mb.end && mb.start < ma.end) days.add(ma.day);
    if (days.size) out.push(`${a.code} Section ${a.section} clashes with ${b.code} Section ${b.section} (${[...days].join(", ")})`);
  }
  return out;
}
function renderSelected() {
  $("selectionCounter").textContent = `${state.selected.length} / 6 courses · ${trimNumber(selectedCredits())} credits`;
  const warnings = clashWarnings();
  const messages = [];
  if (state.notice) messages.push(state.notice);
  if (state.selected.length >= 6) messages.push("6 courses reached.");
  if (selectedCredits() >= 15) messages.push("15 credits reached.");
  messages.push(...warnings);
  $("plannerWarnings").innerHTML = messages.map(m => `<div class="planner-alert">${esc(m)}</div>`).join("");
  $("selectedList").innerHTML = state.selected.map(s => `<article class="selected-card"><div class="selected-head"><div><strong>${esc(s.code)}</strong><span>${esc(s.name)}</span></div><button type="button" class="icon-btn" data-remove-selected="${esc(s.code)}">×</button></div><div class="selected-meta"><span>Section ${esc(s.section)}</span><span>${s.credits == null ? "Credit —" : `${trimNumber(s.credits)} cr`}</span></div><div class="selected-meetings">${s.meetings.map(m => `<span>${esc(m.day)} · ${formatTime(m.start)}–${formatTime(m.end)} · ${esc(m.room || "Room TBA")}</span>`).join("")}</div></article>`).join("");
  $("selectedEmpty").classList.toggle("d-none", state.selected.length > 0);
  $("plannerExport").disabled = !state.selected.length || warnings.length > 0;
  $("selectedList").querySelectorAll("[data-remove-selected]").forEach(btn => btn.addEventListener("click", () => removeSelected(btn.dataset.removeSelected)));
}
function setNotice(message) { state.notice = message; renderSelected(); }
function reconcile() {
  const available = new Set(allSections().map(s => `${s.code}::${s.section}`));
  state.selected = state.selected.filter(s => available.has(`${s.code}::${s.section}`));
}
function exportPlannerRoutine() {
  if (!state.selected.length || clashWarnings().length) return;
  const name = $("planName").value.trim() || "Routine";
  const entries = [], courses = [];
  for (const s of state.selected) {
    courses.push({ code: s.code, credit: s.credits });
    for (const m of s.meetings) entries.push({ course: s.code, code: s.code, section: s.section, credit: s.credits, room: m.room || "", remarks: "", isLab: false, day: m.day, start: m.start, end: m.end });
  }
  savePlannerPayload({ title: name, term: "", entries, courses });
  window.location.href = "routine.html";
}

$("importSectionsBtn").addEventListener("click", () => $("sectionPdfInput").click());
$("sectionPdfInput").addEventListener("change", async e => {
  const files = [...(e.target.files || [])]; e.target.value = ""; if (!files.length) return;
  showStatus($("plannerStatus"), `Importing ${files.length} department PDF${files.length > 1 ? "s" : ""}…`);
  const errors = [];
  for (const file of files) {
    try {
      const record = await importDepartmentPDF(file);
      state.imported = state.imported.filter(x => x.department !== record.department);
      state.imported.push(record);
    } catch (err) { errors.push(`${file.name}: ${err.message}`); console.error(err); }
  }
  reconcile(); renderImported(); renderCourseList(); renderSelected();
  if (errors.length) showStatus($("plannerStatus"), errors.join(" "), state.imported.length ? "warning" : "danger");
  else showStatus($("plannerStatus"), `Imported ${files.length} department file${files.length > 1 ? "s" : ""}.`, "success");
});
$("courseSearch").addEventListener("input", renderCourseList);
$("sortBtn").addEventListener("click", () => setSortOpen($("sortPanel").hidden));
$("sortPanel").addEventListener("change", e => { if (e.target.matches('input[type="checkbox"]')) toggleSort(e.target.value, e.target.checked); });
$("sortPanel").addEventListener("click", e => { if (e.target.closest("[data-sort-reset]")) clearSort(); });
document.addEventListener("click", e => { if (!$("sortPanel").hidden && !e.target.closest(".sort-menu")) setSortOpen(false); });
document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("sortPanel").hidden) { setSortOpen(false); $("sortBtn").focus(); } });
$("programSelect").addEventListener("change", () => {
  state.program = $("programSelect").value;
  state.semester = 0;
  state.focus = "";
  renderProgramControls(); renderCourseList();
});
$("recommendedSemester").addEventListener("change", () => {
  state.semester = Number($("recommendedSemester").value) || 0;
  state.focus = "";
  renderCourseList();
});
$("recommendedChips").addEventListener("click", e => {
  const chip = e.target.closest("[data-chip-key]");
  if (!chip) return;
  const key = chip.dataset.chipKey;
  const wasActive = state.focus === key && !$("courseSearch").value.trim();
  $("courseSearch").value = "";
  state.focus = wasActive ? "" : key;
  renderCourseList();
  $("courseList").scrollTop = 0;
});
$("courseList").addEventListener("click", e => {
  const add = e.target.closest("[data-add-section]");
  if (add && !add.disabled) return addSection(JSON.parse(add.dataset.addSection));
  const clear = e.target.closest("[data-clear-pick]");
  if (clear) { delete state.picks[clear.dataset.clearPick]; renderCourseList(); }
});
$("courseList").addEventListener("change", e => {
  const pick = e.target.closest(".slot-pick");
  if (!pick) return;
  if (pick.value) state.picks[pick.dataset.slotKey] = pick.value;
  renderCourseList();
});
$("planName").addEventListener("input", () => { $("planNameCount").textContent = $("planName").value.length; });
$("plannerExport").addEventListener("click", exportPlannerRoutine);

renderProgramControls(); renderSortPanel(); renderImported(); renderCourseList(); renderSelected();

/* The course list fills the window but never gets shorter than 4 section rows.
   Rows wrap onto more lines on narrow screens, so measure the 4 tallest rows plus the headers
   instead of guessing (CSS has a fallback: --list-min), and tell the CSS how tall the header above the list is. */
(function syncCoursesLayout() {
  const panel = document.querySelector(".planner-courses"), list = $("courseList");
  if (!panel || !list) return;
  const h = el => (el ? el.getBoundingClientRect().height : 0);
  const syncHead = () => panel.style.setProperty("--courses-head-h", `${Math.round(list.getBoundingClientRect().top - panel.getBoundingClientRect().top)}px`);
  const syncMin = () => {
    const rows = [...list.querySelectorAll(".section-row")].map(h).sort((a, b) => b - a);
    if (!rows.length) return panel.style.removeProperty("--list-min");
    while (rows.length < 4) rows.push(rows[0]);
    const chrome = h(list.querySelector(".dept-head")) + h(list.querySelector(".course-head")) + 16;
    panel.style.setProperty("--list-min", `${Math.ceil(rows.slice(0, 4).reduce((a, b) => a + b, 0) + chrome)}px`);
  };
  const sync = () => { syncMin(); syncHead(); };
  if (window.ResizeObserver) {
    const ro = new ResizeObserver(syncHead);
    [...panel.children].filter(el => el !== list).forEach(el => ro.observe(el));
  }
  new MutationObserver(syncMin).observe(list, { childList: true, subtree: true });
  window.addEventListener("resize", sync);
  sync();
})();

/* Wheel over an inner scroll area scrolls that area first. Once it is at the top/bottom (or has nothing to scroll),
   the page scrolls instead, so nobody gets stuck inside a list. */
(function chainWheelToPage() {
  const handler = e => {
    const el = e.currentTarget;
    if (e.ctrlKey || e.defaultPrevented || Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
    const max = el.scrollHeight - el.clientHeight;
    const atEnd = max <= 1 || (e.deltaY < 0 && el.scrollTop <= 0) || (e.deltaY > 0 && el.scrollTop >= max - 1);
    if (!atEnd) return;
    e.preventDefault();
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1;
    window.scrollBy({ top: e.deltaY * unit, left: 0, behavior: "instant" }); // instant: the page may have CSS smooth scrolling, which would lag behind the wheel
  };
  ["courseList", "selectedList", "smartSuggest", "sortPanel"].forEach(id => { const el = $(id); if (el) el.addEventListener("wheel", handler, { passive: false }); });
})();
