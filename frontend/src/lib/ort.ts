// Live in-browser inference of ChargeCascade's two learned models (onnxruntime-web). GRACEFUL: until they are trained
// (science/train_mill.py -> power-surrogate.onnx + scenario-ood.onnx) the files are absent; the loader resolves to
// null and the App uses the EXACT analytic engine (which runs live anyway) + shows the honest "pending training"
// state. The surrogate's value is instant operating-envelope sweeps (the What-if tool); the AE is the live anomaly
// guard. WASM EP, single-threaded; the npm package + CDN wasmPaths pinned to 1.27.
import * as ort from 'onnxruntime-web';
import { featureVec, MILL_FEATURES, N_FEATURES } from './learned.ts';
import type { Operating } from '../mill/index.ts';

ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.27.0/dist/';
ort.env.wasm.numThreads = 1;

const base = () => import.meta.env.BASE_URL || '/';
const sessions: Record<string, Promise<ort.InferenceSession | null>> = {};

// ONE global serialization chain for ALL onnxruntime-web work (session creation AND inference). The WASM EP runs
// single-threaded and ships TWO models here (the power surrogate + the OOD autoencoder) that the App queries together
// on every control change; without a global lock their concurrent create()/run() calls race the single WASM runtime
// and throw "Session already started" / "Session mismatch". Serialising every op end-to-end removes the race.
let ortChain: Promise<unknown> = Promise.resolve();
function serial<T>(fn: () => Promise<T>): Promise<T> {
  const next = ortChain.then(fn, fn);
  ortChain = next.catch(() => {});
  return next;
}

function get(file: string): Promise<ort.InferenceSession | null> {
  return (sessions[file] ??= serial(async () => {
    try {
      const head = await fetch(`${base()}${file}`, { method: 'HEAD' });
      if (!head.ok) return null;
      return await ort.InferenceSession.create(`${base()}${file}`, { executionProviders: ['wasm'] });
    } catch {
      return null;
    }
  }));
}

export const surrogateAvailable = async () => (await get('power-surrogate.onnx')) != null;

async function runSerial(_file: string, s: ort.InferenceSession, feeds: Record<string, ort.Tensor>) {
  return serial(() => s.run(feeds));
}

export { MILL_FEATURES };

/** Surrogate forward: operating features -> [power_kw, frac_centrifuging]. null if the model isn't trained. */
export async function runSurrogate(op: Operating): Promise<{ powerKw: number; fracCentrifuging: number } | null> {
  const s = await get('power-surrogate.onnx');
  if (!s) return null;
  const out = await runSerial('power-surrogate.onnx', s, { x: new ort.Tensor('float32', featureVec(op), [1, N_FEATURES]) });
  const y = out.y.data as Float32Array;
  return { powerKw: y[0], fracCentrifuging: y[1] };
}

/** OOD autoencoder: returns the standardized-space reconstruction MSE (the anomaly score, computed inside the ONNX).
 * Low (~<1) in-envelope, high (>2) for over-speed / near-centrifuging / extreme geometry. null if untrained. */
export async function runOod(op: Operating): Promise<number | null> {
  const s = await get('scenario-ood.onnx');
  if (!s) return null;
  const out = await runSerial('scenario-ood.onnx', s, { x: new ort.Tensor('float32', featureVec(op), [1, N_FEATURES]) });
  return (out.xr.data as Float32Array)[0];
}
