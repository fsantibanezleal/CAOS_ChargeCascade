# Model evaluation

ChargeCascade has two kinds of "model": the **exact analytic engine** (Davis / Hogg & Fuerstenau / Morrell / Bond,
checked against closed-form oracles) and **two learned models** (a power surrogate + an OOD autoencoder, measured
against the exact engine).

## The exact engine, oracles, not faith

The TS test suite (`node:test` in `frontend/test/mill.test.ts`) pins the engine to 10 oracles:

- **Critical speed**, `Nc = 42.3/√(D−d)` to tolerance (the `42.3` is the derived `(60/2π)·√(2g)`, not a fit).
- **The φc = 1 departure**, at the critical speed the outermost shell satisfies `cos α = 1`, i.e. it just centrifuges.
- **The power peak**, `P_net` peaks near a fractional filling `J ≈ 0.47` (the torque-arm maximum), as Hogg &
  Fuerstenau predict.
- **`D^2.5` scaling**, net power scales with diameter as `P ∝ D^2.5` from first principles.
- **Realistic magnitude**, the reference ball mill draws `800 < P < 1800` kW (`C_ARM = 0.80` is calibrated to ~1.3 MW).
- **Bond**, `W = 10·Wi·(1/√P80 − 1/√F80)` against a worked value.
- **Charge mass**, `chargeMassT` against the geometric `ρc·πR²L·J`.
- Plus the control-anchor checks for the `C-*` exact cases.

## The learned models, held-out, vs the exact engine

Both are trained offline (`science/train_mill.py`, torch) and reported next to the exact engine. The metrics live in
`data/derived/cc-learned.json` and show on the **Benchmark** page (not the App).

| Model | Task | Baseline | Held-out metric (this build) |
|---|---|---|---|
| `power-surrogate` | 6 features → [power_kw, frac_centrifuging] | the exact analytic engine | **power err 5.2%** (downstream, `eval_mill.mjs`) |
| `scenario-ood` | features → reconstruction (MSE = OOD score) |, (separates in-envelope vs out-of-envelope) | **AUC 0.922** · in-dist p95 anomaly threshold **1.09** |

**Honesty.** The surrogate's power error (5.2%) is measured downstream in `eval_mill.mjs`: the surrogate ONNX is run in
Node via onnxruntime-web over the held-out scenarios and its predicted power is compared to the exact engine's. The
exact analytic engine (Davis / Hogg & Fuerstenau / Morrell / Bond) is **always the authority** and runs live by default;
the surrogate is the measured learned lane (its intended bulk-sweep role is documented but not yet exercised by a
shipped feature), not a fabricated win. The OOD AUC
(0.922) is measured against scenarios pushed outside the SAG / ball / rod training envelope, with the in-distribution
p95 reconstruction error (1.09) as the flag threshold; we say so.
