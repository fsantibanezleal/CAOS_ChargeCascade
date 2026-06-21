import { useEffect, useState } from 'react';
import { Callout, useShellLang } from '@fasl-work/caos-app-shell';
import { loadLearned, type LearnedFile } from '../lib/artifacts.ts';

// Benchmark = the cross-case + learned-model evaluation (this is where the learned held-out metrics live — NOT in the
// App). The power surrogate is measured DOWNSTREAM against the exact analytic engine; the OOD autoencoder by its AUC.
export default function Benchmark() {
  const es = useShellLang() === 'es';
  const [learned, setLearned] = useState<LearnedFile | null>(null);
  useEffect(() => { loadLearned().then(setLearned).catch(() => setLearned(null)); }, []);

  return (
    <article className="page-body prose">
      <h1>Benchmark</h1>
      <p className="lede">{es
        ? 'La evaluación de los modelos aprendidos contra el motor analítico EXACTO (la autoridad). El surrogate gana su lugar por la velocidad, no por una victoria fabricada.'
        : 'The evaluation of the learned models against the EXACT analytic engine (the authority). The surrogate earns its place on speed, not a fabricated win.'}</p>

      <Callout variant="honest" title={es ? 'El motor exacto es la autoridad' : 'The exact engine is the authority'}>
        {es
          ? 'La física (Davis, Hogg-Fuerstenau, Morrell, Bond) es analítica + transparente. El surrogate de potencia (torch→ONNX) la EMULA para barridos instantáneos del envolvente; se mide DOWNSTREAM por su error de potencia vs el motor exacto en puntos held-out. El autoencoder OOD marca puntos fuera del envolvente. Si el surrogate no es preciso, el benchmark lo dice.'
          : 'The physics (Davis, Hogg-Fuerstenau, Morrell, Bond) is analytic + transparent. The power surrogate (torch→ONNX) EMULATES it for instant envelope sweeps; it is measured DOWNSTREAM by its power error vs the exact engine on held-out points. The OOD autoencoder flags off-envelope points. If the surrogate is not accurate, the benchmark says so.'}
      </Callout>

      <h2>{es ? 'Modelos aprendidos (held-out)' : 'Learned models (held-out)'}</h2>
      {learned ? (
        <table className="cmp-table">
          <thead><tr><th>{es ? 'modelo' : 'model'}</th><th>{es ? 'métrica' : 'metric'}</th><th>{es ? 'valor' : 'value'}</th></tr></thead>
          <tbody>
            <tr><td>{es ? 'surrogate de potencia' : 'power surrogate'}</td><td>{es ? 'error de potencia vs exacto' : 'power error vs exact'}</td><td><b>{(learned.surrogate.power_err * 100).toFixed(1)}%</b></td></tr>
            <tr><td>{es ? 'OOD de operación' : 'operating OOD-AE'}</td><td>AUC</td><td><b>{learned.ood.auc.toFixed(3)}</b></td></tr>
          </tbody>
        </table>
      ) : (
        <p className="pf-note">{es ? 'Modelos aprendidos pendientes — corre `python -m cclab.pipeline all --retrain`. El motor analítico exacto corre en vivo mientras tanto.' : 'Learned models pending — run `python -m cclab.pipeline all --retrain`. The exact analytic engine runs live meanwhile.'}</p>
      )}
      {learned && <p className="pf-cap">{learned.honesty}</p>}
    </article>
  );
}
