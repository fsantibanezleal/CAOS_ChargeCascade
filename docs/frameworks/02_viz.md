# Framework, the visualisation stack

ChargeCascade uses one renderer per data type (per the CAOS interactive-visualisation rubric), all interactive,
value-reading and theme-aware. Every panel **reacts to the live engine**, the D / L / J / φc / ball-size sliders and
the case selector re-run `evaluate(op)` and every viz redraws.

| Renderer | Where | What it draws |
|---|---|---|
| **three.js** `^0.171.0` (`viz/Mill3D.tsx`) | the App's 3D tab | the rotating mill group + an `InstancedMesh` charge, in two toggled modes. **DEM**: real baked milldem frames (thin-3D slab, tiled along the axis), `10^4-3x10^4` particles coloured by frame-to-frame speed, scrubbable + pausable (`lib/demframes.ts` decoder; see `04_dem-lane.md`). **Davis**: the live kinematic view, each particle rides the shell to its departure azimuth (cos α = ω²r/g) then flies the cataract parabola, reacting to every slider, **not** a DEM solve (a banner says so). `WebGLRenderer` + `OrbitControls`, proper `dispose()` on unmount. |
| **canvas 2D** (`viz/ChargeShapeOverlay.tsx`) | the App's charge-shape tab | the mill cross-section with the **DEM-measured** time-averaged occupancy (viridis density in the `(r, θ)` plane, from the baked `outline.json`) and the analytic toe/shoulder angles marked, so the picture and the power number share one source. Hover reads `r/R · θ · occupancy`. |
| **canvas 2D** (`viz/PowerFieldHeatmap.tsx`) | the App's power-field tab | net power over the `φc × J` plane (viridis intensity), with toggles DEM / Hogg-Fuerstenau / C-model / `|DEM − HF|` spread, the power-peak ridge, the centrifuging contour `r*/R = 1`, the operating-point marker, a crosshair kW readout, and **click-to-load** `(φc, J)` into the engine. DEM from the baked `power-grid.json` (interpolated, HF-ratio scaled); HF + C-model live (`lib/powerField.ts`). Rubric Tier-B. |
| **uPlot** `^1.6.32` (`viz/PowerChart.tsx`, `viz/BondCurve.tsx`) | the power + comminution tabs | net power vs φc, the Hogg-Fuerstenau curve + the dashed Morrell-form curve, the centrifuging band (φc ≥ 1) shaded, and the **operating-φc line** drawn via a `hooks.draw` callback; wheel / drag zoom + crosshair reads kW on hover. The dramatic peak-then-roll-off picture. |
| **canvas 2D** (`viz/TrajectoryDiagram.tsx`) | the trajectory tab | the mill cross-section, the per-shell departure points, the cataract parabolas, and the shoulder, drawn from the same `MillResult.shells`. |
| **canvas 2D** (`viz/RegimeMap.tsx`) | the regime tab | the φc × J banded map (slumping / cascading / cataracting / centrifuging) with the **operating marker** at the current (φc, J). |
| **KaTeX** `^0.16.47` | the Methodology page | the equations, critical speed, the Davis departure + parabola, the regime bands, the power torque-arm, rendered via the shell's `Equation` / `InlineMath`. |
| **`@fasl-work/caos-app-shell`** `^0.3.0` | the whole app | the shared header / nav / theme / i18n chrome + the doc-kit (`Tabs`, `Callout`, `Cite`, `Equation`, `InlineMath`, `Refs`, `AppShell`) + the ⓘ **Architecture modal** (ADR-0058). This is what makes every Faena app a visual sibling. |

Supporting libs: **lucide-react** `^0.460.0` (icons) and **react-router-dom** `^6.30.4` (the 6 routes
App / Introduction / Methodology / Implementation / Experiments / Benchmark).

The uPlot host (`viz/UPlotChart.tsx`) is a thin wrapper: it builds the chart, observes resize, and destroys on
unmount; `themeColors()` reads the live CSS theme tokens (`--color-fg`, `--color-accent`, …) so the chart axes and
series follow light / dark with the rest of the chrome. Every viz gives a **value readout** (hover reads kW; the 3D
shows the live regime / Nc / power; the maps show the operating point) and reacts to the controls, the rubric
requirement. Aggregate / cross-case views (power-vs-φc across cases, surrogate-vs-exact) live in **Experiments /
Benchmark**, never in the App.
