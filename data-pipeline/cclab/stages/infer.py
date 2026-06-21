"""Stage 4 - infer (heavy lane): evaluate every case through the SAME TS engine the browser runs (frontend/src/mill/,
via tsx) - the exact analytic mill engine - and bake the deterministic per-case outputs (critical speed, the charge
motion + trajectories, the regime, the power draw) to data/derived/case-results.json. Delegates to
cclab/science/bake_cases.mjs."""
