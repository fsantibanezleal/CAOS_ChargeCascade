"""Shared pure-Python helpers — Pyodide-safe, usable by the offline stages AND the live lane (same code path).
In ChargeCascade the physics single source of truth is the TypeScript mill engine (frontend/src/mill/), which the
offline bake runs unchanged in Node; this package holds the learned-model helpers (learned.py), not the physics."""
