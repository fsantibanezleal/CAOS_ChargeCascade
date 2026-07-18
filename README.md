# ChargeCascade, 3D tumbling-mill charge-motion + power workbench

[![CI](https://img.shields.io/github/actions/workflow/status/fsantibanezleal/CAOS_ChargeCascade/ci.yml?branch=main&label=CI)](https://github.com/fsantibanezleal/CAOS_ChargeCascade/actions)
[![License](https://img.shields.io/github/license/fsantibanezleal/CAOS_ChargeCascade)](LICENSE)
[![Version](https://img.shields.io/github/v/tag/fsantibanezleal/CAOS_ChargeCascade?label=version&sort=semver)](https://github.com/fsantibanezleal/CAOS_ChargeCascade/tags)
[![Live demo](https://img.shields.io/badge/demo-live-2ea44f)](https://chargecascade.fasl-work.com)

**Live: <https://chargecascade.fasl-work.com>**, an interactive workbench for tumbling-mill (SAG / ball / rod)
charge motion and power draw. From geometry, fill, ball size and the fraction of critical speed to the charge
regime, the Davis trajectories and the net power, computed live in the browser, in 3D, bilingual (EN/ES),
light/dark. No application server: static files + client-side compute only.

## What it computes (the exact engine)

A dependency-free TypeScript engine (`frontend/src/mill/`) is the single source of physics truth; the App, the
Experiments table and the offline bake all run the same code:

- **Critical speed** `Nc = 42.3/√(D−d)` [rpm] and the dimensionless regime knob `φc = N/Nc`, derived, not fitted.
- **Davis (1919) charge kinematics**: per-shell departure angle `cos α = φc²·r/R` + the ballistic parabola, over 9
  radial shells → shoulder/toe angles, the cataract fan, the centrifuging fraction (exact onset at φc = 1).
- **Regime classification** in literature φc bands (slumping / cascading / cataracting / centrifuging), with the
  sampled centrifuging fraction as the precise onset detector.
- **Power draw**: Hogg & Fuerstenau (1972) torque-arm net power with a disclosed calibration (`C_ARM = 0.80`, set so
  the reference 4×6 m ball mill draws ~1.3 MW); the J(1−1.065J) fill term peaks near J ≈ 0.47 and P scales as D^2.5.
  A calibrated **Morrell-form** is shown alongside as a consistency companion, it is a rescale of the same torque
  arm, **not** an independent model; Morrell's real (1996) C-model is cited, not implemented (a documented upgrade).
- **Bond (1961) specific energy** (kWh/t), process energy, deliberately kept distinct from charge power; their
  ratio P/W gives the grinding capacity in the Comminution tab.

## The learned lane (real, measured, guarded)

Two genuinely trained models (torch → ONNX) run live in the browser via onnxruntime-web, with committed lineage
(`data/derived/cc-learned.json`):

- a **power surrogate** (MLP 6-64-64-2) trained to reproduce the exact engine; held-out power error **5.2% ± 12.5%**
  on whole-mill held-out configurations, always displayed next to the exact power (What-if tab);
- an **OOD autoencoder** (held-out **AUC 0.922**) that flags operating points outside the training envelope, where
  the surrogate would extrapolate (Anomaly tab).

The exact engine is sub-millisecond and remains the authority everywhere; no shipped feature consumes the surrogate
in bulk yet (its intended mass-sweep role is documented, not shipped).

## Cases + bring your own mill

10 synthetic, physically realistic cases in 4 categories (machine / speed sweep / fill / analytic controls), all
labelled synthetic, baked to committed traces + manifests (`data/derived/`) by the same engine that runs live. The
controls are exact: **C-CRITICAL** (φc = 1 → the centrifuging fraction turns positive and the regime switches;
the published torque model is deliberately not tapered, so draw power stays high, grinding is what collapses) and
**C-EMPTY** (J = 0 → exactly 0 power). A **Custom mill** tab validates any user mill through CONTRACT-1 (the same
gate as the cases, TS mirroring the Python contract) and runs the exact engine on it.

## What this is not (honesty posture)

- The 3D charge is a **kinematic animation** of the Davis equations, not a DEM / N-body solve (a real DEM lane is
  the documented offline upgrade).
- The displayed Morrell-form is a **calibrated rescale** of the Hogg–Fuerstenau torque arm, agreement between the
  two curves is a consistency check by construction, not a two-model validation.
- **No published-mill dataset ships in this build**, no external power cross-check is claimed; the power magnitude
  is calibrated to one industrial reference point (~1.3 MW).
- The surrogate is trained on the app's own analytic engine (labels are analytic truth, not measurements).

## Quickstart

```bash
# frontend (the product): dev server / build / engine tests
cd frontend && npm install
npm run dev          # http://localhost:5173
npm run build        # type-check + production build (artifacts copied by copy-data.mjs)
npm test             # engine / inverse / contract tests, incl. the two analytic controls

# offline lane (bake + contracts; optional for running the app)
./scripts/setup.sh           # or scripts\setup.ps1 , creates .venv-pipeline + .venv (no globals)
./scripts/precompute.sh      # re-bake the 10 cases (or one: ./scripts/precompute.sh K-BALL --seed 7)
.venv-pipeline/bin/python -m pytest    # contracts, manifests, pipeline smoke
./scripts/smoke.sh           # CONTRACT-2 artifact/manifest consistency check
```

The torch → ONNX retrain lane is separate and local-only: see
[docs/guides/01_precompute-pipeline.md](docs/guides/01_precompute-pipeline.md).

## Repo layout

| Path | What |
|---|---|
| `frontend/` | the web app (React + Vite + Three.js); `src/mill/` = the exact engine; `src/pages/` = the six pages |
| `data-pipeline/` | `cclab`: the two data contracts, staged pipeline, lane gate, learned-model training |
| `data/derived/` | committed baked traces, manifests, learned models + lineage |
| `docs/` | the navigable wiki: [architecture](docs/architecture.md) · [frameworks](docs/frameworks.md) · [cases](docs/cases.md) · [guides](docs/guides.md) |
| `tests/` | Python tests (contracts, manifest, pipeline smoke) |
| `app/` | dormant FastAPI lane (activates only on an ADR-0002 trigger; [app/README.md](app/README.md)) |
| `scripts/` | cross-platform setup / precompute / dev / smoke ([scripts/README.md](scripts/README.md)) |

See [STRUCTURE.md](STRUCTURE.md) for the layout in one page and
[docs/README.md](docs/README.md) for the documentation entry point.

## Versioning

`X.XX.XXX` (see [CHANGELOG.md](CHANGELOG.md)); releases are tagged. Licensed under
[MIT](LICENSE).
