// The single-particle charge-motion model (Davis 1919; White; Rose & Sullivan). An element on a radial shell at
// radius r is carried up by the rotating shell until the DEPARTURE ANGLE where the radial component of gravity can no
// longer supply the centripetal force m*omega^2*r; it then free-flights as a PARABOLA until it re-impacts the charge
// toe. Departure condition (verified Davis relation):  cos(alpha) = omega^2 * r / g  (== phiC^2 * r/R per shell).
// Outer shells depart near the top (small alpha, thrown high); inner shells depart later -> the fanned cataract. An
// element with omega^2*r/g >= 1 never departs => it CENTRIFUGES. Sampling many shells over a revolution gives the
// particle cloud the 3D viz animates.

import { G } from './criticalspeed.ts';
import type { Shell } from './types.ts';

export interface ChargeGeometry {
  shells: Shell[];
  shoulderDeg: number;     // outer-layer departure angle [deg from vertical]
  toeDeg: number;          // landing (toe) angle [deg from vertical]
  fracCentrifuging: number;
}

/**
 * Per-shell departure + parabolic free-flight, for nShells radial layers from ~0.5R to the outer reachable radius
 * (R - ball/2). The 3D viz animates the returned trajectories; the engine reads the angles + the centrifuging
 * fraction. Pure analytic, sub-millisecond.
 */
export function chargeGeometry(diameterM: number, ballTopMm: number, omega: number, nShells = 9, nTraj = 20): ChargeGeometry {
  const R = diameterM / 2;
  const rMax = Math.max(0.1 * R, R - ballTopMm / 1000 / 2);
  const rMin = 0.5 * R;
  const shells: Shell[] = [];
  let nCent = 0;
  let toeDeg = NaN;

  for (let k = 0; k < nShells; k++) {
    const r = nShells === 1 ? rMax : rMin + ((rMax - rMin) * k) / (nShells - 1);
    const cosA = (omega * omega * r) / G; // Davis: cos(alpha) = omega^2 r / g
    if (cosA >= 1) {
      nCent++;
      shells.push({ r, alpha: NaN, centrifuging: true, departure: [r * Math.sin(0.001), r * Math.cos(0.001)], trajectory: [] });
      continue;
    }
    const alpha = Math.acos(cosA);
    const dep: [number, number] = [r * Math.sin(alpha), r * Math.cos(alpha)]; // ascending (+x) side, y up
    const v = omega * r; // launch speed, tangent to the circle
    const vx = -v * Math.cos(alpha); // CCW rotation lifts on +x and throws up-and-over toward -x
    const vy = v * Math.sin(alpha);

    // flight until the particle either re-crosses its departure radius on the descending side (lands on the
    // charge/toe) OR reaches the outer shell wall R. The second condition matters: for a near-critical inner
    // shell the RISING parábola can bulge past its own departure radius toward the wall, and a particle cannot
    // pass through the steel shell, so the flight ends at the wall. Without it the drawn trajectory pokes OUTSIDE
    // the mill circle in the 2D/3D viz.
    const tApex = vy > 0 ? vy / G : 0;
    let tLand = 0;
    const dt = 0.01;
    for (let t = 0; t < 4.0; t += dt) {
      const x = dep[0] + vx * t;
      const y = dep[1] + vy * t - 0.5 * G * t * t;
      tLand = t;
      const rad = Math.hypot(x, y);
      if (rad >= R) break;                       // hit the shell wall
      if (t > tApex && rad >= r) break;          // landed back on the charge/toe at the departure radius
    }
    const traj: [number, number][] = [];
    for (let j = 0; j <= nTraj; j++) {
      const t = (j / nTraj) * tLand;
      let x = dep[0] + vx * t;
      let y = dep[1] + vy * t - 0.5 * G * t * t;
      const rad = Math.hypot(x, y);
      if (rad > R) { x *= R / rad; y *= R / rad; } // clamp the final sample exactly onto the wall (never outside)
      traj.push([x, y]);
    }
    shells.push({ r, alpha, centrifuging: false, departure: dep, trajectory: traj });

    if (k === nShells - 1) {
      const xl = dep[0] + vx * tLand;
      const yl = dep[1] + vy * tLand - 0.5 * G * tLand * tLand;
      toeDeg = (Math.atan2(Math.abs(xl), -yl) * 180) / Math.PI; // angle below the horizontal on the descending side
    }
  }

  const outer = shells[shells.length - 1];
  const shoulderDeg = outer.centrifuging ? 0 : (outer.alpha * 180) / Math.PI;
  return { shells, shoulderDeg, toeDeg: Number.isNaN(toeDeg) ? 180 : toeDeg, fracCentrifuging: nCent / nShells };
}
