"""Unit 9 corpus expansion: bake parametric DEM cases on a (phiC, J) grid for GNS training.

The 9 canonical cases are too few for a GNS to learn robust interaction laws. This script bakes
additional cases on a grid of (fraction-of-critical-speed, fractional-fill) for a reference mill,
writing demframes.bin files the gen_dem_corpus.py reads. Each case takes ~1-3 min of CPU (milldem).
"""
from __future__ import annotations
import json
import math
import struct
import time
from pathlib import Path
import numpy as np
import milldem
from milldem import MillConfig, MillDEM3D
from milldem.contact import ContactModel

REPO = Path(__file__).resolve().parents[3]
DEM_DIR = REPO / "data" / "dem"

REF = dict(diameter_m=4.0, length_m=6.0, ball_diameter_m=0.24, charge_density_bulk=4.8)
PACKING = 0.62
FPS = 25
RENDER_CAP = 20000
QUANT_MAX = 65535

PHI_NODES = [0.45, 0.55, 0.65, 0.75, 0.85, 0.95, 1.05]
J_NODES = [0.15, 0.22, 0.30, 0.38, 0.45]


def bake_one(case_id: str, phi_c: float, fill: float, seed: int = 42) -> bool:
    out = DEM_DIR / f"{case_id}.demframes.bin"
    if out.exists():
        print(f"  {case_id}: skip (exists)", flush=True)
        return True
    cfg = MillConfig(
        diameter_m=REF["diameter_m"], length_m=REF["length_m"], phi_c=phi_c, fill=fill,
        ball_diameter_m=REF["ball_diameter_m"],
        rho_ball=REF["charge_density_bulk"] * 1000.0 / PACKING,
        contact=ContactModel(model="hooke", e=0.5, mu=0.25, mu_r=0.05),
    )
    sim = MillDEM3D(cfg, seed=seed)
    sim.dt *= 1.8
    t0 = time.time()
    sim.settle(t=1.1)
    # capture ~1.15 revs
    t_rev = (2 * math.pi / sim.omega) if sim.omega > 0 else 1.0
    sim_time = min(5.0, max(1.0, 1.15 * t_rev))
    n_frames = 180
    n_steps = max(n_frames, int(sim_time / sim.dt))
    stride = max(1, n_steps // n_frames)
    frames = []
    for i in range(n_steps):
        sim.step()
        if i % stride == 0 and len(frames) < n_frames:
            frames.append(np.stack([sim.px, sim.py, sim.pz], axis=1).astype(np.float32))
    frames = np.asarray(frames, dtype=np.float32)
    radii = np.full(sim.n, sim.cfg.ball_diameter_m / 2, dtype=np.float32)
    # write demframes
    _write(out, case_id, frames, radii, sim)
    print(f"  {case_id}: {frames.shape[0]}f x {sim.n}p in {time.time()-t0:.0f}s", flush=True)
    return True


def _write(path: Path, case_id: str, frames: np.ndarray, radii: np.ndarray, sim: MillDEM3D):
    F, N, _ = frames.shape
    R = sim.cfg.diameter_m / 2
    w = sim.w
    aabb_min = [-R, -R, 0.0]
    aabb_max = [R, R, w]
    q = np.zeros_like(radii)
    size_class = np.clip((q * 3.999).astype(np.uint8), 0, 3)
    header = {
        "schema": "chargecascade.demframes/v1", "caseId": case_id,
        "N": int(N), "F": int(F), "fps": FPS, "quant": 16,
        "aabb": {"min": aabb_min, "max": aabb_max},
        "tiles": int(max(1, round(sim.cfg.length_m / w))),
        "slabThicknessM": float(w), "lengthM": float(sim.cfg.length_m),
        "radiusM": float(R), "ballDiameterM": float(sim.cfg.ball_diameter_m),
        "dt_sim": float(sim.dt), "revsCovered": 1.15, "sizeClassBytes": int(N),
        "engine": "milldem", "engineVersion": milldem.__version__,
    }
    hb = json.dumps(header, separators=(",", ":")).encode("utf-8")
    span = np.array([aabb_max[i] - aabb_min[i] or 1.0 for i in range(3)], dtype=np.float64)
    lo = np.array(aabb_min, dtype=np.float64)
    q16 = np.clip(np.round((frames.astype(np.float64) - lo) / span * QUANT_MAX), 0, QUANT_MAX).astype("<u2")
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "wb") as f:
        f.write(b"CDM1")
        f.write(struct.pack("<I", len(hb)))
        f.write(hb)
        f.write(size_class.tobytes())
        f.write(q16.tobytes(order="C"))
    header["bytes"] = path.stat().st_size
    (DEM_DIR / f"{case_id}.power.json").write_text(json.dumps({
        "schema": "chargecascade.dem-power/v1",
        "net_power_kw": round(float(sim.net_power_kw(settle_frac=0.35)), 2),
        "n_particles": int(sim.n), "engine": "milldem",
    }, indent=1), encoding="utf-8")


def main():
    total = len(PHI_NODES) * len(J_NODES)
    print(f"Baking {total} parametric DEM cases on (phiC, J) grid...", flush=True)
    n_ok = 0
    for phi in PHI_NODES:
        for J in J_NODES:
            cid = f"G-p{phi:.2f}-J{J:.2f}"
            try:
                bake_one(cid, phi, J)
                n_ok += 1
            except Exception as e:
                print(f"  {cid}: FAILED ({e})", flush=True)
    print(f"Done: {n_ok}/{total} baked. Total demframes: {len(list(DEM_DIR.glob('*.demframes.bin')))}", flush=True)


if __name__ == "__main__":
    main()
