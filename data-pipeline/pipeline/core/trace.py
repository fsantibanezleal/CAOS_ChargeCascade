"""The compact per-case TRACE = the web-replay artifact. Part of CONTRACT 2: its shape is mirrored by
frontend/src/lib/contract.types.ts, so a drift fails the web build. Built deterministically from the committed bake
(case-results.json, produced by the SAME TS engine the browser runs) + the learned-model metrics (cc-learned.json,
when present). Carries the operating point so the browser can re-evaluate LIVE, the critical speed + phiC, the regime
+ the centrifuging fraction, the charge toe/shoulder, the power draw (Hogg-Fuerstenau + Morrell + Bond), the
power-vs-phiC curve, and the learned-model metrics."""
from __future__ import annotations

from typing import Any

TRACE_SCHEMA = "chargecascade.trace/v1"


def _learned_block(learned: dict | None) -> dict:
    if not learned:
        return {"status": "pending-training", "surrogate": None, "ood": None}
    return {"status": "trained", "surrogate": learned.get("surrogate"), "ood": learned.get("ood")}


def build_trace(case: Any, *, case_result: dict, learned: dict | None) -> dict:
    return {
        "schema": TRACE_SCHEMA,
        "case_id": case.id,
        "name": case.name,
        "category": case.category,
        "real_or_synthetic": case.real_or_synthetic,
        "expected_band": case.expected_band,
        "validation_anchor": case.validation_anchor,
        "operating": case_result.get("operating"),
        "nc_rpm": case_result.get("ncRpm"),
        "phi_c": case_result.get("phiC"),
        "regime": case_result.get("regime"),
        "frac_centrifuging": case_result.get("fracCentrifuging"),
        "shoulder_deg": case_result.get("shoulderDeg"),
        "toe_deg": case_result.get("toeDeg"),
        "phf_kw": case_result.get("phfKw"),
        "p_morrell_kw": case_result.get("pMorrellKw"),
        "bond_w_kwh_t": case_result.get("bondWKwhT"),
        "charge_mass_t": case_result.get("chargeMassT"),
        "power_curve": case_result.get("powerCurve"),
        "flags": case_result.get("flags"),
        "learned": _learned_block(learned),
    }
