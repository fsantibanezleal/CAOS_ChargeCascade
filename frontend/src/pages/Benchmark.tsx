import { useEffect, useState } from 'react';
import { Callout, Refs, useShellLang } from '@fasl-work/caos-app-shell';
import { loadLearned, type LearnedFile } from '../lib/artifacts.ts';

// Benchmark = the learned-model evaluation (this is where the learned held-out metrics live, not in the App); a
// cross-case evaluation is a planned extension, not present yet. The power surrogate is measured downstream against
// the exact analytic engine; the OOD autoencoder by its AUC.
export default function Benchmark() {
  const es = useShellLang() === 'es';
  const [learned, setLearned] = useState<LearnedFile | null>(null);
  useEffect(() => { loadLearned().then(setLearned).catch(() => setLearned(null)); }, []);

  return (
    <article className="page-body prose">
      <div className="page-head">
        <h1>Benchmark</h1>
        <p className="lede">{es
          ? 'La evaluación de los modelos aprendidos contra el motor analítico exacto (la autoridad). El surrogate gana su lugar por la velocidad, no por una victoria fabricada.'
          : 'The evaluation of the learned models against the exact analytic engine (the authority). The surrogate earns its place on speed, not a fabricated win.'}</p>
      </div>

      <Callout variant="honest" title={es ? 'El motor exacto es la autoridad' : 'The exact engine is the authority'}>
        {es
          ? 'La física (Davis, Hogg-Fuerstenau, forma Morrell, Bond) es analítica + transparente. El surrogate de potencia (torch→ONNX) la emula; se mide downstream por su error de potencia vs el motor exacto en puntos held-out (ninguna funcionalidad publicada lo consume aún en masa). El autoencoder OOD marca puntos fuera del envolvente. Si el surrogate no es preciso, el benchmark lo dice.'
          : 'The physics (Davis, Hogg-Fuerstenau, Morrell-form, Bond) is analytic + transparent. The power surrogate (torch→ONNX) emulates it; it is measured downstream by its power error vs the exact engine on held-out points (no shipped feature consumes it in bulk yet). The OOD autoencoder flags off-envelope points. If the surrogate is not accurate, the benchmark says so.'}
      </Callout>

      <h2>{es ? 'Modelos aprendidos (held-out)' : 'Learned models (held-out)'}</h2>
      {learned ? (
        <>
          <table className="cmp-table">
            <thead><tr><th>{es ? 'modelo' : 'model'}</th><th>{es ? 'métrica' : 'metric'}</th><th>{es ? 'valor' : 'value'}</th></tr></thead>
            <tbody>
              <tr><td>{es ? 'surrogate de potencia' : 'power surrogate'}</td><td>{es ? 'error de potencia vs exacto' : 'power error vs exact'}</td><td><b>{(learned.surrogate.power_err * 100).toFixed(1)}%{learned.surrogate.power_err_std != null ? ` ± ${(learned.surrogate.power_err_std * 100).toFixed(1)}%` : ''}</b></td></tr>
              <tr><td>{es ? 'OOD de operación' : 'operating OOD-AE'}</td><td>AUC</td><td><b>{learned.ood.auc.toFixed(3)}</b></td></tr>
            </tbody>
          </table>
          <LearnedTransparency learned={learned} es={es} />
        </>
      ) : (
        <p className="cc-note">{es ? 'Artefactos de los modelos aprendidos no cargados, este build los incluye; si esto persiste, regenerarlos con el paso de re-entrenamiento del precómputo. El motor analítico exacto se ejecuta en vivo mientras tanto.' : 'Learned-model artifacts not loaded, this build ships them; if this persists, regenerate them with the precompute retrain step. The exact analytic engine runs live meanwhile.'}</p>
      )}
      {learned && <p className="cc-cap">{learned.honesty}</p>}
    </article>
  );
}

