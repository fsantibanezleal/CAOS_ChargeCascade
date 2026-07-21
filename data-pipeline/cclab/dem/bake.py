"""The DEM bake lane (Unit 6): run the cross-platform milldem thin-3D-slab engine per canonical case and export the
charge-motion frames, the net power, and the time-averaged charge outline. No YADE/LIGGGHTS, no WSL, no C++: milldem
is pure numpy + optional numba JIT (published to PyPI as `milldem`, MIT, github.com/fsantibanezleal/CAOS_MillDEM).

The engine simulates a thin axial slab of the mill with periodic axial boundaries. Its net power is validated against
the classical Hogg-Fuerstenau model within ~10-20% and size-consistently (milldem docs/VALIDATION.md,
tests/test_power3d.py). A single 2D disc slice cannot do this: it gives a size-independent absolute lift, so its
power/HF ratio shrinks with mill size. The slab resolves the 3D force chains that carry the lift.

Artifacts per case (written under data/dem/):
- `<case>.demframes.bin`  : the `chargecascade.demframes/v1` frame set (self-describing binary, see write_demframes).
- `<case>.power.json`     : net DEM power [kW], the CoM torque arm, the power time series, the impact-KE histogram.
- `<case>.outline.json`   : time-averaged (r, theta) occupancy grid + toe/shoulder angles for the 2D charge overlay.

The render tiles the slab K = round(L / w) times along the axis (each tile at a different time-phase) to fill the
full mill length; that is exact under the periodic-axial boundary (every axial slab is statistically identical).
"""
from __future__ import annotations

import json
import math
import struct
from dataclasses import dataclass
from pathlib import Path

import numpy as np

import milldem
from milldem import MillConfig, MillDEM3D
from milldem.contact import ContactModel

from ..cases.mill_cases import Case

ENGINE_VERSION = milldem.__version__

PACKING = 0.62                 # settled-bed solid fraction; bulk = rho_ball * PACKING (see calibration.json)
FPS = 25                       # display cadence of the baked frames (never the ~1e4-1e5 DEM substeps)
RENDER_CAP = 20000             # max tiled render particles (dossier tier: 1e4-3e4 on one InstancedMesh)
QUANT_MAX = 65535              # Uint16 quantization


@dataclass(frozen=True)
class BakeParams:
    """Capture window is adaptive: ~`revs` shell revolutions (one full charge cycle), so the replay loops over real
    motion and the power average spans a steady cycle, regardless of mill speed. The DEM dt is microsecond-scale
    (stiff small-ball contact), so the step COUNT, not the per-step cost, sets the wall time; capturing one revolution
    instead of a fixed several seconds keeps every case tractable while still covering a full charge cycle."""
    revs: float = 1.15         # shell revolutions captured (a bit over one, for a fuller loop)
    sim_time_cap: float = 5.0  # hard cap on the capture window [s] (slow mills)
    sim_time_floor: float = 1.0
    settle_time: float = 1.1   # settle window [s]; the aggressive damping settles the bed well within this
    n_frames: int = 180        # frames over the window (=> ~7 s replay at 25 fps)
    dt_scale: float = 1.8      # bake timestep = dt_scale * milldem default. milldem's default dt is 0.02*t_contact
                               # (~50 substeps per contact, very conservative); 1.8x -> ~28 substeps/contact, still
                               # well inside soft-sphere stability, halving the step count. The no-fluidization
                               # validation gate (validate.py) catches any instability this introduces.
    seed: int = 42


def config_for_case(c: Case) -> MillConfig:
    """Map a ChargeCascade Case to a milldem MillConfig. charge_density is the BULK charge density; milldem uses the
    solid ball density, so rho_ball = charge_density / PACKING keeps the DEM charge mass equal to the case's."""
    return MillConfig(
        diameter_m=c.diameter_m,
        length_m=c.length_m,
        phi_c=c.phi_c,
        fill=c.fill,
        ball_diameter_m=c.ball_top_mm / 1000.0,
        rho_ball=c.charge_density * 1000.0 / PACKING,   # t/m3 -> kg/m3, de-packed to solid
        contact=ContactModel(model="hooke", e=0.5, mu=0.25, mu_r=0.05),
    )


def capture_seconds(sim: MillDEM3D, p: BakeParams) -> float:
    """The capture window [s] = p.revs shell revolutions, clamped to [floor, cap]."""
    t_rev = (2 * math.pi / sim.omega) if sim.omega > 0 else p.sim_time_floor
    return float(min(p.sim_time_cap, max(p.sim_time_floor, p.revs * t_rev)))


