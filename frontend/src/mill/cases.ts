// ChargeCascade cases by category. The App shows one selected case; Experiments/Benchmark show cross-case summaries.
// The operating points are synthetic but physically realistic (typical SAG/ball/rod mill geometries + speeds), clearly
// labelled; the controls (C-) are exact analytic anchors. This is the source of truth for the cases; the Node bake
// (science/bake_cases.mjs) runs the same engine over it, and data-pipeline/cclab/cases/mill_cases.py mirrors the ids.

import type { MillType, Operating } from './types.ts';

export const CAT_TYPE = 'mill type (the machine)';
export const CAT_SPEED = 'speed sweep (the regime transition)';
export const CAT_FILL = 'fill / charge regime';
export const CAT_CONTROL = 'control (analytic anchor)';

export interface CCCase {
  id: string;
  name: string;
  category: string;
  op: Operating;
  expectedBand: string;
  validationAnchor: string;
  realOrSynthetic: 'synthetic' | 'analytic control';
}

// a typical ball-mill base operating point
const BALL: Operating = {
  millType: 'ball', diameterM: 4.0, lengthM: 6.0, fill: 0.35, phiC: 0.75, ballTopMm: 80,
  liftAngleDeg: 35, chargeDensity: 4.8, oreWi: 14, feedF80um: 2000, prodP80um: 150, tph: 120,
};
const c = (over: Partial<Operating>): Operating => ({ ...BALL, ...over });

// Machine presets for the live mill-type selector. Selecting a type loads that machine's characteristic geometry +
// media + charge density, the fields the engine actually differentiates on (D, L, J, φc, top media, lift, ρc), so
// the critical speed, regime, power and 3D charge all visibly change. Process params (Wi/F80/P80/tph, about the ore
// not the machine) are left to the case selector. The ball/sag/rod values equal the K-* cases (one source of truth);
// AG (autogenous) is the 4th canonical type: no steel media, competent ore lumps are the grinding media (top size
// ~100 mm), so its charge bulk density (~2.7 t/m³) is well below SAG's (~3.0, ore + ~8% steel), giving a distinct,
// lower-power machine. SI: metres, t/m³, mm.
export const MILL_PRESETS: Record<MillType, Pick<Operating, 'diameterM' | 'lengthM' | 'fill' | 'phiC' | 'ballTopMm' | 'liftAngleDeg' | 'chargeDensity'>> = {
  ball: { diameterM: 4.0, lengthM: 6.0, fill: 0.35, phiC: 0.75, ballTopMm: 80, liftAngleDeg: 35, chargeDensity: 4.8 },
  sag: { diameterM: 10.0, lengthM: 5.0, fill: 0.28, phiC: 0.78, ballTopMm: 125, liftAngleDeg: 38, chargeDensity: 3.0 },
  rod: { diameterM: 3.5, lengthM: 5.5, fill: 0.38, phiC: 0.62, ballTopMm: 90, liftAngleDeg: 32, chargeDensity: 5.5 },
  ag: { diameterM: 7.0, lengthM: 4.0, fill: 0.25, phiC: 0.75, ballTopMm: 100, liftAngleDeg: 36, chargeDensity: 2.7 },
};

