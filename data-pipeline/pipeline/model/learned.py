"""Feature contracts for ChargeCascade's two learned models (the SINGLE SOURCE OF TRUTH shared by the offline trainer
pipeline/science/train_mill.py and the in-browser inference). Trained OFFLINE (torch -> ONNX), run LIVE (onnxruntime-web).
The analytic mill engine is the interpretable AUTHORITY; the surrogate emulates it for instant sweeps and is measured
DOWNSTREAM against it. (Stub until commit 4b.)

1. power-surrogate, a small MLP over the mill geometry + operating features -> [gross power, fraction centrifuging].
   A fast emulation of the analytic Hogg-Fuerstenau/Morrell engine for instant Monte-Carlo / operating-envelope sweeps
   (the App's What-if tool). Benchmarked DOWNSTREAM vs the EXACT analytic engine (power error) on held-out operating
   points - the analytic engine is the authority; no fabricated win.

2. scenario-ood, an autoencoder over the standardized feature vector; a high reconstruction MSE flags an operating
   point OUTSIDE the training envelope (over-speed, near-centrifuging) - the App's live Anomaly guard.
"""
from __future__ import annotations

# the per-mill operating feature vector (mirrors frontend/src/mill engine inputs)
MILL_FEATURES = ("diameter_m", "length_m", "fill", "phi_c", "ball_top_mm", "charge_density")
N_FEATURES = len(MILL_FEATURES)

SURROGATE_INPUT_NAME = "x"
SURROGATE_OUTPUT_NAME = "y"
SURROGATE_OUTPUTS = ("power_kw", "frac_centrifuging")

OOD_INPUT_NAME = "x"
OOD_OUTPUT_NAME = "xr"
