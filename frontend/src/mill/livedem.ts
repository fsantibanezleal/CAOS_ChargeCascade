// A live 2D soft-sphere DEM of the mill cross-section, running in the browser.
//
// WHY THIS EXISTS. Until now the app had two lanes and neither could answer an operating question in
// real time. The analytic lane (Davis + Vermeulen) is a SINGLE-element kinematic model: it has no
// particle interactions, so it cannot show a charge shape, a toe forming, or an impact. The DEM lane is
// baked offline on a 7x5 (phiC, J) grid and replayed, so only those two dimensions respond and every
// other parameter is frozen at bake time. Restitution, colour-by-velocity, impact-energy spectra and
// per-lifter wear are impossible in both: they need actual contacts, computed now.
//
// SCOPE, stated plainly. This is a 2D cross-section solver. It is NOT the offline 3D milldem bake and it
// does NOT supersede it. The 3D bake stays the validation reference precisely because a 2D disc slice
// cannot be size-consistent in power (its power/HF ratio shrinks with mill size, which is why the
// offline lane uses a thin-3D slab). What the live lane is for is INTERACTIVE UNDERSTANDING: move a
// parameter, watch the charge reorganize.
//
// CONTACT MODEL. Linear (Hooke) normal spring with viscous damping, Coulomb tangential friction. Same
// family as milldem's `ContactModel(model="hooke", ...)`, so the two lanes are comparable.
//
//   Fn = -k_n * delta  -  c_n * v_n        (delta = overlap, v_n = normal approach speed)
//   Ft = -min(mu * |Fn|, k_t * |xi_t|) * t_hat
//
// The damping constant comes from the restitution coefficient by the standard linear-spring relation
//   c_n = -2 * ln(e) * sqrt(m_eff * k_n / (pi^2 + ln(e)^2))
// which reproduces a target `e` for a binary collision independent of impact speed.
//
// PARAMETERS. Defaults e = 0.30 and mu = 0.75 from Mhadhbi (2021), Adv. Mater. Phys. Chem. 11:167-175,
// DOI 10.4236/ampc.2021.1110016. Both are exposed as controls because restitution spans roughly 0.05 to
// 0.9 across the literature; see CAOS_MANAGE wip/chargecascade-analysis-mode/research-pass3-contact-2026-07-27.md.
//
// WEAR. Archard (1953), in the incremental DEM form used by the bulk-handling literature:
//     V = W * F_n * s          wear volume at a contact  (W = Archard wear constant, Pa^-1)
//     h = V / A                wear depth over the contact patch
// (as stated in arXiv:2509.08637 eqs 3-4, citing Archard 1953, Hutchings 1992, Jayasundara & Zhu 2022).
// Accumulated PER LIFTER BAR from the actual contact normal force and the actual tangential sliding
// distance in each substep, so the profile is a consequence of the simulation rather than a decoration.
//
// STILL NOT IMPLEMENTED, deliberately: any mapping from the impact-energy spectrum to a breakage rate
// or a product size. That link is Datta and Rajamani's and is unread here; a histogram alone does not
// establish it, and asserting it would be inventing the result.

export interface LiveDemConfig {
  millRadiusM: number;
  particleRadiusM: number;
  /** fractional filling J used to choose the particle count */
  fill: number;
  omega: number;            // mill angular velocity [rad/s], positive = counter-clockwise
  restitution: number;      // e
  friction: number;         // mu
  lifterCount: number;
  lifterHeightM: number;
  particleDensity: number;  // [t/m^3]
  /** Archard wear constant W [Pa^-1]. Steel-on-steel abrasive wear is small; the default is a
   *  demonstration scale that makes a profile visible in seconds of simulated time rather than a
   *  calibrated plant value, and the UI says so. */
  wearConstant?: number;
  /** hard cap so a slider can never launch a compute bomb */
  maxParticles?: number;
  seed?: number;
}

export interface LiveDemStats {
  /** particles currently simulated */
  n: number;
  /** mean speed [m/s] */
  meanSpeed: number;
  /** charge centre of mass, mill-centred coordinates [m] */
  comX: number;
  comY: number;
  /** |CoM| offset from the axis [m]: the torque arm the power models use */
  comOffsetM: number;
  /** collisions resolved in the last step */
  contacts: number;
  /** normal-collision energies from the last step [J], for the impact-energy histogram */
  impactEnergies: number[];
  /** total kinetic energy [J] */
  kineticJ: number;
  /** simulated time [s] */
  timeS: number;
  /** cumulative Archard wear volume per lifter bar [m^3], index = bar number */
  lifterWear: Float64Array;
  /** total charge-on-shell wear volume [m^3] */
  shellWear: number;
}

