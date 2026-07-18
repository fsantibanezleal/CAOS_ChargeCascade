import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { usePausedViz, useThemeStore } from '@fasl-work/caos-app-shell';
import { criticalSpeedRpm, omegaRadS, type Operating } from '../mill/index.ts';

// The interactive 3D tumbling mill. The cylindrical shell (axis along z) rotates; lifter bars carry the charge up;
// each charge BALL rides the shell until the Davis departure azimuth (cos a = omega^2 r/g per radial shell), then
// flies the parabolic free-flight trajectory and lands back at the toe, so the user WATCHES cascading ->
// cataracting -> centrifuging as they change phiC. Centrifuging shells (cos a >= 1) stay pinned to the shell.
// Balls are low-poly instanced spheres coloured by speed; the camera fits + centers the mill and the POV PERSISTS
// across option changes (only Reset view re-fits). Autoplay on load for visual impact; the rAF still halts on a
// hidden tab (ADR-0059). KINEMATIC animation of the analytic engine's physics, NOT a DEM solve. Pure three.js.
const G = 9.81;
const S = 60; // metres -> scene units
const VIRIDIS = [[68, 1, 84], [59, 82, 139], [33, 145, 140], [94, 201, 98], [253, 231, 37]];
function viridis(t: number): THREE.Color {
  t = Math.max(0, Math.min(1, t));
  const x = t * 4; const i = Math.min(3, Math.floor(x)); const f = x - i;
  const a = VIRIDIS[i]; const b = VIRIDIS[i + 1];
  return new THREE.Color((a[0] + f * (b[0] - a[0])) / 255, (a[1] + f * (b[1] - a[1])) / 255, (a[2] + f * (b[2] - a[2])) / 255);
}

function fitCamera(cam: THREE.PerspectiveCamera, controls: OrbitControls, box: THREE.Box3) {
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z) || 1000;
  const dist = (maxDim / 2) / Math.tan((cam.fov * Math.PI) / 360) * 1.5;
  controls.target.copy(center);
  cam.position.set(center.x + dist * 0.55, center.y + dist * 0.4, center.z + dist * 0.85);
  cam.near = Math.max(1, dist / 200); cam.far = dist * 12; cam.updateProjectionMatrix();
  controls.update();
}

