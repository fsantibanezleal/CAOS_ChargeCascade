import { useEffect, useMemo, useState } from 'react';
import { Tabs, useShellLang } from '@fasl-work/caos-app-shell';
import { CASES, caseById, evaluate, type MillType, type Operating } from '../mill/index.ts';
import { runOod, runSurrogate } from '../lib/ort.ts';
import { Mill3D } from '../viz/Mill3D.tsx';
import { TrajectoryDiagram } from '../viz/TrajectoryDiagram.tsx';
import { RegimeMap } from '../viz/RegimeMap.tsx';
import { PowerChart } from '../viz/PowerChart.tsx';

const CATS = ['mill type (the machine)', 'speed sweep (the regime transition)', 'fill / charge regime', 'control (analytic anchor)'];
const MILLS: MillType[] = ['ball', 'sag', 'rod', 'ag'];
const kw = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(2)} MW` : `${v.toFixed(0)} kW`);

export default function Tool() {
  const es = useShellLang() === 'es';
  const [caseId, setCaseId] = useState('K-BALL');
  const theCase = useMemo(() => caseById(caseId), [caseId]);
  const [op, setOp] = useState<Operating>(theCase.op);
  useEffect(() => { setOp(theCase.op); }, [theCase]);

  const r = useMemo(() => evaluate(op), [op]);
  const [surr, setSurr] = useState<{ powerKw: number; fracCentrifuging: number } | null>(null);
  const [surrPending, setSurrPending] = useState(true);
  const [ood, setOod] = useState<number | null>(null);

  useEffect(() => {
    let cancel = false;
    setSurrPending(true);
    runSurrogate(op).then((s) => { if (!cancel) { setSurr(s); setSurrPending(s === null); } });
    runOod(op).then((m) => { if (!cancel) setOod(m); });
    return () => { cancel = true; };
  }, [op]);

  const set = (k: keyof Operating, v: number) => setOp((o) => ({ ...o, [k]: v }));
  const Kpi = ({ label, value }: { label: string; value: string }) => (
    <div className="pf-kpi"><div className="pf-kpi-v">{value}</div><div className="pf-kpi-l">{label}</div></div>
  );

  // sensitivity sweep: vary one control about the operating point
  const sweep = (k: keyof Operating, lo: number, hi: number) =>
    [lo, (lo + hi) / 2, hi].map((v) => ({ v, p: evaluate({ ...op, [k]: v }) }));

  const tabs = [
    {
      id: 'charge3d', label: es ? 'Carga 3D' : '3D charge',
      content: (
        <div className="pf-vizstack">
          <div className="pf-plot-t">{es ? 'El molino girando con la carga: las partículas suben con la pared (cinemática de Davis) y caen en arcos de cataract. Arrastra para orbitar.' : 'The rotating mill with the charge: particles ride the shell (Davis kinematics) and fall in cataract arcs. Drag to orbit.'}</div>
          <Mill3D op={op} />
          <div className="pf-kpis">
            <Kpi label={es ? 'régimen' : 'regime'} value={r.regime} />
            <Kpi label="φc" value={op.phiC.toFixed(2)} />
            <Kpi label={es ? 'potencia' : 'power'} value={kw(r.phfKw)} />
            <Kpi label={es ? '% centrifugando' : '% centrifuging'} value={`${(r.fracCentrifuging * 100).toFixed(0)}%`} />
          </div>
        </div>
      ),
    },
    {
      id: 'traj', label: es ? 'Trayectorias' : 'Trajectories',
      content: (
        <div className="pf-vizstack">
          <div className="pf-plot-t">{es ? 'Corte transversal: el punto de partida de cada capa radial (cos α = φc²·r/R) + la parábola de cataract. Las capas externas se lanzan más alto → el abanico.' : 'Cross-section: the departure point of each radial shell (cos α = φc²·r/R) + the cataract parabola. The outer shells are thrown highest → the fan.'}</div>
          <TrajectoryDiagram result={r} diameterM={op.diameterM} />
          <div className="pf-kpis">
            <Kpi label={es ? 'hombro (shoulder)' : 'shoulder'} value={`${r.shoulderDeg.toFixed(0)}°`} />
            <Kpi label={es ? 'pie (toe)' : 'toe'} value={`${r.toeDeg.toFixed(0)}°`} />
            <Kpi label="Nc" value={`${r.ncRpm.toFixed(1)} rpm`} />
            <Kpi label="N" value={`${r.nRpm.toFixed(1)} rpm`} />
          </div>
        </div>
      ),
    },
    {
      id: 'regime', label: es ? 'Mapa de régimen' : 'Regime map',
      content: (
        <div className="pf-vizstack">
          <div className="pf-plot-t">{es ? 'El mapa φc × J con las bandas: slumping → cascading → cataracting → centrifuging. El marcador es tu punto de operación.' : 'The φc × J map with the bands: slumping → cascading → cataracting → centrifuging. The marker is your operating point.'}</div>
          <RegimeMap phiC={op.phiC} fill={op.fill} />
          <p className="pf-note">{es
            ? `Régimen actual: ${r.regime}. Los molinos reales operan φc ≈ 0.65–0.82. Sobre ~0.85 el cataract puede impactar el revestimiento (sobre-velocidad).`
            : `Current regime: ${r.regime}. Real mills run φc ≈ 0.65–0.82. Above ~0.85 the cataract can impact the liner (over-speed).`}</p>
        </div>
      ),
    },
    {
      id: 'power', label: es ? 'Potencia' : 'Power draw',
      content: (
        <div className="pf-vizstack">
          <div className="pf-plot-t">{es ? 'Potencia neta vs φc (Hogg-Fuerstenau + forma Morrell). La banda roja = centrifuging (φc ≥ 1); la línea = tu φc.' : 'Net power vs φc (Hogg-Fuerstenau + Morrell-form). The red band = centrifuging (φc ≥ 1); the line = your φc.'}</div>
          <PowerChart curve={r.powerCurve} phiC={op.phiC} />
          <div className="pf-kpis">
            <Kpi label="Hogg-Fuerstenau" value={kw(r.phfKw)} />
            <Kpi label="Morrell-form" value={kw(r.pMorrellKw)} />
            <Kpi label={es ? 'masa de carga' : 'charge mass'} value={`${r.chargeMassT.toFixed(0)} t`} />
            <Kpi label={es ? 'energía Bond' : 'Bond duty'} value={`${r.bondWKwhT.toFixed(1)} kWh/t`} />
          </div>
        </div>
      ),
    },
    {
      id: 'gauges', label: es ? 'Indicadores' : 'Gauges',
      content: (
        <div className="pf-vizstack">
          <div className="pf-kpis">
            <Kpi label={es ? 'velocidad crítica' : 'critical speed'} value={`${r.ncRpm.toFixed(1)} rpm`} />
            <Kpi label={es ? 'velocidad' : 'speed'} value={`${r.nRpm.toFixed(1)} rpm (φc ${op.phiC.toFixed(2)})`} />
            <Kpi label={es ? 'régimen' : 'regime'} value={r.regime} />
            <Kpi label={es ? '% centrifugando' : '% centrifuging'} value={`${(r.fracCentrifuging * 100).toFixed(0)}%`} />
            <Kpi label={es ? 'potencia neta' : 'net power'} value={kw(r.phfKw)} />
            <Kpi label={es ? 'potencia/tonelada' : 'power/tonne'} value={`${(r.phfKw / Math.max(1, r.chargeMassT)).toFixed(1)} kW/t`} />
            <Kpi label={es ? 'masa de carga' : 'charge mass'} value={`${r.chargeMassT.toFixed(0)} t`} />
            <Kpi label="shoulder / toe" value={`${r.shoulderDeg.toFixed(0)}° / ${r.toeDeg.toFixed(0)}°`} />
          </div>
          {r.flags.length > 0 && <p className="pf-note" style={{ color: 'var(--color-warn)' }}>{r.flags.join(' · ')}</p>}
        </div>
      ),
    },
    {
      id: 'sens', label: es ? 'Sensibilidad' : 'Sensitivity',
      content: (
        <div className="pf-vizstack">
          <table className="cmp-table">
            <thead><tr><th>{es ? 'parámetro' : 'parameter'}</th><th>−</th><th>{es ? 'base' : 'base'}</th><th>+</th><th>{es ? 'potencia (−/base/+)' : 'power (−/base/+)'}</th></tr></thead>
            <tbody>
              {[
                { k: 'phiC' as const, lo: 0.55, hi: 0.95, fmt: (v: number) => v.toFixed(2) },
                { k: 'fill' as const, lo: 0.2, hi: 0.45, fmt: (v: number) => `${(v * 100).toFixed(0)}%` },
                { k: 'diameterM' as const, lo: op.diameterM * 0.7, hi: op.diameterM * 1.3, fmt: (v: number) => `${v.toFixed(1)} m` },
              ].map(({ k, lo, hi, fmt }) => {
                const s = sweep(k, lo, hi);
                return (
                  <tr key={k}>
                    <td>{k === 'phiC' ? 'φc' : k === 'fill' ? (es ? 'llenado J' : 'fill J') : (es ? 'diámetro' : 'diameter')}</td>
                    <td>{fmt(lo)}</td><td>{fmt((lo + hi) / 2)}</td><td>{fmt(hi)}</td>
                    <td>{kw(s[0].p.phfKw)} / {kw(s[1].p.phfKw)} / {kw(s[2].p.phfKw)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="pf-note">{es ? 'Cada fila re-evalúa el motor exacto con un shock al parámetro — cuantifica cómo se mueve la potencia.' : 'Each row re-evaluates the exact engine with a shock to the parameter — it quantifies how the power moves.'}</p>
        </div>
      ),
    },
    {
      id: 'whatif', label: es ? 'What-if (ONNX)' : 'What-if (ONNX)',
      content: (
        <div className="pf-vizstack">
          <div className="pf-plot-t">{es ? 'El surrogate de potencia (ONNX) emula el motor analítico para barridos instantáneos del envolvente de operación.' : 'The power surrogate (ONNX) emulates the analytic engine for instant operating-envelope sweeps.'}</div>
          {surrPending ? (
            <div className="pf-pending">
              <strong>{es ? 'Surrogate: pendiente de entrenamiento' : 'Surrogate: pending training'}</strong>
              <p>{es ? 'Corre `python -m cclab.pipeline all --retrain` para entrenar el surrogate de potencia (torch → ONNX). El motor analítico EXACTO corre en vivo mientras tanto.' : 'Run `python -m cclab.pipeline all --retrain` to train the power surrogate (torch → ONNX). The EXACT analytic engine runs live meanwhile.'}</p>
            </div>
          ) : (
            <>
              <div className="pf-kpis">
                <Kpi label={es ? 'surrogate (potencia)' : 'surrogate (power)'} value={surr ? kw(surr.powerKw) : '—'} />
                <Kpi label={es ? 'exacto (Hogg-F.)' : 'exact (Hogg-F.)'} value={kw(r.phfKw)} />
                <Kpi label={es ? 'error' : 'error'} value={surr ? `${(Math.abs(surr.powerKw - r.phfKw) / Math.max(1, r.phfKw) * 100).toFixed(1)}%` : '—'} />
              </div>
              <p className="pf-note">{es ? 'El motor analítico exacto es la autoridad; el surrogate gana su lugar por la velocidad (barridos Monte-Carlo instantáneos), no por una victoria fabricada.' : 'The exact analytic engine is the authority; the surrogate earns its place on speed (instant Monte-Carlo sweeps), not a fabricated win.'}</p>
            </>
          )}
        </div>
      ),
    },
    {
      id: 'anomaly', label: es ? 'Anomalía (AE)' : 'Anomaly (AE)',
      content: (
        <div className="pf-vizstack">
          <div className="pf-plot-t">{es ? 'El autoencoder OOD marca puntos de operación fuera del envolvente entrenado (sobre-velocidad, casi-centrifugando) — el guardia en vivo.' : 'The OOD autoencoder flags operating points outside the trained envelope (over-speed, near-centrifuging) — the live guard.'}</div>
          {ood == null ? (
            <div className="pf-pending">
              <strong>{es ? 'Autoencoder OOD: pendiente de entrenamiento' : 'OOD autoencoder: pending training'}</strong>
              <p>{es ? 'Entrénalo con `--retrain`. Mientras tanto, las banderas de validez del motor (abajo) son el guardia honesto.' : 'Train it with `--retrain`. Meanwhile the engine validity flags (below) are the honest guard.'}</p>
            </div>
          ) : (
            <div className="pf-kpis"><Kpi label={es ? 'puntaje de anomalía' : 'anomaly score'} value={ood.toFixed(3)} /></div>
          )}
          {r.flags.length > 0 && <p className="pf-note" style={{ color: 'var(--color-warn)' }}>{r.flags.join(' · ')}</p>}
        </div>
      ),
    },
  ];

  return (
    <div className="pf-layout">
      <aside className="pf-side">
        <div className="pf-card">
          <div className="pf-card-t">{es ? 'Caso' : 'Case'}</div>
          {CATS.map((cat) => (
            <div key={cat} className="pf-catgroup">
              <div className="pf-catlabel">{cat.split(' (')[0]}</div>
              <div className="pf-chips">
                {CASES.filter((cc) => cc.category === cat).map((cc) => (
                  <button key={cc.id} className={`chip ${caseId === cc.id ? 'on' : ''}`} title={cc.name} onClick={() => setCaseId(cc.id)}>{cc.id}</button>
                ))}
              </div>
            </div>
          ))}
          <div className="pf-cap">{theCase.name}</div>
          <div className="pf-cap pf-muted">{theCase.realOrSynthetic} · {theCase.expectedBand}</div>
        </div>
        <div className="pf-card">
          <div className="pf-card-t">{es ? 'Molino (en vivo)' : 'Mill (live)'}</div>
          <div className="pf-chips">
            {MILLS.map((m) => (
              <button key={m} className={`chip ${op.millType === m ? 'on' : ''}`} onClick={() => setOp((o) => ({ ...o, millType: m }))}>{m}</button>
            ))}
          </div>
          <label className="pf-ctl">{es ? 'fracción crítica φc' : 'fraction critical φc'}: {op.phiC.toFixed(2)}
            <input className="range" type="range" min={0.3} max={1.1} step={0.01} value={op.phiC} onChange={(e) => set('phiC', +e.target.value)} />
          </label>
          <label className="pf-ctl">{es ? 'llenado J' : 'fill J'}: {(op.fill * 100).toFixed(0)}%
            <input className="range" type="range" min={0} max={0.55} step={0.01} value={op.fill} onChange={(e) => set('fill', +e.target.value)} />
          </label>
          <label className="pf-ctl">{es ? 'diámetro' : 'diameter'}: {op.diameterM.toFixed(1)} m
            <input className="range" type="range" min={2} max={12} step={0.1} value={op.diameterM} onChange={(e) => set('diameterM', +e.target.value)} />
          </label>
          <label className="pf-ctl">{es ? 'tamaño de bola' : 'ball size'}: {op.ballTopMm.toFixed(0)} mm
            <input className="range" type="range" min={20} max={150} step={5} value={op.ballTopMm} onChange={(e) => set('ballTopMm', +e.target.value)} />
          </label>
          <div className={`cc-regime-pill cc-regime-${r.regime}`}>{r.regime} · φc {op.phiC.toFixed(2)}</div>
        </div>
      </aside>
      <main className="pf-main">
        <Tabs tabs={tabs} ariaLabel={es ? 'vistas del molino' : 'mill views'} />
      </main>
    </div>
  );
}
