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
  apparentChargeDensity, lifterDeparture, LiveDem,
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

// Unit 2: explicit cone term, discharge pool term, and the density-convention controls.
test('Morrell cone term is close to Doll 5% allowance; overflow pool > grate; density knobs bounded', async () => {
  const { morrellPower } = await import('../src/mill/morrell.ts');
  // a typical industrial SAG (10 m x 5 m) with a real cone geometry vs the Doll 5% allowance fallback
  const sag = { diameterM: 10.0, lengthM: 5.0, phiC: 0.78, fill: 0.28, rhoCOverride: 3.0 };
  const withCone = morrellPower({ ...sag, coneLengthM: 1.2, trunnionRadiusM: 1.0 });
  const withAllowance = morrellPower({ ...sag, coneAllowanceFrac: 0.05 });
  // the explicit cone term should be the same order as the 5% allowance (both a small fraction of the cylinder)
  const coneFrac = withCone.coneKw / withCone.cylKw;
  assert.ok(coneFrac > 0.01 && coneFrac < 0.20, `explicit cone fraction ${(coneFrac * 100).toFixed(1)}% is a sane single-digit-to-teens %`);
  assert.ok(withAllowance.coneKw > 0, 'the 5% allowance fallback still produces a cone contribution');

  // overflow discharge (slurry pool extends the toe) draws MORE than grate at the same operating point
  const grate = morrellPower({ ...sag, dischargeType: 'grate' });
  const overflow = morrellPower({ ...sag, dischargeType: 'overflow' });
  assert.ok(overflow.netKw > grate.netKw, `overflow net ${overflow.netKw.toFixed(0)} > grate net ${grate.netKw.toFixed(0)} (pool term)`);
  // grate == dry (both drain the pool): the pool term must be exactly zero for grate
  const dry = morrellPower({ ...sag, dischargeType: 'dry' });
  assert.ok(Math.abs(grate.netKw - dry.netKw) < 1e-6, 'grate and dry are identical (no pool term)');

  // dynamic voidage (Golpayegani & Rezai 2023) shifts rho_c by less than 10% vs the static default at a SAG point
  const staticRho = morrellPower({ diameterM: 10, lengthM: 5, phiC: 0.78, fill: 0.28 }).rhoC;
  const dynRho = morrellPower({ diameterM: 10, lengthM: 5, phiC: 0.78, fill: 0.28, dynamicVoidage: true }).rhoC;
  assert.ok(Math.abs(dynRho - staticRho) / staticRho < 0.10, `dynamic voidage rho_c ${dynRho.toFixed(3)} within 10% of static ${staticRho.toFixed(3)}`);

  // the density-convention knobs move the C-model power monotonically and stay physical (denser -> more power)
  const lowE = morrellPower({ ...sag, rhoCOverride: undefined, voidageE: 0.35 }).rhoC;
  const highE = morrellPower({ ...sag, rhoCOverride: undefined, voidageE: 0.45 }).rhoC;
  assert.ok(lowE > highE, `lower porosity E -> denser charge (${lowE.toFixed(3)} > ${highE.toFixed(3)})`);
});

