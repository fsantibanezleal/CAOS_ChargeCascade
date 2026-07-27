// Canvas renderer for the live 2D DEM. This is the lane where a parameter change is answered by the
// physics rather than by a lookup, so every control in the focus rail can actually do something.
//
// Colour modes exist because they answer different questions: material shows the charge as a body,
// speed shows where the cataract is fastest, and impact shows where energy is being delivered. The
// impact histogram beside it is an ENERGY DISTRIBUTION only. It is deliberately NOT labelled or used as
// a breakage rate or a product size: that link comes from Datta & Rajamani, which is unread here, and
// asserting it from a histogram alone would be inventing the result.

import { useEffect, useRef } from 'react';
import { LiveDem, type LiveDemConfig, type LiveDemStats } from '../mill/livedem.ts';
import { useThemeStore } from '@fasl-work/caos-app-shell';

export type ColourMode = 'material' | 'speed' | 'impact';

/** Viridis-ish ramp, matching the palette the rest of the app already uses for intensity. */
function ramp(t: number): string {
  const u = Math.max(0, Math.min(1, t));
  const r = Math.round(255 * Math.min(1, Math.max(0, 1.4 * u - 0.2)));
  const g = Math.round(255 * Math.min(1, Math.max(0, 1.1 * u + 0.1)));
  const b = Math.round(255 * Math.min(1, Math.max(0, 1.0 - 1.2 * u)));
  return `rgb(${r},${g},${b})`;
}

export function LiveMill2D({
  cfg, running, colour, showTrails, onStats,
}: {
  cfg: LiveDemConfig;
  running: boolean;
  colour: ColourMode;
  showTrails: boolean;
  onStats?: (s: LiveDemStats) => void;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const demRef = useRef<LiveDem | null>(null);
  const rafRef = useRef(0);
  const runRef = useRef(running);
  const theme = useThemeStore((s) => s.theme);
  runRef.current = running;

  // Rebuild the solver when the CONFIGURATION changes. Every field here is a physical parameter, so a
  // change genuinely means a different simulation, not a re-render.
  useEffect(() => { demRef.current = new LiveDem(cfg); }, [
    cfg.millRadiusM, cfg.particleRadiusM, cfg.fill, cfg.omega, cfg.restitution,
    cfg.friction, cfg.lifterCount, cfg.lifterHeightM, cfg.particleDensity, cfg.maxParticles, cfg.seed,
  ]);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const dark = theme === 'dark';

    const draw = () => {
      const dem = demRef.current;
      if (!dem) { rafRef.current = requestAnimationFrame(draw); return; }

      // Advance only while running. Paused means paused: no compute, per the no-autoplay rule.
      if (runRef.current) dem.step(1 / 60);
      const st = dem.stats();
      onStats?.(st);

      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = cv.clientWidth, h = cv.clientHeight;
      if (cv.width !== w * dpr || cv.height !== h * dpr) { cv.width = w * dpr; cv.height = h * dpr; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (showTrails) {
        ctx.fillStyle = dark ? 'rgba(13,17,23,0.28)' : 'rgba(255,255,255,0.30)';
        ctx.fillRect(0, 0, w, h);
      } else {
        ctx.clearRect(0, 0, w, h);
      }

      const R = cfg.millRadiusM;
      const pad = 14;
      const scale = (Math.min(w, h) / 2 - pad) / R;
      const cx = w / 2, cy = h / 2;
      const X = (x: number) => cx + x * scale;
      const Y = (y: number) => cy - y * scale;   // screen y is down

      // shell
      ctx.strokeStyle = dark ? '#8b949e' : '#57606a';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, R * scale, 0, Math.PI * 2); ctx.stroke();

      // lifter bars, drawn at the shell's current angle so the charge is visibly keyed by them
      if (cfg.lifterCount > 0 && cfg.lifterHeightM > 0) {
        ctx.strokeStyle = '#2ea043';
        ctx.lineWidth = Math.max(2, 3 * scale * cfg.particleRadiusM);
        for (let k = 0; k < cfg.lifterCount; k++) {
          const ang = dem.shellAngle + (k * 2 * Math.PI) / cfg.lifterCount;
          const r0 = R - cfg.lifterHeightM;
          ctx.beginPath();
          ctx.moveTo(X(r0 * Math.cos(ang)), Y(r0 * Math.sin(ang)));
          ctx.lineTo(X(R * Math.cos(ang)), Y(R * Math.sin(ang)));
          ctx.stroke();
        }
      }

      // particles
      const pr = Math.max(1.2, cfg.particleRadiusM * scale);
      let vmax = 1e-6;
      if (colour === 'speed') {
        for (let i = 0; i < dem.n; i++) {
          const v = Math.hypot(dem.vx[i], dem.vy[i]);
          if (v > vmax) vmax = v;
        }
      }
      const base = dark ? '#7d8ea1' : '#4a5b70';
      for (let i = 0; i < dem.n; i++) {
        let fill = base;
        if (colour === 'speed') {
          fill = ramp(Math.hypot(dem.vx[i], dem.vy[i]) / vmax);
        } else if (colour === 'impact') {
          // proxy for where energy is being delivered: normal approach speed against the shell
          const r = Math.hypot(dem.x[i], dem.y[i]) || 1e-9;
          const vr = (dem.vx[i] * dem.x[i] + dem.vy[i] * dem.y[i]) / r;
          fill = ramp(Math.max(0, vr) / Math.max(0.5, vmax || 1));
        }
        ctx.fillStyle = fill;
        ctx.beginPath(); ctx.arc(X(dem.x[i]), Y(dem.y[i]), pr, 0, Math.PI * 2); ctx.fill();
      }

      // centre of mass: the torque arm the power models integrate, shown rather than left implicit
      ctx.strokeStyle = '#f0883e'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(X(st.comX), Y(st.comY)); ctx.stroke();
      ctx.fillStyle = '#f0883e';
      ctx.beginPath(); ctx.arc(X(st.comX), Y(st.comY), 4, 0, Math.PI * 2); ctx.fill();

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [cfg.millRadiusM, cfg.particleRadiusM, cfg.lifterCount, cfg.lifterHeightM, colour, showTrails, theme, onStats]);

  // Stop computing when the tab is hidden. A physics loop left running in a background tab is the
  // compute-bomb failure this codebase already has a rule about.
  useEffect(() => {
    const onVis = () => { if (document.hidden) cancelAnimationFrame(rafRef.current); };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  return <canvas ref={ref} style={{ width: '100%', height: '100%', display: 'block' }} />;
}
