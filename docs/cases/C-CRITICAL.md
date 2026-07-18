# C-CRITICAL, Critical-speed limit (φc = 1)

![C-CRITICAL charge cross-section, computed from the engine](assets/C-CRITICAL.svg)

*The charge cross-section for this case, generated from the same engine the App runs (`data-pipeline/cclab/science/gen_case_svgs.mjs`): the Davis departure fan (clipped inside the shell), the shoulder angle, and the regime + net power.*

**Category:** control (analytic anchor) · **Source of truth:** [`frontend/src/mill/cases.ts`](../../frontend/src/mill/cases.ts) (`C-CRITICAL` = the base `K-BALL` mill at φc 1.0) · **analytic control** (exact-answer oracle)

**Operating point:** the base 4.0 × 6.0 m ball mill (J 35 %, 80 mm) at **φc = 1.0** exactly.

A control case whose answer is **computable by hand**, so any regression in the engine is caught immediately. At exactly the critical speed, the centripetal requirement at the very top of the shell equals gravity (`ω² R = g`), so the outermost layer is **on the verge of centrifuging**: `cos α = 1` at the top → the departure angle collapses and `fracCentrifuging` becomes positive. This is the precise boundary the regime classifier must place at φc = 1 (not 0.99, not 1.01).

**Validation anchor:** the analytic centrifuging **onset**, `fracCentrifuging > 0` at φc = 1.0, matching `Nc = 42.3/√(D − d)` by construction. A control, not an operating recommendation.
