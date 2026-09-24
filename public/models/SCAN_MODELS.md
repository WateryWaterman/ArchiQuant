# Scan models and provenance

## Recommended: neural OCR

Tesseract.js 6.0.1 / Tesseract LSTM English, on-device WASM CPU. Runtime files are copied from pinned npm dependencies into `/ocr` at build time. English weights are shipped locally as `ocr/eng.traineddata.gz` (2,952,873 bytes):

https://cdn.jsdelivr.net/npm/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz

SHA256: `45b4cb346724ac1774f1c36f42f182b887bcdb28ebe63e6fff90ac41f3fcff91`.

Apache-2.0; license text in `ocr/LICENSE-Apache-2.0.txt`. Upstream: https://github.com/naptha/tesseract.js and https://github.com/tesseract-ocr/tessdata_best . Reads text, not equipment semantics. Exact abbreviations/user-entered legend rules interpret tags. P-number tags without a mapping remain explicitly unmapped.

## Experimental: FloorCAD YOLOv8n

Author/model: https://huggingface.co/mudasir13cs/floorcad-yolov8n-detect

Weights downloaded from `resolve/main/best.pt`; checkpoint SHA256 `be1a5a404c5ad1c454ba7531e2c16548a6330945319cbf989751ff73578b494c`.

Converted using `scripts/export-floorcad.py`, PyTorch 2.14 CPU, Ultralytics 8.4.161, ONNX opset 17. The script uses a weights-only loader with an explicit allowlist of architecture classes. No retraining. Static float32 `[1,3,640,640]` RGB input; raw `[1,39,8400]` output. Labels come from the checkpoint, saved in `floorcad-labels.json`.

`floorcad-yolov8n.onnx`: 12,275,025 bytes. SHA256 `fdb07d6cf5de3b1eecb29bc9a0f983cd783b1ad8d8bb160c0156f6bb4f00646e`.

Model card license **AGPL-3.0**; full license in `LICENSE-floorcad-AGPL-3.0.txt`. Source/conversion and authorship are provided here. The app fetches this model only when experimental detection is explicitly enabled. It is not selected by default: it failed our HSU raster accuracy evaluation. Architecture CAD symbols are not equivalent to scanned plumbing construction symbols. It does not support every requested accessory.

The second evaluated model, https://huggingface.co/SamirShabani/Architect (YOLOv8m; CC-BY-NC-4.0 per author), is **not shipped**. Its 103.7 MB float32 ONNX export was slower and also unsuccessful on this scan. See the evaluation record; the model author's validation scores are not our app's accuracy.
