"""CONTRACT 1 — ingestion (a raw mill operating point -> pipeline). The *bring-your-own-mill* gate.

* ``validate_records`` validates tumbling-mill operating-point rows. This is what the pipeline runs over the case set;
  it proves the gate and carries flags into the manifest.
* ``validate_mill`` validates a single dropped descriptor (a dict) — the same policy.

A record is ACCEPTED iff it passes; ill-formed records are REJECTED with a reason (never silently coerced); plausible-
but-honesty-relevant records are FLAGGED (accepted; the flag travels into the manifest). The key flags: a phiC >= 1
(the charge centrifuges — no grinding), an unusually high fill (> 0.45, above the power peak), a large ball/diameter
ratio (the (D-d) critical speed matters), and a low fill (< 0.15, ball-on-liner). Documented in data/README.md.
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any

from .schema import MillDescriptor

REQUIRED_COLUMNS: tuple[str, ...] = ("mill_id", "mill_type", "diameter_m", "length_m", "fill", "phi_c", "ball_top_mm", "charge_density")
MILL_TYPES = ("rod", "ball", "sag", "ag")
FILL_FLAG_HI = 0.45      # above the power peak (J ~ 0.47); charge crowding
FILL_FLAG_LO = 0.15      # low charge; ball-on-liner impacts


@dataclass
class ContractReport:
    accepted: list[MillDescriptor]
    rejected: list[dict[str, Any]]
    flagged: list[dict[str, Any]]

    @property
    def ok(self) -> bool:
        return len(self.accepted) > 0

    def summary(self) -> str:
        return f"{len(self.accepted)} accepted, {len(self.rejected)} rejected, {len(self.flagged)} flagged"


def validate_records(raw_rows: list[dict[str, Any]]) -> ContractReport:
    """Apply CONTRACT 1 to raw mill operating-point rows (e.g. from a CSV). Pure; deterministic; no I/O."""
    accepted: list[MillDescriptor] = []
    rejected: list[dict[str, Any]] = []
    flagged: list[dict[str, Any]] = []

    for i, row in enumerate(raw_rows):
        mid = str(row.get("mill_id", f"row{i}"))
        missing = [c for c in REQUIRED_COLUMNS if c not in row or row[c] in (None, "")]
        if missing:
            rejected.append({"row": i, "mill_id": mid, "reason": f"missing/empty columns: {missing}"})
            continue
        mill_type = str(row["mill_type"]).lower()
        try:
            v = {c: float(row[c]) for c in ("diameter_m", "length_m", "fill", "phi_c", "ball_top_mm", "charge_density")}
        except (TypeError, ValueError):
            rejected.append({"row": i, "mill_id": mid, "reason": "non-numeric geometry/operating field"})
            continue

        bad: list[str] = []
        if mill_type not in MILL_TYPES:
            bad.append(f"mill_type={mill_type!r} not in {MILL_TYPES}")
        for c in ("diameter_m", "length_m", "charge_density"):
            if not (v[c] > 0) or math.isnan(v[c]) or math.isinf(v[c]):
                bad.append(f"{c}={v[c]:g} must be > 0")
        if not (0 <= v["fill"] <= 0.6):
            bad.append(f"fill={v['fill']:g} not in [0,0.6]")
        if not (0 < v["phi_c"] <= 1.5):
            bad.append(f"phi_c={v['phi_c']:g} not in (0,1.5]")
        if v["ball_top_mm"] / 1000 >= v["diameter_m"]:
            bad.append(f"ball_top_mm={v['ball_top_mm']:g} >= mill diameter")
        if bad:
            rejected.append({"row": i, "mill_id": mid, "reason": "; ".join(bad)})
            continue

        rec_flags: list[str] = []
        if v["phi_c"] >= 1:
            rec_flags.append("phi_c >= 1: the outer charge centrifuges - no grinding")
        elif v["phi_c"] > 0.85:
            rec_flags.append(f"phi_c {v['phi_c']:.2f} > 0.85: over-speed; the cataract may impact the liner above the toe")
        if v["fill"] > FILL_FLAG_HI:
            rec_flags.append(f"fill {v['fill']:.0%} > 45%: above the power peak; charge crowding")
        if 0 < v["fill"] < FILL_FLAG_LO:
            rec_flags.append(f"fill {v['fill']:.0%} < 15%: low charge; ball-on-liner impacts")
        if v["ball_top_mm"] / 1000 >= 0.05 * v["diameter_m"]:
            rec_flags.append("large ball/diameter ratio - the (D-d) critical speed matters")
        if rec_flags:
            flagged.append({"mill_id": mid, "flags": rec_flags})

        accepted.append(MillDescriptor(
            mill_id=mid, mill_type=mill_type, diameter_m=v["diameter_m"], length_m=v["length_m"], fill=v["fill"],
            phi_c=v["phi_c"], ball_top_mm=v["ball_top_mm"], charge_density=v["charge_density"], flags=tuple(rec_flags)))
    return ContractReport(accepted=accepted, rejected=rejected, flagged=flagged)


def validate_mill(meta: dict[str, Any]) -> ContractReport:
    """Apply CONTRACT 1 to a single dropped mill operating-point descriptor."""
    return validate_records([meta])
