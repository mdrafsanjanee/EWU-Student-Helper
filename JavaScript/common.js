const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];
const ALL_DAYS = [...DAYS, "Friday", "Saturday"];
const DAY_MAP = { S: "Sunday", M: "Monday", T: "Tuesday", W: "Wednesday", R: "Thursday", F: "Friday", A: "Saturday" };
const DAY_ORDER = Object.fromEntries(ALL_DAYS.map((d, i) => [d, i]));
const $ = (id) => document.getElementById(id);

if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
}

function esc(text) {
  return String(text ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}
function toMinutes(value) {
  if (typeof value === "number") return value;
  const m = String(value).trim().toUpperCase().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
  if (!m) throw new Error(`Unsupported clock time: ${value}`);
  let h = Number(m[1]);
  const min = Number(m[2]);
  if (m[3] === "AM") { if (h === 12) h = 0; }
  else if (h !== 12) h += 12;
  return h * 60 + min;
}
function formatTime(minutes) {
  const h24 = Math.floor(Number(minutes) / 60);
  const min = Number(minutes) % 60;
  const suffix = h24 >= 12 ? "PM" : "AM";
  let h = h24 % 12;
  if (h === 0) h = 12;
  return `${h}:${String(min).padStart(2, "0")} ${suffix}`;
}
function formatHours(minutes) {
  if (!minutes) return "0h";
  const h = Math.floor(minutes / 60), m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}
function formatGap(minutes) {
  return minutes ? formatHours(minutes) : "—";
}
function trimNumber(n) { return Number.isInteger(n) ? String(n) : Number(n).toFixed(1).replace(/\.0$/, ""); }

function showStatus(el, message, type = "info") {
  if (!el) return;
  el.textContent = message;
  el.className = `alert alert-${type}`;
  el.classList.toggle("d-none", !message);
}

function setNavActive(page) {
  document.querySelectorAll(".nav-link[data-page]").forEach(link => {
    link.classList.toggle("active", link.dataset.page === page);
  });
}

function normalizeSchedule(schedule) {
  const entries = (schedule?.entries || []).map(e => ({
    ...e,
    start: toMinutes(e.start),
    end: toMinutes(e.end),
    day: e.day,
    code: e.code || e.course,
    course: e.course || e.code,
    section: e.section == null ? "" : String(e.section),
    room: e.room || "",
    credit: e.credit == null ? null : Number(e.credit),
    isLab: Boolean(e.isLab)
  }));
  const courseMap = new Map();
  for (const e of entries) {
    if (!e.code) continue;
    if (!courseMap.has(e.code)) courseMap.set(e.code, { code: e.code, credit: e.credit });
    else if (courseMap.get(e.code).credit == null && e.credit != null) courseMap.get(e.code).credit = e.credit;
  }
  return { ...schedule, entries, courses: schedule.courses?.length ? schedule.courses : [...courseMap.values()] };
}

function analyzeSchedule(schedule) {
  const byDay = Object.fromEntries(ALL_DAYS.map(d => [d, { entries: [], classMinutes: 0, longestGap: 0 }]));
  let totalMinutes = 0;
  for (const entry of schedule.entries || []) {
    if (!byDay[entry.day]) continue;
    byDay[entry.day].entries.push(entry);
    byDay[entry.day].classMinutes += entry.end - entry.start;
    totalMinutes += entry.end - entry.start;
  }
  for (const day of ALL_DAYS) {
    const d = byDay[day];
    d.entries.sort((a, b) => a.start - b.start || a.end - b.end);
    for (let i = 1; i < d.entries.length; i++) {
      d.longestGap = Math.max(d.longestGap, Math.max(0, d.entries[i].start - d.entries[i - 1].end));
    }
    d.first = d.entries[0] || null;
    d.last = d.entries[d.entries.length - 1] || null;
  }
  const totalCredits = (schedule.courses || []).reduce((sum, c) => sum + (Number(c.credit) || 0), 0);
  let longestGap = { minutes: 0, day: null };
  for (const day of ALL_DAYS) {
    if (byDay[day].longestGap > longestGap.minutes) longestGap = { minutes: byDay[day].longestGap, day };
  }
  const busiestDay = ALL_DAYS
    .map(day => ({ day, classMinutes: byDay[day].classMinutes }))
    .filter(x => x.classMinutes > 0)
    .sort((a, b) => b.classMinutes - a.classMinutes)[0] || null;
  return { byDay, totalMinutes, totalCredits, longestGap, busiestDay };
}

function routineCard(entry) {
  return `<article class="class-card ${entry.isLab ? "is-lab" : ""}">
    <div class="course-code">${esc(entry.course)}</div>
    ${entry.section ? `<div class="card-line">Section ${esc(entry.section)}</div>` : ""}
    <div class="card-line card-time">${formatTime(entry.start)}–${formatTime(entry.end)}</div>
    ${entry.room ? `<div class="card-line">Room: ${esc(entry.room)}</div>` : ""}
  </article>`;
}

function renderRoutine(schedule, els, options = {}) {
  schedule = normalizeSchedule(schedule);
  const analysis = analyzeSchedule(schedule);
  const title = schedule.title || schedule.term || "Routine";
  els.title.textContent = title;
  if (els.badge) els.badge.textContent = schedule.term || "Routine";
  if (els.summary) {
    els.summary.innerHTML = [
      summaryStat("Credits", trimNumber(analysis.totalCredits), "available course credit data"),
      summaryStat("Weekly class time", formatHours(analysis.totalMinutes), "including labs"),
      summaryStat("Longest gap", formatGap(analysis.longestGap.minutes), analysis.longestGap.day || "no between-class gap"),
      summaryStat("Busiest day", analysis.busiestDay?.day || "—", analysis.busiestDay ? formatHours(analysis.busiestDay.classMinutes) : "")
    ].join("");
  }
  const visibleDays = options.days || DAYS;
  els.routine.className = "routine-grid routine-scroll";
  els.routine.innerHTML = visibleDays.map(day => renderDay(day, analysis.byDay[day])).join("");
  return { schedule, analysis };
}

function summaryStat(label, value, detail) {
  return `<article class="stat"><div class="label">${esc(label)}</div><div class="value">${esc(value)}</div><div class="detail">${esc(detail || "")}</div></article>`;
}

function renderDay(day, dayData) {
  const items = dayData.entries || [];
  let html = `<article class="day-col"><header class="day-head"><div class="day-name">${esc(day)}</div><div class="day-meta"><span>${formatHours(dayData.classMinutes)} class</span><span>${dayData.longestGap ? `Gap ${formatHours(dayData.longestGap)}` : "Gap —"}</span></div></header><div class="day-body">`;
  if (!items.length) return html + `<div class="empty">No classes</div></div></article>`;
  for (let i = 0; i < items.length; i++) {
    html += routineCard(items[i]);
    const next = items[i + 1];
    if (next && next.start > items[i].end) {
      const gap = next.start - items[i].end;
      html += `<div class="gap-row"><span class="gap-line"></span><strong>${formatHours(gap)}</strong><span>gap</span><span class="gap-line"></span></div>`;
    }
  }
  return html + `</div></article>`;
}

async function exportRoutinePDF(schedule, title = "Routine") {
  const { jsPDF } = window.jspdf;
  if (!window.html2canvas || !jsPDF) throw new Error("PDF export libraries could not load.");
  const normalized = normalizeSchedule(schedule);
  const analysis = analyzeSchedule(normalized);
  const shell = document.createElement("div");
  shell.className = "pdf-export-shell";
  const temp = document.createElement("div");
  temp.className = "pdf-sheet-shell";
  const statHtml = [
    summaryStat("Credits", trimNumber(analysis.totalCredits), ""),
    summaryStat("Weekly class time", formatHours(analysis.totalMinutes), ""),
    summaryStat("Longest gap", formatGap(analysis.longestGap.minutes), analysis.longestGap.day || ""),
    summaryStat("Busiest day", analysis.busiestDay?.day || "—", "")
  ].join("");
  const routineHtml = DAYS.map(day => renderDay(day, analysis.byDay[day])).join("");
  temp.innerHTML = `<div class="pdf-title">${esc(title || "Routine")}</div><div class="pdf-subtitle">East West University${normalized.term ? ` · ${esc(normalized.term)}` : ""}</div><div class="pdf-summary summary-grid">${statHtml}</div><div class="pdf-routine routine-grid">${routineHtml}</div>`;
  shell.appendChild(temp);
  document.body.appendChild(shell);
  try {
    const canvas = await html2canvas(temp, { scale: 2, backgroundColor: "#f3f6fb", useCORS: true });
    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const margin = 6;
    const pw = pdf.internal.pageSize.getWidth();
    const ph = pdf.internal.pageSize.getHeight();
    const usableW = pw - margin * 2;
    const pageCanvasHeight = Math.floor(canvas.width * ((ph - margin * 2) / usableW));
    let y = 0, first = true;
    while (y < canvas.height) {
      const slice = document.createElement("canvas");
      slice.width = canvas.width;
      slice.height = Math.min(pageCanvasHeight, canvas.height - y);
      const ctx = slice.getContext("2d");
      ctx.drawImage(canvas, 0, y, canvas.width, slice.height, 0, 0, slice.width, slice.height);
      if (!first) pdf.addPage();
      const imgH = slice.height * usableW / slice.width;
      pdf.addImage(slice.toDataURL("image/png"), "PNG", margin, margin, usableW, imgH);
      y += slice.height;
      first = false;
    }
    const safe = (title || "routine").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "routine";
    pdf.save(`${safe}.pdf`);
  } finally {
    shell.remove();
  }
}

function savePlannerPayload(schedule) {
  sessionStorage.setItem("ewuPlannerRoutine", JSON.stringify(schedule));
}
function loadPlannerPayload() {
  try { return JSON.parse(sessionStorage.getItem("ewuPlannerRoutine") || "null"); }
  catch { return null; }
}
