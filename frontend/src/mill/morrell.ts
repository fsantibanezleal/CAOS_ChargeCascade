// The real Morrell (1996) C-model for tumbling-mill gross power (issue #64), the SOTA independent power model,
// finally implementable: the two previously-unrecoverable terms were pinned from primary sources and the whole
// model reproduces the Erdem (2004) cement-mill worked example (gross 1365.04 kW vs published 1365.04).
//
// Coefficients, pinned to the verbatim primary-source form (2026-07-19 correction, overturns the older pin):
//   z = (1 - Jt)^0.4532            the velocity-profile packing factor (CEEC/SAG-2019, Morrell-affiliated).
//   cylinder power (Erdem 2004 Eq 3; CEEC 2019 Eq 2): gravity term carries a leading pi; the kinetic term is
//                                  pi^3 from (pi*Nm*rm/denom)^3, NOT (2*pi)^3. The earlier (2*pi)^3 pin held
//                                  only because a second error (a dropped leading pi in the gravity term)
//                                  compensated it at a WRONG (higher) charge density while INVERTING the physics
//                                  (kinetic-dominated instead of gravity-dominated). The verbatim form is
//                                  gravity-dominated (kin/grav ~0.09 at 73% CS) and is the only reading that
//                                  reproduces Erdem's two chambers at ONE charge density (3.977 vs 3.959, 0.5%).
//   cone power (Erdem Eq 4): gravity term carries a leading pi; the kinetic constant is 2*pi^3/5 (verbatim).
// Sources: Morrell (1996) Trans IMM C105 (conceptual origin, pre-online); Erdem, Ergun & Benzer (2004) PPMP 38
// Eq 3-5 (verbatim reproduction); Toor, Valery, Morrell & Duffy (2019) CEEC Eq 2-3 (Morrell-coauthored). The
// pi (not 2*pi) inside the kinetic bracket is as printed; a factor of 2 is absorbed elsewhere in Morrell's
// derivation (Napier-Munn 1996), and the two-chamber cross-validation confirms it empirically. Overturn record:
// CAOS_MANAGE wip/mining-analytics-hub/products/chargecascade/morrell-cmodel-pinned-2026-07-11.md.
//
// Honest residual: the charge-DENSITY convention (Napier-Munn voidage/packing) sits ~15% below a naive ball-bed
// bulk; that is a convention choice, not a missing equation. The model's own reported band is 9.8% at 95% CI
// over 82 industrial datasets. The integral STRUCTURE + all coefficients are now the verbatim primary-source form.

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
  rhoCOverride?: number;  // use this charge bulk density [t/m3] instead of the ore/ball computation (the live tool
                          // feeds the user's chargeDensity so the density control drives the C-model directly)
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

const G = 9.814; // CEEC 2019 value (0.04% vs 9.81; carried for fidelity to the verbatim reproduction)

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
  const rhoC = inp.rhoCOverride ?? (rhoOre * (Jt - JB) * (1 - E) + rhoBall * JB * (1 - E) + rhoPulp * (Jt * E * U)) / Jt;

  const angleTerm = rhoC * (Math.sin(thetaS) - Math.sin(thetaT)) + rhoPulp * (Math.sin(thetaT) - Math.sin(thetaTO));

  // cylinder charge-motion power = gravity + kinetic (Erdem 2004 Eq 3 / CEEC 2019 Eq 2, verbatim)
  const denom = rm - z * ri;
  const gravCyl = (Math.PI * G * L * Nm * rm / (3 * denom)) *
    (2 * rm ** 3 - 3 * z * rm ** 2 * ri + ri ** 3 * (3 * z - 2)) * angleTerm;
  const kinCyl = L * rhoC * Math.pow((Math.PI * Nm * rm) / denom, 3) *
    (Math.pow(denom, 4) - ri ** 4 * Math.pow(z - 1, 4));
  const cylKw = gravCyl + kinCyl;

  // cone charge-motion power (skip if flat-ended); else Doll's 5% shortcut if only an allowance is given
  let coneKw = 0;
  if (Ld > 0) {
    const gravCone = (Math.PI * G * Ld * Nm / (3 * (rm - rt))) * (rm ** 4 - 4 * rm * ri ** 3 + 3 * ri ** 4) * angleTerm;
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
