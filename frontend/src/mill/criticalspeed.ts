// Critical speed, the master scaling. Centrifuging of the outer layer (the ball pinned to the shell at the top)
// begins when the centripetal requirement at the top equals gravity: m omega^2 R = m g => omega_c = sqrt(g/R). In
// rpm with the finite-ball correction (the ball CENTRE rides at radius (D-d)/2):
//   Nc = (60/2pi) * sqrt(2g) / sqrt(D-d) = 42.305 / sqrt(D - d)   [rpm, D & d in metres]   (Wills & Finch; Gupta & Yan)
// The constant 42.3 is DERIVED (60/2pi * sqrt(2*9.81)), not fitted. The fraction of critical speed phiC = N/Nc is the
// headline slider; real mills run phiC ~ 0.65-0.82.

export const G = 9.81; // m/s^2

/** critical speed [rpm]; ballTopMm = the top media size (the layer that centrifuges first sets the limit). */
export function criticalSpeedRpm(diameterM: number, ballTopMm: number): number {
  const d = ballTopMm / 1000;
  return 42.305 / Math.sqrt(Math.max(1e-6, diameterM - d));
}

/** actual rotational speed [rpm] = phiC * Nc. */
export function speedRpm(phiC: number, ncRpm: number): number {
  return phiC * ncRpm;
}

/** angular velocity [rad/s] from phiC + Nc. */
export function omegaRadS(phiC: number, ncRpm: number): number {
  return (2 * Math.PI * speedRpm(phiC, ncRpm)) / 60;
}
