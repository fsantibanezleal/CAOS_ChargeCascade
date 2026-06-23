import { useEffect, useState } from 'react';
import { useShellLang } from '@fasl-work/caos-app-shell';
import { loadCaseResults } from '../lib/artifacts.ts';

interface Row {
  id: string; name: string; category: string; realOrSynthetic: string; ncRpm: number;
  phiC: number; regime: string; phfKw: number; fracCent: number; chargeMassT: number;
}

const kw = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(2)} MW` : `${v.toFixed(0)} kW`);

export default function Experiments() {
  const es = useShellLang() === 'es';
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    loadCaseResults().then((cr) => {
      setRows(Object.entries(cr.cases).map(([id, raw]) => {
        const c = raw as Record<string, unknown>;
        return {
          id, name: String(c.name), category: String(c.category), realOrSynthetic: String(c.realOrSynthetic),
          ncRpm: Number(c.ncRpm), phiC: Number(c.phiC), regime: String(c.regime), phfKw: Number(c.phfKw),
          fracCent: Number(c.fracCentrifuging), chargeMassT: Number(c.chargeMassT),
        };
      }));
    }).catch(() => setRows([]));
  }, []);

  return (
    <article className="page-body prose">
      <h1>{es ? 'Experimentos' : 'Experiments'}</h1>
      <p className="lede">{es
        ? 'Los 10 casos, horneados por el motor. Cada fila lleva la velocidad crítica, φc, el régimen, la potencia neta, el % centrifugando y la masa de carga.'
        : 'The 10 cases, baked by the engine. Each row carries the critical speed, φc, the regime, the net power, the % centrifuging and the charge mass.'}</p>

      {rows == null ? <p className="cc-note">{es ? 'cargando…' : 'loading…'}</p> : (
        <table className="cmp-table">
          <thead>
            <tr>
              <th>{es ? 'caso' : 'case'}</th><th>{es ? 'categoría' : 'category'}</th><th>Nc</th><th>φc</th>
              <th>{es ? 'régimen' : 'regime'}</th><th>{es ? 'potencia' : 'power'}</th><th>{es ? '% cent.' : '% cent.'}</th><th>{es ? 'carga' : 'charge'}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td><b>{r.id}</b></td>
                <td>{r.category.split(' (')[0]}</td>
                <td>{r.ncRpm.toFixed(1)}</td>
                <td>{r.phiC.toFixed(2)}</td>
                <td style={{ color: r.regime === 'centrifuging' ? 'var(--color-bad)' : undefined }}>{r.regime}</td>
                <td>{kw(r.phfKw)}</td>
                <td>{(r.fracCent * 100).toFixed(0)}%</td>
                <td>{r.chargeMassT.toFixed(0)} t</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="cc-note">{es
        ? 'Anclas: K-SAG (10 m) saca la mayor potencia (P ∝ D^2.5). S-CASCADE/S-CATARACT/S-CENTRIFUGE son el MISMO molino a distinta φc (la transición de régimen). C-CRITICAL (φc=1) centrifuga; C-EMPTY (J=0) → 0 potencia.'
        : 'Anchors: K-SAG (10 m) draws the most power (P ∝ D^2.5). S-CASCADE/S-CATARACT/S-CENTRIFUGE are the SAME mill at different φc (the regime transition). C-CRITICAL (φc=1) centrifuges; C-EMPTY (J=0) → 0 power.'}</p>
    </article>
  );
}
