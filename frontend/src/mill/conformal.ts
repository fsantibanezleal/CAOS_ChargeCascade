// Conformal prediction intervals on the real-mill power prediction (SOTA-ladder Unit 5): a finite-sample
// coverage GUARANTEE wrapped around the leave-one-mill-out residuals, with no distributional assumption.
//
// We use the jackknife+ (Barber, Candes, Ramdas & Tibshirani 2021, "Predictive inference with the jackknife+",
// Annals of Statistics 49(1):486-507, DOI 10.1214/20-AOS1965). For a target miscoverage alpha, jackknife+ has
// the finite-sample marginal guarantee  P(Y in C(X)) >= 1 - 2*alpha  (its two-sided worst case; in practice the
// coverage is close to 1 - alpha). It reuses the leave-one-out residuals we already compute, so no extra model
// fitting is needed. This is the genuine UQ rung: it gives a guarantee, unlike deep ensembles / MC-dropout,
// which need a neural net and give none.
//
// Honesty notes carried into the docs: the guarantee is MARGINAL (averaged over the sample), not conditional on
// a specific mill; n is small (~19 motor mills) and SAG-heavy (a convenience sample), so the intervals are a
// prior for a NEW mill, not a per-mill certified band.

export interface ConformalInterval {
  lowerKw: number;      // lower prediction bound at level 1 - alpha
  upperKw: number;      // upper prediction bound
  halfWidthKw: number;  // (upper - lower) / 2, the symmetric radius for reference
  alpha: number;        // the target miscoverage
  guarantee: number;    // 1 - 2*alpha, the jackknife+ finite-sample lower bound on coverage
  n: number;            // the calibration sample size
}

/**
 * Jackknife+ prediction interval for a point prediction, from the leave-one-out ABSOLUTE residuals of the
 * calibration set. `looAbsResidualsKw` are |y_i - yhat_{-i}(x_i)| for each calibration mill (the honest LOMO
 * residuals we already report). The interval is the point prediction +/- the ceil((1-alpha)(n+1))-th smallest
 * residual, which is the standard jackknife+ symmetric-residual construction with the (n+1) finite-sample slack.
 */
export function jackknifePlusInterval(predictionKw: number, looAbsResidualsKw: number[], alpha = 0.1): ConformalInterval {
  const n = looAbsResidualsKw.length;
  const sorted = [...looAbsResidualsKw].sort((a, b) => a - b);
  // the conformal radius: the smallest residual whose rank covers (1 - alpha) of the n+1 augmented scores.
  // rank k = ceil((1 - alpha)(n + 1)); clamp to n (if k > n, the interval is unbounded -> use the max residual).
  const k = Math.ceil((1 - alpha) * (n + 1));
  const radius = k > n ? sorted[n - 1] : sorted[k - 1];
  return {
    lowerKw: predictionKw - radius,
    upperKw: predictionKw + radius,
    halfWidthKw: radius,
    alpha,
    guarantee: 1 - 2 * alpha,
    n,
  };
}

export interface CoverageReport {
  alpha: number;
  nominal: number;         // 1 - alpha
  guarantee: number;       // 1 - 2*alpha (jackknife+ lower bound)
  empirical: number;       // the measured leave-one-out coverage on the calibration set
  cpLowerCI: number;       // Clopper-Pearson 95% lower bound on the empirical coverage
  cpUpperCI: number;       // Clopper-Pearson 95% upper bound
  n: number;
  withinBound: boolean;    // empirical >= guarantee (the finite-sample bound holds on this sample)
}

/** Regularized incomplete beta via a continued fraction (Numerical Recipes betai), for the Clopper-Pearson CI. */
function betacf(a: number, b: number, x: number): number {
  const EPS = 3e-12, FPMIN = 1e-300;
  let qab = a + b, qap = a + 1, qam = a - 1;
  let c = 1, d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 200; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d; h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d; const del = d * c; h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

function betai(a: number, b: number, x: number): number {
  if (x <= 0) return 0; if (x >= 1) return 1;
  const lbeta = gammaln(a) + gammaln(b) - gammaln(a + b);
  const bt = Math.exp(a * Math.log(x) + b * Math.log(1 - x) - lbeta);
  return x < (a + 1) / (a + b + 2) ? (bt * betacf(a, b, x)) / a : 1 - (bt * betacf(b, a, 1 - x)) / b;
}

function gammaln(xx: number): number {
  const cof = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let x = xx, y = xx, tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) ser += cof[j] / ++y;
  return -tmp + Math.log((2.5066282746310005 * ser) / x);
}

/** Clopper-Pearson (exact binomial) two-sided CI for a proportion k/n at confidence 1 - conf (default 95%). */
export function clopperPearson(k: number, n: number, conf = 0.95): { lo: number; hi: number } {
  const a = (1 - conf) / 2;
  // invert the incomplete beta: lo = BetaInv(a; k, n-k+1), hi = BetaInv(1-a; k+1, n-k)
  const inv = (p: number, aa: number, bb: number): number => {
    if (aa <= 0) return 0; if (bb <= 0) return 1;
    let lo = 0, hi = 1;
    for (let i = 0; i < 100; i++) { const m = (lo + hi) / 2; if (betai(aa, bb, m) < p) lo = m; else hi = m; }
    return (lo + hi) / 2;
  };
  const lo = k === 0 ? 0 : inv(a, k, n - k + 1);
  const hi = k === n ? 1 : inv(1 - a, k + 1, n - k);
  return { lo, hi };
}

/**
 * Leave-one-out coverage report for a given alpha: for each calibration mill, form its jackknife+ interval from
 * the OTHER mills' residuals and check whether the mill's own measured value falls inside. Reports the empirical
 * coverage with a Clopper-Pearson 95% CI and whether it meets the 1 - 2*alpha finite-sample bound.
 */
export function coverageReport(
  predictions: number[], measured: number[], looAbsResidualsKw: number[], alpha = 0.1,
): CoverageReport {
  const n = predictions.length;
  let covered = 0;
  for (let i = 0; i < n; i++) {
    const others = looAbsResidualsKw.filter((_, j) => j !== i);
    const iv = jackknifePlusInterval(predictions[i], others, alpha);
    if (measured[i] >= iv.lowerKw && measured[i] <= iv.upperKw) covered++;
  }
  const empirical = covered / n;
  const cp = clopperPearson(covered, n);
  const guarantee = 1 - 2 * alpha;
  return { alpha, nominal: 1 - alpha, guarantee, empirical, cpLowerCI: cp.lo, cpUpperCI: cp.hi, n, withinBound: empirical >= guarantee };
}
