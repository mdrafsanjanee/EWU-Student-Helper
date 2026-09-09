let currentProgram = "cse";
let currentYear = 0;
let currentTrack = "all";
let modal;
let CURRENT_SLOTS = [];

document.addEventListener("DOMContentLoaded", () => {
  modal = new bootstrap.Modal(document.getElementById("courseModal"));
  renderProgramSwitcher();
  loadProgram(currentProgram);
});

function renderProgramSwitcher() {
  const wrap = document.getElementById("programTabs");
  wrap.innerHTML = Object.values(PROGRAMS).map(p => `
    <button class="program-tab ${p.key === currentProgram ? "active" : ""}" data-program="${p.key}">${p.label}</button>`).join("");
  wrap.querySelectorAll(".program-tab").forEach(btn => btn.addEventListener("click", () => {
    if (btn.dataset.program === currentProgram) return;
    currentProgram = btn.dataset.program;
    currentYear = 0;
    currentTrack = "all";
    wrap.querySelectorAll(".program-tab").forEach(b => b.classList.toggle("active", b === btn));
    loadProgram(currentProgram);
  }));
}

function loadProgram(key) {
  const p = PROGRAMS[key];

  document.getElementById("programTitle").innerHTML = p.fullName;
  document.getElementById("programMeta").textContent = p.catalogLabel;

  const creditBox = document.getElementById("creditTotalBox");
  if (p.totalCredits) {
    creditBox.style.display = "";
    document.getElementById("creditTotalNum").textContent = p.totalCredits;
  } else {
    creditBox.style.display = "none";
  }

  document.getElementById("curriculumSummary").innerHTML = p.summary.map(s => `
    <div><span>${s.label}</span><strong>${s.value}</strong></div>`).join("");

  const toolbar = document.getElementById("mapToolbar");
  const trackTabsWrap = document.getElementById("trackTabs");
  if (p.majorTracks) {
    toolbar.querySelector(".toolbar-label").parentElement.style.display = "";
    trackTabsWrap.innerHTML = `<button class="track-tab active" data-track="all">All tracks</button>` +
      Object.keys(p.majorTracks).map(t => `<button class="track-tab" data-track="${t}">${p.trackLabels[t]}</button>`).join("");
    trackTabsWrap.querySelectorAll(".track-tab").forEach(btn => btn.addEventListener("click", () => {
      currentTrack = btn.dataset.track;
      trackTabsWrap.querySelectorAll(".track-tab").forEach(b => b.classList.toggle("active", b === btn));
      renderYear(currentYear);
    }));
  } else {
    toolbar.querySelector(".toolbar-label").parentElement.style.display = "none";
  }
  document.getElementById("mapHelp").innerHTML = `<i class="fa fa-info-circle"></i> Click any course or elective slot to inspect it`;

  const yearNav = document.getElementById("yearNav");
  if (p.viewType === "roadmap") {
    yearNav.style.display = "";
    renderYearNav();
    renderYear(0);
  } else {
    yearNav.style.display = "none";
    renderCatalog(p);
  }
}

function renderYearNav() {
  const p = PROGRAMS[currentProgram];
  const nav = document.getElementById("yearNav");
  nav.innerHTML = p.years.map((y, i) => `
    <button class="year-button ${i === 0 ? "active" : ""}" data-year="${i}">
      ${y.name}<small>${y.total} credits</small>
    </button>`).join("");
  nav.querySelectorAll(".year-button").forEach(btn => btn.addEventListener("click", () => {
    currentYear = Number(btn.dataset.year);
    nav.querySelectorAll(".year-button").forEach(b => b.classList.toggle("active", b === btn));
    renderYear(currentYear);
  }));
}

