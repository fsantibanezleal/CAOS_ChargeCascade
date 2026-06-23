# Changelog

All notable changes to this product. Format: `X.XX.XXX` (display) — see `cclab.__version__`. Keep `0.x`
while on synthetic/calibrated data. Tag every release.

## [0.10.001] — 2026-06-23

Bring-to-bar T6 (a polish fix): **bilingual parity in the viz layer.** The pages were ES/EN but the canvas/chart axis
labels and captions were EN-only, so switching to Spanish left the plots half-English.

### Fixed
- Plumbed `useShellLang()` into the four viz components that draw their own text — **PowerChart** (axis labels: net
  power / fraction of critical speed), **RegimeMap** + **ComminutionMap** (the φc and fill-J axis labels), and
  **TrajectoryDiagram** (the `cos α` caption, the `shoulder→hombro` marker, and the `regime / % centrifuging`
  readout). Each now localises its descriptive text from the shell language. (`BondCurve` was already bilingual.)
- The motion-regime **names** stay raw English (slumping / cascading / cataracting / centrifuging) — the same
  technical classification the App's pills and the engine use everywhere — so only the descriptive prose is
  translated, keeping the UI internally consistent. Verified live in ES on every affected tab; 0 console errors.

## [0.10.000] — 2026-06-23

Bring-to-bar T5: **learned-model training transparency** — the two ONNX models were genuinely trained, but the
Benchmark only showed two numbers (5.2 % / AUC 0.922). This surfaces the full, auditable lineage so the held-out
metric is visibly EARNED, not asserted.

### Added
- **The training lineage is now emitted by the pipeline and rendered live.** `train_mill.py` writes the surrogate's
  real recipe (architecture `MLP 6→64→64→2`, 4738 params, Adam lr 2e-3, 160 epochs, batch 128, MSE, 85/15 split →
  2550/450, final train/val loss, opset 17) + the OOD-AE's (6→8→3→8→6, 169 params, 180 epochs, AUC); `gen_train.mjs`
  writes the data design (`train-design.json`: 3000 train / 500 held-out / 500 OOD, 6 features, fixed seed 20260621,
  the sampled envelope ranges); `eval_mill.mjs` adds the **power-error std** and a **predicted-vs-exact scatter** of
  the surrogate on the held-out points + the on-disk model sizes. All assembled into `cc-learned.json` (schema v2).
- **Benchmark — "Training transparency (auditable)"**: a lineage table (architecture / optimizer / loss / split /
  final losses / power error mean ± σ / ONNX opset + size / OOD-AE) + the **predicted-vs-exact scatter** (points sit
  on the y=x diagonal — the surrogate tracks the exact engine) + the data-design line (n points, seed, envelope).
  The power error is now reported as **5.2 % ± 12.5 %** (the σ tail is the low-power points where the relative error
  inflates; the scatter shows the bulk tracking tightly).
- **`docs/frameworks/03_torch-onnx.md`** gains a "Training lineage (auditable)" section with the exact seeded recipe.

### Notes
- The retrain is deterministic (fixed seeds): the committed ONNX bytes are unchanged; only `cc-learned.json` gains the
  lineage + scatter. `data/raw/*` stays git-ignored/regenerable. 10 mill tests pass.

Bring-to-bar T4: an **inverse recommender** on the What-if tab — instead of reading the output of a φc, set a GOAL
and the exact engine solves the φc that meets it. The highest-interactivity feature for a workbench (you find the
operating point for a target, not just read a forward number).

### Added
- **`mill/inverse.ts`** — solves the inverse problem on the EXACT engine (the surrogate is only for sweeps):
  - `solvePhiCForPower` / `solvePhiCForCapacity` — net power (Hogg-Fuerstenau) is monotone in φc, so a target net
    power (and the grinding capacity `P/W` that scales with it) is a clean **bisection** over φc ∈ [0.30, 1.05],
    with the floor/ceiling reported.
  - `recommendPhiCForRegime` — scans φc for the contiguous band that classifies as the target motion regime at the
    current geometry (using the real engine, since `fracCentrifuging` can move the centrifuging onset), returning the
    band + a representative φc (band midpoint for grinding regimes; the onset for centrifuging, flagged
    non-operational — grinding collapses there).
- **What-if tab — "Inverse: target → recommended φc"**: pick a motion regime (cascading / cataracting /
  centrifuging) → recommended φc + band, or drag a target-throughput slider → the φc that delivers it. Each has an
  **apply** button that sets the live operating point, so the whole workbench updates. Edge cases handled honestly:
  over-ceiling targets say "out of reach: the ceiling is X t/h"; below-floor targets say "φc 0.30 already exceeds it
  — spare capacity"; centrifuging is flagged as the limit to avoid.
- **Tests:** 4 inverse round-trip tests (`solvePhiCForPower` re-evaluates to the target within 1 kW; the ceiling is
  flagged; capacity round-trips through `P/W`; the regime recommendation actually classifies as that regime and the
  bands are ordered). 14 mill tests pass.

Bring-to-bar T3: a **Comminution** tab (the 9th App view), lifting Bond grinding duty from a buried KPI to a
first-class workbench view — takes the App from 8 tabs toward the ≥10–12 bar with zero invented filler.

### Added
- **Comminution tab** — connects Bond's process-energy law to the mill's mechanical power. Bond's law sets the
  specific grinding energy `W = 10·Wi·(1/√P80 − 1/√F80)` [kWh/t] (a function of the ore + the F80→P80 size
  reduction, independent of mill speed/fill); the Hogg-Fuerstenau engine sets the net power `P_net` [kW]; their
  ratio `P_net / W` is the **power-limited throughput capacity** [t/h] — the real "where does this mill grind the
  most of THIS ore?" answer.
  - **Capacity heatmap** (`ComminutionMap`, canvas) of `T = P_net(φc,J)/W` over the φc×J plane, re-evaluating the
    exact engine on a 48×28 grid: bright = higher capacity, red hatch = below the target tonnage (the mill cannot
    meet the duty there), **grey = centrifuging (grinding collapses)**. The grey mask is an honesty fix: the
    Hogg-Fuerstenau torque model is monotone in φc and is NOT tapered at centrifuging, so raw `P/W` there is not a
    real capacity — those cells are masked and the colour scale is taken over the grinding region only.
  - **Bond energy-size curve** (`BondCurve`, SVG): `W` vs product P80 (log axis) — the specific energy rises as you
    grind finer — with the current operating point and a dashed **available-energy** line (`P_net/tph`); where it
    crosses the curve is the finest P80 the mill can achieve at that throughput (with an off-scale note when the
    mill has abundant spare energy).
  - **Duty KPIs**: Bond W [kWh/t], net power, capacity (P/W) [t/h], and the margin vs the target throughput — an
    honest "can this mill meet the duty?" power balance. All reactive to the φc/fill/diameter/ball-size sliders, the
    case selector, and the mill-type presets.
- Adversarially reviewed (physics + honesty): verdict **SOUND** — the P/W units, the centrifuging mask, the Bond
  available-energy crossing and the cross-surface self-consistency (`available ≥ demand ⇔ capacity ≥ tph ⇔ margin ≥
  0 ⇔ feasible`) all check out; an earlier self-contradiction (the heatmap painting centrifuging as high-capacity
  while the copy said grinding collapses) was caught and fixed before ship. 10 mill tests pass.

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
