# The live lane (TypeScript + onnxruntime-web)

ChargeCascade's live lane is **native TypeScript** — the mill physics engine in
[`frontend/src/mill/`](../../frontend/src/mill/) — running directly in the browser, with onnxruntime-web for the two
learned models. There is **no server and no Python in the browser**: the same dependency-free TS modules run in the
browser and in the offline Node bake (via `tsx`), so there is exactly **one** implementation of the physics — no
re-port, no drift.

## The modules

| Module | Role |
|---|---|
| `criticalspeed.ts` | the critical speed `Nc = 42.3/√(D−d)` [rpm], the speed ratio `φc = N/Nc`, and `ω`. The constant `42.3 = (60/2π)·√(2g)` is derived, not fitted |
| `charge.ts` | the Davis (1919) per-shell departure: a charge element on a radial shell at radius `r` departs where `cos α = ω²r/g = φc²·(r/R)`, then flies a parabola `y = x·tanα − g·x²/(2v²cos²α)` to the toe — the outer shells thrown highest (the cataract fan); the shoulder / toe angles and `fracCentrifuging` (the fraction of shells with `cos α ≥ 1`) |
| `regime.ts` | the regime classifier with `CASCADE_CATARACT_PHIC = 0.65`; the bands slumping (`φc ≲ 0.4`) / cascading (0.4–0.65) / cataracting (0.65–0.9) / centrifuging (`φc ≳ 0.9`) |
| `power.ts` | Hogg & Fuerstenau (1972) net power as the torque-arm of the charge centre of mass `P_net = ω·M·g·arm` (from first principles `P ∝ D^2.5`); `morrellFormKw` (Morrell 1996 C-model as a calibrated form, ±9.8% on 82 data sets); `bondWKwhT` (Bond 1961 process-energy cross-check); `chargeMassT` |
| `engine.ts` | `evaluate(op) → MillResult` — the single source of physics truth the App reads AND the ground-truth the offline sweep trains the surrogate on (the ChancaDEM pattern) |
| `cases.ts` | the 10 canonical cases (shared by the App and the bake) |

`power.ts` detail: `M = ρc·πR²L·J·1000` [kg], `arm = C_ARM·R·sinα·(1−1.065J)`, with `C_ARM = 0.80` **calibrated** so
the reference 4.0 × 6.0 m ball mill draws ~1.3 MW. `bondWKwhT` computes `W = 10·Wi·(1/√P80 − 1/√F80)` [kWh/t] — the
process ENERGY cross-check, NOT the charge power; it has no `φc` or `J`, so it does **not** animate.

## The two learned models via onnxruntime-web

The **power surrogate** and the **scenario OOD autoencoder** run client-side via onnxruntime-web (the WASM execution
provider, `numThreads = 1`, `wasmPaths` pinned to the same CDN version 1.27 as the npm package). The feature vector is
the 6-tuple `(diameter_m, length_m, fill, phi_c, ball_top_mm, charge_density)` — the order in the TS feature builder,
mirroring `cclab/model/learned.py`'s `MILL_FEATURES`. Because both models query the runtime together every frame, all
WASM work (session creation **and** every `run`) goes through **one global serialization chain** — the single-threaded
runtime is not re-entrant, and without this the two models race and throw `Session already started`.

The loader is **graceful**: if the ONNX are absent (not yet trained) it resolves to `null`, the App uses the EXACT
analytic engine live anyway (it is cheap), and the UI shows the honest "pending training" state instead of fabricating
numbers.

## The 3D animation — kinematic, not DEM

`viz/Mill3D.tsx` (three.js `^0.171`: `WebGLRenderer` + `OrbitControls` + a `BufferGeometry` charge-particle cloud, with
proper `dispose()` on teardown) animates the **same Davis trajectories** `charge.ts` computes — a **kinematic animation
of the analytic engine**, not a DEM / N-body discrete-element solve. A real DEM / PEPT trace is the documented offline
upgrade. This is the "interactive value-readout viz that reacts to the controls": every control change re-runs
`evaluate(op)` and re-draws the charge motion, the regime, the power readout and the power-vs-`φc` curve live.
