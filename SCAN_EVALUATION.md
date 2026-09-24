# Scanned PDF evaluation — 2026-09-24

Rollback checkpoint before this work: **c4d60a2** (same tree as ac66222). Git saves code/assets; browser projects need separate report exports.

## Decision

Use **neural OCR + explicit legend interpretation for tagged fixtures**, and **user-guided raster ink tracing for pipe lengths** on scans. Retain PDF label/layer extraction for vector drawings and the tiny color ONNX only for the synthetic demonstration. The tested generic CAD symbol detectors did not generalize to this residential plumbing scan, so neither is presented as a reliable automatic solution. The small model remains an optional, clearly experimental WebGPU comparison; the larger model is not shipped.

This adds a usable **assisted** scanned-PDF path, not complete automatic plumbing recognition. Unlabelled valves, drains, hydrants, cleanouts and unreadable fixtures still require manual review/counts. OCR markers start on text and must be checked against leaders and moved to equipment. Pipe tracing requires the user to identify the route and bends.

## Independent real project

[HSU House, SsD / TWIG, construction plumbing set](https://www.ssdarchitecture.com/wp-content/uploads/Plumbing-Issued-for-Construction-7.11.12.pdf), page 3 / P-301.00, issued July 3, 2012. Two floor plans, existing/new equipment, gas/storm piping, riser indications and revision clouds. This is a different project from the earlier Guasca as-built example.

The shipped test is a **scan surrogate**, rasterized from that real sheet, mildly blurred and JPEG compressed. It is not claimed to be a physical scan. Its PDF has **zero selectable text items**, no drawing layers and no prepared detection coordinates. The inference path receives only rendered pixels. Independent visual annotations in `tests/hsu-scan-ground-truth.json` are used only in tests, never by the app.

The added calibration ruler is derived from the original 36 × 24 inch sheet / stated 1/4 inch = 1 foot scale. It is visibly labeled and requires user confirmation. Exact conversion: 54.680665 pixels/m. Browser two-click calibration measured 54.75 pixels/m; ordinary clicking introduces measurement variation.

## What was tried and measured

| Method | Measured run | Result / decision |
|---|---:|---|
| FloorCAD YOLOv8n, original raster, 640-pixel crops, CPU | 0.95 s, 20 crops | No plumbing detections at score ≥0.35; lower-score hits were unrelated marks. |
| FloorCAD YOLOv8n, 320-pixel crops enlarged to 640, CPU | 3.40 s, 70 crops | Seven ≥0.35 false positives, zero correct fixture symbols on the pre-ruler image. |
| Same small model in browser WebGPU, shipped scan including added ruler | **4.4 s**, 70 crops | Nine false positives, zero correct fixture symbols. Fast execution is not useful recognition. Disabled by default. |
| Small-model contrast cutoffs 220 / 235 / 245 / 250 and inverted input | 3–4 s per pass on CPU | Still text/annotation detections and misclassifications. Rejected as the default. |
| Architect YOLOv8m, normal / inverted raster | 18.58 / 19.20 s CPU | Normal: no candidates ≥0.20. Inverted: six incorrect candidates ≥0.20 (three ≥0.35). 103.7 MB ONNX, no demonstrated gain; not shipped. |
| Neural OCR, full-sheet 2× enlargement | 6.17 s CPU | Only one of six numbered tags passed the 60 OCR-score cutoff. |
| Neural OCR, overlapping crops + dark-ink preprocessing | **7.75 s Node; 9.7 s first browser run**, warm 8.9–9.5 s | Located **5 of 6 visible numbered tags**: P-1, two P-2, P-3, second-floor P-4. Missed ground-floor P-4. Browser also returned two note abbreviations (FD/LAV), requiring removal or resolution. |
| Guided ink tracing, one manually selected water-pipe bend | interactive | **88 pixels = 1.609344 m** at exact source scale; no white gap crossed. Verified against selected straight legs of 48 + 40 pixels. This is one segment, not a network total. |

Browser and Node OCR differ slightly because PDF rendering / browser interpolation / Sharp resampling differ. Do not treat different candidate counts as equivalent evaluations. These timings came from this development machine; its RTX 3060 identity was **not verified**. First browser run includes OCR worker/model initialization but is not a certified cache-cleared hardware benchmark. Both measured paths were well below three minutes. A 150-second work budget and 180-second watchdog cap each run; failures preserve the prior worksheet.

The tag metric is **83.3% recall of six visually counted numbered tags**, not fixture recall, detector mAP, construction accuracy or completed quantities. Five of the seven browser candidates were numbered fixture tags; two were note-only locations. No complete fixture/accessory/pipe ground truth or cross-project generalization claim is made.

## Adjustments and why

- **Routing:** an image-only PDF still has an empty evidence object. Automatic routing now checks actual text/path entries, so scans reach the raster path instead of silently returning an empty PDF calculation.
- **Neural OCR:** local Tesseract LSTM English weights, 720-pixel crops / 120-pixel overlap, 3× enlargement, luminance threshold 170, sparse-text segmentation and OCR score ≥60. Removing faint architectural background and enlarging text improved numbered-tag localization from 1/6 to 5/6 in this evaluation. This preprocessing may erase faint tags on other scans; it is not universally optimal.
- **Interpretation:** exact abbreviations and user-supplied `tag=meaning` mappings; P-number tags remain unmapped without a verified legend. Crops are deduplicated spatially; two nearby sinks remain two items. No LLM or sample coordinate lookup is used.
- **Model evaluation:** real trained YOLOv8n exported to ONNX (12.3 MB), correct checkpoint class order, cross-tile box suppression, WebGPU with WASM CPU fallback. No weights were fine-tuned on the evaluation sheet. It failed the domain test, so the UI labels it experimental instead of silently accepting its counts. The separately tested YOLOv8m did not improve results.
- **Pipe lengths:** a shortest-path search follows ink within 28 pixels of the user-selected segment. Endpoints snap within nine pixels; substantial blank gaps/detours are rejected. User waypoints choose bends and systems; simplified paths remain editable and export as `manual` with detailed algorithm provenance. Raster walls and annotations can attract paths, so review is mandatory.
- **Review:** each item records its method, interpreted class, evidence, confidence meaning and limits. Legend inputs persist immediately, including when Run is clicked directly after typing. Manual edits keep original evidence; exports retain the existing schema and include descriptions in notes.

The source has a semantic inconsistency worth reviewing: P-4 is listed as shower on its legend but appears over a sink in the second-floor plan. The application does not infer a resolved meaning. The evaluated reviewed example keeps it unmapped.

## Reproduce

1. `npm ci && npm run build && npm start`.
2. New project → examples → **Use scanned drawing** → Set scale → Find scale bar → click both endpoints of the added 10 ft guide → **Feet / 10** → confirm.
3. Automatic calculation, neural OCR enabled, experimental model off. Run; inspect the numbered tags, remove or resolve note-only hits, relocate markers, and trace desired pipe routes. P-1/P-2/P-3 mappings can be entered after checking the source legend; leave P-4 unresolved.
4. To compare WebGPU, open **Experimental detector comparison**, enable the symbol model and disable OCR. Run and review the actual false positives. Re-enable OCR afterward.
5. `npm test` checks scan routing, zero text in the sample PDF, spatial deduplication, exact mappings, cross-tile suppression, bent ink paths, blank-gap rejection and the selected actual HSU pipe segment, alongside existing tests.
6. `node scripts/benchmark-scan-ocr.mjs` runs real neural OCR locally with shipped weights and writes `tmp/scan-ocr-benchmark.json`. Recorded CPU detector outputs and the OCR evaluation are under `tests/scan-*.json`.

Runtime assets and weights are served by the app. Plans never leave the browser; no API key, Python runtime or external OCR service is needed to use the web app. Python/Poppler are only for reproducing the sample/model conversion. Model attribution, licenses, hashes and conversion details: `public/models/SCAN_MODELS.md`.
