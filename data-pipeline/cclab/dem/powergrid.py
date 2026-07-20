"""The DEM (phiC, J) power grid (feeds Unit 8's power-field heatmap). A coarse grid of milldem thin-3D-slab net-power
evaluations over the (fraction-of-critical-speed, fractional-fill) plane, for a fixed reference mill. The frontend
bilinearly interpolates this coarse DEM grid to the display resolution; the Hogg-Fuerstenau and Morrell C-model
fields are computed LIVE and exactly in the browser (the DEM grid is the only one that must be baked).

Kept deliberately coarse (a handful of nodes per axis): each node is a full settle+run of the slab engine, so a fine
grid would be wall-clock hours. The grid resolution is a documented choice, not a stub; the values are real milldem
runs. The grid uses the SAME accelerated bake path as the frame bake (a shorter settle + the dt_scale timestep), not
milldem's conservative simulate_power defaults, so the whole grid is tractable offline.
"""
from __future__ import annotations

import json
import math
from pathlib import Path

import numpy as np

from milldem import MillConfig, MillDEM3D
from milldem.contact import ContactModel

# reference mill for the field (a mid-size ball mill; the field shows the SHAPE of P over (phiC, J))
REF = dict(diameter_m=4.0, length_m=6.0, ball_diameter_m=0.24, charge_density_bulk=4.8)
PACKING = 0.62
PHI_NODES = [0.55, 0.68, 0.80, 0.92, 1.05]
J_NODES = [0.15, 0.27, 0.40]
DT_SCALE = 1.8
SETTLE_S = 1.0
RUN_S = 0.9                     # steady-power capture (power converges fast once settled)


def _net_power_kw(phi: float, J: float, seed: int) -> float:
    cfg = MillConfig(diameter_m=REF["diameter_m"], length_m=REF["length_m"], phi_c=phi, fill=J,
                     ball_diameter_m=REF["ball_diameter_m"],
                     rho_ball=REF["charge_density_bulk"] * 1000.0 / PACKING,
                     contact=ContactModel(model="hooke", e=0.5, mu=0.25, mu_r=0.05))
    sim = MillDEM3D(cfg, seed=seed)
    sim.dt *= DT_SCALE
    sim.settle(t=SETTLE_S)
    for _ in range(int(RUN_S / sim.dt)):
        sim.step()
    return sim.net_power_kw(settle_frac=0.35)


def bake_power_grid(out_dir: Path, seed: int = 42) -> dict:
    phis = list(PHI_NODES); js = list(J_NODES)
    grid = np.zeros((len(js), len(phis)), dtype=np.float32)   # [J][phiC]
    for jj, J in enumerate(js):
        for ii, phi in enumerate(phis):
            grid[jj, ii] = _net_power_kw(phi, J, seed)
            print(f"      grid[J={J:.2f}][phiC={phi:.2f}] = {grid[jj, ii]:.0f} kW", flush=True)
    out = {
        "schema": "chargecascade.dem-powergrid/v1",
        "ref_mill": {"diameter_m": REF["diameter_m"], "length_m": REF["length_m"],
                     "ball_diameter_m": REF["ball_diameter_m"], "charge_density_bulk": REF["charge_density_bulk"]},
        "phi_c_nodes": phis, "fill_nodes": js,
        "power_kw": grid.round(2).tolist(),        # [len(J)][len(phiC)]
        "engine": "milldem", "engineVersion": "0.02.000",
        "note": "Net DEM power [kW] on a coarse (phiC, J) grid for the reference mill (accelerated bake path: "
                "dt_scale + short settle). Bilinearly interpolate to the display grid in the browser; HF and C-model "
                "fields are computed live and exact.",
    }
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "power-grid.json").write_text(json.dumps(out, indent=1), encoding="utf-8")
    return {"nodes": len(phis) * len(js), "phi_c": phis, "fill": js,
            "p_min": float(grid.min()), "p_max": float(grid.max())}
