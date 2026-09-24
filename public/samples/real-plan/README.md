# P-1 real-drawing worked example

Source: [public PDF](https://cdn2.f-cdn.com/files/download/285210373/mep-p-1.pdf), titled Residential Project - Solar Power + Rainwater Harvesting, David Meyer Consulting, sheet P-1, revision marked As-Built 2025-09-05. Retrieved 2026-09-24. The constructed condition has not been independently verified. Source title block retained; no ownership or redistribution license is claimed.

This is a **prepared manual reference**, not output from the bundled detector. Count each fixture once across the two views. Anchors identify diagram tags, not architectural fixture footprints. Measure only visible, in-building supply and sanitary centerlines. Exclude gas, storm/footing drainage, diagram breaks outside the building, vertical runs, fitting allowances and unshown appliance branches. Diameters and transitions need checking.

Calibration: printed 4 m bar, x=201.634 to 429.926 at y=1540.470 in the 2400 × 1696 raster; 57.073 pixels/m. The app requires the user to calibrate again.

| Count category | Quantity |
|---|---:|
| Water closets | 2 |
| Showers | 2 |
| Lavatories / laundry sink | 3 |
| Kitchen sink | 1 |
| Washing-machine connection | 1 |
| Floor drains | 3 |
| Main valve | 1 |
| Above-floor cleanouts | 2 |
| Divided sanitary chamber | 1 |

| Measured system | Approximate length |
|---|---:|
| Cold | 28.00 m |
| Hot | 21.10 m |
| Soil / black water | 11.70 m |
| Waste / gray water | 32.46 m |
| Included pipe total | 93.28 m |

`worked-takeoff.json` and `.csv` contain 40 editable rows. Reference construction is reproducible with `node scripts/make-real-example.mjs`. These are partial plan measurements, not procurement quantities or a full building takeoff.