const TWO_PI = Math.PI * 2;

/** Deterministic PRNG so a given config always produces the same run (screenshot-verifiable). */
function mulberry32(a: number) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class LiveDem {
  readonly cfg: Required<LiveDemConfig>;
  x: Float64Array; y: Float64Array; vx: Float64Array; vy: Float64Array;
  n = 0;
  private m = 0;          // particle mass [kg]
  private kn = 0;         // normal stiffness [N/m]
  private cn = 0;         // normal damping [N s/m]
  private kt = 0;         // tangential stiffness [N/m]
  private dt = 0;
  private theta = 0;      // shell/lifter rotation angle [rad]
  private t = 0;
  private cell = 0;       // uniform-grid cell size
  private nx = 0; private ny = 0;
  private heads: Int32Array = new Int32Array(0);
  private next: Int32Array = new Int32Array(0);
  private lastImpacts: number[] = [];
  private lastContacts = 0;
  private wear: Float64Array = new Float64Array(0);   // Archard volume per lifter bar [m^3]
  private shellWearV = 0;

  constructor(cfg: LiveDemConfig) {
    const maxParticles = cfg.maxParticles ?? 2400;
    this.cfg = { ...cfg, maxParticles, seed: cfg.seed ?? 42,
                 wearConstant: cfg.wearConstant ?? 1e-7 } as Required<LiveDemConfig>;
    const R = cfg.millRadiusM, a = cfg.particleRadiusM;

    // Particle count from the areal filling, capped. A 2D cross-section fills by AREA, so
    // n = J * pi R^2 / (pi a^2 / packing) with a 2D random-close-packing fraction of ~0.82.
    const packing2D = 0.82;
    const wanted = Math.floor((cfg.fill * Math.PI * R * R * packing2D) / (Math.PI * a * a));
    this.n = Math.max(1, Math.min(wanted, maxParticles));

    this.x = new Float64Array(this.n); this.y = new Float64Array(this.n);
    this.vx = new Float64Array(this.n); this.vy = new Float64Array(this.n);

    // mass per unit depth: treat each disc as a sphere of radius a for mass purposes so energies are
    // physically scaled rather than per-unit-area abstractions.
    this.m = (cfg.particleDensity * 1000) * (4 / 3) * Math.PI * a * a * a;

    // Stiffness: soft enough for a large stable dt, stiff enough that overlaps stay small. Target a
    // max overlap of ~1% of a particle radius under a charge-depth load.
    const g = 9.81;
    const load = this.m * g * Math.max(4, Math.sqrt(this.n));
    this.kn = load / (0.01 * a);
    const lnE = Math.log(Math.max(1e-3, Math.min(0.999, cfg.restitution)));
    const meff = this.m / 2;
    this.cn = (-2 * lnE * Math.sqrt((meff * this.kn) / (Math.PI * Math.PI + lnE * lnE)));
    this.kt = this.kn * 0.8;

    // Rayleigh-style stability limit; a safety factor of 0.15 keeps the explicit integrator stable.
    this.dt = 0.15 * Math.PI * Math.sqrt(meff / this.kn);

    this.cell = 2.05 * a;
    this.nx = Math.max(1, Math.ceil((2 * R) / this.cell));
    this.ny = this.nx;
    this.heads = new Int32Array(this.nx * this.ny);
    this.next = new Int32Array(this.n);

    this.wear = new Float64Array(Math.max(1, cfg.lifterCount));
    this.seedCharge();
  }

  /** Fill the bottom of the mill with a jittered lattice, the way a real charge is loaded at rest. */
  private seedCharge() {
    const { millRadiusM: R, particleRadiusM: a } = this.cfg;
    const rnd = mulberry32(this.cfg.seed);
    // Lattice pitch and jitter are coupled: the clearance (step - 2a) must exceed the worst-case
    // approach from jitter on BOTH neighbours, or the charge is seeded already overlapped. A stiff
    // normal spring turns that stored overlap into an explosion on the first substep (measured: mean
    // speed 4000 m/s, kinetic energy 1e10 J, with 2.05a pitch and 0.15a jitter).
    const step = 2.2 * a;          // clearance 0.2a
    const jitter = 0.04 * a;       // worst-case mutual approach 0.08a, comfortably inside the clearance
    // Particle CENTRES must lie inside the reachable circle of radius (R - a), not inside R. Using
    // sqrt(R^2 - y^2) - a for the half-width looks right but is not: it puts the edge particles at
    // radius >= R - a, i.e. marginally OUTSIDE the shell, because the chord shortens faster than the
    // radius does. Solve on the reachable circle directly.
    const rMax = R - a;
    let i = 0;
    for (let row = 0; i < this.n && row < 400; row++) {
      // Row spacing must be at least the contact DIAMETER. Using step*0.95 seeds the lattice already
      // overlapping, and with a stiff normal spring that is not a small error: it is stored energy that
      // detonates the charge on the first substep and drives the settled centre of mass ABOVE the axis.
      const yy = -rMax + row * step;
      if (yy > rMax) break;
      const halfW = Math.sqrt(Math.max(0, rMax * rMax - yy * yy));
      for (let xx = -halfW; xx <= halfW && i < this.n; xx += step) {
        let px = xx + (rnd() - 0.5) * jitter;
        let py = yy + (rnd() - 0.5) * jitter;
        const pr = Math.hypot(px, py);
        if (pr > rMax && pr > 1e-12) { px *= rMax / pr; py *= rMax / pr; }  // jitter must not eject
        this.x[i] = px;
        this.y[i] = py;
        this.vx[i] = 0; this.vy[i] = 0;
        i++;
      }
    }
    this.n = i;
    this.next = new Int32Array(this.n);
  }

  /** Rebuild the uniform-grid neighbour index. O(n), and it is what keeps this real-time. */
  private bin() {
    const R = this.cfg.millRadiusM;
    this.heads.fill(-1);
    for (let i = 0; i < this.n; i++) {
      const cx = Math.min(this.nx - 1, Math.max(0, ((this.x[i] + R) / this.cell) | 0));
      const cy = Math.min(this.ny - 1, Math.max(0, ((this.y[i] + R) / this.cell) | 0));
      const c = cy * this.nx + cx;
      this.next[i] = this.heads[c];
      this.heads[c] = i;
    }
  }

  /**
   * Contact against a lifter bar, treated as a RADIAL WALL of height h standing on the shell.
   *
   * The first version pushed the particle along a fixed tangential direction whenever it fell inside a
   * bar's angular width, with no regard for which SIDE of the bar it was on and no damping. That is a
   * one-sided perpetual push: measured, it drove a stationary mill's mean particle speed from 1.2 to
   * 19 m/s and its kinetic energy to 2.4e5 J, monotonically, with the mill not even turning.
   *
   * Correct treatment: a bar at angle `barAng` spans radius R-h to R. The signed perpendicular distance
   * from the particle centre to that radial line is `s = r * sin(ang - barAng)`. Contact exists when
   * |s| < a. The normal points AWAY from the bar on whichever side the particle actually is, and the
   * response is damped against the bar's material velocity like any other wall.
   */
  private lifterContact(px: number, py: number): { nx: number; ny: number; pen: number; bar: number } | null {
    const { lifterCount: L, lifterHeightM: h, millRadiusM: R, particleRadiusM: a } = this.cfg;
    if (L <= 0 || h <= 0) return null;
    const r = Math.hypot(px, py);
    if (r < R - h - a || r < 1e-9) return null;      // deeper than the bars reach
    const pitch = TWO_PI / L;
    const ang = Math.atan2(py, px);
    // nearest bar angle
    const k = Math.round((ang - this.theta) / pitch);
    const barAng = this.theta + k * pitch;
    let d = ang - barAng;
    d = ((d + Math.PI) % TWO_PI + TWO_PI) % TWO_PI - Math.PI;   // wrap to (-pi, pi]
    const s = r * Math.sin(d);                        // signed perpendicular distance to the bar line
    const pen = a - Math.abs(s);
    if (pen <= 0) return null;
    const sign = s >= 0 ? 1 : -1;                     // push away from the bar, on the particle's side
    const bar = ((k % L) + L) % L;                    // which bar, for per-bar wear attribution
    return { nx: sign * -Math.sin(barAng), ny: sign * Math.cos(barAng), pen, bar };
  }

  /**
   * Advance the simulation, substepping internally, and return the mill time ACTUALLY advanced.
   *
   * The substep count is capped so a slider can never stall the UI thread: a frame must stay a frame.
   * That cap means the call may advance LESS than requested, which is why it returns the real figure
   * instead of silently pretending. (It previously returned void, and a caller asking for 1.2 s quietly
   * got 0.27 s, which looked exactly like a charge that would not move.)
   */
  step(seconds: number, maxSubsteps = 400): number {
    const wanted = Math.max(1, Math.round(seconds / this.dt));
    const steps = Math.min(maxSubsteps, wanted);
    for (let s = 0; s < steps; s++) this.substep();
    return steps * this.dt;
  }

  /** Advance a full `seconds` regardless of cost. For offline checks and tests, never for a frame. */
  advance(seconds: number): void {
    const target = this.t + seconds;
    let guard = 0;
    while (this.t < target && guard++ < 2_000_000) this.substep();
  }

  private substep() {
    const { millRadiusM: R, particleRadiusM: a, omega, friction: mu } = this.cfg;
    const dt = this.dt, g = 9.81;
    const fx = new Float64Array(this.n), fy = new Float64Array(this.n);
    this.lastImpacts = [];
    this.lastContacts = 0;

    // gravity
    for (let i = 0; i < this.n; i++) fy[i] -= this.m * g;

    // particle-particle contacts via the uniform grid
    this.bin();
    for (let i = 0; i < this.n; i++) {
      const cx = Math.min(this.nx - 1, Math.max(0, ((this.x[i] + R) / this.cell) | 0));
      const cy = Math.min(this.ny - 1, Math.max(0, ((this.y[i] + R) / this.cell) | 0));
      for (let ox = -1; ox <= 1; ox++) {
        for (let oy = -1; oy <= 1; oy++) {
          const bx = cx + ox, by = cy + oy;
          if (bx < 0 || by < 0 || bx >= this.nx || by >= this.ny) continue;
          for (let j = this.heads[by * this.nx + bx]; j !== -1; j = this.next[j]) {
            if (j <= i) continue;
            const dx = this.x[j] - this.x[i], dy = this.y[j] - this.y[i];
            const d2 = dx * dx + dy * dy;
            const sum = 2 * a;
            if (d2 >= sum * sum || d2 === 0) continue;
            const d = Math.sqrt(d2);
            const nxv = dx / d, nyv = dy / d;
            const overlap = sum - d;
            const rvx = this.vx[j] - this.vx[i], rvy = this.vy[j] - this.vy[i];
            const vn = rvx * nxv + rvy * nyv;
            // SIGN, carefully. n_hat runs i -> j, so approach means vn < 0. The dissipative force must
            // ADD to the repulsion while approaching and SUBTRACT while separating, which with this
            // convention is `+ cn * vn`, not `- cn * vn`. The wrong sign is not merely inaccurate: it
            // is an energy PUMP that drove the charge to a mean speed of 4000 m/s and 1e10 J.
            const fn = -this.kn * overlap + this.cn * vn;
            // tangential Coulomb slip
            const vtx = rvx - vn * nxv, vty = rvy - vn * nyv;
            const vt = Math.hypot(vtx, vty);
            let ftx = 0, fty = 0;
            if (vt > 1e-9) {
              const ft = Math.min(mu * Math.abs(fn), this.kt * vt * dt);
              ftx = -ft * (vtx / vt); fty = -ft * (vty / vt);
            }
            fx[i] += fn * nxv - ftx; fy[i] += fn * nyv - fty;
            fx[j] -= fn * nxv - ftx; fy[j] -= fn * nyv - fty;
            if (vn < 0) {
              // normal collision energy of this approach, the quantity the impact spectrum bins
              this.lastImpacts.push(0.5 * (this.m / 2) * vn * vn);
              this.lastContacts++;
            }
          }
        }
      }
    }

    // shell + lifter contacts
    for (let i = 0; i < this.n; i++) {
      const r = Math.hypot(this.x[i], this.y[i]);
      const wallOverlap = r + a - R;
      if (wallOverlap > 0 && r > 1e-9) {
        const nxv = this.x[i] / r, nyv = this.y[i] / r;      // outward
        // wall material velocity at the contact point (the shell drags the charge round)
        const wvx = -omega * this.y[i], wvy = omega * this.x[i];
        const rvx = this.vx[i] - wvx, rvy = this.vy[i] - wvy;
        const vn = rvx * nxv + rvy * nyv;
        const fn = -this.kn * wallOverlap - this.cn * vn;
        const vtx = rvx - vn * nxv, vty = rvy - vn * nyv;
        const vt = Math.hypot(vtx, vty);
        let ftx = 0, fty = 0;
        if (vt > 1e-9) {
          const ft = Math.min(mu * Math.abs(fn), this.kt * vt * dt);
          ftx = -ft * (vtx / vt); fty = -ft * (vty / vt);
          this.shellWearV += this.cfg.wearConstant * Math.abs(fn) * (vt * dt);
        }
        fx[i] += fn * nxv + ftx; fy[i] += fn * nyv + fty;
        if (vn < 0) { this.lastImpacts.push(0.5 * this.m * vn * vn); this.lastContacts++; }
      }
      const lift = this.lifterContact(this.x[i], this.y[i]);
      if (lift) {
        // velocity of the bar material at this point (it rotates with the shell)
        const wvx = -omega * this.y[i], wvy = omega * this.x[i];
        const rvx = this.vx[i] - wvx, rvy = this.vy[i] - wvy;
        const vn = rvx * lift.nx + rvy * lift.ny;      // positive = separating from the bar
        const fn = this.kn * lift.pen - this.cn * vn;  // damped, same convention as the shell wall
        if (fn > 0) {
          fx[i] += fn * lift.nx; fy[i] += fn * lift.ny;
          // tangential friction along the bar face
          const vtx = rvx - vn * lift.nx, vty = rvy - vn * lift.ny;
          const vt = Math.hypot(vtx, vty);
          if (vt > 1e-9) {
            const ft = Math.min(mu * fn, this.kt * vt * dt);
            fx[i] -= ft * (vtx / vt); fy[i] -= ft * (vty / vt);
            // Archard: dV = W * F_n * ds, with ds the tangential slip over this substep.
            this.wear[lift.bar] += this.cfg.wearConstant * fn * (vt * dt);
          }
          if (vn < 0) { this.lastImpacts.push(0.5 * this.m * vn * vn); this.lastContacts++; }
        }
      }
    }

    // semi-implicit Euler
    for (let i = 0; i < this.n; i++) {
      this.vx[i] += (fx[i] / this.m) * dt;
      this.vy[i] += (fy[i] / this.m) * dt;
      this.x[i] += this.vx[i] * dt;
      this.y[i] += this.vy[i] * dt;
      // hard clamp: nothing may leave the shell, whatever the contact law does
      const r = Math.hypot(this.x[i], this.y[i]);
      const rmax = R - a;
      if (r > rmax && r > 1e-9) {
        this.x[i] *= rmax / r; this.y[i] *= rmax / r;
        const nxv = this.x[i] / r, nyv = this.y[i] / r;
        const vn = this.vx[i] * nxv + this.vy[i] * nyv;
        if (vn > 0) { this.vx[i] -= vn * nxv; this.vy[i] -= vn * nyv; }
      }
    }

    this.theta += omega * dt;
    this.t += dt;
  }

  stats(): LiveDemStats {
    let sx = 0, sy = 0, sv = 0, ke = 0;
    for (let i = 0; i < this.n; i++) {
      sx += this.x[i]; sy += this.y[i];
      const v2 = this.vx[i] * this.vx[i] + this.vy[i] * this.vy[i];
      sv += Math.sqrt(v2);
      ke += 0.5 * this.m * v2;
    }
    const comX = this.n ? sx / this.n : 0, comY = this.n ? sy / this.n : 0;
    return {
      n: this.n,
      meanSpeed: this.n ? sv / this.n : 0,
      comX, comY,
      comOffsetM: Math.hypot(comX, comY),
      contacts: this.lastContacts,
      impactEnergies: this.lastImpacts,
      kineticJ: ke,
      timeS: this.t,
      lifterWear: this.wear,
      shellWear: this.shellWearV,
    };
  }

  /** Rotation angle of the shell, so the renderer can draw the lifters in the right place. */
  get shellAngle(): number { return this.theta; }
  get timeStep(): number { return this.dt; }
}
