import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Tabs, useShellLang } from '@fasl-work/caos-app-shell';
import { CASES, caseById, evaluate, MILL_PRESETS, recommendPhiCForRegime, solvePhiCForCapacity, validateMill, MILL_TYPES, type MillInput, type MillType, type Operating, type Regime } from '../mill/index.ts';
import { runOod, runSurrogate } from '../lib/ort.ts';
import { loadLearned } from '../lib/artifacts.ts';
import { Mill3D } from '../viz/Mill3D.tsx';
import { TrajectoryDiagram } from '../viz/TrajectoryDiagram.tsx';
import { RegimeMap } from '../viz/RegimeMap.tsx';
import { PowerChart } from '../viz/PowerChart.tsx';
import { ComminutionMap } from '../viz/ComminutionMap.tsx';
import { RealValidation } from '../viz/RealValidation.tsx';
import { REAL_MILLS, realMillToOperating } from '../mill/realmills.ts';
import { predictionFor } from '../mill/realpower.ts';
import { BondCurve } from '../viz/BondCurve.tsx';
import { PanelBoundary } from '../viz/PanelBoundary.tsx';
import { ChargeShapeOverlay } from '../viz/ChargeShapeOverlay.tsx';
import { PowerFieldHeatmap } from '../viz/PowerFieldHeatmap.tsx';
import { fetchDemOutline, fetchDemPower, fetchDemPowerGrid, type DemOutline, type DemPower, type DemPowerGrid } from '../lib/demframes.ts';

