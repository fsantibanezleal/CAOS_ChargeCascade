# Cases + categories

Each case (`frontend/src/mill/cases.ts`, the SOURCE OF TRUTH; mirrored by `data-pipeline/cclab/cases/mill_cases.py`
and baked to `data/derived/case-results.json` by `science/bake_cases.mjs` running the SAME engine) declares a
**CATEGORY**, an **operating point** (D × L, J, φc, top-ball), an **expected band** (what a domain reader should see),
a **validation anchor** (a property the result MUST satisfy), and a **synthetic | analytic-control** flag. The
**App shows ONE selected case**; **Experiments/Benchmark show cross-case summaries by category** (never mixed into the
App).

All operating points are **synthetic but physically realistic** (typical SAG / ball / rod geometries and speeds,
clearly labelled). The `C-*` cases are **exact analytic controls** — their answer is computable by hand, so any
regression in the engine is caught immediately.

## The four categories

| category | axis it varies | cases |
|---|---|---|
| **mill type (the machine)** | the machine geometry / media | `K-BALL`, `K-SAG`, `K-ROD` |
| **speed sweep (the regime transition)** | φc on the SAME base ball mill | `S-CASCADE`, `S-CATARACT`, `S-CENTRIFUGE` |
| **fill / charge regime** | J on the base ball mill | `D-LOWFILL`, `D-HIGHFILL` |
| **control (analytic anchor)** | exact-answer oracles | `C-CRITICAL`, `C-EMPTY` |

`S-CASCADE / S-CATARACT / S-CENTRIFUGE` are the **same** 4.0 × 6.0 m ball mill at three speeds — the regime
transition the App is built to show.

## The 10-case matrix

| id | category | op (D×L, J, φc, top ball, type) | regime | net power | note / validation anchor |
|---|---|---|---|---|---|
| `K-BALL` | mill type | 4.0×6.0 m, J 35 %, φc 0.75, 80 mm, ball | cataracting | **1.19 MW** | the reference ball mill (C_ARM calibrated → ~1.3 MW); Nc = 42.3/√(D−d); power in the Hogg-Fuerstenau band |
| `K-SAG` | mill type | 10.0×5.0 m, J 28 %, φc 0.78, 125 mm, sag | cataracting | **6.11 MW** | large-D "pancake"; draws the most power (P ∝ D^2.5); SAGMILLING / Doll ballpark |
| `K-ROD` | mill type | 3.5×5.5 m, J 38 %, φc 0.65, 90 mm, rod | cataracting / cascading edge | **738 kW** | long mill (L > D), run slow so the rods don't tangle / break |
| `S-CASCADE` | speed sweep | base ball at φc 0.55 | cascading | **872 kW** | the charge rolls down the free surface — abrasion; fracCentrifuging = 0 |
| `S-CATARACT` | speed sweep | base ball at φc 0.78 | cataracting | **1.24 MW** | parabolic arcs impacting the toe — the sweet spot; power near its peak |
| `S-CENTRIFUGE` | speed sweep | base ball at φc 1.02 | centrifuging (11 %) | **1.62 MW** | the outer charge pins to the shell; grinding collapses; fracCentrifuging > 0 |
| `D-LOWFILL` | fill / charge | base ball at J 20 % | cataracting | below the peak | lightly charged; below the J ≈ 0.47 power max; ball-on-liner flag possible |
| `D-HIGHFILL` | fill / charge | base ball at J 42 % | cataracting | near the peak | heavily charged; near the maximum of J·(1 − 1.065J) |
| `C-CRITICAL` | control | base ball at φc 1.0 | centrifuging onset | exact control | the analytic centrifuging onset — cos α = 1 at the top → fracCentrifuging > 0 at φc = 1 |
| `C-EMPTY` | control | base ball at J 0 | — | **0 kW** | the zero-power oracle — no charge → no charge power (Hogg-Fuerstenau P = 0 at J = 0) |

The mill-type cases vary the machine (ball / SAG / rod); the speed-sweep cases vary φc on one mill (the regime
transition); the fill cases bracket the power peak; the controls are the exactness anchors (their answer is computable
by hand, so any regression in the engine is caught immediately). The exact baked numbers are in
`data/derived/case-results.json`.

## Per-case pages

Each case has a deep page (operating point · expected regime + physical intuition · validation anchor · real/synthetic flag):

- **mill type:** [K-BALL](K-BALL.md) · [K-SAG](K-SAG.md) · [K-ROD](K-ROD.md)
- **speed sweep:** [S-CASCADE](S-CASCADE.md) · [S-CATARACT](S-CATARACT.md) · [S-CENTRIFUGE](S-CENTRIFUGE.md)
- **fill / charge:** [D-LOWFILL](D-LOWFILL.md) · [D-HIGHFILL](D-HIGHFILL.md)
- **control:** [C-CRITICAL](C-CRITICAL.md) · [C-EMPTY](C-EMPTY.md)
