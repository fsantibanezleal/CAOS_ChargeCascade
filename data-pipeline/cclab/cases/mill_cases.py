"""ChargeCascade cases spanning CATEGORIES. The App shows ONE selected case; Experiments/Benchmark show cross-case
summaries by category. The cases MIRROR the SPA's frontend/src/mill/cases.ts (ids + metadata kept in lock-step; a test
cross-checks them against the baked case-results.json). The operating points are SYNTHETIC but physically realistic
(typical SAG/ball/rod mill geometries + speeds), clearly labelled; the controls (C-) are exact analytic anchors."""
from __future__ import annotations

from dataclasses import dataclass

CAT_TYPE = "mill type (the machine)"
CAT_SPEED = "speed sweep (the regime transition)"
CAT_FILL = "fill / charge regime"
CAT_CONTROL = "control (analytic anchor)"


@dataclass(frozen=True)
class Case:
    id: str                  # matches frontend/src/mill/cases.ts
    name: str
    category: str
    mill_type: str
    diameter_m: float
    length_m: float
    fill: float
    phi_c: float
    ball_top_mm: float
    charge_density: float
    expected_band: str = ""
    validation_anchor: str = ""
    real_or_synthetic: str = "synthetic"


# a typical ball-mill base
def _ball(**over) -> dict:
    base = dict(mill_type="ball", diameter_m=4.0, length_m=6.0, fill=0.35, phi_c=0.75, ball_top_mm=80.0, charge_density=4.8)
    base.update(over)
    return base


CASES: list[Case] = [
    Case("K-BALL", "Ball mill", CAT_TYPE, **_ball(),
         expected_band="graded steel balls, L ~ D, cascade + mild cataract at phiC ~ 0.75",
         validation_anchor="critical speed 42.3/sqrt(D-d); power within the Hogg-Fuerstenau band"),
    Case("K-SAG", "SAG mill (large D, short L)", CAT_TYPE,
         **_ball(mill_type="sag", diameter_m=10.0, length_m=5.0, fill=0.28, phi_c=0.78, ball_top_mm=125.0, charge_density=3.0),
         expected_band="large 'pancake', few large balls + ore as media; cataracting at phiC ~ 0.78",
         validation_anchor="power scales as D^2.5 (fixed length); SAGMILLING/Doll ballpark"),
    Case("K-ROD", "Rod mill (L > D)", CAT_TYPE,
         **_ball(mill_type="rod", diameter_m=3.5, length_m=5.5, fill=0.38, phi_c=0.62, ball_top_mm=90.0, charge_density=5.5),
         expected_band="long mill, rods (line contact), run SLOW (cascading) so rods do not break",
         validation_anchor="low phiC -> cascading regime; no cataracting"),
    Case("S-CASCADE", "Cascading (low speed)", CAT_SPEED, **_ball(phi_c=0.55),
         expected_band="phiC 0.55 -> the charge rolls down the free surface; abrasion grinding",
         validation_anchor="regime = cascading; fracCentrifuging = 0"),
    Case("S-CATARACT", "Cataracting (the sweet spot)", CAT_SPEED, **_ball(phi_c=0.78),
         expected_band="phiC 0.78 -> media thrown in parabolic arcs, impacting the toe; impact breakage",
         validation_anchor="regime = cataracting; power near its peak"),
    Case("S-CENTRIFUGE", "Centrifuging (over-critical)", CAT_SPEED, **_ball(phi_c=1.02),
         expected_band="phiC 1.02 -> the outer charge pins to the shell; grinding collapses",
         validation_anchor="regime = centrifuging; fracCentrifuging > 0"),
    Case("D-LOWFILL", "Low fill (J = 0.20)", CAT_FILL, **_ball(fill=0.20),
         expected_band="a lightly charged mill; below the power peak",
         validation_anchor="power lower than at J = 0.35"),
    Case("D-HIGHFILL", "High fill (J = 0.42)", CAT_FILL, **_ball(fill=0.42),
         expected_band="a heavily charged mill; near the power peak (J ~ 0.47)",
         validation_anchor="power near the maximum of (J - 1.065 J^2)"),
    Case("C-CRITICAL", "Critical-speed limit (phiC = 1)", CAT_CONTROL, **_ball(phi_c=1.0),
         expected_band="phiC = 1: the outer layer just centrifuges (cos(alpha)=1 at the top)",
         validation_anchor="the analytic centrifuging onset - fracCentrifuging > 0 at phiC = 1",
         real_or_synthetic="analytic control"),
    Case("C-EMPTY", "Empty mill (J = 0)", CAT_CONTROL, **_ball(fill=0.0),
         expected_band="no charge -> no charge power (the zero-power oracle)",
         validation_anchor="Hogg-Fuerstenau power = 0 when J = 0", real_or_synthetic="analytic control"),
]


def descriptor_row(c: Case) -> dict:
    """The CONTRACT-1 mill operating-point row for a case (used by the pipeline's contract check)."""
    return {"mill_id": c.id, "mill_type": c.mill_type, "diameter_m": c.diameter_m, "length_m": c.length_m,
            "fill": c.fill, "phi_c": c.phi_c, "ball_top_mm": c.ball_top_mm, "charge_density": c.charge_density}
