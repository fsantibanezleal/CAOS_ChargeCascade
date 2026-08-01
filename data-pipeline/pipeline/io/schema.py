"""Typed objects passed between pipeline stages, the inter-stage contract. Plain dataclasses (no heavy deps)."""
from __future__ import annotations

from dataclasses import dataclass

# the case CATEGORIES (mirrors frontend/src/mill/cases.ts)
CATEGORIES = (
    "mill type (the machine)",
    "speed sweep (the regime transition)",
    "fill / charge regime",
    "control (analytic anchor)",
)


@dataclass(frozen=True)
class MillDescriptor:
    """One validated tumbling-mill operating point (CONTRACT 1 output). A mill is a rotating cylinder; the charge
    (grinding media + ore) is lifted and falls, breaking the ore. The charge motion (cascading / cataracting /
    centrifuging) and the power draw follow from the geometry (diameter, length), the fill J, the fraction of critical
    speed phiC and the media size. For the cases the result is regenerated from this descriptor by the TypeScript
    engine (frontend/src/mill/)."""

    mill_id: str
    mill_type: str         # rod | ball | sag | ag
    diameter_m: float
    length_m: float
    fill: float            # J
    phi_c: float           # fraction of critical speed
    ball_top_mm: float
    charge_density: float  # t/m^3
    flags: tuple[str, ...] = ()
