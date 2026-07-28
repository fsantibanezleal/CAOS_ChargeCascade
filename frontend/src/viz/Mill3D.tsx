import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { usePausedViz, useShellLang, useThemeStore } from '@fasl-work/caos-app-shell';
import { criticalSpeedRpm, omegaRadS, type Operating } from '../mill/index.ts';
import { fetchDemFrames, type DemFrames } from '../lib/demframes.ts';

// The interactive 3D tumbling mill. Two sources, toggled live:
//  - 'davis'  : the KINEMATIC analytic view. Each ball rides the shell until the Davis departure azimuth
//               (cos a = omega^2 r/g per radial shell), then flies the parabolic free-flight and lands at the toe.
//               Single-particle physics, computed live in TS, reacts to every slider. NOT a DEM solve.
//  - 'dem'    : REAL baked DEM. The milldem thin-3D-slab engine (data-pipeline/cclab/dem) computed the full
//               particle dynamics OFFLINE (contact forces, friction, force chains); here we only replay the baked
//               per-frame positions on the InstancedMesh. A browser cannot run DEM time-integration (Govender 2015:
//               4 M particles = 1.16 h per simulated second on a GPU). The slab is tiled along the axis to fill the
//               mill length (exact under the periodic-axial boundary), each tile at a different time-phase.
// Balls are low-poly instanced spheres coloured by speed; the camera fits + centers the mill and the POV PERSISTS
// across option changes (only Reset view re-fits). Autoplays SLOWLY; the rAF halts on a hidden tab (ADR-0059).
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
  // 1.5 left the mill occupying a small fraction of the stage, which is the whole point of a focus
  // view defeated. 1.12 frames it with a modest margin and no clipping.
  const dist = (maxDim / 2) / Math.tan((cam.fov * Math.PI) / 360) * 1.12;
  controls.target.copy(center);
  cam.position.set(center.x + dist * 0.55, center.y + dist * 0.4, center.z + dist * 0.85);
  cam.near = Math.max(1, dist / 200); cam.far = dist * 12; cam.updateProjectionMatrix();
  controls.update();
}

type Mode = 'davis' | 'dem';

