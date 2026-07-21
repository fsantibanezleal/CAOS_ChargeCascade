"""Unit 9 (Rung A), step 2: the Graph Network Simulator (GNS) and its training loop.

Architecture, verbatim from Sanchez-Gonzalez, Godwin, Pfaff, Ying, Leskovec, Battaglia, "Learning to Simulate
Complex Physics with Graph Networks", ICML 2020 (arXiv:2002.09405), following the geoelements/gns (MIT) pattern:

    Encoder    node v_i^0 = f_v(state_i) ; edge e_ij^0 = f_e(x_i - x_j, |x_i - x_j|)
    Processor  M identical message-passing blocks (the reference uses ~10):
                 e_ij^m = phi_e(e_ij^{m-1}, v_i^{m-1}, v_j^{m-1})
                 v_i^m  = phi_v(v_i^{m-1}, SUM_j e_ij^m)           (permutation-invariant aggregation)
    Decoder    a_i = g(v_i^M)                                       (per-particle acceleration)
    Integrator v_{t+1} = v_t + a_i ; p_{t+1} = p_t + v_{t+1}        (semi-implicit Euler, dt folded in)

Two stability tricks (both implemented): predict acceleration and integrate (not absolute position), and inject
random-walk noise into the input velocity history during training so the model sees rollout-time error.

Message passing is implemented WITHOUT torch-geometric (a self-contained radius graph + scatter-add), because
this GNS is BAKED and replayed, never exported to ONNX (PyG-to-ONNX scatter export is immature; see the
beyond-SOTA dossier). Runs on the RTX 4070 if available, CPU otherwise.

    python -m cclab.gns.train_gns --epochs 40           # train on the corpus, save data/gns/gns.pt
    python -m cclab.gns.train_gns --smoke               # 1-step forward/backward sanity check (CPU, seconds)
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np

try:
    import torch
    import torch.nn as nn
    _HAS_TORCH = True
except Exception:  # pragma: no cover
    _HAS_TORCH = False

from .gen_dem_corpus import CORPUS_DIR, GNS_DIR

C_HISTORY = 5          # velocity-history length fed to the encoder (Sanchez-Gonzalez use ~5)
HIDDEN = 64            # MLP width
N_BLOCKS = 8           # message-passing blocks (~10 in the reference; 8 for a light didactic model)
NOISE_STD = 3e-4       # random-walk velocity noise injected during training
DEFAULT_EPOCHS = 40


def _mlp(sizes: list[int], layernorm: bool = True):
    layers = []
    for i in range(len(sizes) - 1):
        layers.append(nn.Linear(sizes[i], sizes[i + 1]))
        if i < len(sizes) - 2:
            layers.append(nn.SiLU())
    if layernorm:
        layers.append(nn.LayerNorm(sizes[-1]))
    return nn.Sequential(*layers)


if _HAS_TORCH:
    class MillGNS(nn.Module):
        """A radius-graph GNS for 2D mill charge motion. Node state = flattened velocity history + type embed +
        wall-distance features; edges = relative position + distance within the connectivity radius."""

        def __init__(self, n_types: int = 4, hidden: int = HIDDEN, n_blocks: int = N_BLOCKS, c_history: int = C_HISTORY):
            super().__init__()
            self.c_history = c_history
            self.type_embed = nn.Embedding(n_types, 8)
            node_in = 2 * c_history + 8 + 2      # velocity history (2*C) + type embed (8) + wall features (2)
            edge_in = 2 + 1                      # relative position (2) + distance (1)
            self.node_enc = _mlp([node_in, hidden, hidden])
            self.edge_enc = _mlp([edge_in, hidden, hidden])
            self.edge_blocks = nn.ModuleList([_mlp([3 * hidden, hidden, hidden]) for _ in range(n_blocks)])
            self.node_blocks = nn.ModuleList([_mlp([2 * hidden, hidden, hidden]) for _ in range(n_blocks)])
            self.decoder = _mlp([hidden, hidden, 2], layernorm=False)

        def forward(self, node_feat, edge_feat, src, dst, n_nodes):
            v = self.node_enc(node_feat)                    # [N, H]
            e = self.edge_enc(edge_feat)                    # [E, H]
            for eb, nb in zip(self.edge_blocks, self.node_blocks):
                e_upd = eb(torch.cat([e, v[src], v[dst]], dim=-1))
                e = e + e_upd                               # residual edge update
                agg = torch.zeros(n_nodes, e.shape[-1], device=e.device, dtype=e.dtype)
                agg.index_add_(0, dst, e_upd)               # permutation-invariant SUM aggregation
                v = v + nb(torch.cat([v, agg], dim=-1))     # residual node update
            return self.decoder(v)                          # [N, 2] normalized acceleration


def _radius_graph(pos: "torch.Tensor", r: float) -> tuple["torch.Tensor", "torch.Tensor"]:
    """Directed edges (src->dst) for all pairs within radius r (self-loops excluded). O(N^2), fine for N~800."""
    d = torch.cdist(pos, pos)                                # [N, N]
    mask = (d < r) & (d > 0)
    dst, src = torch.where(mask)                             # message from src into dst
    return src, dst


class Corpus:
    """Loads the rollout corpus and yields single-step training samples (velocity history -> target accel)."""

    def __init__(self, corpus_dir: Path = CORPUS_DIR, manifest_path: Path | None = None):
        self.manifest = json.loads((GNS_DIR / "corpus-manifest.json").read_text(encoding="utf-8"))
        self.norm = self.manifest["normalization"]
        self.rollouts = []
        for m in self.manifest["rollouts"]:
            z = np.load(corpus_dir / f"{m['case_id']}.npz")
            self.rollouts.append({"pos": z["positions"], "type": z["particle_type"],
                                  "radius_m": m["radius_m"], "ball_d": m["ball_diameter_m"]})
        self.acc_mean = np.array(self.norm["acc_mean"], dtype=np.float32)
        self.acc_std = np.array(self.norm["acc_std"], dtype=np.float32)

    def connectivity_radius(self, roll) -> float:
        return 2.5 * roll["ball_d"]                          # a few ball diameters (Sanchez-Gonzalez fixed radius)

    def sample_indices(self, rng) -> tuple[int, int]:
        ri = rng.integers(0, len(self.rollouts))
        T = self.rollouts[ri]["pos"].shape[0]
        t = rng.integers(self.c_history, T - 1)              # need C past frames + 1 future for the target
        return ri, t

    c_history = C_HISTORY


def _node_features(pos_hist: np.ndarray, ptype: np.ndarray, R: float, type_embed_dim=8):
    """pos_hist [C+1, N, 2] (last C+1 positions). Velocity history [C,N,2], + wall-distance features. Returns the
    per-node raw feature blocks (velocity history flat, wall feats) and the current velocity (for integration)."""
    vel = np.diff(pos_hist, axis=0)                          # [C, N, 2]
    vhist = vel.transpose(1, 0, 2).reshape(vel.shape[1], -1)  # [N, 2C]
    cur = pos_hist[-1]                                       # [N, 2]
    rad = np.linalg.norm(cur, axis=1, keepdims=True)         # [N,1] distance from axis
    wall = np.concatenate([np.clip((R - rad) / R, 0, 1), rad / R], axis=1)  # [N,2] normalized wall features
    return vhist.astype(np.float32), wall.astype(np.float32), vel[-1].astype(np.float32)


def train(epochs: int = DEFAULT_EPOCHS, steps_per_epoch: int = 400, lr: float = 3e-4, seed: int = 42) -> dict:
    if not _HAS_TORCH:
        raise SystemExit("torch not installed; `pip install -r data-pipeline/requirements-gns.txt`")
    device = "cuda" if torch.cuda.is_available() else "cpu"
    torch.manual_seed(seed)
    corpus = Corpus()
    model = MillGNS().to(device)
    opt = torch.optim.Adam(model.parameters(), lr=lr)
    acc_std = torch.tensor(corpus.acc_std, device=device)
    acc_mean = torch.tensor(corpus.acc_mean, device=device)
    rng = np.random.default_rng(seed)
    hist = []
    print(f"[gns-train] device={device} rollouts={len(corpus.rollouts)} blocks={N_BLOCKS} hidden={HIDDEN}", flush=True)
    for ep in range(epochs):
        model.train(); tot = 0.0
        for _ in range(steps_per_epoch):
            ri, t = corpus.sample_indices(rng)
            roll = corpus.rollouts[ri]
            R = roll["radius_m"]; rc = corpus.connectivity_radius(roll)
            pos_hist = roll["pos"][t - corpus.c_history: t + 1].copy()   # [C+1, N, 2]
            # random-walk noise on the history (stability trick)
            noise = rng.normal(0, NOISE_STD, pos_hist.shape).cumsum(axis=0).astype(np.float32)
            pos_hist = pos_hist + noise
            target_acc = (roll["pos"][t + 1] - 2 * roll["pos"][t] + roll["pos"][t - 1]).astype(np.float32)  # [N,2]
            vhist, wall, _ = _node_features(pos_hist, roll["type"], R)
            cur = torch.tensor(pos_hist[-1], device=device)
            tembed = model.type_embed(torch.tensor(roll["type"], device=device))
            node_feat = torch.cat([torch.tensor(vhist, device=device), tembed, torch.tensor(wall, device=device)], dim=-1)
            src, dst = _radius_graph(cur, rc)
            rel = cur[src] - cur[dst]
            edge_feat = torch.cat([rel, rel.norm(dim=-1, keepdim=True)], dim=-1)
            pred = model(node_feat, edge_feat, src, dst, cur.shape[0])   # normalized accel
            tgt = (torch.tensor(target_acc, device=device) - acc_mean) / acc_std
            loss = ((pred - tgt) ** 2).mean()
            opt.zero_grad(); loss.backward(); opt.step()
            tot += float(loss)
        mean = tot / steps_per_epoch
        hist.append(mean)
        print(f"[gns-train] epoch {ep + 1}/{epochs}  loss {mean:.5f}", flush=True)
    GNS_DIR.mkdir(parents=True, exist_ok=True)
    torch.save({"state_dict": model.state_dict(), "acc_mean": corpus.acc_mean.tolist(),
                "acc_std": corpus.acc_std.tolist(), "c_history": C_HISTORY, "n_blocks": N_BLOCKS,
                "hidden": HIDDEN}, GNS_DIR / "gns.pt")
    metrics = {"schema": "chargecascade.gns-metrics/v1", "device": device, "epochs": epochs,
               "final_loss": hist[-1], "loss_history": [round(h, 5) for h in hist],
               "n_rollouts": len(corpus.rollouts), "blocks": N_BLOCKS, "hidden": HIDDEN, "c_history": C_HISTORY}
    (GNS_DIR / "gns-metrics.json").write_text(json.dumps(metrics, indent=1), encoding="utf-8")
    print(f"[gns-train] saved {GNS_DIR / 'gns.pt'} (final loss {hist[-1]:.5f})", flush=True)
    return metrics


def smoke() -> None:
    """A tiny forward+backward on random data (CPU, seconds): verifies the model wires up and gradients flow."""
    if not _HAS_TORCH:
        raise SystemExit("torch not installed")
    torch.manual_seed(0)
    model = MillGNS()
    N = 64
    pos = torch.rand(N, 2) * 2 - 1
    vhist = torch.randn(N, 2 * C_HISTORY); wall = torch.rand(N, 2)
    tembed = model.type_embed(torch.zeros(N, dtype=torch.long))
    node_feat = torch.cat([vhist, tembed, wall], dim=-1)
    src, dst = _radius_graph(pos, 0.4)
    rel = pos[src] - pos[dst]
    edge_feat = torch.cat([rel, rel.norm(dim=-1, keepdim=True)], dim=-1)
    pred = model(node_feat, edge_feat, src, dst, N)
    loss = (pred ** 2).mean(); loss.backward()
    gnorm = sum(p.grad.abs().sum().item() for p in model.parameters() if p.grad is not None)
    print(f"[gns-smoke] N={N} edges={src.shape[0]} pred={tuple(pred.shape)} loss={float(loss):.4f} grad_sum={gnorm:.2f} OK")


def main() -> None:
    ap = argparse.ArgumentParser(prog="cclab.gns.train_gns")
    ap.add_argument("--epochs", type=int, default=DEFAULT_EPOCHS)
    ap.add_argument("--steps", type=int, default=400)
    ap.add_argument("--smoke", action="store_true")
    a = ap.parse_args()
    if a.smoke:
        smoke()
    else:
        train(epochs=a.epochs, steps_per_epoch=a.steps)


if __name__ == "__main__":
    main()
