import { useEffect, useRef, useState } from 'react';
import { useShellLang, useThemeStore } from '@fasl-work/caos-app-shell';
import { bondWKwhT, evaluate, type Operating } from '../mill/index.ts';

// The comminution capacity map: the power-limited throughput T = P_net(phiC,J) / W_bond [t/h] over the phiC x J
// plane, for the current ore. Bond's law W = 10*Wi*(1/sqrt(P80)-1/sqrt(F80)) [kWh/t] is the process-energy duty (set
// by the ore + the F80->P80 size reduction; independent of mill speed/fill); the Hogg-Fuerstenau net power is what
// varies with phiC and J. Dividing the two gives the tonnage this mill can grind to spec at each operating point,
// the real "where does it grind the most?" answer. The red hatch marks where capacity falls below the target tph
// (the mill cannot meet the duty there); the marker is the current operating point. Pure canvas, theme-aware.
export function ComminutionMap({ op, height = 320 }: { op: Operating; height?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const theme = useThemeStore((s) => s.theme);
  const es = useShellLang() === 'es';
  const [read, setRead] = useState<{ x: number; y: number; text: string } | null>(null);

  // Hover value-readout (interactive-viz rubric): inverse-transform the cursor to (phiC, J), evaluate the same
  // engine at that point, and read out the power-limited capacity, or the honest collapsed state.
  const onMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const wrap = wrapRef.current; if (!wrap) return;
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const W = wrap.clientWidth || 600, H = height;
    const pad = { l: 46, r: 16, t: 16, b: 36 };
    const PHI_MIN = 0.3, PHI_MAX = 1.15, J_MAX = 0.6;
    const pw = W - pad.l - pad.r, ph = H - pad.t - pad.b;
    if (mx < pad.l || mx > W - pad.r || my < pad.t || my > H - pad.b) { setRead(null); return; }
    const phiC = PHI_MIN + ((mx - pad.l) / pw) * (PHI_MAX - PHI_MIN);
    const j = (1 - (my - pad.t) / ph) * J_MAX;
    const r = evaluate({ ...op, phiC, fill: j });
    const wBond = bondWKwhT(op.oreWi, op.feedF80um, op.prodP80um);
    const collapsed = r.regime === 'centrifuging' || r.fracCentrifuging > 0.5;
    const text = collapsed
      ? `φc ${phiC.toFixed(2)} · J ${(j * 100).toFixed(0)}% · ${es ? 'centrifugado (sin molienda)' : 'centrifuging (no grinding)'}`
      : `φc ${phiC.toFixed(2)} · J ${(j * 100).toFixed(0)}% · ${wBond > 0 ? (r.phfKw / wBond).toFixed(0) : '0'} t/h`;
    setRead({ x: mx, y: my, text });
  };

  useEffect(() => {
    const canvas = ref.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const W = wrap.clientWidth || 600;
    const H = height;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cs = getComputedStyle(document.documentElement);
    const fg = cs.getPropertyValue('--color-fg').trim() || (theme === 'dark' ? '#e6edf3' : '#1f2328');
    const sub = cs.getPropertyValue('--color-fg-subtle').trim() || '#9aa7b4';

    const pad = { l: 46, r: 16, t: 16, b: 36 };
    const pw = W - pad.l - pad.r;
    const ph = H - pad.t - pad.b;
    const PHI_MIN = 0.3, PHI_MAX = 1.15, J_MAX = 0.6;
    const px = (p: number) => pad.l + ((p - PHI_MIN) / (PHI_MAX - PHI_MIN)) * pw;
    const py = (j: number) => pad.t + (1 - j / J_MAX) * ph;

    const wBond = bondWKwhT(op.oreWi, op.feedF80um, op.prodP80um);
    const NX = 48, NY = 28;
    // capacity grid T[ix][iy] = P_net(phiC, J) / W [t/h]; W is constant over the grid (ore-set). The Hogg-Fuerstenau
    // torque model is monotone in phiC and is not tapered at centrifuging, the engine flags grinding collapse via the
    // regime instead, so where the charge centrifuges (grinding stops, no impact) the raw P/W is not a real capacity:
    // those cells are masked, and tMax is taken over the grinding region only so the colour scale is honest.
    const cap: number[][] = [];
    const dead: boolean[][] = [];
    let tMax = 1e-6;
    for (let ix = 0; ix < NX; ix++) {
      const phiC = PHI_MIN + ((PHI_MAX - PHI_MIN) * ix) / (NX - 1);
      cap[ix] = [];
      dead[ix] = [];
      for (let iy = 0; iy < NY; iy++) {
        const j = (J_MAX * iy) / (NY - 1);
        const p = evaluate({ ...op, phiC, fill: j });
        const t = wBond > 0 ? p.phfKw / wBond : 0;
        const collapsed = p.regime === 'centrifuging' || p.fracCentrifuging > 0.5;  // grinding has stopped
        cap[ix][iy] = t;
        dead[ix][iy] = collapsed;
        if (!collapsed && t > tMax) tMax = t;
      }
    }

    // sequential ramp dark-blue -> teal -> yellow over [0, tMax]
    const ramp = (t: number): string => {
      const u = Math.max(0, Math.min(1, t / tMax));
      const lerp = (a: number, b: number, k: number) => Math.round(a + (b - a) * k);
      let r: number, g: number, b: number;
      if (u < 0.5) { const k = u / 0.5; r = lerp(28, 38, k); g = lerp(46, 140, k); b = lerp(92, 138, k); }
      else { const k = (u - 0.5) / 0.5; r = lerp(38, 232, k); g = lerp(140, 202, k); b = lerp(138, 64, k); }
      return `rgb(${r},${g},${b})`;
    };

    ctx.clearRect(0, 0, W, H);
    const cw = pw / NX, chh = ph / NY;
    for (let ix = 0; ix < NX; ix++) {
      const x = pad.l + (pw * ix) / NX;
      for (let iy = 0; iy < NY; iy++) {
        const y = pad.t + ph - (ph * (iy + 1)) / NY;
        if (dead[ix][iy]) {
          // centrifuging: grinding has stopped, not a viable operating point regardless of the un-tapered power
          ctx.fillStyle = theme === 'dark' ? 'rgba(70,74,86,0.85)' : 'rgba(190,194,204,0.85)';
          ctx.fillRect(x, y, cw + 0.6, chh + 0.6);
          continue;
        }
        ctx.fillStyle = ramp(cap[ix][iy]);
        ctx.fillRect(x, y, cw + 0.6, chh + 0.6);
        // infeasible region: capacity below the target throughput -> the mill can't meet the duty here
        if (cap[ix][iy] < op.tph) {
          ctx.fillStyle = 'rgba(248,81,73,0.30)';
          ctx.fillRect(x, y, cw + 0.6, chh + 0.6);
        }
      }
    }

    // axes
    ctx.strokeStyle = sub;
    ctx.lineWidth = 1;
    ctx.strokeRect(pad.l, pad.t, pw, ph);
    ctx.fillStyle = fg;
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    for (let p = 0.4; p <= 1.1; p += 0.2) ctx.fillText(p.toFixed(1), px(p), H - 20);
    ctx.fillText(es ? 'fracción de velocidad crítica φc' : 'fraction of critical speed φc', W / 2, H - 6);
    ctx.save();
    ctx.translate(12, H / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(es ? 'llenado J' : 'fill J', 0, 0);
    ctx.restore();
    ctx.textAlign = 'right';
    for (let j = 0.1; j <= 0.5; j += 0.1) ctx.fillText(`${(j * 100).toFixed(0)}%`, pad.l - 6, py(j) + 4);

    // operating-point marker
    ctx.fillStyle = fg;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(px(Math.min(PHI_MAX, op.phiC)), py(op.fill), 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }, [op, height, theme, es]);

  return (
    <div ref={wrapRef} style={{ position: 'relative' }} className="cc-canvas-wrap">
      <canvas ref={ref} style={{ display: 'block', width: '100%' }} onMouseMove={onMove} onMouseLeave={() => setRead(null)} />
      {read && <div className="cc-map-readout" style={{ position: 'absolute', left: Math.min(read.x + 12, (wrapRef.current?.clientWidth ?? 600) - 130), top: read.y + 12, pointerEvents: 'none' }}>{read.text}</div>}
    </div>
  );
}
