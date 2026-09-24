# ArchiQuant

A browser-first residential plumbing takeoff workspace: load a PDF/image, select outcomes, calibrate, detect or trace, review, and export. Built in this folder; **not deployed**. The examples, neural OCR weights and experimental small ONNX model are shipped, so a visitor needs no API key, account, model download configuration or Python setup.

## Run locally

Node.js 22.12+ or 24 is recommended.

```sh
cd ArchiQuant
npm ci
npm run build
npm start
```

Open **http://localhost:3000**. `PORT` overrides 3000. For development, run `npm run dev` (port 5173). Use HTTP localhost or HTTPS, not `file://`; WebGPU requires a secure browser context. Chrome/Edge are recommended. The browser loads PDF.js and ONNX Runtime only when needed; runtime WASM files are served by the same app. An optional Google Font falls back to system fonts when offline.

## Project workflow

The app opens on **Projects**. Create a named project or reopen an existing one. Each project has its own drawing, calibration, selected outcomes and quantities saved on this device.

**Projects → Drawing & scope → Set scale → Calculate → Results** remain separate screens, without a persistent numbered step strip or decorative sidebar. The calculation screen shows actual processing progress and supports cancellation. Results use three columns: editable quantities on the **left**, drawing in the **center**, and element descriptions/properties on the **right**. Narrow phones can scroll across the workspace. Selecting a row focuses and highlights its geometry; selecting an overlay highlights and scrolls to its row.

## Try the real drawing

1. Create a project. Choose **an example → Use real drawing** and keep both plumbing outcomes selected.
2. Choose **Set scale → Find scale bar**. Click both endpoints of the printed **0–4 m** bar and confirm **4 meters**.
3. Continue to **Calculate** with **Automatic** selected. Keep the count area on **Upper-left plan** to avoid the repeated view and legend. Keep Pipe area on **Left plan views** to exclude the right-side legend; counts and pipes have independent area selections.
4. Run takeoff: the original PDF is read in the browser. It yields **12 tagged fixtures/drains** and **104 pipe segments** when regular dash joining is enabled (158 separate strokes when disabled). The four unlabelled valve/cleanout reference points are not automatically inferred.
5. Select a row or overlay. The right column explains the label or CAD layer, measurement formula and limitations; orange dashes mark inferred joins on the selected pipe. Edit and export CSV/JSON. Descriptions are included in exported notes.

**Calculate the traced example** remains a separate, explicitly manual reference option: 16 point items and approximately 93.28 m at the exact scale. It is never invoked by detection or a failure. Automatic quantities have different coverage (including vents and offsite drawn segments, with legend strokes excluded) and must not be treated as equivalent to that partial reference.

The original public P-1 PDF, raster, attribution, scope exclusions and reference CSV/JSON are in [public/samples/real-plan](public/samples/real-plan/README.md). The detailed sheet is marked as-built and includes below-slab and above-slab views; its constructed condition is not independently verified. These are **partial visible-plan quantities**: gas, storm/footing drainage, offsite diagram breaks, vertical runs, fittings and unshown branches are excluded. The source title block is retained; public access does not establish a redistribution license. Review source permissions before public distribution.

## Try a scanned construction PDF

Choose **Use scanned drawing** for the second real project, **HSU House**. The included image-only PDF is a compressed raster derivative of a real construction sheet, not a physical paper scan. Use **Find scale bar**, click the added **10 ft** guide, select **Feet**, and confirm. Automatic mode uses local **neural OCR** to find fixture tags; type verified mappings such as `P-1=Water closet` if needed. Unknown P-number tags remain unmapped. Choose an analysis area to exclude legends and repeated views.

The first browser run took **9.7 seconds**, finding five of six visible numbered tags plus two note-only candidates requiring review. It does not find every fixture or accessory. The bundled trained YOLO model ran on **WebGPU in 4.4 seconds but returned false positives** on this scan; it is available under **Experimental detector comparison**, disabled by default. These are not verified RTX 3060 benchmarks.

