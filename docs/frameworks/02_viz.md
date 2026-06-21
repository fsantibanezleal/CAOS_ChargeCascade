# Framework — the visualisation stack

ChargeCascade uses one renderer per data type (per the CAOS interactive-visualisation rubric), all interactive,
value-reading and theme-aware. Every panel **reacts to the live engine** — the D / L / J / φc / ball-size sliders and
the case selector re-run `evaluate(op)` and every viz redraws.

| Renderer | Where | What it draws |
|---|---|---|
| **three.js** `^0.171.0` (`viz/Mill3D.tsx`) | the App's 3D tab | the rotating mill group — a `CylinderGeometry` shell + lifter bars + an N ≈ 1100 `BufferGeometry` charge-particle cloud (viridis colormap by radius). Each particle **rides the shell** to its Davis departure azimuth (cos α = ω²r/g per radial shell), then **flies the cataract parabola** and lands at the toe; centrifuging shells (cos α ≥ 1) stay pinned. `WebGLRenderer` + `OrbitControls`, proper `dispose()` on unmount. A KINEMATIC animation of the analytic engine (the ChancaDEM Chamber3D pattern) — a banner says so, it is **not** a DEM solve. |
| **uPlot** `^1.6.32` (`viz/PowerChart.tsx`) | the power tab | net power vs φc — the Hogg-Fuerstenau curve + the dashed Morrell-form curve, the centrifuging band (φc ≥ 1) shaded, and the **operating-φc line** drawn via a `hooks.draw` callback; wheel / drag zoom + crosshair reads kW on hover. The dramatic peak-then-roll-off picture. |
| **canvas 2D** (`viz/TrajectoryDiagram.tsx`) | the trajectory tab | the mill cross-section — the per-shell departure points, the cataract parabolas, and the shoulder, drawn from the same `MillResult.shells`. |
| **canvas 2D** (`viz/RegimeMap.tsx`) | the regime tab | the φc × J banded map (slumping / cascading / cataracting / centrifuging) with the **operating marker** at the current (φc, J). |
| **KaTeX** `^0.16.47` | the Methodology page | the equations — critical speed, the Davis departure + parabola, the regime bands, the power torque-arm — rendered via the shell's `Equation` / `InlineMath`. |
| **`@fasl-work/caos-app-shell`** `^0.1.2` | the whole app | the shared header / nav / theme / i18n chrome + the doc-kit (`Tabs`, `Callout`, `Cite`, `Equation`, `InlineMath`, `ReferenceList`, `AppShell`) + the ⓘ **Architecture modal** (ADR-0058). This is what makes every Faena app a visual sibling. |

Supporting libs: **lucide-react** `^0.460.0` (icons) and **react-router-dom** `^6.30.4` (the 6 routes
App / Introduction / Methodology / Implementation / Experiments / Benchmark).

The uPlot host (`viz/UPlotChart.tsx`) is a thin wrapper: it builds the chart, observes resize, and destroys on
unmount; `themeColors()` reads the live CSS theme tokens (`--color-fg`, `--color-accent`, …) so the chart axes and
series follow light / dark with the rest of the chrome. Every viz gives a **value readout** (hover reads kW; the 3D
shows the live regime / Nc / power; the maps show the operating point) and reacts to the controls — the rubric
requirement. Aggregate / cross-case views (power-vs-φc across cases, surrogate-vs-exact) live in **Experiments /
Benchmark**, never in the App.
