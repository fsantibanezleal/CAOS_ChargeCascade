# Frameworks

The research-chosen methods + libraries ChargeCascade actually uses (each one is used by the code, not aspirational).

- [01 — the analytic mill engine](frameworks/01_mill-physics.md) — the critical-speed scaling, the Davis
  single-particle charge motion, the motion regimes, and the Hogg-Fuerstenau / Morrell-form / Bond power models.
- [02 — the visualisation stack](frameworks/02_viz.md) — the 3D tumbling mill (three.js), the power-vs-φc chart
  (uPlot), the trajectory + regime cross-sections (canvas 2D), the KaTeX equations and the shared
  `@fasl-work/caos-app-shell` (+ the ⓘ Architecture modal).
- [03 — the learned models](frameworks/03_torch-onnx.md) — the power surrogate + the scenario OOD-AE,
  torch → ONNX → onnxruntime-web.
