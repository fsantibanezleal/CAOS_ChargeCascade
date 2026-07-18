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
  // --- distinct-geometry expansion (issue #64): 11 more verified mills from the full Doll IMPC 2016 Table 1,
  // each a different mill (not a repeat survey), keyed by geometry + Doll row + original survey. NOTE: the OCR of
  // the table shifted some mine-NAME labels by a line; the geometry + power + fill are read-verified, the name is
  // per Doll's row and carries that small shift risk. All motor (PDCS) basis. ---
  { id: 'phoenix-sag', name: "Phoenix SAG", type: 'sag', diameterM: 10.74, lengthM: 5.03, pctCritical: 0.74, jTotal: 0.3, jBalls: 0.13, rhoOre: 2.7, measuredKw: 10965, basis: 'motor',
    citation: "Doll (2016) IMPC 2016 Table 1 row 15 (Phoenix SAG)", url: "https://sagmilling.com/articles/29/view/IMPC2016-AlexDoll-SAG%20data%20set.pdf", note: "Row 15. 10.74/5.03/0.300/0.130/0.740; rho 2.70 wC 0.75; PDCS 10,965 x conv 1.0000 = Pshell 10,965 (gearless / DCS at shell)." },
  { id: 'lkab-ka3-fag', name: "LKAB KA3 (FAG)", type: 'ag', diameterM: 6.29, lengthM: 5.88, pctCritical: 0.753, jTotal: 0.414, jBalls: 0.0, rhoOre: 4.33, measuredKw: 3857, basis: 'motor',
    citation: "Doll (2016) IMPC 2016 Table 1 row 20 (LKAB KA3 (FAG))", url: "https://sagmilling.com/articles/29/view/IMPC2016-AlexDoll-SAG%20data%20set.pdf", note: "Row 20. 6.29/5.88/0.414/0.000/0.753; rho_charge 4.33 (high, atypical high charge case per paper) wC 0.76; PDCS 3,857 x 0.9456 = 3,647. Fully autogenou" },
  { id: 'driefontein-rom-sag', name: "Driefontein RoM SAG", type: 'sag', diameterM: 7.45, lengthM: 9.25, pctCritical: 0.76, jTotal: 0.37, jBalls: 0.08, rhoOre: 2.7, measuredKw: 7400, basis: 'motor',
    citation: "Doll (2016) IMPC 2016 Table 1 row 31 (Driefontein RoM SAG)", url: "https://sagmilling.com/articles/29/view/IMPC2016-AlexDoll-SAG%20data%20set.pdf", note: "Row 31. 7.45/9.25/0.370/0.080/0.760; rho 2.70 wC 0.70; PDCS 7,400 x 0.9310 = 6,889. Low-aspect (L>D) run-of-mine SAG." },
  { id: 'st-ives-sag-sec-crush', name: "St Ives SAG (sec crush)", type: 'sag', diameterM: 7.23, lengthM: 3, pctCritical: 0.749, jTotal: 0.191, jBalls: 0.15, rhoOre: 2.8, measuredKw: 2710, basis: 'motor',
    citation: "Doll (2016) IMPC 2016 Table 1 row 32 (St Ives SAG (sec crush))", url: "https://sagmilling.com/articles/29/view/IMPC2016-AlexDoll-SAG%20data%20set.pdf", note: "Row 32. 7.23/3.00/0.191/0.150/0.749; rho 2.80 wC 0.70; PDCS 2,710 x 0.9310 = 2,523. Secondary-crush feed mode." },
  { id: 'navachab-sag', name: "Navachab SAG", type: 'sag', diameterM: 4.71, lengthM: 9.49, pctCritical: 0.889, jTotal: 0.4, jBalls: 0.097, rhoOre: 2.84, measuredKw: 3034, basis: 'motor',
    citation: "Doll (2016) IMPC 2016 Table 1 row 35 (Navachab SAG)", url: "https://sagmilling.com/articles/29/view/IMPC2016-AlexDoll-SAG%20data%20set.pdf", note: "Row 35. 4.71/9.49/0.400/0.097/0.889; rho 2.84 wC 0.73; PDCS 3,034 x 0.9310 = 2,825. Very low-aspect (L~2D), high mill speed (0.889)." },
  { id: 'los-bronces-sag-1', name: "Los Bronces SAG 1", type: 'sag', diameterM: 8.26, lengthM: 4.19, pctCritical: 0.747, jTotal: 0.237, jBalls: 0.127, rhoOre: 2.59, measuredKw: 3917, basis: 'motor',
    citation: "Doll (2016) IMPC 2016 Table 1 row 36 (Los Bronces SAG 1)", url: "https://sagmilling.com/articles/29/view/IMPC2016-AlexDoll-SAG%20data%20set.pdf", note: "Row 36. 8.26/4.19/0.237/0.127/0.747; rho 2.59 wC 0.65; PDCS 3,917 x 0.9361 = 3,667. Distinct from row 37 LB Confluencia (different mill, D=12.20)." },
  { id: 'inco-clarabelle-sag', name: "Inco Clarabelle SAG", type: 'sag', diameterM: 9.45, lengthM: 3.96, pctCritical: 0.749, jTotal: 0.32, jBalls: 0.08, rhoOre: 2.75, measuredKw: 6803, basis: 'motor',
    citation: "Doll (2016) IMPC 2016 Table 1 row 39 (Inco Clarabelle SAG)", url: "https://sagmilling.com/articles/29/view/IMPC2016-AlexDoll-SAG%20data%20set.pdf", note: "Row 39. 9.45/3.96/0.320/0.080/0.749; rho 2.75 wC 0.72; PDCS 6,803 x 0.9014 = 6,132. Clarabelle in SABC (ball-charged) mode." },
  { id: 'santa-rita-ag', name: "Santa Rita AG", type: 'ag', diameterM: 9.15, lengthM: 5, pctCritical: 0.75, jTotal: 0.332, jBalls: 0.0, rhoOre: 3.24, measuredKw: 6667, basis: 'motor',
    citation: "Doll (2016) IMPC 2016 Table 1 row 42 (Santa Rita AG)", url: "https://sagmilling.com/articles/29/view/IMPC2016-AlexDoll-SAG%20data%20set.pdf", note: "Row 42. 9.15/5.00/0.332/0.000/0.750; rho 3.24 wC 0.70; PDCS 6,667 x 0.9312 = 6,208. Fully autogenous (Jballs=0)." },
  { id: 'sossego-sag', name: "Sossego SAG", type: 'sag', diameterM: 11.28, lengthM: 6.4, pctCritical: 0.769, jTotal: 0.28, jBalls: 0.149, rhoOre: 2.86, measuredKw: 16635, basis: 'motor',
    citation: "Doll (2016) IMPC 2016 Table 1 row 43 (Sossego SAG)", url: "https://sagmilling.com/articles/29/view/IMPC2016-AlexDoll-SAG%20data%20set.pdf", note: "Row 43. 11.28/6.40/0.280/0.149/0.769; rho 2.86 wC 0.70; PDCS 16,635 x 0.9600 = 15,970." },
  { id: 'el-soldado-sag', name: "El Soldado SAG", type: 'sag', diameterM: 10.06, lengthM: 5.18, pctCritical: 0.767, jTotal: 0.262, jBalls: 0.186, rhoOre: 2.7, measuredKw: 11062, basis: 'motor',
    citation: "Doll (2016) IMPC 2016 Table 1 row 44 (El Soldado SAG)", url: "https://sagmilling.com/articles/29/view/IMPC2016-AlexDoll-SAG%20data%20set.pdf", note: "Row 44. 10.06/5.18/0.262/0.186/0.767; rho 2.70 wC 0.77; PDCS 11,062 x 0.9456 = 10,460." },
  { id: 'cyprus-bagdad-ag-1-2', name: "Cyprus Bagdad AG 1,2", type: 'ag', diameterM: 9.45, lengthM: 3.35, pctCritical: 0.73, jTotal: 0.27, jBalls: 0.0, rhoOre: 2.7, measuredKw: 3297, basis: 'motor',
    citation: "Doll (2016) IMPC 2016 Table 1 row 47 (Cyprus Bagdad AG 1,2)", url: "https://sagmilling.com/articles/29/view/IMPC2016-AlexDoll-SAG%20data%20set.pdf", note: "Row 47. 9.45/3.35/0.270/0.000/0.730; rho 2.70 wC 0.70; PDCS 3,297 x 0.9219 = 3,039. Autogenous mill (Jballs=0)." },
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
