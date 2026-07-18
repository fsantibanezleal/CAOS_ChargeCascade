// The top-level live engine: an Operating point -> a full MillResult. The single source of physics truth the whole
// app reads, AND the ground-truth the offline uniform sweep samples to train the ONNX surrogate (the ChancaDEM pattern).
// Pure TypeScript, sub-millisecond, no Pyodide, no backend. Recompute on EVERY control change.

import { criticalSpeedRpm, omegaRadS, speedRpm } from './criticalspeed.ts';
import { chargeGeometry } from './charge.ts';
import { CASCADE_CATARACT_PHIC, classifyRegime } from './regime.ts';
import { bondWKwhT, chargeMassT, hoggFuerstenauKw, morrellFormKw } from './power.ts';
import type { MillResult, Operating, PowerPoint } from './types.ts';

export function evaluate(op: Operating): MillResult {
  const ncRpm = criticalSpeedRpm(op.diameterM, op.ballTopMm);
  const nRpm = speedRpm(op.phiC, ncRpm);
  const omega = omegaRadS(op.phiC, ncRpm);
  const geo = chargeGeometry(op.diameterM, op.ballTopMm, omega);
  const regime = classifyRegime(op.phiC, geo.fracCentrifuging);

  const phfKw = hoggFuerstenauKw(op.diameterM, op.lengthM, op.chargeDensity, op.phiC, op.fill, op.liftAngleDeg);
  const pMorrellKw = morrellFormKw(op.diameterM, op.lengthM, op.chargeDensity, op.phiC, op.fill, geo.shoulderDeg, geo.toeDeg);
  const bondW = bondWKwhT(op.oreWi, op.feedF80um, op.prodP80um);
  const mass = chargeMassT(op.diameterM, op.lengthM, op.fill, op.chargeDensity);

  // power vs phiC at the current J, D, L (raw Hogg-Fuerstenau is monotone in phiC; the regime/centrifuging overlay
  // shows where grinding collapses, we do not taper the published torque model)
  const powerCurve: PowerPoint[] = [];
  for (let i = 0; i <= 30; i++) {
    const p = 0.3 + ((1.05 - 0.3) * i) / 30;
    const om = omegaRadS(p, ncRpm);
    const g2 = chargeGeometry(op.diameterM, op.ballTopMm, om);
    powerCurve.push({
      phiC: p,
      phf: hoggFuerstenauKw(op.diameterM, op.lengthM, op.chargeDensity, p, op.fill, op.liftAngleDeg),
      morrell: morrellFormKw(op.diameterM, op.lengthM, op.chargeDensity, p, op.fill, g2.shoulderDeg, g2.toeDeg),
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
    bondWKwhT: bondW,
    bondPowerKw: bondW * op.tph,
    powerCurve,
    chargeMassT: mass,
    flags,
  };
}