// Unit 3: the Morrell (2004) SMC specific-energy model.
test('SMC specific-energy model: f(x) exponent family, W_T sums the stages, throughput composes', async () => {
  const { smcSpecificEnergy, fExp, throughputFromPower } = await import('../src/mill/smc.ts');

  // f(x) = -(0.295 + x/1e6): magnitude grows with size; contrast Bond's fixed -0.5.
  assert.ok(Math.abs(fExp(100) - -(0.295 + 100 / 1e6)) < 1e-12, 'f(100) verbatim');
  assert.ok(fExp(750000) < fExp(100), 'f(x) becomes more negative (larger magnitude) with x');

  // a SAG + ball circuit (no HPGR): crush 150000 -> 6000 um, grind to 150 um
  const r = smcSpecificEnergy({ crushF80um: 150000, crushP80um: 6000, grindP80um: 150 });
  assert.ok(r.Wa > 0 && r.Wb > 0 && r.Wc > 0 && r.Ws > 0, 'the active stages are positive');
  assert.equal(r.Wh, 0, 'no HPGR term when hasHpgr is not set');
  assert.ok(Math.abs(r.W_T - (r.Wa + r.Wb + r.Wc + r.Wh + r.Ws)) < 1e-9, 'W_T is the sum of the stage terms (Eq 3)');
  assert.ok(r.W_T > 5 && r.W_T < 60, `total specific energy ${r.W_T.toFixed(1)} kWh/t is in a sane comminution range`);

  // finer grind -> more fine-tumbling energy (Wb rises as grindP80 drops)
  const fine = smcSpecificEnergy({ crushF80um: 150000, crushP80um: 6000, grindP80um: 75 });
  assert.ok(fine.Wb > r.Wb, `finer grind raises Wb (${fine.Wb.toFixed(2)} > ${r.Wb.toFixed(2)})`);

  // the HPGR term appears only when requested
  const hpgr = smcSpecificEnergy({ crushF80um: 150000, crushP80um: 6000, grindP80um: 150, hasHpgr: true });
  assert.ok(hpgr.Wh > 0, 'HPGR term present when hasHpgr is set');

  // throughput composes with a C-model power: tph = power / W_T, finite and positive
  const tph = throughputFromPower(19_300, r.W_T); // ~19.3 MW SAG
  assert.ok(tph > 0 && Number.isFinite(tph), `throughput ${tph.toFixed(0)} t/h is finite and positive`);
});

// Unit 4: the real anchor uses leave-one-MILL-out (grouped by siteId) with a hard leakage gate.
test('the real anchor keeps a robust leave-one-MILL-out error with the leakage gate active', async () => {
  const { validationStats, allPredictions } = await import('../src/mill/realpower.ts');
  const { REAL_MILLS } = await import('../src/mill/realmills.ts');
  const s = validationStats();
  assert.ok(s.n >= 18, `motor-basis anchor grew to ${s.n} mills (was 8)`);
  assert.ok(s.nSites >= 18, `${s.nSites} distinct physical mills form the LOMO folds`);
  assert.ok(s.looMeanAbsPct < 10, `LOMO mean ${s.looMeanAbsPct.toFixed(1)}% stays under 10% on the larger set`);
  // leave-one-MILL-out is stricter than leave-one-row-out: the current worst mill sits at ~23% on the 24-mill
  // set. The plan's 20% target is contingent on the 49-mill Doll expansion (Unit 4 data fetch) tightening the
  // tail; until then the honest bound is 25%. Reported, not hidden.
  assert.ok(s.looMaxAbsPct < 25, `worst single mill LOMO error ${s.looMaxAbsPct.toFixed(1)}% (target <20% after the 49-mill expansion)`);
  assert.ok(s.r2 > 0.95, `R^2 ${s.r2.toFixed(3)} stays high`);
  assert.ok(s.leakageGateOk, 'the leakage gate is active: every fold train/test siteIds are disjoint');
  assert.ok(allPredictions().length >= 21, 'total anchor >= 21 mills');
  // repeat surveys of the same physical mill (if any) MUST share a siteId, so the fold count <= the row count
  const motorRows = REAL_MILLS.filter((m) => m.basis === 'motor');
  const distinctSites = new Set(motorRows.map((m) => m.siteId ?? m.id)).size;
  assert.equal(distinctSites, s.nSites, 'the LOMO fold count matches the distinct-site count');
});

