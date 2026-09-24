# Detection evaluation and method choices

2026-09-24. Code/assets before this work are committed as `7e7fb77`.

## What changed and why

The 436-byte ONNX model calculates distance from a demonstration palette. WebGPU speeds that computation; it does not give it plumbing semantics. On the real monochrome P-1 sheet it returned **0 point items and 0 pipe runs in 1.4 seconds** in the available browser. The worksheet was genuinely empty, without prepared results being inserted.

The source PDF retains CAD layers and selectable text, so the new automatic route uses those directly. Before dash joining, browser extraction took **0.9 seconds**, found **12 point items** and **172 straight pipe strokes**, with **102.27 m** at the manually clicked 57.217 px/m scale. Exact reference calibration yields 102.529 m. This measures a different scope from the earlier manual reference, including vents and offsite diagram portions.

The first whole-sheet extraction also included 14 legend strokes (10 cold, 4 waste). A separate explicit **Left plan views** pipe-area option now excludes the right-side legend. With that selected, raw extraction has 158 strokes and 98.199 m at the reference scale.

Cold and vent layers contain repeated broken strokes. Counting only ink underestimates dashed pipe lengths. A conservative optional rule now joins collinear strokes on the same layer only when at least three gaps on that line repeat within 0.35 pixels; eligible gaps are 2–25 pixels. It leaves isolated/irregular gaps separate. On P-1 this reduces the 158 plan strokes to **104 segments** and adds **682.25 pixels (11.954 m at reference scale)** of explicitly inferred dash gaps. Total candidate length is **110.153 m**, requiring review; this is not a validated full-building quantity. Selected inferred gaps are orange/dashed, and each affected description reports the inferred pixels. Disable the option to compare raw strokes.

No ML weights were replaced or trained. Improvements come from input routing, PDF coordinate transforms, explicit layer/tag rules, deduplication and dash reconstruction. No LLM is used.

## Method selected for each element

| Element / input | Method | Interpretation and limits |
|---|---|---|
| Labelled fixtures / drains in vector PDF | Exact standalone tags: WC, SH, LAV, KS, WM, FD | Marker at the actual PDF text position. Abbreviations depend on the legend. Count only the selected view; entire sheet contains 27 tags including repeated views/legend. |
| Tagged cleanouts / valves / hydrants | CO, FCO, BV, GV, HYD tag rules | Only explicit matches. P-1's four unlabelled reference accessories are not inferred. Manually place them after review. |
| Cold / hot pipes | Named layers such as P-DCW / P-DHW | Open straight strokes, actual PDF transforms, optional regular dash reconstruction. |
| Soil / waste / vent pipes | P-SAN-BLCK / P-SAN-GRAY / P-SAN-VENT | Same geometry rules. Curves, closed symbols and short strokes under 8 pixels are excluded; no vertical runs inferred. |
| Fire pipes | Explicit plumbing fire/sprinkler layer names | Implemented rule; this sample contains none, so no sample validation claim. |
| Unknown / gas / storm / footing layers | No automatic measurement | Avoids turning walls or unrelated systems into pipe quantities. |
| Synthetic colored sample | ONNX WebGPU, WASM if GPU fails; explicit CPU color-rule comparison | Only demonstration palette recognition. Pipe extraction uses straight colored bands, not network semantics. |
| General raster / scanned PDF | Compatible custom trained YOLO for counts, or manual review | The shipped color model is not suitable for general monochrome plumbing. No fabricated fallback quantities. |

PDF automatic results use the legacy export source value `AI` (meaning automatic suggestion), but the interface labels them **PDF RULES**, the properties identify **Program · PDF rules**, and export notes state the exact method. Manual edits change source to `manual` while retaining original evidence for comparison. Export schema remains `{scale, items:[...]}`.

## Measured validation and its limits

- Actual PDF text and geometry are parsed at run time. No coordinates or quantity list from `example.json` are used by the automatic path.
- All 12 detected tags match the independently prepared same-sheet reference by label and position within 12 normalized pixels. This is not a held-out dataset or a general recall claim: relative to all 16 manually identified points, 4 remain unmeasured.
- Whole-sheet tags deliberately produce 27 matches. The selected upper-left count region avoids repeated views and legend entries. This is user-supplied area selection, not learned view understanding. Pipe area is selected independently; the real example defaults to the left plan views, excluding paths extending into the right-side legend. Full-sheet pipe mode is available for comparison.
- Straight-line lengths match extracted vector endpoints mathematically, but their takeoff meaning remains conditional: layer contents, scale, schematic breaks, omitted curves, fittings and verticals all need review. No percent-accuracy claim.
- Runtime measurements are on the available browser/host. GPU identity was not established; RTX 3060 cold-cache acceptance remains unverified. Existing 150/180-second bounds and tile limits remain in place.
- Model failure preserves existing quantities and reports an error. A successful zero-result run shows zero. The manual worked example requires its own explicit button and never runs as a fallback.

Reproduce: `npm test`, `node scripts/benchmark-pdf.mjs`, `npm run build`. `tests/pdf-benchmark.json` records the actual PDF extraction run. Browser comparison: open real sample, calibrate, choose **Test bundled ONNX**, then compare with **PDF labels + named CAD layers**. Recalculation explicitly confirms replacement of current rows.

## Model research

[FloorCAD YOLOv8n](https://huggingface.co/mudasir13cs/floorcad-yolov8n-detect/tree/main) exposes approximately 6.27 MB PyTorch weights for architectural classes, but no ready ONNX file in the inspected repository. [YOLOplan](https://github.com/DynMEP/YOLOplan) provides detection/training infrastructure; its generic pretrained option is not evidence of plumbing recognition. Neither was substituted without validating domain coverage and real-sheet outputs. A plumbing-trained ONNX detector remains supported through Custom YOLO settings.

The [provided Beam AI video](https://www.youtube.com/watch?v=e6HQdqL1Nyc&t=13s) informed the review-workspace direction. This demo uses a simpler quantities / drawing / element-details layout, not a claim of equivalent recognition or human QA capability.
