# C-EMPTY, Empty mill (J = 0)

![C-EMPTY charge cross-section, computed from the engine](assets/C-EMPTY.svg)

*The charge cross-section for this case, generated from the same engine the App runs (`data-pipeline/pipeline/science/gen_case_svgs.mjs`): the Davis departure fan (clipped inside the shell), the shoulder angle, and the regime + net power.*

**Category:** control (analytic anchor) · **Source of truth:** [`frontend/src/mill/cases.ts`](../../frontend/src/mill/cases.ts) (`C-EMPTY` = the base `K-BALL` mill at J 0) · **analytic control** (exact-answer oracle)

**Operating point:** the base 4.0 × 6.0 m ball mill (φc 0.75, 80 mm) at **J = 0** (no charge).

The **zero-power oracle**. With no charge there is no mass to lift, so the charge power must be **exactly 0 kW**, the Hogg-Fuerstenau model carries a `J` factor (`chargeMassT ∝ J`, and the torque ∝ charge mass), so `P = 0` at `J = 0` by construction. It is the cheapest, sharpest regression guard in the suite: if the engine ever returns non-zero power for an empty mill, a term has been mis-wired. (A real mill still draws no-load / friction power, which this model deliberately excludes, it computes the **charge** power only, stated in the physics docs.)

**Validation anchor:** Hogg-Fuerstenau charge power **= 0 kW** when J = 0 (and the mill-empty branch short-circuits to 0). A control, not an operating point.
