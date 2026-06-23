# Framework — the learned models (torch → ONNX → onnxruntime-web)

Two honest learned models, trained offline and run live. The EXACT analytic engine is always the authority; these are
a fast **surrogate** of it + an out-of-envelope **flag**.

## Training (`data-pipeline/cclab/science/train_mill.py`, torch, `.venv-precompute`)

| Model | Architecture | Trained on | Scored against | Export |
|---|---|---|---|---|
| `power-surrogate` | MLP 6 → 64 → 64 → 2; standardisation of the features AND the targets folded into the export wrapper | operating points EVALUATED by the EXACT engine (`gen_train.mjs`, a sampled SAG / ball / rod envelope) | the EXACT engine, DOWNSTREAM (`eval_mill.mjs`) | `power-surrogate.onnx` (x → y = [power_kw, frac_centrifuging]) |
| `scenario-ood` | autoencoder 6 → 8 → 3 → 8 → 6 | in-distribution feature vectors | reconstruction MSE separates off-envelope | `scenario-ood.onnx` (x → xr = the anomaly score) |

The 6 features (`frontend/src/lib/learned.ts` :: `MILL_FEATURES`, mirrored in `cclab/model/learned.py`) are
`diameter_m, length_m, fill, phi_c, ball_top_mm, charge_density`. The surrogate's standardisation (mean/std of the
features AND the targets) is folded into the export wrapper, so the ONNX takes RAW features and returns RAW
`[power_kw, frac_centrifuging]`. The OOD autoencoder's wrapper returns the **standardized-space reconstruction MSE**
directly — the App reads a correctly-scaled anomaly score with no client-side scaler.

`gen_train.mjs` runs the SAME TS engine the browser runs (`evaluate(op)`), so the surrogate trains on exactly the
engine the App uses. The **lifter angle is held at the standard 35°** — the surrogate emulates the engine at the
canonical lifter geometry (stated honestly in the model honesty note). The ONNX is **self-contained**
(`external_data=False`): torch 2.12's exporter externalizes weights to a sidecar `.onnx.data` by default, which
onnxruntime-web's WASM EP cannot mount — embedding the (tiny) weights inside the single file is required for the
browser to load it.

## Training lineage (auditable)

The exact, seeded recipe — surfaced live in the Benchmark **Training transparency** panel (read from `cc-learned.json`)
so the held-out metric is visibly EARNED, not asserted:

- **Data design (`gen_train.mjs`, seed `20260621`):** 3000 in-envelope training points + 500 held-out in-distribution
  + 500 out-of-envelope, each labelled by the EXACT engine. The 6-feature envelope is a fixed-seed uniform sweep:
  `diameter_m [2.5–11] · length_m [3–12] · fill [0.12–0.45] · phi_c [0.45–0.92] · ball_top_mm [25–130] ·
  charge_density [2.8–5.6]`.
- **Surrogate (`train_mill.py`, `torch.manual_seed(0)`):** MLP 6→64→64→2 (ReLU), **4738 params**; Adam `lr 2e-3`,
  **160 epochs**, batch 128, MSE on standardised features+targets, **85/15 split → 2550 train / 450 val**; final
  train/val loss ≈ `1.1e-4 / 3.3e-4`; ONNX opset 17 (~20 kB).
- **OOD-AE:** autoencoder 6→8→3→8→6 (ReLU), 169 params, 180 epochs; AUC **0.922** (~5.5 kB).
- **Downstream skill:** power error **5.2 % ± 12.5 %** (mean ± σ) over the 500 held-out points — the σ tail is the
  low-power points where the relative error inflates; the predicted-vs-exact scatter (in kW) shows the bulk tracking
  the engine tightly. Reported whichever way the numbers land.

## The honest downstream eval (`eval_mill.mjs`)

The surrogate predicts `[power, frac-centrifuging]`; `eval_mill.mjs` runs the surrogate ONNX in Node (onnxruntime-web,
WASM EP) over the held-out in-distribution split and compares its **power to the EXACT analytic engine** on those same
points — the honest **downstream** skill, in the engine's own language (the engine is TypeScript, so the comparison
runs there, not in Python). It then assembles `data/derived/cc-learned.json` by merging the OOD-AE AUC + the honesty
note that `train_mill.py` wrote.

## Inference (`frontend/src/lib/ort.ts`, onnxruntime-web)

WASM execution provider, single-threaded; the npm package and the CDN `wasmPaths` are pinned to the same version
(1.27). There is **ONE global serialization chain for ALL WASM work** (session creation and inference): the two models
are queried together on every control change; without the chain their concurrent `create()` / `run()` calls race the
single WASM runtime and throw "Session already started". The loader is **graceful** — if a model is absent it resolves
to null and the App uses the EXACT engine (which runs live anyway) + shows the honest "pending training" state.

## Honesty

Held-out numbers (see [model evaluation](../architecture/06_model-evaluation.md)): the **power surrogate ≈ 5.2 %**
power error vs the exact engine (downstream); the **scenario OOD-AE AUC 0.922**, in-distribution p95 threshold **1.09**
(an operating point is flagged off-envelope when its ONNX anomaly score exceeds it). The **What-if** tab uses the
surrogate (instant operating-envelope sweeps); the **Anomaly** tab uses the OOD-AE (the in / off-envelope verdict). The
exact engine is the authority — reported whichever way the numbers land. No fabricated win.

> The training / precompute lane is local-only and **never deployed**: `data-pipeline/requirements-precompute.txt`
> pins `torch==2.12.1`, `onnx==1.22.0`, `onnxscript==0.7.0`, `numpy==2.1.3` (CPU). The default lane stays numpy-only so
> CI and the replay pipeline never need torch.
