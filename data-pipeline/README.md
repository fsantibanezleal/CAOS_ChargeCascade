# data-pipeline/, the offline lane (`pipeline`)

The ChargeCascade offline package (instantiated from the archetype's `productlab`): the two data contracts, the
staged pipeline + lane gate, and the learned-model training. The **physics single source of truth is the
TypeScript mill engine** (`frontend/src/mill/`), which the offline bake runs unchanged in Node (via `tsx`) , 
`pipeline` never re-implements it. Its own venv: **`.venv-pipeline`** (local-only).

## Layout (the package lives directly under `data-pipeline/`)
- `pipeline/pipeline.py`, orchestrator + CLI (`python data-pipeline/run.py [all|<case>] [--seed N]`)
- `pipeline/registry.py`, cases grouped by CATEGORY · `pipeline/live.py`, Pyodide live entrypoint
- `pipeline/io/`, `contract.py` (**CONTRACT 1**) · `formats.py` (standard readers/writers) · `schema.py` (types)
- `pipeline/core/`, `rng.py` (seeded determinism) · `trace.py` · `manifest.py` (**CONTRACT 2**) · `gate.py`
- `pipeline/model/`, shared pure-Python helpers (Pyodide-safe); here the learned-model helpers (`learned.py`), the physics lives in the TS engine
- `pipeline/stages/`, `preprocess → feature_extraction → train → infer → evaluate → export`
- `pipeline/cases/`, documented cases

Setup + run: `scripts/setup.{sh,ps1}` then `scripts/precompute.{sh,ps1}`. See
[../docs/architecture/05_precompute-pipeline.md](../docs/architecture/05_precompute-pipeline.md).
