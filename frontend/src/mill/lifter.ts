// Lifter bars: the departure angle of a charge element from a LINED mill.
//
// Vermeulen, L.A. (1985), "The lifting action of lifter bars in rotary mills", Journal of the South
// African Institute of Mining and Metallurgy 85(2), 51-63. Open access:
// https://www.saimm.co.za/Journal/v085n02p041.pdf
//
// WHY THIS EXISTS. charge.ts implements Davis (1919): a charge element rides the shell and departs where
// the radial force balance gives cos(alpha) = omega^2 r / g. Davis has no liner in it, so lifter height,
// count and friction cannot enter the model at all. Real mills are lined, and Vermeulen measured the
// difference with high-speed film: standard rod-mill lifter bars add about 20 degrees of LIFT.
//
// THE CENTRAL RESULT, which contradicts the intuitive model. Vermeulen's opening argument is that an
// element CANNOT begin its flight at the point where all the forces acting on it are in equilibrium,
// because the acceleration along the lifter face is exactly zero there, by definition of equilibrium.
// What actually happens: the element reaches that equilibrium angle at rest relative to the bar, then
// SLIDES DOWN the lifter face with steadily growing acceleration, and departs when it runs off the edge
// of the bar. So the departure angle is set by the sliding dynamics and by the lifter HEIGHT, not by a
// force balance. He confirmed this on film, and found the departure velocity carries a large radial
// component, roughly 50% of the tangential component and up to ~60% for tall bars, which the equilibrium
// picture predicts to be exactly zero.
//
// Equations, in the paper's numbering:
//   (9),(10),(11)  the equilibrium point, used here ONLY as the initial condition of the slide
//   (23)           s = r cos(beta)
//   (26)           d^2s/dt^2 - Omega^2 s = g{ mu cos(Omega t + theta_0) - sin(Omega t + theta_0) }
//                                          - Omega^2 delta,   delta = mu (a + d/2)
//   (27),(28)      s(0) = (R-a) cos(beta_0),  (ds/dt)|_0 = 0   <- starts from REST
//   (29),(30)      the closed-form solution and the relative sliding speed
//
// We integrate (26) NUMERICALLY rather than evaluating the closed form (29). The paper was read from a
// PDF whose text layer mangles symbols and loses superscripts, so the constant factors in (29) could not
// be transcribed with confidence (g/2*Omega^2 versus g/2*Omega). The ODE itself is unambiguous. See
// CAOS_MANAGE wip/chargecascade-analysis-mode/research-pass2-lifters-2026-07-27.md.
//
// REJECTED ALTERNATIVE: a pure-rolling interaction. Vermeulen's Table III compares it against film and it
// over-predicts decisively (observed 53/67/73 deg for lifter heights 6.3/12.7/20.0 mm against a rolling
// prediction of 60.9/76.0/87.2 deg, with only 3 deg of experimental error). Do not implement rolling.

import { G } from './criticalspeed.ts';

export interface LifterGeometry {
  /** mill radius R [m] */
  radiusM: number;
  /** element (ball or rod) radius a [m] */
  elementRadiusM: number;
  /** lifter bar height h [m], measured from the shell inward */
  lifterHeightM: number;
  /** lifter bar width d [m]; Vermeulen's standard bars are about one element diameter wide */
  lifterWidthM: number;
  /** mill angular velocity Omega [rad/s] */
  omega: number;
  /** sliding friction coefficient mu between element and bar. Vermeulen's best fit to film was mu = 0;
   *  raising it to 0.1 increases the departure angle by about 5 degrees. */
  frictionMu: number;
}

export interface LifterDeparture {
  /** theta_0, lifter-bar angular position at the equilibrium point [rad] */
  equilibriumThetaRad: number;
  /** Phi_0 = theta_0 + beta_0, the element position at the equilibrium point [rad] */
  equilibriumPhiRad: number;
  /** Phi_F, the TRUE departure angle after the slide [rad] */
  departurePhiRad: number;
  /** L = Phi_F - Phi_d, the lift the bars add over the plain Davis departure [rad] */
  liftRad: number;
  /** time spent sliding down the bar face, from the equilibrium point to departure [s] */
  slideTimeS: number;
  /** true when the element never runs off the bar within the search window (it centrifuges, or the bar
   *  is so tall that it holds the element past the top). The caller must not treat this as a departure. */
  retained: boolean;
}

/**
 * Equilibrium point, Vermeulen eqs (9),(10),(11). Solves for theta_0 where the force sum vanishes.
 *
 * Substituting (10) into (9) eliminates N:
 *   m Omega^2 (R-a) cos(beta_0) + mu[ m g cos(theta_0) - m Omega^2 (R-a) sin(beta_0) ] - m g sin(theta_0) = 0
 * Dividing by m and writing q = Omega^2 (R-a):
 *   q cos(beta_0) - mu q sin(beta_0) + g[ mu cos(theta_0) - sin(theta_0) ] = 0
 * which is linear in { cos(theta_0), sin(theta_0) } and solves in closed form.
 *
 * beta_0 is the angle between the element centre and the bar axis at contact; for a bar of width d
 * carrying an element of radius a it is fixed by the contact geometry, tan(beta_0) = (a + d/2)/(R - a)
 * to the same small-angle order the paper uses.
 */
