// The typed mill operating point + result for the tumbling-mill physics engine. A tumbling mill is a rotating
// cylinder; the charge (grinding media + ore) is lifted by the shell and falls back, breaking the ore. HOW it moves
// (cascading / cataracting / centrifuging) and how much power it draws depend on the fraction of critical speed phiC
// and the fill J. Everything downstream (the 3D charge cloud, the regime, the power curve) is computed from one
// Operating point, the same structure the browser renders and the Node bake / offline surrogate read (the ChancaDEM
// `engine.ts` pattern). All SI: metres, t/m^3, kW.

export type MillType = 'rod' | 'ball' | 'sag' | 'ag';
export type Regime = 'slumping' | 'cascading' | 'cataracting' | 'centrifuging';

/** One mill operating point (CONTRACT-1 mirror). */
export interface Operating {
  millType: MillType;
  diameterM: number;     // D, internal diameter inside the liners
  lengthM: number;       // L, effective grinding length
  fill: number;          // J, fractional charge filling (0..0.6)
  phiC: number;          // fraction of critical speed (the headline slider), N/Nc
  ballTopMm: number;     // top media (ball) size, affects Nc + the per-shell departure
  liftAngleDeg: number;  // dynamic charge lift / repose angle (the Hogg-Fuerstenau alpha), ~30-40 deg
  chargeDensity: number; // rho_c, in-mill charge bulk density [t/m^3]
  oreWi: number;         // Bond ball-mill work index [kWh/t] (for the process-energy cross-check)
  feedF80um: number;     // F80 feed 80%-passing [micron]
  prodP80um: number;     // P80 product 80%-passing [micron]
  tph: number;           // throughput [t/h] (for the Bond implied power)
}

/** one radial shell of the charge: its departure angle + the cataract trajectory it flies. */
export interface Shell {
  r: number;                       // radius of the shell [m]
  alpha: number;                   // departure angle from the vertical-through-centre [rad]; NaN if centrifuging
  centrifuging: boolean;
  departure: [number, number];     // (x,y) departure point in the mill cross-section [m]
  trajectory: [number, number][];  // sampled parabolic free-flight points (x,y) [m]
}

export interface PowerPoint { phiC: number; phf: number; morrell: number; cModel: number | null; }

/** the full result of evaluating one Operating point (CONTRACT-2 mirror). */
export interface MillResult {
  ncRpm: number;               // critical speed [rpm]
  nRpm: number;                // actual speed = phiC * Nc [rpm]
  omega: number;               // angular velocity [rad/s]
  rMaxM: number;               // outer reachable shell radius [m]
  shells: Shell[];
  shoulderDeg: number;         // outer-layer departure (shoulder) angle [deg from vertical]
  toeDeg: number;              // toe angle [deg]
  regime: Regime;
  fracCentrifuging: number;    // fraction of shells that centrifuge (0..1)
  cascadeCataractPhiC: number; // the cascade<->cataract band edge
  phfKw: number;               // Hogg & Fuerstenau net power [kW]
  pMorrellKw: number;          // Morrell-form (calibrated) net power [kW]
  pCModelNetKw: number;        // Morrell (1996) C-model net charge-motion power [kW] (independent, uncalibrated)
  pCModelGrossKw: number;      // Morrell C-model gross power (motor input = no-load + k*net) [kW]
  pCModelNoLoadKw: number;     // Morrell C-model no-load power [kW]
  bondWKwhT: number;           // Bond specific energy [kWh/t]
  bondPowerKw: number;         // implied power for the throughput [kW]
  powerCurve: PowerPoint[];    // power vs phiC at the current J,D,L
  chargeMassT: number;         // charge mass [t]
  flags: string[];
}
