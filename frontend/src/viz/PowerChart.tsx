import { useCallback } from 'react';
import type uPlot from 'uplot';
import { UPlotChart, themeColors } from './UPlotChart.tsx';
import type { PowerPoint } from '../mill/types.ts';

// Power vs fraction-of-critical-speed: the Hogg-Fuerstenau + Morrell-form curves, with the current operating phiC
// marked and the centrifuging band (phiC >= 1) shaded. Reads kW on hover. The dramatic peak-then-roll-off picture.
export function PowerChart({ curve, phiC, height = 260 }: { curve: PowerPoint[]; phiC: number; height?: number }) {
  const x = curve.map((p) => p.phiC);
  const data = [x, curve.map((p) => p.phf), curve.map((p) => p.morrell)] as unknown as uPlot.AlignedData;
  const build = useCallback((width: number, h: number): uPlot.Options => {
    const c = themeColors();
    return {
      width,
      height: h,
      scales: { x: { time: false }, y: { range: [0, null] as unknown as uPlot.Scale.Range } },
      axes: [
        { label: 'fraction of critical speed φc', stroke: c.subtle, grid: { stroke: c.border }, ticks: { stroke: c.border } },
        { label: 'net power [kW]', stroke: c.subtle, grid: { stroke: c.border }, ticks: { stroke: c.border } },
      ],
      series: [
        { label: 'φc' },
        { label: 'Hogg-Fuerstenau', stroke: c.accent, width: 2 },
        { label: 'Morrell-form', stroke: c.good, width: 2, dash: [5, 3] },
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
  }, [phiC]);
  return <UPlotChart data={data} build={build} height={height} />;
}
