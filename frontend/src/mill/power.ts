// Power-draw models (the live readout).
//
// Hogg & Fuerstenau (1972), the net power is the torque to hold the charge's centre of mass offset from the mill
// axis, with all charge rotating rigidly at omega:  P_net = omega * M * g * arm  (transparent torque-arm physics).
//   - M [kg]  = rho_c * (pi R^2 L * J)         the charge mass
//   - omega   = 2*pi*(phiC*Nc)/60              the angular velocity
//   - arm [m] = c_arm * R * sin(alpha) * (1 - 1.065 J)   the CoM horizontal offset; the J*(1-1.065J) -> (J-1.065J^2)
//               shape peaks the power near J ~ 0.47 (the classic "power peaks at ~45-50% fill"). c_arm is CALIBRATED
//               so the reference 4.0 m x 6.0 m ball mill draws ~1.3 MW (industrial ball-mill power); labelled as a
//               calibration, the same honesty posture as ChancaDEM's qualitative-calibrated chamber.
// This makes P ~ rho_c * D^2.5 * L * phiC * (J - 1.065 J^2) * sin(alpha) (first principles: torque ~ rho_c D^3 L J g,
// omega ~ phiC/sqrt(D)  =>  P ~ D^2.5), every slider visibly moves a term.
//
// Bond (1961), W = 10*Wi*(1/sqrt(P80) - 1/sqrt(F80)) [kWh/t] is a process-energy law (the grinding duty), not the
// charge mechanical power; shown only as a cross-check (it has no phiC/J so it cannot animate the sliders).

import { G, omegaRadS, criticalSpeedRpm } from './criticalspeed.ts';

const C_ARM = 0.80; // CoM-offset calibration -> reference 4x6 m ball mill ~1.3 MW

/** charge mass [kg] = rho_c[t/m^3]*1000 * (pi R^2 L * J). */
function chargeMassKg(diameterM: number, lengthM: number, fill: number, chargeDensity: number): number {
  const R = diameterM / 2;
  return chargeDensity * 1000 * (Math.PI * R * R * lengthM) * fill;
}

/** charge mass [t]. */
export function chargeMassT(diameterM: number, lengthM: number, fill: number, chargeDensity: number): number {
  return chargeMassKg(diameterM, lengthM, fill, chargeDensity) / 1000;
}

/** Hogg & Fuerstenau net power [kW] via the torque-arm of the charge centre of mass. */
export function hoggFuerstenauKw(diameterM: number, lengthM: number, chargeDensity: number, phiC: number, fill: number, liftAngleDeg: number): number {
  if (fill <= 0) return 0;
  const R = diameterM / 2;
  const omega = omegaRadS(phiC, criticalSpeedRpm(diameterM, 0)); // omega from the bulk critical speed
  const M = chargeMassKg(diameterM, lengthM, fill, chargeDensity);
  const arm = C_ARM * R * Math.sin((liftAngleDeg * Math.PI) / 180) * Math.max(0, 1 - 1.065 * fill);
  return (omega * M * G * arm) / 1000; // kW
}

/** Morrell-FORM (calibrated): the same torque-arm with a charge-shape lift angle from the toe/shoulder geometry. */
export function morrellFormKw(diameterM: number, lengthM: number, chargeDensity: number, phiC: number, fill: number, shoulderDeg: number, toeDeg: number): number {
  if (fill <= 0) return 0;
  // a charge-shape effective lift angle from the shoulder + the (folded) toe, bounded to a physical 25-45 deg
  const span = Math.min(45, Math.max(25, 0.5 * (shoulderDeg + Math.min(60, Math.abs(toeDeg - 90)))));
  // 1.06x so the Morrell-form sits just above Hogg-Fuerstenau on typical mills (its continuum charge shape draws a bit more)
  return 1.06 * hoggFuerstenauKw(diameterM, lengthM, chargeDensity, phiC, fill, span);
}

/** Bond specific energy [kWh/t]. */
export function bondWKwhT(oreWi: number, feedF80um: number, prodP80um: number): number {
  if (!(prodP80um > 0) || !(feedF80um > 0)) return 0;
  return 10 * oreWi * (1 / Math.sqrt(prodP80um) - 1 / Math.sqrt(feedF80um));
}