const CATS = ['mill type (the machine)', 'speed sweep (the regime transition)', 'fill / charge regime', 'control (analytic anchor)'];
const CAT_ES: Record<string, string> = {
  'mill type (the machine)': 'tipo de molino (la máquina)',
  'speed sweep (the regime transition)': 'barrido de velocidad (la transición de régimen)',
  'fill / charge regime': 'llenado / régimen de carga',
  'control (analytic anchor)': 'control (ancla analítica)',
};
const MILLS: MillType[] = ['ball', 'sag', 'rod', 'ag'];
const kw = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(2)} MW` : `${v.toFixed(0)} kW`);


/** Thirteen sibling tabs is a list, not an information architecture: it makes the user read every
 *  label to find one view, and it is what pushed the tab bar past the width of the screen. The views
 *  group naturally into five questions a person actually asks, and the sub-tab row only appears for
 *  the group in hand. */
const TAB_GROUPS: { id: string; en: string; es: string; members: string[] }[] = [
  { id: 'motion',   en: 'Charge motion', es: 'Movimiento',  members: ['charge3d', 'chargeshape', 'traj', 'regime'] },
  { id: 'power',    en: 'Power',         es: 'Potencia',    members: ['power', 'field', 'comminution', 'gauges'] },
  { id: 'learned',  en: 'Learned',       es: 'Aprendido',   members: ['whatif', 'anomaly', 'sens'] },
  { id: 'validate', en: 'Validation',    es: 'Validacion',  members: ['realval'] },
  { id: 'custom',   en: 'Custom mill',   es: 'Molino propio', members: ['custom'] },
];

export default function Tool() {
  const es = useShellLang() === 'es';
  const [source, setSource] = useState<'synthetic' | 'real'>('synthetic');
  const [caseId, setCaseId] = useState('K-BALL');
  const [tabGroup, setTabGroup] = useState('motion');
  const [railSection, setRailSection] = useState<'case' | 'mill'>('case');
  const [realMillId, setRealMillId] = useState(REAL_MILLS[0].id);
  const realMill = useMemo(() => REAL_MILLS.find((m) => m.id === realMillId)!, [realMillId]);
  const theCase = useMemo(() => caseById(caseId), [caseId]);
  const [op, setOp] = useState<Operating>(theCase.op);
  // In synthetic mode op follows the picked case; in real mode it follows the picked real mill (all tools then run
  // on the real survey point). Editing sliders is a live what-if from that starting point.
  useEffect(() => {
    if (source === 'synthetic') { setOp(theCase.op); setInvTph(null); }
    else { setOp(realMillToOperating(realMill)); setInvTph(null); }
  }, [source, theCase, realMill]);

  const r = useMemo(() => evaluate(op), [op]);
  const [surr, setSurr] = useState<{ powerKw: number; fracCentrifuging: number } | null>(null);
  const [surrPending, setSurrPending] = useState(true);
  const [ood, setOod] = useState<number | null>(null);
  const [oodThr, setOodThr] = useState<number | null>(null);
  const [invRegime, setInvRegime] = useState<Regime>('cataracting');   // inverse: target regime → recommended φc
  const [invTph, setInvTph] = useState<number | null>(null);           // inverse: target throughput → recommended φc
  // bring-your-own-mill: a custom descriptor validated live by CONTRACT 1 (defaults deliberately ≠ any preset)
  const [custom, setCustom] = useState<MillInput>({ mill_type: 'ball', diameter_m: 5.0, length_m: 7.0, fill: 0.32, phi_c: 0.74, ball_top_mm: 75, charge_density: 4.6 });

  useEffect(() => { loadLearned().then((l) => setOodThr(l.ood?.thr ?? null)).catch(() => setOodThr(null)); }, []);

  // the baked DEM lane (milldem thin-3D slab). Keyed by the canonical case (synthetic mode); the Davis kinematic view
  // stays live for edited/real points. Missing bakes degrade gracefully to Davis + a note.
  const [demPower, setDemPower] = useState<DemPower | null>(null);
  const [demOutline, setDemOutline] = useState<DemOutline | null>(null);
  const [demGrid, setDemGrid] = useState<DemPowerGrid | null>(null);
  const base = import.meta.env.BASE_URL || '/';
  const demOn = source === 'synthetic';
  useEffect(() => { fetchDemPowerGrid(base).then(setDemGrid).catch(() => setDemGrid(null)); }, [base]);
  useEffect(() => {
    if (!demOn) { setDemPower(null); setDemOutline(null); return; }
    let cancel = false;
    fetchDemPower(caseId, base).then((d) => { if (!cancel) setDemPower(d); }).catch(() => { if (!cancel) setDemPower(null); });
    fetchDemOutline(caseId, base).then((d) => { if (!cancel) setDemOutline(d); }).catch(() => { if (!cancel) setDemOutline(null); });
    return () => { cancel = true; };
  }, [caseId, demOn, base]);

  useEffect(() => {
    let cancel = false;
    setSurrPending(true);
    runSurrogate(op).then((s) => { if (!cancel) { setSurr(s); setSurrPending(s === null); } });
    runOod(op).then((m) => { if (!cancel) setOod(m); });
    return () => { cancel = true; };
  }, [op]);

  const set = (k: keyof Operating, v: number) => setOp((o) => ({ ...o, [k]: v }));
  const Kpi = ({ label, value }: { label: string; value: string }) => (
    <div className="cc-kpi"><div className="cc-kpi-v">{value}</div><div className="cc-kpi-l">{label}</div></div>
  );

  // sensitivity sweep: vary one control about the operating point
  const sweep = (k: keyof Operating, lo: number, hi: number) =>
    [lo, (lo + hi) / 2, hi].map((v) => ({ v, p: evaluate({ ...op, [k]: v }) }));

  const tabs = [
    ...(source === 'real' ? [{
      id: 'realval', label: es ? 'Validación real' : 'Real validation',
      content: <RealValidation mill={realMill} es={es} />,
    }] : []),
    {
      id: 'charge3d', label: es ? 'Carga 3D' : '3D charge',
      content: (
        <div className="cc-vizstack">
          <div className="cc-plot-t">{es ? 'El molino girando con la carga. DEM: dinámica de partículas real horneada (milldem, contacto+fricción+cadenas de fuerza), la losa se replica a lo largo del eje. Davis: la vista cinemática analítica en vivo. Arrastrar para orbitar.' : 'The rotating mill with the charge. DEM: real baked particle dynamics (milldem, contact+friction+force chains), the slab is tiled along the axis. Davis: the live analytic kinematic view. Drag to orbit.'}</div>
          <Mill3D op={op} caseId={caseId} demEnabled={demOn} />
          <div className="cc-kpis">
            <Kpi label={es ? 'régimen' : 'regime'} value={r.regime} />
            <Kpi label="φc" value={op.phiC.toFixed(2)} />
            <Kpi label={es ? 'potencia (Hogg-F.)' : 'power (Hogg-F.)'} value={kw(r.phfKw)} />
            {demPower ? <Kpi label={es ? 'potencia DEM' : 'DEM power'} value={kw(demPower.net_power_kw)} />
              : <Kpi label={es ? '% centrifugando' : '% centrifuging'} value={`${(r.fracCentrifuging * 100).toFixed(0)}%`} />}
          </div>
          {demPower && <p className="cc-note">{es
            ? `DEM (milldem, losa-3D delgada) para este caso: ${kw(demPower.net_power_kw)} sobre ${demPower.n_particles} partículas; Hogg-Fuerstenau ${kw(r.phfKw)} (razón ${(demPower.net_power_kw / Math.max(1, r.phfKw)).toFixed(2)}). El DEM está horneado en el punto canónico del caso; editar los deslizadores usa la vista cinemática de Davis en vivo.`
            : `DEM (milldem, thin-3D slab) for this case: ${kw(demPower.net_power_kw)} over ${demPower.n_particles} particles; Hogg-Fuerstenau ${kw(r.phfKw)} (ratio ${(demPower.net_power_kw / Math.max(1, r.phfKw)).toFixed(2)}). The DEM is baked at the case's canonical point; editing the sliders uses the live Davis kinematic view.`}</p>}
        </div>
      ),
    },
    ...(demOn ? [{
      id: 'chargeshape', label: es ? 'Forma de carga (DEM)' : 'Charge shape (DEM)',
      content: (
        <div className="cc-vizstack">
          <div className="cc-plot-t">{es ? 'Sección transversal: la ocupación media del DEM horneado (densidad viridis en (r, θ)) con los ángulos analíticos de pie/hombro marcados. Donde el cuerpo DEM y la teoría de una partícula divergen es donde el DEM aporta.' : 'Cross-section: the time-averaged occupancy of the baked DEM (viridis density in (r, θ)) with the analytic toe/shoulder angles marked. Where the DEM body and single-particle theory diverge is where DEM earns its keep.'}</div>
          <ChargeShapeOverlay outline={demOutline} analyticToeDeg={r.toeDeg} analyticShoulderDeg={r.shoulderDeg} />
          <div className="cc-kpis">
            <Kpi label={es ? 'hombro DEM' : 'DEM shoulder'} value={demOutline ? `${demOutline.shoulder_deg.toFixed(0)}°` : 'n/a'} />
            <Kpi label={es ? 'pie DEM' : 'DEM toe'} value={demOutline ? `${demOutline.toe_deg.toFixed(0)}°` : 'n/a'} />
            <Kpi label={es ? 'hombro (analítico)' : 'shoulder (analytic)'} value={`${r.shoulderDeg.toFixed(0)}°`} />
            <Kpi label={es ? 'pie (analítico)' : 'toe (analytic)'} value={`${r.toeDeg.toFixed(0)}°`} />
          </div>
        </div>
      ),
    }] : []),
    {
      id: 'traj', label: es ? 'Trayectorias' : 'Trajectories',
      content: (
        <div className="cc-vizstack">
          <div className="cc-plot-t">{es ? 'Corte transversal: el punto de partida de cada capa radial (cos α = φc²·r/R) + la parábola de cataract. Las capas externas se lanzan más alto → el abanico.' : 'Cross-section: the departure point of each radial shell (cos α = φc²·r/R) + the cataract parabola. The outer shells are thrown highest → the fan.'}</div>
          <TrajectoryDiagram result={r} diameterM={op.diameterM} />
          <div className="cc-kpis">
            <Kpi label={es ? 'hombro (shoulder)' : 'shoulder'} value={`${r.shoulderDeg.toFixed(0)}°`} />
            <Kpi label={es ? 'pie (toe)' : 'toe'} value={`${r.toeDeg.toFixed(0)}°`} />
            <Kpi label="Nc" value={`${r.ncRpm.toFixed(1)} rpm`} />
            <Kpi label="N" value={`${r.nRpm.toFixed(1)} rpm`} />
          </div>
        </div>
      ),
    },
    {
      id: 'regime', label: es ? 'Mapa de régimen' : 'Regime map',
      content: (
        <div className="cc-vizstack">
          <div className="cc-plot-t">{es ? 'El mapa φc × J con las bandas: slumping → cascading → cataracting → centrifuging. El marcador es el punto de operación.' : 'The φc × J map with the bands: slumping → cascading → cataracting → centrifuging. The marker is the operating point.'}</div>
          <RegimeMap phiC={op.phiC} fill={op.fill} />
          <p className="cc-note">{es
            ? `Régimen actual: ${r.regime}. Los molinos reales operan φc ≈ 0.65–0.82. Sobre ~0.85 el cataract puede impactar el revestimiento (sobre-velocidad).`
            : `Current regime: ${r.regime}. Real mills run φc ≈ 0.65–0.82. Above ~0.85 the cataract can impact the liner (over-speed).`}</p>
        </div>
      ),
    },
    {
      id: 'power', label: es ? 'Potencia' : 'Power draw',
      content: (
        <div className="cc-vizstack">
          <div className="cc-plot-t">{es ? 'Potencia neta vs φc: dos modelos independientes, Hogg-Fuerstenau (cuerpo rígido) y el C-model de Morrell (1996) (carga como continuo, sin calibrar). La banda roja = centrifuging (φc ≥ 1); la línea = el φc actual.' : 'Net power vs φc: two independent models, Hogg-Fuerstenau (rigid body) and the Morrell (1996) C-model (charge as a continuum, uncalibrated). The red band = centrifuging (φc ≥ 1); the line = the current φc.'}</div>
          <PowerChart curve={r.powerCurve} phiC={op.phiC} />
          <div className="cc-kpis">
            <Kpi label="Hogg-Fuerstenau" value={kw(r.phfKw)} />
            <Kpi label={es ? 'Morrell C-model (neto)' : 'Morrell C-model (net)'} value={kw(r.pCModelNetKw)} />
            <Kpi label={es ? 'masa de carga' : 'charge mass'} value={`${r.chargeMassT.toFixed(0)} t`} />
            <Kpi label={es ? 'energía Bond' : 'Bond duty'} value={`${r.bondWKwhT.toFixed(1)} kWh/t`} />
          </div>
          <details className="cc-advanced">
            <summary>{es ? 'Convención de densidad de carga del C-model (avanzado)' : 'C-model charge-density convention (advanced)'}</summary>
            <p className="cc-note">{es
              ? 'El residual del C-model (~10%) proviene de la convención de densidad de carga de Napier-Munn, no de una ecuación faltante. Estos controles exponen esa convención: porosidad E, llenado de huecos con pulpa U, sólidos de pulpa S.'
              : 'The C-model residual (~10%) comes from the Napier-Munn charge-density convention, not a missing equation. These controls expose that convention: bed porosity E, void-slurry fill U, slurry solids S.'}</p>
            <div className="cc-ctl-grid">
              <label>E {(op.voidageE ?? 0.4).toFixed(2)}
                <input type="range" min={0.30} max={0.50} step={0.01} value={op.voidageE ?? 0.4} disabled={!!op.dynamicVoidage}
                  onChange={(e) => set('voidageE', +e.target.value)} /></label>
              <label>U {(op.voidFillU ?? 1.0).toFixed(2)}
                <input type="range" min={0} max={1} step={0.05} value={op.voidFillU ?? 1.0}
                  onChange={(e) => set('voidFillU', +e.target.value)} /></label>
              <label>S {(op.slurrySolidsS ?? 0.5).toFixed(2)}
                <input type="range" min={0.3} max={0.75} step={0.01} value={op.slurrySolidsS ?? 0.5}
                  onChange={(e) => set('slurrySolidsS', +e.target.value)} /></label>
            </div>
            <label className="cc-check"><input type="checkbox" checked={!!op.dynamicVoidage}
              onChange={(e) => setOp((o) => ({ ...o, dynamicVoidage: e.target.checked }))} />
              {es ? 'Voidage dinámico (Golpayegani y Rezai 2023)' : 'Dynamic voidage (Golpayegani & Rezai 2023)'}</label>
          </details>
        </div>
      ),
    },
    {
      id: 'field', label: es ? 'Campo de potencia' : 'Power field',
      content: (
        <div className="cc-vizstack">
          <div className="cc-plot-t">{es ? 'Campo de potencia neta sobre el plano φc × J. Capas: DEM (grilla milldem horneada, interpolada y escalada al molino por la razón HF), Hogg-Fuerstenau y C-model (en vivo, exactos), y la discrepancia |DEM − HF| como proxy de incertidumbre entre modelos. Clic para cargar (φc, J) en el motor.' : 'Net-power field over the φc × J plane. Layers: DEM (baked milldem grid, interpolated and scaled to the mill by the HF ratio), Hogg-Fuerstenau and C-model (live, exact), and the |DEM − HF| disagreement as a cross-model uncertainty proxy. Click to load (φc, J) into the engine.'}</div>
          <PowerFieldHeatmap op={op} demGrid={demGrid} onLoad={(phiC, fill) => setOp((o) => ({ ...o, phiC, fill }))} />
          <div className="cc-kpis">
            <Kpi label="φc" value={op.phiC.toFixed(2)} />
            <Kpi label={es ? 'llenado J' : 'fill J'} value={`${(op.fill * 100).toFixed(0)}%`} />
            <Kpi label={es ? 'Hogg-F. aquí' : 'Hogg-F. here'} value={kw(r.phfKw)} />
            <Kpi label={es ? 'grilla DEM' : 'DEM grid'} value={demGrid ? `${demGrid.phi_c_nodes.length}×${demGrid.fill_nodes.length}` : 'n/a'} />
          </div>
        </div>
      ),
    },
    {
      id: 'comminution', label: es ? 'Conminución' : 'Comminution',
      content: (() => {
        const wBond = r.bondWKwhT;                                   // Bond specific energy [kWh/t] (ore + F80->P80)
        const capacity = wBond > 0 ? r.phfKw / wBond : 0;            // power-limited throughput [t/h] = P_net / W
        const margin = capacity - op.tph;                            // headroom over the target throughput
        return (
          <div className="cc-vizstack">
            <div className="cc-plot-t">{es
              ? 'Conminución: la ley de Bond fija la energía específica W para moler F80→P80; el motor fija la potencia neta. Su cociente P/W es la capacidad de molienda [t/h]. El mapa muestra esa capacidad sobre φc×J. El marcador es el punto de operación.'
              : 'Comminution: Bond’s law sets the specific energy W to grind F80→P80; the engine sets the net power. Their ratio P/W is the grinding capacity [t/h]. The map shows that capacity over φc×J. The marker is the operating point.'}</div>
            <ComminutionMap op={op} />
            <div className="cc-cap cc-muted" style={{ display: 'flex', gap: '1.1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              <span><span style={{ display: 'inline-block', width: 10, height: 10, background: 'rgb(232,202,64)', marginRight: 4 }} />{es ? 'mayor capacidad' : 'higher capacity'}</span>
              <span><span style={{ display: 'inline-block', width: 10, height: 10, background: 'rgba(248,81,73,0.6)', marginRight: 4 }} />{es ? 'bajo el objetivo (no rinde la tarea)' : 'below target (cannot meet the duty)'}</span>
              <span><span style={{ display: 'inline-block', width: 10, height: 10, background: 'rgb(150,154,164)', marginRight: 4 }} />{es ? 'centrifugando (molienda colapsa)' : 'centrifuging (grinding collapses)'}</span>
            </div>
            <div className="cc-kpis">
              <Kpi label={es ? 'energía Bond W' : 'Bond duty W'} value={`${wBond.toFixed(1)} kWh/t`} />
              <Kpi label={es ? 'potencia neta' : 'net power'} value={kw(r.phfKw)} />
              <Kpi label={es ? 'capacidad (P/W)' : 'capacity (P/W)'} value={`${capacity.toFixed(0)} t/h`} />
              <Kpi label={es ? `margen vs objetivo ${op.tph} t/h` : `margin vs target ${op.tph} t/h`} value={`${margin >= 0 ? '+' : ''}${margin.toFixed(0)} t/h`} />
            </div>
            <div className="cc-kpis">
              <Kpi label={es ? 'energía SMC W_T (Morrell 2004)' : 'SMC W_T (Morrell 2004)'} value={`${r.smcWkWhT.toFixed(1)} kWh/t`} />
              <Kpi label={es ? 'gross C-model' : 'C-model gross'} value={kw(r.pCModelGrossKw)} />
              <Kpi label={es ? 'capacidad SMC (gross/W_T)' : 'SMC capacity (gross/W_T)'} value={`${r.smcTphFromCModel.toFixed(0)} t/h`} />
              <Kpi label={es ? 'grind P80' : 'grind P80'} value={`${op.prodP80um.toFixed(0)} µm`} />
            </div>
            <p className="cc-note">{es
              ? `El modelo de energía específica de Morrell (2004), el test SMC, es un modelo aparte de Bond: la energía del circuito W_T = ${r.smcWkWhT.toFixed(1)} kWh/t sobre las etapas chancado + SAG + bolas, con el exponente que varía con el tamaño f(x) = −(0.295 + x/10⁶). Compuesto con la potencia bruta del C-model da una capacidad de ${r.smcTphFromCModel.toFixed(0)} t/h. Los índices Mia/Mib aquí se escalan del índice de Bond de la mena; un test SMC real usaría los medidos.`
              : `Morrell\'s (2004) specific-energy model, the SMC test, is a separate model from Bond: the circuit energy W_T = ${r.smcWkWhT.toFixed(1)} kWh/t over the crush + SAG + ball stages, with the size-dependent exponent f(x) = −(0.295 + x/10⁶). Composed with the C-model gross power it gives a throughput of ${r.smcTphFromCModel.toFixed(0)} t/h. The Mia/Mib indices here scale off the ore\'s Bond work index; a real SMC test would use measured values.`}</p>
            <p className="cc-note">{es
              ? `Balance: capacidad ${capacity.toFixed(0)} t/h vs objetivo ${op.tph} t/h → ${margin >= 0 ? `${margin.toFixed(0)} t/h de holgura (el molino rinde la tarea)` : `déficit de ${(-margin).toFixed(0)} t/h (subir φc/J o moler más grueso)`}. A φc alto la carga se centrifuga (se pega a la pared, sin impacto) y la molienda se detiene, esos puntos van en gris (el modelo de torque no se atenúa ahí, por eso no se muestra su P/W como capacidad).`
              : `Balance: capacity ${capacity.toFixed(0)} t/h vs target ${op.tph} t/h → ${margin >= 0 ? `${margin.toFixed(0)} t/h of headroom (the mill meets the duty)` : `${(-margin).toFixed(0)} t/h short (raise φc/J or coarsen the product)`}. At high φc the charge centrifuges (pins to the shell, no impact) and grinding stops, those points are greyed (the torque model is not tapered there, so its P/W is not shown as capacity).`}</p>
            <div className="cc-plot-t">{es ? 'La ley de Bond: la energía específica sube al moler más fino. La línea es la energía disponible (P/tph); donde corta la curva está el P80 más fino alcanzable.' : 'Bond’s law: the specific energy rises as the product is ground finer. The line is the available energy (P/tph); where it crosses the curve is the finest P80 achievable.'}</div>
            <BondCurve op={op} netPowerKw={r.phfKw} es={es} />
          </div>
        );
      })(),
    },
    {
      id: 'gauges', label: es ? 'Indicadores' : 'Gauges',
      content: (
        <div className="cc-vizstack">
          <div className="cc-kpis">
            <Kpi label={es ? 'velocidad crítica' : 'critical speed'} value={`${r.ncRpm.toFixed(1)} rpm`} />
            <Kpi label={es ? 'velocidad' : 'speed'} value={`${r.nRpm.toFixed(1)} rpm (φc ${op.phiC.toFixed(2)})`} />
            <Kpi label={es ? 'régimen' : 'regime'} value={r.regime} />
            <Kpi label={es ? '% centrifugando' : '% centrifuging'} value={`${(r.fracCentrifuging * 100).toFixed(0)}%`} />
            <Kpi label={es ? 'potencia neta' : 'net power'} value={kw(r.phfKw)} />
            <Kpi label={es ? 'potencia/tonelada' : 'power/tonne'} value={`${(r.phfKw / Math.max(1, r.chargeMassT)).toFixed(1)} kW/t`} />
            <Kpi label={es ? 'masa de carga' : 'charge mass'} value={`${r.chargeMassT.toFixed(0)} t`} />
            <Kpi label="shoulder / toe" value={`${r.shoulderDeg.toFixed(0)}° / ${r.toeDeg.toFixed(0)}°`} />
          </div>
          {r.flags.length > 0 && <p className="cc-note" style={{ color: 'var(--color-warn)' }}>{r.flags.join(' · ')}</p>}
        </div>
      ),
    },
    {
      id: 'sens', label: es ? 'Sensibilidad' : 'Sensitivity',
      content: (
        <div className="cc-vizstack">
          <table className="cmp-table">
            <thead><tr><th>{es ? 'parámetro' : 'parameter'}</th><th>−</th><th>{es ? 'base' : 'base'}</th><th>+</th><th>{es ? 'potencia (−/base/+)' : 'power (−/base/+)'}</th></tr></thead>
            <tbody>
              {[
                { k: 'phiC' as const, lo: 0.55, hi: 0.95, fmt: (v: number) => v.toFixed(2) },
                { k: 'fill' as const, lo: 0.2, hi: 0.45, fmt: (v: number) => `${(v * 100).toFixed(0)}%` },
                { k: 'diameterM' as const, lo: op.diameterM * 0.7, hi: op.diameterM * 1.3, fmt: (v: number) => `${v.toFixed(1)} m` },
              ].map(({ k, lo, hi, fmt }) => {
                const s = sweep(k, lo, hi);
                return (
                  <tr key={k}>
                    <td>{k === 'phiC' ? 'φc' : k === 'fill' ? (es ? 'llenado J' : 'fill J') : (es ? 'diámetro' : 'diameter')}</td>
                    <td>{fmt(lo)}</td><td>{fmt((lo + hi) / 2)}</td><td>{fmt(hi)}</td>
                    <td>{kw(s[0].p.phfKw)} / {kw(s[1].p.phfKw)} / {kw(s[2].p.phfKw)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="cc-note">{es ? 'Cada fila re-evalúa el motor exacto con un shock al parámetro, cuantifica cómo se mueve la potencia.' : 'Each row re-evaluates the exact engine with a shock to the parameter, it quantifies how the power moves.'}</p>
        </div>
      ),
    },
    {
      id: 'whatif', label: es ? 'What-if (ONNX)' : 'What-if (ONNX)',
      content: (() => {
        // inverse recommender (exact engine; the surrogate is not used here). Power is monotone in φc, so a target
        // throughput bisects to a φc; the regime bands give a representative φc per motion regime.
        const curCap = r.bondWKwhT > 0 ? r.phfKw / r.bondWKwhT : 0;
        const cap = solvePhiCForCapacity(op, invTph ?? Math.round(curCap));
        const reg = recommendPhiCForRegime(op, invRegime);
        const tphLo = Math.max(0, Math.floor(cap.minTph / 10) * 10);
        const tphHi = Math.max(tphLo + 10, Math.ceil(cap.maxTph / 10) * 10);
        const tgt = invTph ?? Math.round(curCap);
        const regimes: Regime[] = ['cascading', 'cataracting', 'centrifuging'];
        return (
          <div className="cc-vizstack">
            <div className="cc-plot-t">{es ? 'El surrogate de potencia (ONNX) emula el motor analítico; aquí se ejecuta en vivo junto al exacto, con su error a la vista. Su uso en barridos masivos es una extensión documentada, aún no publicada.' : 'The power surrogate (ONNX) emulates the analytic engine; here it runs live next to the exact engine, with its error in view. Its bulk-sweep use is a documented extension, not yet shipped.'}</div>
            {surrPending ? (
              <div className="cc-pending">
                <strong>{es ? 'Surrogate: no cargado' : 'Surrogate: not loaded'}</strong>
                <p>{es ? 'El surrogate entrenado viene en este build (torch → ONNX) pero no se pudo cargar en esta sesión. El motor analítico exacto se ejecuta en vivo mientras tanto.' : 'The trained surrogate ships with this build (torch → ONNX) but could not be loaded in this session. The exact analytic engine runs live meanwhile.'}</p>
              </div>
            ) : (
              <>
                <div className="cc-kpis">
                  <Kpi label={es ? 'surrogate (potencia)' : 'surrogate (power)'} value={surr ? kw(surr.powerKw) : 'n/a'} />
                  <Kpi label={es ? 'exacto (Hogg-F.)' : 'exact (Hogg-F.)'} value={kw(r.phfKw)} />
                  <Kpi label={es ? 'error' : 'error'} value={surr ? `${(Math.abs(surr.powerKw - r.phfKw) / Math.max(1, r.phfKw) * 100).toFixed(1)}%` : 'n/a'} />
                </div>
                <p className="cc-note">{es ? 'El motor analítico exacto es la autoridad; el surrogate es el carril aprendido medido (su error vs el exacto se muestra en vivo); ninguna funcionalidad publicada lo consume aún en masa.' : 'The exact analytic engine is the authority; the surrogate is the measured learned lane (its error vs the exact engine is shown live); no shipped feature consumes it in bulk yet.'}</p>
              </>
            )}

            <div className="cc-card" style={{ marginTop: '0.4rem' }}>
              <div className="cc-card-t">{es ? 'Inverso: objetivo → φc recomendado (motor exacto)' : 'Inverse: target → recommended φc (exact engine)'}</div>
              <p className="cc-note">{es ? 'En lugar de leer la salida de un φc dado, se fija una meta y el motor (monótono en φc) resuelve el φc que la cumple a la geometría D/L/J actual.' : 'Instead of reading the output of a given φc, set a goal and the engine (monotone in φc) solves the φc that meets it at the current D/L/J geometry.'}</p>

              {/* by motion regime */}
              <div className="cc-cap cc-muted">{es ? 'por régimen de movimiento' : 'by motion regime'}</div>
              <div className="cc-chips">
                {regimes.map((rg) => (
                  <button key={rg} className={`chip ${invRegime === rg ? 'on' : ''}`} onClick={() => setInvRegime(rg)}>{rg}</button>
                ))}
              </div>
              {reg.phiCRec != null ? (
                <p className="cc-note">
                  {es ? '→ φc recomendado' : '→ recommended φc'} <b>{reg.phiCRec.toFixed(2)}</b>
                  {reg.phiCLo != null && reg.phiCHi != null && ` (${es ? 'banda' : 'band'} ${reg.phiCLo.toFixed(2)}–${reg.phiCHi.toFixed(2)})`}
                  {!reg.operational && `, ${es ? 'régimen no operativo (la molienda colapsa); es el límite a evitar' : 'non-operational regime (grinding collapses); the limit to avoid'}`}
                  {' '}<button className="chip" onClick={() => set('phiC', reg.phiCRec!)}>{es ? 'aplicar' : 'apply'}</button>
                </p>
              ) : <p className="cc-note">{es ? `el régimen ${invRegime} no es alcanzable a esta geometría` : `the ${invRegime} regime is not reachable at this geometry`}</p>}

              {/* by target throughput */}
              <div className="cc-cap cc-muted" style={{ marginTop: '0.5rem' }}>{es ? 'por capacidad objetivo' : 'by target throughput'}</div>
              <label className="cc-ctl">{es ? 'objetivo' : 'target'}: {tgt} t/h
                <input className="range" type="range" min={tphLo} max={tphHi} step={Math.max(1, Math.round((tphHi - tphLo) / 100))} value={tgt} onChange={(e) => setInvTph(+e.target.value)} />
              </label>
              {tgt > cap.maxTph + 0.5 ? (
                <p className="cc-note" style={{ color: 'var(--color-warn)' }}>
                  {es ? `fuera de alcance: el techo es ${cap.maxTph.toFixed(0)} t/h a φc ≈ 1.05, subir D/L/J o moler más grueso` : `out of reach: the ceiling is ${cap.maxTph.toFixed(0)} t/h at φc ≈ 1.05, raise D/L/J or coarsen the product`}
                </p>
              ) : cap.phiC != null ? (
                <p className="cc-note">
                  {es ? '→ φc recomendado' : '→ recommended φc'} <b>{cap.phiC.toFixed(2)}</b> {es ? 'para' : 'for'} {tgt} t/h
                  {tgt <= cap.minTph + 0.5 && ` (${es ? 'la velocidad mínima ya lo supera, capacidad de sobra' : 'min speed already exceeds it, spare capacity'})`}
                  {' '}<button className="chip" onClick={() => set('phiC', cap.phiC!)}>{es ? 'aplicar' : 'apply'}</button>
                </p>
              ) : null}
            </div>
          </div>
        );
      })(),
    },
    {
      id: 'anomaly', label: es ? 'Anomalía (AE)' : 'Anomaly (AE)',
      content: (
        <div className="cc-vizstack">
          <div className="cc-plot-t">{es ? 'El autoencoder OOD marca puntos de operación fuera del envolvente entrenado (sobre-velocidad, casi-centrifugando), el guardia en vivo.' : 'The OOD autoencoder flags operating points outside the trained envelope (over-speed, near-centrifuging), the live guard.'}</div>
          {ood == null ? (
            <div className="cc-pending">
              <strong>{es ? 'Autoencoder OOD: no cargado' : 'OOD autoencoder: not loaded'}</strong>
              <p>{es ? 'El modelo OOD entrenado viene en este build pero no se pudo cargar en esta sesión. Mientras tanto, las banderas de validez del motor (abajo) son el guardia honesto.' : 'The trained OOD model ships with this build but could not be loaded in this session. Meanwhile the engine validity flags (below) are the honest guard.'}</p>
            </div>
          ) : (
            <>
              <div className="cc-kpis">
                <Kpi label={es ? 'puntaje de anomalía' : 'anomaly score'} value={ood.toFixed(2)} />
                {oodThr != null && <Kpi label={es ? 'umbral (p95 in-dist)' : 'threshold (in-dist p95)'} value={oodThr.toFixed(2)} />}
                {oodThr != null && (
                  <Kpi label={es ? 'veredicto' : 'verdict'} value={ood > oodThr ? (es ? 'fuera de envolvente' : 'off-envelope') : (es ? 'en envolvente' : 'in-envelope')} />
                )}
              </div>
              {oodThr != null && (
                <div className={`cc-regime-pill ${ood > oodThr ? 'cc-regime-centrifuging' : 'cc-regime-cascading'}`}>
                  {ood > oodThr
                    ? (es ? 'el punto está fuera del envolvente entrenado, el surrogate está extrapolando' : 'the point is outside the trained envelope, the surrogate is extrapolating')
                    : (es ? 'el punto está dentro del envolvente entrenado' : 'the point is inside the trained envelope')}
                </div>
              )}
            </>
          )}
          {r.flags.length > 0 && <p className="cc-note" style={{ color: 'var(--color-warn)' }}>{r.flags.join(' · ')}</p>}
        </div>
      ),
    },
    {
      id: 'custom', label: es ? 'Molino propio' : 'Custom mill',
      content: (() => {
        // bring-your-own-mill: the CONTRACT-1 gate, live. Validate the descriptor; on accept, run the exact engine on
        // it (carrying the current ore params) and offer to apply it to the whole workbench.
        const cval = validateMill(custom);
        const setC = (k: keyof MillInput, val: number | string) => setCustom((o) => ({ ...o, [k]: val }));
        const asOp = (o: Operating): Operating => ({ ...o, millType: custom.mill_type as MillType, diameterM: custom.diameter_m, lengthM: custom.length_m, fill: custom.fill, phiC: custom.phi_c, ballTopMm: custom.ball_top_mm, chargeDensity: custom.charge_density });
        const preview = cval.accepted ? evaluate(asOp(op)) : null;
        const numField = (k: keyof MillInput, label: string, step: number) => (
          <label className="cc-ctl" style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center', marginRight: '1rem' }}>
            {label} <input type="number" step={step} value={Number.isFinite(custom[k] as number) ? (custom[k] as number) : ''} onChange={(e) => setC(k, e.target.value === '' ? NaN : +e.target.value)} style={{ width: '5.5rem' }} />
          </label>
        );
        return (
          <div className="cc-vizstack">
            <div className="cc-plot-t">{es
              ? 'Molino definido por el usuario: se describe el punto de operación; una comprobación de validez física (la misma que valida los casos) lo acepta o lo rechaza con un motivo y marca advertencias. Si se acepta, el motor exacto se ejecuta sobre el molino y puede aplicarse a todo el workbench.'
              : 'Bring your own mill: describe the operating point; a physical-validity check (the same one that validates the cases) accepts or rejects it with a reason and raises warnings. If accepted, the exact engine runs on the mill and can be applied to the whole workbench.'}</div>
            <div className="cc-card">
              <div className="cc-card-t">{es ? 'El molino' : 'The mill'}</div>
              <div className="cc-chips">
                {MILL_TYPES.map((m) => <button key={m} className={`chip ${custom.mill_type === m ? 'on' : ''}`} onClick={() => setC('mill_type', m)}>{m}</button>)}
              </div>
              <div style={{ marginTop: '0.5rem' }}>
                {numField('diameter_m', es ? 'diámetro D [m]' : 'diameter D [m]', 0.1)}
                {numField('length_m', es ? 'largo L [m]' : 'length L [m]', 0.1)}
                {numField('fill', es ? 'llenado J [0–0.6]' : 'fill J [0–0.6]', 0.01)}
                {numField('phi_c', 'φc [0–1.5]', 0.01)}
                {numField('ball_top_mm', es ? 'medio top [mm]' : 'top media [mm]', 5)}
                {numField('charge_density', es ? 'densidad ρ [t/m³]' : 'density ρ [t/m³]', 0.1)}
              </div>
            </div>

            {cval.accepted ? (
              <div className="cc-regime-pill cc-regime-cascading">{es ? 'Aceptado' : 'Accepted'} ✓{cval.flags.length > 0 ? ` · ${cval.flags.length} ${es ? 'bandera(s)' : 'flag(s)'}` : ''}</div>
            ) : (
              <div className="cc-regime-pill cc-regime-centrifuging">{es ? 'Rechazado' : 'Rejected'} ✗, {cval.reason}</div>
            )}
            {cval.flags.map((f, i) => <p key={i} className="cc-note" style={{ color: 'var(--color-warn)' }}>⚠ {f}</p>)}

            {preview && (
              <>
                <div className="cc-kpis">
                  <Kpi label={es ? 'régimen' : 'regime'} value={preview.regime} />
                  <Kpi label="φc" value={custom.phi_c.toFixed(2)} />
                  <Kpi label={es ? 'potencia neta' : 'net power'} value={kw(preview.phfKw)} />
                  <Kpi label="Nc" value={`${preview.ncRpm.toFixed(1)} rpm`} />
                </div>
                <p className="cc-note">{es
                  ? `El motor exacto sobre el molino: ${preview.regime}, ${kw(preview.phfKw)}. Aplicarlo para ver el 3D, las trayectorias, la potencia y la conminución sobre él (usa el mineral del caso actual).`
                  : `The exact engine on the mill: ${preview.regime}, ${kw(preview.phfKw)}. Apply it to see the 3D, trajectories, power and comminution on it (using the current case’s ore).`}
                  {' '}<button className="chip" onClick={() => setOp((o) => asOp(o))}>{es ? 'aplicar al workbench' : 'apply to workbench'}</button></p>
              </>
            )}
          </div>
        );
      })(),
    },
  ];

  return (
    <div className="page-body cc-layout">
      <aside className="cc-side">
        <Link className="cc-focus-enter" to={`/focus/${caseId}`}>
          <span className="cc-focus-enter-t">{es ? 'Modo enfoque' : 'Focus mode'}</span>
          <span className="cc-focus-enter-d">
            {es ? 'Abrir este escenario a pantalla completa, con DEM en vivo' : 'Open this scenario full screen, with live DEM'}
          </span>
        </Link>
        {/* The rail shows ONE section at a time. Measured at 1280x800 the rail is 566px tall while its
            stacked cards were 801px, so 235px of controls sat below the fold on first paint and a user
            had to scroll a navigation panel before touching anything. A container that cannot show its
            own controls is a sizing failure: size the container, then split the content to fit it. */}
        <div className="cc-railnav" role="tablist" aria-label={es ? 'secciones del panel' : 'panel sections'}>
          <button role="tab" aria-selected={railSection === 'case'} className={railSection === 'case' ? 'on' : ''}
                  onClick={() => setRailSection('case')}>{es ? 'Caso' : 'Case'}</button>
          <button role="tab" aria-selected={railSection === 'mill'} className={railSection === 'mill' ? 'on' : ''}
                  onClick={() => setRailSection('mill')}>{es ? 'Molino' : 'Mill'}</button>
        </div>
        <div className={`cc-railsec ${railSection === 'case' ? '' : 'hide'}`}>
        <div className="cc-card">
          <div className="cc-card-t">{es ? 'Fuente' : 'Source'}</div>
          <div className="cc-chips">
            <button className={`chip ${source === 'synthetic' ? 'on' : ''}`} onClick={() => setSource('synthetic')}>{es ? 'Sintético' : 'Synthetic'}</button>
            <button className={`chip ${source === 'real' ? 'on' : ''}`} onClick={() => setSource('real')}>{es ? 'Molino real' : 'Real mill'}</button>
          </div>
          <div className="cc-cap cc-muted">{source === 'synthetic'
            ? (es ? 'casos sintéticos + deslizadores' : 'synthetic cases + sliders')
            : (es ? '22 molinos industriales con potencia medida; dos modelos (HF calibrado + Morrell) se validan contra ellos' : '22 industrial mills with measured power; two models (HF calibrated + Morrell) are validated against them')}</div>
        </div>
        {source === 'synthetic' ? (
        <div className="cc-card">
          <div className="cc-card-t">{es ? 'Caso' : 'Case'}</div>
          {/* One grouped dropdown, not four blocks of chips. Eleven cases across four categories used
              about twelve vertical rows of the rail, which is what forced the rail to scroll before a
              user had touched a single control. A select with optgroups says the same thing in one row
              and keeps the category structure. */}
          <select className="cc-select" value={caseId} onChange={(e) => setCaseId(e.target.value)}
                  aria-label={es ? 'seleccionar caso' : 'select case'}>
            {CATS.map((cat) => (
              <optgroup key={cat} label={(es ? CAT_ES[cat] : cat).split(' (')[0]}>
                {CASES.filter((cc) => cc.category === cat).map((cc) => (
                  <option key={cc.id} value={cc.id}>{cc.id} - {cc.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
          <div className="cc-cap">{theCase.name}</div>
          <div className="cc-cap cc-muted">{theCase.realOrSynthetic} · {theCase.expectedBand}</div>
        </div>
        ) : (
        <div className="cc-card">
          <div className="cc-card-t">{es ? 'Molino real' : 'Real mill'}</div>
          <div className="cc-chips">
            {REAL_MILLS.map((m) => (
              <button key={m.id} className={`chip ${realMillId === m.id ? 'on' : ''}`} title={m.name} onClick={() => setRealMillId(m.id)}>{m.name.split(' ')[0]}</button>
            ))}
          </div>
          <div className="cc-cap">{realMill.name} · {realMill.diameterM}×{realMill.lengthM} m · {(realMill.pctCritical * 100).toFixed(0)}% crit · J {(realMill.jTotal * 100).toFixed(0)}%</div>
          {(() => { const pr = predictionFor(realMill); return (
            <div className="cc-cap cc-muted">{es ? 'medida' : 'measured'} {(pr.measured / 1000).toFixed(1)} MW · {es ? 'modelo' : 'model'} {(pr.predicted / 1000).toFixed(1)} MW · {pr.errPct >= 0 ? '+' : ''}{pr.errPct.toFixed(0)}% ({realMill.basis})</div>
          ); })()}
          <div className="cc-cap cc-muted" style={{ marginTop: '0.3rem' }}><a href={realMill.url} target="_blank" rel="noreferrer">{realMill.citation}</a></div>
          <div className="cc-cap cc-muted">{realMill.note}</div>
        </div>
        )}
        </div>
        <div className={`cc-railsec ${railSection === 'mill' ? '' : 'hide'}`}>
        {source === 'synthetic' && <div className="cc-card">
          <div className="cc-card-t">{es ? 'Tipo de molino (preset)' : 'Mill type (preset)'}</div>
          <div className="cc-chips">
            {MILLS.map((m) => (
              // selecting a type loads that machine's characteristic geometry/media/density (MILL_PRESETS), so Nc,
              // regime, power and the 3D charge all change; the sliders below then fine-tune from the preset.
              <button key={m} className={`chip ${op.millType === m ? 'on' : ''}`} onClick={() => setOp((o) => ({ ...o, millType: m, ...MILL_PRESETS[m] }))}>{m}</button>
            ))}
          </div>
          <div className="cc-cap cc-muted">{es ? 'carga el preset de geometría/medios de esa máquina (los deslizadores afinan)' : 'loads that machine’s geometry/media preset (sliders fine-tune)'}</div>
          <label className="cc-ctl">{es ? 'fracción crítica φc' : 'fraction critical φc'}: {op.phiC.toFixed(2)}
            <input className="range" type="range" min={0.3} max={1.1} step={0.01} value={op.phiC} onChange={(e) => set('phiC', +e.target.value)} />
          </label>
          <label className="cc-ctl">{es ? 'llenado J' : 'fill J'}: {(op.fill * 100).toFixed(0)}%
            <input className="range" type="range" min={0} max={0.55} step={0.01} value={op.fill} onChange={(e) => set('fill', +e.target.value)} />
          </label>
          <label className="cc-ctl">{es ? 'diámetro' : 'diameter'}: {op.diameterM.toFixed(1)} m
            <input className="range" type="range" min={2} max={12} step={0.1} value={op.diameterM} onChange={(e) => set('diameterM', +e.target.value)} />
          </label>
          <label className="cc-ctl">{es ? 'tamaño de bola' : 'ball size'}: {op.ballTopMm.toFixed(0)} mm
            <input className="range" type="range" min={20} max={150} step={5} value={op.ballTopMm} onChange={(e) => set('ballTopMm', +e.target.value)} />
          </label>
          <div className={`cc-regime-pill cc-regime-${r.regime}`}>{r.regime} · φc {op.phiC.toFixed(2)}</div>
          <div className="cc-cap cc-muted">{es
            ? 'el pill clasifica por bandas de φc (banda centrifuging desde ~0.9); el inicio exacto es φc = 1, ver "% centrifugando"'
            : 'the pill classifies by φc band (centrifuging band from ~0.9); the exact onset is φc = 1, see "% centrifuging"'}</div>
        </div>}
        </div>
      </aside>
      <main className="cc-main">
        <div className="cc-groupbar" role="tablist" aria-label={es ? 'grupos de vistas' : 'view groups'}>
          {TAB_GROUPS.filter((g) => tabs.some((t) => g.members.includes(t.id))).map((g) => (
            <button key={g.id} role="tab" aria-selected={tabGroup === g.id}
                    className={`cc-group ${tabGroup === g.id ? 'on' : ''}`}
                    onClick={() => setTabGroup(g.id)}>{es ? g.es : g.en}</button>
          ))}
        </div>
        <Tabs key={tabGroup}
              tabs={tabs
                .filter((t) => (TAB_GROUPS.find((g) => g.id === tabGroup)?.members ?? []).includes(t.id))
                .map((t) => ({ ...t, content: <PanelBoundary key={`${source}-${caseId}-${realMillId}-${t.id}`} lang={es ? 'es' : 'en'}>{t.content}</PanelBoundary> }))}
              ariaLabel={es ? 'vistas del molino' : 'mill views'} />
      </main>
    </div>
  );
}
