// Engine correctness — run with: node --import tsx --test test/mill.test.ts
//
// The physics is pinned against the published closed forms (Davis trajectories, Hogg-Fuerstenau power, Bond energy):
//   · critical speed Nc = 42.3/sqrt(D-d); · centrifuging onset at phiC >= 1; · the shoulder lifts higher as phiC rises;
//   · Hogg-Fuerstenau power peaks near J = 0.47 and scales as D^3.5 and vanishes at J = 0; · power is monotone in phiC;
//   · Bond W = 10*Wi*(1/sqrt(P80) - 1/sqrt(F80)); · charge mass = rho_c * pi R^2 L * J; · the control anchors hold.
// Everything is deterministic + analytic.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  bondWKwhT, CASES, caseById, chargeMassT, criticalSpeedRpm, evaluate, hoggFuerstenauKw,
} from '../src/mill/index.ts';
import type { Operating } from '../src/mill/index.ts';

const BALL: Operating = {
  millType: 'ball', diameterM: 4.0, lengthM: 6.0, fill: 0.35, phiC: 0.75, ballTopMm: 80,
  liftAngleDeg: 35, chargeDensity: 4.8, oreWi: 14, feedF80um: 2000, prodP80um: 150, tph: 120,
};

test('critical speed 42.3/sqrt(D-d) — closed form', () => {
  // D=5.0 m, d=100 mm=0.1 m -> 42.305/sqrt(4.9) = 19.11 rpm
  assert.ok(Math.abs(criticalSpeedRpm(5.0, 100) - 19.111) < 0.02, `Nc=${criticalSpeedRpm(5.0, 100)}`);
  // the ball CENTRE rides at radius (D-d)/2, so a BIGGER ball -> smaller effective radius -> HIGHER Nc
  assert.ok(criticalSpeedRpm(5.0, 200) > criticalSpeedRpm(5.0, 50), 'bigger ball -> higher Nc');
});

test('centrifuging onset at phiC >= 1; the regime bands', () => {
  assert.equal(evaluate({ ...BALL, phiC: 0.6 }).fracCentrifuging, 0, 'no centrifuging well below critical');
  const hi = evaluate({ ...BALL, phiC: 1.05 });
  assert.ok(hi.fracCentrifuging > 0, 'outer shells centrifuge above critical');
  assert.equal(hi.regime, 'centrifuging');
  assert.equal(evaluate({ ...BALL, phiC: 0.55 }).regime, 'cascading');
  assert.equal(evaluate({ ...BALL, phiC: 0.78 }).regime, 'cataracting');
  assert.equal(evaluate({ ...BALL, phiC: 0.3 }).regime, 'slumping');
});

test('shoulder lifts higher (smaller angle) as phiC rises', () => {
  const slow = evaluate({ ...BALL, phiC: 0.5 }).shoulderDeg;
  const fast = evaluate({ ...BALL, phiC: 0.85 }).shoulderDeg;
  assert.ok(fast < slow, `shoulder ${fast.toFixed(1)} (fast) < ${slow.toFixed(1)} (slow)`);
});

test('Hogg-Fuerstenau power peaks near J = 0.47', () => {
  let bestJ = 0;
  let bestP = -1;
  for (let J = 0.05; J <= 0.6; J += 0.005) {
    const p = hoggFuerstenauKw(4, 6, 4.8, 0.75, J, 35);
    if (p > bestP) { bestP = p; bestJ = J; }
  }
  assert.ok(Math.abs(bestJ - 0.4695) < 0.02, `power peaks at J=${bestJ.toFixed(3)} ~ 0.47`);
});

test('power scales as D^3.5 and vanishes at J = 0', () => {
  const p4 = hoggFuerstenauKw(4, 6, 4.8, 0.75, 0.35, 35);
  const p8 = hoggFuerstenauKw(8, 6, 4.8, 0.75, 0.35, 35);
  assert.ok(Math.abs(p8 / p4 - Math.pow(2, 3.5)) < 1e-6, 'P proportional to D^3.5');
  assert.equal(hoggFuerstenauKw(4, 6, 4.8, 0.75, 0, 35), 0, 'no charge -> no power');
});

test('power is monotone increasing in phiC (raw Hogg-Fuerstenau)', () => {
  assert.ok(hoggFuerstenauKw(4, 6, 4.8, 0.8, 0.35, 35) > hoggFuerstenauKw(4, 6, 4.8, 0.5, 0.35, 35));
});

test('Bond specific energy — closed form', () => {
  // 10*14*(1/sqrt(150) - 1/sqrt(2000)) = 8.30 kWh/t
  assert.ok(Math.abs(bondWKwhT(14, 2000, 150) - 8.30) < 0.05, `W=${bondWKwhT(14, 2000, 150)}`);
  assert.equal(bondWKwhT(14, 0, 150), 0, 'guard against bad sizes');
});

test('charge mass = rho_c * pi R^2 L * J', () => {
  const m = chargeMassT(4, 6, 0.35, 4.8);
  assert.ok(Math.abs(m - 4.8 * Math.PI * 4 * 6 * 0.35) < 1e-6);
});

test('the control cases hold their anchors', () => {
  assert.equal(evaluate(caseById('C-EMPTY').op).phfKw, 0, 'empty mill -> zero power');
  assert.ok(evaluate(caseById('C-CRITICAL').op).fracCentrifuging > 0, 'phiC=1 -> centrifuging onset');
  assert.equal(CASES.length, 10);
});
