const SUGGEST_WEIGHTS = {
  balanced: { gap: 1, bal: 1.5 },
  gaps: { gap: 2.5, bal: 0.5 },
  even: { gap: 0.5, bal: 3 }
};
const SUGGEST_FREE_GAP = 20;       // minutes between back-to-back classes that are not counted as a gap
const SUGGEST_BUSY_DAY = 5 * 60;   // minutes; time beyond this on a single day is penalised
const SUGGEST_EXACT_LIMIT = 300000; // above this many combinations, switch to beam search
const SUGGEST_BEAM = 3000;
// A dept-only name matches the selected program's label (CSE, EEE, Civil, DSA, MATH) or one of these short forms.
const SUGGEST_DEPT_ALIASES = { civil: ["CE"], math: ["MAT", "MATHEMATICS"] };
const SUGGEST_DAY_LABEL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

Object.assign(state, { wanted: [], suggestPrio: "balanced", skipFull: true, skipOtherDept: true, suggestions: [] });

/* ---------- Scheduling maths ---------- */
function prepSection(s) {
  const byDay = {};
  for (const m of s.meetings) {
    const d = DAY_ORDER[m.day];
    if (d == null) continue;
    (byDay[d] ||= []).push([m.start, m.end]);
  }
  return { s, byDay };
}
function suggestClashes(dayMap, p) {
  for (const d in p.byDay) {
    const cur = dayMap[d];
    if (!cur) continue;
    for (const [a, b] of p.byDay[d]) for (const [c, e] of cur) if (a < e && c < b) return true;
  }
  return false;
}
function suggestDayMap(picks) {
  const map = {};
  for (const p of picks) for (const d in p.byDay) (map[d] ||= []).push(...p.byDay[d]);
  return map;
}
function evaluateRoutine(picks, w) {
  const day = suggestDayMap(picks);
  const used = Object.keys(day).map(Number);
  const span = [...new Set([0, 1, 2, 3, 4, ...used])].sort((a, b) => a - b); // Sun–Thu always count, Fri/Sat only when used
  let gap = 0, over = 0;
  const mins = {};
  for (const d of span) {
    const iv = (day[d] || []).slice().sort((x, y) => x[0] - y[0]);
    let total = 0, prevEnd = null;
    for (const [a, b] of iv) {
      total += b - a;
      if (prevEnd != null && a - prevEnd > SUGGEST_FREE_GAP) gap += a - prevEnd;
      prevEnd = prevEnd == null ? b : Math.max(prevEnd, b);
    }
    mins[d] = total;
    over += Math.max(0, total - SUGGEST_BUSY_DAY) / 60;
  }
  const vals = span.map(d => mins[d]);
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const std = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length);
  return { cost: w.gap * gap / 60 + w.bal * std / 60 + 2 * over, gap, over, std, mins, span, daysUsed: used.length, max: Math.max(...vals), min: Math.min(...vals) };
}
function insertBest(best, item, limit) {
  if (best.length >= limit && item.ev.cost >= best[best.length - 1].ev.cost) return;
  best.push(item);
  best.sort((a, b) => a.ev.cost - b.ev.cost);
  if (best.length > limit) best.length = limit;
}
function searchRoutines(cands, w) {
  const limit = 60;
  const total = cands.reduce((n, list) => n * list.length, 1);
  const best = [];
  if (total <= SUGGEST_EXACT_LIMIT) {
    const dayMap = {}, picks = [];
    const rec = i => {
      if (i === cands.length) return insertBest(best, { picks: [...picks], ev: evaluateRoutine(picks, w) }, limit);
      for (const p of cands[i]) {
        if (suggestClashes(dayMap, p)) continue;
        for (const d in p.byDay) (dayMap[d] ||= []).push(...p.byDay[d]);
        picks.push(p);
        rec(i + 1);
        picks.pop();
        for (const d in p.byDay) dayMap[d].length -= p.byDay[d].length;
      }
    };
    rec(0);
    return { results: best, approximate: false };
  }
  let beam = [[]];
  for (const list of cands) {
    const next = [];
    for (const picks of beam) {
      const dm = suggestDayMap(picks);
      for (const p of list) {
        if (suggestClashes(dm, p)) continue;
        const np = [...picks, p];
        const ev = evaluateRoutine(np, w);
        next.push({ picks: np, score: w.gap * ev.gap / 60 + 2 * ev.over + 0.05 * ev.daysUsed });
      }
    }
    next.sort((a, b) => a.score - b.score);
    beam = next.slice(0, SUGGEST_BEAM).map(x => x.picks);
    if (!beam.length) break;
  }
  for (const picks of beam) if (picks.length === cands.length) insertBest(best, { picks, ev: evaluateRoutine(picks, w) }, limit);
  return { results: best, approximate: true };
}
/* Top options that really differ from each other (at least 2 different sections when possible). */
function pickDistinct(results, count) {
  const key = r => r.picks.map(p => `${p.s.code}:${p.s.section}`);
  const differs = (a, b, min) => key(a).filter((k, i) => k !== key(b)[i]).length >= min;
  const chosen = [];
  for (const min of [2, 1]) {
    for (const r of results) {
      if (chosen.length >= count) break;
      if (!chosen.includes(r) && chosen.every(c => differs(r, c, Math.min(min, r.picks.length)))) chosen.push(r);
    }
  }
  return chosen.sort((a, b) => a.ev.cost - b.ev.cost);
}