In Results, **Trace assist** follows pipe ink between user-selected endpoints/bends; **Enter / Finish line** creates an editable length. Select the pipe system yourself. Use **Length** for faint, dashed or obscured routes. Scan pipe length stays unmeasured until traced. One tested HSU bend measured **1.61 m** at the source scale, not a whole-network total. Descriptions explain OCR, legend interpretation and guided tracing, and are retained in exported notes. See [SCAN_EVALUATION.md](SCAN_EVALUATION.md) for measured results, missed tags, rejected models and reproduction steps.

## Try the detector sample

1. Create a project, choose **an example → Use detector sample**, select **Plumbing** and leave both outcomes selected.
2. Choose **Set scale**. Click both endpoints of the lower dimension marked **10 000 mm (10 m)**, enter **10 meters**, and confirm. Zoom in for careful placement.
3. Continue to **Calculate**, then click **Run takeoff**. The sample should yield **14 points**: 8 fixtures, 2 valves, 2 floor drains, 1 hydrant and 1 cleanout; it also produces cold/hot/waste pipe segments. Exact length depends on your calibration and raster gaps; this is not a precision benchmark.
4. Select a worksheet row or marker. Edit label, group, quantity and notes. Drag selected count markers or pipe vertices. Use **Place another**, **Redraw line**, **Remove selected point**, **Trim last segment**, **Delete**, and Undo. Quantity edits update geometry: added count markers must be repositioned; length changes resize the existing line around its first vertex.
5. Download **CSV** and **JSON report**. All automatically suggested rows are labeled `AI · REVIEW`; changing an item makes its source `manual`.

The sample is original synthetic artwork, not a real construction document. Its PNG, source SVG and PDF are in `public/samples/`. You can test PDF upload with `residence-plumbing.pdf`. Reproduce the assets with `npm run sample` and `node scripts/make-pdf.mjs`.

### Manual-only workflow

After calibration, turn off **Enable automatic calculation** and choose **Continue with manual takeoff**. In Results, select **Count** and click a fixture, or select **Length** and click successive pipe vertices. Press **Enter** or **Finish line** to finish; **Escape** cancels. Count and Length toolbar buttons create new rows; the selected row's editor adds points or redraws its geometry. Rename groups to Cold, Hot, Soil, Waste, Vent, Fire, or any specification (such as `Cold · DN20`). Unclassified manual pipes use `Pipe`. Calibration is required for trusted length totals and all exports.

## What detection does—and what you must check

- The **bundled 436-byte ONNX model is a color-symbol demonstration detector**, not a pretrained plumbing YOLO. It runs actual browser inference, choosing WebGPU first and WASM CPU second. A separate explicit color-rule mode remains available for comparison. Model failure stops detection and preserves the previous worksheet; it does not silently substitute heuristic or prepared-reference results. Successful zero detection produces an empty worksheet with a notice.
- **Custom YOLO mode is implemented** for plumbing-trained YOLO11n-class ONNX detection exports: 640-square NCHW float32 RGB input, `[1, 4+C, N]` output, non-maximum suppression in the client, correct user-specified class ordering. Put weights under `public/models`, rebuild and enter their app URL in Detection settings. Remote model URLs must allow CORS. The model download is limited to 40 MB and 25 seconds. No generic COCO model is misrepresented as a plumbing detector. See `public/models/README.md`.
- For vector PDFs, automatic mode reads exact fixture abbreviations inside the selected count area and open straight strokes on named plumbing CAD layers. Repeated regular dash gaps can be joined, with inferred geometry marked and explained. Unknown layers, gas, storm/footing drainage, curved/closed symbols and irregular gaps are not converted into trusted pipe quantities. Layer naming is a rule, not model confidence. Scanned PDFs cannot supply this evidence.
- For images in color-demo mode, pipes are suggested from sample-compatible colors using horizontal/vertical raster run extraction. The systems are color assumptions, **not semantic recognition** of a drawing's legend. Crossings, occlusions, short branches, dashed lines, diagonals and curves can be missed or fragmented. Monochrome drawings may return no automatic geometry; use manual tools or a suitable custom detector for counts. Walls are not silently classified as pipes.
- Check every symbol, system, pipe diameter/material, centerline, discontinuity, duplication and reference dimension. The application measures **2D plan centerline lengths**, not a full connected network. Add separate manual lengths/notes for vertical risers and drops. It does not infer concealed runs, fittings, slopes, allowances, quantities on other sheets, procurement lengths or code compliance.
- No costs, unit rates, other trades, IFC, full connectivity graph or accuracy-percentage claims. This is a working takeoff/review MVP, not equivalent to the general recognition capability of a trained commercial product.

