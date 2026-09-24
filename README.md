# ArchiQuant

A browser-first residential plumbing takeoff workspace: load a PDF/image, select outcomes, calibrate, detect or trace, review, and export. Built in this folder; **not deployed**. The original sample and tiny model are shipped, so a visitor needs no API key, account, model download configuration or Python setup.

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

**Projects → Drawing & scope → Set scale → Calculate → Results** are separate screens. The calculation screen shows actual processing progress and supports cancellation. Results place the editable quantity table on the **left** and drawing on the **right** (stacked on narrow phones). Selecting a row focuses and highlights its geometry; selecting an overlay highlights and scrolls to its row.

## Try the real drawing

1. Create a project. Choose **an example → Use real drawing** and keep both plumbing outcomes selected.
2. Choose **Set scale → Find scale bar**. Click both endpoints of the printed **0–4 m** bar and confirm **4 meters**.
3. Continue to **Calculate → Calculate the traced example**. This uses prepared manual geometry, not AI recognition. Every row is labeled `manual` and includes a review note.
4. Review 40 rows: **16 point items** and approximately **93.28 m** of included cold/hot/soil/waste pipe centerlines at the exact reference scale. Your clicks may change the measured length slightly.
5. Select rows or drawing overlays, edit the takeoff, and export CSV/JSON.

The original public P-1 PDF, raster, attribution, scope exclusions and reference CSV/JSON are in [public/samples/real-plan](public/samples/real-plan/README.md). The detailed sheet is marked as-built and includes below-slab and above-slab views; its constructed condition is not independently verified. These are **partial visible-plan quantities**: gas, storm/footing drainage, offsite diagram breaks, vertical runs, fittings and unshown branches are excluded. The source title block is retained; public access does not establish a redistribution license. Review source permissions before public distribution.

## Try the detector sample

1. Create a project, choose **an example → Use detector sample**, select **管网 / Plumbing** and leave both outcomes selected.
2. Choose **Set scale**. Click both endpoints of the lower dimension marked **10 000 mm (10 m)**, enter **10 meters**, and confirm. Zoom in for careful placement.
3. Continue to **Calculate**, then click **Run takeoff**. The sample should yield **14 points**: 8 fixtures, 2 valves, 2 floor drains, 1 hydrant and 1 cleanout; it also produces cold/hot/waste pipe segments. Exact length depends on your calibration and raster gaps; this is not a precision benchmark.
4. Select a worksheet row or marker. Edit label, group, quantity and notes. Drag selected count markers or pipe vertices. Use **Place another**, **Redraw line**, **Remove selected point**, **Trim last segment**, **Delete**, and Undo. Quantity edits update geometry: added count markers must be repositioned; length changes resize the existing line around its first vertex.
5. Download **CSV** and **JSON report**. All automatically suggested rows are labeled `AI · REVIEW`; changing an item makes its source `manual`.

The sample is original synthetic artwork, not a real construction document. Its PNG, source SVG and PDF are in `public/samples/`. You can test PDF upload with `residence-plumbing.pdf`. Reproduce the assets with `npm run sample` and `node scripts/make-pdf.mjs`.

### Manual-only workflow

After calibration, turn off **Assist with AI** and choose **Continue with manual takeoff**. In Results, select **Count** and click a fixture, or select **Length** and click successive pipe vertices. Press **Enter** or **Finish line** to finish; **Escape** cancels. Count and Length toolbar buttons create new rows; the selected row's editor adds points or redraws its geometry. Rename groups to Cold, Hot, Soil, Waste, Vent, Fire, or any specification (such as `Cold · DN20`). Unclassified manual pipes use `Pipe`. Calibration is required for trusted length totals and all exports.

## What detection does—and what you must check

- The **bundled 436-byte ONNX model is a color-symbol demonstration detector**, not a pretrained plumbing YOLO. It runs actual browser inference, choosing WebGPU first and WASM CPU second. A deterministic color/component fallback keeps the sample usable when model loading or inference fails.
- **Custom YOLO mode is implemented** for plumbing-trained YOLO11n-class ONNX detection exports: 640-square NCHW float32 RGB input, `[1, 4+C, N]` output, non-maximum suppression in the client, correct user-specified class ordering. Put weights under `public/models`, rebuild and enter their app URL in Detection settings. Remote model URLs must allow CORS. The model download is limited to 40 MB and 25 seconds. No generic COCO model is misrepresented as a plumbing detector. See `public/models/README.md`.
- Pipes are suggested from sample-compatible colors using horizontal/vertical raster run extraction. The systems are color assumptions, **not semantic recognition** of a drawing's legend. Crossings, occlusions, short branches, dashed lines, diagonals and curves can be missed or fragmented. Monochrome drawings may return no automatic geometry; use manual tools or a suitable custom detector for counts. Walls are not silently classified as pipes.
- Check every symbol, system, pipe diameter/material, centerline, discontinuity, duplication and reference dimension. The application measures **2D plan centerline lengths**, not a full connected network. Add separate manual lengths/notes for vertical risers and drops. It does not infer concealed runs, fittings, slopes, allowances, quantities on other sheets, procurement lengths or code compliance.
- No costs, unit rates, other trades, IFC, full connectivity graph or accuracy-percentage claims. This is a working takeoff/review MVP, not equivalent to the general recognition capability of a trained commercial product.

