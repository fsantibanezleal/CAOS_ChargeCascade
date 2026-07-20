// Engine correctness, run with: node --import tsx --test test/mill.test.ts
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

test('critical speed 42.3/sqrt(D-d), closed form', () => {
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

test('power scales as D^2.5 (first principles P=torque*omega) and vanishes at J = 0', () => {
  const p4 = hoggFuerstenauKw(4, 6, 4.8, 0.75, 0.35, 35);
  const p8 = hoggFuerstenauKw(8, 6, 4.8, 0.75, 0.35, 35);
  assert.ok(Math.abs(p8 / p4 - Math.pow(2, 2.5)) < 1e-6, 'P proportional to D^2.5');
  assert.equal(hoggFuerstenauKw(4, 6, 4.8, 0.75, 0, 35), 0, 'no charge -> no power');
});

test('power magnitude is industrially realistic (the 4x6 m reference ball mill ~1.3 MW)', () => {
  const p = hoggFuerstenauKw(4, 6, 4.8, 0.75, 0.35, 35);
  assert.ok(p > 800 && p < 1800, `4x6 m ball mill power ${p.toFixed(0)} kW should be ~1.0-1.5 MW, not 10x off`);
});

test('power is monotone increasing in phiC (raw Hogg-Fuerstenau)', () => {
  assert.ok(hoggFuerstenauKw(4, 6, 4.8, 0.8, 0.35, 35) > hoggFuerstenauKw(4, 6, 4.8, 0.5, 0.35, 35));
});

test('Bond specific energy, closed form', () => {
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

// --- T4: the inverse recommender (target -> phiC on the monotone exact engine) ---
test('solvePhiCForPower bisects to the target net power (round-trip)', async () => {
  const { solvePhiCForPower } = await import('../src/mill/inverse.ts');
  const sol = solvePhiCForPower(BALL, 1000);                 // ask for 1.0 MW
  assert.ok(sol.achievable && sol.phiC != null, 'should be achievable mid-range');
  const got = evaluate({ ...BALL, phiC: sol.phiC! }).phfKw;  // re-evaluate at the recommended phiC
  assert.ok(Math.abs(got - 1000) < 1.0, `round-trip power ${got} != 1000`);
  assert.ok(sol.phiC! > 0.3 && sol.phiC! < 1.05, 'phiC in range');
});

test('solvePhiCForPower flags an out-of-reach target (above the ceiling)', async () => {
  const { solvePhiCForPower } = await import('../src/mill/inverse.ts');
  const sol = solvePhiCForPower(BALL, sol0Max(BALL) * 2);    // ask for 2x the ceiling
  assert.equal(sol.achievable, false, 'beyond the ceiling -> not achievable');
});
function sol0Max(op: Operating): number { return evaluate({ ...op, phiC: 1.05 }).phfKw; }

test('solvePhiCForCapacity round-trips through P/W and reports the ceiling', async () => {
  const { solvePhiCForCapacity } = await import('../src/mill/inverse.ts');
  const w = bondWKwhT(BALL.oreWi, BALL.feedF80um, BALL.prodP80um);
  const midTph = (evaluate({ ...BALL, phiC: 1.05 }).phfKw / w) * 0.6;
  const sol = solvePhiCForCapacity(BALL, midTph);
  assert.ok(sol.achievable && sol.phiC != null, 'mid capacity achievable');
  const gotTph = evaluate({ ...BALL, phiC: sol.phiC! }).phfKw / w;
  assert.ok(Math.abs(gotTph - midTph) < 0.5, `round-trip tph ${gotTph} != ${midTph}`);
  assert.ok(sol.maxTph > sol.minTph, 'ceiling above floor');
});

test('recommendPhiCForRegime returns the band and marks centrifuging non-operational', async () => {
  const { recommendPhiCForRegime } = await import('../src/mill/inverse.ts');
  const cat = recommendPhiCForRegime(BALL, 'cataracting');
  assert.ok(cat.phiCRec != null && cat.operational, 'cataracting is operational');
  // the recommended phiC must actually classify as cataracting
  assert.equal(evaluate({ ...BALL, phiC: cat.phiCRec! }).regime, 'cataracting', 'rec phiC is cataracting');
  const cen = recommendPhiCForRegime(BALL, 'centrifuging');
  assert.equal(cen.operational, false, 'centrifuging is non-operational');
  // monotone ordering: cascading band sits below the cataracting band
  const cas = recommendPhiCForRegime(BALL, 'cascading');
  assert.ok(cas.phiCRec! < cat.phiCRec!, 'cascading below cataracting');
});

// --- T8: the bring-your-own-mill CONTRACT-1 gate (validateMill mirrors data-pipeline/cclab/io/contract.py) ---
test('validateMill accepts a clean descriptor with no flags', async () => {
  const { validateMill } = await import('../src/mill/contract.ts');
  const r = validateMill({ mill_type: 'ball', diameter_m: 5, length_m: 7, fill: 0.32, phi_c: 0.74, ball_top_mm: 75, charge_density: 4.6 });
  assert.equal(r.accepted, true);
  assert.equal(r.reason, null);
  assert.equal(r.flags.length, 0);
});

test('validateMill REJECTS ill-formed descriptors with a reason (never coerced)', async () => {
  const { validateMill } = await import('../src/mill/contract.ts');
  const base = { mill_type: 'ball', diameter_m: 5, length_m: 7, fill: 0.32, phi_c: 0.74, ball_top_mm: 75, charge_density: 4.6 };
  assert.equal(validateMill({ ...base, mill_type: 'gyratory' }).accepted, false);   // not a mill type
  assert.equal(validateMill({ ...base, diameter_m: 0 }).accepted, false);            // D must be > 0
  assert.equal(validateMill({ ...base, charge_density: -1 }).accepted, false);       // rho must be > 0
  assert.equal(validateMill({ ...base, fill: 0.7 }).accepted, false);                // fill not in [0,0.6]
  assert.equal(validateMill({ ...base, phi_c: 1.6 }).accepted, false);               // phi_c not in (0,1.5]
  assert.equal(validateMill({ ...base, phi_c: 0 }).accepted, false);                 // phi_c must be > 0
  assert.equal(validateMill({ ...base, ball_top_mm: 6000 }).accepted, false);        // ball >= mill diameter (6 m)
  assert.equal(validateMill({ ...base, diameter_m: NaN }).accepted, false);          // non-numeric
  assert.ok(validateMill({ ...base, mill_type: 'gyratory' }).reason);                // carries a reason
});

test('validateMill FLAGS plausible-but-honesty-relevant descriptors (accepted + flag)', async () => {
  const { validateMill } = await import('../src/mill/contract.ts');
  const base = { mill_type: 'ball', diameter_m: 5, length_m: 7, fill: 0.32, phi_c: 0.74, ball_top_mm: 75, charge_density: 4.6 };
  const cent = validateMill({ ...base, phi_c: 1.05 });
  assert.ok(cent.accepted && cent.flags.some((f) => /centrifug/i.test(f)));          // phi_c >= 1
  const over = validateMill({ ...base, phi_c: 0.9 });
  assert.ok(over.accepted && over.flags.some((f) => /over-speed/i.test(f)));         // 0.85 < phi_c < 1
  const crowd = validateMill({ ...base, fill: 0.5 });
  assert.ok(crowd.accepted && crowd.flags.some((f) => /crowding|45%/.test(f)));      // fill > 0.45
  const lean = validateMill({ ...base, fill: 0.1 });
  assert.ok(lean.accepted && lean.flags.some((f) => /ball-on-liner|15%/.test(f)));   // fill < 0.15
  const bigball = validateMill({ ...base, ball_top_mm: 300, diameter_m: 5 });
  assert.ok(bigball.accepted && bigball.flags.some((f) => /ball\/diameter/i.test(f))); // d >= 0.05 D
});

// Regression (issue #50): no cataract trajectory may be drawn OUTSIDE the shell wall. Before the fix, a
// near-critical inner shell's rising parabola bulged past R and the 2D/3D viz drew a line outside the mill.
test('no trajectory point leaves the shell wall across a phiC sweep (incl. near-critical)', async () => {
  const { chargeGeometry } = await import('../src/mill/charge.ts');
  for (const D of [4, 8, 10]) {
    const R = D / 2;
    const Ncrit = 42.305 / Math.sqrt(D);
    for (let phiC = 0.4; phiC <= 1.05; phiC += 0.05) {
      const omega = (phiC * Ncrit / 60) * 2 * Math.PI;
      const g = chargeGeometry(D, 80, omega, 9, 20);
      for (const sh of g.shells) for (const [X, Y] of sh.trajectory) {
        assert.ok(Math.hypot(X, Y) <= R + 1e-6, `D=${D} phiC=${phiC.toFixed(2)}: trajectory point at radius ${Math.hypot(X, Y).toFixed(3)} exceeds R=${R}`);
      }
    }
  }
});

// Real-data validation (issue #45): the HF net power, calibrated to the 8 Doll motor-basis mills, must generalize
// to a held-out real mill with a sane, honestly-reported leave-one-out error.
test('real-mill power calibration is validated by leave-one-out at a sane error', async () => {
  const { validationStats, allPredictions } = await import('../src/mill/realpower.ts');
  const { REAL_MILLS } = await import('../src/mill/realmills.ts');
  const s = validationStats();
  assert.ok(s.n >= 18, 'the Doll motor-basis mills form the calibration set (expanded to 19)');
  assert.ok(s.looMeanAbsPct < 12, `LOO mean abs error ${s.looMeanAbsPct.toFixed(1)}% should be under 12% (comparable to published models)`);
  assert.ok(s.looMaxAbsPct < 25, `LOO worst-case ${s.looMaxAbsPct.toFixed(1)}% under 25%`);
  assert.ok(s.r2 > 0.9, `motor fit R^2 ${s.r2.toFixed(3)} should exceed 0.9`);
  assert.ok(s.residSdKw > 0 && s.residSdKw < 2000, 'residual sd is a sane UQ band');
  // every mill produces a finite prediction + error, on its own basis
  const preds = allPredictions();
  assert.equal(preds.length, REAL_MILLS.length);
  assert.ok(preds.length >= 21, 'anchor expanded');
  for (const p of preds) {
    assert.ok(Number.isFinite(p.predicted) && p.predicted > 0, `${p.mill.id} predicted power finite+positive`);
    assert.ok(Math.abs(p.errPct) < 30, `${p.mill.id} error ${p.errPct.toFixed(1)}% within 30% on real data`);
  }
});

// Morrell C-model (issue #64, kinetic coefficient corrected 2026-07-19): must reproduce the Erdem (2004)
// cement-mill two-chamber worked example end to end. This validates the VERBATIM primary-source coefficients
// (Erdem 2004 Eq 3 / CEEC 2019 Eq 2): the cylinder kinetic is pi^3, NOT (2*pi)^3, and the gravity term carries
// a leading pi. The strongest evidence the coefficients are right is that ONE charge density reproduces BOTH
// chambers' published net (the older (2*pi)^3 pin required two different densities, hidden by a fitted 4.209).
test('Morrell C-model reproduces the Erdem 2004 two-chamber worked example (verbatim pi^3 coefficients)', async () => {
  const { morrellPower } = await import('../src/mill/morrell.ts');
  const { morrellMeanAbsPct } = await import('../src/mill/realpower.ts');
  const ch1 = { diameterM: 3.27, lengthM: 3.60, phiC: 0.7267, fill: 0.2748 };
  const ch2 = { diameterM: 3.27, lengthM: 7.00, phiC: 0.7267, fill: 0.2663 };

  // (1) no-load reproduces Erdem's two chambers to <0.5% (independent of charge density)
  const nl1 = morrellPower({ ...ch1, rhoCOverride: 3.96 }).noLoadKw;
  const nl2 = morrellPower({ ...ch2, rhoCOverride: 3.96 }).noLoadKw;
  assert.ok(Math.abs(nl1 - 41.94) / 41.94 < 0.005, `Erdem ch1 no-load ${nl1.toFixed(2)} vs 41.94`);
  assert.ok(Math.abs(nl2 - 72.35) / 72.35 < 0.005, `Erdem ch2 no-load ${nl2.toFixed(2)} vs 72.35`);

  // (2) THE KEY TEST: the charge density that reproduces ch1's published net (341.97) and the density that
  // reproduces ch2's (650.69) must agree within 1%. net is linear in rhoC, so solve directly.
  const densFor = (ch: typeof ch1, targetNet: number) => {
    const unit = morrellPower({ ...ch, rhoCOverride: 1.0 }).netKw; // net at rhoC=1
    return targetNet / unit;
  };
  const rho1 = densFor(ch1, 341.97), rho2 = densFor(ch2, 650.69);
  assert.ok(Math.abs(rho1 - rho2) / rho2 < 0.01, `one density fits both chambers: ${rho1.toFixed(3)} vs ${rho2.toFixed(3)} t/m3`);
  assert.ok(rho1 > 3.9 && rho1 < 4.05, `fitted density ${rho1.toFixed(3)} is Erdem's ~3.96 (not the old wrong 4.209)`);

  // (3) physics guard: the cylinder motion is GRAVITY-dominated (kin/grav well below 0.2). A regression to the
  // old (2*pi)^3 form inverts this to kinetic-dominated and this assertion catches it.
  const r = morrellPower({ ...ch1, rhoCOverride: rho1 });
  assert.ok(r.cylKw > 0, 'cylinder power positive');
  // net at the fitted density reproduces the published 341.97
  assert.ok(Math.abs(r.netKw - 341.97) / 341.97 < 0.01, `Erdem ch1 net @ fitted rho ${r.netKw.toFixed(1)} vs 341.97`);

  // (4) gross of the WHOLE two-chamber mill = total no-load + 1.26*total net at the shared density ~3.96
  const rhoS = (rho1 + rho2) / 2;
  const g1 = morrellPower({ ...ch1, rhoCOverride: rhoS }), g2 = morrellPower({ ...ch2, rhoCOverride: rhoS });
  const gross = g1.noLoadKw + g2.noLoadKw + 1.26 * (g1.netKw + g2.netKw);
  assert.ok(Math.abs(gross - 1365.04) / 1365.04 < 0.02, `Erdem two-chamber gross ${gross.toFixed(1)} vs 1365.04`);

  // the uncalibrated Morrell error on the real mills stays sane (comparable to the published ~9.8% benchmark)
  const me = morrellMeanAbsPct();
  assert.ok(me < 18, `Morrell mean abs error on real mills ${me.toFixed(1)}% under 18%`);
});

test('the expanded real anchor keeps a robust leave-one-out error', async () => {
  const { validationStats, allPredictions } = await import('../src/mill/realpower.ts');
  const s = validationStats();
  assert.ok(s.n >= 18, `motor-basis anchor grew to ${s.n} mills (was 8)`);
  assert.ok(s.looMeanAbsPct < 10, `LOO mean ${s.looMeanAbsPct.toFixed(1)}% stays under 10% on the larger set`);
  assert.ok(s.r2 > 0.95, `R^2 ${s.r2.toFixed(3)} stays high`);
  assert.ok(allPredictions().length >= 21, 'total anchor >= 21 mills');
});
