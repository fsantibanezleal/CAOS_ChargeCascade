import { useEffect, useMemo, useRef, useState } from 'react';
import { useShellLang, useThemeStore } from '@fasl-work/caos-app-shell';
import type { Operating } from '../mill/index.ts';
import { computeField, sampleAt, type FieldGrid, type FieldKind } from '../lib/powerField.ts';
import type { DemPowerGrid } from '../lib/demframes.ts';

// The power-field heatmap (Unit 8): net power over the (phiC, J) plane, viridis intensity, with toggles (DEM / HF /
// C-model / model-spread), the operating-point marker, the power-peak ridge, the centrifuging contour (r*/R = 1),
// a crosshair value readout in kW, and drag-select-a-cell-to-load. Canvas2D (rubric Tier-B); theme-aware.
const VIRIDIS = [[68, 1, 84], [59, 82, 139], [33, 145, 140], [94, 201, 98], [253, 231, 37]];
function viridis(t: number): [number, number, number] {
  t = Math.max(0, Math.min(1, t));
  const x = t * 4, i = Math.min(3, Math.floor(x)), f = x - i, a = VIRIDIS[i], b = VIRIDIS[i + 1];
  return [a[0] + f * (b[0] - a[0]), a[1] + f * (b[1] - a[1]), a[2] + f * (b[2] - a[2])];
}

const KINDS: { id: FieldKind; label: string; labelEs: string }[] = [
  { id: 'DEM', label: 'DEM power', labelEs: 'potencia DEM' },
  { id: 'HF', label: 'Hogg-F. power', labelEs: 'potencia Hogg-F.' },
  { id: 'CMODEL', label: 'C-model power', labelEs: 'potencia C-model' },
  { id: 'SPREAD', label: '|DEM − HF| spread', labelEs: 'discrepancia |DEM − HF|' },
];

