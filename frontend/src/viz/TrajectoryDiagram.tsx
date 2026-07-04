import { useEffect, useRef } from 'react';
import { useShellLang, useThemeStore } from '@fasl-work/caos-app-shell';
import type { MillResult } from '../mill/types.ts';

// The 2D mill cross-section: the shell circle, the per-radial-shell departure points (the Davis-circle shoulder
// locus), the cataract free-flight parabolas, and the shoulder/toe. Shows WHY the charge fans out (outer shells
// thrown highest). Pure canvas; reads the engine's computed shells.
const VIRIDIS = [[68, 1, 84], [59, 82, 139], [33, 145, 140], [94, 201, 98], [253, 231, 37]];
function viridis(t: number): string {
  t = Math.max(0, Math.min(1, t));
  const x = t * 4;
  const i = Math.min(3, Math.floor(x));
  const f = x - i;
  const a = VIRIDIS[i];
  const b = VIRIDIS[i + 1];
  return `rgb(${a[0] + f * (b[0] - a[0])},${a[1] + f * (b[1] - a[1])},${a[2] + f * (b[2] - a[2])})`;
}

export function TrajectoryDiagram({ result, diameterM, height = 360 }: { result: MillResult; diameterM: number; height?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const theme = useThemeStore((s) => s.theme);
  const es = useShellLang() === 'es';

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
    const border = cs.getPropertyValue('--color-border').trim() || '#30363d';

    const R = diameterM / 2;
    const cx = W / 2;
    const cy = H * 0.52;
    const scale = (Math.min(W, H) * 0.42) / R; // m -> px
    // mill coords: x right, y up -> screen x = cx + X*scale, screen y = cy - Y*scale
    const sx = (X: number) => cx + X * scale;
    const sy = (Y: number) => cy - Y * scale;

    ctx.clearRect(0, 0, W, H);
    // the shell circle
    ctx.strokeStyle = border;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, R * scale, 0, Math.PI * 2);
    ctx.stroke();

    // the cataract parabolas + departure points, per shell
    for (const sh of result.shells) {
      if (sh.centrifuging || sh.trajectory.length < 2) continue;
      const t = (sh.r / R - 0.45) / 0.53; // outer = brighter
      ctx.strokeStyle = viridis(t);
      ctx.globalAlpha = 0.85;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      sh.trajectory.forEach(([X, Y], k) => {
        const px = sx(X);
        const py = sy(Y);
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
      // departure point
      ctx.fillStyle = viridis(t);
      ctx.beginPath();
      ctx.arc(sx(sh.departure[0]), sy(sh.departure[1]), 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // shoulder marker (outer departure)
    const outer = result.shells[result.shells.length - 1];
    if (!outer.centrifuging) {
      ctx.fillStyle = fg;
      ctx.font = '12px system-ui, sans-serif';
      ctx.fillText(`${es ? 'hombro' : 'shoulder'} ${result.shoulderDeg.toFixed(0)}°`, sx(outer.departure[0]) + 6, sy(outer.departure[1]) - 6);
    }
    // axis labels (the regime name stays raw, the same technical classification the App's pills show)
    ctx.fillStyle = fg;
    ctx.globalAlpha = 0.7;
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText(es ? 'cos α = φc²·(r/R) por capa → el abanico de cataract' : 'cos α = φc²·(r/R) per shell → the cataract fan', 10, 18);
    ctx.fillText(`${es ? 'régimen' : 'regime'}: ${result.regime} · ${es ? '% centrifugando' : '% centrifuging'} ${(result.fracCentrifuging * 100).toFixed(0)}%`, 10, H - 10);
    ctx.globalAlpha = 1;
  }, [result, diameterM, height, theme, es]);

  return (
    <div ref={wrapRef} className="cc-canvas-wrap">
      <canvas ref={ref} style={{ display: 'block', width: '100%' }} />
    </div>
  );
}
