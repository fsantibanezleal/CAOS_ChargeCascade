"""CONTRACT 2 — artifact (pipeline -> web). The manifest is the authoritative, versioned record of a baked case: its
category, the engine + version, the shared learned-model ONNX, the compact per-case trace pointer + byte size, the
lane/gate verdict, the CONTRACT-1 flags, and the case metrics. The web loads ONLY manifests + traces + the shared
artifacts; frontend/src/lib/contract.types.ts mirrors this schema so a drift fails the build. The committed
case-results.json (baked by the SAME TS engine the browser runs) IS the real output of the offline lane; the power
surrogate is honest — measured against the EXACT analytic engine, never a fabricated win."""
from __future__ import annotations

from typing import Any

from .. import __version__
from .trace import TRACE_SCHEMA

MANIFEST_SCHEMA = "chargecascade.manifest/v2"
INDEX_SCHEMA = "chargecascade.index/v1"

ENGINE_NOTE = ("Tumbling-mill charge motion + power draw: the critical speed Nc=42.3/sqrt(D-d), the Davis single-particle "
               "departure (cos a = omega^2 r / g) + parabolic cataract trajectories, the cascading/cataracting/"
               "centrifuging regimes, and the Hogg-Fuerstenau (1972) + Morrell-form (1996) power. The same TS engine "
               "runs live in the browser (the 3D mill) and in the offline bake. The power surrogate + the scenario OOD "
               "autoencoder (torch->ONNX) run live via onnxruntime-web; the EXACT analytic engine is the authority.")
HONESTY = ("The operating points are SYNTHETIC but physically realistic (typical SAG/ball/rod geometries + speeds), "
           "stated openly; C-CRITICAL and C-EMPTY are exact analytic controls. The power surrogate is measured against "
           "the EXACT analytic engine (power error); the OOD autoencoder flags operating points outside the training "
           "envelope. The physics is the published analytic models (Davis, Hogg-Fuerstenau, Morrell, Bond); no real "
           "mill data is redistributed. No fabricated win.")


def shared_artifacts() -> dict:
    return {
        "models": [
            {"id": "power-surrogate", "file": "power-surrogate.onnx", "opset": 17, "kind": "power/regime surrogate MLP"},
            {"id": "scenario-ood", "file": "scenario-ood.onnx", "opset": 17, "kind": "operating-point OOD autoencoder"},
        ],
        "learned_metrics": "cc-learned.json",
        "case_results": "case-results.json",
    }


def build_case_manifest(*, case: Any, seed: int, artifact_rel: str, trace_bytes: int,
                        gate: dict, flags: list[dict], metrics: dict) -> dict:
    return {
        "schema": MANIFEST_SCHEMA,
        "case_id": case.id,
        "name": case.name,
        "category": case.category,
        "real_or_synthetic": case.real_or_synthetic,
        "expected_band": case.expected_band,
        "validation_anchor": case.validation_anchor,
        "engine": {"package": "cclab", "version": __version__, "model": ENGINE_NOTE},
        "seed": seed,
        "shared": shared_artifacts(),
        "artifact": {"path": artifact_rel, "format": "json", "trace_schema": TRACE_SCHEMA, "bytes": trace_bytes},
        "lane": gate["lane"],
        "gate": gate,
        "flags": flags,
        "metrics": metrics,
        "honesty": HONESTY,
    }


def build_index(entries: list[dict]) -> dict:
    return {
        "schema": INDEX_SCHEMA,
        "engine_version": __version__,
        "n_cases": len(entries),
        "cases": sorted(entries, key=lambda e: e["case_id"]),
    }
