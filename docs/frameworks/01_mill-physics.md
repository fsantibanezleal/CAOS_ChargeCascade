# Framework, the analytic mill engine

The science. ChargeCascade implements the published tumbling-mill charge-motion and power equations exactly
([`frontend/src/mill/`](../../frontend/src/mill/)). It is dependency-free TypeScript: it runs live in the browser on
every control change, AND runs in the Node bake (via `tsx`) to label the surrogate's training set, the SAME code is
the App's physics truth and the offline ground truth (the ChancaDEM `engine.ts` pattern). `evaluate(op)` →
`MillResult` is sub-millisecond, no Pyodide, no backend.

> This is an **analytic engine** (closed-form published equations), **not a DEM / N-body solver**. A real
> DEM / PEPT charge trace is the documented offline upgrade, the engine's interface is the contract that upgrade
> would satisfy.

## 1. Critical speed, the master scaling (`criticalspeed.ts`)

Centrifuging of the outer layer (the media pinned to the shell at the top) begins when the centripetal requirement at
the top equals gravity: `m·ω²R = m·g`. In rpm, with the finite-media correction (the ball **centre** rides at radius
`(D−d)/2`):

- **Nc = 42.305 / √(D − d)** [rpm], D and d in metres

The constant **42.3 = (60/2π)·√(2g)** is **derived** (from g = 9.81 m/s²), not fitted. The headline slider is the
**fraction of critical speed** `φc = N/Nc`; real mills run φc ≈ 0.65–0.82. From φc and Nc the engine carries
`N = φc·Nc` [rpm] and `ω = 2π·N/60` [rad/s] forward.

## 2. Davis single-particle charge motion (`charge.ts`)

A charge element on a radial shell at radius `r` is carried up by the rotating shell until the **departure angle** `α`,
where the radial component of gravity can no longer supply the centripetal force ([Davis 1919](#refs); Rose &
Sullivan 1957):

- **cos α = ω²r / g = φc²·(r/R)**  (per shell)

It then free-flights a **parabola** to the toe:

- y = x·tan α − g·x² / (2·v²·cos²α),  with launch speed `v = ω·r` tangent to the circle

Outer shells (large `r`) depart near the top (small α) and are thrown highest, the cataract fan; inner shells depart
later. An element with `ω²r/g ≥ 1` never departs → it **centrifuges**. `fracCentrifuging` = the fraction of sampled
shells (9 radial layers from ~0.5R to the outer reachable radius `R − d/2`) with cos α ≥ 1; the outer-shell α is the
**shoulder**, and the descending-side landing of the outer parabola is the **toe**. Sampling these shells over a
revolution gives the particle cloud the 3D viz animates.

## 3. Motion regimes (`regime.ts`)

The regime the user watches transition, as approximate labelled φc bands (they also depend on J, liner lift, friction;
verified qualitative ranges from Wills & Finch 2016; Napier-Munn et al. 1996):

| regime | band | what happens |
|---|---|---|
| slumping / surging | φc < 0.4 | the charge slips and slumps as a mass |
| cascading | 0.4 – 0.65 | the charge rolls / tumbles down the free surface, **abrasion** grinding |
| cataracting | 0.65 – 0.9 | outer media projected in parabolic arcs, impacting the toe, **impact** breakage |
| centrifuging | ≥ 0.9 (full at φc ≥ 1) | the outer layers pin to the shell; breakage collapses |

`CASCADE_CATARACT_PHIC = 0.65` is the band edge the App marks. The `% centrifuging` gauge (`fracCentrifuging`) gives
the onset precisely, independent of the band labels.

## 4. Power draw (`power.ts`)

**Hogg & Fuerstenau (1972)**, the net power is the torque to hold the charge centre of mass offset from the mill
axis, with the charge rotating rigidly at ω (transparent torque-arm physics):

- **P_net = ω·M·g·arm**  [W → kW]
- M = ρc·(πR²L·J)·1000  [kg] , the charge mass (ρc the in-mill bulk density [t/m³])
- arm = **C_ARM·R·sin α·(1 − 1.065·J)** , the CoM horizontal offset

The `J·(1 − 1.065J)` shape peaks the power near **J ≈ 0.47** (the classic "power peaks at ~45–50 % fill").
`C_ARM = 0.80` is **CALIBRATED** so the reference 4.0 × 6.0 m ball mill draws ~1.3 MW (industrial ball-mill power) , 
labelled as a calibration, the same honesty posture as ChancaDEM's qualitatively-calibrated chamber. Substituting the
scalings (torque ∝ ρc·D³·L·J·g, ω ∝ φc/√D) gives the first-principles result **P ∝ D^2.5** (so the 10 m SAG draws the
most power), and every slider visibly moves a term.

**Morrell (1996) C-model**, shown as a calibrated FORM: the same torque-arm driven by a charge-shape effective lift
angle derived from the shoulder + toe geometry (bounded to a physical 25–45°), sitting just above Hogg-Fuerstenau on
typical mills. The published C-model agrees with measured gross power to ±9.8 % on 82 industrial datasets.

**Bond (1961)**, `W = 10·Wi·(1/√P80 − 1/√F80)` [kWh/t] is the process-**ENERGY** law (the grinding duty), NOT the
charge mechanical power. It carries no φc or J, so it does **not** animate the sliders; it is shown only as a
cross-check (and an implied power `W·tph`).

## 5. `evaluate(op)`, the single source of truth (`engine.ts`)

One `Operating` point → one `MillResult`: Nc, N, ω, the per-shell departures + cataract trajectories, the shoulder/toe
angles, the regime, `fracCentrifuging`, the Hogg-Fuerstenau and Morrell-form power, the Bond duty, the charge mass, the
power-vs-φc curve, and the operating flags (over-speed, ball-on-liner, large d/D). The App reads it live; the offline
sweep (`gen_train.mjs`) labels the surrogate on it. No external dependency.

<a id="refs"></a>
**References:** Davis 1919 · Rose & Sullivan 1957 · Hogg & Fuerstenau 1972 · Morrell 1996 · Bond 1961 ·
Napier-Munn et al. 1996 (Mineral Comminution Circuits) · Wills & Finch 2016. Full list in the in-app Methodology page.
