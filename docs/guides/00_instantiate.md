# Guide, how ChargeCascade was instantiated from the archetype

ChargeCascade is a product instance of the frozen CAOS product-repo archetype (ADR-0057). The **base**, the
folder layout, the two data contracts, the staged pipeline + its stage names, the lane gate, the manifest/trace
shapes, the two-venv split, cases-by-category, and the CI guards, is **not re-litigated per product**. Only the
**core** (the engine + the visualizations + the cases + the content) is product-specific. This guide records how the
core was filled for ChargeCascade so the pattern is reproducible.

What was specialised on top of the frozen base:

1. **Rename the example package → `cclab`.** The package folder, all imports, `pyproject.toml`
   (`[tool.setuptools]` name + packages), the scripts' `-m cclab.pipeline`, and the docs all use `cclab`
   (ChargeCascade Lab, version `0.03.000`).

2. **Replace the example engine with the TS mill engine.** ChargeCascade's physics is a native **TypeScript**
   engine, `frontend/src/mill/` (`criticalspeed` · `charge` · `regime` · `power` · `engine` · `cases`), exposing
   `evaluate(op: Operating) → MillResult`. It runs **in the browser** (live, on every control change) and **in the
   Node bake** (via `tsx`) so the offline artifacts are produced by the *same* engine the user sees. There is **no
   in-browser Python runtime and no Python live engine**, `cclab/live.py` is intentionally dormant (it just documents this).

3. **Write the two data contracts.**
   - **CONTRACT 1, ingestion** (`cclab/io/contract.py`): what a valid mill operating point is , 
     `REQUIRED_COLUMNS = mill_id, mill_type, diameter_m, length_m, fill, phi_c, ball_top_mm, charge_density`, the
     range guards (`fill ∈ [0,0.6]`, `phi_c ∈ (0,1.5]`, `ball_top_mm < diameter`), and the honesty flags
     (centrifuging at `φc ≥ 1`, over-speed, high/low fill, large ball/diameter ratio). See
     [guide 02](02_bring-your-own-data.md).
   - **CONTRACT 2, artifact** (`cclab/core/manifest.py` + `core/trace.py`): the compact per-case trace + manifest +
     flat index the SPA replays. Validated on disk by `scripts/check_artifacts.py`.

4. **Define the 10 cases-by-category** (`cclab/cases/mill_cases.py` + `registry.py`), kept in lock-step with
   `frontend/src/mill/cases.ts`: mill **type** (`K-BALL`, `K-SAG`, `K-ROD`), **speed sweep**
   (`S-CASCADE`, `S-CATARACT`, `S-CENTRIFUGE`), **fill regime** (`D-LOWFILL`, `D-HIGHFILL`), and two **analytic
   controls** (`C-CRITICAL` at φc = 1, `C-EMPTY` at J = 0). Documented in `docs/cases/`.

5. **Build the 6 pages** (App · Introduction · Methodology · Implementation · Experiments · Benchmark) on the React
   SPA in `frontend/`, with the 3D mill + the workbench visualizations.

6. **Write the 2 learned models** (`cclab/science/train_mill.py` → `power-surrogate.onnx` + `scenario-ood.onnx`) , 
   a power/centrifuging surrogate MLP and an OOD autoencoder. See [guide 01](01_precompute-pipeline.md) and
   [guide 03](03_gpu-lane.md).

7. **Ship the Architecture modal** (ADR-0058): `frontend/src/architecture.ts` with the 5 tabs + 5 themed SVGs in
   `frontend/public/svg/tech/`, pinned to `@fasl-work/caos-app-shell ^0.1.2`. See [guide 05](05_architecture-modal.md).

If you find yourself editing the base (the layout, the contracts, the gate, the env or the deploy) rather than the
core, that is the smell ADR-0057 exists to remove, the structure is shared and frozen.