export function Mill3D({ op, caseId, demEnabled = false, height = 380, speed = 0.05 }:
  { op: Operating; caseId?: string; demEnabled?: boolean; height?: number; speed?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const theme = useThemeStore((s) => s.theme);
  const es = useShellLang() === 'es';

  const [mode, setMode] = useState<Mode>(demEnabled ? 'dem' : 'davis');
  const [dem, setDem] = useState<DemFrames | null>(null);
  const [demMiss, setDemMiss] = useState(false);
  const [frameIdx, setFrameIdx] = useState(0);      // scrub position (dem mode)
  const frameRef = useRef(0); frameRef.current = frameIdx;

  const [animSpeed, setAnimSpeed] = useState(() => speed ?? 0.05);
  const [ballSize, setBallSize] = useState(1);
  const speedRef = useRef(animSpeed); speedRef.current = animSpeed;
  const ballSizeRef = useRef(ballSize); ballSizeRef.current = ballSize;
  const modeRef = useRef(mode); modeRef.current = mode;

  const geoSigRef = useRef<string>('');
  const viewRef = useRef<{ pos: THREE.Vector3; target: THREE.Vector3 } | null>(null);
  const resetViewRef = useRef<() => void>(() => {});
  const scrubRef = useRef<(f: number) => void>(() => {});

  // fetch the baked DEM frames for the case (synthetic canonical point). Missing bake -> fall back to davis.
  useEffect(() => {
    if (!demEnabled || !caseId) { setDem(null); setDemMiss(false); return; }
    let cancel = false;
    const base = import.meta.env.BASE_URL || '/';
    fetchDemFrames(caseId, base).then((d) => {
      if (cancel) return;
      if (d) { setDem(d); setDemMiss(false); }
      else { setDem(null); setDemMiss(true); setMode('davis'); }
    }).catch(() => { if (!cancel) { setDem(null); setDemMiss(true); setMode('davis'); } });
    return () => { cancel = true; };
  }, [caseId, demEnabled]);

  const stepRef = useRef<((dtSec: number) => void) | null>(null);
  const viz = usePausedViz(() => { stepRef.current?.(0.05 * speedRef.current); }, { loop: true, autoStart: true });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const W = el.clientWidth || 640;
    // height = 0 means FILL THE PARENT (the ADR-0070 focus stage). A fixed pixel height cannot express
    // "own the viewport", and passing 0 straight through produced a 1280x2 canvas that rendered nothing
    // while the build stayed green.
    const H = height > 0 ? height : Math.max(1, ref.current?.clientHeight ?? 0);
    const dark = theme === 'dark';
    const useDem = mode === 'dem' && dem != null;

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

    const ballGeo = useDem ? new THREE.IcosahedronGeometry(1, 0) : new THREE.IcosahedronGeometry(1, 1);
    disposables.push(ballGeo);
    const ballMat = new THREE.MeshStandardMaterial({ metalness: 0.55, roughness: 0.4, flatShading: true }); disposables.push(ballMat);
    const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _sc = new THREE.Vector3();

    let step: (d: number) => void;
    let renderStatic: () => void;
    const box = new THREE.Box3(new THREE.Vector3(-R * S, -R * S, -L * S / 2), new THREE.Vector3(R * S, R * S, L * S / 2));

    if (useDem) {
      // ---- DEM replay: tile the slab `tiles` times along z, each tile at its own time-phase ----
      const hdr = dem!.header;
      const Nslab = hdr.N, F = hdr.F, tiles = Math.max(1, hdr.tiles), w = hdr.slabThicknessM;
      const N = Nslab * tiles;
      const balls = new THREE.InstancedMesh(ballGeo, ballMat, N);
      balls.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      scene.add(balls); disposables.push(balls);
      const ballR = Math.max(2.5, (hdr.ballDiameterM / 2) * S);
      const cur = new Float32Array(Nslab * 3);
      const prev = new Float32Array(Nslab * 3);
      // per-tile axial base offset in metres, centered on the mill
      const tileZ0 = (t: number) => t * w - (tiles * w) / 2;

      const writeFrame = (fIdx: number) => {
        let inst = 0;
        for (let t = 0; t < tiles; t++) {
          const ph = dem!.tilePhase(t);
          dem!.readFrame(fIdx + ph, cur);
          dem!.readFrame(fIdx + ph - 1, prev);
          const z0 = tileZ0(t);
          for (let i = 0; i < Nslab; i++) {
            const o = i * 3;
            const x = cur[o] * S, y = cur[o + 1] * S, z = (z0 + cur[o + 2]) * S;
            const dx = cur[o] - prev[o], dy = cur[o + 1] - prev[o + 1], dz = cur[o + 2] - prev[o + 2];
            const sp = Math.hypot(dx, dy, dz) * hdr.fps;                    // m/s
            _sc.setScalar(ballR * ballSizeRef.current);
            _m.compose(_v.set(x, y, z), _q.identity(), _sc);
            balls.setMatrixAt(inst, _m);
            balls.setColorAt(inst, viridis(0.12 + 0.88 * Math.min(1, sp / (omega * R + 1.5))));
            inst++;
          }
        }
        // rotate the shell + lifters to match the baked charge advance (revsCovered over F frames)
        millGroup.rotation.z = 2 * Math.PI * hdr.revsCovered * (((fIdx % F) + F) % F) / F;
        balls.instanceMatrix.needsUpdate = true;
        if (balls.instanceColor) balls.instanceColor.needsUpdate = true;
      };

      let f = frameRef.current;
      let acc = 0;
      step = (d: number) => {
        acc += d * hdr.fps * 6;                 // advance ~ time * fps, sped up for a lively replay
        if (acc >= 1) { f = (f + Math.floor(acc)) % F; acc -= Math.floor(acc); setFrameIdx(f); }
        writeFrame(f);
        controls.update();
        renderer.render(scene, cam);
      };
      scrubRef.current = (fi: number) => { f = ((fi % F) + F) % F; writeFrame(f); renderer.render(scene, cam); };
      renderStatic = () => { writeFrame(frameRef.current); renderer.render(scene, cam); };
    } else {
      // ---- Davis kinematic (single-particle analytic) ----
      const N = 1100;
      const balls = new THREE.InstancedMesh(ballGeo, ballMat, N);
      balls.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      scene.add(balls); disposables.push(balls);
      const px = new Float32Array(N), py = new Float32Array(N), pz2 = new Float32Array(N);
      const rho = new Float32Array(N), zc = new Float32Array(N), phi = new Float32Array(N);
      const flying = new Uint8Array(N), tFly = new Float32Array(N), risen = new Uint8Array(N);
      const lpx = new Float32Array(N), lpy = new Float32Array(N), lvx = new Float32Array(N), lvy = new Float32Array(N);
      const spin = new Float32Array(N);
      const ballR = Math.max(4, R * S * 0.02);

      const setColor = (i: number, sp: number) => balls.setColorAt(i, viridis(0.15 + 0.85 * Math.min(1, sp)));
      const seedP = (i: number) => {
        rho[i] = R * (0.45 + 0.53 * Math.sqrt(Math.random()));
        zc[i] = (Math.random() - 0.5) * L * 0.94;
        phi[i] = Math.PI + Math.random() * Math.PI;
        flying[i] = 0; tFly[i] = 0; risen[i] = 0; spin[i] = Math.random() * 6.28;
        setColor(i, 0.3);
      };
      for (let i = 0; i < N; i++) seedP(i);

      const writeInstance = (i: number) => {
        spin[i] += 0.12 * speedRef.current;
        _e.set(spin[i], spin[i] * 0.7, 0); _q.setFromEuler(_e); _sc.setScalar(ballR * ballSizeRef.current);
        _m.compose(_v.set(px[i], py[i], pz2[i]), _q, _sc); balls.setMatrixAt(i, _m);
      };
      step = (d: number) => {
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
      for (let i = 0; i < N; i++) { const pm = ((phi[i] % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI); px[i] = Math.cos(pm) * rho[i] * S; py[i] = Math.sin(pm) * rho[i] * S; pz2[i] = zc[i] * S; writeInstance(i); }
      balls.instanceMatrix.needsUpdate = true;
      if (balls.instanceColor) balls.instanceColor.needsUpdate = true;
      scrubRef.current = () => {};
      renderStatic = () => renderer.render(scene, cam);
    }

    // Camera: keep the user's point of view WITHIN a mill, but refit when the MILL ITSELF changes.
    //
    // The POV was persisted unconditionally, so selecting a different case kept the previous mill's
    // framing. Switching from K-SAG (large diameter, short) to K-ROD (long, narrow) left the rod mill
    // rendered small and off-centre inside a stage sized for the SAG, which reads exactly as "it still
    // shows the same mill" and makes the case selector look broken even though the engine had switched.
    // The POV is only worth preserving while the thing being viewed is the same thing.
    const geoSig = `${op.diameterM}x${op.lengthM}x${op.millType}`;
    if (geoSigRef.current !== geoSig) { viewRef.current = null; geoSigRef.current = geoSig; }
    if (viewRef.current) { cam.position.copy(viewRef.current.pos); controls.target.copy(viewRef.current.target); cam.updateProjectionMatrix(); controls.update(); }
    else fitCamera(cam, controls, box);
    resetViewRef.current = () => { viewRef.current = null; fitCamera(cam, controls, box); renderStatic(); };

    stepRef.current = step;
    renderStatic();
    controls.addEventListener('change', () => { viewRef.current = { pos: cam.position.clone(), target: controls.target.clone() }; renderer.render(scene, cam); });

    const ro = new ResizeObserver(() => { const w = el.clientWidth || W; renderer.setSize(w, H); cam.aspect = w / H; cam.updateProjectionMatrix(); renderer.render(scene, cam); });
    ro.observe(el);

    return () => {
      stepRef.current = null; resetViewRef.current = () => {}; scrubRef.current = () => {}; ro.disconnect();
      viewRef.current = { pos: cam.position.clone(), target: controls.target.clone() };
      controls.dispose();
      for (const d of disposables) d.dispose();
      renderer.dispose();
      el.removeChild(renderer.domElement);
    };
  }, [op, theme, height, mode, dem]);

  const isDem = mode === 'dem' && dem != null;
  return (
    <div className="cc-canvas-wrap">
      <div ref={ref} style={{ width: '100%', height: height > 0 ? height : '100%' }} />
      <div className="cc-canvas-banner">
        <button type="button" className="btn" onClick={() => (viz.playing ? viz.pause() : viz.play())}>{viz.playing ? (es ? 'Pausar' : 'Pause') : (es ? 'Reproducir' : 'Play')}</button>
        {demEnabled && (
          <span className="cc-seg" role="group" aria-label={es ? 'fuente de la carga' : 'charge source'}>
            <button type="button" className={`chip ${mode === 'dem' ? 'on' : ''}`} disabled={!dem} onClick={() => setMode('dem')}>DEM</button>
            <button type="button" className={`chip ${mode === 'davis' ? 'on' : ''}`} onClick={() => setMode('davis')}>{es ? 'Davis (cinemática)' : 'Davis (kinematic)'}</button>
          </span>
        )}
        <span>{isDem
          ? (es ? `DEM real horneado (milldem), ${dem!.header.N * dem!.header.tiles} partículas replicadas, arrastrar para orbitar` : `Real baked DEM (milldem), ${dem!.header.N * dem!.header.tiles} replayed particles, drag to orbit`)
          : (es ? 'Carga cinemática (trayectorias de Davis), no es un solve DEM' : 'Kinematic charge (Davis trajectories), not a DEM solve')}</span>
      </div>
      {demMiss && demEnabled && <div className="cc-cap cc-muted" style={{ padding: '0 0.6rem' }}>{es ? 'DEM horneado no disponible para este caso; mostrando la vista cinemática de Davis.' : 'No baked DEM for this case; showing the Davis kinematic view.'}</div>}
      <div className="cc-viz-controls">
        <label>{es ? 'velocidad' : 'speed'}
          <input type="range" min={0.05} max={4} step={0.05} value={animSpeed} onChange={(e) => setAnimSpeed(+e.target.value)} />
          <b>{animSpeed.toFixed(2)}x</b>
        </label>
        <label>{es ? 'tamaño de bola' : 'ball size'}
          <input type="range" min={0.5} max={2.5} step={0.1} value={ballSize} onChange={(e) => setBallSize(+e.target.value)} />
          <b>{ballSize.toFixed(1)}x</b>
        </label>
        {isDem && (
          <label>{es ? 'cuadro' : 'frame'}
            <input type="range" min={0} max={dem!.header.F - 1} step={1} value={frameIdx}
              onFocus={() => viz.pause()} onChange={(e) => { const f = +e.target.value; setFrameIdx(f); scrubRef.current(f); }} />
            <b>{frameIdx + 1}/{dem!.header.F}</b>
          </label>
        )}
        <button type="button" className="btn" onClick={() => resetViewRef.current()}>{es ? 'Restablecer vista' : 'Reset view'}</button>
      </div>
    </div>
  );
}
