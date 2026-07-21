"""Unit 9 (Rung A), step 1: build the GNS training corpus from the baked DEM frames.

A Graph Network Simulator (Sanchez-Gonzalez et al. 2020, arXiv:2002.09405; the geoelements/gns MIT pattern)
trains on particle TRAJECTORIES: it sees a short velocity history per particle and predicts the next
acceleration, integrated by semi-implicit Euler. So the corpus is just the per-particle position sequences of
the baked DEM, plus a static particle-type channel and the per-rollout operating point.

We learn the charge motion in the mill CROSS-SECTION (2D x-y): the interesting cascade/cataract dynamics live
there, z is the periodic axial direction the slab tiles over. Each baked case (`data/dem/<case>.demframes.bin`)
becomes one rollout `positions [T, N, 2]` (metres) + `particle_type [N]` (the size class) + metadata. The
trainer builds the connectivity-radius graph and the velocity history on the fly; here we only assemble the
trajectories and the corpus-wide normalization statistics the GNS needs (velocity + acceleration mean/std).

    python -m cclab.gns.gen_dem_corpus            # build the corpus from every baked case
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np

from ..cases.mill_cases import CASES
from ..dem.validate import read_demframes

REPO_ROOT = Path(__file__).resolve().parents[3]
DEM_DIR = REPO_ROOT / "data" / "dem"
GNS_DIR = REPO_ROOT / "data" / "gns"
CORPUS_DIR = GNS_DIR / "corpus"

N_TRAIN = 800          # particles per rollout (a stratified subsample; the GNS handles variable N, fixed eases batching)
MIN_FRAMES = 30        # skip a rollout with too few frames to form velocity histories


def _subsample(n: int, radii: np.ndarray, keep: int, seed: int = 0) -> np.ndarray:
    """Stratified-by-size subsample of `keep` particle indices (preserve the grading), deterministic."""
    if keep >= n:
        return np.arange(n)
    order = np.argsort(-radii, kind="stable")
    return np.sort(order[np.linspace(0, n - 1, keep).astype(np.int64)])


def rollout_from_case(case_id: str) -> dict | None:
    """Read a baked demframes and return a GNS rollout dict, or None if the bake is missing/too short."""
    path = DEM_DIR / f"{case_id}.demframes.bin"
    if not path.exists():
        return None
    header, frames, size_class = read_demframes(path)     # frames [F, N, 3] metres (slab positions)
    F, N, _ = frames.shape
    if F < MIN_FRAMES or N == 0:
        return None
    # radius proxy from the size class (0..3) so the subsample preserves grading; then project to x-y (2D)
    radii = (size_class.astype(np.float64) + 1.0)
    idx = _subsample(N, radii, min(N_TRAIN, N))
    pos2d = frames[:, idx, :2].astype(np.float32)          # [F, n, 2]
    ptype = size_class[idx].astype(np.int64)               # [n] static type = size class
    c = next((c for c in CASES if c.id == case_id), None)
    return {
        "case_id": case_id,
        "positions": pos2d,                                # [T, n, 2] metres, T=F
        "particle_type": ptype,                            # [n]
        "phi_c": float(c.phi_c) if c else 0.0,
        "fill": float(c.fill) if c else 0.0,
        "radius_m": float(header["radiusM"]),
        "ball_diameter_m": float(header["ballDiameterM"]),
        "fps": int(header["fps"]),
        "n": int(pos2d.shape[1]), "T": int(F),
    }


def _stats(rollouts: list[dict]) -> dict:
    """Corpus-wide velocity + acceleration normalization stats (GNS trains on normalized quantities)."""
    vs, accs = [], []
    for r in rollouts:
        p = r["positions"]                                 # [T, n, 2]
        v = np.diff(p, axis=0)                              # [T-1, n, 2] (per-frame displacement = velocity*dt)
        a = np.diff(v, axis=0)                              # [T-2, n, 2]
        vs.append(v.reshape(-1, 2)); accs.append(a.reshape(-1, 2))
    V = np.concatenate(vs); A = np.concatenate(accs)
    return {
        "vel_mean": V.mean(0).tolist(), "vel_std": (V.std(0) + 1e-9).tolist(),
        "acc_mean": A.mean(0).tolist(), "acc_std": (A.std(0) + 1e-9).tolist(),
        "n_vel": int(len(V)), "n_acc": int(len(A)),
    }


def build_corpus() -> dict:
    CORPUS_DIR.mkdir(parents=True, exist_ok=True)
    rollouts, meta = [], []
    for c in CASES:
        r = rollout_from_case(c.id)
        if r is None:
            continue
        np.savez_compressed(CORPUS_DIR / f"{c.id}.npz", positions=r["positions"], particle_type=r["particle_type"])
        rollouts.append(r)
        meta.append({k: r[k] for k in ("case_id", "phi_c", "fill", "radius_m", "ball_diameter_m", "fps", "n", "T")})
        print(f"[gns-corpus] {c.id}: T={r['T']} n={r['n']} phiC={r['phi_c']} J={r['fill']}", flush=True)
    if not rollouts:
        raise SystemExit("no baked DEM frames found; run `python -m cclab.dem` first")
    stats = _stats(rollouts)
    manifest = {
        "schema": "chargecascade.gns-corpus/v1",
        "n_rollouts": len(rollouts), "dim": 2, "n_train_particles": N_TRAIN,
        "rollouts": meta, "normalization": stats,
        "note": "2D (x-y cross-section) charge-motion trajectories from the baked milldem DEM, for a GNS "
                "(Sanchez-Gonzalez et al. 2020). Positions in metres; velocity = frame-to-frame displacement.",
    }
    (GNS_DIR / "corpus-manifest.json").write_text(json.dumps(manifest, indent=1), encoding="utf-8")
    print(f"[gns-corpus] {len(rollouts)} rollouts -> {CORPUS_DIR}  (vel_std={stats['vel_std']}, acc_std={stats['acc_std']})", flush=True)
    return manifest


if __name__ == "__main__":
    build_corpus()
