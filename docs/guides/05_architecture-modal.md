# 05 · The in-app Architecture / "How it works" modal (ADR-0058)

Every CAOS/Faena web app **must** ship an in-app **Architecture / "How it works"** modal, opened by an
always-visible **ⓘ button in the header**. It is the fast visual proof the app is a *real, complete system*, not a
demo. The chrome (button + modal) comes from the shared shell; ChargeCascade supplies only its diagrams + copy.

Binding decision: [`conventions/architecture/0-archetype/ADR-0058-in-app-architecture-modal.md`](../../../conventions/architecture/0-archetype/ADR-0058-in-app-architecture-modal.md)
(in CAOS_MANAGE). This is the retrofit standard for every CAOS web app.

## What ChargeCascade inherits from the archetype

- **Chrome**, `@fasl-work/caos-app-shell` (pinned `^0.1.2` in `frontend/package.json`) exposes the ⓘ button + the
  `ArchitectureModal`. The shell config gained an `architecture` field; present ⇒ the button appears.
- **Five themed SVGs** in [`frontend/public/svg/tech/`](../../frontend/public/svg/tech/):
  `01-the-app.svg`, `02-lanes.svg`, `03-web-flow.svg`, `04-the-science.svg`, `05-data-contracts.svg`. Every colour is
  a shell CSS-variable token (`--color-surface`, `--color-border`, `--color-accent`, `--color-fg`, `--color-good`,
  `--color-warn`, …) so each diagram repaints with the active light/dark theme.

## How it's wired in ChargeCascade

The config lives in [`frontend/src/architecture.ts`](../../frontend/src/architecture.ts) (`ArchitectureConfig`,
imported from `@fasl-work/caos-app-shell`) and is passed to the shell:

```ts
import { architecture } from './architecture';

// the shell config, with architecture present → the ⓘ button turns on
<AppShell config={{ ...config, architecture }}>
```

Each tab pairs one SVG from `frontend/public/svg/tech/` with a **bilingual ES/EN** body (`body_en` / `body_es`).

## The five tabs (specialised for ChargeCascade)

| id | tab | SVG | what it shows |
|----|-----|-----|----------------|
| `app` | The app / La app | `01-the-app.svg` | the domain: set D / fill / ball / φc on a SAG·ball·rod mill and watch cascading → cataracting → centrifuging in 3D with live power. The mill engine (`frontend/src/mill/`) recomputes on every control. The 3D charge has two views: **real DEM baked with milldem** (the thin-3D slab, replayed per-frame) and the **live Davis kinematic** view. `C-CRITICAL` (φc = 1) and `C-EMPTY` (J = 0) are exact analytic controls. |
| `lanes` | Lanes, web / offline / compute | `02-lanes.svg` | **web** = the TS engine + Three.js 3D + onnxruntime-web (no server); **offline/compute** = the Python pipeline bakes the cases via `tsx` and `--retrain` (torch) trains the two models → ONNX; **replay** = the committed `data/derived` artifacts overlaid into the SPA, with the typed `contract.types.ts` mirror failing the build on drift. |
| `web-flow` | Web-app flow / Flujo de la web | `03-web-flow.svg` | the App recomputes live: the case selector or your own mill + the D / fill / ball / φc / mill-type controls feed the TS engine + the onnxruntime-web models, which feed the workbench (3D mill, trajectory diagram, regime map, power curve, charge cross-section, What-if). |
| `science` | The science / La ciencia | `04-the-science.svg` | the real algorithm + equations: critical speed `42.3/√(D−d)`, the Davis single-particle departure + parabolic cataract trajectories, and the Hogg-Fuerstenau / Morrell power. |
| `design` | Data contracts / Contratos de datos | `05-data-contracts.svg` | the two contracts (CONTRACT 1 ingestion `io/contract.py`; CONTRACT 2 artifact manifest/trace) + the lane gate + the 10 cases-by-category. |

`app` and `science` are the **product-specific** tabs (ChargeCascade's domain + its real algorithm); `lanes`,
`web-flow`, `design` are archetype-generic and reused as-is.

## Verify before deploy

The screenshot-verify step (mandatory before any deploy) **must open the modal and confirm every tab renders its
diagram (themed, no broken SVG) + its text with no error**, in both light and dark. A product is **not "done"**
without the ⓘ Architecture modal at full depth, it is a NON-NEGOTIABLE row in the product-quality bar.