function renderYear(index) {
  const p = PROGRAMS[currentProgram];
  const y = p.years[index];
  CURRENT_SLOTS = [];
  const noteHtml = (index === 0 && p.note) ? `<div class="catalog-note"><i class="fa fa-exclamation-circle"></i><span>${p.note}</span></div>` : "";
  document.getElementById("yearStage").innerHTML = noteHtml + `
    <div class="year-heading">
      <div><div class="eyebrow">${y.name.toUpperCase()}</div><h2>Degree roadmap</h2></div>
      <p>${y.total} credits in this year</p>
    </div>
    <div class="semesters">${y.semesters.map(renderSemester).join("")}</div>`;
  applyTrackHighlight();
  wireCourseClicks();
}

function renderSemester(s) {
  const totalLabel = s.total !== undefined ? s.total : semesterCredits(s.courses);
  return `<article class="semester">
    <header class="semester-head"><strong>${s.name}</strong><span>${totalLabel} cr</span></header>
    <div class="sem-course-list">${s.courses.map(renderItem).join("")}</div>
  </article>`;
}

function semesterCredits(courses) {
  return courses.reduce((sum, c) => {
    if (typeof c === "string") return sum + (COURSES[c]?.[1] || 0);
    return sum + (typeof c.credits === "number" ? c.credits : 0);
  }, 0);
}

function renderItem(item) {
  if (typeof item !== "string") return renderSlotNode(item);
  const d = COURSES[item];
  const title = d[0] || "Title not listed in source";
  return `<button class="course-node required${d[0] ? "" : " no-title"}" type="button" data-code="${item}">
    <span class="code"><span>${item}</span><span class="credits">${d[1]} cr</span></span>
    <span class="name">${title}</span>
    ${d[2].length ? `<span class="hint">Prereq: ${d[2].join(", ")}</span>` : ""}
  </button>`;
}

function renderSlotNode(item) {
  const idx = CURRENT_SLOTS.length;
  CURRENT_SLOTS.push(item);
  const extra = item.kind === "major" ? " major-slot" : "";
  return `<button class="course-node elective${extra}" type="button" data-slot="${idx}">
    <span class="code"><span>${item.code}</span><span>${item.credits} cr</span></span>
    <span class="name">${item.label}</span>
    <span class="hint">${item.hint}</span>
  </button>`;
}

function wireCourseClicks() {
  document.querySelectorAll(".course-node[data-code]").forEach(n => n.addEventListener("click", () => openCourse(n.dataset.code)));
  document.querySelectorAll(".course-node[data-slot]").forEach(n => n.addEventListener("click", () => openSlot(Number(n.dataset.slot))));
}

function trackName() {
  const p = PROGRAMS[currentProgram];
  return p.trackLabels ? p.trackLabels[currentTrack] : "";
}

function applyTrackHighlight() {
  const p = PROGRAMS[currentProgram];
  if (!p.majorTracks) return;
  const relevant = currentTrack === "all" ? new Set(Object.values(p.majorTracks).flat()) : new Set(p.majorTracks[currentTrack]);
  document.querySelectorAll(".course-node[data-code]").forEach(node => {
    const code = node.dataset.code;
    const allMajor = Object.values(p.majorTracks).flat();
    node.classList.toggle("dim", currentTrack !== "all" && !relevant.has(code) && allMajor.includes(code));
  });
}

/* Flat catalog view — kept for a future program where we only have a course
   list and no confirmed semester plan yet. Neither CSE nor EEE needs it now
   that the EEE flowchart gives a full semester-by-semester layout. */
