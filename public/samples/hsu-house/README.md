# HSU House: second real-project scan test

Source: SsD Architecture / TWIG, **HSU House, 94 North First Street, Brooklyn**, plumbing construction set issued **07.03.2012**, sheet **P-301.00** (page 3 of the eight-page set).

[Original construction set](https://www.ssdarchitecture.com/wp-content/uploads/Plumbing-Issued-for-Construction-7.11.12.pdf).

`hsu-p301-scan.pdf` is an **image-only evaluation derivative**, not a physical paper scan. It contains the real ground/second-floor drawing rasterized to 2400 × 1600, mildly blurred (0.25-pixel Gaussian), and JPEG compressed at quality 87. PDF text extraction returns **zero items**. No CAD layers, text coordinates, detections or prepared quantities are embedded. The JPG is the exact raster placed into that PDF.

An added 10 ft calibration guide is outside the original drawing border. Its 166.667-pixel span is derived from the source's 36 × 24 inch page and stated 1/4 inch = 1 foot scale. It is identified as an added guide; verify the original scale before construction use. App calibration still requires two clicks and user confirmation.

All original title-block attribution remains. The architect publishes the source publicly; no redistribution license was identified. This copy is included for the requested local evaluation. Resolve redistribution permission before publishing these sample assets.

The full sheet contains existing equipment, gas/storm routes, riser indications and revision clouds. They are not automatically a new-plumbing quantity scope. In particular, the P-4 legend entry says shower but the second-floor tag appears over a sink: the app deliberately does not hardcode a meaning for P-number tags.

See `SCAN_EVALUATION.md` in the repository root for results and limitations. `tests/hsu-scan-ground-truth.json` is independent visual test annotation, never read by the application. `scripts/make-hsu-scan.py` reproduces the derivative after the original page is rendered to `tmp/pdfs/hsu-construction-p3.png` at 3600 × 2400 using Poppler.
