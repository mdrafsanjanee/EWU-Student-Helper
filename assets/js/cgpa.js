const GRADES = [
  ["A+", 4.00], ["A", 3.75], ["A-", 3.5], ["B+", 3.25], ["B", 3.00], ["B-", 2.75],
  ["C+", 2.50], ["C", 2.25], ["D", 2.00], ["F", 0.00]
];
const GRADE_POINTS = Object.fromEntries(GRADES);
const MAX_COURSES = 6;

const cgpaState = {
  program: "cse",
  query: "",
  selected: [], // { code, name, credit, grade }
  _cache: {}
};

function getProgramCourses(key) {
  if (cgpaState._cache[key]) return cgpaState._cache[key];
  const p = PROGRAMS[key];
  if (!p) return [];
  const codes = new Set();
  p.years.forEach(y => y.semesters.forEach(s => s.courses.forEach(c => {
    if (typeof c === "string") codes.add(c);
    else if (c && Array.isArray(c.pool)) c.pool.forEach(code => codes.add(code));
  })));
  (p.generalEd || []).forEach(c => codes.add(c));
  if (p.majorTracks) Object.values(p.majorTracks).forEach(arr => arr.forEach(c => codes.add(c)));
  const list = [...codes].map(code => {
    const entry = COURSES[code];
    if (!entry) return null;
    return { code, name: entry[0], credit: Number(entry[1]) || 0 };
  }).filter(Boolean).sort((a, b) => a.code.localeCompare(b.code));
  cgpaState._cache[key] = list;
  return list;
}

function findCourse(code) {
  for (const key of Object.keys(PROGRAMS)) {
    const hit = getProgramCourses(key).find(c => c.code === code);
    if (hit) return hit;
  }
  return null;
}

function trimCredit(n) {
  return Number.isInteger(n) ? String(n) : Number(n).toFixed(1).replace(/\.0$/, "");
}
function fmtGpa(n) { return n == null ? "—" : n.toFixed(2); }

function addCourse(code) {
  if (cgpaState.selected.length >= MAX_COURSES) return;
  if (cgpaState.selected.some(c => c.code === code)) return;
  const course = findCourse(code);
  if (!course) return;
  cgpaState.selected.push({ ...course, grade: "" });
  renderAll();
}

function removeCourse(code) {
  cgpaState.selected = cgpaState.selected.filter(c => c.code !== code);
  renderAll();
}

function setGrade(code, grade) {
  const course = cgpaState.selected.find(c => c.code === code);
  if (course) course.grade = grade;
  renderSummary();
}

function totalCredits() {
  return cgpaState.selected.reduce((sum, c) => sum + c.credit, 0);
}
function gradedCourses() {
  return cgpaState.selected.filter(c => c.grade);
}
function sgpa() {
  const graded = gradedCourses();
  if (!graded.length) return null;
  const credits = graded.reduce((s, c) => s + c.credit, 0);
  const points = graded.reduce((s, c) => s + c.credit * GRADE_POINTS[c.grade], 0);
  return credits ? points / credits : null;
}
function cumulativeGpa() {
  const prevCgpaVal = parseFloat($("prevCgpa").value);
  const prevCreditsVal = parseFloat($("prevCredits").value);
  const hasPrev = !isNaN(prevCgpaVal) && !isNaN(prevCreditsVal) && prevCreditsVal > 0;
  const graded = gradedCourses();
  const semCredits = graded.reduce((s, c) => s + c.credit, 0);
  const semPoints = graded.reduce((s, c) => s + c.credit * GRADE_POINTS[c.grade], 0);
  const totalCred = (hasPrev ? prevCreditsVal : 0) + semCredits;
  if (!totalCred) return null;
  const totalPoints = (hasPrev ? prevCgpaVal * prevCreditsVal : 0) + semPoints;
  return totalPoints / totalCred;
}

