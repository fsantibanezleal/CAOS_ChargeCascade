// The Morrell (2004) SMC-test specific-energy model, VERBATIM from "Using the SMC Test to Predict Comminution
// Circuit Performance" (SMC Testing), Eqs 1-13. This is a SEPARATE model from the C-model: the C-model gives
// mill POWER (kW), this gives circuit SPECIFIC ENERGY (kWh/t). The two compose: throughput t/h = power / W_T.
//
// The core energy-size relationship (Eq 1) with the size-dependent exponent (Eq 2) generalizes Bond's law: Bond
// uses a fixed exponent -0.5, Morrell replaces it with f(x) = -(0.295 + x/1e6) so the exponent itself varies with
// size. The circuit specific energy (Eq 3) sums the stage terms Wa (coarse tumbling), Wb (fine tumbling), Wc
// (crushing), Wh (HPGR), Ws (a size-distribution correction); only the relevant stages are included.
//
// Sources (all read verbatim): SMC Testing "Using the SMC Test..." Eqs 1-13; Morrell (2004b) IJMP 74:133-141
// (Eq 1 + the f(x) family, DOI 10.1016/j.minpro.2004.06.001); Morrell (2006, 2008, 2009) for Mia/Mib/Mic/Mih.
// Adopted by the Global Mining Guidelines Group (GMG 2021) as the standard circuit-energy method.

export interface SmcInput {
  // ore indices (kWh/t-ish work indices for each stage). Defaults are a typical competent copper ore.
  Mia?: number;   // coarse tumbling-mill WI (SMC test output), default 19.4
  Mib?: number;   // fine tumbling-mill WI (from Bond ball data via Eq 6), default 18.8
  Mic?: number;   // crushing WI (SMC test output), default 7.2
  Mih?: number;   // HPGR WI (SMC test output), default 13.9
  // circuit sizing (microns)
  crushF80um: number;   // feed P80 to the crushing stage
  crushP80um: number;   // product P80 of the last crush before grinding (= SAG/tumbling feed)
  grindP80um: number;   // final grind P80 (the circuit product)
  // circuit configuration
  hasPebbleCrusher?: boolean; // K1 = 0.95 with a recycle-pebble crusher, else 1.0
  crusherClosed?: boolean;    // K2 = 1.0 closed circuit, 1.19 open (default closed)
  hasHpgr?: boolean;          // include the HPGR term Wh
  hpgrClosed?: boolean;       // K3 for the HPGR term (default closed)
  includeCrush?: boolean;     // include the crushing term Wc (default true)
}

export interface SmcResult {
  Wa: number;   // coarse tumbling specific energy (kWh/t)
  Wb: number;   // fine tumbling
  Wc: number;   // crushing
  Wh: number;   // HPGR
  Ws: number;   // size-distribution correction
  W_T: number;  // total circuit specific energy (kWh/t)
}

const COARSE_FINE_UM = 750; // the 750-micron coarse/fine transition (chosen for best database fit)

/** The size-dependent exponent (Eq 2): f(x) = -(0.295 + x/1,000,000), x in microns. */
export function fExp(xUm: number): number {
  return -(0.295 + xUm / 1_000_000);
}

/** The general size-reduction specific energy (Eq 1): W = M*4*(x2^f(x2) - x1^f(x1)), x1 feed / x2 product. */
function sizeEnergy(M: number, x1Um: number, x2Um: number): number {
  return M * 4 * (Math.pow(x2Um, fExp(x2Um)) - Math.pow(x1Um, fExp(x1Um)));
}

/** Morrell (2004) SMC circuit specific-energy model. Returns the decomposed stage energies + the total. */
export function smcSpecificEnergy(inp: SmcInput): SmcResult {
  const Mia = inp.Mia ?? 19.4, Mib = inp.Mib ?? 18.8, Mic = inp.Mic ?? 7.2, Mih = inp.Mih ?? 13.9;
  const xC = COARSE_FINE_UM;

  // Wa, coarse tumbling (Eq 4): last-crush P80 -> 750 um. K1 = 0.95 with a pebble crusher, else 1.0.
  const K1 = inp.hasPebbleCrusher ? 0.95 : 1.0;
  const Wa = K1 * sizeEnergy(Mia, inp.crushP80um, xC);

  // Wb, fine tumbling (Eq 5): 750 um -> final grind P80.
  const Wb = sizeEnergy(Mib, xC, inp.grindP80um);

  // Wc, crushing (Eq 7 + the S correction Eq 8): crusher feed -> crusher product. K2 = 1.0 closed / 1.19 open.
  let Wc = 0;
  if (inp.includeCrush !== false) {
    const K2 = inp.crusherClosed === false ? 1.19 : 1.0;
    const Ks = 55; // conventional crusher
    const Sc = Ks * Math.pow(inp.crushF80um * inp.crushP80um, -0.2);
    Wc = Sc * K2 * sizeEnergy(Mic, inp.crushF80um, inp.crushP80um);
  }

  // Wh, HPGR (Eq 9): optional. Uses Ks = 35 for the size correction. K3 = 1.0 closed / 1.19 open.
  let Wh = 0;
  if (inp.hasHpgr) {
    const K3 = inp.hpgrClosed === false ? 1.19 : 1.0;
    const KsH = 35;
    const Sh = KsH * Math.pow(inp.crushF80um * inp.crushP80um, -0.2);
    Wh = Sh * K3 * sizeEnergy(Mih, inp.crushF80um, inp.crushP80um);
  }

  // Ws, size-distribution correction (Eqs 10-12), the simplified form Ws = 0.19*Mia*4*(x2^f - x1^f) over the
  // coarse tumbling range.
  const Ws = 0.19 * sizeEnergy(Mia, inp.crushP80um, xC);

  const W_T = Wa + Wb + Wc + Wh + Ws;
  return { Wa, Wb, Wc, Wh, Ws, W_T };
}

/** Compose the C-model power (kW) with the SMC specific energy (kWh/t) into a throughput (t/h): tph = P / W_T. */
export function throughputFromPower(powerKw: number, W_T: number): number {
  return W_T > 0 ? powerKw / W_T : 0;
}
