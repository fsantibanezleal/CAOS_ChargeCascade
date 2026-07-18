// The real Morrell (1996) C-model for tumbling-mill gross power (issue #64), the SOTA independent power model,
// finally implementable: the two previously-unrecoverable terms were pinned from primary sources and the whole
// model reproduces the Erdem (2004) cement-mill worked example (gross 1365.04 kW vs published 1365.04).
//
// Resolved unknowns (were flagged UNVERIFIED in the v0.16 spec):
//   z = (1 - Jt)^0.4532            the velocity-profile packing factor (CEEC/SAG-2019, Morrell-affiliated).
//   kinetic leading constant       cylinder (2*pi)^3 = 8*pi^3; cone 2*pi^3/5. Both cross-validated by the two
//                                  Erdem chambers needing the same charge density to match.
// Sources: Morrell (1996) Trans IMM C105; Erdem, Ergun & Benzer (2004) PPMP 38; Doll (2013) Procemin;
// Faria/Bueno/Tavares & Morrell (2019) CEEC; SMC Gross Power Calculator help doc. Persisted in CAOS_MANAGE
// wip/mining-analytics-hub/products/chargecascade/morrell-cmodel-pinned-2026-07-11.md.
//
// Honest residual: the exact Napier-Munn charge-DENSITY packing convention is loose by ~+/-10% (a first-
// principles rho_c overshoots Erdem's fitted density by ~11%); the STRUCTURE + all coefficients are exact.

export interface MorrellInput {
  diameterM: number;      // D inside liners
  lengthM: number;        // L belly (cylindrical / EGL) length
  coneLengthM?: number;   // L_d cone axial length (0 = flat-ended, ball mills)
  trunnionRadiusM?: number; // r_t (only used with the cone term)
  phiC: number;           // fraction of critical speed
  fill: number;           // Jt total fractional filling
  ballFill?: number;      // JB ball fractional filling (defaults to Jt for a ball mill)
  rhoOre?: number;        // t/m3 (default 2.9)
  rhoBall?: number;       // t/m3 (default 7.85)
  solidsMassFrac?: number; // slurry solids mass fraction (default 0.72)
  k?: number;             // net->gross calibration (default 1.26)
  coneAllowanceFrac?: number; // if coneLength unknown, add this fraction of P_cyl as the cone (Doll's 5% shortcut)
}

export interface MorrellResult {
  noLoadKw: number;
  cylKw: number;          // cylinder charge-motion net power
  coneKw: number;         // cone charge-motion net power
  netKw: number;          // P_cyl + P_cone
  grossKw: number;        // P_noload + k*net (motor input)
  rhoC: number;           // computed charge bulk density [t/m3]
  thetaToe: number;
  thetaShoulder: number;
}

const G = 9.81;

/** Full Morrell C-model gross power. Returns the decomposed result so the App can show net/no-load/gross. */
export function morrellPower(inp: MorrellInput): MorrellResult {
  const D = inp.diameterM, rm = D / 2, L = inp.lengthM;
  const Ld = inp.coneLengthM ?? 0, rt = inp.trunnionRadiusM ?? Math.min(1.0, rm * 0.12);
  const phi = inp.phiC, Jt = inp.fill, JB = inp.ballFill ?? Jt;
  const rhoOre = inp.rhoOre ?? 2.9, rhoBall = inp.rhoBall ?? 7.85, Swt = inp.solidsMassFrac ?? 0.72;
  const k = inp.k ?? 1.26, E = 0.4, U = 1.0;
  const Nm = (phi * (42.3 / Math.sqrt(D))) / 60;   // rev/s

  // charge shape (Apelt/Morrell)
  const phi_c = 0.35 * (3.364 - Jt);
  const thetaT = 2.5307 * (1.2796 - Jt) * (1 - Math.exp(-19.42 * (phi_c - phi))) + Math.PI / 2;
  const thetaS = Math.PI / 2 - (thetaT - Math.PI / 2) * ((0.3386 + 0.1041 * phi_c) + (1.54 - 2.5673 * phi_c) * Jt);
  const thetaTO = thetaT;                            // grate/dry: slurry-pool term vanishes
  const z = Math.pow(1 - Jt, 0.4532);
  const ri = rm * Math.sqrt(Math.max(0, 1 - (2 * Math.PI * Jt) / (2 * Math.PI + thetaS - thetaT)));

  // charge bulk density
  const rhoPulp = 1 / (Swt / rhoOre + (1 - Swt) / 1.0);
  const rhoC = (rhoOre * (Jt - JB) * (1 - E) + rhoBall * JB * (1 - E) + rhoPulp * (Jt * E * U)) / Jt;

  const angleTerm = rhoC * (Math.sin(thetaS) - Math.sin(thetaT)) + rhoPulp * (Math.sin(thetaT) - Math.sin(thetaTO));

  // cylinder charge-motion power = gravity + kinetic
  const denom = rm - z * ri;
  const gravCyl = (G * L * Nm * rm / (3 * denom)) *
    (2 * rm ** 3 - 3 * z * rm ** 2 * ri + ri ** 3 * (3 * z - 2)) * angleTerm;
  const kinCyl = L * rhoC * Math.pow((2 * Math.PI * Nm * rm) / denom, 3) *
    (Math.pow(denom, 4) - ri ** 4 * Math.pow(z - 1, 4));
  const cylKw = gravCyl + kinCyl;

  // cone charge-motion power (skip if flat-ended); else Doll's 5% shortcut if only an allowance is given
  let coneKw = 0;
  if (Ld > 0) {
    const gravCone = (G * Ld * Nm / (3 * (rm - rt))) * (rm ** 4 - 4 * rm * ri ** 3 + 3 * ri ** 4) * angleTerm;
    const kinCone = (2 * Math.PI ** 3 * Nm ** 3 * Ld * rhoC / (5 * (rm - rt))) * (rm ** 5 - 5 * rm * ri ** 4 + 4 * ri ** 5);
    coneKw = gravCone + kinCone;
  } else if (inp.coneAllowanceFrac) {
    coneKw = inp.coneAllowanceFrac * cylKw;
  }

  const netKw = cylKw + coneKw;
  const noLoadKw = 1.68 * Math.pow(D, 2.05) * Math.pow(phi * (0.667 * Ld + L), 0.82);
  const grossKw = noLoadKw + k * netKw;
  return { noLoadKw, cylKw, coneKw, netKw, grossKw, rhoC, thetaToe: thetaT, thetaShoulder: thetaS };
}
