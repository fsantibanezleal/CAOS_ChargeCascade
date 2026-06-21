# data-pipeline/ — the offline engine (`cclab`)

Rename `cclab` → `<slug>lab` per product. The **single source of physics/algorithm truth**; `frontend/` and
`app/` consume it, never re-implement it. Its own venv: **`.venv-pipeline`** (heavy SOTA engines, local-only).

## Layout (the package lives directly under `data-pipeline/`)
- `cclab/pipeline.py` — orchestrator + CLI (`python -m cclab.pipeline [all|<case>] [--seed N]`)
- `cclab/registry.py` — cases grouped by CATEGORY · `cclab/live.py` — Pyodide live entrypoint
- `cclab/io/` — `contract.py` (**CONTRACT 1**) · `formats.py` (standard readers/writers) · `schema.py` (types)
- `cclab/core/` — `rng.py` (seeded determinism) · `trace.py` · `manifest.py` (**CONTRACT 2**) · `gate.py`
- `cclab/model/` — the shared pure-Python core (Pyodide-safe); EXAMPLE = SIR
- `cclab/stages/` — `preprocess → feature_extraction → train → infer → evaluate → export`
- `cclab/cases/` — documented cases

Setup + run: `scripts/setup.{sh,ps1}` then `scripts/precompute.{sh,ps1}`. See
[../docs/architecture/05_precompute-pipeline.md](../docs/architecture/05_precompute-pipeline.md).
