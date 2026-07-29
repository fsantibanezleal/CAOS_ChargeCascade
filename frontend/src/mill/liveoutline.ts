// Time-averaged charge occupancy computed from the LIVE 2D DEM, in the same schema the offline baker
// emits, so the charge-shape overlay renders a real mill exactly as it renders a baked synthetic case.
//
// WHY. The baked DEM lane (data-pipeline/cclab/dem/bake.py) is keyed by SYNTHETIC case id. A real mill
// from realmills.ts has no bake, so the charge-shape view simply did not exist for it and the 3D view
// fell back to the Davis kinematic lane. The measured charge shape is the whole point of comparing
// against a real survey, so the one source where it mattered most was the one source without it.
//
// The angle convention below is a direct port of `outline_from_frames` in bake.py, including the
// circular-mean unwrap and the 5th/95th percentile of the outer shell. It has to be, or the DEM and
// analytic readouts stop being comparable, which is the exact bug that convention was written to fix.
//
// SCOPE. This is a 2D cross-section solve, not the thin-3D slab the offline lane bakes. It is labelled
// as such everywhere it is shown. It does NOT replace the bake: the bake stays the validation reference
// because a 2D disc is not size-consistent in power (see the header of livedem.ts).

import { LiveDem, type LiveDemConfig } from './livedem.ts';
import type { DemOutline } from '../lib/demframes.ts';

export interface LiveOutlineOptions {
  nr?: number;
  nth?: number;
  /** simulated seconds discarded before sampling, so the charge is a developed bed and not the seed lattice */
  settleS?: number;
  /** simulated seconds sampled into the average */
  sampleS?: number;
}

/** Angle histogram resolution for the percentile edges: 0.5 degrees. Working from a histogram rather
 *  than from every sampled angle keeps this O(bins) instead of holding ~100k floats. */
const ABINS = 720;

export function computeLiveOutline(cfg: LiveDemConfig, opts: LiveOutlineOptions = {}): DemOutline {
  const nr = opts.nr ?? 48;
  const nth = opts.nth ?? 120;
  const settleS = opts.settleS ?? 1.5;
  const sampleS = opts.sampleS ?? 2.5;

  const dem = new LiveDem(cfg);
  const R = cfg.millRadiusM;
  const dt = 1 / 60;

  for (let s = 0; s < Math.round(settleS / dt); s++) dem.step(dt);

  const occ: number[][] = Array.from({ length: nr }, () => new Array<number>(nth).fill(0));
  const abin = new Float64Array(ABINS);          // outer-shell angle counts
  let sumSin = 0, sumCos = 0, shellN = 0;

  const steps = Math.round(sampleS / dt);
  for (let s = 0; s < steps; s++) {
    dem.step(dt);
    for (let i = 0; i < dem.n; i++) {
      const x = dem.x[i], y = dem.y[i];
      const rn = Math.min(1, Math.hypot(x, y) / R);
      const th = Math.atan2(y, x);                                  // rad, (-pi, pi]
      const thDeg = (th * 180) / Math.PI;

      const ri = Math.min(nr - 1, Math.floor(rn * nr));
      const ti = Math.min(nth - 1, Math.floor(((thDeg + 180) / 360) * nth));
      occ[ri][ti] += 1;

      // toe/shoulder come from the OUTER SHELL only (r/R in [0.7, 1]): the angular edges of the
      // lifted charge, not of the whole bed. Same window as bake.py.
      if (rn >= 0.7) {
        sumSin += Math.sin(th); sumCos += Math.cos(th); shellN++;
        abin[Math.min(ABINS - 1, Math.floor(((thDeg + 180) / 360) * ABINS))] += 1;
      }
    }
  }

  let peak = 0;
  for (const row of occ) for (const v of row) if (v > peak) peak = v;
  if (peak > 0) for (let i = 0; i < nr; i++) for (let j = 0; j < nth; j++) occ[i][j] = +(occ[i][j] / peak).toFixed(4);

  let toeTheta = 0, shoulderTheta = 0, toeDeg = 0, shoulderDeg = 0;
  if (shellN > 50) {
    const centre = (Math.atan2(sumSin / shellN, sumCos / shellN) * 180) / Math.PI;
    // Unwrap each bin about the circular mean, then take the 5th/95th percentile of the unwrapped
    // distribution. Sorting the BINS by their unwrapped angle is equivalent to sorting every sample.
    const rows: { rel: number; c: number }[] = [];
    for (let b = 0; b < ABINS; b++) {
      if (abin[b] === 0) continue;
      const th = -180 + ((b + 0.5) * 360) / ABINS;
      rows.push({ rel: (((th - centre + 180) % 360) + 360) % 360 - 180, c: abin[b] });
    }
    rows.sort((a, b) => a.rel - b.rel);
    const q = (p: number) => {
      const want = p * shellN;
      let acc = 0;
      for (const row of rows) { acc += row.c; if (acc >= want) return row.rel; }
      return rows.length ? rows[rows.length - 1].rel : 0;
    };
    const wrap = (d: number) => ((((d + 180) % 360) + 360) % 360) - 180;
    toeTheta = wrap(q(0.05) + centre);            // trailing edge
    shoulderTheta = wrap(q(0.95) + centre);       // leading edge (CCW)
    // engine convention: degrees from vertical, positive magnitudes. Shoulder from the UPWARD
    // vertical (theta = +90), toe from the DOWNWARD vertical (theta = -90).
    shoulderDeg = Math.abs(wrap(90 - shoulderTheta));
    toeDeg = Math.abs(wrap(-90 - toeTheta));
  }

  return {
    schema: 'chargecascade.live-dem-outline/v2',
    nr, nth, r_range: [0, 1], theta_range_deg: [-180, 180],
    occupancy: occ,
    toe_theta_deg: +toeTheta.toFixed(2), shoulder_theta_deg: +shoulderTheta.toFixed(2),
    toe_deg: +toeDeg.toFixed(2), shoulder_deg: +shoulderDeg.toFixed(2),
    angle_convention: {
      theta_deg: 'CCW from +x, in (-180, 180]; the frame the occupancy grid is binned in',
      deg: 'degrees from vertical, matching frontend/src/mill/charge.ts: shoulder from the upward '
         + 'vertical, toe from the downward vertical, both positive',
      edges: 'circular-mean unwrap then 5th/95th percentile of the outer shell (r/R 0.7..1.0); '
           + 'leading edge (CCW) = shoulder, trailing = toe',
    },
    note: `Live 2D cross-section DEM (Hooke contact + Coulomb friction), averaged over ${sampleS.toFixed(1)} s `
        + `of simulated time after a ${settleS.toFixed(1)} s settle. Computed in the browser for THIS mill's `
        + 'parameters. Not the offline thin-3D slab bake: a 2D disc is not size-consistent in power, so the '
        + 'baked lane remains the power validation reference.',
  };
}
