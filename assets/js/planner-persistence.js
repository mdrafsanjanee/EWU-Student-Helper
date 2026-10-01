/* Keep planner imports/selections while this browser tab remains open. */
(() => {
  const KEY = "ewuPlannerStateV1";

  function save() {
    try {
      sessionStorage.setItem(KEY, JSON.stringify({
        imported: Array.isArray(state.imported) ? state.imported : [],
        selected: Array.isArray(state.selected) ? state.selected : [],
        planName: $("planName")?.value || "",
        program: state.program,
        semester: state.semester,
        picks: state.picks
      }));
    } catch (err) {
      console.warn("Planner state could not be saved.", err);
    }
  }

  function restore() {
    try {
      const raw = sessionStorage.getItem(KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (!saved || !Array.isArray(saved.imported) || !Array.isArray(saved.selected)) return;

      state.imported = saved.imported;
      state.selected = saved.selected;
      state.notice = "";
      if (typeof saved.program === "string" && PROGRAMS[saved.program]) state.program = saved.program;
      state.semester = Number(saved.semester) || 0;
      state.picks = saved.picks && typeof saved.picks === "object" ? saved.picks : {};

      if ($("planName") && typeof saved.planName === "string") {
        $("planName").value = saved.planName.slice(0, 12);
        $("planNameCount").textContent = $("planName").value.length;
      }

      reconcile();
      renderProgramControls();
      renderImported();
      renderCourseList();
      renderSelected();
    } catch (err) {
      console.warn("Saved planner state could not be restored.", err);
    }
  }

  restore();
  window.setInterval(save, 750);
  window.addEventListener("pagehide", save);
})();