function renderCourseList() {
  const p = PROGRAMS[cgpaState.program];
  const all = getProgramCourses(cgpaState.program);
  const q = cgpaState.query;
  const filtered = q
    ? all.filter(c => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q))
    : all;
  const atMax = cgpaState.selected.length >= MAX_COURSES;

  $("courseListProgramLabel").textContent = p.label;

  if (!filtered.length) {
    $("courseList").innerHTML = `<div class="list-empty"><div class="placeholder-icon">🔍</div><strong>No courses found</strong><span>Try a different search term.</span></div>`;
    return;
  }

  $("courseList").innerHTML = `<div class="dept-block">
    <div class="dept-head">
      <div><span class="dept-kicker">PROGRAM</span><strong>${esc(p.label)}</strong></div>
      <span>${filtered.length} course${filtered.length === 1 ? "" : "s"}</span>
    </div>
    ${filtered.map(c => {
    const added = cgpaState.selected.some(s => s.code === c.code);
    const disabled = added || atMax;
    const actionLabel = added ? "Added" : (atMax ? "Limit reached" : "+ Add");
    return `<div class="course-block">
        <button type="button" class="section-row ${added ? "selected" : ""}" data-code="${esc(c.code)}" ${disabled ? "disabled" : ""}>
          <div class="section-info">
            <strong>${esc(c.code)}</strong>
            <div class="section-facts"><span>${esc(c.name)}</span><span>${trimCredit(c.credit)} credit${c.credit === 1 ? "" : "s"}</span></div>
          </div>
          <span class="section-action">${actionLabel}</span>
        </button>
      </div>`;
  }).join("")}
  </div>`;
}

function renderSelected() {
  const wrap = $("selectedList");
  const empty = $("selectedEmpty");
  $("selectionCounter").textContent = `${cgpaState.selected.length} / ${MAX_COURSES} courses · ${trimCredit(totalCredits())} credits`;

  if (!cgpaState.selected.length) {
    wrap.innerHTML = "";
    empty.classList.remove("d-none");
    return;
  }
  empty.classList.add("d-none");
  wrap.innerHTML = cgpaState.selected.map(c => `
    <article class="selected-card">
      <div class="selected-head">
        <div><strong>${esc(c.code)}</strong><span>${esc(c.name)} · ${trimCredit(c.credit)} credit${c.credit === 1 ? "" : "s"}</span></div>
        <button type="button" class="icon-btn" data-remove="${esc(c.code)}" title="Remove">×</button>
      </div>
      <div class="grade-row">
        <select class="form-select form-select-sm grade-select" data-grade="${esc(c.code)}">
          <option value="" ${c.grade === "" ? "selected" : ""}>Select grade</option>
          ${GRADES.map(([g]) => `<option value="${g}" ${c.grade === g ? "selected" : ""}>${g}</option>`).join("")}
        </select>
        <span class="grade-points">${c.grade ? GRADE_POINTS[c.grade].toFixed(2) + " pts" : "—"}</span>
      </div>
    </article>`).join("");
}

function renderSummary() {
  const graded = gradedCourses();
  const gradedCredits = graded.reduce((s, c) => s + c.credit, 0);
  $("cgpaSummary").innerHTML = [
    summaryStat("Selected courses", `${cgpaState.selected.length}/${MAX_COURSES}`, `${graded.length} graded`),
    summaryStat("Semester credits", trimCredit(totalCredits()), `${trimCredit(gradedCredits)} graded credits`),
    summaryStat("SGPA", fmtGpa(sgpa()), "this semester"),
    summaryStat("Cumulative CGPA", fmtGpa(cumulativeGpa()), "including previous record")
  ].join("");
}

function renderAll() {
  renderCourseList();
  renderSelected();
  renderSummary();
}

function initCgpa() {
  const programSelect = $("programSelect");
  programSelect.innerHTML = Object.values(PROGRAMS)
    .map(p => `<option value="${p.key}">${p.label}</option>`).join("");
  programSelect.value = cgpaState.program;
  programSelect.addEventListener("change", () => {
    cgpaState.program = programSelect.value;
    renderCourseList();
  });

  $("courseSearch").addEventListener("input", (e) => {
    cgpaState.query = e.target.value.trim().toLowerCase();
    renderCourseList();
  });

  $("prevCgpa").addEventListener("input", renderSummary);
  $("prevCredits").addEventListener("input", renderSummary);

  $("courseList").addEventListener("click", (e) => {
    const btn = e.target.closest(".section-row[data-code]");
    if (btn && !btn.disabled) addCourse(btn.dataset.code);
  });

  $("selectedList").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-remove]");
    if (btn) removeCourse(btn.dataset.remove);
  });

  $("selectedList").addEventListener("change", (e) => {
    if (e.target.matches(".grade-select")) setGrade(e.target.dataset.grade, e.target.value);
  });

  renderAll();
}

document.addEventListener("DOMContentLoaded", initCgpa);
