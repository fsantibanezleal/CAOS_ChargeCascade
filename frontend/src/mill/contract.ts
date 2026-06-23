// CONTRACT 1 (ingestion) ported to TS for the live bring-your-own-mill form. Mirrors EXACTLY the reference policy in
// data-pipeline/cclab/io/contract.py (validate_records / validate_mill): a descriptor is ACCEPTED iff it passes;
// ill-formed ones are REJECTED with a reason (never silently coerced); plausible-but-honesty-relevant ones are
// FLAGGED (accepted, the flag travels with it). Keep this in lock-step with the Python — both are the same gate.
import type { MillType } from './types.ts';

export const MILL_TYPES: MillType[] = ['rod', 'ball', 'sag', 'ag'];
const FILL_FLAG_HI = 0.45;   // above the power peak (J ~ 0.47); charge crowding
const FILL_FLAG_LO = 0.15;   // low charge; ball-on-liner impacts

export interface MillInput {
  mill_type: string;
  diameter_m: number; length_m: number; fill: number;
  phi_c: number; ball_top_mm: number; charge_density: number;
}

export interface ContractResult {
  accepted: boolean;
  reason: string | null;   // the rejection reason (null when accepted)
  flags: string[];         // honesty flags (accepted-but-flagged)
}

const NUM = ['diameter_m', 'length_m', 'fill', 'phi_c', 'ball_top_mm', 'charge_density'] as const;

export function validateMill(m: MillInput): ContractResult {
  // non-numeric / empty geometry-operating field → reject (never coerce)
  for (const c of NUM) {
    const x = m[c] as unknown;
    if (x === null || x === undefined || (x as string) === '' || !Number.isFinite(Number(x))) {
      return { accepted: false, reason: `non-numeric or empty ${c}`, flags: [] };
    }
  }
  const v = Object.fromEntries(NUM.map((c) => [c, Number(m[c])])) as Record<(typeof NUM)[number], number>;
  const mt = String(m.mill_type).toLowerCase();

  const bad: string[] = [];
  if (!MILL_TYPES.includes(mt as MillType)) bad.push(`mill_type='${mt}' not in ${MILL_TYPES.join('/')}`);
  for (const c of ['diameter_m', 'length_m', 'charge_density'] as const) {
    if (!(v[c] > 0)) bad.push(`${c} must be > 0`);
  }
  if (!(v.fill >= 0 && v.fill <= 0.6)) bad.push(`fill ${v.fill} not in [0, 0.6]`);
  if (!(v.phi_c > 0 && v.phi_c <= 1.5)) bad.push(`phi_c ${v.phi_c} not in (0, 1.5]`);
  if (v.ball_top_mm / 1000 >= v.diameter_m) bad.push('ball_top_mm >= mill diameter');
  if (bad.length) return { accepted: false, reason: bad.join('; '), flags: [] };

  const flags: string[] = [];
  if (v.phi_c >= 1) flags.push('phi_c >= 1: the outer charge centrifuges — no grinding');
  else if (v.phi_c > 0.85) flags.push(`phi_c ${v.phi_c.toFixed(2)} > 0.85: over-speed; the cataract may impact the liner above the toe`);
  if (v.fill > FILL_FLAG_HI) flags.push(`fill ${(v.fill * 100).toFixed(0)}% > 45%: above the power peak; charge crowding`);
  if (v.fill > 0 && v.fill < FILL_FLAG_LO) flags.push(`fill ${(v.fill * 100).toFixed(0)}% < 15%: low charge; ball-on-liner impacts`);
  if (v.ball_top_mm / 1000 >= 0.05 * v.diameter_m) flags.push('large ball/diameter ratio — the (D-d) critical speed matters');
  return { accepted: true, reason: null, flags };
}
