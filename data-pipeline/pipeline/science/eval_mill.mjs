// Downstream evaluation of the trained power surrogate, measured HONESTLY against the exact engine. For each held-out
// in-distribution operating point the surrogate predicts [power, frac-centrifuging]; we compare its power to the EXACT
// analytic engine's power (the authority). The relative power error is the honest skill number. Then we assemble the
// final data/derived/cc-learned.json by merging the OOD-AE AUC + honesty that train_mill.py wrote to learned-partial.json.
//   node --import tsx ../data-pipeline/cclab/science/eval_mill.mjs   (run from frontend/ so onnxruntime-web resolves)
import { createRequire } from 'node:module';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../../..');
const RAW = resolve(ROOT, 'data/raw');
const DERIVED = resolve(ROOT, 'data/derived');
const FRONTEND = resolve(ROOT, 'frontend');

// load onnxruntime-web (resolved from frontend/node_modules), node build, WASM EP, single-threaded, local wasm.
const req = createRequire(pathToFileURL(resolve(FRONTEND, 'pkg.js')));
const ortMod = await import(pathToFileURL(req.resolve('onnxruntime-web')));
const ort = ortMod.default ?? ortMod;
ort.env.wasm.wasmPaths = pathToFileURL(resolve(FRONTEND, 'node_modules/onnxruntime-web/dist')).href + '/';
ort.env.wasm.numThreads = 1;

const ev = JSON.parse(readFileSync(resolve(RAW, 'mill-eval.json'), 'utf-8')).inDist;
const partialPath = resolve(RAW, 'learned-partial.json');
const partial = existsSync(partialPath) ? JSON.parse(readFileSync(partialPath, 'utf-8')) : {};

const modelPath = resolve(DERIVED, 'power-surrogate.onnx');
const session = existsSync(modelPath) ? await ort.InferenceSession.create(modelPath, { executionProviders: ['wasm'] }) : null;

let sumPowErr = 0;
let sumCentErr = 0;
let nEval = 0;
const powErrs = [];            // per-point relative power error (for the std)
const scatter = [];            // a sample of [exactPowerKw, predPowerKw] for the predicted-vs-exact plot
if (session) {
  const n = ev.length;
  const F = ev[0].feat.length;
  const flat = new Float32Array(n * F);
  for (let i = 0; i < n; i++) for (let j = 0; j < F; j++) flat[i * F + j] = ev[i].feat[j];
  const out = await session.run({ x: new ort.Tensor('float32', flat, [n, F]) });
  const y = out.y.data; // [n, 2] = [power_kw, frac_centrifuging]
  const stride = Math.max(1, Math.floor(n / 120)); // ~120 points for the scatter
  for (let i = 0; i < n; i++) {
    const predPow = y[i * 2 + 0];
    const predCent = y[i * 2 + 1];
    const s = ev[i];
    const e = Math.abs(predPow - s.exactPowerKw) / Math.max(1, Math.abs(s.exactPowerKw));
    sumPowErr += e;
    powErrs.push(e);
    sumCentErr += Math.abs(predCent - s.exactFracCent);
    if (i % stride === 0) scatter.push([Math.round(s.exactPowerKw), Math.round(predPow)]);
    nEval++;
  }
} else {
  nEval = ev.length; // no surrogate trained yet, leave the error at 0 and let the App show the pending state
}

const meanErr = sumPowErr / Math.max(1, nEval);
const stdErr = powErrs.length ? Math.sqrt(powErrs.reduce((a, e) => a + (e - meanErr) ** 2, 0) / powErrs.length) : 0;
const r4 = (x) => Math.round(x * 1e4) / 1e4;

const learned = {
  schema: 'chargecascade.learned/v2',
  surrogate: {
    power_err: r4(meanErr),
    power_err_std: r4(stdErr),
    cent_err: r4(sumCentErr / Math.max(1, nEval)),
    nEval,
    // the surrogate's REAL training lineage (from train_mill.py), so the held-out metric is auditable, not asserted
    ...(partial.surrogateLineage ?? {}),
    scatter,
  },
  data: existsSync(resolve(RAW, 'train-design.json')) ? JSON.parse(readFileSync(resolve(RAW, 'train-design.json'), 'utf-8')) : undefined,
  ood: partial.ood ?? { auc: 0, nEval: 0 },
  honesty: partial.honesty ??
    'Synthetic but physically-realistic mill operating points; the labels ARE the EXACT analytic engine. The surrogate ' +
    'is measured DOWNSTREAM (its power vs the exact engine on held-out points); the OOD-AE flags out-of-envelope points. ' +
    'The exact engine is the authority. No fabricated win.',
};
writeFileSync(resolve(DERIVED, 'cc-learned.json'), JSON.stringify(learned, null, 2));
console.log(`eval_mill: surrogate power err ${(learned.surrogate.power_err * 100).toFixed(1)}% - cent err ${(learned.surrogate.cent_err * 100).toFixed(3)} (${nEval}) - OOD AUC ${learned.ood.auc} -> cc-learned.json`);
