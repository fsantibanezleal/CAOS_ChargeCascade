# S-CENTRIFUGE, Centrifuging (over-critical)

![S-CENTRIFUGE charge cross-section, computed from the engine](assets/S-CENTRIFUGE.svg)

*The charge cross-section for this case, generated from the same engine the App runs (`data-pipeline/cclab/science/gen_case_svgs.mjs`): the Davis departure fan (clipped inside the shell), the shoulder angle, and the regime + net power.*

**Category:** speed sweep (the regime transition) · **Source of truth:** [`frontend/src/mill/cases.ts`](../../frontend/src/mill/cases.ts) (`S-CENTRIFUGE` = the base `K-BALL` mill at φc 1.02) · **synthetic but physically realistic**

**Operating point:** the base 4.0 × 6.0 m ball mill (J 35 %, 80 mm) at **φc 1.02** (over critical speed).

The cautionary end of the speed sweep. Above the critical speed the centripetal requirement at the top of the shell exceeds gravity, so the **outer layer pins to the wall and rides around with it**, it never departs, never impacts, and **grinding collapses**. The engine reports ≈ 11 % of the shells centrifuging at φc 1.02. The raw Hogg-Fuerstenau torque keeps rising (**≈ 1.62 MW**) because the model is **not tapered** at centrifuging, which is exactly why the Comminution tab greys this region out: the power is drawn but does no useful comminution. Real mills are never run here.

**Validation anchor:** regime = **centrifuging** with `fracCentrifuging > 0` at φc 1.02, the onset the App marks on the regime map and masks on the capacity map.
