"""ChargeCascade DEM lane: bake real charge-motion frames, net power, and charge outlines with the cross-platform
milldem thin-3D-slab engine (PyPI `milldem`, MIT), plus the (phiC, J) DEM power grid for the field heatmap.

    python -m pipeline.dem            # bake all canonical cases + the power grid, then validate
    python -m pipeline.dem K-SAG      # bake one case
    python -m pipeline.dem --grid     # bake only the power grid
    python -m pipeline.dem --validate # re-validate existing bakes (no recompute)
"""
from __future__ import annotations

import json
from pathlib import Path

from ..cases.mill_cases import CASES
from .bake import BakeParams, bake_case
from .powergrid import bake_power_grid
from .validate import validate_all

REPO_ROOT = Path(__file__).resolve().parents[3]
DEM_DIR = REPO_ROOT / "data" / "dem"

__all__ = ["bake_case", "bake_power_grid", "validate_all", "run_all", "DEM_DIR", "BakeParams"]


def run_all(only: str | None = None, do_grid: bool = True, params: BakeParams = BakeParams()) -> dict:
    DEM_DIR.mkdir(parents=True, exist_ok=True)
    cases = [c for c in CASES if only is None or c.id == only]
    summaries = []
    for c in cases:
        print(f"[dem] baking {c.id} ({c.name}) ...", flush=True)
        s = bake_case(c, DEM_DIR, params)
        summaries.append(s)
        print(f"      P={s['net_power_kw']} kW  N={s.get('n_particles')}  render={s.get('render_n')}"
              f"  tiles={s.get('tiles')}  {s.get('bytes', 0) / 1e6:.2f} MB", flush=True)
    grid = None
    if do_grid and only is None:
        print("[dem] baking the (phiC, J) power grid ...", flush=True)
        grid = bake_power_grid(DEM_DIR)
        print(f"      grid {grid['nodes']} nodes  P in [{grid['p_min']:.0f}, {grid['p_max']:.0f}] kW", flush=True)
    val = validate_all(cases, DEM_DIR)
    (DEM_DIR / "validation.json").write_text(json.dumps(val, indent=1), encoding="utf-8")
    (DEM_DIR / "bake-summary.json").write_text(
        json.dumps({"cases": summaries, "grid": grid, "n_ok": val["n_ok"], "n_cases": val["n_cases"]}, indent=1),
        encoding="utf-8")
    print(f"[dem] validation: {val['n_ok']}/{val['n_cases']} cases pass -> {DEM_DIR}", flush=True)
    return {"cases": summaries, "grid": grid, "validation": val}
