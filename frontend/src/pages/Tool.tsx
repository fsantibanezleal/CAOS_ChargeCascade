import { useEffect, useMemo, useState } from 'react';
import { Tabs, useShellLang } from '@fasl-work/caos-app-shell';
import { CASES, caseById, evaluate, MILL_PRESETS, recommendPhiCForRegime, solvePhiCForCapacity, type MillType, type Operating, type Regime } from '../mill/index.ts';
import { runOod, runSurrogate } from '../lib/ort.ts';
import { loadLearned } from '../lib/artifacts.ts';
import { Mill3D } from '../viz/Mill3D.tsx';
import { TrajectoryDiagram } from '../viz/TrajectoryDiagram.tsx';
import { RegimeMap } from '../viz/RegimeMap.tsx';
import { PowerChart } from '../viz/PowerChart.tsx';
import { ComminutionMap } from '../viz/ComminutionMap.tsx';
import { BondCurve } from '../viz/BondCurve.tsx';

const CATS = ['mill type (the machine)', 'speed sweep (the regime transition)', 'fill / charge regime', 'control (analytic anchor)'];
const MILLS: MillType[] = ['ball', 'sag', 'rod', 'ag'];
const kw = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(2)} MW` : `${v.toFixed(0)} kW`);

export default function Tool() {
  const es = useShellLang() === 'es';
  const [caseId, setCaseId] = useState('K-BALL');
  const theCase = useMemo(() => caseById(caseId), [caseId]);
  const [op, setOp] = useState<Operating>(theCase.op);
  useEffect(() => { setOp(theCase.op); setInvTph(null); }, [theCase]);   // reset the inverse target to the new case's capacity

  const r = useMemo(() => evaluate(op), [op]);
  const [surr, setSurr] = useState<{ powerKw: number; fracCentrifuging: number } | null>(null);
  const [surrPending, setSurrPending] = useState(true);
  const [ood, setOod] = useState<number | null>(null);
  const [oodThr, setOodThr] = useState<number | null>(null);
  const [invRegime, setInvRegime] = useState<Regime>('cataracting');   // inverse: target regime → recommended φc
  const [invTph, setInvTph] = useState<number | null>(null);           // inverse: target throughput → recommended φc

  useEffect(() => { loadLearned().then((l) => setOodThr(l.ood?.thr ?? null)).catch(() => setOodThr(null)); }, []);

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
      id: 'comminution', label: es ? 'Conminución' : 'Comminution',
      content: (() => {
        const wBond = r.bondWKwhT;                                   // Bond specific energy [kWh/t] (ore + F80->P80)
        const capacity = wBond > 0 ? r.phfKw / wBond : 0;            // power-limited throughput [t/h] = P_net / W
        const margin = capacity - op.tph;                            // headroom over the target throughput
        return (
          <div className="pf-vizstack">
            <div className="pf-plot-t">{es
              ? 'Conminución: la ley de Bond fija la ENERGÍA específica W para moler F80→P80; el motor fija la POTENCIA neta. Su cociente P/W es la capacidad de molienda [t/h]. El mapa muestra esa capacidad sobre φc×J. El marcador es tu punto.'
              : 'Comminution: Bond’s law sets the specific ENERGY W to grind F80→P80; the engine sets the net POWER. Their ratio P/W is the grinding capacity [t/h]. The map shows that capacity over φc×J. The marker is your operating point.'}</div>
            <ComminutionMap op={op} />
            <div className="pf-cap pf-muted" style={{ display: 'flex', gap: '1.1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              <span><span style={{ display: 'inline-block', width: 10, height: 10, background: 'rgb(232,202,64)', marginRight: 4 }} />{es ? 'mayor capacidad' : 'higher capacity'}</span>
              <span><span style={{ display: 'inline-block', width: 10, height: 10, background: 'rgba(248,81,73,0.6)', marginRight: 4 }} />{es ? 'bajo el objetivo (no rinde la tarea)' : 'below target (cannot meet the duty)'}</span>
              <span><span style={{ display: 'inline-block', width: 10, height: 10, background: 'rgb(150,154,164)', marginRight: 4 }} />{es ? 'centrifugando (molienda colapsa)' : 'centrifuging (grinding collapses)'}</span>
            </div>
            <div className="pf-kpis">
              <Kpi label={es ? 'energía Bond W' : 'Bond duty W'} value={`${wBond.toFixed(1)} kWh/t`} />
              <Kpi label={es ? 'potencia neta' : 'net power'} value={kw(r.phfKw)} />
              <Kpi label={es ? 'capacidad (P/W)' : 'capacity (P/W)'} value={`${capacity.toFixed(0)} t/h`} />
              <Kpi label={es ? `margen vs objetivo ${op.tph} t/h` : `margin vs target ${op.tph} t/h`} value={`${margin >= 0 ? '+' : ''}${margin.toFixed(0)} t/h`} />
            </div>
            <p className="pf-note">{es
              ? `Balance: capacidad ${capacity.toFixed(0)} t/h vs objetivo ${op.tph} t/h → ${margin >= 0 ? `${margin.toFixed(0)} t/h de holgura (el molino rinde la tarea)` : `déficit de ${(-margin).toFixed(0)} t/h (sube φc/J o reduce la finura)`}. A φc alto la carga se centrifuga (se pega a la pared, sin impacto) y la molienda se detiene — esos puntos van en gris (el modelo de torque NO se atenúa ahí, por eso no se muestra su P/W como capacidad).`
              : `Balance: capacity ${capacity.toFixed(0)} t/h vs target ${op.tph} t/h → ${margin >= 0 ? `${margin.toFixed(0)} t/h of headroom (the mill meets the duty)` : `${(-margin).toFixed(0)} t/h short (raise φc/J or coarsen the product)`}. At high φc the charge centrifuges (pins to the shell, no impact) and grinding stops — those points are greyed (the torque model is NOT tapered there, so its P/W is not shown as capacity).`}</p>
            <div className="pf-plot-t">{es ? 'La ley de Bond: la energía específica sube al moler más fino. La línea es la energía disponible (P/tph); donde corta la curva está el P80 más fino alcanzable.' : 'Bond’s law: the specific energy rises as you grind finer. The line is the available energy (P/tph); where it crosses the curve is the finest P80 achievable.'}</div>
            <BondCurve op={op} netPowerKw={r.phfKw} es={es} />
          </div>
        );
      })(),
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
      content: (() => {
        // inverse recommender (exact engine — the surrogate is only for sweeps). Power is monotone in φc, so a target
        // throughput bisects to a φc; the regime bands give a representative φc per motion regime.
        const curCap = r.bondWKwhT > 0 ? r.phfKw / r.bondWKwhT : 0;
        const cap = solvePhiCForCapacity(op, invTph ?? Math.round(curCap));
        const reg = recommendPhiCForRegime(op, invRegime);
        const tphLo = Math.max(0, Math.floor(cap.minTph / 10) * 10);
        const tphHi = Math.max(tphLo + 10, Math.ceil(cap.maxTph / 10) * 10);
        const tgt = invTph ?? Math.round(curCap);
        const regimes: Regime[] = ['cascading', 'cataracting', 'centrifuging'];
        return (
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

            <div className="pf-card" style={{ marginTop: '0.4rem' }}>
              <div className="pf-card-t">{es ? 'Inverso: objetivo → φc recomendado (motor exacto)' : 'Inverse: target → recommended φc (exact engine)'}</div>
              <p className="pf-note">{es ? 'El problema inverso: en lugar de leer la salida de un φc, fija una META y el motor (monótono en φc) resuelve el φc que la cumple a la geometría D/L/J actual.' : 'The inverse problem: instead of reading the output of a φc, set a GOAL and the engine (monotone in φc) solves the φc that meets it at the current D/L/J geometry.'}</p>

              {/* by motion regime */}
              <div className="pf-cap pf-muted">{es ? 'por régimen de movimiento' : 'by motion regime'}</div>
              <div className="pf-chips">
                {regimes.map((rg) => (
                  <button key={rg} className={`chip ${invRegime === rg ? 'on' : ''}`} onClick={() => setInvRegime(rg)}>{rg}</button>
                ))}
              </div>
              {reg.phiCRec != null ? (
                <p className="pf-note">
                  {es ? '→ φc recomendado' : '→ recommended φc'} <b>{reg.phiCRec.toFixed(2)}</b>
                  {reg.phiCLo != null && reg.phiCHi != null && ` (${es ? 'banda' : 'band'} ${reg.phiCLo.toFixed(2)}–${reg.phiCHi.toFixed(2)})`}
                  {!reg.operational && ` — ${es ? 'régimen no operativo (la molienda colapsa); es el límite a evitar' : 'non-operational regime (grinding collapses); the limit to avoid'}`}
                  {' '}<button className="chip" onClick={() => set('phiC', reg.phiCRec!)}>{es ? 'aplicar' : 'apply'}</button>
                </p>
              ) : <p className="pf-note">{es ? `el régimen ${invRegime} no es alcanzable a esta geometría` : `the ${invRegime} regime is not reachable at this geometry`}</p>}

              {/* by target throughput */}
              <div className="pf-cap pf-muted" style={{ marginTop: '0.5rem' }}>{es ? 'por capacidad objetivo' : 'by target throughput'}</div>
              <label className="pf-ctl">{es ? 'objetivo' : 'target'}: {tgt} t/h
                <input className="range" type="range" min={tphLo} max={tphHi} step={Math.max(1, Math.round((tphHi - tphLo) / 100))} value={tgt} onChange={(e) => setInvTph(+e.target.value)} />
              </label>
              {tgt > cap.maxTph + 0.5 ? (
                <p className="pf-note" style={{ color: 'var(--color-warn)' }}>
                  {es ? `fuera de alcance: el techo es ${cap.maxTph.toFixed(0)} t/h a φc ≈ 1.05 — sube D/L/J o reduce la finura` : `out of reach: the ceiling is ${cap.maxTph.toFixed(0)} t/h at φc ≈ 1.05 — raise D/L/J or coarsen the product`}
                </p>
              ) : cap.phiC != null ? (
                <p className="pf-note">
                  {es ? '→ φc recomendado' : '→ recommended φc'} <b>{cap.phiC.toFixed(2)}</b> {es ? 'para' : 'for'} {tgt} t/h
                  {tgt <= cap.minTph + 0.5 && ` (${es ? 'la velocidad mínima ya lo supera — capacidad de sobra' : 'min speed already exceeds it — spare capacity'})`}
                  {' '}<button className="chip" onClick={() => set('phiC', cap.phiC!)}>{es ? 'aplicar' : 'apply'}</button>
                </p>
              ) : <p className="pf-note">—</p>}
            </div>
          </div>
        );
      })(),
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
            <>
              <div className="pf-kpis">
                <Kpi label={es ? 'puntaje de anomalía' : 'anomaly score'} value={ood.toFixed(2)} />
                {oodThr != null && <Kpi label={es ? 'umbral (p95 in-dist)' : 'threshold (in-dist p95)'} value={oodThr.toFixed(2)} />}
                {oodThr != null && (
                  <Kpi label={es ? 'veredicto' : 'verdict'} value={ood > oodThr ? (es ? 'fuera de envolvente' : 'off-envelope') : (es ? 'en envolvente' : 'in-envelope')} />
                )}
              </div>
              {oodThr != null && (
                <div className={`cc-regime-pill ${ood > oodThr ? 'cc-regime-centrifuging' : 'cc-regime-cascading'}`}>
                  {ood > oodThr
                    ? (es ? 'el punto está fuera del envolvente entrenado — el surrogate está extrapolando' : 'the point is outside the trained envelope — the surrogate is extrapolating')
                    : (es ? 'el punto está dentro del envolvente entrenado' : 'the point is inside the trained envelope')}
                </div>
              )}
            </>
          )}
          {r.flags.length > 0 && <p className="pf-note" style={{ color: 'var(--color-warn)' }}>{r.flags.join(' · ')}</p>}
        </div>
      ),
    },
  ];

  return (
    <div className="page-body pf-layout">
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
          <div className="pf-card-t">{es ? 'Tipo de molino (preset)' : 'Mill type (preset)'}</div>
          <div className="pf-chips">
            {MILLS.map((m) => (
              // selecting a type loads that machine's characteristic geometry/media/density (MILL_PRESETS) — so Nc,
              // regime, power and the 3D charge all change; the sliders below then fine-tune from the preset.
              <button key={m} className={`chip ${op.millType === m ? 'on' : ''}`} onClick={() => setOp((o) => ({ ...o, millType: m, ...MILL_PRESETS[m] }))}>{m}</button>
            ))}
          </div>
          <div className="pf-cap pf-muted">{es ? 'carga el preset de geometría/medios de esa máquina (los deslizadores afinan)' : 'loads that machine’s geometry/media preset (sliders fine-tune)'}</div>
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
