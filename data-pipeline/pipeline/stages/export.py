"""Stage 6, export (CONTRACT 2): build the compact per-case trace from the committed bake (case-results.json, baked
by the SAME TS engine the browser runs) + the learned-model metrics (cc-learned.json, when trained), run the lane
gate, and write the manifest. No torch/node, so the contract + replay regenerate deterministically anywhere, and CI
stays fast. The HEAVY export (baking case-results.json + training the ONNX) is done by the preserved science
(pipeline/science/bake_cases.mjs + train_mill.py), invoked by pipeline.retrain."""
from __future__ import annotations

from pathlib import Path
from typing import Any

from ..core.gate import classify_lane
from ..core.manifest import build_case_manifest
from ..core.trace import build_trace
from ..io.formats import write_json

_RUN_MS = 5.0   # a sub-millisecond mill evaluation; deterministic gate budget
_RUNTIMES = {"ts-mill", "onnxruntime-web"}


def _case_metrics(case_result: dict, learned: dict | None) -> dict:
    m = {
        "nc_rpm": float(case_result.get("ncRpm", 0.0)),
        "phi_c": float(case_result.get("phiC", 0.0)),
        "phf_kw": float(case_result.get("phfKw", 0.0)),
        "p_morrell_kw": float(case_result.get("pMorrellKw", 0.0)),
        "frac_centrifuging": float(case_result.get("fracCentrifuging", 0.0)),
        "charge_mass_t": float(case_result.get("chargeMassT", 0.0)),
        "regime": str(case_result.get("regime", "")),
    }
    if learned:
        sg = (learned.get("surrogate") or {})
        m["surrogate_power_err"] = float(sg.get("power_err", 0.0))
        m["ood_auc"] = float((learned.get("ood") or {}).get("auc", 0.0))
    return m


def build_replay(case: Any, *, derived_dir: str, manifests_dir: str,
                 case_results: dict, learned: dict | None, contract_flags: list[dict], seed: int) -> dict:
    cr = case_results["cases"][case.id]
    trace = build_trace(case, case_result=cr, learned=learned)
    artifact_rel = f"{case.id}/trace.json"
    trace_bytes = write_json(Path(derived_dir) / artifact_rel, trace)
    gate = classify_lane(client_side=True, runtimes=_RUNTIMES, run_ms=_RUN_MS, trace_bytes=trace_bytes)
    manifest = build_case_manifest(
        case=case, seed=seed, artifact_rel=artifact_rel, trace_bytes=trace_bytes,
        gate=gate, flags=contract_flags, metrics=_case_metrics(cr, learned),
    )
    write_json(Path(manifests_dir) / f"{case.id}.json", manifest)
    return manifest
