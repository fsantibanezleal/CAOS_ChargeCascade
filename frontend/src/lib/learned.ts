// The learned-model feature contract (browser side) — mirrors data-pipeline/cclab/model/learned.py :: MILL_FEATURES.
// The per-mill operating feature vector fed to the power-surrogate ONNX + the scenario-ood autoencoder. SINGLE SOURCE
// OF TRUTH for the order.
import type { Operating } from '../mill/index.ts';

export const MILL_FEATURES = ['diameter_m', 'length_m', 'fill', 'phi_c', 'ball_top_mm', 'charge_density'] as const;
export const N_FEATURES = MILL_FEATURES.length;

export function featureVec(op: Operating): Float32Array {
  const f: Record<string, number> = {
    diameter_m: op.diameterM, length_m: op.lengthM, fill: op.fill, phi_c: op.phiC,
    ball_top_mm: op.ballTopMm, charge_density: op.chargeDensity,
  };
  return Float32Array.from(MILL_FEATURES.map((k) => f[k] ?? 0));
}
