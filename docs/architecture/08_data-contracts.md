# The two data contracts

## CONTRACT 1, ingestion (`io/contract.py`)

The *bring-your-own-mill* gate. A record is **accepted** iff it passes; ill-formed records are **rejected** with a
reason (never silently coerced); plausible-but-extreme records are **flagged** (accepted; the flag travels into the
manifest). It defines a valid **mill operating point** so the app accepts YOUR mill, not just the built-in cases.
Documented in `data/README.md`.

`REQUIRED_COLUMNS = (mill_id, mill_type, diameter_m, length_m, fill, phi_c, ball_top_mm, charge_density)`.

| column / check | unit / range | on violation |
|---|---|---|
| `mill_id` | non-empty | reject (missing) |
| `mill_type` | one of `CATEGORIES` (SAG / ball / rod) | reject |
| `diameter_m`, `length_m`, `ball_top_mm`, `charge_density` | > 0 | reject |
| `fill` (J) | in `[0, 0.6]` | reject if out of range |
| `phi_c` (φc) | in `(0, 1.5]` | reject if out of range |
| `ball_top_mm` vs `diameter_m` | ball < diameter (mm vs m) | reject if ball ≥ diameter |
| `phi_c ≥ 1` | centrifuging | flag (honesty) |
| over-speed / high fill / low fill | extreme but plausible | flag |

The honesty flags (`φc ≥ 1` centrifuging, over-speed, high / low fill) are accepted and recorded into the manifest, not
rejected. The committed sample mill points must pass (a CI test asserts it).

## CONTRACT 2, artifact (`core/{trace,manifest}.py`)

The pipeline → web contract. The web loads only manifests + traces + the shared artifacts.

- **`chargecascade.trace/v1`** (`core/trace.py`, per case): the mill descriptor, the critical speed (`Nc`, `φc`, `ω`),
  the regime band, the charge geometry (toe / shoulder angles, `frac_centrifuging`), the net power + the power-vs-`φc`
  curve, the Bond energy cross-check, and the learned-model index (`status: trained | pending-training`).
- **`chargecascade.manifest/v2`** (`core/manifest.py`, per case): category, the engine + version, the **shared
  artifacts** (`power-surrogate.onnx`, `scenario-ood.onnx`, `cc-learned.json`, `case-results.json`), the trace pointer +
  byte size, the lane / gate verdict, the CONTRACT-1 flags, the metrics, and an honesty note.
- **`chargecascade.index/v1`**: the flat inventory of all 10 cases.

A TS mirror, `frontend/src/lib/contract.types.ts`, declares these shapes so a drift **fails `tsc`** (the web and
pipeline shapes can never diverge silently). `scripts/check_artifacts.py` enforces manifest ↔ artifact consistency
(existence, byte size, lane == gate verdict).
