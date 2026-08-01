# Framework, the DEM charge-motion lane

Until v0.24 ChargeCascade's 3D charge was **kinematic**: each ball rode the shell to its Davis departure azimuth,
then flew a single-particle parabola. That is the analytic engine animated, not a granular solve, no
particle-particle contact, no friction, no force chains. The DEM lane adds a **real** discrete-element charge
motion, computed offline and replayed in the browser.

## Why DEM must be baked, never run live

DEM (the Discrete Element Method) follows every particle and resolves every contact. The stable timestep is a small
fraction of the contact duration, so timesteps are microsecond-scale: an industrial mill DEM runs at `dt` on the
order of `2e-5 s`, i.e. ~50,000 substeps per simulated second. The definitive cost, from the GPU-DEM literature: a
3D industrial mill with **four million particles** takes **1.16 hours to simulate one second** on a laptop GPU
(Govender, Rajamani, Kok, Wilke, *Minerals Engineering*, 2015). A browser cannot run this. **Real DEM is therefore
precomputed offline and only the resulting per-frame particle positions are shipped and replayed.**

## The engine: milldem (cross-platform, no C++/WSL)

The bake uses **milldem** ([PyPI](https://pypi.org/project/milldem/), `fsantibanezleal/CAOS_MillDEM`, MIT), a
soft-sphere DEM written for exactly this: pure `numpy` core with an optional `numba` JIT, so it installs and runs on
native Windows with **no C++ toolchain and no WSL** (unlike YADE / LIGGGHTS, which need a Unix build). It was built
to unblock this lane.

### The contact model (soft-sphere)

Per contact, along the normal direction with overlap `delta_n` (penetration), normal relative velocity `v_n`,
normal stiffness `k_n` and viscous damping `C_n`:

```
F_n = k_n * delta_n + C_n * v_n
```

The damping is fixed from the target coefficient of restitution `e` by the Tsuji, Tanaka and Ishida (1992) relation

```
beta = -ln(e) / sqrt( ln(e)^2 + pi^2 )
C_n  = 2 * beta * sqrt( k_n * m_eff )
```

with `m_eff` the reduced contact mass. Tangential friction is Coulomb-truncated (`|F_t| <= mu * F_n`), giving the
charge its shear strength (the ability to lift as a body). This is the Cundall and Strack (1979) soft-sphere
formulation, the same family the LAMMPS `gran/hooke` pair style implements. The calibrated values (in the Govender
2015 mill-DEM range) are recorded in `data-pipeline/pipeline/dem/calibration.json`: `e = 0.5`, `mu = 0.25`,
`mu_rolling = 0.05`, `k_t/k_n = 2/7`, with the normal stiffness auto-scaled (density-scaled) for numerical stability.

### The thin-3D slab (why the power is size-consistent)

A single **2D disc slice** cannot get the power right across mill sizes: its charge lift is a size-*independent*
absolute height, so the centre-of-mass torque arm as a fraction of the radius `R` shrinks as the mill grows, and the
DEM/Hogg-Fuerstenau power ratio falls with size. milldem resolves this with a **thin-3D slab**: a slab of the mill
of axial thickness `w = 4 x ball diameter` with **periodic axial boundaries**, so the 3D packing and the axial force
chains that actually carry the lift are resolved. With the slab, the net power (van Nierop 2001 torque route,
`P = 2*pi*T*N`, scaled by `length / w`) is **validated against the classical Hogg-Fuerstenau model within
~10-20% and size-consistently** (ratios 1.11 at 3 m, 1.01 at 5 m; milldem `docs/VALIDATION.md`,
`tests/test_power3d.py`). No fitted constant.

### Axial tiling of the slab

The full-length mill charge is statistically identical in every axial slab of thickness `w`, which is exactly what
the periodic boundary asserts. The render therefore **tiles the baked slab `tiles = round(L / w)` times along the
axis** to fill the mill length, each tile shown at a different time-phase. Because the motion is statistically
stationary, showing different tiles at different points of the same cycle is physically valid and removes the visual
lockstep a set of identical copies would show. The bake stores only the slab (a few thousand particles); the tiling
happens client-side, keeping each artifact ~1-3 MB.

## The baked artifact: `chargecascade.demframes/v1`

A self-describing little-endian binary, one file per case (`data/dem/<case>.demframes.bin`):

```
[4]  magic 'CDM1'
[4]  uint32 headerLen
[headerLen] UTF-8 JSON header { schema, caseId, N, F, fps, aabb{min,max}, quant:16,
             tiles, slabThicknessM, lengthM, radiusM, ballDiameterM, dt_sim, revsCovered, ... }
[N]  uint8  sizeClass          (static size class 0..3)
[F*N*3] uint16 body            (positions quantized to the AABB: x,y in [-R,R], z in [0,w))
```

Position-only: per-particle speed for the colour (relative impact kinetic energy) is derived client-side from the
frame-to-frame delta, no velocity channel baked. 16-bit quantization over a ~10 m mill gives ~0.15 mm resolution,
far finer than a ball radius. Two sidecars accompany each case: `<case>.power.json` (net DEM power, the CoM torque
arm, the power time series, an impact-KE histogram) and `<case>.outline.json` (the time-averaged `(r, theta)`
occupancy grid and the DEM toe/shoulder angles, for the 2D charge-shape overlay). The coarse `(phiC, J)` DEM power
grid (`power-grid.json`) feeds the power-field heatmap.

## Rendering (three.js InstancedMesh)

`InstancedMesh(geometry, material, count)` draws `count` copies in one draw call. The DEM mode reuses the App's
existing InstancedMesh primitive; it swaps the per-frame source from the live Davis kinematics to a decoded baked
frame, raises `N` into the `10^4-3x10^4` tiled tier, drops the geometry to `IcosahedronGeometry(1, 0)` (detail 0,
20 triangles) at that count, and colours by frame-to-frame speed. Scrubbable (frame slider), pausable, default
paused on a hidden tab (ADR-0059). The Davis kinematic view stays available as the live analytic-reference toggle.

## Validation (Unit 6 acceptance)

`data-pipeline/pipeline/dem/validate.py`, per baked case: the DEM net power lands within a band of the analytic
Hogg-Fuerstenau power (same charge mass; `C-EMPTY` must be ~0); the charge holds a lifted body (shoulder above toe);
the decoded particles stay inside the shell and the charge is not fluidized (bounded frame-to-frame speed). The
bake runs at an accelerated timestep (`~28` substeps per contact vs milldem's conservative `~50`), halving the step
count; the no-fluidization gate catches any instability that would introduce. `validation.json` records the
pass/fail per case.

## What is real, what is transferred (honesty)

- The **charge motion, shape, regime and net power** are real milldem DEM, computed from first-principles contact
  forces, not the analytic engine.
- The DEM **absolute power** is validated within ~10-20% of Hogg-Fuerstenau, size-consistently; it is not tuned to
  match a target.
- In the **power-field heatmap**, the DEM layer's *shape* over `(phiC, J)` is the baked DEM; its absolute level for
  a mill other than the reference is *transferred* by the analytic HF ratio (labelled as such). HF and the C-model
  are computed live and exact.
- The analytic Morrell / Hogg-Fuerstenau / Bond engine remains the displayed authority for the live what-if.

## Reproduce

```
python -m pip install -r data-pipeline/requirements-dem.txt   # milldem[jit] + numpy, into .venv-precompute
python -m pipeline.dem                                           # bake all cases + the (phiC, J) grid, then validate
python -m pipeline.dem --validate                                # re-check existing bakes
```

## Sources

- Cundall, P.A.; Strack, O.D.L. (1979). *A discrete numerical model for granular assemblies.* Geotechnique 29(1).
- Tsuji, Y.; Tanaka, T.; Ishida, T. (1992). *Lagrangian numerical simulation of plug flow of cohesionless particles
  in a horizontal pipe.* Powder Technology 71(3). (damping-from-restitution)
- Govender, N.; Rajamani, R.K.; Kok, S.; Wilke, D.N. (2015). *Discrete element simulation of mill charge in 3D using
  the BLAZE-DEM GPU framework.* Minerals Engineering. (offline cost; linear-spring + restitution damping)
- van Nierop, M.A.; Glover, G.; Hinde, A.L.; Moys, M.H. (2001). *A discrete element method investigation of the
  charge motion and power draw of an experimental two-dimensional mill.* Int. J. Mineral Processing 61. (torque power)
- Cleary, P.W. (2001). *Charge behaviour and power consumption in ball mills.* Int. J. Mineral Processing 63(2).
- milldem, `docs/VALIDATION.md` and `tests/test_power3d.py` (the size-consistency validation of the thin-3D slab).
