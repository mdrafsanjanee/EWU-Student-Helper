# EWU Course Planner Prototype

This version separates the Course Planner and Routine Generator into two pages.

## Course Planner
- Import one or more EWU offered-course PDFs by department.
- Search imported courses in the original PDF order.
- Recommended semester chips come from `planner-data.js` and do not show prerequisite details.
- One section per course, max 6 courses, max 15 known credits.
- Detects overlapping meetings including labs/extra meetings present in the imported section data.
- Exporting stores a normalized schedule in `sessionStorage` and redirects to `routine.html`.

## Routine Generator
- Uploads EWU advising-slip Excel files only.
- Uses the same routine renderer/analyzer as planner output.
- Exports the loaded routine as an A4 landscape PDF.

All data stays in the browser.
