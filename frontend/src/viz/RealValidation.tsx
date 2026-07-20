import { useMemo, useState } from 'react';
import type { RealMill } from '../mill/realmills.ts';
import { allPredictions, conformalReliability, morrellMeanAbsPct, validationStats } from '../mill/realpower.ts';

// The Real-data validation panel (issue #45, the novel rung): the App's Hogg-Fuerstenau power, calibrated to the
// real Doll motor-basis mills, plotted predicted-vs-measured against the 11 surveyed mills, with the y=x agreement
// line, the +-1.96 sigma uncertainty band, and the honest leave-one-out error. The picked mill is highlighted.
// SVG scatter with a hover readout (interactive-viz rubric).
export function RealValidation({ mill, es }: { mill: RealMill; es: boolean }) {
  const preds = useMemo(() => allPredictions(), []);
  const stats = useMemo(() => validationStats(), []);
  const morrellErr = useMemo(() => morrellMeanAbsPct(), []);
  const uq = useMemo(() => conformalReliability(), []);
  const [hover, setHover] = useState<{ x: number; y: number; text: string } | null>(null);

  const W = 460, H = 300, pad = 46;
  const vals = preds.flatMap((p) => [p.predicted, p.measured]);
  const hi = Math.max(...vals) * 1.08;
  const sx = (v: number) => pad + (v / hi) * (W - pad - 14);
  const sy = (v: number) => H - pad - (v / hi) * (H - pad - 14);
  const band = 1.96 * stats.residSdKw;   // 95% prediction band on the motor calibration

  return (
    <div className="cc-doc-sec">
      <div className="cc-kpis">
        <Kpi label={es ? 'HF calibrado, leave-one-mill-out' : 'HF calibrated, leave-one-mill-out'} value={`${stats.looMeanAbsPct.toFixed(1)}%`} sub={es ? `medio · máx ${stats.looMaxAbsPct.toFixed(0)}% · R² ${stats.r2.toFixed(2)}` : `mean · max ${stats.looMaxAbsPct.toFixed(0)}% · R² ${stats.r2.toFixed(2)}`} />
        <Kpi label={es ? 'Morrell C-model (independiente)' : 'Morrell C-model (independent)'} value={`${morrellErr.toFixed(1)}%`} sub={es ? 'sin calibrar, primeros principios' : 'uncalibrated, first-principles'} />
        <Kpi label={es ? 'anclas verificadas' : 'verified anchors'} value={`${preds.length}`} sub={es ? `${stats.nSites} molinos (${stats.n} base motor) + ${preds.length - stats.n} neta` : `${stats.nSites} mills (${stats.n} motor) + ${preds.length - stats.n} net`} />
      </div>
      <p className="cc-note" style={{ marginTop: '0.3rem' }}>
        <span className={`cc-gate-badge ${stats.leakageGateOk ? 'ok' : 'bad'}`}>{stats.leakageGateOk ? '✓' : '✗'}</span>
        {es
          ? ` Validación cruzada dejando un MOLINO fuera (LOMO), agrupada por molino físico: las encuestas repetidas del mismo molino nunca se reparten entre entrenamiento y prueba. Gate de fuga ${stats.leakageGateOk ? 'activo (train/test con sitios disjuntos)' : 'FALLA'}.`
          : ` Leave-one-MILL-out cross-validation, grouped by physical mill: repeat surveys of the same mill never straddle train and test. Leakage gate ${stats.leakageGateOk ? 'active (train/test siteIds disjoint)' : 'FAILING'}.`}</p>
      <div className="cc-uq-row">
        <span className="cc-uq-title">{es ? 'UQ conforme (jackknife+):' : 'Conformal UQ (jackknife+):'}</span>
        {uq.reports.map((r) => (
          <span key={r.alpha} className="cc-uq-cell">
            <b>{(r.nominal * 100).toFixed(0)}%</b> {es ? 'nominal' : 'nominal'} →{' '}
            {(r.empirical * 100).toFixed(0)}% {es ? 'empírico' : 'empirical'}{' '}
            <span className="cc-muted">[CP {(r.cpLowerCI * 100).toFixed(0)}–{(r.cpUpperCI * 100).toFixed(0)}%]</span>{' '}
            <span className={r.withinBound ? 'cc-uq-ok' : 'cc-uq-bad'}>{r.withinBound ? '✓' : '✗'} ≥{(r.guarantee * 100).toFixed(0)}%</span>
          </span>
        ))}
        <span className="cc-uq-cell cc-muted">{es
          ? `p.ej. ${uq.sample.millName} 90%: ${(uq.sample.lowerKw / 1000).toFixed(1)}–${(uq.sample.upperKw / 1000).toFixed(1)} MW (medido ${(uq.sample.measuredKw / 1000).toFixed(1)})`
          : `e.g. ${uq.sample.millName} 90%: ${(uq.sample.lowerKw / 1000).toFixed(1)}–${(uq.sample.upperKw / 1000).toFixed(1)} MW (measured ${(uq.sample.measuredKw / 1000).toFixed(1)})`}</span>
      </div>

      <div className="cc-plot" style={{ maxWidth: W + 20, position: 'relative' }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={es ? 'potencia predicha vs medida' : 'predicted vs measured power'}>
          {/* the +-band around the y=x agreement line */}
          <polygon points={`${sx(0)},${sy(0 + band)} ${sx(hi)},${sy(hi + band)} ${sx(hi)},${sy(hi - band)} ${sx(0)},${sy(0 - band)}`} fill="var(--color-accent)" opacity={0.1} />
          <line x1={sx(0)} y1={sy(0)} x2={sx(hi)} y2={sy(hi)} stroke="var(--color-fg-subtle)" strokeDasharray="5 4" />
          {/* axes */}
          <line x1={pad} y1={H - pad} x2={W - 14} y2={H - pad} stroke="var(--color-border)" />
          <line x1={pad} y1={14} x2={pad} y2={H - pad} stroke="var(--color-border)" />
          <text x={W / 2} y={H - 6} textAnchor="middle" className="cc-axl" fill="var(--color-fg-faint)">{es ? 'potencia medida (MW)' : 'measured power (MW)'}</text>
          <text x={12} y={H / 2} textAnchor="middle" transform={`rotate(-90 12 ${H / 2})`} className="cc-axl" fill="var(--color-fg-faint)">{es ? 'predicha (MW)' : 'predicted (MW)'}</text>
          {[0, 5000, 10000, 15000, 20000].filter((t) => t <= hi).map((t) => (
            <g key={t}>
              <text x={sx(t)} y={H - pad + 14} textAnchor="middle" className="cc-axl" fill="var(--color-fg-faint)">{t / 1000}</text>
              <text x={pad - 6} y={sy(t) + 4} textAnchor="end" className="cc-axl" fill="var(--color-fg-faint)">{t / 1000}</text>
            </g>
          ))}
          {/* Morrell C-model points (independent, hollow) */}
          {preds.map((p) => (
            <circle key={`m-${p.mill.id}`} cx={sx(p.measured)} cy={sy(p.morrell)} r={3.5} fill="none"
              stroke="var(--color-good, #3fb950)" strokeWidth={1.4} opacity={0.6} />
          ))}
          {/* HF-calibrated points (filled) */}
          {preds.map((p) => {
            const picked = p.mill.id === mill.id;
            return (
              <circle key={p.mill.id} cx={sx(p.measured)} cy={sy(p.predicted)} r={picked ? 7 : 4.5}
                fill={p.mill.basis === 'net' ? 'var(--color-warn, #d29922)' : 'var(--color-accent)'}
                stroke={picked ? 'var(--color-fg)' : 'none'} strokeWidth={picked ? 2 : 0} opacity={picked ? 1 : 0.7}
                onMouseEnter={(e) => setHover({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY, text: `${p.mill.name}: HF ${(p.predicted / 1000).toFixed(1)} · Morrell ${(p.morrell / 1000).toFixed(1)} · ${es ? 'med' : 'meas'} ${(p.measured / 1000).toFixed(1)} MW` })}
                onMouseLeave={() => setHover(null)} style={{ cursor: 'pointer' }} />
            );
          })}
        </svg>
        {hover && <div className="cc-map-readout" style={{ position: 'absolute', left: Math.min(hover.x + 12, W - 180), top: hover.y + 12, pointerEvents: 'none' }}>{hover.text}</div>}
      </div>

      <p className="cc-cap cc-muted">
        {es ? 'Puntos rellenos = HF calibrado (azul base motor, ámbar base neta); círculos verdes huecos = Morrell C-model (independiente, sin calibrar). La línea es acuerdo perfecto; la banda es ±1.96σ del ajuste HF motor.'
            : 'Filled points = HF calibrated (blue motor basis, amber net basis); hollow green circles = Morrell C-model (independent, uncalibrated). The line is perfect agreement; the band is ±1.96σ of the HF motor fit.'}
      </p>

      <table className="cmp-table">
        <thead><tr><th>{es ? 'molino' : 'mill'}</th><th>{es ? 'tipo' : 'type'}</th><th>HF cal.</th><th>Morrell</th><th>{es ? 'medida' : 'measured'}</th><th>HF err</th><th>Morrell err</th></tr></thead>
        <tbody>
          {preds.map((p) => (
            <tr key={p.mill.id} className={p.mill.id === mill.id ? 'cl-row-ship' : ''}>
              <td>{p.mill.name}</td>
              <td className="cc-cap">{p.mill.type}{p.mill.basis === 'net' ? (es ? ' · neta' : ' · net') : ''}</td>
              <td className="mono">{(p.predicted / 1000).toFixed(2)}</td>
              <td className="mono">{(p.morrell / 1000).toFixed(2)}</td>
              <td className="mono">{(p.measured / 1000).toFixed(2)}</td>
              <td className="mono" style={{ color: Math.abs(p.errPct) < 10 ? 'var(--color-good, #3fb950)' : 'var(--color-warn, #d29922)' }}>{p.errPct >= 0 ? '+' : ''}{p.errPct.toFixed(0)}%</td>
              <td className="mono" style={{ color: Math.abs(p.morrellErrPct) < 15 ? 'var(--color-good, #3fb950)' : 'var(--color-warn, #d29922)' }}>{p.morrellErrPct >= 0 ? '+' : ''}{p.morrellErrPct.toFixed(0)}%</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="cc-note" style={{ marginTop: '0.6rem' }}>
        {es ? `Dos modelos contra la verdad medida: (1) HF calibrado, la potencia HF de primeros principios ajustada a la potencia industrial medida real (${stats.n} molinos base-motor de Doll), error por leave-one-mill-out agrupado (entrenar sin cada molino físico, predecirlo); no se transfiere precisión de ningún paper. (2) Morrell C-model, el modelo SOTA real, ahora implementado (reproduce el ejemplo de Erdem 2004: bruta 1365 kW exacta) y ejecutado sin calibrar; su error es su desempeño real. Residual honesto: la convención exacta de densidad de carga de Napier-Munn afloja ~±10%, por eso Morrell tiende a sobre-predecir; la estructura y todos los coeficientes son exactos.`
            : `Two models against the measured truth: (1) HF calibrated, the first-principles HF power fitted to real measured industrial power (${stats.n} Doll motor-basis mills), error by grouped leave-one-mill-out (train without each physical mill, predict it); no paper accuracy is transplanted. (2) Morrell C-model, the real SOTA model, now implemented (it reproduces Erdem's 2004 worked example: gross 1365 kW exact) and run uncalibrated; its error is its genuine performance. Honest residual: the exact Napier-Munn charge-density packing convention is loose by ~±10%, so Morrell tends to over-predict; the structure and all coefficients are exact.`}
      </div>
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="cc-kpi">
      <div className="cc-kpi-v">{value}</div>
      <div className="cc-kpi-l">{label}</div>
      <div className="cc-cap cc-muted">{sub}</div>
    </div>
  );
}
