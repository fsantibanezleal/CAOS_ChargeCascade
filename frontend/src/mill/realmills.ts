// The REAL industrial mill anchor set (issue #45): 11 verified mills with MEASURED power draw, each row read from
// a resolving open source (Alex Doll's sagmilling.com survey compilations, IMPC 2016 / Procemin 2013; and the
// open-access Golpayegani & Rezai 2022 PPMP review reproducing Rajamani et al. 2019). This is the ground truth the
// power model is validated against: the App's Real-sample lane runs the SAME engine on these mills and reports the
// real per-mill error vs the measured value. Provenance + caveats are persisted in CAOS_MANAGE
// wip/mining-analytics-hub/products/chargecascade/real-anchor-set-2026-07-11.md.
//
// POWER BASIS matters and differs by source, so each mill carries it and the comparison is made on that basis:
//   'motor' (Doll PDCS, measured at the DCS = motor input) -> compare to the model GROSS power.
//   'net'   (PPMP net power)                                -> compare to the model NET power.

import type { MillType, Operating } from './types.ts';

export type PowerBasis = 'motor' | 'net';

export interface RealMill {
  id: string;
  name: string;
  type: MillType;
  diameterM: number;      // inside liners
  lengthM: number;        // EGL / belly
  pctCritical: number;    // fraction of critical speed (0..1)
  jTotal: number;         // total fractional filling
  jBalls: number;         // ball fractional filling (0 for AG)
  rhoOre: number;         // ore/rock density used by the source [t/m3]
  measuredKw: number;     // MEASURED power draw [kW]
  basis: PowerBasis;      // the basis of measuredKw
  citation: string;
  url: string;
  note: string;           // the binding caveat from the source (assumed values, ranges, conversions)
}

