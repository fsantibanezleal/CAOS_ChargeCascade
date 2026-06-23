# Changelog

All notable changes to this product. Format: `X.XX.XXX` (display) — see `cclab.__version__`. Keep `0.x`
while on synthetic/calibrated data. Tag every release.

## [0.07.000] — 2026-06-23

Bring-to-bar pass after a deep gap review (vs the RotorVitals reference). The review found ChargeCascade is a real
workbench — 8 reactive tabs, two genuinely-trained ONNX models, deep bilingual docs — with ONE control that made it
look fake: a no-op mill-type selector. This release kills that.

### Fixed
- **Mill-type selector is no longer a no-op (the blocker).** The ball/sag/rod/ag chips wrote `op.millType` but the
  physics engine never read it, so toggling them changed nothing on screen — exactly the kind of fake control that
  must not ship. Each chip now loads that machine's characteristic geometry/media/density preset (`MILL_PRESETS`):
  ball D 4 m / ρ 4.8, SAG D 10 m / ρ 3.0, rod D 3.5 m / ρ 5.5, AG D 7 m / ρ 2.7. The engine already differentiates on
  D/L/J/φc/top-media/lift/ρ, so the critical speed, regime, power and 3D charge now visibly change — verified ball
  1.19 MW → SAG 6.11 MW → rod 0.74 MW → AG 1.55 MW. The sliders fine-tune from the loaded preset; relabelled the
  group "Mill type (preset)".
- **The dead `ag` chip is now real.** `'ag'` was in the `MillType` union and rendered a 4th chip but mapped to no
  geometry. AG (autogenous) is now a genuine 4th machine in `MILL_PRESETS`: no steel media — competent ore lumps are
  the grinding media (~100 mm top), so its charge bulk density (2.7 t/m³) sits below SAG's (3.0, ore + steel),
  giving a distinct, lower-power machine.

### Notes
- Frontend-only change (the live `MILL_PRESETS` UI convenience); the committed cases/artifacts and the offline bake
  are unchanged. Remaining bring-to-bar backlog (gap review): a Comminution/Bond tab, a What-if inverse recommender,
  learned-model training transparency, viz-layer bilingual parity, per-case docs, a live custom-mill ingest.

## [0.06.000] — 2026-06-21

### Added
- **Documentation wiki (ADR-0056).** A navigable `docs/` rewritten from the archetype template into real mill
  content: `architecture/` (the lanes, determinism+trace, the gate, the live lane = native TS engine +
  onnxruntime-web, the precompute pipeline, model evaluation, deploy, the two data contracts), `frameworks/`
  (the analytic mill engine; the three.js/uPlot/KaTeX viz; the torch→ONNX learned models), `cases/` (the
  4-category taxonomy + the 10-case matrix), `guides/` (instantiate, precompute/retrain, bring-your-own-mill,
  the GPU lane, the dormant API, the Architecture modal).

## [0.05.000] — 2026-06-21

### Added
- **The two learned models (torch → ONNX → onnxruntime-web).** A power surrogate (6 mill features → net power +
  fraction centrifuging) and a scenario OOD autoencoder, trained offline on the EXACT analytic engine
  (`science/gen_train.mjs` + `train_mill.py`) and evaluated DOWNSTREAM against it (`eval_mill.mjs`). Held-out:
  surrogate **5.2%** power error vs exact; OOD-AE **AUC 0.922** (in-dist p95 threshold 1.09). They drive the
  App's What-if + Anomaly tools (live in the browser, graceful null-until-trained). `requirements-precompute.txt`
  pins `torch 2.12.1+cpu`, `onnx 1.22.0`, `onnxscript 0.7.0`, `numpy 2.1.3`.

### Fixed
- onnxruntime-web: ONE global serialization chain for all WASM work (the two models query the single-threaded
  runtime together each frame; without it they raced → `Session already started`).
- ONNX exported self-contained (`external_data=False`) so the WASM EP can load the weights (torch 2.12's
  exporter externalizes by default, which the browser cannot mount).

## [0.04.000] — 2026-06-21

### Added
- **The real App workbench** — the 6-page SPA on `@fasl-work/caos-app-shell`. Eight genuine domain views, each
  reacting to the case selector + the live mill controls: a 3D Three.js mill (`Mill3D`, the charge riding the
  shell then flying the cataract parabolas — a kinematic animation of the analytic engine, NOT a DEM solve), the
  trajectory cross-section, the φc×J regime map, the power-vs-φc curve, gauges, a sensitivity table, the What-if
  surrogate and the Anomaly guard. Introduction / Methodology (KaTeX, 7 references) / Implementation / Experiments
  (the 10-case table) / Benchmark (the learned held-out metrics). The in-app ⓘ Architecture modal (ADR-0058).

## [0.03.000] — 2026-06-21

### Added
- **The Python core (`cclab`).** The two data contracts (mill operating-point ingestion + the artifact), the
  staged numpy-light pipeline, the lane gate (`LIVE_RUNTIMES = {ts-mill, onnxruntime-web}`), the manifest/trace
  (`chargecascade.manifest/v2`, `chargecascade.trace/v1`), the cases-by-category registry, and the `--retrain`
  orchestration. Tests for both contracts + pipeline determinism.

### Fixed
- Power magnitude: rewrote `power.ts` to the transparent Hogg-Fuerstenau torque-arm form `P = ω·M·g·arm`
  (`P ∝ D^2.5`, `C_ARM` calibrated so the reference 4×6 m ball mill draws ~1.3 MW) — the first draft was ~10×
  too low. The engine oracle now checks the realistic magnitude (800–1800 kW) + the D^2.5 scaling.

## [0.02.000] — 2026-06-21

### Added
- **The mill engine (`frontend/src/mill/`, dependency-free TypeScript).** Critical speed `Nc = 42.3/√(D−d)`, the
  Davis (1919) per-shell departure (`cos α = ω²r/g = φc²·r/R`) + the cataract parabolas, the regime classifier
  (slumping/cascading/cataracting/centrifuging), the power models (Hogg-Fuerstenau / Morrell-form / Bond), and
  `evaluate(op) → MillResult` (the single source of physics truth). `node:test` oracle, 10 checks.

## [0.01.000] — 2026-06-20

### Added
- Initial instantiation from the CAOS product-repo archetype (ADR-0057): the offline `data-pipeline/` skeleton
  (the two data contracts, the named staged pipeline, the seeded RNG, the compact trace, the manifest, the
  measured live-vs-precompute gate), the cases-by-category registry, a dormant live-lane entrypoint, and the CI
  guards — before the mill engine and the real cases replaced the template's example engine.