export function PowerFieldHeatmap({ op, demGrid, onLoad, height = 340 }:
  { op: Operating; demGrid: DemPowerGrid | null; onLoad?: (phiC: number, fill: number) => void; height?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const theme = useThemeStore((s) => s.theme);
  const es = useShellLang() === 'es';
  const [kind, setKind] = useState<FieldKind>(demGrid ? 'DEM' : 'HF');
  const [read, setRead] = useState<{ x: number; y: number; text: string } | null>(null);

  const field: FieldGrid = useMemo(() => computeField(op, kind, demGrid), [op, kind, demGrid]);
  const pad = { l: 46, r: 16, t: 14, b: 38 };

  const geom = (W: number, H: number) => {
    const pw = W - pad.l - pad.r, ph = H - pad.t - pad.b;
    const toPhi = (mx: number) => field.phiMin + ((mx - pad.l) / pw) * (field.phiMax - field.phiMin);
    const toJ = (my: number) => field.jMin + (1 - (my - pad.t) / ph) * (field.jMax - field.jMin);
    const px = (phi: number) => pad.l + ((phi - field.phiMin) / (field.phiMax - field.phiMin)) * pw;
    const py = (j: number) => pad.t + (1 - (j - field.jMin) / (field.jMax - field.jMin)) * ph;
    return { pw, ph, toPhi, toJ, px, py };
  };

  useEffect(() => {
    const canvas = ref.current, wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const W = wrap.clientWidth || 600, H = height;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = `${W}px`; canvas.style.height = `${H}px`;
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cs = getComputedStyle(document.documentElement);
    const fg = cs.getPropertyValue('--color-fg').trim() || (theme === 'dark' ? '#e6edf3' : '#1f2328');
    const sub = cs.getPropertyValue('--color-fg-subtle').trim() || '#9aa7b4';
    const { pw, ph, px, py } = geom(W, H);
    ctx.clearRect(0, 0, W, H);

    // the field as an offscreen image, nearest-neighbour scaled into the plot rect
    const { nx, ny, values, vmin, vmax } = field;
    const img = ctx.createImageData(nx, ny);
    for (let iy = 0; iy < ny; iy++) {
      for (let ix = 0; ix < nx; ix++) {
        const v = values[iy * nx + ix];
        const di = ((ny - 1 - iy) * nx + ix) * 4;   // flip y (J increases upward)
        if (!Number.isFinite(v)) { img.data[di] = 40; img.data[di + 1] = 44; img.data[di + 2] = 52; img.data[di + 3] = 90; continue; }
        const t = vmax > vmin ? (v - vmin) / (vmax - vmin) : 0.5;
        const [r, g, b] = viridis(t);
        img.data[di] = r; img.data[di + 1] = g; img.data[di + 2] = b; img.data[di + 3] = 255;
      }
    }
    const off = document.createElement('canvas'); off.width = nx; off.height = ny;
    off.getContext('2d')!.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(off, pad.l, pad.t, pw, ph);

    // the centrifuging contour r*/R = 1 (fracCentrifuging crosses ~0): trace where centrifuging first > 0 per column
    ctx.strokeStyle = 'rgba(248,81,73,0.9)'; ctx.lineWidth = 1.6; ctx.beginPath();
    let started = false;
    for (let ix = 0; ix < nx; ix++) {
      let iy = ny - 1;
      for (let k = 0; k < ny; k++) { if (field.centrifuging[k * nx + ix] > 0.01) { iy = k; break; } }
      const anyCent = field.centrifuging[iy * nx + ix] > 0.01;
      const phi = field.phiMin + (ix / (nx - 1)) * (field.phiMax - field.phiMin);
      const j = field.jMin + (iy / (ny - 1)) * (field.jMax - field.jMin);
      if (anyCent) { const X = px(phi), Y = py(j); if (!started) { ctx.moveTo(X, Y); started = true; } else ctx.lineTo(X, Y); }
    }
    if (started) ctx.stroke();

    // the power-peak ridge: per J-row (per y), the phiC of max value (only for kW fields)
    if (field.unit === 'kW') {
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.setLineDash([4, 3]); ctx.lineWidth = 1.4; ctx.beginPath();
      let s2 = false;
      for (let iy = 0; iy < ny; iy++) {
        let best = -Infinity, bx = 0;
        for (let ix = 0; ix < nx; ix++) { const v = values[iy * nx + ix]; if (Number.isFinite(v) && v > best) { best = v; bx = ix; } }
        const phi = field.phiMin + (bx / (nx - 1)) * (field.phiMax - field.phiMin);
        const j = field.jMin + (iy / (ny - 1)) * (field.jMax - field.jMin);
        const X = px(phi), Y = py(j); if (!s2) { ctx.moveTo(X, Y); s2 = true; } else ctx.lineTo(X, Y);
      }
      if (s2) ctx.stroke(); ctx.setLineDash([]);
    }

    // axes + frame
    ctx.strokeStyle = sub; ctx.lineWidth = 1; ctx.strokeRect(pad.l, pad.t, pw, ph);
    ctx.fillStyle = fg; ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'center';
    for (let p = 0.5; p <= 1.05; p += 0.1) ctx.fillText(p.toFixed(1), px(p), H - 22);
    ctx.fillText(es ? 'fracción de velocidad crítica φc' : 'fraction of critical speed φc', W / 2, H - 6);
    ctx.save(); ctx.translate(12, H / 2); ctx.rotate(-Math.PI / 2); ctx.fillText(es ? 'llenado J' : 'fill J', 0, 0); ctx.restore();
    ctx.textAlign = 'right';
    for (let j = 0.1; j <= 0.45; j += 0.1) ctx.fillText(`${(j * 100).toFixed(0)}%`, pad.l - 6, py(j) + 4);

    // operating-point marker
    ctx.fillStyle = '#fff'; ctx.strokeStyle = fg; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(px(Math.min(field.phiMax, op.phiC)), py(Math.min(field.jMax, op.fill)), 5.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }, [field, height, theme, es, op.phiC, op.fill]);

  const onMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const wrap = wrapRef.current; if (!wrap) return;
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const W = wrap.clientWidth || 600, H = height;
    if (mx < pad.l || mx > W - pad.r || my < pad.t || my > H - pad.b) { setRead(null); return; }
    const { toPhi, toJ } = geom(W, H);
    const phi = toPhi(mx), j = toJ(my);
    const v = sampleAt(op, kind, demGrid, phi, j);
    const val = Number.isFinite(v) ? (field.unit === '%' ? `${v.toFixed(0)}%` : v >= 1000 ? `${(v / 1000).toFixed(2)} MW` : `${v.toFixed(0)} kW`) : 'n/a';
    setRead({ x: mx, y: my, text: `φc ${phi.toFixed(2)} · J ${(j * 100).toFixed(0)}% · ${val}` });
  };
  const onClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onLoad) return;
    const wrap = wrapRef.current; if (!wrap) return;
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const W = wrap.clientWidth || 600, H = height;
    if (mx < pad.l || mx > W - pad.r || my < pad.t || my > H - pad.b) return;
    const { toPhi, toJ } = geom(W, H);
    onLoad(+toPhi(mx).toFixed(3), +toJ(my).toFixed(3));
  };

  return (
    <div>
      <div className="cc-chips" style={{ marginBottom: '0.4rem' }}>
        {KINDS.map((k) => (
          <button key={k.id} className={`chip ${kind === k.id ? 'on' : ''}`} disabled={(k.id === 'DEM' || k.id === 'SPREAD') && !demGrid}
            onClick={() => setKind(k.id)}>{es ? k.labelEs : k.label}</button>
        ))}
      </div>
      <div ref={wrapRef} style={{ position: 'relative' }} className="cc-canvas-wrap">
        <canvas ref={ref} style={{ display: 'block', width: '100%', cursor: onLoad ? 'crosshair' : 'default' }}
          onMouseMove={onMove} onMouseLeave={() => setRead(null)} onClick={onClick} />
        {read && <div className="cc-map-readout" style={{ position: 'absolute', left: Math.min(read.x + 12, (wrapRef.current?.clientWidth ?? 600) - 150), top: read.y + 12, pointerEvents: 'none' }}>{read.text}</div>}
      </div>
      <p className="cc-note">{es
        ? 'Intensidad viridis = potencia neta. Línea blanca punteada: cresta de potencia por fila; línea roja: inicio de centrifugado (r*/R = 1). Clic para cargar (φc, J) en el motor. La capa DEM se interpola de la grilla milldem horneada y se escala al molino actual por la razón HF; HF y C-model se calculan en vivo.'
        : 'Viridis intensity = net power. White dashed line: the per-row power ridge; red line: the centrifuging onset (r*/R = 1). Click to load (φc, J) into the engine. The DEM layer is interpolated from the baked milldem grid and scaled to the current mill by the HF ratio; HF and C-model are computed live.'}</p>
    </div>
  );
}