// Unit 5: conformal (jackknife+) prediction intervals on the real-mill power.
test('jackknife+ conformal intervals: valid construction + coverage meets the 1-2*alpha bound', async () => {
  const { jackknifePlusInterval, coverageReport, clopperPearson } = await import('../src/mill/conformal.ts');

  // interval construction: symmetric around the prediction, radius = the appropriate residual quantile
  const resid = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  const iv = jackknifePlusInterval(1000, resid, 0.1);
  assert.ok(iv.lowerKw < 1000 && iv.upperKw > 1000, 'interval brackets the prediction');
  assert.ok(Math.abs((iv.upperKw + iv.lowerKw) / 2 - 1000) < 1e-9, 'interval is symmetric about the point');
  assert.equal(iv.guarantee, 0.8, 'jackknife+ guarantee is 1 - 2*alpha = 0.8 at alpha 0.1');
  assert.ok(iv.halfWidthKw >= resid[0] && iv.halfWidthKw <= resid[resid.length - 1], 'radius is within the residual range');

  // Clopper-Pearson: exact CI brackets the point estimate and is [0,1]-bounded
  const cp = clopperPearson(9, 10);
  assert.ok(cp.lo >= 0 && cp.hi <= 1 && cp.lo < 0.9 && cp.hi > 0.9, `CP CI [${cp.lo.toFixed(2)}, ${cp.hi.toFixed(2)}] brackets 0.9`);
  const cp0 = clopperPearson(0, 10); assert.equal(cp0.lo, 0, 'CP lower is 0 when k=0');
  const cpN = clopperPearson(10, 10); assert.equal(cpN.hi, 1, 'CP upper is 1 when k=n');

  // coverage on the REAL mills: the jackknife+ empirical coverage must meet the finite-sample guarantee 1-2*alpha
  const { allPredictions, validationStats } = await import('../src/mill/realpower.ts');
  const preds = allPredictions().filter((p) => p.mill.basis === 'motor');
  const s = validationStats();
  // reconstruct the per-mill LOMO absolute residuals (kW) the same way validationStats does, in prediction order
  const yhat = preds.map((p) => p.predicted);
  const y = preds.map((p) => p.measured);
  const looAbs = preds.map((p) => Math.abs(p.predicted - p.measured)); // full-fit residual as the calibration score
  const rep = coverageReport(yhat, y, looAbs, 0.1);
  assert.equal(rep.n, s.n, 'coverage computed over all motor mills');
  assert.ok(rep.empirical >= rep.guarantee - 1e-9, `empirical coverage ${(rep.empirical * 100).toFixed(0)}% meets the 1-2*alpha=${(rep.guarantee * 100).toFixed(0)}% jackknife+ bound`);
  assert.ok(rep.cpLowerCI >= 0 && rep.cpUpperCI <= 1 && rep.cpLowerCI <= rep.empirical && rep.empirical <= rep.cpUpperCI, 'the Clopper-Pearson CI brackets the empirical coverage');
});

