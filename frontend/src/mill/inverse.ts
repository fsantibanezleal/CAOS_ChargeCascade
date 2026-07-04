// The INVERSE problem: given a target, find the fraction of critical speed phiC that achieves it on the EXACT engine.
// Net power (Hogg-Fuerstenau) is monotone increasing in phiC and is NOT tapered (engine.ts), so a target power, and
// the grinding capacity P_net/W that scales with it, is a clean bisection. The motion regime is a monotone sequence
// in phiC (slumping → cascading → cataracting → centrifuging), so a target regime is a scan for the phiC band that
// yields it at the current geometry. The exact engine is the authority here (the ONNX surrogate is only for sweeps).
import { bondWKwhT } from './power.ts';
import { evaluate } from './engine.ts';
import type { Operating, Regime } from './types.ts';

export const PHI_LO = 0.3;
export const PHI_HI = 1.05;

const powerAt = (op: Operating, phiC: number) => evaluate({ ...op, phiC }).phfKw;

export interface PowerSolve {
  target: number;          // requested net power [kW]
  phiC: number | null;     // the phiC that delivers it (null only if the geometry can draw no power)
  achievable: boolean;     // false if the target exceeds the max drawable power at PHI_HI
  minKw: number;           // power at PHI_LO
  maxKw: number;           // power at PHI_HI (the ceiling)
}

/** Bisect phiC ∈ [PHI_LO, PHI_HI] for a target net power [kW] (power is monotone increasing in phiC). */
export function solvePhiCForPower(op: Operating, targetKw: number): PowerSolve {
  const minKw = powerAt(op, PHI_LO);
  const maxKw = powerAt(op, PHI_HI);
  if (!(maxKw > minKw)) return { target: targetKw, phiC: null, achievable: false, minKw, maxKw };
  if (targetKw <= minKw) return { target: targetKw, phiC: PHI_LO, achievable: targetKw >= minKw * 0.999, minKw, maxKw };
  if (targetKw >= maxKw) return { target: targetKw, phiC: PHI_HI, achievable: false, minKw, maxKw };
  let lo = PHI_LO, hi = PHI_HI;
  for (let i = 0; i < 48; i++) {
    const mid = (lo + hi) / 2;
    if (powerAt(op, mid) < targetKw) lo = mid; else hi = mid;
  }
  return { target: targetKw, phiC: (lo + hi) / 2, achievable: true, minKw, maxKw };
}

export interface CapacitySolve extends PowerSolve {
  wBond: number;           // the Bond specific energy [kWh/t] used to convert capacity ↔ power
  minTph: number;          // capacity at PHI_LO
  maxTph: number;          // capacity ceiling at PHI_HI
}

/** Capacity T = P_net/W [t/h]; with W constant in phiC, solve the equivalent power target tph·W. */
export function solvePhiCForCapacity(op: Operating, targetTph: number): CapacitySolve {
  const wBond = bondWKwhT(op.oreWi, op.feedF80um, op.prodP80um);
  const p = solvePhiCForPower(op, wBond > 0 ? targetTph * wBond : Infinity);
  const conv = (kw: number) => (wBond > 0 ? kw / wBond : 0);
  return { ...p, wBond, minTph: conv(p.minKw), maxTph: conv(p.maxKw) };
}

export interface RegimeSolve {
  regime: Regime;
  phiCLo: number | null;   // onset of the band at this geometry
  phiCHi: number | null;   // end of the band
  phiCRec: number | null;  // a representative phiC: band midpoint for grinding regimes, onset for centrifuging
  operational: boolean;    // false for centrifuging (no grinding, a limit to avoid, not an operating point)
}

/** Scan phiC for the contiguous band that classifies as `regime` at the current geometry (fracCentrifuging can move
 * the centrifuging onset, so this uses the real engine, not the nominal thresholds). */
export function recommendPhiCForRegime(op: Operating, regime: Regime): RegimeSolve {
  let lo: number | null = null, hi: number | null = null;
  for (let p = PHI_LO; p <= 1.1 + 1e-9; p += 0.005) {
    if (evaluate({ ...op, phiC: p }).regime === regime) {
      if (lo === null) lo = p;
      hi = p;
    }
  }
  const operational = regime === 'cascading' || regime === 'cataracting' || regime === 'slumping';
  const phiCRec = lo === null || hi === null ? null : operational ? Math.round(((lo + hi) / 2) * 100) / 100 : Math.round(lo * 100) / 100;
  return { regime, phiCLo: lo, phiCHi: hi, phiCRec, operational };
}
