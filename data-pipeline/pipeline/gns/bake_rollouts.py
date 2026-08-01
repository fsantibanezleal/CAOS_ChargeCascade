"""Unit 9 (Rung A), step 3: bake GNS rollouts into the demframes/v1 schema so the SAME in-browser viz replays
them (Mill3D mode 'gns'). The trained GNS is rolled out recursively from a real DEM initial state: it predicts
the next acceleration per particle, integrates by semi-implicit Euler, and rotates the shell-driven boundary,
for F frames. We record, per rollout, the per-frame position error vs the held-out DEM ground truth at the same
node (the honest accuracy readout: a learned surrogate replay, not a validated plant model).

The GNS is BAKED and replayed, never run live (PyG-style scatter to ONNX is immature and rollout latency is
prohibitive on WASM; see the beyond-SOTA + viz dossiers).

    python -m pipeline.gns.bake_rollouts            # bake a rollout per corpus case, write data/dem/<case>.gns.bin
"""
from __future__ import annotations

import json

import numpy as np

try:
    import torch
    _HAS_TORCH = True
except Exception:  # pragma: no cover
    _HAS_TORCH = False

from ..dem.bake import write_demframes
from ..dem.validate import read_demframes
from .gen_dem_corpus import CORPUS_DIR, DEM_DIR, GNS_DIR

ROLLOUT_FRAMES = 150


def _load_model():
    from .train_gns import MillGNS
    ckpt = torch.load(GNS_DIR / "gns.pt", map_location="cpu")
    model = MillGNS(hidden=ckpt["hidden"], n_blocks=ckpt["n_blocks"], c_history=ckpt["c_history"])
    model.load_state_dict(ckpt["state_dict"])
    model.eval()
    return model, np.array(ckpt["acc_mean"], np.float32), np.array(ckpt["acc_std"], np.float32), ckpt["c_history"]


def _rollout(model, acc_mean, acc_std, c_history, pos0_hist, ptype, R, ball_d, frames):
    """Recursively roll the GNS: pos0_hist [C+1, N, 2]. Returns predicted positions [frames, N, 2]."""
    from .train_gns import _radius_graph, _node_features
    rc = 2.5 * ball_d
    am = torch.tensor(acc_mean)
    asd = torch.tensor(acc_std)
    hist = [torch.tensor(pos0_hist[i]) for i in range(pos0_hist.shape[0])]  # list of [N,2]
    out = []
    tembed = model.type_embed(torch.tensor(ptype))
    with torch.no_grad():
        for _ in range(frames):
            ph = torch.stack(hist[-(c_history + 1):], dim=0).numpy()        # [C+1,N,2]
            vhist, wall, _ = _node_features(ph, ptype, R)
            cur = hist[-1]
            node_feat = torch.cat([torch.tensor(vhist), tembed, torch.tensor(wall)], dim=-1)
            src, dst = _radius_graph(cur, rc)
            rel = cur[src] - cur[dst]
            edge_feat = torch.cat([rel, rel.norm(dim=-1, keepdim=True)], dim=-1)
            acc = model(node_feat, edge_feat, src, dst, cur.shape[0]) * asd + am   # denormalize
            vel = (cur - hist[-2]) + acc                                    # semi-implicit Euler
            nxt = cur + vel
            rad = nxt.norm(dim=-1, keepdim=True)                           # keep particles inside the shell
            over = (rad > R).squeeze(-1)
            if over.any():
                nxt[over] = nxt[over] / rad[over] * R
            hist.append(nxt)
            out.append(nxt.numpy())
    return np.asarray(out, dtype=np.float32)


def _split_of(case_id: str) -> str:
    from .gen_dem_corpus import split_of
    return split_of(case_id)