export function equilibriumPoint(g: LifterGeometry): { thetaRad: number; betaRad: number } {
  const { radiusM: R, elementRadiusM: a, lifterWidthM: d, omega, frictionMu: mu } = g;
  const beta0 = Math.atan2(a + d / 2, R - a);
  const q = omega * omega * (R - a);
  // g[ mu cos(theta) - sin(theta) ] = -q[ cos(beta0) - mu sin(beta0) ]  =>  C cos(theta) - S sin(theta) = K
  const K = -(q * (Math.cos(beta0) - mu * Math.sin(beta0))) / G;
  // mu cos(theta) - sin(theta) = A cos(theta + psi), A = sqrt(mu^2 + 1), psi = atan2(1, mu)
  const A = Math.hypot(mu, 1);
  const psi = Math.atan2(1, mu);
  const ratio = Math.max(-1, Math.min(1, K / A));
  const theta0 = Math.acos(ratio) - psi;
  return { thetaRad: theta0, betaRad: beta0 };
}

/**
 * Integrate the slide, Vermeulen eq (26), and return the departure.
 *
 * The element leaves when it has slid far enough along the bar axis to run off the edge, i.e. when the
 * inward displacement from its starting position reaches the lifter height h.
 */
export function lifterDeparture(g: LifterGeometry, davisPhiRad: number): LifterDeparture {
  const { radiusM: R, elementRadiusM: a, lifterHeightM: h, lifterWidthM: d, omega, frictionMu: mu } = g;
  const { thetaRad: theta0, betaRad: beta0 } = equilibriumPoint(g);
  const phi0 = theta0 + beta0;
  const delta = mu * (a + d / 2);          // eq (26)
  const s0 = (R - a) * Math.cos(beta0);    // eq (27)

  // eq (26) as a first-order system: s' = v ; v' = Omega^2 s + g{ mu cos(Omega t + theta0) - sin(Omega t + theta0) } - Omega^2 delta
  const accel = (s: number, t: number) =>
    omega * omega * s + G * (mu * Math.cos(omega * t + theta0) - Math.sin(omega * t + theta0)) - omega * omega * delta;

  // RK4. The solution grows like cosh(Omega t), so the step is scaled to the rotation, not fixed in seconds.
  const period = omega > 0 ? (2 * Math.PI) / omega : 1;
  const dt = period / 4000;
  const maxT = period / 2; // half a revolution is far beyond any physical slide; past that it is retained
  let s = s0, v = 0, t = 0;
  while (t < maxT) {
    // the element has run off the edge once it has moved h along the bar axis
    if (s0 - s >= h) {
      // INTERPRETATION (ours, not transcribed from the paper; flagged as such).
      //
      // The slide can finish BEFORE the plain Davis departure angle, which happens for a low bar on a
      // slow mill. Running off the bar then does not mean flight: the element simply stops being carried
      // by the BAR and continues to be carried by the SHELL, so the ordinary Davis departure governs and
      // the bar has added nothing. Taken literally the sliding solution would report a departure EARLIER
      // than the bare shell and hence a negative lift, which is physically impossible: a lifter bar can
      // only ever delay departure, never hasten it. Vermeulen defines the lift as L = Phi_F - Phi_d, an
      // increase, and treats Phi_F as the angle to which the bars "increase the angle of departure".
      //
      // So the bar governs only while it holds the element PAST the Davis point; otherwise Davis governs
      // and the lift is exactly zero.
      const phiSlide = phi0 + omega * t;
      const barGoverns = phiSlide > davisPhiRad;
      const phiF = barGoverns ? phiSlide : davisPhiRad;
      return {
        equilibriumThetaRad: theta0, equilibriumPhiRad: phi0,
        departurePhiRad: phiF, liftRad: phiF - davisPhiRad, slideTimeS: t, retained: false,
      };
    }
    const k1v = accel(s, t),               k1s = v;
    const k2v = accel(s + 0.5 * dt * k1s, t + 0.5 * dt), k2s = v + 0.5 * dt * k1v;
    const k3v = accel(s + 0.5 * dt * k2s, t + 0.5 * dt), k3s = v + 0.5 * dt * k2v;
    const k4v = accel(s + dt * k3s, t + dt),             k4s = v + dt * k3v;
    s += (dt / 6) * (k1s + 2 * k2s + 2 * k3s + k4s);
    v += (dt / 6) * (k1v + 2 * k2v + 2 * k3v + k4v);
    t += dt;
  }
  return {
    equilibriumThetaRad: theta0, equilibriumPhiRad: phi0,
    departurePhiRad: phi0, liftRad: 0, slideTimeS: t, retained: true,
  };
}
