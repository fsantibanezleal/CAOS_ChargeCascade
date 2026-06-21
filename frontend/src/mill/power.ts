// Power-draw models (the live readout).
//
// Hogg & Fuerstenau (1972) — the torque-arm of the charge centre of mass, all charge rotating as a rigid body. The
// widely-used metric net-power form (Moly-Cop / sagmilling):
//   Pnet = 0.238 * D^3.5 * L * rho_c * phiC * (J - 1.065 J^2) * sin(alpha)   [kW]
// with D,L [m], rho_c [t/m^3]; the (J - 1.065 J^2) factor peaks the power near J ~ 0.47 (the classic "power peaks at
// ~45-50% fill"); alpha is the dynamic charge lift/repose angle (~30-40 deg). The D^3.5 = (mass ~ D^2 L)(arm ~ D)
// (rim speed ~ sqrt(D)). This is the closed-form live readout — every slider moves a term.
//
// Morrell (1996) C-model — the SOTA continuum model (cylinder+cone between the toe + shoulder, slurry phase, +/-9.8%
// on 82 data sets). The exact toe/shoulder coefficients are behind the JKMRC monograph; here we ship a transparent
// Morrell-FORM (a charge-shape lift angle derived from the toe/shoulder geometry), CALIBRATED to give sensible power,
// labelled honestly (the same posture as ChancaDEM's calibrated chamber). It is the second, charge-shape-consistent
// readout, NOT the proprietary coefficients.
//
// Bond (1961) — W = 10*Wi*(1/sqrt(P80) - 1/sqrt(F80)) [kWh/t] is a process-ENERGY law (the grinding duty), NOT the
// charge mechanical power; shown only as a cross-check (it has no phiC/J, so it cannot animate the sliders).

const HF_CONST = 0.238;

/** Hogg & Fuerstenau net power [kW]. */
export function hoggFuerstenauKw(diameterM: number, lengthM: number, chargeDensity: number, phiC: number, fill: number, liftAngleDeg: number): number {
  const offset = fill - 1.065 * fill * fill; // CoM offset vs fill, peaks ~J=0.47
  return HF_CONST * Math.pow(diameterM, 3.5) * lengthM * chargeDensity * phiC * Math.max(0, offset) * Math.sin((liftAngleDeg * Math.PI) / 180);
}

/** Morrell-FORM (calibrated): the same torque-arm but with a charge-shape lift angle from the toe/shoulder geometry. */
export function morrellFormKw(diameterM: number, lengthM: number, chargeDensity: number, phiC: number, fill: number, shoulderDeg: number, toeDeg: number): number {
  // a charge-shape effective lift angle: the midpoint between the shoulder and the (folded) toe, bounded to ~25-45 deg
  const span = Math.min(45, Math.max(25, 0.5 * (shoulderDeg + Math.min(60, toeDeg - 90))));
  const offset = fill - 1.065 * fill * fill;
  // a small calibration multiplier so the Morrell-form sits within Hogg-Fuerstenau's band on typical mills
  return 1.06 * HF_CONST * Math.pow(diameterM, 3.5) * lengthM * chargeDensity * phiC * Math.max(0, offset) * Math.sin((span * Math.PI) / 180);
}

/** Bond specific energy [kWh/t]. */
export function bondWKwhT(oreWi: number, feedF80um: number, prodP80um: number): number {
  if (!(prodP80um > 0) || !(feedF80um > 0)) return 0;
  return 10 * oreWi * (1 / Math.sqrt(prodP80um) - 1 / Math.sqrt(feedF80um));
}

/** charge mass [t] = rho_c * (mill volume * J). */
export function chargeMassT(diameterM: number, lengthM: number, fill: number, chargeDensity: number): number {
  const R = diameterM / 2;
  return chargeDensity * (Math.PI * R * R * lengthM) * fill;
}