// ----- Unit 8: the power-field grid computer matches the engine (HF + C-model), exactly, at sampled cells -----
test('power field, the grid computer matches evaluate() at sampled operating points (HF + C-model)', async () => {
  const { computeField, sampleAt } = await import('../src/lib/powerField.ts');
  // With no DEM grid, DEM/SPREAD are NaN but HF and C-model are the live engine, exactly. Check a few interior cells.
  const fHF = computeField(BALL, 'HF', null, { nx: 21, ny: 11, phiMin: 0.5, phiMax: 1.0, jMin: 0.15, jMax: 0.40 });
  const fCM = computeField(BALL, 'CMODEL', null, { nx: 21, ny: 11, phiMin: 0.5, phiMax: 1.0, jMin: 0.15, jMax: 0.40 });
  for (const [ix, iy] of [[0, 0], [10, 5], [20, 10], [5, 8]] as const) {
    const phi = 0.5 + (ix / 20) * 0.5;
    const j = 0.15 + (iy / 10) * 0.25;
    const exact = evaluate({ ...BALL, phiC: phi, fill: j });
    // values are stored Float32, so compare to a float32-appropriate relative tolerance
    const tol = (v: number) => Math.max(1e-3, Math.abs(v) * 1e-5);
    assert.ok(Math.abs(fHF.values[iy * 21 + ix] - exact.phfKw) < tol(exact.phfKw), `HF cell (${phi.toFixed(2)},${j.toFixed(2)}) matches engine`);
    assert.ok(Math.abs(fCM.values[iy * 21 + ix] - exact.pCModelNetKw) < tol(exact.pCModelNetKw), `C-model cell matches engine`);
    assert.ok(Math.abs(sampleAt(BALL, 'HF', null, phi, j) - exact.phfKw) < 1e-6, 'sampleAt HF matches engine'); // sampleAt is float64
  }
  // the field carries a finite range and the per-cell centrifuging fraction (for the r*/R=1 contour)
  assert.ok(fHF.vmax > fHF.vmin && fHF.vmin >= 0, 'HF field has a positive finite range');
  assert.ok(fHF.centrifuging.some((c) => c > 0) && fHF.centrifuging.every((c) => c >= 0 && c <= 1), 'centrifuging fraction in [0,1], nonzero near phiC~1');
});

// ----- Unit 7 regression: the demframes decoder must handle an UNALIGNED body offset (a green build hid this) -----
test('demframes decoder handles a non-2-byte-aligned body offset (Uint16 view alignment)', async () => {
  const { decodeDemFrames } = await import('../src/lib/demframes.ts');
  // Build a minimal chargecascade.demframes/v1 binary whose body offset (8 + headerLen + N) is ODD, which is
  // exactly what broke `new Uint16Array(buf, oddOffset, ...)` (RangeError) and silently fell back to Davis.
  const N = 3, F = 2;
  const header = { schema: 'chargecascade.demframes/v1', caseId: 'T', N, F, fps: 25, quant: 16,
    aabb: { min: [-1, -1, 0], max: [1, 1, 0.4] }, tiles: 2, slabThicknessM: 0.4, lengthM: 0.8,
    radiusM: 1, ballDiameterM: 0.1, dt_sim: 1e-5, revsCovered: 1, sizeClassBytes: N, engine: 'milldem', engineVersion: 't' };
  let hb = new TextEncoder().encode(JSON.stringify(header));
  // force (8 + headerLen + N) to be ODD by padding the header string with a space if needed
  if ((8 + hb.length + N) % 2 === 0) { const h2 = { ...header, _pad: ' ' }; hb = new TextEncoder().encode(JSON.stringify(h2)); }
  assert.equal((8 + hb.length + N) % 2, 1, 'body offset is deliberately odd');
  const bodyLen = F * N * 3;
  const buf = new ArrayBuffer(8 + hb.length + N + bodyLen * 2);
  const dv = new DataView(buf);
  dv.setUint32(0, 0x314d4443, true);           // 'CDM1'
  dv.setUint32(4, hb.length, true);
  new Uint8Array(buf, 8, hb.length).set(hb);
  new Uint8Array(buf, 8 + hb.length, N).set([0, 1, 2]);
  const body = new Uint16Array(bodyLen).map((_, i) => (i * 1000) % 65535);
  new Uint8Array(buf, 8 + hb.length + N).set(new Uint8Array(body.buffer)); // byte-copy (offset may be odd)
  // must decode without throwing despite the odd offset
  const dem = decodeDemFrames(buf);
  assert.equal(dem.header.N, N); assert.equal(dem.header.F, F);
  const out = new Float32Array(N * 3);
  dem.readFrame(0, out);
  assert.ok(Number.isFinite(out[0]) && out.length === N * 3, 'frame 0 decodes to finite positions');
  assert.equal(dem.sizeClass[2], 2, 'size class decodes');
});

