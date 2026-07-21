"""CLI entry for the DEM bake lane. See cclab.dem module docstring."""
from __future__ import annotations

import argparse
import json

from . import DEM_DIR, run_all
from ..cases.mill_cases import CASES
from .validate import validate_all


def main() -> None:
    ap = argparse.ArgumentParser(prog="cclab.dem")
    ap.add_argument("case", nargs="?", default=None, help="a case id (default: all)")
    ap.add_argument("--grid", action="store_true", help="bake only the (phiC, J) power grid")
    ap.add_argument("--no-grid", action="store_true", help="skip the power grid")
    ap.add_argument("--validate", action="store_true", help="re-validate existing bakes without recomputing")
    args = ap.parse_args()

    if args.validate:
        val = validate_all(CASES, DEM_DIR)
        (DEM_DIR / "validation.json").write_text(json.dumps(val, indent=1), encoding="utf-8")  # persist the re-check
        print(json.dumps(val, indent=1))
        raise SystemExit(0 if val["n_ok"] == val["n_cases"] else 1)

    if args.grid:
        from .powergrid import bake_power_grid
        g = bake_power_grid(DEM_DIR)
        print(f"power grid: {g['nodes']} nodes, P in [{g['p_min']:.0f}, {g['p_max']:.0f}] kW -> {DEM_DIR}")
        return

    run_all(only=args.case, do_grid=not args.no_grid)


if __name__ == "__main__":
    main()
