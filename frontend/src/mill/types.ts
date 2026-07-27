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
  // --- Morrell C-model geometry + density-convention controls (Unit 2, optional) ---
  coneLengthM?: number;      // L_d, cone axial length for a real SAG/AG cone (0/undefined = flat-ended)
  trunnionRadiusM?: number;  // r_t, trunnion radius (only used with the explicit cone term)
  voidageE?: number;         // E, static charge porosity (default 0.4)
  voidFillU?: number;        // U, void-slurry fill fraction (default 1.0)
  slurrySolidsS?: number;    // S, slurry volumetric solids fraction (default 0.5)
  dischargeType?: 'grate' | 'dry' | 'overflow'; // overflow adds the slurry-pool term (default grate)
  dynamicVoidage?: boolean;  // use Golpayegani & Rezai (2023) speed/fill voidage (default off)
  // --- Two-filling charge composition (v0.27). OPTIONAL and additive ------------------------------
  // When `ballFill` is given, `chargeDensity` is DERIVED from the composition via the Hogg & Fuerstenau
  // (1972) apparent-density relation instead of being taken as the user's lumped number. Leaving these
  // undefined preserves the previous single-density behaviour exactly, so no existing case changes.
  ballFill?: number;         // Jb, fractional mill filling BY STEEL BALLS (0..fill). Jb = 0 is an AG mill.
  ballDensity?: number;      // rho_b, steel ball density [t/m^3], ~7.8 forged steel
  slurryDensity?: number;    // rho_p, slurry / pulp density [t/m^3]
  mediaVoidage?: number;     // phi, grinding-media voidage (default 0.40 static)
  interstitialSlurryFill?: number; // Jp, fraction of ball-charge voids holding slurry (default 1.0)
  // --- Lifter bars (v0.27). OPTIONAL and additive -------------------------------------------------
  // When `lifterHeightM` is given, the shoulder comes from the Vermeulen (1985) sliding-departure model
  // instead of the bare-shell Davis angle. Undefined = no lifters modelled = previous behaviour.
  lifterCount?: number;      // number of lifter bars around the shell (affects the 3D view + wear, not the departure of a single element)
  lifterHeightM?: number;    // h, lifter bar height [m]; standard is ~70% of a new media DIAMETER
  lifterWidthM?: number;     // d, lifter bar width [m]; standard is ~1 media diameter
  frictionMu?: number;       // mu, sliding friction between element and bar. Vermeulen's best film fit was 0.
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
  lifterLiftDeg: number;       // lift the modelled lifter bars add over the bare-shell Davis shoulder [deg]; 0 when no liner is modelled
  lifterGoverned: boolean;     // true when the liner governed the departure (held the element past the Davis angle)
  chargeDensityUsed: number;   // rho_c actually used [t/m^3]: derived from the two-filling composition when given, else the lumped input
  toeDeg: number;              // toe angle [deg]
  regime: Regime;
  fracCentrifuging: number;    // fraction of shells that centrifuge (0..1)
  cascadeCataractPhiC: number; // the cascade<->cataract band edge
  phfKw: number;               // Hogg & Fuerstenau net power [kW]
  pMorrellKw: number;          // Morrell-form (calibrated) net power [kW]
  pCModelNetKw: number;        // Morrell (1996) C-model net charge-motion power [kW] (independent, uncalibrated)
  pCModelGrossKw: number;      // Morrell C-model gross power (motor input = no-load + k*net) [kW]
  pCModelNoLoadKw: number;     // Morrell C-model no-load power [kW]
  smcWkWhT: number;            // Morrell (2004) SMC total circuit specific energy [kWh/t]
  smcTphFromCModel: number;    // implied throughput from the C-model gross power / SMC specific energy [t/h]
  bondWKwhT: number;           // Bond specific energy [kWh/t]
  bondPowerKw: number;         // implied power for the throughput [kW]
  powerCurve: PowerPoint[];    // power vs phiC at the current J,D,L
  chargeMassT: number;         // charge mass [t]
  flags: string[];
}