## Processing and performance

Drawings are normalized to a maximum 2,400 pixels on the longest side before calibration. Inference runs in a dedicated worker over overlapping 640-pixel tiles with 64-pixel overlap; this yields at most 25 tiles at the input limit, with an additional hard check at 36 tiles. Detections are merged across tile boundaries. Progress, elapsed time, selected backend and notices are visible. Cancel terminates the worker; existing quantities remain intact. A 150-second work budget and 180-second watchdog bound processing; the watchdog attempts a heuristic retry once.

Validation on the available browser: **1.2 seconds** for the sample's first model run using WebGPU, producing 14 points and 51 pipe segments. The automated Node raster fallback test took about **0.26 seconds**. Hardware identity was not established; these are **not verified RTX 3060 benchmark numbers**. A target-device acceptance check should record a cold run after clearing browser cache, from Run takeoff to completed notice. The target is under 3 minutes and the requested ceiling is 20 minutes.

## Review and persistence

Each named project and the project index are saved in memory and `localStorage`, including its raster, scale, outcomes and items; up to 30 undo snapshots are held in memory. A storage/quota failure is shown in **Activity & notices** and the session remains usable until closed. Use exports for durable copies. JSON report import is not implemented. Original PDF bytes and the multi-page page selector are held only for the current tab; a reload restores the selected raster page. Switching drawing/page clears its measurements only after a replacement confirmation; export first.

Uploaded files are **never sent to the Node server or stored online**. It serves static assets and `/health`; non-read requests are rejected. There is therefore no online upload store needing a 24-hour deletion job. Custom remote model requests download weights; they do not upload plan pixels. Browser-local data persists until cleared via Activity & notices or browser settings. Unexpected errors and GPU/model fallback reasons are shown in the app.

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

1. Push this folder to your repository. If using a monorepo, set the Railway service root directory to `/ArchiQuant`.
2. Use the included `railway.json`: build `npm ci && npm run build`, start `npm start`, health check `/health`.
3. Use Node 22.12+ or 24. Install development dependencies during build (Vite is needed); do not set `NPM_CONFIG_PRODUCTION=true` for the build.
4. Railway supplies `PORT`; the server binds to `0.0.0.0`. Generate an HTTPS domain for WebGPU. No database, volume, secret or background cleanup service is needed.

## Structure and extension points

- `src/main.js`: scope/outcome selection, document handling, editor, local persistence and exports.
- `src/core.js`: geometry, unit conversion, schema, CSV, tiling and YOLO postprocessing; independent of the UI.
- `src/engine.worker.js`: inference provider selection, tile processing, pixel detection, geometry extraction and progress messages.
- `src/workflow.js`: project library, staged navigation, saved projects and the real reference workflow.
- `src/style.css` and `src/workflow.css`: responsive workspace, staged screens and dialogs.
- `server.mjs`: tiny static Node server; `scripts/`: reproducible sample/model assets and local runtime packaging.

Add a future scope in the drawing-and-scope page with its own outcome identifiers and worker adapter returning the same count/polyline item contract. Keep calibration, manual editing, persistence and exporters shared. Electrical/structural cards are deliberately disabled until an implementation exists.

## Verification

`npm test` checks calibration/feet conversion, polyline quantities, export schema and escaping, tiling, YOLO decoding/NMS, the shipped ONNX graph and extraction from the actual sample PNG. `npm run build` creates the production app. Browser acceptance covers calibration, WebGPU inference, live edits, geometry, exports and manual mode. Use the notes in `tests/verification.md` for the final checked state and limitations.

Implementation references: [ONNX Runtime WebGPU](https://onnxruntime.ai/docs/tutorials/web/ep-webgpu.html), [runtime provider/fallback options](https://onnxruntime.ai/docs/tutorials/web/env-flags-and-session-options.html), [Ultralytics ONNX export](https://docs.ultralytics.com/modes/export/), [PDF.js](https://mozilla.github.io/pdf.js/).
