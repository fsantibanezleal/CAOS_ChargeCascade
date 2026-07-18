# Architecture, overview

ChargeCascade is an instance of the **CAOS product-repo archetype** ([ADR-0057]): an offline-pipeline-heavy,
backend-optional product that deploys as a static, deterministic-replay viewer. The base is **frozen** (instantiated,
never re-litigated); per-product rework lives only in the **core**, the mill physics engine, the visualisations, the
cases, content.

The distinctive thing about ChargeCascade is that the **physics is the live lane**: the critical speed, the Davis
per-shell charge departure, the cascading → cataracting → centrifuging regime classifier and the Hogg & Fuerstenau /
Morrell power draw are TypeScript that run in the browser, and the power surrogate + OOD autoencoder run via
onnxruntime-web, so the App recomputes the charge motion, the regime and the power as you drag the diameter, length,
fill, speed or top ball size, and the 3D animates the same trajectories the engine just computed.

## The lanes (and what runs where)

| Lane | Where | Deps | Notes |
|---|---|---|---|
| **Live (client-side)** | `frontend/src/mill/` (critical speed + Davis charge + regime + power) + onnxruntime-web (the surrogate + OOD-AE) | web npm | the interactive core; recomputes on every control change, sub-ms |
| **Offline (precompute)** | `cclab/science/`, Node bake of the SAME TS engine (`tsx`) + torch training | `data-pipeline/requirements-precompute.txt` | bakes `case-results.json` + the ONNX |
| **Replay (light)** | `cclab.pipeline` (numpy) | `data-pipeline/requirements.txt` | reshapes the committed bake → per-case traces + manifests |
| **API (backend)** | `app/` (FastAPI) | `requirements-api.txt` | DORMANT; activate only on an ADR-0002 trigger |

A measured **[gate](03_the-gate.md)** records the live-vs-replay verdict per case (at this scale the TS engine is
sub-millisecond, so every case is LIVE).

## The flow

`mill operating point (a case or yours)` → **[CONTRACT 1](08_data-contracts.md)** (`io/contract.py`) → the TS mill
engine (bake) → `case-results.json` → **[CONTRACT 2](08_data-contracts.md)** (`core/manifest.py` + `core/trace.py`, the
compact per-case trace) → `data/derived/` (committed) → the `frontend/` App replays it **and** recomputes it live.

## Frozen base vs rework

- **Frozen:** the folder layout, the two contracts, the staged pipeline names, the gate, the manifest/trace, the
  two-venv split, the cases-by-category mechanism, CI guards.
- **Rework (the only per-product surface):** the mill physics engine (`frontend/src/mill/` + the stage bodies), the
  `frontend/` visualisations, and the cases + content + calibration.

## What ChargeCascade is and is NOT

- **Is:** Davis (1919) single-particle charge motion + Hogg & Fuerstenau (1972) net power (plus a calibrated Morrell-form consistency check; the full Morrell 1996 C-model is the documented upgrade) + the
  cascading → cataracting → centrifuging transition rendered in 3D, with an honest surrogate-vs-exact comparison and an
  out-of-envelope flag.
- **Is NOT:** a DEM / N-body discrete-element solver, the 3D is a kinematic animation of the analytic engine, and a
  real DEM / PEPT trace is the documented offline upgrade. The operating points are synthetic-but-realistic (clearly
  labelled), the power magnitude is calibrated to real industrial values, and the `C-*` cases are exact analytic
  controls.

[ADR-0057]: ../../../conventions/architecture/0-archetype/ADR-0057-product-repo-archetype.md
