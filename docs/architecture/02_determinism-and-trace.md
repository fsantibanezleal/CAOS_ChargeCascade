# Determinism + the trace

**A run is a pure function of `(params, seed)`.** The TS mill engine is analytic + deterministic (no global RNG; the
critical speed, the Davis per-shell departure, the regime bands and the power draw are all closed-form; only the
training-data sampler in `science/gen_train.mjs` draws random scenarios, and it does so from a seeded generator). Same
inputs ⇒ byte-identical artifact: the committed `data/derived/case-results.json` **is** the TS engine's real output, and
re-running `python data-pipeline/run.py all` (the numpy/stdlib light lane) reproduces the traces + manifests byte-for-byte
(verified). This is what makes the committed artifact a trustworthy source-of-truth the SPA merely replays
(ADR-0052 / ADR-0054).

**The trace** (`core/trace.py`, schema `chargecascade.trace/v1`) is the compact per-case replay artifact. Per case it
carries the mill descriptor (so the browser can recompute LIVE), the critical speed `Nc` + `φc` + `ω`, the regime band,
the charge geometry (shoulder / toe angles, the fraction of shells centrifuging), the net power + the power-vs-`φc`
curve, the Bond energy cross-check, and the learned-model metrics index (`status: trained | pending-training`). Its
shape is mirrored by `frontend/src/lib/contract.types.ts` (CONTRACT 2) so a drift fails `tsc`. The gate's raw wall-clock
is used for the live/replay decision but **never stored** in the committed manifest (it would dirty git on re-run).
