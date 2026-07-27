// The ChargeCascade mill physics engine barrel, dependency-free TypeScript, runs LIVE in the browser AND in the Node
// bake (under tsx). Tumbling-mill charge motion (Davis trajectories) + the regimes + the power draw (Hogg-Fuerstenau /
// Morrell / Bond). The analytic engine is the authority; the learned surrogate (commit 4b) emulates it and is measured
// downstream. Mirrors ChancaDEM's `physics/` + CutoffGrade's `lane/`.

export * from './types.ts';
export { G, criticalSpeedRpm, speedRpm, omegaRadS } from './criticalspeed.ts';
export { chargeGeometry } from './charge.ts';
export type { ChargeGeometry } from './charge.ts';
export { classifyRegime, CASCADE_CATARACT_PHIC, CATARACT_CENTRIFUGE_PHIC } from './regime.ts';
export { hoggFuerstenauKw, morrellFormKw, bondWKwhT, chargeMassT } from './power.ts';
export { evaluate } from './engine.ts';
export { CASES, caseById, CAT_TYPE, CAT_SPEED, CAT_FILL, CAT_CONTROL, MILL_PRESETS } from './cases.ts';
export type { CCCase } from './cases.ts';
export { solvePhiCForPower, solvePhiCForCapacity, recommendPhiCForRegime, PHI_LO, PHI_HI } from './inverse.ts';
export type { PowerSolve, CapacitySolve, RegimeSolve } from './inverse.ts';
export { validateMill, MILL_TYPES } from './contract.ts';
export type { MillInput, ContractResult } from './contract.ts';
export { apparentChargeDensity, ballFractionOfCharge, STATIC_MEDIA_VOIDAGE } from './density.ts';
export type { ChargeComposition } from './density.ts';
export { lifterDeparture, equilibriumPoint } from './lifter.ts';
export type { LifterGeometry, LifterDeparture } from './lifter.ts';
export { LiveDem } from './livedem.ts';
export type { LiveDemConfig, LiveDemStats } from './livedem.ts';
