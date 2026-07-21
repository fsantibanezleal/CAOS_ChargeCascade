"""Validate the DEM bake against the classical power model and internal consistency (Unit 6 acceptance). No fitted
constants: the milldem thin-3D-slab power is validated in the engine's own test suite (tests/test_power3d.py); here
we re-check, per baked case, that the shipped artifacts are physical and consistent with the analytic engine.

Checks per case:
- DEM net power within a band of the analytic Hogg-Fuerstenau power (same charge mass); C-EMPTY must be ~0.
- toe/shoulder describe a lifted charge (shoulder above toe), except the controls.
- the frame set decodes, positions stay inside the mill AABB, and the charge is not fluidized (bounded speed).
"""
from __future__ import annotations

import json
import math
import struct
from pathlib import Path

import numpy as np

from ..cases.mill_cases import Case
from .bake import FPS


def hf_power_kw(c: Case, lift_deg: float = 35.0, c_arm: float = 0.80) -> float:
    """Classical Hogg-Fuerstenau net power [kW] for the case (the cross-check reference the app already ships)."""
    if c.fill <= 0:
        return 0.0
    D = c.diameter_m
    R = D / 2
    L = c.length_m
    Nc = 42.3 / math.sqrt(D)
    omega = 2 * math.pi * (c.phi_c * Nc) / 60
    M = c.charge_density * 1000 * (math.pi * R * R * L) * c.fill
    return omega * M * 9.81 * (c_arm * R * math.sin(math.radians(lift_deg)) * max(0.0, 1 - 1.065 * c.fill)) / 1000


def read_demframes(path: Path) -> tuple[dict, np.ndarray, np.ndarray]:
    """Decode a demframes/v1 binary into (header, frames[F,N,3] float32 in metres, sizeClass[N])."""
    buf = path.read_bytes()
    assert buf[:4] == b"CDM1", f"bad magic in {path}"
    (hlen,) = struct.unpack("<I", buf[4:8])
    header = json.loads(buf[8:8 + hlen].decode("utf-8"))
    N, F = header["N"], header["F"]
    off = 8 + hlen
    size_class = np.frombuffer(buf, dtype=np.uint8, count=N, offset=off).copy()
    off += N
    q = np.frombuffer(buf, dtype="<u2", count=F * N * 3, offset=off).reshape(F, N, 3).astype(np.float64)
    lo = np.array(header["aabb"]["min"])
    hi = np.array(header["aabb"]["max"])
    span = np.where(hi - lo == 0, 1.0, hi - lo)
    frames = (q / 65535.0 * span + lo).astype(np.float32)
    return header, frames, size_class


def validate_case(c: Case, dem_dir: Path, power_band: float = 0.65) -> dict:
    """Return a per-case validation record with pass/fail flags. power_band is the fractional tolerance on P/HF.

    The band is an order-of-magnitude PHYSICALITY check, not a tight match: the DEM (a first-principles torque)
    and Hogg-Fuerstenau (a torque-arm model with a fixed charge-CoM assumption) genuinely diverge at the fill and
    speed extremes. In particular at high fill (J~0.4+) the DEM power keeps rising with charge mass while HF rolls
    off via its (1 - 1.065 J) charge-CoM-toward-axis term, so DEM/HF runs high there; that is a real modeling
    difference, surfaced per-case in the UI, not an unphysical bake. The load-bearing checks are the physicality
    ones (charge lifted, particles inside the shell, not fluidized) plus this loose HF sanity band."""
    rec: dict = {"caseId": c.id, "checks": {}, "ok": True}
    power = json.loads((dem_dir / f"{c.id}.power.json").read_text(encoding="utf-8"))
    p_dem = power["net_power_kw"]
    p_hf = hf_power_kw(c)
    rec["p_dem_kw"] = p_dem
    rec["p_hf_kw"] = round(p_hf, 2)

    if c.fill <= 0:  # C-EMPTY: the zero-power oracle
        ok = p_dem == 0.0
        rec["checks"]["empty_is_zero_power"] = ok
        rec["ok"] &= ok
        return rec

    ratio = p_dem / p_hf if p_hf > 0 else 0.0
    rec["ratio_dem_over_hf"] = round(ratio, 3)
    if c.phi_c >= 0.95:
        # centrifuging regime: the DEM charge pins to the shell and the power ROLLS OFF, which the Hogg-Fuerstenau
        # extrapolation does not model. The physically-correct DEM here is BELOW HF, not within a symmetric band; we
        # only require a positive, non-exploding power under the HF upper bound (roll-off, not a symmetric match).
        ok = 0.0 < ratio <= (1 + power_band)
        rec["checks"]["power_rolls_off_below_hf_ceiling"] = bool(ok)
        rec["ok"] &= ok
    else:
        in_band = (1 - power_band) <= ratio <= (1 + power_band)
        rec["checks"]["power_within_band_of_hf"] = bool(in_band)
        rec["ok"] &= in_band

    fpath = dem_dir / f"{c.id}.demframes.bin"
    if fpath.exists():
        header, frames, _ = read_demframes(fpath)
        R = header["radiusM"]
        rad = np.hypot(frames[..., 0], frames[..., 1])
        inside = bool(rad.max() <= R * 1.03)          # particles stay in the shell (small overlap allowed)
        rec["checks"]["particles_inside_shell"] = inside
        rec["ok"] &= inside
        dv = np.diff(frames, axis=0) * FPS
        vmax = float(np.linalg.norm(dv, axis=2).max()) if frames.shape[0] > 1 else 0.0
        v_ceiling = 6.0 * (header["radiusM"]) + 20.0    # generous; catches a fluidized/exploded charge
        not_fluidized = vmax < v_ceiling
        rec["checks"]["charge_not_fluidized"] = not_fluidized
        rec["v_max_ms"] = round(vmax, 2)
        rec["ok"] &= not_fluidized

    outp = dem_dir / f"{c.id}.outline.json"
    # a lifted crescent (shoulder above toe) is expected only in the cascading/cataracting regimes; a centrifuging
    # charge wraps the shell, so toe/shoulder lose that ordering. Skip the check for controls and phiC >= 0.95.
    if outp.exists() and c.category != "control (analytic anchor)" and c.phi_c < 0.95:
        outline = json.loads(outp.read_text(encoding="utf-8"))
        lifted = outline["shoulder_deg"] > outline["toe_deg"]
        rec["checks"]["shoulder_above_toe"] = bool(lifted)
        rec["ok"] = bool(rec["ok"] and lifted)
    return rec


def validate_all(cases: list[Case], dem_dir: Path) -> dict:
    records = [validate_case(c, dem_dir) for c in cases]
    return {"schema": "chargecascade.dem-validation/v1",
            "n_cases": len(records), "n_ok": sum(1 for r in records if r["ok"]),
            "cases": records}
