# ChargeCascade, documentation

The navigable wiki for ChargeCascade: an interactive **3D tumbling-mill (SAG / ball / rod) charge-motion + power
workbench**, critical speed, the Davis (1919) per-shell departure that lifts the charge into the cataract fan, the
cascading → cataracting → centrifuging transition, and Hogg & Fuerstenau (1972) / Morrell (1996) power draw, with the
whole engine running live in the browser. Instantiated on the CAOS product-repo archetype (ADR-0057).

- **[Architecture](architecture.md)**, the archetype, the lanes, the gate, the two data contracts, determinism, deploy.
- **[Frameworks](frameworks.md)**, the mill physics, the three.js viz stack, the learned models (torch → ONNX).
- **[Cases](cases.md)**, the 10 cases by category + their validation anchors.
- **[Guides](guides.md)**, instantiate, run the precompute/retrain lane, bring your own mill.

## One-paragraph orientation

The physics engine is the **TypeScript code** in [`frontend/src/mill/`](../frontend/src/mill/): the critical speed
`Nc = 42.3/√(D−d)`, the Davis single-particle departure (a charge element on a radial shell departs where
`cos α = φc²·(r/R)` then flies a parabola to the toe, the outer shells thrown highest, the cataract fan), the
slumping → cascading → cataracting → centrifuging regime bands, and Hogg & Fuerstenau net power as the torque-arm of
the charge centre of mass (with Morrell's C-model form and the Bond energy cross-check). It runs *live in the browser*
(the App recomputes charge motion + regime + power as you drag diameter / length / fill / speed / ball size) **and** in
the offline Node bake via `tsx` (no Python re-port). The Python package [`cclab`](../data-pipeline/cclab/) is the two
data contracts + the staged pipeline + the lane gate; its default lane is numpy-light, and a `--retrain` lane re-bakes
the cases and trains the **power surrogate** + the **scenario OOD-AE** (torch → ONNX). The `.onnx` run live via
onnxruntime-web.

## Honesty + data policy

- Numbers come from the calibrated engine / committed artifacts, never from a claim. The operating points are
  **synthetic-but-realistic** and clearly labelled; the power *magnitude* is calibrated to real industrial values
  (`C_ARM = 0.80` set so the reference 4.0 × 6.0 m ball mill draws ~1.3 MW), and the `C-*` cases are exact analytic
  controls.
- The 3D charge has two views: a **real DEM solve** baked offline with milldem (the thin-3D slab; collisions,
  friction, force chains; net power validated within ~10-20% of Hogg-Fuerstenau, size-consistent) and the **live
  Davis kinematic** view. DEM cannot run in the browser, so its per-frame positions are baked and replayed
  (see `frameworks/04_dem-lane.md`).
- Public derived artifacts are committed (`data/derived/`); raw/private sources stay out of git (`data/raw/`, the
  `public/` overlay). The two data contracts ([architecture/08_data-contracts.md](architecture/08_data-contracts.md))
  govern the mill-operating-point → pipeline and pipeline → web seams.
