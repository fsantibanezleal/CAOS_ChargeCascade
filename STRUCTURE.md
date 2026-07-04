# STRUCTURE — the actual layout of this repo

ChargeCascade is an instance of the CAOS product-repo archetype (ADR-0057). This page maps what is actually
here; the full rationale lives in [docs/architecture/01_overview.md](docs/architecture/01_overview.md).

## Execution lanes (as built)

| Lane | Where | Notes |
|---|---|---|
| **Live (browser)** | `frontend/src/mill/` (TypeScript, dependency-free) | the SINGLE source of physics truth; recomputes on every control move |
| **Offline bake** | `data-pipeline/cclab` orchestrates; the bake runs the **same TS engine** in Node (via `tsx`) | no Python re-implementation — live and baked numbers are identical by construction |
| **Learned (torch → ONNX)** | `data-pipeline/` retrain lane (separate `.venv-precompute`, local-only) | trains the power surrogate + the OOD-AE; the `.onnx` run live via onnxruntime-web |
| **API** | `app/` (FastAPI) | **dormant** — activates only on an ADR-0002 trigger ([app/README.md](app/README.md)) |

## Tree

| Path | What |
|---|---|
| `frontend/` | React + Vite + Three.js app; `src/mill/` = engine (criticalspeed · charge · regime · power · engine · cases · contract · inverse); `src/pages/` = App/Introduction/Methodology/Implementation/Experiments/Benchmark; `src/viz/` = the canvases; `test/` = engine tests |
| `data-pipeline/` | `cclab`: CONTRACT 1 (`io/contract.py`), CONTRACT 2 (`core/manifest.py`), staged pipeline, lane gate, learned-model training ([data-pipeline/README.md](data-pipeline/README.md)) |
| `data/` | contracts + committed artifacts: `examples/mills.csv`, `derived/<case>/trace.json`, `derived/manifests/`, the ONNX models + `cc-learned.json` lineage ([data/README.md](data/README.md)) |
| `docs/` | the ADR-0056 wiki: `architecture/` · `frameworks/` · `cases/` · `guides/` ([docs/README.md](docs/README.md)) |
| `tests/` | Python tests: the two contracts, manifests, pipeline smoke |
| `scripts/` | cross-platform setup / precompute / dev / smoke ([scripts/README.md](scripts/README.md)) |
| `deploy/` | GitHub Pages workflow notes (`pages.md`, the default) + dormant VPS templates |
| `app/` | dormant FastAPI lane |
| `manifests/`, `models/` | legacy archetype mounts; the canonical artifacts live under `data/derived/` |

## The two data contracts

1. **Ingestion (mill descriptor → pipeline)** — `data-pipeline/cclab/io/contract.py`, mirrored live in TS
   (`frontend/src/mill/contract.ts`, the Custom-mill tab). Accept / reject-with-reason / flag; documented in
   [data/README.md](data/README.md).
2. **Artifact (pipeline → web)** — `data/derived/manifests/<case>.json` (+ `index.json`); the TS mirror
   `frontend/src/lib/contract.types.ts` fails the build on drift; `scripts/check_artifacts.py` guards it in CI.
