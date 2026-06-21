// COMMIT-3 PLACEHOLDER. Proves the mill physics engine (frontend/src/mill/) bundles + runs LIVE in the browser: pick a
// case, evaluate it, and show the critical speed + regime + the realistic power draw. The full 6-page SPA (the 3D
// Three.js mill + the real analytical workbench) replaces this in commit 4.
import { useMemo, useState } from 'react';
import { CASES, caseById, evaluate } from './mill/index.ts';

export default function App() {
  const [sel, setSel] = useState(CASES[0].id);
  const cc = useMemo(() => caseById(sel), [sel]);
  const r = useMemo(() => evaluate(cc.op), [cc]);

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 760, margin: '2rem auto', padding: '0 1rem' }}>
      <h1>ChargeCascade — 3D tumbling mill</h1>
      <p style={{ color: '#666' }}>Engine proof-of-life (commit 3). The interactive 3D mill + the workbench land in commit 4.</p>
      <label>
        Case:{' '}
        <select value={sel} onChange={(e) => setSel(e.target.value)}>
          {CASES.map((x) => (
            <option key={x.id} value={x.id}>{x.id} — {x.name}</option>
          ))}
        </select>
      </label>
      <p>
        <b>{cc.name}</b> · {cc.op.millType} · D {cc.op.diameterM} m × L {cc.op.lengthM} m · J {(cc.op.fill * 100).toFixed(0)}% · φc {cc.op.phiC}
        <br />
        Nc <b>{r.ncRpm.toFixed(1)} rpm</b> · regime <b>{r.regime}</b> · centrifuging {(r.fracCentrifuging * 100).toFixed(0)}%
        <br />
        power (Hogg-Fuerstenau) <b>{r.phfKw.toFixed(0)} kW</b> · Morrell-form {r.pMorrellKw.toFixed(0)} kW · charge {r.chargeMassT.toFixed(1)} t
      </p>
      {r.flags.length > 0 && <p style={{ color: '#a60' }}>{r.flags.join(' · ')}</p>}
      <p style={{ color: '#888', fontSize: 13 }}>{cc.validationAnchor}</p>
    </div>
  );
}
