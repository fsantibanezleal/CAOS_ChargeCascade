#!/usr/bin/env python3
"""Regenerate the figures for the ChargeCascade mill charge-motion + power report from the COMMITTED artifacts.
Two figures:

  fig-power.pdf   - the honest power-model spread: net power per case from two closed-form models (Hogg-Fuerstenau
                    and Morrell) and from the baked DEM, showing that standard mill-power models disagree by ~20-30%
                    and DEM gives a third estimate around them.
  fig-regimes.pdf - the Davis charge-motion kinematics: shoulder and toe angles and the centrifuging fraction
                    against the fraction of critical speed, tracing the cascading -> cataracting -> centrifuging
                    progression.

Run:  python make_figs.py     (from repo root)
Deps: matplotlib, numpy.
"""
from __future__ import annotations

import json
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
DATA = HERE.parent / "data"

INK = "#1a1a2e"
GRID = "#d8d8e0"

plt.rcParams.update({
    "font.family": "serif", "font.size": 9.4, "axes.edgecolor": INK,
    "axes.labelcolor": INK, "text.color": INK, "xtick.color": INK, "ytick.color": INK,
    "axes.linewidth": 0.8, "figure.dpi": 200,
})


def _dem_powers():
    bs = json.loads((ROOT / "data" / "dem" / "bake-summary.json").read_text(encoding="utf-8"))
    return {c["caseId"]: c["net_power_kw"] for c in bs["cases"]}


def fig_power():
    cc = json.loads((DATA / "cc.json").read_text(encoding="utf-8"))
    dem = _dem_powers()
    # cases with non-zero power, sorted by phi_c
    cases = [c for c in cc["cases"] if c["hf"] and c["hf"] > 0]
    cases.sort(key=lambda c: c["phi_c"])
    ids = [c["id"] for c in cases]
    hf = [c["hf"] for c in cases]
    mo = [c["morrell"] for c in cases]
    de = [dem.get(c["id"], np.nan) for c in cases]
    x = np.arange(len(ids)); w = 0.26
    fig, ax = plt.subplots(figsize=(7.0, 3.2))
    ax.bar(x - w, hf, w, color="#1b6ca8", edgecolor=INK, linewidth=0.5, label="Hogg-Fuerstenau (closed-form)")
    ax.bar(x, mo, w, color="#e07a3f", edgecolor=INK, linewidth=0.5, label="Morrell (closed-form)")
    ax.bar(x + w, de, w, color="#3fa34d", edgecolor=INK, linewidth=0.5, label="DEM (baked, ~5-10k particles)")
    ax.set_yscale("log")
    ax.set_xticks(x); ax.set_xticklabels([f"{i}\n$\\phi_c${c['phi_c']:.2f}" for i, c in zip(ids, cases)],
                                         fontsize=6.6)
    ax.set_ylabel("net power (kW, log)")
    ax.set_title("Mill power: two closed-form models disagree by ~23%,\nDEM gives a third estimate around them",
                 fontsize=9.0)
    ax.grid(axis="y", color=GRID, linewidth=0.7, zorder=0)
    ax.set_axisbelow(True)
    ax.legend(fontsize=7.6, frameon=True, facecolor="white", edgecolor=GRID, loc="upper left")
    for s in ("top", "right"):
        ax.spines[s].set_visible(False)
    fig.tight_layout()
    fig.savefig(HERE / "fig-power.pdf", bbox_inches="tight")
    plt.close(fig)


def fig_regimes():
    cc = json.loads((DATA / "cc.json").read_text(encoding="utf-8"))
    cases = sorted(cc["cases"], key=lambda c: c["phi_c"])
    phi = [c["phi_c"] for c in cases]
    sh = [c["shoulder"] for c in cases]
    toe = [c["toe"] for c in cases]
    cent = [100 * c["frac_cent"] for c in cases]
    fig, (a1, a2) = plt.subplots(1, 2, figsize=(7.0, 3.0))

    a1.plot(phi, sh, "o-", color="#1b6ca8", linewidth=1.6, markersize=5, label="shoulder angle")
    a1.plot(phi, toe, "s-", color="#e07a3f", linewidth=1.6, markersize=5, label="toe angle")
    for x, lo, hi, lab in [(0.6, 0, 200, "cascading"), (0.77, 0, 200, "cataracting"), (1.0, 0, 200, "centrifuging")]:
        a1.axvline(x, color="#ccc", linewidth=0.8, linestyle=":")
    a1.set_xlabel("fraction of critical speed $\\phi_c$")
    a1.set_ylabel("charge angle (deg)")
    a1.set_title("(a) charge shape (Davis kinematics)", fontsize=8.6)
    a1.grid(True, color=GRID, linewidth=0.7)
    a1.set_axisbelow(True)
    a1.legend(fontsize=7.6, frameon=True, facecolor="white", edgecolor=GRID, loc="center left")
    for s in ("top", "right"):
        a1.spines[s].set_visible(False)

    a2.plot(phi, cent, "^-", color="#b23a48", linewidth=1.7, markersize=6)
    a2.axvline(1.0, color="#555", linewidth=1.0, linestyle="--", label="$\\phi_c=1$ (centrifuging onset)")
    a2.set_xlabel("fraction of critical speed $\\phi_c$")
    a2.set_ylabel("centrifuging fraction (%)")
    a2.set_title("(b) centrifuging onset at $\\phi_c=1$", fontsize=8.6)
    a2.grid(True, color=GRID, linewidth=0.7)
    a2.set_axisbelow(True)
    a2.legend(fontsize=7.4, frameon=True, facecolor="white", edgecolor=GRID, loc="upper left")
    for s in ("top", "right"):
        a2.spines[s].set_visible(False)

    fig.tight_layout()
    fig.savefig(HERE / "fig-regimes.pdf", bbox_inches="tight")
    plt.close(fig)


def main():
    fig_power()
    fig_regimes()
    print("wrote fig-power.pdf, fig-regimes.pdf")


if __name__ == "__main__":
    main()
