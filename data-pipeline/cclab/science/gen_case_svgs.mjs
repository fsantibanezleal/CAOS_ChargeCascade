// Generate one hand-authored-quality charge cross-section SVG per synthetic case (ADR-0056 docs depth). Each SVG
// is COMPUTED from the same engine the App runs (shoulder/toe angles, the per-shell Davis departure fan clipped
// inside the shell, the regime + power), so the doc figure is accurate to that case, not decorative. Theme-aware:
// a prefers-color-scheme style block plus both-safe fallback colours (GitHub may strip the style; the fallback
// still reads on light + dark). Run: node --import tsx data-pipeline/cclab/science/gen_case_svgs.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { CASES, evaluate } from '../../../frontend/src/mill/index.ts';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '../../../docs/cases/assets');
mkdirSync(outDir, { recursive: true });

const W = 340, H = 300, cx = 150, cy = 150, R = 110;
const deg = (d) => (d * Math.PI) / 180;

// viridis-ish 5-stop for the departure fan (outer = brighter)
const FAN = ['#3b528b', '#21918c', '#5ec962', '#addc30', '#fde725'];

function svgFor(cc) {
  const r = evaluate(cc.op);
  const scale = R / (cc.op.diameterM / 2);
  const sx = (X) => cx + X * scale;
  const sy = (Y) => cy - Y * scale;
  const empty = cc.op.fill <= 0 || r.phfKw <= 0;

  // the cataract departure fan (a few shells), clipped inside the shell by the engine (accurate to this case).
  // For the empty-mill control (J=0) there is no charge, so no fan is drawn.
  const shells = empty ? [] : r.shells.filter((s) => !s.centrifuging && s.trajectory.length > 1);
  const step = Math.max(1, Math.floor(shells.length / 5));
  const fan = shells.filter((_, i) => i % step === 0)
    .map((s, i) => {
      const pts = s.trajectory.map(([X, Y]) => `${sx(X).toFixed(1)},${sy(Y).toFixed(1)}`).join(' ');
      const dep = `<circle cx="${sx(s.departure[0]).toFixed(1)}" cy="${sy(s.departure[1]).toFixed(1)}" r="2.6" fill="${FAN[Math.min(4, i)]}" />`;
      return `<polyline points="${pts}" fill="none" stroke="${FAN[Math.min(4, i)]}" stroke-width="1.8" opacity="0.9" />\n    ${dep}`;
    }).join('\n    ');

  // shoulder + toe markers (the departure geometry), drawn on the outer shell for the non-empty non-centrifuge case
  const markers = (empty || r.regime === 'centrifuging') ? '' :
    `<text class="s" x="${sx((cc.op.diameterM / 2) * Math.sin(deg(r.shoulderDeg)))}" y="${sy((cc.op.diameterM / 2) * Math.cos(deg(r.shoulderDeg))) - 6}">shoulder ${r.shoulderDeg.toFixed(0)}°</text>`;

  const centr = (!empty && r.regime === 'centrifuging')
    ? `<circle cx="${cx}" cy="${cy}" r="${R - 6}" fill="none" stroke="var(--chg)" stroke-width="6" opacity="0.4" stroke-dasharray="4 3" />` : '';
  const emptyNote = empty ? `<text class="s" x="${cx}" y="${cy + 4}" text-anchor="middle">no charge (J = 0)</text>` : '';

  const label = `${r.regime} · φc ${cc.op.phiC.toFixed(2)} · ${(r.phfKw / 1000).toFixed(2)} MW`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${cc.id} charge cross-section">
  <style>
    :root { --fg:#1f2328; --sub:#6b7682; --shell:#8a95a1; --chg:#6ea8ff; }
    @media (prefers-color-scheme: dark) { :root { --fg:#e6edf3; --sub:#9aa7b4; --shell:#5a6675; --chg:#6ea8ff; } }
    text { font: 12px system-ui, sans-serif; fill: var(--fg); }
    .s { font-size: 10px; fill: var(--sub); }
  </style>
  <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="var(--shell)" stroke-width="2" />
  ${centr}
  ${fan}
  ${markers}
  ${emptyNote}
  <text x="${cx}" y="26" text-anchor="middle">${cc.name}</text>
  <text class="s" x="${cx}" y="${H - 14}" text-anchor="middle">${label}</text>
</svg>`;
}

let n = 0;
for (const cc of CASES) {
  writeFileSync(resolve(outDir, `${cc.id}.svg`), svgFor(cc), 'utf8');
  n++;
}
console.log(`wrote ${n} case SVGs to docs/cases/assets/`);