def bake_case_rollout(case_id: str, frames: int = ROLLOUT_FRAMES) -> dict | None:
    if not _HAS_TORCH or not (GNS_DIR / "gns.pt").exists():
        return None
    npz = CORPUS_DIR / f"{case_id}.npz"
    dem = DEM_DIR / f"{case_id}.demframes.bin"
    if not npz.exists() or not dem.exists():
        return None
    z = np.load(npz)
    pos = z["positions"]
    ptype = z["particle_type"]
    header, _, _ = read_demframes(dem)
    R = float(header["radiusM"])
    ball_d = float(header["ballDiameterM"])
    model, am, asd, c_history = _load_model()
    pos0 = pos[:c_history + 1]                                             # seed from the real DEM start
    pred = _rollout(model, am, asd, c_history, pos0, ptype, R, ball_d, frames)   # [frames, N, 2]
    # position error vs the DEM ground truth at the same nodes over the overlap window. Whether this is
    # a generalization number depends ENTIRELY on the case's split, which is why it is carried through
    # to the per-rollout record below: for a `train` case this measures memorization.
    overlap = min(frames, pos.shape[0] - (c_history + 1))
    if overlap > 0:
        gt = pos[c_history + 1: c_history + 1 + overlap]
        err = float(np.linalg.norm(pred[:overlap] - gt, axis=2).mean() / R)   # mean node error / R
    else:
        err = float("nan")
    # write demframes/v1 (3D with z=slab-centre plane; the viz tiles as usual). Use the DEM slab thickness.
    N = pred.shape[1]
    w = float(header["slabThicknessM"])
    frames3d = np.concatenate([pred, np.full((frames, N, 1), w / 2, np.float32)], axis=2)
    radii = (ptype.astype(np.float64) + 1.0)
    hdr = write_demframes(DEM_DIR / f"{case_id}.gns.bin", frames3d, radii, case_id=case_id, R=R, w=w,
                          length_m=float(header["lengthM"]), ball_diameter_m=ball_d,
                          dt_sim=float(header["dt_sim"]), revs=float(header.get("revsCovered", 0.0)))
    return {"case_id": case_id, "split": _split_of(case_id), "frames": frames, "n": N,
            "node_err_over_R": round(err, 4), "bytes": hdr["bytes"]}


def bake_all(frames: int = ROLLOUT_FRAMES) -> dict:
    manifest = json.loads((GNS_DIR / "corpus-manifest.json").read_text(encoding="utf-8"))
    results = []
    for m in manifest["rollouts"]:
        r = bake_case_rollout(m["case_id"], frames)
        if r:
            results.append(r)
            print(f"[gns-bake] {r['case_id']} [{r['split']}]: {r['frames']} frames, "
                  f"node err/R {r['node_err_over_R']}", flush=True)
    hold = [r["node_err_over_R"] for r in results if r["split"] == "holdout"]
    train = [r["node_err_over_R"] for r in results if r["split"] == "train"]
    summary = {
        "holdout": {"n": len(hold),
                    "mean_node_err_over_R": round(float(np.mean(hold)), 4) if hold else None,
                    "max_node_err_over_R": round(float(np.max(hold)), 4) if hold else None},
        "train": {"n": len(train),
                  "mean_node_err_over_R": round(float(np.mean(train)), 4) if train else None,
                  "max_node_err_over_R": round(float(np.max(train)), 4) if train else None},
    }
    out = {"schema": "chargecascade.gns-rollouts/v2", "n": len(results), "frames": frames,
           "summary": summary, "rollouts": results,
           "note": "GNS rollouts replayed via the demframes/v1 schema (Mill3D mode 'gns'). node_err_over_R is the "
                   "mean per-node position error vs the DEM, normalized by mill radius. ONLY the `holdout` rows "
                   "describe generalization; `train` rows are cases the optimizer saw. The v1 schema labelled all "
                   "of them 'held-out', which was false: v1 had no split and every case was trained on."}
    (GNS_DIR / "rollouts.json").write_text(json.dumps(out, indent=1), encoding="utf-8")
    return out


if __name__ == "__main__":
    bake_all()