## Processing and performance

Drawings are normalized to a maximum 2,400 pixels on the longest side before calibration. Synthetic/custom detector inference runs in a dedicated worker over overlapping 640-pixel tiles with 64-pixel overlap; this yields at most 25 tiles at the input limit, with an additional hard check at 36 tiles. Detections are merged across tile boundaries. Progress, elapsed time, selected backend and notices are visible. Cancel terminates the worker; existing quantities remain intact. A 150-second work budget and 180-second watchdog bound processing; timeout stops processing without inserting substitute results. Scan OCR uses overlapping 720-pixel crops; the optional scan symbol model uses 320-pixel crops enlarged to 640 (96-tile cap). Both run locally with the same time limits. PDF input is also bounded to 50,000 text items and 250,000 drawing operators.

Validation on the available browser: **1.2 seconds** for the sample's first model run using WebGPU, producing 14 points and 51 pipe segments. The automated Node explicit color-rule test took about **0.26 seconds**. Hardware identity was not established; these are **not verified RTX 3060 benchmark numbers**. A target-device acceptance check should record a cold run after clearing browser cache, from Run takeoff to completed notice. The target is under 3 minutes and the requested ceiling is 20 minutes.

## Review and persistence

Each named project and the project index are saved in memory and `localStorage`, including its raster, scale, outcomes and items; up to 30 undo snapshots are held in memory. A storage/quota failure is shown in **Activity & notices** and the session remains usable until closed. Use exports for durable copies. JSON report import is not implemented. Original PDF bytes and the multi-page page selector are held only for the current tab; a reload restores the selected raster page. Switching drawing/page clears its measurements only after a replacement confirmation; export first.

Uploaded files are **never sent to the Node server or stored online**. It serves static assets and `/health`; non-read requests are rejected. There is therefore no online upload store needing a 24-hour deletion job. Custom remote model requests download weights; they do not upload plan pixels. Browser-local data persists until cleared via Activity & notices or browser settings. Unexpected errors and GPU-to-CPU fallback reasons are shown in the app.

## Export contract

```json
{
  "scale": {
    "pixelsPerMeter": 100,
    "confirmed": true,
    "reference": {"points": [{"x": 265, "y": 865}, {"x": 1265, "y": 865}], "distance": 10, "unit": "m"}
  },
  "items": [{
    "id": "uuid", "kind": "length", "group": "Cold", "label": "Cold water pipe",
    "qty": 2.5, "unit": "m", "geom": {"points": [{"x": 100, "y": 100}, {"x": 350, "y": 100}]},
    "source": "manual", "note": "Check DN20 specification"
  }]
}
```

Coordinates are pixels in the normalized displayed raster, origin top left. Count `geom.points` contains one point per item; length `geom.points` is a polyline. Count unit is `ea`; length output is meters even if the reference was entered in feet. CSV has UTF-8 BOM, quoted fields and formula-injection protection. JSON retains geometry and calibration; CSV is the worksheet. Export quantities round to three decimals; the UI shows lengths to two decimals.