/* ---------- Course list (the courses the student is taking) ---------- */
function setSmartMessage(text, type = "info") {
  const el = $("smartMessage");
  el.className = text ? `smart-message smart-${type}` : "smart-message d-none";
  el.textContent = text;
}
function renderSmartCourses() {
  const idx = sectionIndex();
  $("smartCourses").innerHTML = state.wanted.length
    ? state.wanted.map(code => {
      const missing = state.imported.length && !sectionsFor(code, idx).length;
      return `<span class="smart-chip ${missing ? "not-offered" : ""}" title="${esc(plannerMeta(code))}">${esc(code)}<button type="button" data-smart-remove="${esc(code)}" aria-label="Remove ${esc(code)}">×</button></span>`;
    }).join("")
    : `<span class="smart-empty">No courses yet. Add a course code or use your semester's courses.</span>`;
  $("smartPrio").value = state.suggestPrio;
  $("smartSkipFull").checked = state.skipFull;
  $("smartSkipDept").checked = state.skipOtherDept;
}
function addWanted(raw) {
  const code = normalizeCourseCode(String(raw).trim());
  if (!/^[A-Z]{2,8}\d{3,5}[A-Z]?$/.test(code)) return setSmartMessage(`"${raw}" doesn't look like a course code (e.g. CSE101).`, "warning"), false;
  if (state.wanted.some(c => codeVariants(c).some(v => codeVariants(code).includes(v)))) return setSmartMessage(`${code} is already in the list.`, "warning"), false;
  if (state.wanted.length >= 6) return setSmartMessage("6 courses is the maximum. Remove one first.", "warning"), false;
  state.wanted.push(code);
  return true;
}
function addSemesterCourses() {
  const entries = recommendedEntries();
  if (!entries.length) return setSmartMessage("Pick a recommended semester in the Courses panel first.", "warning");
  let skipped = 0, added = 0;
  for (const e of entries) {
    const code = typeof e.item === "string" ? e.item : state.picks[e.key];
    if (!code) { skipped++; continue; }
    if (state.wanted.length >= 6) { setSmartMessage("6 courses is the maximum, so the rest were not added.", "warning"); break; }
    if (!state.wanted.some(c => codeVariants(c).some(v => codeVariants(code).includes(v)))) { state.wanted.push(normalizeCourseCode(code)); added++; }
  }
  renderSmartCourses();
  if (skipped) setSmartMessage(`${skipped} elective slot${skipped > 1 ? "s" : ""} skipped because no course is chosen. Pick one in the Courses list, or add its code here.`, "info");
  else if (!added) setSmartMessage("Those courses are already in the list.", "info");
  else setSmartMessage("");
}

