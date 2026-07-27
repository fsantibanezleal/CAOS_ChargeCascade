// ADR-0070 scenario focus view: one selected scenario, full page, nothing competing with the stage.
//
// This is ADDITIVE. The App (Tool.tsx) and its tabs are untouched; this route is a second way to look at
// the SAME scenario through the SAME engine, for when you want to manage the simulation rather than read
// about it. It deliberately renders OUTSIDE <AppShell>, because the shell header and footer are what cost
// the App 150px of vertical space before anything draws (`calc(100dvh - 150px)` in chargecascade.css).
//
// Requirements it implements, from ADR-0070: the stage owns the viewport; one parameter rail on the
// right; KPIs overlaid on the stage as a HUD rather than stacked as cards; the regime named ON the
// visualization with a plain-language line; progressive disclosure via a basic/advanced toggle inside the
// view instead of across tabs; every exposed control recomputes live; deep-linkable per scenario.

import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useShellLang } from '@fasl-work/caos-app-shell';
import { CASES, caseById, evaluate, recommendPhiCForRegime, type Operating, type Regime } from '../mill/index.ts';
import { Mill3D } from '../viz/Mill3D.tsx';

/** What each regime IS, in one sentence, shown on the stage. The point of the focus view is that you can
 *  learn the concept from the motion in front of you without leaving for a docs tab. */
const REGIME_TEXT: Record<Regime, { en: string; es: string }> = {
  slumping: {
    en: 'The charge barely lifts. It shears in place and slides back, so there is little impact and grinding is weak.',
    es: 'La carga apenas se eleva. Corta en su lugar y resbala hacia atras, con poco impacto y molienda debil.',
  },
  cascading: {
    en: 'The charge rides up the shell and rolls back down its own surface. Grinding is mostly abrasion and attrition.',
    es: 'La carga sube por el manto y rueda de vuelta por su propia superficie. La molienda es sobre todo abrasion y atricion.',
  },
  cataracting: {
    en: 'The outer layers are thrown clear of the charge and fall onto the toe. This is the impact-breakage regime.',
    es: 'Las capas exteriores son lanzadas fuera de la carga y caen sobre el pie. Es el regimen de fractura por impacto.',
  },
  centrifuging: {
    en: 'The charge is pinned to the shell by rotation and stops falling. Grinding collapses even though the mill still draws power.',
    es: 'La carga queda pegada al manto por la rotacion y deja de caer. La molienda colapsa aunque el molino siga consumiendo potencia.',
  },
};

const REGIME_LABEL: Record<Regime, { en: string; es: string }> = {
  slumping: { en: 'Slumping', es: 'Deslizamiento' },
  cascading: { en: 'Cascading', es: 'Cascada' },
  cataracting: { en: 'Cataracting', es: 'Catarata' },
  centrifuging: { en: 'Centrifuging', es: 'Centrifugado' },
};

function Hud({ items }: { items: { v: string; l: string; tone?: string }[] }) {
  return (
    <div className="cc-focus-hud">
      {items.map((it) => (
        <div className="cc-focus-hud-item" key={it.l}>
          <div className={`cc-focus-hud-v${it.tone ? ' ' + it.tone : ''}`}>{it.v}</div>
          <div className="cc-focus-hud-l">{it.l}</div>
        </div>
      ))}
    </div>
  );
}

function Slider({ label, unit, value, min, max, step, onChange }: {
  label: string; unit?: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void;
}) {
  return (
    <label className="cc-focus-ctl">
      <span className="cc-focus-ctl-l">{label}<b>{value.toFixed(step < 0.01 ? 3 : step < 1 ? 2 : 0)}{unit ?? ''}</b></span>
      <input type="range" min={min} max={max} step={step} value={value}
             onChange={(e) => onChange(+e.target.value)} />
    </label>
  );
}


/** The power curve the engine already computes, drawn small in the rail with the operating point
 *  marked. The reference tool carries a power plot; ours had the data and was not showing it here. */