export const CASES: CCCase[] = [
  {
    id: 'K-BALL', name: 'Ball mill', category: CAT_TYPE, op: BALL,
    expectedBand: 'graded steel balls, L ~ D, cascade + mild cataract at phiC ~ 0.75',
    validationAnchor: 'critical speed 42.3/sqrt(D-d); power within the Hogg-Fuerstenau band', realOrSynthetic: 'synthetic',
  },
  {
    id: 'K-SAG', name: 'SAG mill (large D, short L)', category: CAT_TYPE,
    op: c({ millType: 'sag', diameterM: 10.0, lengthM: 5.0, fill: 0.28, phiC: 0.78, ballTopMm: 125, liftAngleDeg: 38, chargeDensity: 3.0, feedF80um: 100000, prodP80um: 2000, tph: 2000 }),
    expectedBand: 'large diameter "pancake", few large balls + ore as media; cataracting impact at phiC ~ 0.78',
    validationAnchor: 'power scales as D^2.5 (fixed length); high power on the 10 m mill; SAGMILLING/Doll ballpark', realOrSynthetic: 'synthetic',
  },
  {
    id: 'K-ROD', name: 'Rod mill (L > D)', category: CAT_TYPE,
    op: c({ millType: 'rod', diameterM: 3.5, lengthM: 5.5, fill: 0.38, phiC: 0.62, ballTopMm: 90, liftAngleDeg: 32, chargeDensity: 5.5, tph: 80 }),
    expectedBand: 'long mill, rods (line contact), run slow (cascading) so rods do not tangle/break',
    validationAnchor: 'low phiC -> cascading regime; no cataracting', realOrSynthetic: 'synthetic',
  },
  {
    id: 'S-CASCADE', name: 'Cascading (low speed)', category: CAT_SPEED, op: c({ phiC: 0.55 }),
    expectedBand: 'phiC 0.55 -> the charge rolls down the free surface; abrasion grinding',
    validationAnchor: 'regime = cascading; fracCentrifuging = 0', realOrSynthetic: 'synthetic',
  },
  {
    id: 'S-CATARACT', name: 'Cataracting (the sweet spot)', category: CAT_SPEED, op: c({ phiC: 0.78 }),
    expectedBand: 'phiC 0.78 -> outer media thrown in parabolic arcs, impacting the toe; impact breakage',
    validationAnchor: 'regime = cataracting; the power near its peak', realOrSynthetic: 'synthetic',
  },
  {
    id: 'S-CENTRIFUGE', name: 'Centrifuging (over-critical)', category: CAT_SPEED, op: c({ phiC: 1.02 }),
    expectedBand: 'phiC 1.02 -> the outer charge pins to the shell; grinding collapses',
    validationAnchor: 'regime = centrifuging; fracCentrifuging > 0', realOrSynthetic: 'synthetic',
  },
  {
    id: 'D-LOWFILL', name: 'Low fill (J = 0.20)', category: CAT_FILL, op: c({ fill: 0.20 }),
    expectedBand: 'a lightly charged mill; below the power peak',
    validationAnchor: 'power lower than at J = 0.35; ball-on-liner flag possible', realOrSynthetic: 'synthetic',
  },
  {
    id: 'D-HIGHFILL', name: 'High fill (J = 0.42)', category: CAT_FILL, op: c({ fill: 0.42 }),
    expectedBand: 'a heavily charged mill; near/above the power peak (J ~ 0.47)',
    validationAnchor: 'power near the maximum of (J - 1.065 J^2)', realOrSynthetic: 'synthetic',
  },
  {
    id: 'C-CRITICAL', name: 'Critical-speed limit (phiC = 1)', category: CAT_CONTROL, op: c({ phiC: 1.0 }),
    expectedBand: 'phiC = 1: the outer layer just centrifuges (cos(alpha) = 1 at the top)',
    validationAnchor: 'the analytic centrifuging onset, fracCentrifuging > 0 at phiC = 1', realOrSynthetic: 'analytic control',
  },
  {
    id: 'C-EMPTY', name: 'Empty mill (J = 0)', category: CAT_CONTROL, op: c({ fill: 0.0 }),
    expectedBand: 'no charge -> no charge power (the zero-power oracle)',
    validationAnchor: 'Hogg-Fuerstenau power = 0 when J = 0', realOrSynthetic: 'analytic control',
  },
];

const _byId = new Map(CASES.map((x) => [x.id, x]));
export function caseById(id: string): CCCase {
  const x = _byId.get(id);
  if (!x) throw new Error(`unknown case: ${id}. known: ${[...(_byId.keys())].join(', ')}`);
  return x;
}