/* ---------- Generate / show / apply ---------- */
function dedicatedMatchesProgram(text) {
  const norm = t => String(t).toUpperCase().replace(/[^A-Z0-9]/g, "");
  const p = PROGRAMS[state.program];
  const names = [p?.label, state.program, ...(SUGGEST_DEPT_ALIASES[state.program] || [])].filter(Boolean).map(norm);
  return names.includes(norm(text));
}
function candidateSections(code, idx) {
  const all = sectionsFor(code, idx).filter(s => s.meetings.length);
  const open = all.filter(s => {
    if (state.skipFull && s.capacity != null && s.enrolled >= s.capacity) return false;
    if (state.skipOtherDept && s.dedicated && !dedicatedMatchesProgram(s.dedicated)) return false;
    return true;
  });
  return { all, open };
}
function runSuggest() {
  state.suggestions = []; $("smartResults").innerHTML = "";
  if (!state.imported.length) return setSmartMessage("Import the offered-courses PDF first. Routines are built from its sections.", "warning");
  if (!state.wanted.length) return setSmartMessage("Add the courses you're taking first.", "warning");
  const credits = state.wanted.reduce((sum, c) => sum + (plannerCredit(c) || 0), 0);
  if (credits > 15) return setSmartMessage(`These courses add up to ${trimNumber(credits)} credits, over the 15-credit limit. Remove one.`, "warning");
  const idx = sectionIndex();
  const cands = [], problems = [];
  for (const code of state.wanted) {
    const { all, open } = candidateSections(code, idx);
    if (!all.length) problems.push(`${code} isn't offered in the imported PDFs.`);
    else if (!open.length) problems.push(`${code}: every section is full or reserved for another department. Untick the filters below to include them.`);
    else cands.push(open.map(prepSection));
  }
  if (problems.length) return setSmartMessage(problems.join(" "), "warning");
  cands.sort((a, b) => a.length - b.length);
  const { results, approximate } = searchRoutines(cands, SUGGEST_WEIGHTS[state.suggestPrio] || SUGGEST_WEIGHTS.balanced);
  if (!results.length) return setSmartMessage("No combination of sections avoids time clashes for these courses. Try removing one course, or include full sections.", "warning");
  const top = pickDistinct(results, 3);
  state.suggestions = top.map(r => r.picks.map(p => p.s).sort((a, b) => a.code.localeCompare(b.code)));
  $("smartResults").innerHTML = top.map((r, i) => renderSuggestion(r, i)).join("");
  setSmartMessage(approximate ? "That was a big search, so these results are close to the best but not guaranteed to be." : "", "info");
}
function renderSuggestion(r, i) {
  const ev = r.ev;
  const bars = ev.span.map(d => {
    const h = ev.mins[d] / 60;
    return `<div class="smart-bar" title="${SUGGEST_DAY_LABEL[d]}: ${formatHours(ev.mins[d])}"><div class="smart-bar-track"><div class="smart-bar-fill" style="height:${Math.round(Math.min(h, 8) / 8 * 100)}%"></div></div><span>${SUGGEST_DAY_LABEL[d]}</span><em>${h ? `${trimNumber(Math.round(h * 10) / 10)}h` : "–"}</em></div>`;
  }).join("");
  const picks = r.picks.slice().sort((a, b) => a.s.code.localeCompare(b.s.code)).map(p => {
    const s = p.s;
    const days = s.meetings.map(m => DAY_CODE[m.day] || m.day[0]).join("/");
    const times = [...new Set(s.meetings.map(m => `${formatTime(m.start)}–${formatTime(m.end)}`))].join(" / ");
    return `<li><strong>${esc(s.code)}</strong><span>Sec ${esc(s.section)} · ${esc(days)} · ${esc(times)}</span></li>`;
  }).join("");
  return `<article class="smart-card"><header><strong>${i === 0 ? "Best match" : `Option ${i + 1}`}</strong><button type="button" class="btn btn-sm btn-primary" data-smart-apply="${i}">Use this routine</button></header>
    <div class="smart-stats"><span><b>${formatGap(ev.gap)}</b> gaps</span><span><b>${ev.daysUsed}</b> class days</span><span><b>${formatHours(ev.max)}</b> busiest</span><span><b>${formatHours(ev.min)}</b> lightest</span></div>
    <div class="smart-bars">${bars}</div><ul class="smart-picks">${picks}</ul></article>`;
}
function applySuggestion(i) {
  const secs = state.suggestions[i];
  if (!secs) return;
  const replaced = state.selected.length > 0;
  state.selected = secs.map(s => ({ code: s.code, name: plannerMeta(s.code), credits: plannerCredit(s.code), section: s.section, department: s.department, meetings: s.meetings.map(m => ({ ...m })) }));
  state.notice = "";
  renderCourseList(); renderSelected();
  setSmartMessage(replaced ? "Routine applied. It replaced your previous selection." : "Routine applied. See it in the planner panel.", "success");
  $("selectedList").scrollIntoView?.({ behavior: "smooth", block: "nearest" });
}

/* ---------- Wiring ---------- */
$("smartToggle").addEventListener("click", () => {
  const open = $("smartBody").hidden;
  $("smartBody").hidden = !open;
  $("smartToggle").setAttribute("aria-expanded", String(open));
  if (open) renderSmartCourses();
});
$("smartAddBtn").addEventListener("click", () => {
  const raw = $("smartAddInput").value.trim();
  if (!raw) return;
  if (addWanted(raw)) { $("smartAddInput").value = ""; setSmartMessage(""); }
  renderSmartCourses();
});
$("smartAddInput").addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); $("smartAddBtn").click(); } });
$("smartUseSemester").addEventListener("click", addSemesterCourses);
$("smartCourses").addEventListener("click", e => {
  const rm = e.target.closest("[data-smart-remove]");
  if (!rm) return;
  state.wanted = state.wanted.filter(c => c !== rm.dataset.smartRemove);
  renderSmartCourses();
});
$("smartPrio").addEventListener("change", () => { state.suggestPrio = $("smartPrio").value; });
$("smartSkipFull").addEventListener("change", () => { state.skipFull = $("smartSkipFull").checked; });
$("smartSkipDept").addEventListener("change", () => { state.skipOtherDept = $("smartSkipDept").checked; });
$("smartGenerate").addEventListener("click", () => { setSmartMessage(""); renderSmartCourses(); runSuggest(); });
$("smartResults").addEventListener("click", e => {
  const btn = e.target.closest("[data-smart-apply]");
  if (btn) applySuggestion(Number(btn.dataset.smartApply));
});
renderSmartCourses();
