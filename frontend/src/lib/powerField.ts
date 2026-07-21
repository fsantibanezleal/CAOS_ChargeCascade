// The power-field grid computer (Unit 8). Evaluates net power over the (phiC, J) plane for a fixed mill:
//  - HF      : Hogg-Fuerstenau, computed LIVE + exact by the mill engine on every grid cell.
//  - CMODEL  : Morrell (1996) C-model net power, LIVE + exact.
//  - DEM     : bilinearly interpolated from the coarse baked milldem (phiC, J) grid (data/dem/power-grid.json).
//  - SPREAD  : |DEM - HF| / HF, the honest cross-model disagreement (a real uncertainty proxy across two
//              independent power routes; NOT a fitted surrogate std).
// The field reacts to the operating mill (D, L, ball, density, ore) via the live HF/C-model; the DEM layer is the
// reference-mill bake and is labelled as such.
import { evaluate, type Operating } from '../mill/index.ts';
import type { DemPowerGrid } from './demframes.ts';

export type FieldKind = 'DEM' | 'HF' | 'CMODEL' | 'SPREAD';

export interface FieldGrid {
  kind: FieldKind;
  nx: number; ny: number;                 // phiC (x), J (y)
  phiMin: number; phiMax: number; jMin: number; jMax: number;
  values: Float32Array;                   // row-major [ny][nx]; SPREAD in %, others in kW
  vmin: number; vmax: number;
  centrifuging: Float32Array;             // fracCentrifuging per cell (for the r*/R=1 contour), row-major
  unit: 'kW' | '%';
}

export interface FieldOptions {
  nx?: number; ny?: number;
  phiMin?: number; phiMax?: number; jMin?: number; jMax?: number;
}

function bilinearDem(grid: DemPowerGrid, phi: number, j: number): number {
  const P = grid.phi_c_nodes, J = grid.fill_nodes, Z = grid.power_kw; // Z[jIdx][phiIdx]
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  const ph = clamp(phi, P[0], P[P.length - 1]);
  const jj = clamp(j, J[0], J[J.length - 1]);
  let ip = 0; while (ip < P.length - 2 && P[ip + 1] < ph) ip++;
  let ij = 0; while (ij < J.length - 2 && J[ij + 1] < jj) ij++;
  const tp = (ph - P[ip]) / (P[ip + 1] - P[ip] || 1);
  const tj = (jj - J[ij]) / (J[ij + 1] - J[ij] || 1);
  const z00 = Z[ij][ip], z01 = Z[ij][ip + 1], z10 = Z[ij + 1][ip], z11 = Z[ij + 1][ip + 1];
  return (z00 * (1 - tp) + z01 * tp) * (1 - tj) + (z10 * (1 - tp) + z11 * tp) * tj;
}

export function computeField(op: Operating, kind: FieldKind, demGrid: DemPowerGrid | null, opts: FieldOptions = {}): FieldGrid {
  const nx = opts.nx ?? 60, ny = opts.ny ?? 40;
  const phiMin = opts.phiMin ?? 0.45, phiMax = opts.phiMax ?? 1.10;
  const jMin = opts.jMin ?? 0.08, jMax = opts.jMax ?? 0.48;
  const values = new Float32Array(nx * ny);
  const centrifuging = new Float32Array(nx * ny);
  let vmin = Infinity, vmax = -Infinity;
  const demScale = demGrid ? demRefScale(op, demGrid) : 1;   // scale the reference-mill DEM to the current mill by HF ratio

  for (let iy = 0; iy < ny; iy++) {
    const j = jMin + (iy / (ny - 1)) * (jMax - jMin);
    for (let ix = 0; ix < nx; ix++) {
      const phi = phiMin + (ix / (nx - 1)) * (phiMax - phiMin);
      const r = evaluate({ ...op, phiC: phi, fill: j });
      centrifuging[iy * nx + ix] = r.fracCentrifuging;
      let v: number;
      if (kind === 'HF') v = r.phfKw;
      else if (kind === 'CMODEL') v = r.pCModelNetKw;
      else if (kind === 'DEM') v = demGrid ? bilinearDem(demGrid, phi, j) * demScale : NaN;
      else { // SPREAD
        const dem = demGrid ? bilinearDem(demGrid, phi, j) * demScale : NaN;
        v = demGrid && r.phfKw > 0 ? Math.abs(dem - r.phfKw) / r.phfKw * 100 : NaN;
      }
      values[iy * nx + ix] = v;
      if (Number.isFinite(v)) { if (v < vmin) vmin = v; if (v > vmax) vmax = v; }
    }
  }
  if (!Number.isFinite(vmin)) { vmin = 0; vmax = 1; }
  return { kind, nx, ny, phiMin, phiMax, jMin, jMax, values, vmin, vmax, centrifuging, unit: kind === 'SPREAD' ? '%' : 'kW' };
}

// The baked DEM grid is for a fixed reference mill. Scale it to the current mill by the HF power ratio at a common
// operating point (phiC 0.75, J 0.30), so the DEM field tracks the selected geometry while staying anchored to the
// baked DEM shape. Honest: the SHAPE over (phiC, J) is DEM; the absolute level is transferred by the analytic ratio.
function demRefScale(op: Operating, grid: DemPowerGrid): number {
  const ref = grid.ref_mill;
  const hfCur = evaluate({ ...op, phiC: 0.75, fill: 0.30 }).phfKw;
  const hfRef = evaluate({
    ...op, diameterM: ref.diameter_m, lengthM: ref.length_m, ballTopMm: ref.ball_diameter_m * 1000,
    chargeDensity: ref.charge_density_bulk, phiC: 0.75, fill: 0.30,
  }).phfKw;
  return hfRef > 0 ? hfCur / hfRef : 1;
}

export function sampleAt(op: Operating, kind: FieldKind, demGrid: DemPowerGrid | null, phi: number, j: number): number {
  const r = evaluate({ ...op, phiC: phi, fill: j });
  if (kind === 'HF') return r.phfKw;
  if (kind === 'CMODEL') return r.pCModelNetKw;
  const scale = demGrid ? demRefScale(op, demGrid) : 1;
  const dem = demGrid ? bilinearDem(demGrid, phi, j) * scale : NaN;
  if (kind === 'DEM') return dem;
  return demGrid && r.phfKw > 0 ? Math.abs(dem - r.phfKw) / r.phfKw * 100 : NaN;
}