function PowerCurve({ pts, phiC, es }: { pts: { phiC: number; phf: number }[]; phiC: number; es: boolean }) {
  const W = 288, H = 92, pad = 4;
  if (pts.length < 2) return null;
  const xs = pts.map((p) => p.phiC), ys = pts.map((p) => p.phf);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y1 = Math.max(...ys) || 1;
  const sx = (v: number) => pad + ((v - x0) / (x1 - x0 || 1)) * (W - 2 * pad);
  const sy = (v: number) => H - pad - (v / y1) * (H - 2 * pad);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${sx(p.phiC).toFixed(1)},${sy(p.phf).toFixed(1)}`).join(' ');
  const here = pts.reduce((a, b) => (Math.abs(b.phiC - phiC) < Math.abs(a.phiC - phiC) ? b : a));
  return (
    <div className="cc-focus-plot">
      <div className="cc-focus-plot-t">{es ? 'Potencia neta vs phiC' : 'Net power vs phiC'}</div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img"
           aria-label={es ? 'curva de potencia' : 'power curve'}>
        <path d={d} fill="none" stroke="var(--color-accent)" strokeWidth="1.6" />
        <line x1={sx(here.phiC)} x2={sx(here.phiC)} y1={pad} y2={H - pad}
              stroke="var(--color-fg-faint)" strokeDasharray="3 3" strokeWidth="1" />
        <circle cx={sx(here.phiC)} cy={sy(here.phf)} r="3.2" fill="var(--color-accent)" />
      </svg>
      <div className="cc-focus-plot-l">{here.phf.toFixed(0)} kW @ phiC {here.phiC.toFixed(2)}</div>
    </div>
  );
}

export default function Focus() {
  const { caseId } = useParams();
  const lang = useShellLang();
  const es = lang === 'es';
  const theCase = useMemo(() => caseById(caseId ?? CASES[0].id), [caseId]);
  const [op, setOp] = useState<Operating>(() => ({
    ...theCase.op,
    // Seed the composition and liner fields so the focus view can move them. They are OPTIONAL on
    // Operating, so a case that does not define them keeps the legacy single-density behaviour until a
    // control here is touched. Spread the case FIRST so a case that DOES define them wins.
    ballFill: theCase.op.ballFill ?? Math.min(0.15, theCase.op.fill),
    ballDensity: theCase.op.ballDensity ?? 7.8,
    slurryDensity: theCase.op.slurryDensity ?? 2.7,
    lifterCount: theCase.op.lifterCount ?? 16,
    lifterHeightM: theCase.op.lifterHeightM ?? 0.7 * (theCase.op.ballTopMm / 1000),
    frictionMu: theCase.op.frictionMu ?? 0,
  }));
  const [advanced, setAdvanced] = useState(false);
  // Regime presets, like the reference tool's Deslizamiento / Cascada / Catarata / Centrifugado.
  // The target speed is SOLVED for the current geometry by the engine (recommendPhiCForRegime), not
  // hardcoded: the band edges move with D, media size and fill, so a fixed phiC would land in the
  // wrong regime as soon as any of those changed.
  const applyRegime = (want: Regime) => {
    const s = recommendPhiCForRegime(op, want);
    if (s.phiCRec != null) set('phiC', +s.phiCRec.toFixed(3));
  };
  const set = (k: keyof Operating, v: number) => setOp((o) => ({ ...o, [k]: v }));
  const r = useMemo(() => evaluate(op), [op]);

  const hud = [
    { v: `${r.nRpm.toFixed(1)}`, l: 'rpm', tone: 'accent' },
    { v: `${(op.phiC * 100).toFixed(0)}%`, l: es ? '% critica' : '% critical' },
    { v: `${r.phfKw.toFixed(0)}`, l: 'kW (net)', tone: 'blue' },
    { v: `${r.chargeMassT.toFixed(0)} t`, l: es ? 'masa carga' : 'charge mass' },
    { v: `${r.chargeDensityUsed.toFixed(2)}`, l: es ? 'rho carga t/m3' : 'charge rho t/m3' },
    { v: `${r.shoulderDeg.toFixed(0)}deg`, l: es ? 'hombro' : 'shoulder' },
    { v: `${r.lifterLiftDeg.toFixed(0)}deg`, l: es ? 'aporte lifter' : 'lifter lift' },
    { v: `${(r.fracCentrifuging * 100).toFixed(0)}%`, l: es ? 'centrifugando' : 'centrifuging' },
    { v: `${r.toeDeg.toFixed(0)}deg`, l: es ? 'pie' : 'toe' },
    { v: `${r.shells.length}`, l: es ? 'capas' : 'shells' },
    { v: `${r.ncRpm.toFixed(1)}`, l: es ? 'rpm critica' : 'critical rpm' },
  ];

  return (
    <div className="cc-focus">
      <div className="cc-focus-stage">
        <Mill3D op={op} caseId={theCase.id} height={0} />
        {/* HUD is rendered after the canvas so it stacks above it; it is positioned against the
            canvas region (see .cc-focus-canvasarea) so a wrapping banner can never overlap it. */}
        <div className="cc-focus-badge">
          <div className="cc-focus-badge-t">{REGIME_LABEL[r.regime][es ? 'es' : 'en']}</div>
          <div className="cc-focus-badge-d">{REGIME_TEXT[r.regime][es ? 'es' : 'en']}</div>
        </div>
        <Hud items={hud} />
        <Link className="cc-focus-exit" to="/">{es ? 'Volver a la app' : 'Back to the app'}</Link>
      </div>

      <aside className="cc-focus-rail">
        <div className="cc-focus-rail-h">
          <div>
            <div className="cc-focus-title">{theCase.name}</div>
            <div className="cc-focus-sub">{theCase.id}</div>
          </div>
          <button className="cc-focus-mode" onClick={() => setAdvanced((a) => !a)}>
            {advanced ? (es ? 'Basico' : 'Basic') : (es ? 'Avanzado' : 'Advanced')}
          </button>
        </div>

        <div className="cc-focus-presets">
          {(['slumping', 'cascading', 'cataracting', 'centrifuging'] as Regime[]).map((rg) => (
            <button key={rg} type="button" onClick={() => applyRegime(rg)}
                    className={r.regime === rg ? 'on' : ''}>
              {REGIME_LABEL[rg][es ? 'es' : 'en']}
            </button>
          ))}
        </div>

        <Slider label={es ? 'Velocidad (phiC) ' : 'Speed (phiC) '} value={op.phiC} min={0.3} max={1.1} step={0.01}
                onChange={(v) => set('phiC', v)} />
        <Slider label={es ? 'Llenado total Jc ' : 'Total fill Jc '} value={op.fill} min={0.02} max={0.55} step={0.01}
                onChange={(v) => set('fill', v)} />
        <Slider label={es ? 'Carga de bolas Jb ' : 'Ball charge Jb '} value={op.ballFill ?? 0} min={0} max={op.fill} step={0.01}
                onChange={(v) => set('ballFill', v)} />
        <Slider label={es ? 'Densidad mineral ' : 'Ore density '} unit=" t/m3" value={op.slurryDensity ?? 2.7}
                min={1.5} max={4.5} step={0.05} onChange={(v) => set('slurryDensity', v)} />
        <Slider label={es ? 'Densidad bolas ' : 'Ball density '} unit=" t/m3" value={op.ballDensity ?? 7.8}
                min={5} max={8.5} step={0.05} onChange={(v) => set('ballDensity', v)} />
        <Slider label={es ? 'N lifters ' : 'Lifter count '} value={op.lifterCount ?? 16} min={4} max={48} step={1}
                onChange={(v) => set('lifterCount', v)} />
        <Slider label={es ? 'Altura lifter ' : 'Lifter height '} unit=" m" value={op.lifterHeightM ?? 0.05}
                min={0.005} max={0.4} step={0.005} onChange={(v) => set('lifterHeightM', v)} />

        {advanced && (
          <>
            <Slider label={es ? 'Friccion mu ' : 'Friction mu '} value={op.frictionMu ?? 0} min={0} max={0.6} step={0.01}
                    onChange={(v) => set('frictionMu', v)} />
            <Slider label={es ? 'Diametro ' : 'Diameter '} unit=" m" value={op.diameterM} min={2} max={12} step={0.1}
                    onChange={(v) => set('diameterM', v)} />
            <Slider label={es ? 'Largo ' : 'Length '} unit=" m" value={op.lengthM} min={2} max={14} step={0.1}
                    onChange={(v) => set('lengthM', v)} />
            <Slider label={es ? 'Bola top ' : 'Top ball '} unit=" mm" value={op.ballTopMm} min={20} max={150} step={5}
                    onChange={(v) => set('ballTopMm', v)} />
            <Slider label={es ? 'Angulo de reposo ' : 'Repose angle '} unit=" deg" value={op.liftAngleDeg}
                    min={20} max={50} step={1} onChange={(v) => set('liftAngleDeg', v)} />
          </>
        )}

        <PowerCurve pts={r.powerCurve} phiC={op.phiC} es={es} />

        <div className="cc-focus-note">
          {es
            ? 'El hombro usa el modelo de deslizamiento sobre la barra lifter (Vermeulen 1985): la particula NO parte donde se equilibran las fuerzas, sino que resbala por la cara de la barra y sale en su borde. La densidad de carga se deriva de Jc, Jb y las dos densidades (Hogg y Fuerstenau 1972).'
            : 'The shoulder uses the lifter-bar sliding model (Vermeulen 1985): an element does NOT depart where the forces balance, it slides down the bar face and leaves at the edge. Charge density is derived from Jc, Jb and the two densities (Hogg & Fuerstenau 1972).'}
        </div>

        <div className="cc-focus-scenarios">
          {CASES.slice(0, 9).map((c) => (
            <Link key={c.id} to={`/focus/${c.id}`} className={c.id === theCase.id ? 'on' : ''}>{c.id}</Link>
          ))}
        </div>
      </aside>
    </div>
  );
}
