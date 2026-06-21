import type { Citation } from '@fasl-work/caos-app-shell';

// The references ChargeCascade's physics rests on — tumbling-mill charge motion + power draw.
export const CITATIONS: Citation[] = [
  {
    id: 'davis1919',
    label: 'Davis 1919',
    citation: 'Davis, E.W. (1919). Fine crushing in ball mills. Transactions AIME, 61, 250–296. (The single-particle departure-angle + parabolic-flight charge-motion model.)',
  },
  {
    id: 'rosesullivan1957',
    label: 'Rose & Sullivan 1957',
    citation: 'Rose, H.E. & Sullivan, R.M.E. (1957). A Treatise on the Internal Mechanics of Ball, Tube and Rod Mills. Constable, London.',
  },
  {
    id: 'hoggfuerstenau1972',
    label: 'Hogg & Fuerstenau 1972',
    citation: 'Hogg, R. & Fuerstenau, D.W. (1972). Power relationships for tumbling mills. Transactions SME-AIME, 252, 418–423.',
  },
  {
    id: 'morrell1996',
    label: 'Morrell 1996',
    citation: 'Morrell, S. (1996). Power draw of wet tumbling mills and its relationship to charge dynamics, Parts 1 & 2. Trans. IMM (Sect. C), 105, C43–C62. (The C-model; ±9.8% on 82 data sets.)',
  },
  {
    id: 'bond1961',
    label: 'Bond 1961',
    citation: 'Bond, F.C. (1952, 1961). The third theory of comminution. Transactions AIME / British Chemical Engineering. (W = 10·Wi·(1/√P80 − 1/√F80).)',
  },
  {
    id: 'napiermunn1996',
    label: 'Napier-Munn et al. 1996',
    citation: 'Napier-Munn, T.J., Morrell, S., Morrison, R.D. & Kojovic, T. (1996). Mineral Comminution Circuits: Their Operation and Optimisation. JKMRC Monograph 2.',
  },
  {
    id: 'wills2016',
    label: 'Wills & Finch 2016',
    citation: "Wills, B.A. & Finch, J.A. (2016). Wills' Mineral Processing Technology, 8th ed. Elsevier. (Critical speed 42.3/√(D−d); cascade/cataract/centrifuge regimes.)",
  },
];
