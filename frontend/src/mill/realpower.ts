// Real-data power validation (issue #45, the novel rung): the App's Hogg-Fuerstenau NET power is a first-principles
// charge-motion model. This module calibrates it to REAL measured industrial power and reports the honest,
// leave-one-out cross-validated error, so the Real-sample lane shows a genuine "how good is the model on real
// mills" number, not a paper-accuracy claim transplanted onto real data.
//
// Two bases (the mills carry which one applies):
//   'motor' (Doll PDCS, motor input): measured = a + b * HF_net. The linear calibration absorbs the average
//           no-load + drivetrain grossing that HF net (charge-motion only) does not include. Fitted on the 8
//           Doll mills (one consistent basis), leave-one-out validated.
//   'net'   (PPMP net power): HF net is compared DIRECTLY (no grossing), since both are net charge-motion power.
//
// Every number here is derived from REAL_MILLS at module load (8-point fit, deterministic); nothing is baked by a
// separate tool, so it cannot drift from the data.

import { evaluate } from './engine.ts';
import { morrellPower } from './morrell.ts';
import { REAL_MILLS, realMillToOperating, type RealMill } from './realmills.ts';

export interface Prediction {
  mill: RealMill;
  hfNet: number;        // Hogg-Fuerstenau net charge-motion power [kW]
  predicted: number;    // HF-calibrated prediction on the mill's basis [kW]
  measured: number;     // the surveyed value [kW]
  errPct: number;       // signed relative error of the calibrated HF (predicted-measured)/measured * 100
  morrell: number;      // the INDEPENDENT (uncalibrated) Morrell C-model prediction on the mill's basis [kW]
  morrellErrPct: number;
}

/** The Morrell C-model prediction for a real mill, on its power basis (motor->gross, net->net). Uncalibrated,
 *  first-principles: the real SOTA reference beside the data-calibrated HF. */
export function morrellKw(m: RealMill): number {
  const r = morrellPower({
    diameterM: m.diameterM, lengthM: m.lengthM, phiC: m.pctCritical, fill: m.jTotal, ballFill: m.jBalls,
    rhoOre: m.rhoOre, coneAllowanceFrac: m.type === 'ball' ? 0 : 0.05,
  });
  return m.basis === 'motor' ? r.grossKw : r.netKw;
}

interface LinFit { a: number; b: number }

function linfit(pts: Array<{ x: number; y: number }>): LinFit {
  const n = pts.length;
  const sx = pts.reduce((s, p) => s + p.x, 0), sy = pts.reduce((s, p) => s + p.y, 0);
  const sxx = pts.reduce((s, p) => s + p.x * p.x, 0), sxy = pts.reduce((s, p) => s + p.x * p.y, 0);
  const b = (n * sxy - sx * sy) / (n * sxx - sx * sx);
  return { a: (sy - b * sx) / n, b };
}

/** HF net power for a real mill (the existing engine). */
export function hfNetKw(m: RealMill): number {
  return evaluate(realMillToOperating(m)).phfKw;
}

const MOTOR = REAL_MILLS.filter((m) => m.basis === 'motor');
/** the motor-input calibration, fitted once on the Doll mills. */
export const CALIBRATION: LinFit = linfit(MOTOR.map((m) => ({ x: hfNetKw(m), y: m.measuredKw })));

/** Predict a mill's power on its own basis. */
export function predictKw(m: RealMill): number {
  const hf = hfNetKw(m);
  return m.basis === 'motor' ? CALIBRATION.a + CALIBRATION.b * hf : hf;
}

export function predictionFor(m: RealMill): Prediction {
  const hf = hfNetKw(m);
  const predicted = predictKw(m);
  const morrell = morrellKw(m);
  return {
    mill: m, hfNet: hf, predicted, measured: m.measuredKw,
    errPct: (predicted - m.measuredKw) / m.measuredKw * 100,
    morrell, morrellErrPct: (morrell - m.measuredKw) / m.measuredKw * 100,
  };
}

/** Mean absolute error of the UNCALIBRATED Morrell C-model over all real mills (its independent skill). */
export function morrellMeanAbsPct(): number {
  const p = allPredictions();
  return p.reduce((s, x) => s + Math.abs(x.morrellErrPct), 0) / p.length;
}

export function allPredictions(): Prediction[] {
  return REAL_MILLS.map(predictionFor);
}

export interface ValidationStats {
  n: number;
  looMeanAbsPct: number;   // leave-one-out mean absolute error, the honest generalization number
  looMaxAbsPct: number;
  residSdKw: number;       // residual standard deviation of the motor fit, the UQ band (kW)
  r2: number;              // fit R^2 on the motor mills
}

/** Leave-one-out validation of the motor-basis calibration + the fit quality (the model's real-data skill). */
export function validationStats(): ValidationStats {
  const pts = MOTOR.map((m) => ({ x: hfNetKw(m), y: m.measuredKw }));
  // leave-one-out: refit without each mill, predict it, accumulate the absolute % error
  const errs: number[] = [];
  for (let i = 0; i < pts.length; i++) {
    const train = pts.filter((_, j) => j !== i);
    const f = linfit(train);
    const pred = f.a + f.b * pts[i].x;
    errs.push(Math.abs(pred - pts[i].y) / pts[i].y * 100);
  }
  // residual sd + R^2 on the full motor fit
  const f = CALIBRATION;
  const resid = pts.map((p) => p.y - (f.a + f.b * p.x));
  const residSd = Math.sqrt(resid.reduce((s, e) => s + e * e, 0) / (pts.length - 2));
  const ybar = pts.reduce((s, p) => s + p.y, 0) / pts.length;
  const ssTot = pts.reduce((s, p) => s + (p.y - ybar) ** 2, 0);
  const ssRes = resid.reduce((s, e) => s + e * e, 0);
  return {
    n: MOTOR.length,
    looMeanAbsPct: errs.reduce((s, e) => s + e, 0) / errs.length,
    looMaxAbsPct: Math.max(...errs),
    residSdKw: residSd,
    r2: 1 - ssRes / ssTot,
  };
}
