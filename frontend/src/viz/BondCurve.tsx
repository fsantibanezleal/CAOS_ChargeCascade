import { useCallback, useMemo } from 'react';
import type uPlot from 'uplot';
import type { Operating } from '../mill/index.ts';
import { UPlotChart, themeColors } from './UPlotChart.tsx';

// Bond's energy-size law as an INTERACTIVE uPlot chart (Tier-A per the interactive-visualization rubric):
// the specific grinding energy W = 10*Wi*(1/sqrt(P80)-1/sqrt(F80)) [kWh/t] rises as the target product P80 gets
// finer (left, log x-scale). Crosshair + legend read out W at any P80. The dashed line is the available specific
// energy P_net/tph; where it crosses the Bond curve is the FINEST P80 this mill+throughput can actually achieve
// (to its right the mill has spare energy; to its left it is energy-limited). The point marks the current
// operating (P80, W). Reacts to the ore (Wi, F80) and the live mill power; theme-aware.
export function BondCurve({ op, netPowerKw, es }: { op: Operating; netPowerKw: number; es: boolean }) {
  const wOf = useCallback(
    (p80: number) => 10 * op.oreWi * (1 / Math.sqrt(p80) - 1 / Math.sqrt(op.feedF80um)),
    [op.oreWi, op.feedF80um],
  );
  const pMin = 10;
  const pMax = Math.max(pMin * 2, op.feedF80um * 0.98);
  const wAvail = op.tph > 0 ? netPowerKw / op.tph : 0;

  const { data, wMax } = useMemo(() => {
    const N = 120;
    const xs: number[] = [], ws: number[] = [];
    for (let i = 0; i < N; i++) {
      const p80 = pMin * Math.pow(pMax / pMin, i / (N - 1));   // log-spaced sweep
      xs.push(p80); ws.push(Math.max(0, wOf(p80)));
    }
    const wm = Math.max(...ws, 1e-6);
    const availOn = wAvail > 0 && wAvail < wm * 1.05;
    const avail = xs.map(() => (availOn ? wAvail : null));
    // the operating point as a points-only series: non-null only at the sweep sample nearest the current P80
    const hereW = Math.max(0, wOf(op.prodP80um));
    let nearest = 0;
    for (let i = 1; i < xs.length; i++) if (Math.abs(Math.log(xs[i] / op.prodP80um)) < Math.abs(Math.log(xs[nearest] / op.prodP80um))) nearest = i;
    const here = xs.map((_, i) => (i === nearest ? hereW : null));
    return { data: [xs, ws, avail, here] as uPlot.AlignedData, wMax: wm };
  }, [pMin, pMax, wAvail, wOf, op.prodP80um]);

  // uPlot log axes pass NULL for the minor splits they leave unlabelled; guard or the axis callback crashes
  const fmtP80 = (v: number | null) => (v == null ? '' : v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}mm` : `${v.toFixed(0)}µm`);
  const build = useCallback((width: number, height: number): uPlot.Options => {
    const c = themeColors();
    return {
      width, height,
      scales: { x: { distr: 3 } },                             // log-10 x: the size axis convention
      axes: [
        { stroke: c.subtle, grid: { stroke: c.border }, ticks: { stroke: c.border }, values: (_u, vs) => vs.map(fmtP80) },
        { stroke: c.subtle, grid: { stroke: c.border }, ticks: { stroke: c.border }, label: 'W [kWh/t]', labelSize: 12 },
      ],
      series: [
        { label: 'P80', value: (_u, v) => (v == null ? '--' : fmtP80(v)) },
        { label: es ? 'W de Bond' : 'Bond W', stroke: '#d9a406', width: 2.4, value: (_u, v) => (v == null ? '--' : `${v.toFixed(2)} kWh/t`) },
        { label: es ? 'energía disponible' : 'available energy', stroke: c.accent, width: 1.6, dash: [5, 4], value: (_u, v) => (v == null ? '--' : `${v.toFixed(2)} kWh/t`) },
        { label: es ? 'punto de operación' : 'operating point', stroke: '#d9a406', width: 0, points: { show: true, size: 9, fill: '#d9a406' }, value: (_u, v) => (v == null ? '--' : `${v.toFixed(2)} kWh/t`) },
      ],
      cursor: { drag: { x: true, y: false } },
      legend: { live: true },
    };
  }, [es]);

  return (
    <div className="cc-plot" style={{ maxWidth: 520 }}>
      <UPlotChart data={data} build={build} height={230} />
      {wAvail >= wMax * 1.05 && (
        <p className="cc-cap" style={{ marginTop: '0.2rem' }}>
          {es ? `energía disponible ${wAvail.toFixed(0)} kWh/t, fuera de escala: energía de sobra para todo el barrido` : `available energy ${wAvail.toFixed(0)} kWh/t, off scale: abundant spare energy across the whole sweep`}
        </p>
      )}
      <p className="cc-cap" style={{ marginTop: '0.2rem' }}>
        {es ? 'P80 del producto (menor = más fino), eje log. Donde la línea punteada cruza la curva de Bond está el P80 más fino alcanzable con la potencia y el tonelaje actuales. Arrastra para hacer zoom; doble clic para restablecer.' : 'Product P80 (smaller = finer), log axis. Where the dashed line crosses the Bond curve is the finest P80 achievable at the current power and throughput. Drag to zoom; double-click to reset.'}
      </p>
    </div>
  );
}