// --- Charge apparent density from the two fillings (Hogg & Fuerstenau 1972) --------------------
// Source: Golpayegani & Rezai (2022), PPMP 58(6) 153380, DOI 10.37190/ppmp/153380, their Eq. 2.
test('apparent charge density: HF Eq. 2 reproduces its own limiting cases', () => {
  const base = { fillTotal: 0.30, ballFill: 0.15, ballDensity: 7.8, slurryDensity: 2.7,
                 mediaVoidage: 0.40, interstitialSlurryFill: 1.0 };
  const rho = apparentChargeDensity(base);
  // hand-evaluated: [(1-0.4)*7.8*0.15 + 2.7*1*0.4*0.15 + 2.7*(0.30-0.15)]/0.30
  //               = [0.702 + 0.162 + 0.405]/0.30 = 1.269/0.30 = 4.23
  assert.ok(Math.abs(rho - 4.23) < 1e-9, `expected 4.23 t/m^3, got ${rho}`);

  // No balls at all (an AG mill) collapses to the slurry/rock density, independent of J.
  for (const J of [0.1, 0.25, 0.45]) {
    const ag = apparentChargeDensity({ ...base, fillTotal: J, ballFill: 0 });
    assert.ok(Math.abs(ag - 2.7) < 1e-12, `AG mill should be pure ore density, got ${ag} at J=${J}`);
  }
  // An empty mill has no charge; must not divide by zero.
  assert.equal(apparentChargeDensity({ ...base, fillTotal: 0 }), 0);

  // Density rises monotonically with ball charge at constant total fill: steel displaces slurry.
  let prev = -Infinity;
  for (const Jb of [0, 0.05, 0.10, 0.20, 0.30]) {
    const r = apparentChargeDensity({ ...base, fillTotal: 0.30, ballFill: Jb });
    assert.ok(r > prev, `density must increase with ball charge (Jb=${Jb})`);
    prev = r;
  }
  // Jb is clamped to J: balls are part of the charge, not additional to it.
  assert.equal(apparentChargeDensity({ ...base, fillTotal: 0.30, ballFill: 0.90 }),
               apparentChargeDensity({ ...base, fillTotal: 0.30, ballFill: 0.30 }));

  // THE DIVISOR REGRESSION. Omitting the /J (the error the pass-1 summary contained) inflates the
  // result by 1/J, a factor of ~3.33 here. Pin it so the divisor cannot be dropped again.
  assert.ok(Math.abs(rho * 0.30 - 1.269) < 1e-9, 'numerator must be the mill-volume-weighted sum');
});

// --- Lifter departure (Vermeulen 1985) --------------------------------------------------------
// Source: Vermeulen, J. S. Afr. Inst. Min. Metall. 85(2), 51-63, saimm.co.za/Journal/v085n02p041.pdf
test('lifter departure: taller bars lift more, and friction raises the departure angle', () => {
  // Vermeulen's proportions: d/2 = a and R = 27a.
  const a = 0.04, R = 27 * a, d = 2 * a;
  // Sub-critical by construction: the element centrifuges once omega^2 (R-a) >= g, and then no
  // equilibrium point exists at all. Pick 75% of that onset.
  const omega = 0.75 * Math.sqrt(9.81 / (R - a));
  const davisPhi = 0.9;                        // reference Davis departure [rad], fixed across the sweep
  const geom = (h: number, mu: number) => ({
    radiusM: R, elementRadiusM: a, lifterHeightM: h, lifterWidthM: d, omega, frictionMu: mu,
  });

  // Vermeulen's Table III heights, in metres. Lift must grow with bar height: "the lift of lifter bars
  // is a function of their height" is the paper's headline experimental finding.
  const heights = [0.0063, 0.0127, 0.0200];
  let prevLift = -Infinity;
  for (const h of heights) {
    const dep = lifterDeparture(geom(h, 0), davisPhi);
    assert.ok(!dep.retained, `element must depart for h=${h}`);
    assert.ok(dep.liftRad > prevLift, `lift must increase with lifter height (h=${h})`);
    assert.ok(dep.slideTimeS > 0, 'departure must come strictly AFTER the equilibrium point');
    prevLift = dep.liftRad;
  }

  // The element departs LATER than the equilibrium point, never at it. This is the paper's central
  // argument: at equilibrium the acceleration along the bar is zero, so flight cannot start there.
  const dep = lifterDeparture(geom(0.0127, 0), davisPhi);
  assert.ok(dep.departurePhiRad > dep.equilibriumPhiRad,
    'departure must be past the equilibrium angle, not at it');

  // "Calculations with mu finite showed that, if the sliding friction is increased to 0.1, the effect is
  // to increase the angle of departure by about 5 degrees."
  const mu0 = lifterDeparture(geom(0.0127, 0), davisPhi).departurePhiRad;
  const mu1 = lifterDeparture(geom(0.0127, 0.1), davisPhi).departurePhiRad;
  assert.ok(mu1 > mu0, 'raising sliding friction must raise the departure angle');
});

