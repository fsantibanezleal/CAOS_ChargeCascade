# Guide, run the precompute / retrain pipeline

ChargeCascade has **two pipeline lanes**, both driven by `python -m cclab.pipeline`:

- **Default lane (numpy-light, no torch / no node).** Rebuilds the per-case replay traces + manifests + index from
  the *committed* `data/derived/case-results.json` (which is the TS engine's real bake) and `cc-learned.json`. It is
  deterministic, same input ⇒ byte-identical artifacts. This is what CI runs; it installs in seconds
  (`data-pipeline/requirements.txt` is just `numpy`).
- **Heavy lane (`--retrain`, torch + node).** Re-bakes `case-results.json` with the **same** TS engine via `tsx`,
  generates the training data, trains the two learned models (`train_mill.py`) and exports them to ONNX, evaluates the
  surrogate downstream, then rebuilds the replay artifacts. Local-only; never deployed.

## Default lane, rebuild the replay artifacts

PowerShell (primary):

```powershell
.\scripts\setup.ps1                       # builds .venv-pipeline + .venv, installs deps + the editable cclab package
.\scripts\precompute.ps1                  # all 10 cases  (or:  .\scripts\precompute.ps1 K-BALL --seed 7)
.venv-pipeline\Scripts\python.exe -m pytest
.\scripts\smoke.ps1                       # CONTRACT 2 check  (wraps scripts/check_artifacts.py)
```

bash:

```bash
./scripts/setup.sh                        # .venv-pipeline + .venv, editable cclab
./scripts/precompute.sh                   # all cases   (or:  ./scripts/precompute.sh K-BALL --seed 7)
.venv-pipeline/bin/python -m pytest
./scripts/smoke.sh                        # CONTRACT 2 check
```

Outputs land in `data/derived/<CASE>/trace.json`, `data/derived/manifests/<CASE>.json` and
`data/derived/manifests/index.json`. `scripts/check_artifacts.py` validates **CONTRACT 2** (the index references
every case; each manifest + artifact exists, is non-empty, and its byte size + lane match the manifest) and prints
`CONTRACT 2 OK: 10 cases` on success.

## Heavy lane, re-bake + retrain (torch → ONNX)

The two learned models live in a **separate** `.venv-precompute` so the default lane and CI never pull torch.
Create it and run the retrain from the repo root:

PowerShell:

```powershell
python -m venv .venv-precompute
.venv-precompute\Scripts\python.exe -m pip install -r data-pipeline\requirements-precompute.txt `
    --extra-index-url https://download.pytorch.org/whl/cpu
python -m cclab.pipeline all --retrain
```

bash:

```bash
python -m venv .venv-precompute
.venv-precompute/Scripts/python -m pip install -r data-pipeline/requirements-precompute.txt \
    --extra-index-url https://download.pytorch.org/whl/cpu
python -m cclab.pipeline all --retrain
```

`requirements-precompute.txt` is pinned to the verified CPU install on Python 3.12: `torch==2.12.1` (the `+cpu`
wheel via the extra index), `onnx==1.22.0`, `onnxscript==0.7.0`, `numpy==2.1.3`. There are `scripts/precompute.ps1`
and `scripts/precompute.sh` wrappers for the default lane; the `--retrain` flag is what flips on the heavy steps.

What `--retrain` does, in order (see `cclab/pipeline.py::retrain` and `cclab/science/`):

1. **`bake_cases.mjs`**, re-bakes `data/derived/case-results.json` by running the same TypeScript mill engine
   (`frontend/src/mill/`) over the 10 cases through `tsx`.
2. **`gen_train.mjs`**, samples the operating envelope with that same engine to produce the training/eval data
   (`data/raw/mill-train.json`, `mill-eval.json`).
3. **`train_mill.py`** (torch, in `.venv-precompute`), trains the **power surrogate** (6 features → net power kW +
   fraction centrifuging) and the **scenario OOD autoencoder**, and exports both to single-file ONNX
   (`power-surrogate.onnx`, `scenario-ood.onnx`, `external_data=False` so onnxruntime-web can load them).
4. **`eval_mill.mjs`**, measures the surrogate's downstream skill against the **exact** TS engine on held-out
   points and assembles `data/derived/cc-learned.json`.

> The train step needs **node + `tsx`** for `bake_cases.mjs` / `gen_train.mjs` / `eval_mill.mjs` (the pipeline runs
> them from `frontend/` via `node --import tsx …`). Install the frontend deps once (`cd frontend && npm install`)
> before the first `--retrain`.

After a heavy run, re-run the default-lane checks (`pytest`, `scripts/smoke`) to confirm the freshly-baked artifacts
still satisfy CONTRACT 2. The whole `--retrain` finishes in seconds on CPU, see [guide 03](03_gpu-lane.md) on why
no GPU is needed at the shipped scale.
