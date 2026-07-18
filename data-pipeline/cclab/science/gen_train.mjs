// Generate the learned-model training data by running the SAME TypeScript mill engine the browser runs, so the power
// surrogate trains on EXACTLY the analytic Hogg-Fuerstenau/Morrell engine the App uses, and is benchmarked against it.
// Writes to data/raw/ (git-ignored, regenerable). Invoked by pipeline.retrain before train_mill.py. Run from frontend/
// so tsx resolves:  node --import tsx ../data-pipeline/cclab/science/gen_train.mjs
//
// 1. mill-train.json: N in-envelope operating points, each EVALUATED by the exact engine -> the (6-feature vector ->
//    [net power kW, fraction centrifuging]) labels for the surrogate, + the in-distribution feature vectors for the OOD
//    autoencoder.
// 2. mill-eval.json: a held-out in-distribution split carrying the exact power + frac-centrifuging (so eval_mill.mjs
//    measures the surrogate's power error vs the EXACT engine), plus out-of-envelope points for the OOD AUC.
//
// The 6 features are the App's live controls + the case geometry; the lifter angle is held at the standard 35 deg (the
// surrogate emulates the engine at the canonical lifter geometry, stated honestly in the learned-model honesty note).
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluate } from '../../../frontend/src/mill/index.ts';
import { MILL_FEATURES } from '../../../frontend/src/lib/learned.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const RAW = resolve(HERE, '../../../data/raw');
mkdirSync(RAW, { recursive: true });

// a small seeded RNG (mulberry32), deterministic training data
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20260621);
const u = (lo, hi) => lo + (hi - lo) * rnd();
const r6 = (x) => Math.round(x * 1e6) / 1e6;

// the in-distribution operating envelope (typical SAG/ball/rod geometries, normal operating speed/fill)
const ENV = {
  diameter_m: [2.5, 11], length_m: [3, 12], fill: [0.12, 0.45],
  phi_c: [0.45, 0.92], ball_top_mm: [25, 130], charge_density: [2.8, 5.6],
};
// out-of-envelope ranges (over-speed / centrifuging / extreme geometry), genuinely off the trained manifold
const OUT_ENV = {
  diameter_m: [11.5, 15], length_m: [13, 18], fill: [0.46, 0.62],
  phi_c: [0.95, 1.2], ball_top_mm: [135, 210], charge_density: [6.0, 8.0],
};

const FIXED = { millType: 'ball', liftAngleDeg: 35, oreWi: 14, feedF80um: 2000, prodP80um: 150, tph: 120 };

function sample(env) {
  const v = {};
  for (const k of Object.keys(ENV)) v[k] = u(env[k][0], env[k][1]);
  return v;
}
function opOf(v) {
  return { ...FIXED, diameterM: v.diameter_m, lengthM: v.length_m, fill: v.fill, phiC: v.phi_c, ballTopMm: v.ball_top_mm, chargeDensity: v.charge_density };
}
// feature vector in the SOURCE-OF-TRUTH order (cclab/model/learned.py :: MILL_FEATURES)
function featureVec(v) { return MILL_FEATURES.map((k) => r6(v[k])); }

// --- 1. training set (the engine label for every in-envelope point) ---
const X = [];
const Y = [];
for (let i = 0; i < 3000; i++) {
  const v = sample(ENV);
  const r = evaluate(opOf(v));
  X.push(featureVec(v));
  Y.push([Math.round(r.phfKw * 100) / 100, r6(r.fracCentrifuging)]);
}

// --- 2. held-out in-distribution eval (carries the exact power + frac-centrifuging for the downstream check) ---
const evalIn = [];
for (let i = 0; i < 500; i++) {
  const v = sample(ENV);
  const r = evaluate(opOf(v));
  evalIn.push({ feat: featureVec(v), exactPowerKw: Math.round(r.phfKw * 100) / 100, exactFracCent: r6(r.fracCentrifuging) });
}

// --- 3. OUT-of-envelope points (push a random subset of features out of envelope) for the OOD AUC ---
const OUT = [];
const keys = Object.keys(OUT_ENV);
for (let i = 0; i < 500; i++) {
  const v = sample(ENV);
  const nOut = 2 + ((rnd() * 4) | 0);
  for (let j = 0; j < nOut; j++) {
    const k = keys[(rnd() * keys.length) | 0];
    v[k] = u(OUT_ENV[k][0], OUT_ENV[k][1]);
  }
  OUT.push(featureVec(v));
}

writeFileSync(resolve(RAW, 'mill-train.json'), JSON.stringify({ x: X, y: Y, features: [...MILL_FEATURES], outputs: ['power_kw', 'frac_centrifuging'] }));
writeFileSync(resolve(RAW, 'mill-eval.json'), JSON.stringify({ inDist: evalIn, ood: OUT }));
// the data-design facts (so the learned-model lineage is auditable: how the training set was sampled). The labels ARE
// the exact TS engine; the envelope is an iid uniform sweep over the operating ranges (fixed-seed mulberry32, no stratification), fixed seed.
writeFileSync(resolve(RAW, 'train-design.json'), JSON.stringify({
  nTrainPoints: X.length, nEvalInDist: evalIn.length, nOod: OUT.length,
  features: [...MILL_FEATURES], nFeatures: MILL_FEATURES.length, seed: 20260621,
  sampling: 'uniform over the in-distribution operating envelope (fixed-seed mulberry32); labels = exact analytic engine',
  envelope: ENV,
}, null, 2));
console.log(`gen_train: ${X.length} train points - ${evalIn.length} held-out - ${OUT.length} OOD -> ${RAW}`);