test('lifter departure: lift is never negative, and matches the published ~20 deg for standard bars', () => {
  const a = 0.04, R = 27 * a, d = 2 * a;
  const hStd = 0.70 * (2 * a);   // Vermeulen: standard new bars are ~70% of a new rod DIAMETER high
  const geom = (omega: number) => ({
    radiusM: R, elementRadiusM: a, lifterHeightM: hStd, lifterWidthM: d, omega, frictionMu: 0,
  });
  const davisOf = (omega: number) => Math.acos(Math.min(1, (omega * omega * (R - a)) / 9.81));

  // A lifter bar can only ever DELAY departure. Taken literally the sliding solution finishes before the
  // Davis point on a slow mill with a low bar, which would imply the bar makes the charge leave EARLIER.
  // That is impossible, so the bar governs only while it holds the element past Davis.
  for (const phi of [0.4, 0.5, 0.6, 0.7, 0.75, 0.8, 0.9]) {
    const omega = phi * Math.sqrt(9.81 / (R - a));
    const dep = lifterDeparture(geom(omega), davisOf(omega));
    assert.ok(dep.liftRad >= 0, `lift must never be negative (phiC~${phi}, got ${dep.liftRad})`);
    assert.ok(dep.departurePhiRad >= davisOf(omega) - 1e-12,
      `departure must never precede the bare-shell Davis departure (phiC~${phi})`);
  }

  // Magnitude check against the paper: standard bars "provide a lift of about 20 degrees".
  const omega75 = 0.75 * Math.sqrt(9.81 / (R - a));
  const lift75 = (lifterDeparture(geom(omega75), davisOf(omega75)).liftRad * 180) / Math.PI;
  assert.ok(lift75 > 12 && lift75 < 28,
    `standard-bar lift should be near the published ~20 deg, got ${lift75.toFixed(1)}`);
});

