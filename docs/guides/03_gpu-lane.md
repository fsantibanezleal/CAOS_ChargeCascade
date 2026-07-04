# Guide, the GPU lane (and why you don't need it at the shipped scale)

**Honest answer first: ChargeCascade does not need a GPU.** The two learned models are *tiny* MLPs and CPU torch
trains them in seconds. The shipped `data-pipeline/requirements-precompute.txt` pins the **CPU** wheel
(`torch==2.12.1`, installed via `--extra-index-url https://download.pytorch.org/whl/cpu`) on purpose, and that is
the default + sufficient lane. The live/replay path never touches a GPU at all (it's the TypeScript engine +
onnxruntime-web in the browser).

## How tiny the models are

`cclab/science/train_mill.py` trains:

- **power-surrogate**, a `6 → 64 → 64 → 2` MLP (6 standardized mill features → `[net power kW, fraction
  centrifuging]`), 160 epochs, batch 128.
- **scenario-ood**, a `6 → 8 → 3 → 8 → 6` autoencoder; its reconstruction MSE is the anomaly score that separates
  in-envelope from out-of-envelope operating points (over-speed, near-centrifuging, extreme geometry), 180 epochs.

Both train on a few thousand synthetic-but-realistic operating points sampled from the exact analytic engine. On a
laptop CPU the whole `--retrain` (re-bake + train + export + eval) finishes in seconds. A GPU would be idle.

## When a GPU lane would actually be worth it

Only if you **scale up** well beyond the shipped envelope, e.g.:

- the training/eval sweep grows to **millions** of points (a much finer operating-envelope sample), or
- the models grow substantially (deeper nets, a larger feature set), or
- you replace the kinematic 3D animation with a real **DEM** charge-motion solve as the offline ground truth (the
  documented future upgrade), *that* is a genuinely GPU-shaped compute, not the surrogate training.

To switch to GPU in that case: install the CUDA torch wheel instead of the `+cpu` one (e.g.
`torch==2.12.1` from the CUDA index `https://download.pytorch.org/whl/cu124`) into `.venv-precompute`, and set
`device="cuda"` in `train_mill.py` (move the model + tensors to the device). The committed artifacts are produced
offline regardless of lane, so the product still deploys as a **static replay**, the browser never needs the GPU.

Until you hit one of those triggers, keep it CPU: it is faster end-to-end (no driver/wheel friction) and fully
reproducible.
