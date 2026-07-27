// Charge apparent (bulk) density from the TWO fillings.
//
// Until v0.27 the engine carried a single lumped `chargeDensity` that the user typed in directly. That
// made two of the questions a metallurgist actually asks unanswerable: how does the mill respond when I
// change the BALL charge Jb at constant total charge J, and what happens when I mill a denser ore? Both
// need the charge split into media and pulp, with their own densities.
//
// Hogg & Fuerstenau (1972), as reproduced verbatim in Golpayegani & Rezai (2022), Physicochemical
// Problems of Mineral Processing 58(6), 153380, DOI 10.37190/ppmp/153380 (open access), their Eq. 2:
//
//     rho_ap = [ (1 - phi) * rho_b * Jb  +  rho_p * Jp * phi * Jb  +  rho_p * (J - Jb) ] / J
//
//   phi    grinding-media voidage (customarily 0.40 static)
//   rho_b  steel ball density [t/m^3]
//   Jb     fractional mill filling BY STEEL BALLS
//   rho_p  slurry / pulp density [t/m^3]
//   J      TOTAL fractional filling
//   Jp     interstitial slurry filling: the fraction of the voids WITHIN the ball charge actually
//          occupied by slurry
//
// The three terms are: solid steel over its non-void fraction of the ball filling; slurry inside the
// voids of the ball charge; and slurry-or-rock filling the remainder (J - Jb) that is not balls. The
// division by J is what turns a mill-volume-weighted sum into a density OF THE CHARGE. That divisor is
// easy to drop when the equation is copied from a summary rather than a source, and dropping it inflates
// the density by 1/J, which is a factor of ~3 at a typical J = 0.30.
//
// This is the HF-consistent density on purpose: our power lane IS Hogg & Fuerstenau (see power.ts), so
// pairing it with Morrell's differently-defined charge density would be a silent inconsistency.

/** Customary static grinding-media voidage. Golpayegani & Rezai show the DYNAMIC value varies with
 *  fill and speed, but their fitted coefficients are not yet transcribed, so we keep the static value. */
export const STATIC_MEDIA_VOIDAGE = 0.40;

export interface ChargeComposition {
  /** J, total fractional filling (media + rock + slurry), 0..1 */
  fillTotal: number;
  /** Jb, fractional filling by steel balls, 0..J. Jb = 0 is an AG mill (no media). */
  ballFill: number;
  /** rho_b, steel ball density [t/m^3]; ~7.8 for forged steel */
  ballDensity: number;
  /** rho_p, slurry / pulp density [t/m^3]; ~2.7 dry ore, ~1.8-2.2 as a mill slurry */
  slurryDensity: number;
  /** phi, grinding-media voidage; defaults to the static 0.40 */
  mediaVoidage?: number;
  /** Jp, interstitial slurry filling (fraction of ball-charge voids holding slurry); defaults to 1 */
  interstitialSlurryFill?: number;
}

/**
 * Charge apparent bulk density [t/m^3], Hogg & Fuerstenau (1972) Eq. 2.
 *
 * Returns 0 for an empty mill (J <= 0) rather than dividing by zero: an empty mill has no charge, and
 * the power lane already treats J = 0 as the zero-power control case (C-EMPTY).
 */
export function apparentChargeDensity(c: ChargeComposition): number {
  const J = c.fillTotal;
  if (!(J > 0)) return 0;
  const phi = c.mediaVoidage ?? STATIC_MEDIA_VOIDAGE;
  const Jp = c.interstitialSlurryFill ?? 1.0;
  // Jb cannot exceed the total filling: balls are part of the charge, not additional to it.
  const Jb = Math.max(0, Math.min(c.ballFill, J));
  const steel = (1 - phi) * c.ballDensity * Jb;
  const slurryInVoids = c.slurryDensity * Jp * phi * Jb;
  const remainder = c.slurryDensity * (J - Jb);
  return (steel + slurryInVoids + remainder) / J;
}

/**
 * Ball charge as a fraction of the total charge (Jb/J), the dimensionless number practitioners quote
 * when they say "a 15% ball charge in a 30% total load".
 */
export function ballFractionOfCharge(fillTotal: number, ballFill: number): number {
  if (!(fillTotal > 0)) return 0;
  return Math.max(0, Math.min(ballFill, fillTotal)) / fillTotal;
}
