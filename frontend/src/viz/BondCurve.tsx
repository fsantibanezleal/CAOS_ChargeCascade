import type { Operating } from '../mill/index.ts';

// Bond's energy-size law as an SVG curve: the specific grinding energy W = 10*Wi*(1/sqrt(P80)-1/sqrt(F80)) [kWh/t]
// rises as the target product P80 gets finer (left). The marker is the current (P80, W); the dashed line is the
// available specific energy P_net/tph, where it crosses the Bond curve is the FINEST P80 this mill+throughput can
// actually achieve (to its right the mill has spare energy; to its left it is energy-limited). Reacts to the ore
// (Wi, F80) and the live mill power. Pure SVG, theme-via-CSS-vars.
export function BondCurve({ op, netPowerKw, es }: { op: Operating; netPowerKw: number; es: boolean }) {
  const W = 460, H = 220, padL = 46, padR = 14, padT = 14, padB = 34;
  const wOf = (p80: number) => 10 * op.oreWi * (1 / Math.sqrt(p80) - 1 / Math.sqrt(op.feedF80um));
  // sweep P80 from a fine 10 µm up to (just below) F80
  const pMin = 10, pMax = Math.max(pMin * 2, op.feedF80um * 0.98);
  const N = 60;
  const pts = Array.from({ length: N }, (_, i) => {
    const p80 = pMin * Math.pow(pMax / pMin, i / (N - 1)); // log-spaced
    return { p80, w: Math.max(0, wOf(p80)) };
  });
  const wMax = Math.max(...pts.map((q) => q.w), 1e-6);
  // available specific energy [kWh/t] = net power / throughput
  const wAvail = op.tph > 0 ? netPowerKw / op.tph : 0;
  const lx = (p80: number) => padL + (Math.log(p80 / pMin) / Math.log(pMax / pMin)) * (W - padL - padR);
  const ly = (w: number) => padT + (1 - w / (wMax * 1.05)) * (H - padT - padB);
  const wHere = Math.max(0, wOf(op.prodP80um));

  const xticks = [10, 100, 1000, 10000, 100000].filter((t) => t >= pMin && t <= pMax);
  return (
    <div className="rv-plot" style={{ maxWidth: W + 20 }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ font: '11px var(--font-sans, system-ui, sans-serif)' }} role="img" aria-label={es ? 'curva de Bond energía-tamaño' : 'Bond energy-size curve'}>
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}><line x1={padL} y1={ly(wMax * 1.05 * f)} x2={W - padR} y2={ly(wMax * 1.05 * f)} stroke="var(--color-border)" /><text x={padL - 5} y={ly(wMax * 1.05 * f) + 4} textAnchor="end" fill="var(--color-fg-subtle)">{(wMax * 1.05 * f).toFixed(0)}</text></g>
        ))}
        {/* available-energy line: where it meets the curve is the achievable P80 */}
        {wAvail > 0 && wAvail < wMax * 1.05 && (
          <g><line x1={padL} y1={ly(wAvail)} x2={W - padR} y2={ly(wAvail)} stroke="var(--color-accent)" strokeDasharray="5 4" strokeWidth={1.6} />
            <text x={W - padR} y={ly(wAvail) - 4} textAnchor="end" fill="var(--color-accent)">{es ? 'energía disponible' : 'available energy'} {wAvail.toFixed(1)}</text></g>
        )}
        {/* abundant spare energy: the available-energy line sits above the whole Bond curve, pin it to the top edge
            with an off-scale note rather than letting it vanish silently */}
        {wAvail >= wMax * 1.05 && (
          <g><line x1={padL} y1={ly(wMax * 1.05)} x2={W - padR} y2={ly(wMax * 1.05)} stroke="var(--color-accent)" strokeDasharray="5 4" strokeWidth={1.6} />
            <text x={W - padR} y={ly(wMax * 1.05) + 12} textAnchor="end" fill="var(--color-accent)">{es ? `energía disponible ${wAvail.toFixed(0)} (fuera de escala, energía de sobra)` : `available energy ${wAvail.toFixed(0)} (off scale, abundant spare)`}</text></g>
        )}
        <polyline points={pts.map((q) => `${lx(q.p80)},${ly(q.w)}`).join(' ')} fill="none" stroke="#d9a406" strokeWidth={2.4} />
        {/* current operating point (P80, W) */}
        <circle cx={lx(op.prodP80um)} cy={ly(wHere)} r={5} fill="#d9a406" stroke="#fff" strokeWidth={1.5} />
        {xticks.map((t) => <text key={t} x={lx(t)} y={H - 18} textAnchor="middle" fill="var(--color-fg-subtle)">{t >= 1000 ? `${t / 1000}mm` : `${t}µm`}</text>)}
        <text x={W / 2} y={H - 4} textAnchor="middle" fill="var(--color-fg-faint)">{es ? 'P80 del producto (menor = más fino)  ·  W [kWh/t]' : 'product P80 (smaller = finer)  ·  W [kWh/t]'}</text>
      </svg>
    </div>
  );
}
