# The precompute pipeline (two-language)

ChargeCascade's offline lane is **two-language** (like FragmentIQ / CoreLog / PitForge): the heavy science is the SAME
TypeScript engine the browser runs, driven from Node via `tsx`; Python only orchestrates + reshapes + trains. This
avoids ever re-implementing the mill physics in Python.

## The named stages (`cclab/stages/`)

| Stage | What (heavy lane) |
|---|---|
| `preprocess` | validate the cases' mill descriptors through CONTRACT 1 (`io/contract.py`) |
| `feature_extraction` | assemble the learned-model training data: a sampled SAG / ball / rod envelope EVALUATED by the exact engine → `6 features → [power_kw, frac_centrifuging]` labels (`science/gen_train.mjs`) |
| `train` | fit the power surrogate + the scenario OOD-AE → self-contained ONNX (`science/train_mill.py`, torch) |
| `infer` | evaluate every case through the SAME TS engine (`science/bake_cases.mjs`) → `case-results.json` |
| `evaluate` | the surrogate's power error vs the exact engine + the OOD AUC (`science/eval_mill.mjs`, run via onnxruntime-web in Node) |
| `export` | build the compact per-case trace + manifest (CONTRACT 2) — the LIGHT, numpy-only step (`stages/export.py :: build_replay`) |

The `preprocess` / `feature_extraction` / `train` / `infer` / `evaluate` Python stage bodies are docstring stubs that
defer to the two-language `science/` scripts; `export` is the real light-lane work.

## The two lanes of `cclab.pipeline`

```bash
python -m cclab.pipeline all              # LIGHT (numpy): reshape the committed case-results.json -> traces + manifests
python -m cclab.pipeline all --retrain    # HEAVY: bake -> gen_train -> train_mill -> eval_mill, then reshape
```

The **default is light**: the committed `data/derived/case-results.json` + `cc-learned.json` + the two `.onnx` ARE the
heavy lane's real outputs, so CI, the contract checks and the replay never need torch or Node. The light lane is
numpy-only (`data-pipeline/requirements.txt`). `--retrain` regenerates them and needs the heavy
`.venv-precompute` (`data-pipeline/requirements-precompute.txt`: torch 2.12.1+cpu, onnx 1.22.0, onnxscript 0.7.0,
numpy 2.1.3) plus Node `tsx` — it is local-only and never deployed.

```
bake_cases.mjs ──► data/derived/case-results.json            (per-case evaluate(), baked by the TS engine)
gen_train.mjs  ──► data/raw/{mill-train,mill-eval}.json       (git-ignored in-dist + OOD scenarios)
train_mill.py  ──► data/derived/{power-surrogate.onnx, scenario-ood.onnx} + partial learned json
eval_mill.mjs  ──► data/derived/cc-learned.json              (surrogate power err vs the exact engine, via ORT in Node)
pipeline.export──► data/derived/<case>/trace.json + manifests/<case>.json + index.json   (CONTRACT 2)
```

Determinism: the light pipeline is a pure function of the committed artifacts — re-running it is byte-identical.
