import { useCallback } from 'react';
import { useShellLang } from '@fasl-work/caos-app-shell';
import type uPlot from 'uplot';
import { UPlotChart, themeColors } from './UPlotChart.tsx';
import type { PowerPoint } from '../mill/types.ts';

// Power vs fraction-of-critical-speed: two independent models, Hogg-Fuerstenau (rigid-body torque arm) and the real
// Morrell (1996) C-model (continuum charge shape). The current operating phiC is marked and the centrifuging band
// (phiC >= 1) is shaded. Reads kW on hover. The C-model line gaps where the model is out of range.
export function PowerChart({ curve, phiC, height = 260 }: { curve: PowerPoint[]; phiC: number; height?: number }) {
  const es = useShellLang() === 'es';
  const x = curve.map((p) => p.phiC);
  const data = [x, curve.map((p) => p.phf), curve.map((p) => p.cModel)] as unknown as uPlot.AlignedData;
  const build = useCallback((width: number, h: number): uPlot.Options => {
    const c = themeColors();
    return {
      width,
      height: h,
      scales: { x: { time: false }, y: { range: [0, null] as unknown as uPlot.Scale.Range } },
      axes: [
        { label: es ? 'fracción de velocidad crítica φc' : 'fraction of critical speed φc', stroke: c.subtle, grid: { stroke: c.border }, ticks: { stroke: c.border } },
        { label: es ? 'potencia neta [kW]' : 'net power [kW]', stroke: c.subtle, grid: { stroke: c.border }, ticks: { stroke: c.border } },
      ],
      series: [
        { label: 'φc' },
        { label: 'Hogg-Fuerstenau', stroke: c.accent, width: 2 },
        { label: es ? 'Morrell C-model (independiente)' : 'Morrell C-model (independent)', stroke: c.good, width: 2, dash: [5, 3] },
      ],
      hooks: {
        draw: [
          (u: uPlot) => {
            // mark the operating phiC + shade centrifuging (phiC >= 1)
            const ctx = u.ctx;
            const xOp = u.valToPos(phiC, 'x', true);
            const x1 = u.valToPos(1, 'x', true);
            ctx.save();
            ctx.fillStyle = 'rgba(248,81,73,0.10)';
            ctx.fillRect(x1, u.bbox.top, u.bbox.left + u.bbox.width - x1, u.bbox.height);
            ctx.strokeStyle = c.warn;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(xOp, u.bbox.top);
            ctx.lineTo(xOp, u.bbox.top + u.bbox.height);
            ctx.stroke();
            ctx.restore();
          },
        ],
      },
    };
  }, [phiC, es]);
  return <UPlotChart data={data} build={build} height={height} />;
}
