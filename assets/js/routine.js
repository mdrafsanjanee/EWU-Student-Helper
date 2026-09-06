let schedule = null;
const els = { title: $("routineTitle"), badge: $("semesterBadge"), summary: $("summary"), routine: $("routine") };

function loadSchedule(next, sourceMessage = "") {
  schedule = normalizeSchedule(next);
  renderRoutine(schedule, els);
  $("exportPdf").disabled = false;
  if (sourceMessage) showStatus($("routineStatus"), sourceMessage, "success");
}

async function handleExcelUpload(file) {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array", cellDates: true });
  if (!wb.SheetNames.length) throw new Error("The workbook has no worksheets.");
  const parsed = parseEWUSheet(wb);
  loadSchedule(parsed, `Loaded ${parsed.entries.length} class meetings from ${file.name}.`);
}

function normalizeHeader(value) {
  return String(value ?? "").trim().toLowerCase().replace(/[\s_]+/g, "");
}

function parseEWUSheet(wb) {
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  let headerIndex = -1, cols = {};

  for (let r = 0; r < rows.length; r++) {
    const found = {};
    rows[r].forEach((value, c) => {
      const h = normalizeHeader(value);
      if (h === "course(s)" || h === "courses" || h === "course") found.course = c;
      if (h === "sec" || h === "section") found.section = c;
      if (h === "cr" || h === "credit" || h === "credits") found.credit = c;
      if (h === "time-weekday" || h === "timeweekday" || h === "time") found.time = c;
      if (h === "room" || h === "roomno" || h === "roomnumber") found.room = c;
      if (h === "remarks" || h === "remark") found.remarks = c;
    });
    if (found.course !== undefined && found.time !== undefined && found.room !== undefined) {
      headerIndex = r;
      cols = found;
      break;
    }
  }

  if (headerIndex < 0) throw new Error("EWU routine headers were not found. Expected Course(s), Time-WeekDay and Room.");

  const term = findTerm(rows, headerIndex);
  const entries = [];
  const courseCredits = new Map();
  let currentCourse = "", currentCode = "", currentSection = "", currentCredit = null, currentRemarks = "", currentIsLab = false;

  for (let r = headerIndex + 1; r < rows.length; r++) {
    const row = rows[r];
    const rawCourse = String(row[cols.course] ?? "").trim();
    const rawTime = String(row[cols.time] ?? "").trim();
    const rawRoom = String(row[cols.room] ?? "").trim();
    const rawSection = cols.section === undefined ? "" : row[cols.section];
    const rawCredit = cols.credit === undefined ? "" : row[cols.credit];
    const rawRemarks = cols.remarks === undefined ? "" : String(row[cols.remarks] ?? "").trim();

    if (rawCourse && /[A-Z]{2,}\s*\d{3,}/i.test(rawCourse)) {
      currentCourse = rawCourse;
      currentCode = (rawCourse.match(/[A-Z]{2,}\s*\d{3,}[A-Z]?/i) || [""])[0].replace(/\s+/g, "").toUpperCase();
      currentIsLab = /\blab\b/i.test(rawCourse);
      currentSection = rawSection === "" || rawSection == null ? "" : String(rawSection).trim();
      const c = parseFloat(String(rawCredit).replace(/[^0-9.]/g, ""));
      currentCredit = Number.isFinite(c) ? c : null;
      if (!currentIsLab && currentCredit != null) courseCredits.set(currentCode, currentCredit);
      currentRemarks = rawRemarks;
    }

    if (!rawTime || !currentCourse) continue;
    const meetings = parseTimeWeekday(rawTime);
    for (const m of meetings) {
      entries.push({
        course: currentCourse,
        code: currentCode,
        section: currentSection,
        credit: currentCredit,
        room: rawRoom,
        remarks: rawRemarks || currentRemarks,
        isLab: currentIsLab,
        ...m
      });
    }
  }

  if (!entries.length) throw new Error("No class rows were found in the workbook.");
  return { term, title: term || "Routine", entries, courses: [...courseCredits.entries()].map(([code, credit]) => ({ code, credit })) };
}

function findTerm(rows, headerIndex) {
  for (let r = Math.max(0, headerIndex - 10); r < Math.min(rows.length, headerIndex + 5); r++) {
    for (const cell of rows[r]) {
      const t = String(cell ?? "").trim();
      const m = t.match(/\b(Fall|Spring|Summer)[\s-]*(\d{4})\b/i);
      if (m) return `${m[1][0].toUpperCase()}${m[1].slice(1).toLowerCase()}-${m[2]}`;
    }
  }
  return "";
}

function parseTimeWeekday(value) {
  let text = String(value).trim().replace(/[–—]/g, "-").replace(/\s+/g, " ");
  const m = text.match(/^([A-Za-z\/]+)\s+(\d{1,2}:\d{2}\s*(?:AM|PM))\s*-\s*(\d{1,2}:\d{2}\s*(?:AM|PM))$/i);
  if (!m) throw new Error(`Unsupported time format: ${value}`);

  const start = toMinutes(m[2]);
  const end = toMinutes(m[3]);
  if (end <= start) throw new Error(`Invalid time range: ${value}`);

  const dayCodes = m[1].toUpperCase().replace(/[^SMTWRFA]/g, "");
  const days = [...dayCodes].map(ch => DAY_MAP[ch]).filter(Boolean);
  if (!days.length) throw new Error(`Unknown day code: ${m[1]}`);
  return days.map(day => ({ day, start, end, rawTime: value }));
}

$("excelInput").addEventListener("change", async e => {
  const file = e.target.files?.[0];
  e.target.value = "";
  if (!file) return;
  try {
    showStatus($("routineStatus"), `Reading ${file.name}…`);
    await handleExcelUpload(file);
  } catch (err) {
    console.error(err);
    showStatus($("routineStatus"), `Could not read this file: ${err.message}`, "danger");
  }
});

$("exportPdf").addEventListener("click", async () => {
  if (!schedule) return;
  const btn = $("exportPdf");
  const original = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = "Exporting…";
  try {
    await exportRoutinePDF(schedule, schedule.title || "Routine");
    showStatus($("routineStatus"), "Routine exported as PDF.", "success");
  } catch (err) {
    console.error(err);
    showStatus($("routineStatus"), `Could not export PDF: ${err.message}`, "danger");
  } finally {
    btn.innerHTML = original;
    btn.disabled = !schedule;
  }
});

const planned = loadPlannerPayload();
if (planned) loadSchedule(planned, "Routine loaded from Course Planner.");
