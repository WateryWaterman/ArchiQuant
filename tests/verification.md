# Verification record — 2026-09-24

- Production build: passed on Node 24.14.1 / Vite 6.4.3.
- Automated suite: 9/9 passed; calibration, quantities, CSV/JSON, tiles, YOLO decoder, actual sample pixels, model graph, real reference geometry/provenance, and monochrome fallback behavior.
- Dependency install audit after patching: 0 known vulnerabilities.
- Browser: loaded the actual production app from the Node server at localhost:3000.
- Scope selection and required two-point calibration: passed; clicked the sample dimension and entered 10 m. Approximate click placement produced 99.88 px/m.
- First bundled-model browser run: WebGPU, 1.2 seconds including local runtime/model loading; 14 point items (8 fixtures, 2 valves, 2 floor drains, 1 hydrant, 1 cleanout), 51 pipe segments, 56 worksheet rows.
- Actual PNG heuristic extraction: 14 points and 51 pipe segments in approximately 0.26 seconds, without loading a model.
- WASM backend: loaded the shipped ONNX and classified a fixture RGB pixel correctly (distance 0 for the expected class).
- Editing: changed fixture count from 8 to 9; overlay increased from 14 to 15 point markers; changed label and review note. Deleting that edited row removed its 9 points, leaving 6.
- Exports: actual CSV and JSON files appeared in Downloads; inspected both. JSON contained scale, 56 items, both kinds, all geometry/source fields, and edited quantity/label/note. CSV contained expected header and edited row. The browser download-event observer timed out, so file existence and contents were checked directly instead.
- Manual mode: AI disabled; drew a three-vertex line, resized it to 4.00 m through quantity input, trimmed the final segment to 2.54 m. No inference was needed.
- Persistence: reloaded the app and restored the drawing, calibration, edited quantities and manual line.
- PDF: uploaded shipped residence-plumbing.pdf, confirmed drawing replacement, rendered page 1 at 2000 × 1375 via PDF.js. Calibration and quantities correctly reset.
- Responsive check: 390 × 844 viewport; no document horizontal overflow; drawing, controls and scope selection remained usable. Restored normal viewport afterward.

Limits: no verified RTX 3060 hardware benchmark; no independently trained plumbing YOLO weights supplied or accuracy benchmark. The custom YOLO postprocessor is unit tested, but a third-party plumbing model is not validated. Multi-page PDF switching is implemented but not exercised by this single-page fixture. Deployment was intentionally not performed.
- Browser missing-model recovery: configured a nonexistent ONNX URL; visible 404 notice was recorded; color fallback completed in 0.5 seconds with all 14 points and 51 pipe segments.

## Project workflow and real drawing update

- Created a named project in the new Projects screen; selected the real P-1 drawing and both plumbing outcomes. Calculation and Results remained disabled before calibration.
- Used Find scale bar, clicked the printed 0–4 m reference, and confirmed 4 m. Browser click placement gave 57.22 px/m; prepared geometry then produced 16 points and 93.04 m across 40 rows. Exact source-bar calibration is 57.073 px/m and gives approximately 93.28 m. The difference demonstrates calibration sensitivity, not a precision claim.
- Real example rows all carry manual provenance and scope notes. The monochrome heuristic test correctly returns zero suggestions; no real-sheet annotations are presented as model output.
- Reloaded and reopened the saved real project from Projects with all 40 rows and calibration preserved.
- Results layout checked at the normal 746 px preview and a temporary 1440 px desktop viewport: worksheet left, drawing right. No document horizontal overflow in the normal preview.
- Selecting CW main in the table highlighted its matching polyline and zoomed to it. Clicking the upper-WC cold branch on the drawing selected row p1-013 and scrolled the table to that row.
- Changed Water closet quantity from 2 to 3: matching markers increased to 3 and total increased from 16 to 17. Undo restored the original reference.
- Re-ran the detector sample through the standalone calculation screen: visible progress, disabled step navigation during processing, automatic Results transition, 14 points and 51 segments in 1.0 seconds.
- Disabled Assist with AI and continued through the manual-only route to Results without inference. CSV/JSON buttons were exercised again; schema and quantities are covered by the automated suite and the reference reports. The earlier downloadable-file verification above predates this UI update.