export function Mill3D({ op, height = 380, speed = 1.5 }: { op: Operating; height?: number; speed?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const theme = useThemeStore((s) => s.theme);

  const [animSpeed, setAnimSpeed] = useState(() => speed || 1.5);
  const [ballSize, setBallSize] = useState(1);
  const speedRef = useRef(animSpeed); speedRef.current = animSpeed;
  const ballSizeRef = useRef(ballSize); ballSizeRef.current = ballSize;

  const viewRef = useRef<{ pos: THREE.Vector3; target: THREE.Vector3 } | null>(null);
  const resetViewRef = useRef<() => void>(() => {});

  const stepRef = useRef<((dtSec: number) => void) | null>(null);
  const viz = usePausedViz(() => { stepRef.current?.(0.05 * speedRef.current); }, { loop: true, autoStart: true });

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

    scene.add(new THREE.AmbientLight(0xffffff, dark ? 0.75 : 0.95));
    const dl = new THREE.DirectionalLight(0xffffff, 0.75);
    dl.position.set(1, 2, 1.5);
    scene.add(dl);

    const disposables: { dispose(): void }[] = [];

    // the mill shell (cylinder, axis along z), wireframe-ish + two end rings
    const shellGeo = new THREE.CylinderGeometry(R * S, R * S, L * S, 56, 1, true);
    shellGeo.rotateX(Math.PI / 2);
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

    // the charge: N balls as instanced low-poly spheres. Each rides the shell then flies the Davis parabola.
    const N = 1100;
    const ballGeo = new THREE.IcosahedronGeometry(1, 1); disposables.push(ballGeo);
    const ballMat = new THREE.MeshStandardMaterial({ metalness: 0.55, roughness: 0.4, flatShading: true }); disposables.push(ballMat);
    const balls = new THREE.InstancedMesh(ballGeo, ballMat, N);
    balls.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(balls); disposables.push(balls);
    const px = new Float32Array(N), py = new Float32Array(N), pz2 = new Float32Array(N);
    const rho = new Float32Array(N), zc = new Float32Array(N), phi = new Float32Array(N);
    const flying = new Uint8Array(N), tFly = new Float32Array(N), risen = new Uint8Array(N);
    const lpx = new Float32Array(N), lpy = new Float32Array(N), lvx = new Float32Array(N), lvy = new Float32Array(N);
    const spin = new Float32Array(N);
    const ballR = Math.max(4, R * S * 0.02);
    const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _sc = new THREE.Vector3();

    const setColor = (i: number, sp: number) => balls.setColorAt(i, viridis(0.15 + 0.85 * Math.min(1, sp)));
    const seed = (i: number) => {
      rho[i] = R * (0.45 + 0.53 * Math.sqrt(Math.random()));
      zc[i] = (Math.random() - 0.5) * L * 0.94;
      phi[i] = Math.PI + Math.random() * Math.PI;
      flying[i] = 0; tFly[i] = 0; risen[i] = 0; spin[i] = Math.random() * 6.28;
      setColor(i, 0.3);
    };
    for (let i = 0; i < N; i++) seed(i);

    const writeInstance = (i: number) => {
      spin[i] += 0.12 * speedRef.current;
      _e.set(spin[i], spin[i] * 0.7, 0); _q.setFromEuler(_e); _sc.setScalar(ballR * ballSizeRef.current);
      _m.compose(_v.set(px[i], py[i], pz2[i]), _q, _sc); balls.setMatrixAt(i, _m);
    };

    const step = (d: number) => {
      millGroup.rotation.z += omega * d;
      for (let i = 0; i < N; i++) {
        if (flying[i]) {
          tFly[i] += d;
          const t = tFly[i];
          const x = lpx[i] + lvx[i] * t;
          const y = lpy[i] + lvy[i] * t - 0.5 * G * t * t;
          px[i] = x * S; py[i] = y * S; pz2[i] = zc[i] * S;
          const landed = Math.hypot(x, y) >= rho[i] && t > 0.05;
          if (landed || y < -R * 1.05) { flying[i] = 0; phi[i] = Math.PI + Math.random() * 0.7 * Math.PI; risen[i] = 0; }
          setColor(i, Math.min(1, (Math.hypot(lvx[i], lvy[i]) - G * t) / (omega * R + 1) + 0.5));
        } else {
          phi[i] += omega * d;
          const pm = ((phi[i] % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
          px[i] = Math.cos(pm) * rho[i] * S; py[i] = Math.sin(pm) * rho[i] * S; pz2[i] = zc[i] * S;
          setColor(i, 0.25);
          if (pm > 1.5 * Math.PI) risen[i] = 1;
          const cosA = (omega * omega * rho[i]) / G;
          if (cosA < 1 && risen[i] && pm >= 0 && pm <= Math.PI / 2) {
            const alpha = Math.acos(cosA);
            const phiDep = Math.atan2(Math.cos(alpha), Math.sin(alpha));
            if (pm >= phiDep) {
              flying[i] = 1; tFly[i] = 0;
              const v = omega * rho[i];
              lpx[i] = Math.cos(pm) * rho[i]; lpy[i] = Math.sin(pm) * rho[i];
              lvx[i] = -v * Math.sin(pm); lvy[i] = v * Math.cos(pm);
            }
          }
        }
        writeInstance(i);
      }
      balls.instanceMatrix.needsUpdate = true;
      if (balls.instanceColor) balls.instanceColor.needsUpdate = true;
      controls.update();
      renderer.render(scene, cam);
    };

    // initial instance matrices + colors
    for (let i = 0; i < N; i++) { const pm = ((phi[i] % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI); px[i] = Math.cos(pm) * rho[i] * S; py[i] = Math.sin(pm) * rho[i] * S; pz2[i] = zc[i] * S; writeInstance(i); }
    balls.instanceMatrix.needsUpdate = true;
    if (balls.instanceColor) balls.instanceColor.needsUpdate = true;

    // camera: restore persisted POV, else fit the mill; expose reset
    const box = new THREE.Box3(new THREE.Vector3(-R * S, -R * S, -L * S / 2), new THREE.Vector3(R * S, R * S, L * S / 2));
    if (viewRef.current) { cam.position.copy(viewRef.current.pos); controls.target.copy(viewRef.current.target); cam.updateProjectionMatrix(); controls.update(); }
    else fitCamera(cam, controls, box);
    resetViewRef.current = () => { viewRef.current = null; fitCamera(cam, controls, box); renderer.render(scene, cam); };

    stepRef.current = step;
    renderer.render(scene, cam);
    controls.addEventListener('change', () => { viewRef.current = { pos: cam.position.clone(), target: controls.target.clone() }; renderer.render(scene, cam); });

    const ro = new ResizeObserver(() => { const w = el.clientWidth || W; renderer.setSize(w, H); cam.aspect = w / H; cam.updateProjectionMatrix(); renderer.render(scene, cam); });
    ro.observe(el);

    return () => {
      stepRef.current = null; resetViewRef.current = () => {}; ro.disconnect();
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
      <div className="cc-canvas-banner">
        <button type="button" className="btn" onClick={() => (viz.playing ? viz.pause() : viz.play())}>{viz.playing ? 'Pause' : 'Play'}</button>
        <span>Kinematic charge (Davis trajectories), drag to orbit, NOT a DEM solve</span>
      </div>
      <div className="cc-viz-controls">
        <label>speed
          <input type="range" min={0.05} max={4} step={0.05} value={animSpeed} onChange={(e) => setAnimSpeed(+e.target.value)} />
          <b>{animSpeed.toFixed(2)}x</b>
        </label>
        <label>ball size
          <input type="range" min={0.5} max={2.5} step={0.1} value={ballSize} onChange={(e) => setBallSize(+e.target.value)} />
          <b>{ballSize.toFixed(1)}x</b>
        </label>
        <button type="button" className="btn" onClick={() => resetViewRef.current()}>Reset view</button>
      </div>
    </div>
  );
}
