import type { Citation } from '@fasl-work/caos-app-shell';

// The references ChargeCascade's physics rests on, tumbling-mill charge motion + power draw.
// None carry a DOI (the foundational works are pre-DOI AIME/SME Transactions or books), so each links to a
// verifiable, stable source: the publisher, a library/bibliographic record, or the author's own publication page.
export const CITATIONS: Citation[] = [
  {
    id: 'davis1919',
    label: 'Davis 1919',
    citation: 'Davis, E.W. (1919). Fine crushing in ball mills. Transactions AIME, 61, 250–290. (The single-particle departure-angle + parabolic-flight charge-motion model.)',
    url: 'https://www.onemine.org/search?q=Davis%201919%20Fine%20crushing%20in%20ball%20mills',
  },
  {
    id: 'rosesullivan1957',
    label: 'Rose & Sullivan 1957',
    citation: 'Rose, H.E. & Sullivan, R.M.E. (1957). A Treatise on the Internal Mechanics of Ball, Tube and Rod Mills. Constable, London.',
    url: 'https://search.worldcat.org/search?q=Rose+Sullivan+internal+mechanics+ball+tube+rod+mills',
  },
  {
    id: 'hoggfuerstenau1972',
    label: 'Hogg & Fuerstenau 1972',
    citation: 'Hogg, R. & Fuerstenau, D.W. (1972). Power relationships for tumbling mills. Transactions SME-AIME, 252, 418–432.',
    url: 'https://www.onemine.org/search?q=Hogg%20Fuerstenau%20Power%20relationships%20for%20tumbling%20mills',
  },
  {
    id: 'morrell1996',
    label: 'Morrell 1996',
    citation: 'Morrell, S. (1996). Power draw of wet tumbling mills and its relationship to charge dynamics, Parts 1 & 2. Trans. IMM (Sect. C), 105, C43–C62. (The C-model; ±9.8% on 82 data sets.)',
    url: 'https://www.smctesting.com/about/publications/power-draw-of-wet-tumbling-mills-and-its-relationship-to-charge-dynamics-part-1-a-continuum-approach-to-mathematical-modelling-of-mill-power-draw',
  },
  {
    id: 'bond1952',
    label: 'Bond 1952',
    citation: 'Bond, F.C. (1952). The third theory of comminution. Transactions AIME 193, 484–494. The Bond work-index law W = 10·Wi·(1/√P80 − 1/√F80); the practical calculation form is restated in Bond (1961), Crushing and grinding calculations, British Chemical Engineering 6.',
    url: 'https://onemine.org/documents/the-third-theory-of-comminution',
  },
  {
    id: 'napiermunn1996',
    label: 'Napier-Munn et al. 1996',
    citation: 'Napier-Munn, T.J., Morrell, S., Morrison, R.D. & Kojovic, T. (1996). Mineral Comminution Circuits: Their Operation and Optimisation. JKMRC Monograph 2. ISBN 0-646-28861-X.',
    url: 'https://app.dimensions.ai/details/publication/pub.1015179087',
  },
  {
    id: 'wills2016',
    label: 'Wills & Finch 2016',
    citation: "Wills, B.A. & Finch, J.A. (2016). Wills' Mineral Processing Technology, 8th ed. Butterworth-Heinemann / Elsevier. ISBN 978-0-08-097053-0. (Critical speed 42.3/√(D−d); cascade/cataract/centrifuge regimes.)",
    url: 'https://shop.elsevier.com/books/wills-mineral-processing-technology/wills/978-0-08-097053-0',
  },
];
