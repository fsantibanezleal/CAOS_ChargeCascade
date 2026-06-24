import { useEffect, useState } from 'react';
import { Cite, Equation, InlineMath, Refs, Tabs, useShellLang } from '@fasl-work/caos-app-shell';
import { loadCaseResults } from '../lib/artifacts.ts';

interface Row {
  id: string; name: string; category: string; realOrSynthetic: string; ncRpm: number;
  phiC: number; regime: string; phfKw: number; fracCent: number; chargeMassT: number;
}

const kw = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(2)} MW` : `${v.toFixed(0)} kW`);

export default function Experiments() {
  const es = useShellLang() === 'es';
  const refsL = 'Refs';
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    loadCaseResults().then((cr) => {
      setRows(Object.entries(cr.cases).map(([id, raw]) => {
        const c = raw as Record<string, unknown>;
        return {
          id, name: String(c.name), category: String(c.category), realOrSynthetic: String(c.realOrSynthetic),
          ncRpm: Number(c.ncRpm), phiC: Number(c.phiC), regime: String(c.regime), phfKw: Number(c.phfKw),
          fracCent: Number(c.fracCentrifuging), chargeMassT: Number(c.chargeMassT),
        };
      }));
    }).catch(() => setRows([]));
  }, []);

  // Leakage-safe held-out protocol for the surrogate — theme-aware inline JSX SVG.
  const HeldOutSVG = (
    <svg role="img" viewBox="0 0 860 360" width="100%" aria-labelledby="cc-ho-t cc-ho-d"
      style={{ display: 'block', fontFamily: 'var(--font-mono)' }}>
      <title id="cc-ho-t">{es ? 'Protocolo held-out para el surrogate' : 'Held-out protocol for the surrogate'}</title>
      <desc id="cc-ho-d">{es
        ? 'Las configuraciones de molino se parten por molino completo en entrenamiento y prueba; el surrogate se mide contra el motor exacto solo en configuraciones nunca vistas en entrenamiento.'
        : 'Mill configurations are split by whole mill into train and test; the surrogate is measured against the exact engine only on configurations never seen in training.'}</desc>
      <defs>
        <marker id="cc-ho-ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="var(--color-fg-subtle)" /></marker>
      </defs>
      <text x="150" y="26" textAnchor="middle" fontSize="14" fontWeight="700" fill="var(--color-fg)">{es ? 'Configuraciones de molino' : 'Mill configurations'}</text>
      <text x="150" y="44" textAnchor="middle" fontSize="10.5" fill="var(--color-fg-faint)">{es ? 'barrido (D, L, J, d, φc, ρ)' : 'sweep (D, L, J, d, φc, ρ)'}</text>
      {[[70, es ? 'molinos de bolas' : 'ball mills', 'var(--color-accent)', 'train'],
        [134, es ? 'molinos SAG' : 'SAG mills', 'var(--color-good)', 'train'],
        [198, es ? 'molinos de barras' : 'rod mills', 'var(--color-magenta)', 'train'],
        [262, es ? 'molino exótico (D grande)' : 'exotic mill (large D)', 'var(--color-bad)', 'test']].map(([y, lbl, c, side], i) => (
        <g key={i}>
          <rect x="20" y={y as number} width="250" height="42" rx="6" fill="var(--color-surface)" stroke={c as string} strokeWidth="2" />
          <text x="32" y={(y as number) + 18} fontSize="11.5" fontWeight="600" fill="var(--color-fg)">{lbl as string}</text>
          {[0, 1, 2, 3, 4].map((w) => (
            <rect key={w} x={36 + w * 44} y={(y as number) + 25} width="40" height="10" rx="2" fill={c as string} fillOpacity="0.28" stroke={c as string} strokeWidth="0.8" />
          ))}
          <line x1="270" y1={(y as number) + 21} x2="450" y2={(side as string) === 'train' ? 130 : 268} stroke="var(--color-fg-subtle)" strokeWidth="1.6" markerEnd="url(#cc-ho-ar)" />
        </g>
      ))}
      <rect x="450" y="66" width="390" height="128" rx="8" fill="var(--color-surface)" stroke="var(--color-good)" strokeWidth="2" />
      <text x="466" y="90" fontSize="13" fontWeight="700" fill="var(--color-good)">{es ? 'ENTRENAMIENTO' : 'TRAIN'}</text>
      <text x="466" y="110" fontSize="10.5" fill="var(--color-fg-faint)">{es ? 'el surrogate aprende a reproducir el motor exacto' : 'the surrogate learns to reproduce the exact engine'}</text>
      <text x="466" y="132" fontSize="10.5" fill="var(--color-fg-faint)">{es ? 'el AE aprende la envolvente de entrenamiento' : 'the AE learns the training envelope'}</text>
      <text x="466" y="158" fontSize="10.5" fill="var(--color-fg)">{es ? 'salida: surrogate.onnx + ood-ae.onnx' : 'output: surrogate.onnx + ood-ae.onnx'}</text>
      <rect x="450" y="232" width="390" height="104" rx="8" fill="var(--color-surface)" stroke="var(--color-bad)" strokeWidth="2" strokeDasharray="6 4" />
      <text x="466" y="256" fontSize="13" fontWeight="700" fill="var(--color-bad)">{es ? 'PRUEBA · held-out' : 'TEST · held-out'}</text>
      <text x="466" y="278" fontSize="10.5" fill="var(--color-fg-faint)">{es ? 'molinos NUNCA vistos en entrenamiento' : 'mills NEVER seen in training'}</text>
      <text x="466" y="300" fontSize="10.5" fill="var(--color-fg)">{es ? 'error del surrogate vs exacto ≈ ±12.5%' : 'surrogate vs exact error ≈ ±12.5%'}</text>
      <text x="466" y="320" fontSize="10.5" fill="var(--color-fg)">{es ? 'el AE marca el molino exótico (OOD, AUC ≈ 0.92)' : 'the AE flags the exotic mill (OOD, AUC ≈ 0.92)'}</text>
    </svg>
  );

  const tabs = [
    // 1 — WHAT THE EXPERIMENTS ASK
    {
      id: 'questions', label: es ? 'Qué se prueba' : 'What is tested',
      content: (
        <div className="prose">
          <p>{es
            ? 'Esta página no reporta un único número de portada; separa las preguntas con las que se puede hacer FALLAR al motor. (1) ¿Concuerdan los tres modelos de potencia independientes (Hogg–Fuerstenau, Morrell, Bond) entre sí? (2) ¿La transición de régimen cae donde la física dice, cuando se barre φc sobre el MISMO molino? (3) ¿Se cumplen los controles analíticos exactos (φc=1 centrifuga → potencia 0; J=0 → 0 potencia)? (4) ¿El surrogate aprendido generaliza a molinos no vistos, y el AE marca cuándo no debe confiarse?'
            : 'This page does not report a single headline number; it separates the questions the engine can be made to FAIL. (1) Do the three independent power models (Hogg–Fuerstenau, Morrell, Bond) agree with each other? (2) Does the regime transition land where physics says, when φc is swept over the SAME mill? (3) Do the exact analytic controls hold (φc=1 centrifuges → power 0; J=0 → 0 power)? (4) Does the learned surrogate generalize to unseen mills, and does the AE flag when it must not be trusted?'}</p>
          <p>{es
            ? 'Son pruebas distintas con modos de falla distintos: un modelo de potencia puede acertar la forma y errar la magnitud; un régimen puede clasificarse bien en el centro de la banda y mal en el borde; un surrogate puede ser exacto dentro de su envolvente e inútil fuera. Reportarlas por separado, con las anclas reales y los controles, es el mínimo honesto.'
            : 'These are different tests with different failure modes: a power model can get the shape right and the magnitude wrong; a regime can classify well at the band centre and badly at the edge; a surrogate can be accurate inside its envelope and useless outside. Reporting them apart, with the real anchors and the controls, is the honest minimum.'}{' '}<Cite id="wills2016" paren /></p>
          <Refs ids={['wills2016', 'napiermunn1996']} label={refsL} />
        </div>
      ),
    },
    // 2 — CROSS-METHOD POWER AGREEMENT
    {
      id: 'power-agree', label: es ? 'Acuerdo de potencia' : 'Power agreement',
      content: (
        <div className="prose">
          <p>{es
            ? 'La prueba de potencia más fuerte es el ACUERDO entre modelos independientes. Hogg–Fuerstenau (brazo de torque de cuerpo rígido) y Morrell (continuo entre pie y hombro) parten de física distinta; si concuerdan en un molino dado, el número es robusto, no un artefacto de un modelo. El App los corre en paralelo y muestra la diferencia relativa.'
            : 'The strongest power test is the AGREEMENT between independent models. Hogg–Fuerstenau (rigid-body torque arm) and Morrell (toe-to-shoulder continuum) start from different physics; if they agree on a given mill, the number is robust, not a single-model artifact. The App runs them side by side and shows the relative difference.'}{' '}<Cite id="hoggfuerstenau1972" paren /> <Cite id="morrell1996" paren /></p>
          <Equation tex="\Delta_{\text{rel}}=\frac{|P_{\text{HF}}-P_{\text{Morrell}}|}{\tfrac12(P_{\text{HF}}+P_{\text{Morrell}})},\qquad \text{esperado: }\Delta_{\text{rel}}\lesssim10\%\ \text{en el rango calibrado}" caption={es ? 'la diferencia relativa entre los dos modelos de potencia; un acuerdo cercano valida la magnitud' : 'the relative difference between the two power models; close agreement validates the magnitude'} />
          <p>{es
            ? 'El escalado con el tamaño es la segunda prueba: la teoría exige P ∝ D^2.5, así que duplicar el diámetro debe multiplicar la potencia por ~5.7. K-SAG (10 m) saca la mayor potencia de los 10 casos por exactamente esa razón, y la tabla de casos lo hace verificable fila a fila. Bond corre como tercer cruce, pero de ENERGÍA (kWh/t), no de potencia — deliberadamente mantenido aparte para no confundir las dos cantidades.'
            : 'Size scaling is the second test: theory requires P ∝ D^2.5, so doubling the diameter must multiply power by ~5.7. K-SAG (10 m) draws the most power of the 10 cases for exactly that reason, and the case table makes it verifiable row by row. Bond runs as a third cross-check, but of ENERGY (kWh/t), not power — deliberately kept apart so the two quantities are not conflated.'}{' '}<Cite id="bond1961" paren /></p>
          <Equation tex="\frac{P(2D)}{P(D)}=2^{2.5}\approx5.66,\qquad W_{\text{Bond}}=10\,W_i\!\left(\tfrac{1}{\sqrt{P_{80}}}-\tfrac{1}{\sqrt{F_{80}}}\right)\ \text{[kWh/t, energía, no potencia]}" caption={es ? 'el escalado geométrico exacto y la ley de Bond (energía de proceso, mantenida distinta de la potencia de carga)' : 'the exact geometric scaling and Bond\'s law (process energy, kept distinct from charge power)'} />
          <Refs ids={['hoggfuerstenau1972', 'morrell1996', 'bond1961']} label={refsL} />
        </div>
      ),
    },
    // 3 — REGIME TRANSITION VALIDATION
    {
      id: 'regime-valid', label: es ? 'Transición de régimen' : 'Regime transition',
      content: (
        <div className="prose">
          <p>{es
            ? 'El experimento de régimen toma el MISMO molino y barre solo φc, aislando la transición. Tres casos —S-CASCADE, S-CATARACT, S-CENTRIFUGE— son idénticos en geometría y difieren únicamente en velocidad, así que cualquier cambio de régimen es atribuible a φc y nada más. Esto es un control: si el clasificador asignara régimen por otra cosa que φc, estos tres casos lo delatarían.'
            : 'The regime experiment takes the SAME mill and sweeps only φc, isolating the transition. Three cases — S-CASCADE, S-CATARACT, S-CENTRIFUGE — are identical in geometry and differ only in speed, so any regime change is attributable to φc and nothing else. This is a control: if the classifier assigned regime by anything other than φc, these three cases would expose it.'}{' '}<Cite id="wills2016" paren /></p>
          <p>{es
            ? 'El detector cuantitativo del inicio de centrifugado es la fracción de capas centrifugando, que es 0 por construcción hasta φc = 1 y crece después. La tabla de casos muestra el % centrifugando por fila, así que el lector verifica que es exactamente 0 en cascading/cataracting y positivo solo cuando la física lo permite — no una banda difusa elegida a ojo.'
            : 'The quantitative onset detector for centrifuging is the fraction of shells centrifuging, which is 0 by construction until φc = 1 and rises after. The case table shows the % centrifuging per row, so the reader verifies it is exactly 0 in cascading/cataracting and positive only when the physics permits — not a fuzzy band chosen by eye.'}</p>
          <Equation tex="f_{\text{cent}}(\varphi_c)=\max\!\left(0,\ 1-\tfrac{1}{\varphi_c^2}\right)\ \Rightarrow\ f_{\text{cent}}=0\ \text{para}\ \varphi_c\le1" caption={es ? 'la fracción centrifugando es idénticamente cero por debajo de la velocidad crítica — un inicio exacto, no una banda' : 'the centrifuging fraction is identically zero below critical speed — an exact onset, not a band'} />
          <Refs ids={['wills2016', 'napiermunn1996']} label={refsL} />
        </div>
      ),
    },
    // 4 — EXACT ANALYTIC CONTROLS
    {
      id: 'controls', label: es ? 'Controles exactos' : 'Exact controls',
      content: (
        <div className="prose">
          <p>{es
            ? 'Dos controles analíticos exactos son la prueba más dura, porque tienen una respuesta conocida a priori que el motor DEBE reproducir o está mal. C-CRITICAL pone φc = 1: toda la carga centrifuga, así que la potencia de molienda debe colapsar hacia 0. C-EMPTY pone J = 0: no hay carga, así que la potencia es exactamente 0. No son ajustes ni calibraciones — son límites que la física fija.'
            : 'Two exact analytic controls are the hardest test, because they have an a-priori known answer the engine MUST reproduce or it is wrong. C-CRITICAL sets φc = 1: all the charge centrifuges, so the grinding power must collapse toward 0. C-EMPTY sets J = 0: there is no charge, so the power is exactly 0. These are not fits or calibrations — they are limits the physics fixes.'}</p>
          <Equation tex="\text{C-CRITICAL: }\varphi_c=1\Rightarrow f_{\text{cent}}\to\text{máx},\ P\to0;\qquad \text{C-EMPTY: }J=0\Rightarrow M=0\Rightarrow P=0" caption={es ? 'los dos controles exactos: el motor debe reproducir ambos límites para ser creíble' : 'the two exact controls: the engine must reproduce both limits to be credible'} />
          <p>{es
            ? 'Funcionan también como controles NEGATIVOS de honestidad: si el motor mostrara potencia positiva a J = 0, o no colapsara a φc = 1, el modelo estaría fabricando energía. La tabla de casos incluye ambos como filas, de modo que el lector verifica que C-EMPTY da 0 potencia y C-CRITICAL centrifuga — directamente, sin tener que confiar en una afirmación.'
            : 'They also act as NEGATIVE controls for honesty: if the engine showed positive power at J = 0, or did not collapse at φc = 1, the model would be fabricating energy. The case table includes both as rows, so the reader verifies C-EMPTY gives 0 power and C-CRITICAL centrifuges — directly, without having to trust a claim.'}{' '}<Cite id="wills2016" paren /></p>
          <Refs ids={['wills2016', 'rosesullivan1957']} label={refsL} />
        </div>
      ),
    },
    // 5 — SURROGATE HELD-OUT SKILL
    {
      id: 'surrogate-skill', label: es ? 'Skill held-out del surrogate' : 'Surrogate held-out skill',
      content: (
        <div className="prose">
          <p>{es
            ? 'El surrogate de potencia y el autoencoder OOD se evalúan con una partición sin fuga: las configuraciones de molino se asignan a entrenamiento o prueba por MOLINO COMPLETO, nunca mezclando muestras del mismo molino en ambos lados. El surrogate se mide contra el motor exacto SOLO en molinos que nunca vio. Su error held-out (~±12.5%) se reporta tal cual — no el error de entrenamiento, que sería optimista.'
            : 'The power surrogate and the OOD autoencoder are evaluated with a leakage-safe split: mill configurations are assigned to train or test by WHOLE MILL, never mixing samples of the same mill on both sides. The surrogate is measured against the exact engine ONLY on mills it never saw. Its held-out error (~±12.5%) is reported as it lands — not the training error, which would be optimistic.'}</p>
          {HeldOutSVG}
          <p className="muted small">{es
            ? 'Partición por molino completo: el surrogate se mide en configuraciones held-out; el AE marca el molino exótico fuera de envolvente.'
            : 'Whole-mill split: the surrogate is measured on held-out configurations; the AE flags the out-of-envelope exotic mill.'}</p>
          <Equation tex="\varepsilon_{\text{held-out}}=\frac{|\hat P-P^{\text{exacto}}|}{P^{\text{exacto}}}\approx\pm12.5\%,\qquad \text{AUC}_{\text{OOD}}\approx0.92" caption={es ? 'el error held-out del surrogate y la separación dentro/fuera-de-envolvente del AE, ambos reportados sin maquillaje' : 'the surrogate\'s held-out error and the AE\'s in/out-of-envelope separation, both reported unembellished'} />
          <p>{es
            ? 'El AE cierra el lazo de honestidad: en un molino exótico (un diámetro fuera de la envolvente de entrenamiento) el surrogate extrapolaría, y el AE lo marca como fuera de distribución (AUC ~0.92) antes de que el número se tome en serio. El motor exacto sigue siendo la autoridad en vivo; el surrogate es la herramienta rápida, con su incertidumbre declarada y su guardia OOD.'
            : 'The AE closes the honesty loop: on an exotic mill (a diameter outside the training envelope) the surrogate would extrapolate, and the AE flags it as out-of-distribution (AUC ~0.92) before the number is taken seriously. The exact engine remains the live authority; the surrogate is the fast tool, with its stated uncertainty and its OOD guard.'}</p>
          <Refs ids={['hoggfuerstenau1972', 'morrell1996']} label={refsL} />
        </div>
      ),
    },
    // 6 — CASES + CAPACITY (the live table)
    {
      id: 'cases', label: es ? 'Casos + capacidad' : 'Cases + capacity',
      content: (
        <div className="prose">
          <p>{es
            ? 'Los 10 casos, horneados por el MISMO motor exacto que corre en vivo. Cada fila lleva la velocidad crítica, φc, el régimen, la potencia neta, el % centrifugando y la masa de carga — los números son idénticos a los que el App muestra al seleccionar el caso, por construcción.'
            : 'The 10 cases, baked by the SAME exact engine that runs live. Each row carries the critical speed, φc, the regime, the net power, the % centrifuging and the charge mass — the numbers are identical to what the App shows when you select the case, by construction.'}</p>
          {rows == null ? <p className="cc-note">{es ? 'cargando…' : 'loading…'}</p> : (
            <table className="cmp-table">
              <thead>
                <tr>
                  <th>{es ? 'caso' : 'case'}</th><th>{es ? 'tipo' : 'type'}</th><th>{es ? 'categoría' : 'category'}</th><th>Nc</th><th>φc</th>
                  <th>{es ? 'régimen' : 'regime'}</th><th>{es ? 'potencia' : 'power'}</th><th>% cent.</th><th>{es ? 'carga' : 'charge'}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td style={{ textAlign: 'left' }}><b>{r.id}</b></td>
                    <td><span className="chip" style={{ background: r.realOrSynthetic === 'real' ? 'color-mix(in oklab,#3fb950 20%,transparent)' : 'transparent', color: r.realOrSynthetic === 'real' ? '#3fb950' : 'var(--color-fg-faint)', borderColor: r.realOrSynthetic === 'real' ? 'transparent' : 'var(--color-border)' }}>{r.realOrSynthetic === 'real' ? (es ? 'real' : 'real') : (es ? 'ilustrativo' : 'illustrative')}</span></td>
                    <td style={{ textAlign: 'left' }}>{r.category.split(' (')[0]}</td>
                    <td>{r.ncRpm.toFixed(1)}</td>
                    <td>{r.phiC.toFixed(2)}</td>
                    <td style={{ color: r.regime === 'centrifuging' ? 'var(--color-bad)' : undefined }}>{r.regime}</td>
                    <td>{kw(r.phfKw)}</td>
                    <td>{(r.fracCent * 100).toFixed(0)}%</td>
                    <td>{r.chargeMassT.toFixed(0)} t</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p>{es
            ? 'Anclas para leer la tabla: K-SAG (10 m) saca la mayor potencia (P ∝ D^2.5). S-CASCADE / S-CATARACT / S-CENTRIFUGE son el MISMO molino a distinta φc (la transición de régimen aislada). C-CRITICAL (φc=1) centrifuga; C-EMPTY (J=0) → 0 potencia. La capacidad por caso (mina / molino / mercado) sale del mismo motor y reacciona a los mismos controles en la pestaña de capacidad del App.'
            : 'Anchors for reading the table: K-SAG (10 m) draws the most power (P ∝ D^2.5). S-CASCADE / S-CATARACT / S-CENTRIFUGE are the SAME mill at different φc (the regime transition, isolated). C-CRITICAL (φc=1) centrifuges; C-EMPTY (J=0) → 0 power. The per-case capacity (mine / mill / market) comes from the same engine and reacts to the same controls in the App\'s capacity tab.'}{' '}<Cite id="napiermunn1996" paren /></p>
          <Refs ids={['wills2016', 'napiermunn1996']} label={refsL} />
        </div>
      ),
    },
  ];

  return (
    <div className="page-body">
      <div className="page-head prose">
        <h1>{es ? 'Experimentos' : 'Experiments'}</h1>
        <p className="lede">{es
          ? 'Cuatro pruebas separadas (acuerdo de potencia entre modelos, transición de régimen aislada, controles analíticos exactos, skill held-out del surrogate) + los 10 casos horneados por el mismo motor.'
          : 'Four separate tests (cross-model power agreement, isolated regime transition, exact analytic controls, surrogate held-out skill) + the 10 cases baked by the same engine.'} <InlineMath tex="\varphi_c=N/N_c" /></p>
      </div>
      <Tabs tabs={tabs} ariaLabel={es ? 'experimentos' : 'experiments'} />
    </div>
  );
}
