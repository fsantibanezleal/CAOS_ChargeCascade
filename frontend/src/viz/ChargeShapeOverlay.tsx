import { useEffect, useRef, useState } from 'react';
import { useShellLang, useThemeStore } from '@fasl-work/caos-app-shell';
import type { DemOutline } from '../lib/demframes.ts';

// The 2D charge-shape overlay (Unit 7): a cross-section of the mill showing the DEM-measured time-averaged charge
// (viridis occupancy density in the (r, theta) plane, baked by milldem) with the analytic toe/shoulder angles marked,
// so the picture and the power number share ONE source. Where the DEM charge body and the single-particle analytic
// toe/shoulder diverge is exactly where DEM earns its keep. Pure canvas, theme-aware.
const VIRIDIS = [[68, 1, 84], [59, 82, 139], [33, 145, 140], [94, 201, 98], [253, 231, 37]];
function viridis(t: number): [number, number, number] {
  t = Math.max(0, Math.min(1, t));
  const x = t * 4, i = Math.min(3, Math.floor(x)), f = x - i, a = VIRIDIS[i], b = VIRIDIS[i + 1];
  return [a[0] + f * (b[0] - a[0]), a[1] + f * (b[1] - a[1]), a[2] + f * (b[2] - a[2])];
}

export function ChargeShapeOverlay({ outline, analyticToeDeg, analyticShoulderDeg, height = 320 }:
  { outline: DemOutline | null; analyticToeDeg: number; analyticShoulderDeg: number; height?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const theme = useThemeStore((s) => s.theme);
  const es = useShellLang() === 'es';
  const [read, setRead] = useState<{ x: number; y: number; text: string } | null>(null);

  useEffect(() => {
    const canvas = ref.current, wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const W = wrap.clientWidth || 520, H = height;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = `${W}px`; canvas.style.height = `${H}px`;
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cs = getComputedStyle(document.documentElement);
    const fg = cs.getPropertyValue('--color-fg').trim() || (theme === 'dark' ? '#e6edf3' : '#1f2328');
    const sub = cs.getPropertyValue('--color-fg-subtle').trim() || '#9aa7b4';

    const cx = W / 2, cy = H / 2 + 6;
    const rad = Math.min(W, H) * 0.40;
    ctx.clearRect(0, 0, W, H);

    // the DEM occupancy, drawn as filled polar cells (r/R x theta). theta CCW from +x; screen y is down, so negate.
    if (outline) {
      const { occupancy, nr, nth } = outline;
      const th0 = outline.theta_range_deg[0] * Math.PI / 180, th1 = outline.theta_range_deg[1] * Math.PI / 180;
      const dth = (th1 - th0) / nth;
      for (let ir = 0; ir < nr; ir++) {
        const r0 = (ir / nr) * rad, r1 = ((ir + 1) / nr) * rad;
        for (let it = 0; it < nth; it++) {
          const v = occupancy[ir][it];
          if (v <= 0.001) continue;
          const a0 = th0 + it * dth, a1 = a0 + dth;
          const [R2, G2, B2] = viridis(Math.pow(v, 0.6));
          ctx.fillStyle = `rgba(${R2 | 0},${G2 | 0},${B2 | 0},${0.15 + 0.85 * Math.min(1, v)})`;
          ctx.beginPath();
          ctx.arc(cx, cy, r1, -a1, -a0, false);
          ctx.arc(cx, cy, r0, -a0, -a1, true);
          ctx.closePath();
          ctx.fill();
        }
      }
    }

    // the shell
    ctx.strokeStyle = sub; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.stroke();

    // toe/shoulder radial markers: analytic (solid) vs DEM (dashed)
    const ray = (deg: number, color: string, dash: number[], label: string) => {
      const a = deg * Math.PI / 180;
      ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.setLineDash(dash);
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(-a) * rad, cy + Math.sin(-a) * rad); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = color; ctx.font = '10px system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(label, cx + Math.cos(-a) * (rad + 14), cy + Math.sin(-a) * (rad + 14));
    };
    ray(analyticShoulderDeg, '#6ea8ff', [], es ? 'hombro (an.)' : 'shoulder (an.)');
    ray(analyticToeDeg, '#f0883e', [], es ? 'pie (an.)' : 'toe (an.)');
    if (outline) {
      ray(outline.shoulder_deg, '#3fb950', [5, 3], 'DEM');
      ray(outline.toe_deg, '#3fb950', [5, 3], 'DEM');
    }

    ctx.fillStyle = fg; ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(es ? 'sección transversal (giro CCW)' : 'cross-section (CCW rotation)', 10, 16);
    if (!outline) { ctx.fillStyle = sub; ctx.textAlign = 'center'; ctx.fillText(es ? 'DEM horneado no disponible para este caso' : 'no baked DEM for this case', cx, cy + rad + 28); }
  }, [outline, analyticToeDeg, analyticShoulderDeg, height, theme, es]);

  const onMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const wrap = wrapRef.current; if (!wrap || !outline) return;
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const W = wrap.clientWidth || 520, H = height;
    const cx = W / 2, cy = H / 2 + 6, rad = Math.min(W, H) * 0.40;
    const dx = mx - cx, dy = -(my - cy);
    const rr = Math.hypot(dx, dy) / rad;
    if (rr > 1) { setRead(null); return; }
    const th = Math.atan2(dy, dx) * 180 / Math.PI;
    const ir = Math.min(outline.nr - 1, Math.floor(rr * outline.nr));
    const it = Math.min(outline.nth - 1, Math.floor((th - outline.theta_range_deg[0]) / (outline.theta_range_deg[1] - outline.theta_range_deg[0]) * outline.nth));
    const occ = outline.occupancy[ir]?.[it] ?? 0;
    setRead({ x: mx, y: my, text: `r/R ${rr.toFixed(2)} · θ ${th.toFixed(0)}° · ${es ? 'ocupación' : 'occupancy'} ${(occ * 100).toFixed(0)}%` });
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative' }} className="cc-canvas-wrap">
      <canvas ref={ref} style={{ display: 'block', width: '100%' }} onMouseMove={onMove} onMouseLeave={() => setRead(null)} />
      {read && <div className="cc-map-readout" style={{ position: 'absolute', left: Math.min(read.x + 12, (wrapRef.current?.clientWidth ?? 520) - 150), top: read.y + 12, pointerEvents: 'none' }}>{read.text}</div>}
    </div>
  );
}
