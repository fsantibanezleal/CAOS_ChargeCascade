"""Stage 3 - train (OFFLINE, heavy lane): fit the two learned models - the power/regime surrogate (MLP) and the
operating-point OOD autoencoder - and export them to ONNX. Deterministic (seeded). Delegates to
cclab/science/train_mill.py (torch); writes power-surrogate.onnx, scenario-ood.onnx + the metrics to data/derived/."""
