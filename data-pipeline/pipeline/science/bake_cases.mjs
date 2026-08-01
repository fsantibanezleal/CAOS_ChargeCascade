// Bake the per-case mill evaluation through the SAME TypeScript engine the browser runs, and write
// data/derived/case-results.json, the committed, deterministic per-case outputs the LIGHT Python pipeline reshapes
// into per-case replay traces + manifests (CONTRACT 2). No Python re-port of the physics. The operating point + the
// scalar results + the power-vs-phiC curve are committed (compact); the 3D charge trajectories are regenerated LIVE in
// the browser from the operating point (no raster/particle blobs). Run (from frontend/ so tsx resolves):
//   node --import tsx ../data-pipeline/pipeline/science/bake_cases.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CASES } from '../../../frontend/src/mill/cases.ts';
import { evaluate } from '../../../frontend/src/mill/index.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const DERIVED = resolve(HERE, '../../../data/derived');
mkdirSync(DERIVED, { recursive: true });

const round = (x, n = 4) => (Number.isFinite(x) ? Math.round(x * 10 ** n) / 10 ** n : x);

const cases = {};
for (const cc of CASES) {
  const r = evaluate(cc.op);
  cases[cc.id] = {
    name: cc.name,
    category: cc.category,
    realOrSynthetic: cc.realOrSynthetic,
    expectedBand: cc.expectedBand,
    validationAnchor: cc.validationAnchor,
    operating: cc.op,
    ncRpm: round(r.ncRpm, 3),
    phiC: round(cc.op.phiC, 4),
    regime: r.regime,
    fracCentrifuging: round(r.fracCentrifuging, 4),
    shoulderDeg: round(r.shoulderDeg, 2),
    toeDeg: round(r.toeDeg, 2),
    phfKw: round(r.phfKw, 1),
    pMorrellKw: round(r.pMorrellKw, 1),
    bondWKwhT: round(r.bondWKwhT, 3),
    chargeMassT: round(r.chargeMassT, 2),
    powerCurve: r.powerCurve.map((p) => ({ phiC: round(p.phiC, 3), phf: round(p.phf, 1), morrell: round(p.morrell, 1) })),
    flags: r.flags,
  };
}

const out = { schema: 'chargecascade.case-results/v1', nCases: CASES.length, cases };
writeFileSync(resolve(DERIVED, 'case-results.json'), JSON.stringify(out), 'utf-8');
console.log(`baked ${CASES.length} cases -> ${resolve(DERIVED, 'case-results.json')}`);