// T5, training transparency: the surrogate/AE lineage made auditable (architecture, data design, the predicted-vs-
// exact scatter on held-out points), so the held-out metric is visibly earned, not asserted.
function LearnedTransparency({ learned, es }: { learned: LearnedFile; es: boolean }) {
  const s = learned.surrogate, o = learned.ood, d = learned.data;
  const kb = (b?: number) => (b != null ? `${(b / 1024).toFixed(1)} kB` : 'n/a');
  const sc = s.scatter ?? [];
  // predicted-vs-exact scatter (kW): points should sit on the y=x diagonal if the surrogate tracks the engine
  const W = 360, H = 240, padL = 44, padB = 34, padT = 12, padR = 12;
  const vals = sc.flat();
  const hi = vals.length ? Math.max(...vals) : 1;
  const sx = (v: number) => padL + (v / (hi || 1)) * (W - padL - padR);
  const sy = (v: number) => padT + (1 - v / (hi || 1)) * (H - padT - padB);
  if (s.arch == null) return null;   // v1 file, no lineage to show
  return (
    <div style={{ marginTop: '0.8rem' }}>
      <div className="cc-card-t">{es ? 'Transparencia del entrenamiento (auditable)' : 'Training transparency (auditable)'}</div>
      <p className="cc-note">{es
        ? 'La métrica held-out de arriba es real y demostrada, no afirmada: aquí está el linaje completo del surrogate (cómo se entrenó) y el scatter predicho-vs-exacto en los puntos held-out.'
        : 'The held-out metric above is real and earned, not asserted: here is the surrogate’s full training lineage (how it was trained) and the predicted-vs-exact scatter on the held-out points.'}</p>
      <div className="cc-twocol" style={{ display: 'flex', gap: '1.2rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <table className="cmp-table" style={{ flex: '1 1 320px' }}>
          <tbody>
            <tr><td>{es ? 'arquitectura' : 'architecture'}</td><td className="mono">{s.arch} · {s.params} {es ? 'parám.' : 'params'}</td></tr>
            <tr><td>{es ? 'optimizador' : 'optimizer'}</td><td className="mono">{s.optimizer} lr {s.lr} · {s.epochs} ep · batch {s.batch}</td></tr>
            <tr><td>{es ? 'pérdida' : 'loss'}</td><td className="mono">{s.loss}</td></tr>
            <tr><td>{es ? 'división' : 'split'}</td><td className="mono">{s.split} → {s.nTrain}/{s.nVal}</td></tr>
            <tr><td>{es ? 'pérdida final tr/val' : 'final loss tr/val'}</td><td className="mono">{s.finalTrainLoss} / {s.finalValLoss}</td></tr>
            <tr><td>{es ? 'error potencia (med ± σ)' : 'power err (mean ± σ)'}</td><td className="mono">{(s.power_err * 100).toFixed(1)}% ± {((s.power_err_std ?? 0) * 100).toFixed(1)}% (n={s.nEval})</td></tr>
            <tr><td>ONNX</td><td className="mono">opset {s.opset} · {kb(s.modelBytes)}</td></tr>
            <tr className="matched"><td>{es ? 'OOD-AE' : 'OOD-AE'}</td><td className="mono">{o.arch} · {o.params} {es ? 'parám.' : 'params'} · AUC {o.auc.toFixed(3)} · {kb(o.modelBytes)}</td></tr>
          </tbody>
        </table>
        <div className="cc-plot" style={{ flex: '0 0 auto', maxWidth: W + 16 }}>
          <div className="cc-cap cc-muted">{es ? 'predicho vs exacto (kW, held-out)' : 'predicted vs exact (kW, held-out)'}</div>
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ font: '10px var(--font-sans, system-ui, sans-serif)' }} role="img" aria-label={es ? 'predicho vs exacto' : 'predicted vs exact'}>
            <line x1={sx(0)} y1={sy(0)} x2={sx(hi)} y2={sy(hi)} stroke="var(--color-fg-subtle)" strokeDasharray="4 3" />
            {sc.map(([ex, pr], i) => <circle key={i} cx={sx(ex)} cy={sy(pr)} r={2.4} fill="var(--color-accent)" opacity={0.6} />)}
            <text x={sx(0)} y={sy(0) + 14} fill="var(--color-fg-subtle)">0</text>
            <text x={sx(hi)} y={sy(0) + 14} textAnchor="end" fill="var(--color-fg-subtle)">{Math.round(hi)}</text>
            <text x={(W) / 2} y={H - 2} textAnchor="middle" fill="var(--color-fg-faint)">{es ? 'exacto (Hogg-F.) kW' : 'exact (Hogg-F.) kW'}</text>
          </svg>
        </div>
      </div>
      {d && (
        <p className="cc-cap cc-muted" style={{ marginTop: '0.4rem' }}>
          {es ? 'Diseño de datos: ' : 'Data design: '}{d.nTrainPoints} {es ? 'puntos de entrenamiento' : 'training points'} · {d.nEvalInDist} held-out · {d.nOod} OOD · {d.nFeatures} {es ? 'features' : 'features'} · {es ? 'semilla' : 'seed'} {d.seed} · {d.sampling}. {es ? 'Envolvente' : 'Envelope'}: {Object.entries(d.envelope).map(([k, v]) => `${k} [${v[0]}–${v[1]}]`).join(' · ')}.
        </p>
      )}
      <Refs ids={['hoggfuerstenau1972', 'morrell1996', 'bond1952']} label="Refs" />
    </div>
  );
}