function renderCatalog(p) {
  CURRENT_SLOTS = [];
  const noteHtml = p.note ? `<div class="catalog-note"><i class="fa fa-exclamation-circle"></i><span>${p.note}</span></div>` : "";

  const coreHtml = p.core ? `
    <div class="catalog-section">
      <div class="year-heading">
        <div><div class="eyebrow">CORE — CONFIRMED SO FAR</div><h2>Required courses</h2></div>
        <p>${p.core.reduce((s, c) => s + COURSES[c][1], 0)} credits shown</p>
      </div>
      <div class="catalog-grid">${p.core.map(c => renderItem(c)).join("")}</div>
    </div>` : "";

  const genEdHtml = `
    <div class="catalog-section">
      <div class="year-heading">
        <div><div class="eyebrow">ELECTIVE POOL</div><h2>General education electives</h2></div>
        <p>Pick as directed by your advising sheet</p>
      </div>
      <div class="pool-grid">${p.generalEd.map(c => `
        <button class="pool-pill" type="button" data-code="${c}"><strong>${c}</strong><span>${COURSES[c][0]}</span></button>`).join("")}
      </div>
    </div>`;

  document.getElementById("yearStage").innerHTML = noteHtml + coreHtml + genEdHtml;
  document.querySelectorAll(".course-node[data-code], .pool-pill[data-code]").forEach(n => n.addEventListener("click", () => openCourse(n.dataset.code)));
}

function openCourse(code) {
  const d = COURSES[code];
  if (!d) return;
  const next = Object.entries(COURSES).filter(([, v]) => v[2].includes(code)).map(([c]) => c);
  document.getElementById("cmPrereqLabel").textContent = "PREREQUISITES";
  document.getElementById("cmNextLabel").textContent = "LEADS TO";
  document.getElementById("cmCode").textContent = code;
  document.getElementById("cmName").textContent = d[0] || "Title not listed in source";
  document.getElementById("cmCredit").textContent = `${d[1]} credit${d[1] === 1 ? "" : "s"}`;
  document.getElementById("cmPrereq").innerHTML = d[2].length
    ? d[2].map(p => `<button class="prereq-pill" data-p="${p}">${p}</button>`).join("")
    : "None listed";
  document.getElementById("cmNext").innerHTML = next.length
    ? next.map(n => `<button class="prereq-pill" data-p="${n}">${n}</button>`).join("")
    : "No direct prerequisite-dependent course in the database.";
  document.getElementById("cmAdvice").textContent = (PROGRAMS[currentProgram].advice && PROGRAMS[currentProgram].advice[code]) || "See the EWU advising criteria for the minimum completed-credit requirement.";
  document.querySelectorAll(".prereq-pill").forEach(b => b.onclick = () => openCourse(b.dataset.p));
  modal.show();
}

function openSlot(idx) {
  const item = CURRENT_SLOTS[idx];
  if (!item) return;
  const p = PROGRAMS[currentProgram];

  let pool = item.pool;
  if (!pool && item.kind === "gen_ed") pool = p.generalEd;
  if (!pool && p.majorTracks && (item.kind === "major" || item.kind === "nonmajor")) {
    const all = Object.values(p.majorTracks).flat();
    if (item.kind === "major") {
      pool = currentTrack === "all" ? all : p.majorTracks[currentTrack];
    } else {
      pool = currentTrack === "all" || !p.majorTracks[currentTrack] ? all : all.filter(c => !p.majorTracks[currentTrack].includes(c));
    }
  }

  document.getElementById("cmPrereqLabel").textContent = "ELIGIBLE COURSES";
  document.getElementById("cmNextLabel").textContent = "SELECTION RULE";
  document.getElementById("cmCode").textContent = item.code;
  document.getElementById("cmName").textContent = item.label;
  document.getElementById("cmCredit").textContent = `${item.credits} credit${item.credits === 1 ? "" : "s"} · elective slot`;
  document.getElementById("cmPrereq").innerHTML = pool && pool.length
    ? pool.map(c => `<button class="prereq-pill" data-p="${c}">${c}</button>`).join("")
    : "Not listed in the source yet — check your official EWU advising sheet for eligible courses.";
  document.getElementById("cmNext").textContent = item.hint;
  document.getElementById("cmAdvice").textContent = "Elective slot — pick one course that satisfies this requirement and hasn't already been counted toward another slot.";
  document.querySelectorAll(".prereq-pill").forEach(b => b.onclick = () => openCourse(b.dataset.p));
  modal.show();
}