export const REAL_MILLS: RealMill[] = [
  { id: 'cadia', name: 'Cadia Hill 40 ft SAG', type: 'sag', diameterM: 12.02, lengthM: 6.1, pctCritical: 0.78, jTotal: 0.33, jBalls: 0.14, rhoOre: 2.9, measuredKw: 19320, basis: 'motor',
    citation: 'Doll (2016) IMPC 2016 Paper 123, Table 1 row 27 (survey: Dunne et al. 2001, SAG 2001)', url: 'https://sagmilling.com/articles/29/view/IMPC2016-AlexDoll-SAG%20data%20set.pdf', note: 'PDCS (motor); Pshell 18,547 kW via 0.96. wC 0.70 assumed in source.' },
  { id: 'meadowbank', name: 'Meadowbank SAG', type: 'sag', diameterM: 7.7, lengthM: 3.35, pctCritical: 0.75, jTotal: 0.226, jBalls: 0.135, rhoOre: 2.9, measuredKw: 3374, basis: 'motor',
    citation: 'Doll (2013) Procemin 2013, Table 1 row 1 (survey: Muteb & Allaire 2013, 45th CMP)', url: 'https://sagmilling.com/articles/20/view/Procemin2013-AlexDoll-SAGPowerModels.pdf', note: 'PDCS 3,374 kW; 3,190 kW at shell (0.9456). 11.44 rpm.' },
  { id: 'fimiston', name: 'Fimiston KCGM SAG', type: 'sag', diameterM: 10.8, lengthM: 4.42, pctCritical: 0.725, jTotal: 0.216, jBalls: 0.13, rhoOre: 2.9, measuredKw: 9255, basis: 'motor',
    citation: 'Doll (2016) IMPC 2016, Table 1 row 8 (survey: Nelson, Valery & Morrell 1996, SAG 1996)', url: 'https://sagmilling.com/articles/29/view/IMPC2016-AlexDoll-SAG%20data%20set.pdf', note: 'PDCS basis; shell conversion 0.9456. One of 7 Fimiston surveys on this mill.' },
  { id: 'yanacocha', name: 'Yanacocha single-stage SAG', type: 'sag', diameterM: 9.4, lengthM: 9.76, pctCritical: 0.645, jTotal: 0.179, jBalls: 0.165, rhoOre: 2.9, measuredKw: 12286, basis: 'motor',
    citation: 'Doll (2016) IMPC 2016, Table 1 row 17 (survey: Burger et al. 2011, SAG 2011)', url: 'https://sagmilling.com/articles/29/view/IMPC2016-AlexDoll-SAG%20data%20set.pdf', note: 'Low-aspect (D/L<1); gearless, conversion 1.0000 so PDCS = Pshell.' },
  { id: 'lkab-ka2', name: 'LKAB KA2 autogenous', type: 'ag', diameterM: 6.28, lengthM: 5.3, pctCritical: 0.753, jTotal: 0.305, jBalls: 0.0, rhoOre: 3.75, measuredKw: 2800, basis: 'motor',
    citation: 'Doll (2016) IMPC 2016, Table 1 row 19 (survey: Bueno et al. 2011, SAG 2011)', url: 'https://sagmilling.com/articles/29/view/IMPC2016-AlexDoll-SAG%20data%20set.pdf', note: 'Magnetite AG; ore density 3.75 assumed (30/70 silicate/iron). Shell 2,648 kW (0.9456).' },
  { id: 'porgera', name: 'Porgera SAG', type: 'sag', diameterM: 8.38, lengthM: 3.35, pctCritical: 0.782, jTotal: 0.263, jBalls: 0.11, rhoOre: 2.9, measuredKw: 4550, basis: 'motor',
    citation: 'Doll (2016) IMPC 2016, Table 1 row 21 (survey: Grundstrom et al. 2001, SAG 2001)', url: 'https://sagmilling.com/articles/29/view/IMPC2016-AlexDoll-SAG%20data%20set.pdf', note: 'One of 6 Porgera surveys. wC 0.75 and 0.9267 conversion assumed in source.' },
  { id: 'losbronces', name: 'Los Bronces Confluencia SAG', type: 'sag', diameterM: 12.2, lengthM: 6.9, pctCritical: 0.723, jTotal: 0.27, jBalls: 0.14, rhoOre: 2.9, measuredKw: 18812, basis: 'motor',
    citation: 'Doll (2016) IMPC 2016, Table 1 row 37 (survey: Jordan et al. 2014, XXVII IMPC)', url: 'https://sagmilling.com/articles/29/view/IMPC2016-AlexDoll-SAG%20data%20set.pdf', note: 'Gearless, conversion 1.0000. 12.20 m diameter is an assumed value in Doll table.' },
  { id: 'clarabelle', name: 'Inco Clarabelle AG', type: 'ag', diameterM: 9.45, lengthM: 3.96, pctCritical: 0.776, jTotal: 0.425, jBalls: 0.0, rhoOre: 2.9, measuredKw: 5720, basis: 'motor',
    citation: 'Doll (2016) IMPC 2016, Table 1 row 38 (survey: McDonald & Strong 1992, SME 92-202)', url: 'https://sagmilling.com/articles/29/view/IMPC2016-AlexDoll-SAG%20data%20set.pdf', note: 'High-filling AG (Jt 42.5%). Drive conversion 0.9014.' },
  { id: 'constancia-sag', name: 'Constancia SAG', type: 'sag', diameterM: 10.97, lengthM: 8.08, pctCritical: 0.72, jTotal: 0.26, jBalls: 0.12, rhoOre: 2.9, measuredKw: 13700, basis: 'net',
    citation: 'Golpayegani & Rezai (2022) PPMP 58(4):151600, Table 1 (repro. Rajamani et al. 2019)', url: 'https://doi.org/10.37190/ppmp/151600', note: 'NET power, reported as a RANGE 13.7-15.7 MW; this is the lower bound. Jb not stated (assumed 0.12). Nominal ft dims.' },
  { id: 'constancia-ball', name: 'Constancia ball mill', type: 'ball', diameterM: 7.92, lengthM: 12.34, pctCritical: 0.74, jTotal: 0.32, jBalls: 0.32, rhoOre: 2.9, measuredKw: 13400, basis: 'net',
    citation: 'Golpayegani & Rezai (2022) PPMP 58(4):151600, Table 1 (repro. Rajamani et al. 2019)', url: 'https://doi.org/10.37190/ppmp/151600', note: 'NET power 13.4 MW. Ball mill: charge is balls (+ slurry). Nominal ft dims.' },
  { id: 'tongon', name: 'Tongon ball mill', type: 'ball', diameterM: 6.1, lengthM: 9.75, pctCritical: 0.75, jTotal: 0.33, jBalls: 0.33, rhoOre: 2.9, measuredKw: 8000, basis: 'net',
    citation: 'Golpayegani & Rezai (2022) PPMP 58(4):151600, Table 1 (repro. Rajamani et al. 2019)', url: 'https://doi.org/10.37190/ppmp/151600', note: 'NET power 8 MW (one sig-fig less precise). Nominal ft dims.' },
];

/** Morrell total charge bulk density [t/m3] from the filling split (eps=0.4 voidage, U=1 slurry-filled voids,
 *  rho_pulp from a nominal 72% solids). The same formula the Morrell density section uses. */
export function chargeBulkDensity(m: RealMill): number {
  const eps = 0.4, U = 1.0, rhoBall = 7.85;
  const Cw = 0.72;
  const rhoPulp = 1 / (Cw / m.rhoOre + (1 - Cw) / 1.0);
  const Jt = m.jTotal, Jb = m.jBalls;
  return (m.rhoOre * (Jt - Jb) * (1 - eps) + rhoBall * Jb * (1 - eps) + rhoPulp * (Jt * eps * U)) / Jt;
}

/** Map a real mill to an engine Operating point. Power-relevant fields (D, L, J, phiC, charge density, lift
 *  angle) come from the survey; the process fields (Wi, F80, P80, tph) are nominal placeholders (they drive only
 *  the Bond process-energy cross-check, not the charge-motion power). */
export function realMillToOperating(m: RealMill): Operating {
  const ballTop = m.type === 'sag' ? 125 : m.type === 'ball' ? 80 : 90;
  return {
    millType: m.type,
    diameterM: m.diameterM,
    lengthM: m.lengthM,
    fill: m.jTotal,
    phiC: m.pctCritical,
    ballTopMm: ballTop,
    liftAngleDeg: m.type === 'sag' || m.type === 'ag' ? 38 : 35,
    chargeDensity: chargeBulkDensity(m),
    oreWi: 14,
    feedF80um: m.type === 'ball' ? 2000 : 100000,
    prodP80um: m.type === 'ball' ? 150 : 2000,
    tph: 1000,
  };
}
