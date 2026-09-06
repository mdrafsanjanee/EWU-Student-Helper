let schedule = null;
const els = { title: $("routineTitle"), badge: $("semesterBadge"), summary: $("summary"), routine: $("routine") };

function loadSchedule(next, sourceMessage = "") {
  schedule = normalizeSchedule(next);
  const result = renderRoutine(schedule, els);
  $("exportPdf").disabled = false;
  if (sourceMessage) showStatus($("routineStatus"), sourceMessage, "success");
  return result;
}

async function handleExcelUpload(file) {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array", cellDates: true });
  const parsed = parseEWUSheet(wb);
  loadSchedule(parsed, `Loaded ${parsed.entries.length} class meetings from ${file.name}.`);
}

function parseEWUSheet(wb) {
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  let headerIndex = -1, cols = {};
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r].map(v => String(v).trim()); const found = {};
    row.forEach((v, c) => { if (v === "Course(s)") found.course = c; if (v === "Sec") found.section = c; if (v === "Cr") found.credit = c; if (v === "Time-WeekDay") found.time = c; if (v === "Room") found.room = c; if (v === "Remarks") found.remarks = c; });
    if (found.course !== undefined && found.time !== undefined && found.room !== undefined) { headerIndex = r; cols = found; break; }
  }
  if (headerIndex < 0) throw new Error("EWU routine headers were not found.");
  const term = findTerm(rows, headerIndex), entries = [], courseCredits = new Map();
  let currentCourse = "", currentCode = "", currentSection = "", currentCredit = null, currentRemarks = "", currentIsLab = false;
  for (let r = headerIndex + 1; r < rows.length; r++) {
    const row = rows[r];
    const rawCourse = String(row[cols.course] ?? "").trim(); const rawTime = String(row[cols.time] ?? "").trim(); const rawRoom = String(row[cols.room] ?? "").trim();
    const rawSection = row[cols.section]; const rawCredit = row[cols.credit]; const rawRemarks = cols.remarks !== undefined ? String(row[cols.remarks] ?? "").trim() : "";
    if (rawCourse && /[A-Z]{2,}\d{3,}/i.test(rawCourse)) {
      currentCourse = rawCourse; currentCode = (rawCourse.match(/[A-Z]{2,}\d{3,}/i) || [""])[0].toUpperCase(); currentIsLab = /\sLab$/i.test(rawCourse);
      currentSection = rawSection === "" || rawSection == null ? "" : String(rawSection).trim(); const c = parseFloat(rawCredit); currentCredit = Number.isFinite(c) ? c : null;
      if (!currentIsLab && currentCredit != null) courseCredits.set(currentCode, currentCredit); currentRemarks = rawRemarks;
    }
    if (!rawTime || !currentCourse) continue;
    const meetings = parseTimeWeekday(rawTime);
    for (const m of meetings) entries.push({ course: currentCourse, code: currentCode, section: currentSection, credit: currentCredit, room: rawRoom, remarks: rawRemarks || currentRemarks, isLab: currentIsLab, ...m });
  }
  if (!entries.length) throw new Error("No class rows were found in the workbook.");
  return { term, title: term || "Routine", entries, courses: [...courseCredits.entries()].map(([code, credit]) => ({ code, credit })) };
}
function findTerm(rows, headerIndex) { for (let r = Math.max(0, headerIndex - 8); r < Math.min(rows.length, headerIndex + 4); r++) for (const cell of rows[r]) { const t = String(cell ?? "").trim(); if (/^(Fall|Spring|Summer)-\d{4}$/i.test(t)) return t; } return ""; }
function parseTimeWeekday(value) { const m = String(value).match(/^([A-Z]+)\s+(.+?)\s*-\s*(.+)$/i); if (!m) throw new Error(`Unsupported time format: ${value}`); const start = toMinutes(m[2]), end = toMinutes(m[3]); if (end <= start) throw new Error(`Invalid time range: ${value}`); const days = [...m[1].toUpperCase()].map(ch => DAY_MAP[ch]).filter(Boolean); if (!days.length) throw new Error(`Unknown day code: ${m[1]}`); return days.map(day => ({ day, start, end, rawTime: value })); }

$("excelInput").addEventListener("change", async e => { const file = e.target.files?.[0]; e.target.value = ""; if (!file) return; try { showStatus($("routineStatus"), `Reading ${file.name}…`); await handleExcelUpload(file); } catch (err) { console.error(err); showStatus($("routineStatus"), `Could not read this file: ${err.message}`, "danger"); } });
$("exportPdf").addEventListener("click", async () => { if (!schedule) return; const btn = $("exportPdf"); const original = btn.innerHTML; btn.disabled = true; btn.innerHTML = "Exporting…"; try { await exportRoutinePDF(schedule, schedule.title || "Routine"); showStatus($("routineStatus"), "Routine exported as PDF.", "success"); } catch (err) { console.error(err); showStatus($("routineStatus"), `Could not export PDF: ${err.message}`, "danger"); } finally { btn.innerHTML = original; btn.disabled = !schedule; } });

const planned = loadPlannerPayload();
if (planned) { loadSchedule(planned, `Routine loaded from Course Planner.`); }
