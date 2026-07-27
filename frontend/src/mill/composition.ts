// Resolving an Operating point's charge density and shoulder, with the optional v0.27 additions.
//
// Both additions are strictly ADDITIVE: an Operating point that does not set them behaves exactly as it
// did before, so every existing case, bake and test is unaffected. This is deliberate. ADR-0070 is an
// additive capability, and the same discipline applies to the engine underneath it.

import type { Operating } from './types.ts';
import { apparentChargeDensity } from './density.ts';
import { lifterDeparture } from './lifter.ts';

/**
 * The charge density the power models should use.
 *
 * If the operating point describes its composition (a ball filling plus the two densities), the density
 * is DERIVED from Hogg & Fuerstenau (1972). Otherwise the legacy lumped `chargeDensity` is returned
 * unchanged.
 */
export function resolvedChargeDensity(op: Operating): number {
  if (op.ballFill === undefined || op.ballDensity === undefined || op.slurryDensity === undefined) {
    return op.chargeDensity;
  }
  return apparentChargeDensity({
    fillTotal: op.fill,
    ballFill: op.ballFill,
    ballDensity: op.ballDensity,
    slurryDensity: op.slurryDensity,
    mediaVoidage: op.mediaVoidage,
    interstitialSlurryFill: op.interstitialSlurryFill,
  });
}

/** True when this operating point carries a modelled liner. */
export function hasLifters(op: Operating): boolean {
  return op.lifterHeightM !== undefined && op.lifterHeightM > 0;
}

export interface ShoulderResolution {
  /** shoulder angle [deg from vertical] the rest of the engine should use */
  shoulderDeg: number;
  /** lift the bars contribute [deg]; 0 when no liner is modelled */
  liftDeg: number;
  /** true when the liner model governed the departure (it held the element past the Davis angle) */
  lifterGoverned: boolean;
}

/**
 * The shoulder angle, accounting for lifter bars when the operating point describes them.
 *
 * `davisShoulderDeg` is the bare-shell outer-layer departure that `chargeGeometry` already computes,
 * measured FROM VERTICAL, which is this codebase's convention for shoulder and toe.
 *
 * Vermeulen (1985) works in the polar frame (angle from the horizontal +x axis, increasing with mill
 * rotation), so the two conventions are bridged here rather than inside the physics module: an angle
 * `phi` from vertical corresponds to `90 - phi` in the polar frame. Getting this backwards is exactly
 * the class of bug that produced the mis-drawn charge-shape markers on 2026-07-26.
 */
export function resolveShoulder(op: Operating, davisShoulderDeg: number, omega: number): ShoulderResolution {
  if (!hasLifters(op)) {
    return { shoulderDeg: davisShoulderDeg, liftDeg: 0, lifterGoverned: false };
  }
  const a = op.ballTopMm / 1000 / 2;                    // media radius [m]
  const R = op.diameterM / 2;
  const d = op.lifterWidthM ?? 2 * a;                   // standard bar width is ~1 media diameter
  const davisPolarRad = ((90 - davisShoulderDeg) * Math.PI) / 180;
  const dep = lifterDeparture(
    {
      radiusM: R, elementRadiusM: a,
      lifterHeightM: op.lifterHeightM as number,
      lifterWidthM: d, omega, frictionMu: op.frictionMu ?? 0,
    },
    davisPolarRad,
  );
  // A retained element never leaves the bar within the search window; the liner is not governing a
  // departure, so fall back to the bare-shell angle rather than inventing one.
  if (dep.retained) {
    return { shoulderDeg: davisShoulderDeg, liftDeg: 0, lifterGoverned: false };
  }
  const liftDeg = (dep.liftRad * 180) / Math.PI;
  return {
    shoulderDeg: davisShoulderDeg - liftDeg,   // more lift = departs closer to the top = smaller angle from vertical
    liftDeg,
    lifterGoverned: liftDeg > 0,
  };
}
