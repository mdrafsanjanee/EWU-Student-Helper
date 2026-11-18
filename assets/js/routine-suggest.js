/* Auto-build routine: picks one section per course so the week has the fewest gaps and the hours
   are spread evenly across days. Uses helpers from planner.js and common.js. */

/* gap = hours of waiting between classes, bal = how uneven the hours are across days, days = number of campus days.
   "gaps" puts gaps first and then prefers fewer campus days; "even" puts evenness first; "balanced" mixes gaps and evenness. */
const SUGGEST_WEIGHTS = {
  balanced: { gap: 1, bal: 1.5, days: 0 },
  gaps: { gap: 8, bal: 0.1, days: 0.8 },
  even: { gap: 0.2, bal: 8, days: 0 }
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
/* A lab meeting is one held in a lab room. Labs always count for gaps and balance. For the "classes per day" cap:
   the lab of a course that also has theory classes is ignored, but a lab-only course counts like any other class. */
const isLabMeeting = m => /\blab/i.test(m.room || "");
function prepSection(s) {
  const byDay = {}, theory = new Set(), all = new Set();
  for (const m of s.meetings) {
    const d = DAY_ORDER[m.day];
    if (d == null) continue;
    (byDay[d] ||= []).push([m.start, m.end]);
    all.add(d);
    if (!isLabMeeting(m)) theory.add(d);
  }
  return { s, byDay, classDays: theory.size ? [...theory] : [...all] };
}
/* No more than half of the courses on one day, but never fewer than 2: 4 courses -> 2 a day, 6 -> 3, 5 -> 3. */
function suggestBaseCap(courses) { return Math.max(2, Math.ceil(courses / 2)); }
function classCounts(picks) {
  const c = {};
  for (const p of picks) for (const d of p.classDays) c[d] = (c[d] || 0) + 1;
  return c;
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
  const maxClasses = Math.max(0, ...Object.values(classCounts(picks)));
  const vals = span.map(d => mins[d]);
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const std = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length);
  return { maxClasses, cost: w.gap * gap / 60 + w.bal * std / 60 + w.days * used.length + 6 * over, gap, over, std, mins, span, daysUsed: used.length, max: Math.max(...vals), min: Math.min(...vals) };
}
function insertBest(best, item, limit) {
  if (best.length >= limit && item.ev.cost >= best[best.length - 1].ev.cost) return;
  best.push(item);
  best.sort((a, b) => a.ev.cost - b.ev.cost);
  if (best.length > limit) best.length = limit;
}
function searchRoutines(cands, w, cap = Infinity) {
  const limit = 60;
  const total = cands.reduce((n, list) => n * list.length, 1);
  const best = [];
  if (total <= SUGGEST_EXACT_LIMIT) {
    const dayMap = {}, picks = [], cnt = {};
    const rec = i => {
      if (i === cands.length) return insertBest(best, { picks: [...picks], ev: evaluateRoutine(picks, w) }, limit);
      for (const p of cands[i]) {
        if (suggestClashes(dayMap, p)) continue;
        if (p.classDays.some(d => (cnt[d] || 0) >= cap)) continue;
        for (const d in p.byDay) (dayMap[d] ||= []).push(...p.byDay[d]);
        for (const d of p.classDays) cnt[d] = (cnt[d] || 0) + 1;
        picks.push(p);
        rec(i + 1);
        picks.pop();
        for (const d of p.classDays) cnt[d]--;
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
      const dm = suggestDayMap(picks), tc = classCounts(picks);
      for (const p of list) {
        if (suggestClashes(dm, p)) continue;
        if (p.classDays.some(d => (tc[d] || 0) >= cap)) continue;
        const np = [...picks, p];
        next.push({ picks: np, score: evaluateRoutine(np, w).cost });
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
const sameCourse = (a, b) => codeVariants(a).some(v => codeVariants(b).includes(v));
const isWanted = code => state.wanted.some(c => sameCourse(c, code));
const wantedCredits = () => state.wanted.reduce((n, c) => n + (plannerCredit(c) || 0), 0);
const CREDIT_LIMIT = 15, COURSE_LIMIT = 6; // same limits as the course planner
/* Why a course can't be added right now ("" = it can). */
function suggestBlockReason(c) {
  if (isWanted(c.code)) return "Added";
  if (state.wanted.length >= COURSE_LIMIT) return "6 max";
  if (c.credit && wantedCredits() + c.credit > CREDIT_LIMIT) return "Over 15 cr";
  return "";
}

/* Every course in the selected program's curriculum (like the CGPA calculator). Courses that are only in the imported PDF
   but not in the curriculum (e.g. CSE108 for CSE) are not offered here. Without a curriculum, fall back to the PDF's courses. */
function curriculumCodes() {
  const p = PROGRAMS[state.program];
  if (!p || typeof COURSES === "undefined") return null;
  const codes = new Set();
  p.years.forEach(y => y.semesters.forEach(sem => sem.courses.forEach(c => {
    if (typeof c === "string") codes.add(c); else if (c && Array.isArray(c.pool)) c.pool.forEach(x => codes.add(x));
  })));
  (p.generalEd || []).forEach(c => codes.add(c));
  if (p.majorTracks) Object.values(p.majorTracks).forEach(arr => arr.forEach(c => codes.add(c)));
  return codes;
}
const inCurriculum = code => { const set = curriculumCodes(); return !set || [...set].some(c => sameCourse(c, code)); };
function suggestCatalog() {
  const map = new Map();
  const add = (code, name, credit) => {
    const key = [...codeVariants(code)].sort()[0];
    if (!map.has(key)) map.set(key, { code, name: name || code, credit });
  };
  const codes = curriculumCodes();
  if (codes) codes.forEach(code => { if (COURSES[code]) add(code, COURSES[code][0], Number(COURSES[code][1]) || 0); });
  else for (const code of sectionIndex().keys()) add(code, plannerMeta(code), plannerCredit(code));
  const idx = sectionIndex();
  const rec = new Set(recommendedEntries().map(e => (typeof e.item === "string" ? e.item : state.picks[e.key])).filter(Boolean).flatMap(codeVariants));
  return [...map.values()].map(c => ({ ...c, sections: sectionsFor(c.code, idx).length, recommended: codeVariants(c.code).some(v => rec.has(v)) }));
}
function suggestMatches(query) {
  const q = query.trim().toLowerCase();
  const hasPdf = state.imported.length > 0;
  const rank = c => {
    const code = c.code.toLowerCase(), name = c.name.toLowerCase();
    if (!q) return c.recommended ? 0 : 3;
    if (code === q) return 0;
    if (code.startsWith(q)) return 1;
    if (code.includes(q)) return 2;
    if (name.startsWith(q)) return 3;
    if (name.split(/\s+/).some(w => w.startsWith(q))) return 4;
    return name.includes(q) ? 5 : 99;
  };
  return suggestCatalog().map(c => ({ c, r: rank(c) })).filter(x => x.r < 99)
    .sort((a, b) => a.r - b.r || (hasPdf ? (b.c.sections > 0) - (a.c.sections > 0) : 0) || a.c.code.localeCompare(b.c.code)).map(x => x.c);
}
let suggestActive = -1, suggestShown = [];
function renderSuggestList() {
  const box = $("smartSuggest");
  const all = suggestMatches($("smartAddInput").value);
  suggestShown = all.slice(0, 40);
  if (suggestActive >= suggestShown.length) suggestActive = suggestShown.length - 1;
  const hasPdf = state.imported.length > 0;
  box.innerHTML = suggestShown.length
    ? suggestShown.map((c, i) => {
        const block = suggestBlockReason(c);
        const badge = block || (hasPdf ? (c.sections ? `${c.sections} section${c.sections > 1 ? "s" : ""}` : "Not offered") : "");
        return `<button type="button" role="option" class="smart-opt ${i === suggestActive ? "active" : ""} ${hasPdf && !c.sections ? "not-offered" : ""}" id="smartOpt${i}" data-smart-pick="${esc(c.code)}" ${block ? "disabled" : ""} aria-selected="${i === suggestActive}">
          <span class="smart-opt-main"><strong>${esc(c.code)}</strong><span>${esc(c.name)}</span></span>
          <span class="smart-opt-meta">${c.credit ? `${trimNumber(c.credit)} cr` : ""}${badge ? `<em>${esc(badge)}</em>` : ""}</span></button>`;
      }).join("") + (all.length > suggestShown.length ? `<div class="smart-opt-more">Showing ${suggestShown.length} of ${all.length}. Keep typing to narrow down.</div>` : "")
    : `<div class="smart-opt-more">No matching course. Try a code (CSE101) or a word from the name.</div>`;
  const act = suggestActive >= 0 ? $(`smartOpt${suggestActive}`) : null;
  $("smartAddInput").setAttribute("aria-activedescendant", act ? act.id : "");
  act?.scrollIntoView?.({ block: "nearest" });
}
function setSuggestOpen(open) {
  $("smartSuggest").hidden = !open;
  $("smartAddInput").setAttribute("aria-expanded", String(open));
  if (open) renderSuggestList(); else suggestActive = -1;
}
function pickSuggestion(code) {
  if (addWanted(code)) { setSmartMessage(""); $("smartAddInput").value = ""; suggestActive = -1; }
  renderSmartCourses();
  if (!$("smartSuggest").hidden) renderSuggestList();
  $("smartAddInput").focus();
}
function renderSmartCourses() {
  const idx = sectionIndex();
  $("smartCourses").innerHTML = state.wanted.length
    ? state.wanted.map(code => {
        const missing = state.imported.length && !sectionsFor(code, idx).length;
        const name = plannerMeta(code);
        return `<span class="smart-chip ${missing ? "not-offered" : ""}" title="${esc(code)} ${name !== code ? "· " + esc(name) : ""}${missing ? " (not in the imported PDFs)" : ""}"><span class="smart-chip-text"><strong>${esc(code)}</strong>${name !== code ? `<small>${esc(name)}</small>` : ""}</span><button type="button" data-smart-remove="${esc(code)}" aria-label="Remove ${esc(code)}">×</button></span>`;
      }).join("")
    : `<span class="smart-empty">No courses yet. Search above or use your semester's courses.</span>`;
  $("smartTotal").textContent = state.wanted.length ? `${state.wanted.length} / ${COURSE_LIMIT} courses · ${trimNumber(wantedCredits())} / ${CREDIT_LIMIT} credits` : "";
  $("smartPrio").value = state.suggestPrio;
  $("smartSkipFull").checked = state.skipFull;
  $("smartSkipDept").checked = state.skipOtherDept;
}
function addWanted(raw) {
  const code = normalizeCourseCode(String(raw).trim());
  if (!/^[A-Z]{2,8}\d{3,5}[A-Z]?$/.test(code)) return setSmartMessage(`"${raw}" doesn't look like a course code. Search by code or name above (e.g. CSE101).`, "warning"), false;
  if (isWanted(code)) return setSmartMessage(`${code} is already in the list.`, "warning"), false;
  if (!inCurriculum(code)) return setSmartMessage(`${code} isn't in the ${PROGRAMS[state.program].label} curriculum, so it can't be added here.`, "warning"), false;
  if (state.wanted.length >= COURSE_LIMIT) return setSmartMessage("6 courses reached. Remove a course before adding another.", "warning"), false;
  const credit = plannerCredit(code), next = wantedCredits() + (credit || 0);
  if (credit != null && next > CREDIT_LIMIT) return setSmartMessage(`Adding ${code} would exceed the 15-credit limit (${trimNumber(next)} credits).`, "warning"), false;
  state.wanted.push(code);
  return true;
}
function addSemesterCourses() {
  const entries = recommendedEntries();
  if (!entries.length) return setSmartMessage("Pick a recommended semester in the Courses panel first.", "warning");
  let noPick = 0, added = 0, overCredit = 0, overCount = 0;
  for (const e of entries) {
    const code = typeof e.item === "string" ? e.item : state.picks[e.key];
    if (!code) { noPick++; continue; }
    if (isWanted(code)) continue;
    if (state.wanted.length >= COURSE_LIMIT) { overCount++; continue; }
    const credit = plannerCredit(code);
    if (credit != null && wantedCredits() + credit > CREDIT_LIMIT) { overCredit++; continue; }
    state.wanted.push(normalizeCourseCode(code)); added++;
  }
  renderSmartCourses();
  const notes = [];
  if (noPick) notes.push(`${noPick} elective slot${noPick > 1 ? "s" : ""} skipped because no course is chosen (pick one in the Courses list, or add its code here)`);
  if (overCredit) notes.push(`${overCredit} course${overCredit > 1 ? "s" : ""} skipped because of the 15-credit limit`);
  if (overCount) notes.push(`${overCount} skipped because 6 courses is the maximum`);
  if (notes.length) setSmartMessage(`${notes.join(". ")}.`, "info");
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
  const w = SUGGEST_WEIGHTS[state.suggestPrio] || SUGGEST_WEIGHTS.balanced;
  const baseCap = suggestBaseCap(cands.length);
  let cap = baseCap, found;
  for (;;) { // if no routine fits the cap, allow one more class a day at a time
    found = searchRoutines(cands, w, cap);
    if (found.results.length || cap >= cands.length) break;
    cap++;
  }
  const { results, approximate } = found;
  if (!results.length) return setSmartMessage("No combination of sections avoids time clashes for these courses. Try removing one course, or include full sections.", "warning");
  const top = pickDistinct(results, 3);
  state.suggestions = top.map(r => r.picks.map(p => p.s).sort((a, b) => a.code.localeCompare(b.code)));
  $("smartResults").innerHTML = top.map((r, i) => renderSuggestion(r, i)).join("");
  const notes = [];
  if (cap > baseCap) notes.push(`No routine keeps it to ${baseCap} classes a day with these sections, so up to ${cap} a day was allowed.`);
  if (approximate) notes.push("That was a big search, so these results are close to the best but not guaranteed to be.");
  setSmartMessage(notes.join(" "), "info");
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
    <div class="smart-stats"><span>${ev.gap ? `<b>${formatGap(ev.gap)}</b> gaps` : "<b>No</b> gaps"}</span><span><b>${ev.daysUsed}</b> class days</span><span><b>${ev.maxClasses}</b> max classes/day</span><span><b>${formatHours(ev.max)}</b> busiest</span><span><b>${formatHours(ev.min)}</b> lightest</span></div>
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
$("smartAddInput").addEventListener("focus", () => setSuggestOpen(true));
$("smartAddInput").addEventListener("input", () => { suggestActive = -1; setSuggestOpen(true); });
$("smartAddInput").addEventListener("keydown", e => {
  const open = !$("smartSuggest").hidden;
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    if (!open) return setSuggestOpen(true);
    const enabled = suggestShown.map((c, i) => (suggestBlockReason(c) ? -1 : i)).filter(i => i >= 0);
    if (!enabled.length) return;
    const at = enabled.indexOf(suggestActive);
    const next = e.key === "ArrowDown" ? (at < 0 ? 0 : (at + 1) % enabled.length) : (at < 0 ? enabled.length - 1 : (at - 1 + enabled.length) % enabled.length);
    suggestActive = enabled[next];
    renderSuggestList();
  } else if (e.key === "Enter") {
    e.preventDefault();
    const raw = $("smartAddInput").value.trim();
    if (open && suggestActive >= 0 && suggestShown[suggestActive]) pickSuggestion(suggestShown[suggestActive].code);
    else if (raw) { const exact = suggestMatches(raw); pickSuggestion(exact.length === 1 || (exact[0] && exact[0].code.toLowerCase() === raw.toLowerCase()) ? exact[0].code : raw); }
  } else if (e.key === "Escape" && open) { e.stopPropagation(); setSuggestOpen(false); }
});
$("smartSuggest").addEventListener("mousedown", e => e.preventDefault()); // keep focus in the input while clicking an option
$("smartSuggest").addEventListener("click", e => { const b = e.target.closest("[data-smart-pick]"); if (b && !b.disabled) pickSuggestion(b.dataset.smartPick); });
document.addEventListener("click", e => { if (!$("smartSuggest").hidden && !e.target.closest(".smart-search")) setSuggestOpen(false); });
$("smartAddBtn").addEventListener("click", () => {
  const raw = $("smartAddInput").value.trim();
  if (!raw) return $("smartAddInput").focus();
  const m = suggestMatches(raw);
  pickSuggestion(m[0] && (m.length === 1 || m[0].code.toLowerCase() === raw.toLowerCase()) ? m[0].code : raw);
});
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
