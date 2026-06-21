import { Callout, useShellLang } from '@fasl-work/caos-app-shell';

export default function Implementation() {
  const es = useShellLang() === 'es';
  return (
    <article className="page-body prose">
      <h1>{es ? 'Implementación' : 'Implementation'}</h1>
      <p className="lede">{es
        ? 'Un motor TypeScript sin dependencias corre en vivo en el navegador (el molino 3D en Three.js) Y en el bake offline; dos contratos de datos en Python + un pipeline numpy-light + un carril torch→ONNX.'
        : 'A dependency-free TypeScript engine runs live in the browser (the Three.js 3D mill) AND in the offline bake; two Python data contracts + a numpy-light pipeline + a torch→ONNX lane.'}</p>

      <h2>{es ? 'El motor (frontend/src/mill/)' : 'The engine (frontend/src/mill/)'}</h2>
      <ul>
        <li><code>criticalspeed.ts</code> — Nc = 42.3/√(D−d), φc, ω.</li>
        <li><code>charge.ts</code> — {es ? 'la partida de Davis por capa (cos α = ω²r/g) + las trayectorias parabólicas + el shoulder/toe.' : 'the per-shell Davis departure (cos α = ω²r/g) + the parabolic trajectories + the shoulder/toe.'}</li>
        <li><code>regime.ts</code> — {es ? 'la clasificación de régimen + el % centrifugando.' : 'the regime classification + the % centrifuging.'}</li>
        <li><code>power.ts</code> — {es ? 'Hogg-Fuerstenau (brazo de torque, P ∝ D^2.5), forma Morrell, Bond.' : 'Hogg-Fuerstenau (torque-arm, P ∝ D^2.5), Morrell-form, Bond.'}</li>
        <li><code>engine.ts</code> — <code>evaluate(op) → MillResult</code> {es ? '(la única fuente de verdad física).' : '(the single source of physics truth).'}</li>
      </ul>

      <Callout variant="note" title={es ? 'El 3D + el bake' : 'The 3D + the bake'}>
        {es
          ? 'viz/Mill3D.tsx (Three.js) anima las MISMAS trayectorias que el motor computa — el patrón de ChancaDEM (WebGLRenderer + OrbitControls + nube de partículas + dispose limpio). science/bake_cases.mjs importa el MISMO motor (vía tsx) y corre evaluate() sobre cada caso → case-results.json; el pipeline Python (numpy-light) lo reshapea en traces+manifests. Así los números en vivo y offline son idénticos por construcción.'
          : 'viz/Mill3D.tsx (Three.js) animates the SAME trajectories the engine computes — the ChancaDEM pattern (WebGLRenderer + OrbitControls + a particle cloud + clean dispose). science/bake_cases.mjs imports the SAME engine (via tsx) and runs evaluate() over each case → case-results.json; the Python pipeline (numpy-light) reshapes it into traces+manifests. So the live and offline numbers are identical by construction.'}
      </Callout>

      <h2>{es ? 'Verificación' : 'Verification'}</h2>
      <p>{es
        ? 'node:test (10 oráculos del motor: velocidad crítica, la partida a φc=1, el pico de potencia en J≈0.47, el escalamiento D^2.5, la magnitud realista, Bond), ruff, pytest (los 2 contratos), python -m cclab.pipeline all (10 casos), check_artifacts, re-run byte-idéntico, npm run build.'
        : 'node:test (10 engine oracles: critical speed, the φc=1 departure, the J≈0.47 power peak, the D^2.5 scaling, the realistic magnitude, Bond), ruff, pytest (the 2 contracts), python -m cclab.pipeline all (10 cases), check_artifacts, byte-identical re-run, npm run build.'}</p>
    </article>
  );
}