def _capture(sim: MillDEM3D, p: BakeParams) -> tuple[np.ndarray, np.ndarray]:
    """Settle, then step the engine capturing n_frames position snapshots over ~one revolution. Returns
    (frames [F, N, 3] float32, torque_series [F] float32). The torque drives the net power (van Nierop route)."""
    sim.settle(t=p.settle_time)
    sim_time = capture_seconds(sim, p)
    n_steps = max(p.n_frames, int(sim_time / sim.dt))
    stride = max(1, n_steps // p.n_frames)
    frames: list[np.ndarray] = []
    torques: list[float] = []
    for i in range(n_steps):
        sim.step()
        if i % stride == 0 and len(frames) < p.n_frames:
            frames.append(np.stack([sim.px, sim.py, sim.pz], axis=1).astype(np.float32))
            torques.append(float(sim._torque[-1]) if sim._torque else 0.0)
    return np.asarray(frames, dtype=np.float32), np.asarray(torques, dtype=np.float32)


def _render_subsample(n: int, radii: np.ndarray, tiles: int) -> np.ndarray:
    """Indices of the slab particles to render, so that tiled count (n_keep * tiles) stays under RENDER_CAP,
    stratified by size class (keep the grading visible). Deterministic (sorted by size)."""
    keep = min(n, max(1, RENDER_CAP // max(1, tiles)))
    if keep >= n:
        return np.arange(n)
    # stratified by radius rank: take an even stride through the size-sorted order
    order = np.argsort(-radii, kind="stable")
    idx = order[np.linspace(0, n - 1, keep).astype(np.int64)]
    return np.sort(idx)


def write_demframes(path: Path, frames: np.ndarray, radii: np.ndarray, *, case_id: str, R: float, w: float,
                    length_m: float, ball_diameter_m: float, dt_sim: float, revs: float) -> dict:
    """Write the self-describing `chargecascade.demframes/v1` binary:
        [4] magic 'CDM1' | [u32] headerLen | [headerLen] JSON header | [N] u8 sizeClass | [F*N*3] u16 body (LE)
    Positions are quantized to the AABB (x,y in [-R,R], z in [0,w)). Returns the header dict."""
    F, N, _ = frames.shape
    tiles = max(1, round(length_m / w))
    aabb_min = [-R, -R, 0.0]
    aabb_max = [R, R, w]
    # size class: 0..3 by radius quartile of the RENDERED set (static, one byte per particle)
    if radii.max() > radii.min():
        q = (radii - radii.min()) / (radii.max() - radii.min())
    else:
        q = np.zeros_like(radii)
    size_class = np.clip((q * 3.999).astype(np.uint8), 0, 3)
    header = {
        "schema": "chargecascade.demframes/v1", "caseId": case_id,
        "N": int(N), "F": int(F), "fps": FPS, "quant": 16,
        "aabb": {"min": aabb_min, "max": aabb_max},
        "tiles": int(tiles), "slabThicknessM": float(w), "lengthM": float(length_m),
        "radiusM": float(R), "ballDiameterM": float(ball_diameter_m),
        "dt_sim": float(dt_sim), "revsCovered": float(revs), "sizeClassBytes": int(N),
        "engine": "milldem", "engineVersion": ENGINE_VERSION,
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
    return header


def _outline(frames: np.ndarray, R: float, nr: int = 24, nth: int = 72) -> dict:
    """Time-averaged (r/R, theta) occupancy of the charge + toe/shoulder angles. theta is measured CCW from +x;
    the mill turns CCW (omega>0), so the charge lifts on the +x/-y side and sheds toward the toe."""
    xs = frames[:, :, 0].ravel()
    ys = frames[:, :, 1].ravel()
    r = np.hypot(xs, ys) / R
    th = np.degrees(np.arctan2(ys, xs))
    occ, _, _ = np.histogram2d(np.clip(r, 0, 1), th, bins=[nr, nth], range=[[0, 1], [-180, 180]])
    occ = occ / max(1.0, occ.max())
    # toe/shoulder from the outer shell (r/R in [0.7, 1.0]): the angular edges of the lifted charge
    shell = (r >= 0.7) & (r <= 1.0)
    ang = th[shell]
    if ang.size > 50:
        toe_deg = float(np.percentile(ang, 5))
        shoulder_deg = float(np.percentile(ang, 95))
    else:
        toe_deg = shoulder_deg = 0.0
    return {
        "schema": "chargecascade.dem-outline/v1",
        "nr": nr, "nth": nth, "r_range": [0.0, 1.0], "theta_range_deg": [-180.0, 180.0],
        "occupancy": occ.astype(np.float32).round(4).tolist(),  # [nr][nth], row-major, 0..1
        "toe_deg": round(toe_deg, 2), "shoulder_deg": round(shoulder_deg, 2),
        "note": "theta CCW from +x; occupancy time-averaged over the captured steady-state window.",
    }


def _power(sim: MillDEM3D, torques: np.ndarray, frames: np.ndarray) -> dict:
    """Net DEM power [kW] (van Nierop torque route, scaled by length/slab) + the power time series and an impact-KE
    histogram derived from frame-to-frame particle speed (mass-weighted relative kinetic energy)."""
    N_over_2pi = sim.omega / (2 * math.pi)
    n_slabs = sim.cfg.length_m / sim.w
    p_series_kw = (2 * math.pi * np.abs(torques) * N_over_2pi * n_slabs / 1000.0).astype(np.float32)
    k = int(len(p_series_kw) * 0.4)
    net_kw = float(np.mean(p_series_kw[k:])) if len(p_series_kw) > k else 0.0
    # impact-KE spectrum: per-frame speed from position deltas, KE ~ 0.5 m v^2 with mean particle mass
    dt_frame = 1.0 / FPS
    if frames.shape[0] > 1:
        dv = np.diff(frames, axis=0) / dt_frame
        sp = np.linalg.norm(dv, axis=2).ravel()
        m_mean = float(np.mean(sim.m))
        ke = 0.5 * m_mean * sp ** 2
        hist, edges = np.histogram(ke, bins=24, range=[0, float(np.percentile(ke, 99)) or 1.0])
    else:
        hist, edges = np.zeros(24, dtype=int), np.linspace(0, 1, 25)
    return {
        "schema": "chargecascade.dem-power/v1",
        "net_power_kw": round(net_kw, 2),
        "arm_m": round(sim.arm_m(), 4),
        "n_particles": int(sim.n),
        "power_series_kw": p_series_kw.round(2).tolist(),
        "impact_ke_hist": {"counts": hist.astype(int).tolist(), "edges_j": edges.round(3).tolist()},
    }


def bake_case(c: Case, out_dir: Path, params: BakeParams = BakeParams()) -> dict:
    """Bake one case: frames + power + outline. C-EMPTY (fill 0) yields a degenerate zero-charge artifact."""
    cfg = config_for_case(c)
    if c.fill <= 0.0 or c.diameter_m <= 0:
        summary = {"caseId": c.id, "net_power_kw": 0.0, "n_particles": 0, "empty": True}
        (out_dir / f"{c.id}.power.json").write_text(json.dumps(
            {"schema": "chargecascade.dem-power/v1", "net_power_kw": 0.0, "arm_m": 0.0, "n_particles": 0,
             "power_series_kw": [], "impact_ke_hist": {"counts": [], "edges_j": []}}, indent=1), encoding="utf-8")
        return summary

    sim = MillDEM3D(cfg, seed=params.seed)
    sim.dt *= params.dt_scale
    frames, torques = _capture(sim, params)
    idx = _render_subsample(sim.n, sim.r, max(1, round(cfg.length_m / sim.w)))
    rframes = frames[:, idx, :]
    revs = sim.omega * capture_seconds(sim, params) / (2 * math.pi)

    hdr = write_demframes(out_dir / f"{c.id}.demframes.bin", rframes, sim.r[idx], case_id=c.id, R=sim.R, w=sim.w,
                          length_m=cfg.length_m, ball_diameter_m=cfg.ball_diameter_m, dt_sim=sim.dt, revs=revs)
    power = _power(sim, torques, frames)
    outline = _outline(frames, sim.R)
    (out_dir / f"{c.id}.power.json").write_text(json.dumps(power, indent=1), encoding="utf-8")
    (out_dir / f"{c.id}.outline.json").write_text(json.dumps(outline, indent=1), encoding="utf-8")
    return {"caseId": c.id, "net_power_kw": power["net_power_kw"], "n_particles": sim.n,
            "render_n": int(idx.size), "tiles": hdr["tiles"], "frames": hdr["F"], "bytes": hdr["bytes"],
            "toe_deg": outline["toe_deg"], "shoulder_deg": outline["shoulder_deg"]}
