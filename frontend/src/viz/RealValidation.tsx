import { useMemo, useState } from 'react';
import type { RealMill } from '../mill/realmills.ts';
import { allPredictions, validationStats } from '../mill/realpower.ts';

// The Real-data validation panel (issue #45, the novel rung): the App's Hogg-Fuerstenau power, calibrated to the
// real Doll motor-basis mills, plotted predicted-vs-measured against the 11 surveyed mills, with the y=x agreement
// line, the +-1.96 sigma uncertainty band, and the honest leave-one-out error. The picked mill is highlighted.
// SVG scatter with a hover readout (interactive-viz rubric).
export function RealValidation({ mill, es }: { mill: RealMill; es: boolean }) {
  const preds = useMemo(() => allPredictions(), []);
  const stats = useMemo(() => validationStats(), []);
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
        <Kpi label={es ? 'error leave-one-out' : 'leave-one-out error'} value={`${stats.looMeanAbsPct.toFixed(1)}%`} sub={es ? `medio · máx ${stats.looMaxAbsPct.toFixed(0)}%` : `mean · max ${stats.looMaxAbsPct.toFixed(0)}%`} />
        <Kpi label={es ? 'ajuste R²' : 'fit R²'} value={stats.r2.toFixed(3)} sub={es ? `${stats.n} molinos (base motor)` : `${stats.n} mills (motor basis)`} />
        <Kpi label={es ? 'banda ±1.96σ' : '±1.96σ band'} value={`±${(band / 1000).toFixed(1)} MW`} sub={es ? 'incertidumbre de predicción' : 'prediction uncertainty'} />
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
          {preds.map((p) => {
            const picked = p.mill.id === mill.id;
            return (
              <circle key={p.mill.id} cx={sx(p.measured)} cy={sy(p.predicted)} r={picked ? 7 : 4.5}
                fill={p.mill.basis === 'net' ? 'var(--color-warn, #d29922)' : 'var(--color-accent)'}
                stroke={picked ? 'var(--color-fg)' : 'none'} strokeWidth={picked ? 2 : 0} opacity={picked ? 1 : 0.7}
                onMouseEnter={(e) => setHover({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY, text: `${p.mill.name}: ${es ? 'pred' : 'pred'} ${(p.predicted / 1000).toFixed(1)} · ${es ? 'med' : 'meas'} ${(p.measured / 1000).toFixed(1)} MW · ${p.errPct >= 0 ? '+' : ''}${p.errPct.toFixed(0)}%` })}
                onMouseLeave={() => setHover(null)} style={{ cursor: 'pointer' }} />
            );
          })}
        </svg>
        {hover && <div className="cc-map-readout" style={{ position: 'absolute', left: Math.min(hover.x + 12, W - 180), top: hover.y + 12, pointerEvents: 'none' }}>{hover.text}</div>}
      </div>

      <p className="cc-cap cc-muted">
        {es ? 'Azul = base motor (PDCS de Doll, 8 molinos calibrados); ámbar = base neta (PPMP, 3 molinos, comparación directa). La línea es acuerdo perfecto; la banda es ±1.96σ del ajuste motor.'
            : 'Blue = motor basis (Doll PDCS, the 8 calibrated mills); amber = net basis (PPMP, 3 mills, direct comparison). The line is perfect agreement; the band is ±1.96σ of the motor fit.'}
      </p>

      <table className="cmp-table">
        <thead><tr><th>{es ? 'molino' : 'mill'}</th><th>{es ? 'tipo' : 'type'}</th><th>HF net</th><th>{es ? 'predicha' : 'predicted'}</th><th>{es ? 'medida' : 'measured'}</th><th>{es ? 'error' : 'error'}</th></tr></thead>
        <tbody>
          {preds.map((p) => (
            <tr key={p.mill.id} className={p.mill.id === mill.id ? 'cl-row-ship' : ''}>
              <td>{p.mill.name}</td>
              <td className="cc-cap">{p.mill.type}{p.mill.basis === 'net' ? (es ? ' · neta' : ' · net') : ''}</td>
              <td className="mono">{(p.hfNet / 1000).toFixed(2)}</td>
              <td className="mono">{(p.predicted / 1000).toFixed(2)}</td>
              <td className="mono">{(p.measured / 1000).toFixed(2)}</td>
              <td className="mono" style={{ color: Math.abs(p.errPct) < 10 ? 'var(--color-good, #3fb950)' : 'var(--color-warn, #d29922)' }}>{p.errPct >= 0 ? '+' : ''}{p.errPct.toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="cc-note" style={{ marginTop: '0.6rem' }}>
        {es ? 'Honesto: la potencia HF neta es un modelo de primeros principios del movimiento de carga; aquí se CALIBRA contra potencia industrial medida real (los 8 molinos base-motor de Doll) y su error se reporta por leave-one-out (entrenar sin cada molino, predecirlo). No se transfiere la precisión de ningún paper a este resultado. El C-model continuo completo de Morrell necesita el texto Napier-Munn (1996) para la función Z y el coeficiente cinético, la mejora documentada.'
            : 'Honest: the HF net power is a first-principles charge-motion model; here it is CALIBRATED against REAL measured industrial power (the 8 Doll motor-basis mills) and its error is reported by leave-one-out (train without each mill, predict it). No paper accuracy is transplanted onto this result. Morrell\'s full continuum C-model needs the Napier-Munn (1996) textbook for the Z function and the kinetic coefficient, the documented upgrade.'}
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
