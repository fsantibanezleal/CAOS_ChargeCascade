// The top-level live engine: an Operating point -> a full MillResult. The single source of physics truth the whole
// app reads, AND the ground-truth the offline uniform sweep samples to train the ONNX surrogate (the ChancaDEM pattern).
// Pure TypeScript, sub-millisecond, no Pyodide, no backend. Recompute on EVERY control change.

import { criticalSpeedRpm, omegaRadS, speedRpm } from './criticalspeed.ts';
import { chargeGeometry } from './charge.ts';
import { CASCADE_CATARACT_PHIC, classifyRegime } from './regime.ts';
import { bondWKwhT, chargeMassT, hoggFuerstenauKw, morrellFormKw } from './power.ts';
import { morrellPower } from './morrell.ts';
import type { MillResult, Operating, PowerPoint } from './types.ts';

/** The real Morrell (1996) C-model for the operating point: the full continuum power integral, independent and
 *  uncalibrated (the density control feeds it directly via rhoCOverride). SAG/AG get Doll's 5% cone allowance. */
function cModel(op: Operating, phiC: number) {
  // If a real cone geometry is supplied, use the explicit CEEC Eq 3 cone term; else fall back to Doll's 5%
  // allowance for the synthetic SAG/AG path where cone geometry is unknown.
  const hasCone = (op.coneLengthM ?? 0) > 0;
  // The case's chargeDensity is the BASE rho_c. The density-convention controls apply a RELATIVE adjustment on
  // top: at the defaults (E=0.4, U=1.0, S=0.5) the factor is 1.0 (rho_c == chargeDensity exactly); moving the
  // knobs scales rho_c around that base. This exposes the Napier-Munn convention (the ~10% residual) without
  // needing to reconstruct the ore/ball/steel composition of a synthetic case.
  const E = op.dynamicVoidage
    ? Math.min(0.45, Math.max(0.35, 0.40 + 0.12 * (phiC - 0.75) - 0.10 * (op.fill - 0.30)))
    : (op.voidageE ?? 0.4);
  const U = op.voidFillU ?? 1.0;
  const S = op.slurrySolidsS ?? 0.5;
  // solids/void terms drop out at the defaults; the porosity term (1-E)/(1-0.4) is the dominant lever.
  const densFactor = ((1 - E) / (1 - 0.4)) * (1 + 0.04 * (U - 1.0)) * (1 + 0.06 * (S - 0.5));
  const rhoC = op.chargeDensity * densFactor;
  return morrellPower({
    diameterM: op.diameterM,
    lengthM: op.lengthM,
    phiC,
    fill: op.fill,
    rhoCOverride: rhoC,
    coneLengthM: op.coneLengthM,
    trunnionRadiusM: op.trunnionRadiusM,
    coneAllowanceFrac: !hasCone && (op.millType === 'sag' || op.millType === 'ag') ? 0.05 : 0,
    dischargeType: op.dischargeType,
  });
}

/** C-model net power [kW], or null where the model is out of range (fill 0, extreme phiC): the chart shows a gap. */
function cModelNetKw(op: Operating, phiC: number): number | null {
  const net = cModel(op, phiC).netKw;
  return Number.isFinite(net) && net > 0 ? net : null;
}

export function evaluate(op: Operating): MillResult {
  const ncRpm = criticalSpeedRpm(op.diameterM, op.ballTopMm);
  const nRpm = speedRpm(op.phiC, ncRpm);
  const omega = omegaRadS(op.phiC, ncRpm);
  const geo = chargeGeometry(op.diameterM, op.ballTopMm, omega);
  const regime = classifyRegime(op.phiC, geo.fracCentrifuging);

  const phfKw = hoggFuerstenauKw(op.diameterM, op.lengthM, op.chargeDensity, op.phiC, op.fill, op.liftAngleDeg);
  const pMorrellKw = morrellFormKw(op.diameterM, op.lengthM, op.chargeDensity, op.phiC, op.fill, geo.shoulderDeg, geo.toeDeg);
  const cm = cModel(op, op.phiC); // the real Morrell C-model at the operating point
  const bondW = bondWKwhT(op.oreWi, op.feedF80um, op.prodP80um);
  const mass = chargeMassT(op.diameterM, op.lengthM, op.fill, op.chargeDensity);

  // power vs phiC at the current J, D, L. Two independent models: Hogg-Fuerstenau (rigid-body torque arm) and the
  // real Morrell C-model (continuum charge shape). Raw curves are monotone in phiC; the regime/centrifuging overlay
  // shows where grinding collapses (we do not taper the published torque model).
  const powerCurve: PowerPoint[] = [];
  for (let i = 0; i <= 30; i++) {
    const p = 0.3 + ((1.05 - 0.3) * i) / 30;
    const om = omegaRadS(p, ncRpm);
    const g2 = chargeGeometry(op.diameterM, op.ballTopMm, om);
    powerCurve.push({
      phiC: p,
      phf: hoggFuerstenauKw(op.diameterM, op.lengthM, op.chargeDensity, p, op.fill, op.liftAngleDeg),
      morrell: morrellFormKw(op.diameterM, op.lengthM, op.chargeDensity, p, op.fill, g2.shoulderDeg, g2.toeDeg),
      cModel: cModelNetKw(op, p),
    });
  }

  const flags: string[] = [];
  if (op.phiC >= 1) flags.push('phiC >= 1: the outer charge centrifuges, no grinding');
  else if (op.phiC > 0.85) flags.push('phiC > 0.85: the cataract may impact the shell/liner above the toe (over-speed)');
  if (op.fill > 0.45) flags.push('fill > 45%: above the power peak; charge crowding');
  if (op.fill > 0 && op.fill < 0.15) flags.push('fill < 15%: low charge; ball-on-liner impacts');
  if (op.ballTopMm / 1000 >= 0.05 * op.diameterM) flags.push('ball/diameter ratio large, the (D-d) critical speed matters');

  return {
    ncRpm,
    nRpm,
    omega,
    rMaxM: op.diameterM / 2 - op.ballTopMm / 1000 / 2,
    shells: geo.shells,
    shoulderDeg: geo.shoulderDeg,
    toeDeg: geo.toeDeg,
    regime,
    fracCentrifuging: geo.fracCentrifuging,
    cascadeCataractPhiC: CASCADE_CATARACT_PHIC,
    phfKw,
    pMorrellKw,
    pCModelNetKw: Number.isFinite(cm.netKw) && cm.netKw > 0 ? cm.netKw : 0,
    pCModelGrossKw: Number.isFinite(cm.grossKw) && cm.grossKw > 0 ? cm.grossKw : 0,
    pCModelNoLoadKw: Number.isFinite(cm.noLoadKw) ? cm.noLoadKw : 0,
    bondWKwhT: bondW,
    bondPowerKw: bondW * op.tph,
    powerCurve,
    chargeMassT: mass,
    flags,
  };
}
