import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useThemeStore } from '@fasl-work/caos-app-shell';
import { criticalSpeedRpm, omegaRadS, type Operating } from '../mill/index.ts';

// The interactive 3D tumbling mill. The cylindrical shell (axis along z) rotates; lifter bars carry the charge up;
// each charge particle RIDES the shell until the Davis departure azimuth (cos a = omega^2 r/g per radial shell), then
// flies the parabolic free-flight trajectory and lands back at the toe — so the user WATCHES cascading -> cataracting
// -> centrifuging as they change phiC. Centrifuging shells (cos a >= 1) stay pinned to the shell. This is a KINEMATIC
// animation of the analytic engine's physics (the ChancaDEM Chamber3D pattern), NOT a DEM solve. Pure three.js.
const G = 9.81;
const S = 60; // metres -> scene units
const VIRIDIS = [[68, 1, 84], [59, 82, 139], [33, 145, 140], [94, 201, 98], [253, 231, 37]];
function viridis(t: number): THREE.Color {
  t = Math.max(0, Math.min(1, t));
  const x = t * 4;
  const i = Math.min(3, Math.floor(x));
  const f = x - i;
  const a = VIRIDIS[i];
  const b = VIRIDIS[i + 1];
  return new THREE.Color((a[0] + f * (b[0] - a[0])) / 255, (a[1] + f * (b[1] - a[1])) / 255, (a[2] + f * (b[2] - a[2])) / 255);
}

