// Prebuild: overlay the committed CONTRACT-2 artifacts (../data/derived) into the SPA's public/ so the static site
// loads them. Canonical copies live in ../data/derived, public/ is a build-time overlay (git-ignored). ChargeCascade's
// live lane is the TypeScript mill engine (frontend/src/mill/) + onnxruntime-web; there is no Pyodide lane to inline.
import { copyFileSync, cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const PUB = join(HERE, 'public');
const derived = join(ROOT, 'data', 'derived');

if (!existsSync(derived)) {
  console.warn('[copy-data] no data/derived, run `npm run bake` (or `python -m cclab.pipeline all`) first');
} else {
  mkdirSync(join(PUB, 'data'), { recursive: true });
  cpSync(derived, join(PUB, 'data'), { recursive: true });
  for (const f of ['case-results.json', 'cc-learned.json', 'power-surrogate.onnx', 'scenario-ood.onnx']) {
    const src = join(derived, f);
    if (existsSync(src)) copyFileSync(src, join(PUB, f));
  }
  console.log('[copy-data] data/derived -> public/data (+ root-level case-results / onnx)');
}

// the baked DEM lane (milldem frames + power + outlines + the (phiC,J) grid) lives in ../data/dem; overlay it into
// public/data/dem so the SPA fetches data/dem/<case>.demframes.bin etc. (bake with `python -m cclab.dem`).
const demDir = join(ROOT, 'data', 'dem');
if (existsSync(demDir)) {
  cpSync(demDir, join(PUB, 'data', 'dem'), { recursive: true });
  console.log('[copy-data] data/dem -> public/data/dem (DEM frames + power grid)');
} else {
  console.warn('[copy-data] no data/dem (DEM lane not baked; the 3D charge falls back to the Davis kinematic view)');
}
