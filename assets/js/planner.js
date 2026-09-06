const state = {
  selected: [],
  imported: [],
  notice: ""
};

const DEPARTMENTS = [
  ["CSE", "Department of Computer Science and Engineering"],
  ["ECE", "Department of Electrical and Computer Engineering"],
  ["EEE", "Department of Electrical and Electronic Engineering"],
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
  // planner-data.js declares PLANNER_DATA as a global lexical binding, which is
  // not exposed as window.PLANNER_DATA. Support both forms so recommendations
  // and course metadata work reliably in a plain GitHub Pages setup.
  if (typeof PLANNER_DATA !== "undefined") return PLANNER_DATA;
  return window.PLANNER_DATA || {};
}
function plannerMeta(code) {
  return getPlannerData().courseMeta?.[code] || code;
}
function plannerCredit(code) {
  const c = getPlannerData().credits?.[code];
  return c == null ? null : Number(c);
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
      if (!allSections.has(key)) allSections.set(key, { code: rec.code, section: rec.section, meetings: [] });
      const s = allSections.get(key);
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
  // EWU's printed table uses fixed x-columns. We intentionally parse the timing
  // column as its own stream because the end time wraps onto a second line.
  const courseWords = words.filter(w => w.x < 90);
  const sectionWords = words.filter(w => w.x >= 88 && w.x < 130);
  const timingWords = words.filter(w => w.x >= 130 && w.x < 225);
  const roomWords = words.filter(w => w.x >= 225 && w.x < 410);

  const courseRows = clusterByY(courseWords, 2.5).map(r => ({ y: r.centerY, text: r.text }));
  const sectionRows = clusterByY(sectionWords, 2.5).map(r => ({ y: r.centerY, text: r.text }));
  const timingRows = clusterByY(timingWords, 2.5);
  const roomRows = clusterByY(roomWords, 2.5);
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
    for (const day of block.days) records.push({ code, section, meeting: { day, start: block.start, end: block.end, room } });
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
  const nearby = rows.filter(r => Math.abs(r.centerY - y) <= 11).sort((a, b) => Math.abs(a.centerY - y) - Math.abs(b.centerY - y));
  if (!nearby.length) return "Room TBA";
  let text = nearby[0].text;
  text = text.replace(/\b\d+\s*\/\s*\d+\s*$/, "").trim();
  // Capacity/dedicated-department text can occasionally sneak into the room span.
  text = text.replace(/\s+(?:CSE|EEE|ECE|ENG|MAT|PHY|LAW|MDS|ECO|BA|SOC|SR|GEB|IS|DSS|MBA)\s*$/i, "").trim();
  return text || "Room TBA";
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
function renderCourseList() {
  const q = $("courseSearch").value.trim().toLowerCase();
  const html = state.imported.map(dept => {
    const seen = new Set(); const codes = [];
    for (const s of dept.sections) if (!seen.has(s.code)) { seen.add(s.code); codes.push(s.code); }
    const courses = codes.filter(code => !q || code.toLowerCase().includes(q) || plannerMeta(code).toLowerCase().includes(q)).map(code => renderCourse(code, dept)).join("");
    if (!courses) return "";
    return `<section class="dept-block"><header class="dept-head"><div><div class="dept-kicker">IMPORTED</div><strong>${esc(dept.departmentName)}</strong></div><span>${dept.sections.length} sections</span></header>${courses}</section>`;
  }).join("");
  $("courseList").innerHTML = html || (state.imported.length ? `<div class="list-empty"><strong>No matching courses</strong><span>Try another search.</span></div>` : `<div class="list-empty"><div class="placeholder-icon">⇧</div><strong>Import department PDF(s) to begin</strong><span>Courses will appear here in the order provided by each EWU PDF.</span></div>`);
  $("courseList").querySelectorAll("[data-add-section]").forEach(btn => btn.addEventListener("click", () => addSection(JSON.parse(btn.dataset.addSection))));
}
function renderCourse(code, dept) {
  const selected = state.selected.find(s => s.code === code);
  const sections = dept.sections.filter(s => s.code === code);
  const credit = plannerCredit(code);
  return `<section class="course-block"><header class="course-head"><div><div class="course-code-head">${esc(code)}</div><div class="course-name">${esc(plannerMeta(code))}</div></div><span>${credit == null ? "Credit —" : `${trimNumber(credit)} cr`}</span></header><div class="section-stack">${sections.map(s => renderSection(s, selected)).join("")}</div></section>`;
}
function renderSection(s, selected) {
  const selectedHere = selected?.section === s.section && selected?.department === s.department;
  const locked = !!selected && !selectedHere;
  const dayText = s.meetings.map(m => m.day.slice(0, 1)).join("/");
  const timeText = [...new Set(s.meetings.map(m => `${formatTime(m.start)}–${formatTime(m.end)}`))].join(" / ");
  const roomText = [...new Set(s.meetings.map(m => m.room).filter(Boolean))].join(" / ") || "Room TBA";
  const payload = JSON.stringify(s).replace(/</g, "\\u003c");
  return `<button type="button" class="section-row ${selectedHere ? "selected" : ""}" ${locked ? "disabled" : ""} data-add-section='${esc(payload)}'><div class="section-info"><strong>Section ${esc(s.section)}</strong><div class="section-facts"><span>Room: ${esc(roomText)}</span><span>Date: ${esc(dayText)}</span><span>Time: ${esc(timeText)}</span></div></div><span class="section-action">${selectedHere ? "Selected" : locked ? "Another section selected" : "Add"}</span></button>`;
}
function recommendedPlannerCode(code) {
  // EWU's curriculum uses ENG101/ENG102, while current offered-course PDFs
  // use ENG7101/ENG7102. Keep the curriculum data intact and show the
  // currently offered planner codes here.
  const aliases = { ENG101: "ENG7101", ENG102: "ENG7102" };
  return aliases[code] || code;
}

function handleRecommended() {
  const sem = Number($("recommendedSemester").value);
  const codes = getPlannerData().recommended?.[sem] || [];
  const wrap = $("recommendedWrap");
  if (!sem || !codes.length) { wrap.classList.add("d-none"); $("recommendedChips").innerHTML = ""; return; }
  wrap.classList.remove("d-none");
  $("recommendedChips").innerHTML = codes.map(c => {
    const plannerCode = recommendedPlannerCode(c);
    return `<button type="button" class="course-chip" data-recommended-code="${esc(plannerCode)}">${esc(plannerCode)}</button>`;
  }).join("");
  $("recommendedChips").querySelectorAll("[data-recommended-code]").forEach(btn => btn.addEventListener("click", () => { $("courseSearch").value = btn.dataset.recommendedCode; renderCourseList(); }));
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
$("recommendedSemester").addEventListener("change", handleRecommended);
$("planName").addEventListener("input", () => { $("planNameCount").textContent = $("planName").value.length; });
$("plannerExport").addEventListener("click", exportPlannerRoutine);

renderImported(); renderCourseList(); renderSelected();
