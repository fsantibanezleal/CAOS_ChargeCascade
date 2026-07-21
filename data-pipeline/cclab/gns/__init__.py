"""ChargeCascade Unit 9 (Rung A): a baked Graph Network Simulator (GNS) charge-motion rollout, the genuine
beyond-SOTA rung that makes the 3D a real many-body solve (retires the "kinematic, not DEM" honesty gap).

Pipeline (all offline; the GNS is baked and replayed, never run live, per the viz + beyond-SOTA dossiers):
- `gen_dem_corpus`  : build the 2D charge-motion trajectory corpus from the baked DEM frames.
- `train_gns`       : train the GNS (encoder-processor-decoder, message passing; Sanchez-Gonzalez et al. 2020).
- `bake_rollouts`   : roll the trained GNS out on held-out operating points into the demframes/v1 schema.
"""
from __future__ import annotations

from .gen_dem_corpus import build_corpus

__all__ = ["build_corpus"]