export function Mill3D({ op, height = 380, speed = 1 }: { op: Operating; height?: number; speed?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const theme = useThemeStore((s) => s.theme);
  // playback speed — a VISUAL control (how fast the kinematic animation plays); it does NOT change the physics
  // (phiC / power / regime are unaffected). Read from a ref inside the rAF loop so dragging the slider never
  // re-creates the three.js scene.
  const speedRef = useRef(speed);
  useEffect(() => { speedRef.current = speed; }, [speed]);
  // preserve the user's orbit/zoom across op changes: the scene is rebuilt whenever op (or theme/height) changes, and
  // without this the camera would snap back to the default framing every time you change the case or a slider. We save
  // the camera position + orbit target when the scene tears down and restore them when it is recreated.
  const viewRef = useRef<{ pos: THREE.Vector3; target: THREE.Vector3 } | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const W = el.clientWidth || 640;
    const H = height;
    const dark = theme === 'dark';

    const R = op.diameterM / 2; // m
    const L = op.lengthM; // m
    const omega = omegaRadS(op.phiC, criticalSpeedRpm(op.diameterM, op.ballTopMm)); // rad/s

    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(45, W / H, 1, 100000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(2, devicePixelRatio));
    el.appendChild(renderer.domElement);
    const controls = new OrbitControls(cam, renderer.domElement);
    controls.enableDamping = true;
    // restore the user's orbit/zoom if we already have one (op changed → scene rebuilt); else use the default framing
    if (viewRef.current) {
      cam.position.copy(viewRef.current.pos);
      controls.target.copy(viewRef.current.target);
    } else {
      cam.position.set(R * S * 1.1, R * S * 0.5, L * S * 1.4 + R * S);
      controls.target.set(0, 0, 0);
    }
    controls.update();

    scene.add(new THREE.AmbientLight(0xffffff, dark ? 0.75 : 0.95));
    const dl = new THREE.DirectionalLight(0xffffff, 0.7);
    dl.position.set(1, 2, 1.5);
    scene.add(dl);

    const disposables: { dispose(): void }[] = [];

    // the mill shell (cylinder, axis along z) — wireframe-ish + two end rings
    const shellGeo = new THREE.CylinderGeometry(R * S, R * S, L * S, 56, 1, true);
    shellGeo.rotateX(Math.PI / 2); // axis: y -> z
    const shellMat = new THREE.MeshBasicMaterial({ color: dark ? 0x3a4350 : 0x9aa6b2, wireframe: true, transparent: true, opacity: 0.35 });
    scene.add(new THREE.Mesh(shellGeo, shellMat));
    disposables.push(shellGeo, shellMat);
    for (const zEnd of [-L * S / 2, L * S / 2]) {
      const ringGeo = new THREE.TorusGeometry(R * S, R * S * 0.012, 8, 56);
      const ringMat = new THREE.MeshBasicMaterial({ color: dark ? 0x5a6675 : 0x6b7682 });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.z = zEnd;
      scene.add(ring);
      disposables.push(ringGeo, ringMat);
    }

    // lifter bars on the inner wall, in a group that rotates with the shell (about z)
    const millGroup = new THREE.Group();
    scene.add(millGroup);
    const NLIFT = 12;
    for (let k = 0; k < NLIFT; k++) {
      const a = (k / NLIFT) * Math.PI * 2;
      const liftGeo = new THREE.BoxGeometry(R * S * 0.05, R * S * 0.08, L * S * 0.96);
      const liftMat = new THREE.MeshStandardMaterial({ color: 0x3fb950, metalness: 0.3, roughness: 0.6, flatShading: true });
      const bar = new THREE.Mesh(liftGeo, liftMat);
      bar.position.set(Math.cos(a) * R * S * 0.95, Math.sin(a) * R * S * 0.95, 0);
      bar.rotation.z = a;
      millGroup.add(bar);
      disposables.push(liftGeo, liftMat);
    }

    // the charge: N particles. Each rides the shell then flies the Davis parabola.
    const N = 1100;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    const rho = new Float32Array(N); // shell radius [m]
    const zc = new Float32Array(N); // length position [m]
    const phi = new Float32Array(N); // azimuth from +x [rad]
    const flying = new Uint8Array(N);
    const tFly = new Float32Array(N);
    const lpx = new Float32Array(N);
    const lpy = new Float32Array(N);
    const lvx = new Float32Array(N);
    const lvy = new Float32Array(N);
    const risen = new Uint8Array(N);

    const setColor = (i: number, speed: number) => {
      const c = viridis(0.15 + 0.85 * Math.min(1, speed));
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    };
    const seed = (i: number) => {
      rho[i] = R * (0.45 + 0.53 * Math.sqrt(Math.random())); // weighted to the outer (cataracting) shells
      zc[i] = (Math.random() - 0.5) * L * 0.94;
      phi[i] = Math.PI + Math.random() * Math.PI; // lower side, rising
      flying[i] = 0;
      tFly[i] = 0;
      risen[i] = 0;
      setColor(i, 0.3);
    };
    for (let i = 0; i < N; i++) seed(i);

    let raf = 0;
    const dt = 0.05; // s per frame (a watchable time scale)

    const animate = () => {
      const d = dt * speedRef.current;        // playback-scaled time step (visual speed; physics unchanged)
      millGroup.rotation.z += omega * d;
      for (let i = 0; i < N; i++) {
        if (flying[i]) {
          tFly[i] += d;
          const t = tFly[i];
          const x = lpx[i] + lvx[i] * t;
          const y = lpy[i] + lvy[i] * t - 0.5 * G * t * t;
          pos[i * 3] = x * S;
          pos[i * 3 + 1] = y * S;
          pos[i * 3 + 2] = zc[i] * S;
          const landed = Math.hypot(x, y) >= rho[i] && t > 0.05;
          if (landed || y < -R * 1.05) {
            flying[i] = 0;
            phi[i] = Math.PI + Math.random() * 0.7 * Math.PI; // re-enter at the toe / lower side
            risen[i] = 0;
          }
          setColor(i, Math.min(1, (Math.hypot(lvx[i], lvy[i]) - G * t) / (omega * R + 1) + 0.5));
        } else {
          phi[i] += omega * d;
          const pm = ((phi[i] % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
          pos[i * 3] = Math.cos(pm) * rho[i] * S;
          pos[i * 3 + 1] = Math.sin(pm) * rho[i] * S;
          pos[i * 3 + 2] = zc[i] * S;
          setColor(i, 0.25);
          if (pm > 1.5 * Math.PI) risen[i] = 1; // passed the bottom-right, ascending
          const cosA = (omega * omega * rho[i]) / G;
          if (cosA < 1 && risen[i] && pm >= 0 && pm <= Math.PI / 2) {
            const alpha = Math.acos(cosA);
            const phiDep = Math.atan2(Math.cos(alpha), Math.sin(alpha)); // = 90deg - alpha
            if (pm >= phiDep) {
              flying[i] = 1;
              tFly[i] = 0;
              const v = omega * rho[i];
              lpx[i] = Math.cos(pm) * rho[i];
              lpy[i] = Math.sin(pm) * rho[i];
              lvx[i] = -v * Math.sin(pm); // CCW tangent
              lvy[i] = v * Math.cos(pm);
            }
          }
        }
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
      controls.update();
      renderer.render(scene, cam);
      raf = requestAnimationFrame(animate);
    };

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const pMat = new THREE.PointsMaterial({ size: Math.max(6, R * S * 0.03), vertexColors: true, sizeAttenuation: true });
    scene.add(new THREE.Points(geo, pMat));
    disposables.push(geo, pMat);

    animate();
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth || W;
      renderer.setSize(w, H);
      cam.aspect = w / H;
      cam.updateProjectionMatrix();
    });
    ro.observe(el);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      // save the current view so the next rebuild (op/theme/height change) keeps the user's orbit/zoom
      viewRef.current = { pos: cam.position.clone(), target: controls.target.clone() };
      controls.dispose();
      for (const d of disposables) d.dispose();
      renderer.dispose();
      el.removeChild(renderer.domElement);
    };
  }, [op, theme, height]);

  return (
    <div className="cc-canvas-wrap">
      <div ref={ref} style={{ width: '100%', height }} />
      <div className="cc-canvas-banner">Kinematic charge animation (Davis trajectories) · drag to orbit · NOT a DEM solve</div>
    </div>
  );
}
