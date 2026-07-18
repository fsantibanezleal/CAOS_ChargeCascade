import { useEffect, useRef, useState } from 'react';
import { useShellLang, useThemeStore } from '@fasl-work/caos-app-shell';

// The motion-regime map: fraction of critical speed phiC (x) vs fill J (y), with the slumping / cascading /
// cataracting / centrifuging bands and a marker at the current operating point. The bands are phiC-driven (Wills &
// Finch; Napier-Munn et al.). Pure canvas, theme-aware. (The regime names stay in English, the same technical
// classification the App's pills show raw, only the descriptive axis labels are localised.)
export function RegimeMap({ phiC, fill, height = 320 }: { phiC: number; fill: number; height?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const theme = useThemeStore((s) => s.theme);
  const es = useShellLang() === 'es';
  const [read, setRead] = useState<{ x: number; y: number; text: string } | null>(null);

  // Hover value-readout (interactive-viz rubric): cursor to (phiC, J) + the phiC-driven regime band under it.
  const onMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const wrap = wrapRef.current; if (!wrap) return;
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const W = wrap.clientWidth || 600, H = height;
    const pad = { l: 44, r: 16, t: 16, b: 36 };
    const PHI_MIN = 0.3, PHI_MAX = 1.15;
    const pw = W - pad.l - pad.r, ph = H - pad.t - pad.b;
    if (mx < pad.l || mx > W - pad.r || my < pad.t || my > H - pad.b) { setRead(null); return; }
    const phiC = PHI_MIN + ((mx - pad.l) / pw) * (PHI_MAX - PHI_MIN);
    const j = (1 - (my - pad.t) / ph) * 0.6;
    const regime = phiC < 0.4 ? 'slumping' : phiC < 0.65 ? 'cascading' : phiC < 0.9 ? 'cataracting' : 'centrifuging';
    setRead({ x: mx, y: my, text: `φc ${phiC.toFixed(2)} · J ${(j * 100).toFixed(0)}% · ${regime}` });
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

    const pad = { l: 44, r: 16, t: 16, b: 36 };
    const pw = W - pad.l - pad.r;
    const ph = H - pad.t - pad.b;
    const PHI_MIN = 0.3;
    const PHI_MAX = 1.15;
    const px = (p: number) => pad.l + ((p - PHI_MIN) / (PHI_MAX - PHI_MIN)) * pw;
    const py = (j: number) => pad.t + (1 - j / 0.6) * ph;

    ctx.clearRect(0, 0, W, H);
    // the regime bands (phiC-driven)
    const bands: [number, number, string, string][] = [
      [PHI_MIN, 0.4, 'rgba(210,153,34,0.18)', 'slumping'],
      [0.4, 0.65, 'rgba(63,185,80,0.18)', 'cascading'],
      [0.65, 0.9, 'rgba(110,168,255,0.18)', 'cataracting'],
      [0.9, PHI_MAX, 'rgba(248,81,73,0.18)', 'centrifuging'],
    ];
    for (const [a, b, fill2, label] of bands) {
      ctx.fillStyle = fill2;
      ctx.fillRect(px(a), pad.t, px(b) - px(a), ph);
      ctx.fillStyle = sub;
      ctx.font = '11px system-ui, sans-serif';
      ctx.save();
      ctx.translate((px(a) + px(b)) / 2, pad.t + 14);
      ctx.textAlign = 'center';
      ctx.fillText(label, 0, 0);
      ctx.restore();
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

    // the operating-point marker
    ctx.fillStyle = fg;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(px(Math.min(PHI_MAX, phiC)), py(fill), 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }, [phiC, fill, height, theme, es]);

  return (
    <div ref={wrapRef} style={{ position: 'relative' }} className="cc-canvas-wrap">
      <canvas ref={ref} style={{ display: 'block', width: '100%' }} onMouseMove={onMove} onMouseLeave={() => setRead(null)} />
      {read && <div className="cc-map-readout" style={{ position: 'absolute', left: Math.min(read.x + 12, 440), top: read.y + 12, pointerEvents: 'none' }}>{read.text}</div>}
    </div>
  );
}
