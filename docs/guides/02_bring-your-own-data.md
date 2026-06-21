# Guide — bring your own mill operating point

ChargeCascade is a **tool**, not a fixed demo: it evaluates *your* mill, not only the 10 baked cases. There are two
doors — the **live App** (instant, in the browser) and the **pipeline** (a committed, replayable artifact). Both go
through the same physics and the same gate, **CONTRACT 1** (`data-pipeline/cclab/io/contract.py`).

## Door 1 — the live App (no install, no precompute)

In the App's **"Mill (live)"** panel you set the operating point directly with the controls — the **mill type**
(SAG / ball / rod), the **fraction of critical speed** `φc`, the **fill** `J`, the **diameter** `D`, and the **ball
size** `d`. The TypeScript engine (`frontend/src/mill/`) calls `evaluate(op)` on every change and recomputes the
charge motion, the regime, the 3D animation and the power draw, plus the onnxruntime-web surrogate + OOD guard.
The engine accepts your mill, not just the built-in cases — this is the fast path for "what does *my* mill do?".

## Door 2 — the pipeline (a committed, replayable case)

To bake your mill into a replayable artifact (manifest + trace), feed it through the offline pipeline:

1. **Add a row** to `data/examples/mills.csv` (or point the pipeline at your own CSV). The schema is exactly
   CONTRACT 1's `REQUIRED_COLUMNS`:

   ```
   mill_id,mill_type,diameter_m,length_m,fill,phi_c,ball_top_mm,charge_density
   MY-MILL,sag,11.0,5.5,0.30,0.76,140,3.0
   ```

2. **Run the pipeline** — PowerShell `.\scripts\precompute.ps1` / bash `./scripts/precompute.sh` (see
   [guide 01](01_precompute-pipeline.md)). It produces the compact artifact + manifest you can replay in the SPA,
   exactly like the built-in cases.

## What CONTRACT 1 enforces

Every row is **accepted**, **rejected** (with a reason — never silently coerced), or **flagged** (accepted, but the
honesty flag travels into the manifest):

- **Required columns** — any missing/empty column → rejected.
- **Types + ranges** — `diameter_m`, `length_m`, `charge_density` must be `> 0`; `fill ∈ [0, 0.6]`;
  `phi_c ∈ (0, 1.5]`; `ball_top_mm / 1000 < diameter_m` (a ball bigger than the mill → rejected);
  `mill_type ∈ {rod, ball, sag, ag}`. NaN / inf → rejected.
- **Honesty flags** (plausible but worth surfacing): `φc ≥ 1` → *the outer charge centrifuges, no grinding*;
  `φc > 0.85` → *over-speed, the cataract may impact the liner above the toe*; `fill > 45%` → *above the power peak,
  charge crowding*; `fill < 15%` → *low charge, ball-on-liner impacts*; large ball/diameter ratio → *the (D−d)
  critical speed matters*.

If your data legitimately doesn't fit — a new `mill_type`, a wider valid range — **extend CONTRACT 1 and its test
(`tests/test_contract.py`) deliberately**. Never loosen the guards just to push bad data through; the gate is the
honesty boundary, not an obstacle.
