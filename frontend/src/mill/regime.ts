// The motion regime the user watches transition. Boundaries are approximate labelled bands (they depend on J, liner
// lift, friction), verified qualitative ranges (Wills & Finch; Napier-Munn et al., Mineral Comminution Circuits):
//   slumping/surging  phiC <~ 0.4   (charge slips & slumps as a mass)
//   cascading        ~0.4-0.65      (charge rolls/tumbles down the free surface, abrasion)
//   cataracting      ~0.65-0.9      (outer media projected in parabolic arcs, impacting the toe, IMPACT breakage)
//   centrifuging     phiC >= ~0.9   (outer layers pin to the shell; breakage collapses; full at phiC>=1)
// The '% centrifuging' gauge (the fraction of shells that centrifuge) gives the onset precisely.

import type { Regime } from './types.ts';

export const CASCADE_CATARACT_PHIC = 0.65;
export const CATARACT_CENTRIFUGE_PHIC = 0.9;

export function classifyRegime(phiC: number, fracCentrifuging: number): Regime {
  if (phiC >= 1 || fracCentrifuging > 0.5) return 'centrifuging';
  if (phiC >= CATARACT_CENTRIFUGE_PHIC) return 'centrifuging';
  if (phiC >= CASCADE_CATARACT_PHIC) return 'cataracting';
  if (phiC >= 0.4) return 'cascading';
  return 'slumping';
}