## Railway deployment (prepared, not performed)

1. Connect `WateryWaterman/ArchiQuant`, branch `main`. This repository contains the app at its root: leave Railway's Root Directory unset (or `/`). Only use `/ArchiQuant` if you later move it into a monorepo subfolder.
2. Use the included `railway.json`: build `npm ci --include=dev && npm run build`, start `npm start`, health check `/health`.
3. Use Node 22.12+ or 24. The build explicitly includes development dependencies because Vite is needed even when `NODE_ENV=production`.
4. Railway supplies `PORT`; the server binds to `0.0.0.0`. Generate an HTTPS domain for WebGPU. No database, volume, secret or background cleanup service is needed.

Both real-project PDF examples are tracked in Git and copied into the production build. The example chooser has links that open them directly in a new browser tab. After deployment, use these paths on your Railway domain:

- `/samples/real-plan/residential-asbuilt-p1.pdf` — original vector drawing.
- `/samples/hsu-house/hsu-p301-scan.pdf` — image-only scan evaluation copy.

The server returns `application/pdf` for both; no external source site, upload store, or account is needed to open them. The synthetic PDF is also included at `/samples/residence-plumbing.pdf`.

## Structure and extension points

- `src/main.js`: scope/outcome selection, document handling, editor, local persistence and exports.
- `src/scan.worker.js` and `src/scan-core.js`: neural OCR, optional trained scan detector, tag interpretation and guided raster tracing.
- `src/pdf-analysis.js`: PDF label/layer extraction, coordinate transforms and conservative dash reconstruction.
- `src/explanations.js`: deterministic element descriptions and export notes; no LLM.
- `src/core.js`: geometry, unit conversion, schema, CSV, tiling and YOLO postprocessing; independent of the UI.
- `src/engine.worker.js`: inference provider selection, tile processing, pixel detection, geometry extraction and progress messages.
- `src/workflow.js`: project library, staged navigation, saved projects and the real reference workflow.
- `src/style.css`, `src/workflow.css` and `src/review.css`: responsive workspace, staged screens and dialogs.
- `server.mjs`: tiny static Node server; `scripts/`: reproducible sample/model assets and local runtime packaging.

Add a future scope in the English scope menu and drawing-and-scope page with its own outcome identifiers and worker adapter returning the same count/polyline item contract. Keep calibration, manual editing, persistence and exporters shared. Electrical/structural cards are deliberately disabled until an implementation exists.

## Verification

`npm test` checks calibration/feet conversion, polyline quantities, export schema and escaping, tiling, YOLO decoding/NMS, the shipped ONNX graph and extraction from the actual sample PNG. `npm run build` creates the production app. Browser acceptance covers calibration, WebGPU inference, live edits, geometry, exports and manual mode. Use the notes in `tests/verification.md` for the final checked state and limitations.

Implementation references: [ONNX Runtime WebGPU](https://onnxruntime.ai/docs/tutorials/web/ep-webgpu.html), [runtime provider/fallback options](https://onnxruntime.ai/docs/tutorials/web/env-flags-and-session-options.html), [Ultralytics ONNX export](https://docs.ultralytics.com/modes/export/), [PDF.js](https://mozilla.github.io/pdf.js/).

## Detector evaluation and rollback

See [ALGORITHM_NOTES.md](ALGORITHM_NOTES.md) for the measured comparison, method selection, limits, model research and reproduction commands. On the real sheet, the bundled WebGPU model returned zero detections in 1.4 seconds; PDF evidence extraction took 0.9 seconds in the browser before dash joining. These are not RTX 3060 hardware-certified or general-accuracy benchmarks.

The checkpoint before scanned-PDF work is **c4d60a2**. The earlier pre-UI/evidence checkpoint is **7e7fb77**. Git tracks code and bundled assets, not browser-local project data. Export project reports separately.