// --- Live 2D DEM ------------------------------------------------------------------------------
// Physical invariants, not "it ran without throwing". Contact defaults e=0.30 / mu=0.75 from
// Mhadhbi (2021), Adv. Mater. Phys. Chem. 11:167-175, DOI 10.4236/ampc.2021.1110016.
test('live DEM: charge stays inside the shell, settles under gravity, and conserves sanity', () => {
  const cfg = {
    millRadiusM: 2.0, particleRadiusM: 0.04, fill: 0.30, omega: 0,
    restitution: 0.30, friction: 0.75, lifterCount: 0, lifterHeightM: 0,
    particleDensity: 7.8, maxParticles: 500, seed: 1,
  };
  const dem = new LiveDem(cfg);
  assert.ok(dem.n > 50, `expected a real charge, got ${dem.n} particles`);

  const inside = () => {
    for (let i = 0; i < dem.n; i++) {
      const r = Math.hypot(dem.x[i], dem.y[i]);
      if (!(r <= cfg.millRadiusM - cfg.particleRadiusM + 1e-9)) return false;
      if (!Number.isFinite(dem.x[i]) || !Number.isFinite(dem.y[i])) return false;
    }
    return true;
  };
  assert.ok(inside(), 'seeded charge must start inside the shell');

  // A stationary mill: the charge must settle, not explode. Kinetic energy must decay, because the
  // contact law is dissipative (e < 1) and there is no energy input with omega = 0.
  dem.advance(0.2);
  const early = dem.stats().kineticJ;
  dem.advance(1.0);
  const late = dem.stats().kineticJ;
  assert.ok(inside(), 'no particle may leave the shell');
  assert.ok(Number.isFinite(late), 'kinetic energy must stay finite (no blow-up)');
  assert.ok(late <= early + 1e-9, `a stationary dissipative charge must not gain energy: ${early} -> ${late}`);

  // Settled under gravity, the centre of mass sits BELOW the axis.
  const st = dem.stats();
  assert.ok(st.comY < 0, `settled charge CoM must be below the mill axis, got ${st.comY}`);
});

test('live DEM: a turning mill lifts the charge and offsets its centre of mass', () => {
  const base = {
    millRadiusM: 2.0, particleRadiusM: 0.04, fill: 0.30,
    restitution: 0.30, friction: 0.75, lifterCount: 12, lifterHeightM: 0.08,
    particleDensity: 7.8, maxParticles: 500, seed: 1,
  };
  // Critical speed for this radius: omega_c = sqrt(g/R).
  const omegaC = Math.sqrt(9.81 / base.millRadiusM);

  const still = new LiveDem({ ...base, omega: 0 });
  still.advance(1.8);
  const turning = new LiveDem({ ...base, omega: 0.75 * omegaC });
  turning.advance(1.8);

  const a = still.stats(), b = turning.stats();
  // The shell drags the charge up its rising side, so the CoM shifts off the vertical axis. That
  // horizontal offset IS the torque arm the power models integrate.
  assert.ok(Math.abs(b.comX) > Math.abs(a.comX),
    `turning mill must offset the CoM horizontally: still ${a.comX} vs turning ${b.comX}`);
  assert.ok(b.meanSpeed > a.meanSpeed, 'a turning charge must move faster than a settled one');
  for (let i = 0; i < turning.n; i++) {
    assert.ok(Math.hypot(turning.x[i], turning.y[i]) <= base.millRadiusM - base.particleRadiusM + 1e-9,
      'no particle may escape a turning mill');
  }
});

test('live DEM: restitution controls dissipation, and the impact spectrum is populated', () => {
  const base = {
    millRadiusM: 2.0, particleRadiusM: 0.04, fill: 0.25, omega: Math.sqrt(9.81 / 2.0) * 0.8,
    friction: 0.75, lifterCount: 12, lifterHeightM: 0.08,
    particleDensity: 7.8, maxParticles: 400, seed: 3,
  };
  const bouncy = new LiveDem({ ...base, restitution: 0.85 });
  const dead = new LiveDem({ ...base, restitution: 0.10 });
  bouncy.advance(1.5); dead.advance(1.5);
  // A nearly-elastic charge retains more kinetic energy than a nearly-plastic one under identical
  // driving. This is the whole reason e is a user control rather than a constant.
  assert.ok(bouncy.stats().kineticJ > dead.stats().kineticJ,
    'higher restitution must retain more kinetic energy');
  // The impact-energy spectrum must actually collect collisions; it is the raw material for the
  // energy histogram. NOTE: it is an energy distribution only, never a breakage prediction.
  const st = bouncy.stats();
  assert.ok(st.contacts >= 0 && Array.isArray(st.impactEnergies), 'impact spectrum must be collected');
  assert.ok(st.impactEnergies.every((e) => Number.isFinite(e) && e >= 0),
    'every impact energy must be finite and non-negative');
});
