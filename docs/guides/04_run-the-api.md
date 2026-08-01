# Guide, run the API (only if the dormant `app/` is activated)

ChargeCascade ships as a **static deploy**. The live lane is the **browser**, the TypeScript mill engine
(`frontend/src/mill/`) recomputing on every control, plus the power surrogate + OOD autoencoder via
**onnxruntime-web**. There is **no server** by default, and there does not need to be one: the physics is
sub-millisecond client-side and the artifacts are committed.

The `app/` FastAPI scaffold and `data-pipeline/pipeline/live.py` are therefore **DORMANT**:

- `pipeline/live.py` is an intentional no-op that documents the absence of a Python live lane (no in-browser Python
  runtime). The mill physics live entirely in TypeScript.
- `app/` (`main.py`, `routers/`, `services/`, `models/`) and `requirements-api.txt` are an unactivated scaffold , 
  the commented placeholder requirements file makes that explicit.

## When to activate it

Activate the API **only** on an ADR-0002-style trigger, a compute that genuinely **cannot** run client-side, e.g.:

- a too-heavy offline solve a user wants on demand (a real DEM charge-motion run, a large operating-envelope sweep)
  that you don't want to ship as a static artifact, or
- auth-gated / private mill data that must not live in the browser bundle, or
- a paid heavy-compute endpoint.

Until one of those is real, **do not** stand up a server, it adds a deploy surface with no payoff.

## How to activate (when the trigger fires)

1. **Pin** the deps in `requirements-api.txt` (uncomment + fill versions you actually install: `fastapi`,
   `uvicorn[standard]`, …) and install them into `.venv`.
2. **Run** it:

   PowerShell: `.venv\Scripts\python.exe -m uvicorn app.main:app --reload`
   bash: `.venv/bin/python -m uvicorn app.main:app --reload`

3. **Keep the contract discipline.** The API serves the **same** committed `data/derived` artifacts read-only, a
   thin layer over `data/`, never a re-implementation of the mill engine. The engine of record stays the TypeScript
   `frontend/src/mill/` (and its `tsx` bake); the API serves what the pipeline baked, exactly like the static deploy.
