import { Callout, Cite, Equation, InlineMath, Refs, Tabs, useShellLang } from '@fasl-work/caos-app-shell';

export default function Implementation() {
  const es = useShellLang() === 'es';

  // Architecture / compute-tier schematic — theme-aware via CSS palette vars, NO file paths in the visible prose.
  const ArchSVG = (
    <svg viewBox="0 0 920 520" width="100%" role="img" aria-labelledby="cc-arch-t cc-arch-d"
      style={{ fontFamily: 'var(--font-mono)', background: 'var(--color-bg)' }}>
      <title id="cc-arch-t">{es ? 'Arquitectura por capas de cómputo' : 'Compute-tier architecture'}</title>
      <desc id="cc-arch-d">{es
        ? 'Un motor TypeScript exacto corre en vivo en el navegador (incluido el molino 3D) y, sin cambios, en el horneado offline. Un carril torch→ONNX entrena el surrogate de potencia y el autoencoder OOD. Solo archivos estáticos viajan al CDN.'
        : 'An exact TypeScript engine runs live in the browser (including the 3D mill) and, unchanged, in the offline bake. A torch→ONNX lane trains the power surrogate and the OOD autoencoder. Only static files ship to the CDN.'}</desc>
      <defs>
        <marker id="cc-ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="var(--color-fg-faint)" /></marker>
        <marker id="cc-ar-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="var(--color-accent)" /></marker>
      </defs>

      {/* SHARED EXACT ENGINE (center column) */}
      <rect x="330" y="60" width="270" height="180" rx="10" fill="var(--color-surface)" stroke="var(--color-accent)" strokeWidth="2" />
      <text x="346" y="44" fontSize="14" fontWeight="700" fill="var(--color-fg)">{es ? 'Motor exacto (TypeScript, sin deps)' : 'Exact engine (TypeScript, no deps)'}</text>
      <text x="346" y="86" fontSize="11" fill="var(--color-accent)" fontWeight="700">evaluate(op) → MillResult</text>
      {[[es ? 'velocidad crítica · φc · ω' : 'critical speed · φc · ω', 104],
        [es ? 'partida de Davis · trayectorias' : 'Davis departure · trajectories', 128],
        [es ? 'régimen · % centrifugando' : 'regime · % centrifuging', 152],
        ['Hogg–Fuerstenau · Morrell-form · Bond', 176]].map(([t, y], i) => (
        <g key={i}><rect x="346" y={(y as number) - 16} width="238" height="22" rx="5" fill="var(--color-bg)" stroke="var(--color-border)" />
          <text x="356" y={(y as number)} fontSize="10.5" fill="var(--color-fg)">{t as string}</text></g>
      ))}
      <text x="346" y="214" fontSize="10" fill="var(--color-fg-subtle)">{es ? 'la ÚNICA fuente de verdad física · determinista' : 'the SINGLE source of physics truth · deterministic'}</text>

      {/* LIVE BROWSER (left) */}
      <rect x="20" y="60" width="280" height="180" rx="10" fill="var(--color-surface)" stroke="var(--color-border)" strokeWidth="1.5" />
      <text x="36" y="44" fontSize="14" fontWeight="700" fill="var(--color-fg)">{es ? 'En vivo · navegador' : 'Live · browser'}</text>
      {[[es ? 'molino 3D (Three.js, cinemático)' : '3D mill (Three.js, kinematic)', 88],
        [es ? 'recalcula en cada control (D, J, φc)' : 'recompute on every control (D, J, φc)', 120],
        [es ? 'surrogate + OOD-AE en vivo (ONNX-web)' : 'surrogate + OOD-AE live (ONNX-web)', 152],
        [es ? 'lectura de potencia · régimen · capacidad' : 'power · regime · capacity readout', 184]].map(([t, y], i) => (
        <g key={i}><rect x="36" y={(y as number) - 16} width="248" height="26" rx="6" fill="var(--color-bg)" stroke="var(--color-border)" />
          <text x="46" y={(y as number) + 1} fontSize="10.5" fill="var(--color-fg)">{t as string}</text></g>
      ))}
      <line x1="330" y1="130" x2="302" y2="130" stroke="var(--color-accent)" strokeWidth="2" markerEnd="url(#cc-ar-a)" />
      <text x="300" y="122" fontSize="9.5" fill="var(--color-accent)" textAnchor="end">{es ? 'mismo motor' : 'same engine'}</text>

      {/* OFFLINE BAKE + ONNX LANE (right) */}
      <rect x="630" y="60" width="270" height="180" rx="10" fill="var(--color-surface)" stroke="var(--color-border)" strokeWidth="1.5" />
      <text x="646" y="44" fontSize="14" fontWeight="700" fill="var(--color-fg)">{es ? 'Offline · horneado + ONNX' : 'Offline · bake + ONNX'}</text>
      {[[es ? 'hornea los 10 casos (mismo motor)' : 'bakes the 10 cases (same engine)', 88, 'border'],
        [es ? 'muestrea (features → potencia)' : 'samples (features → power)', 120, 'border'],
        [es ? 'entrena surrogate MLP (torch)' : 'trains surrogate MLP (torch)', 152, 'good'],
        [es ? 'entrena autoencoder OOD (torch)' : 'trains OOD autoencoder (torch)', 184, 'good']].map(([t, y, c], i) => (
        <g key={i}><rect x="646" y={(y as number) - 16} width="238" height="26" rx="6" fill="var(--color-bg)" stroke={`var(--color-${c})`} />
          <text x="656" y={(y as number) + 1} fontSize="10.5" fill="var(--color-fg)">{t as string}</text></g>
      ))}
      <line x1="600" y1="130" x2="628" y2="130" stroke="var(--color-accent)" strokeWidth="2" markerEnd="url(#cc-ar-a)" />
      <text x="606" y="122" fontSize="9.5" fill="var(--color-accent)">{es ? 'mismo motor' : 'same engine'}</text>

      {/* ARTIFACTS row */}
      <rect x="20" y="270" width="880" height="74" rx="10" fill="var(--color-bg)" stroke="var(--color-accent)" strokeWidth="1.5" />
      <text x="36" y="294" fontSize="13" fontWeight="700" fill="var(--color-accent)">{es ? 'Artefactos congelados (estáticos)' : 'Frozen artifacts (static)'}</text>
      <text x="36" y="316" fontSize="10.5" fill="var(--color-fg)">{es ? 'resultados de casos (JSON) · trazas + manifests · el surrogate (ONNX) · el autoencoder OOD (ONNX) · errores held-out' : 'case results (JSON) · traces + manifests · the surrogate (ONNX) · the OOD autoencoder (ONNX) · held-out errors'}</text>
      <text x="36" y="334" fontSize="10" fill="var(--color-fg-subtle)">{es ? 'pequeños · congelados · una descarga; los números en vivo y offline son idénticos por construcción' : 'small · frozen · single fetch; the live and offline numbers are identical by construction'}</text>
      <line x1="160" y1="240" x2="160" y2="268" stroke="var(--color-fg-faint)" strokeWidth="1.5" markerEnd="url(#cc-ar)" />
      <line x1="760" y1="240" x2="760" y2="268" stroke="var(--color-fg-faint)" strokeWidth="1.5" markerEnd="url(#cc-ar)" />

      {/* CDN / DELIVERY */}
      <rect x="20" y="372" width="880" height="118" rx="10" fill="var(--color-surface)" stroke="var(--color-border)" strokeWidth="1.5" />
      <text x="36" y="396" fontSize="13" fontWeight="700" fill="var(--color-fg)">{es ? 'Entrega — solo archivos estáticos' : 'Delivery — static files only'}</text>
      <text x="36" y="418" fontSize="10.5" fill="var(--color-fg)">{es ? '· caché de borde CDN · sin servidor de aplicación · sin base de datos en la ruta de la solicitud' : '· CDN edge cache · no application server · no database in the request path'}</text>
      <text x="36" y="438" fontSize="10.5" fill="var(--color-fg)">{es ? '· design system compartido (armazón · tema claro/oscuro · i18n EN/ES · marco de citas)' : '· shared design system (shell · light/dark theme · EN/ES i18n · citation framing)'}</text>
      <text x="36" y="462" fontSize="10.5" fill="var(--color-fg-subtle)">{es ? '· el navegador descarga el bundle una vez y corre el motor + ONNX localmente; misma entrada → misma salida' : '· the browser fetches the bundle once and runs the engine + ONNX locally; same input → same output'}</text>
      <line x1="460" y1="344" x2="460" y2="370" stroke="var(--color-fg-faint)" strokeWidth="2" markerEnd="url(#cc-ar)" />
    </svg>
  );

  const refsL = 'Refs';
  const tabs = [
    // 1 — COMPUTE TIERS
    {
      id: 'tiers', label: es ? 'Capas de cómputo' : 'Compute tiers',
      content: (
        <div className="prose">
          <p>{es
            ? 'ChargeCascade es un banco de física de conminución que corre por completo en el cliente: no hay servidor de aplicación ni base de datos. Todo lo que el visitante manipula son archivos estáticos servidos desde una red de distribución (CDN), y todo el cómputo ocurre o bien en vivo en el navegador o bien horneado de antemano en artefactos compactos que viajan con la página.'
            : 'ChargeCascade is a comminution-physics workbench that runs entirely client-side: there is no application server and no database. Everything the visitor manipulates is static files served from a content-delivery network, and all computation happens either live in the browser or baked ahead of time into compact artifacts that ship with the page.'}{' '}<Cite id="wills2016" paren /></p>
          <p>{es
            ? 'La división es deliberada. El motor de molino es lo bastante barato para correr interactivamente —recalcula la velocidad crítica, el movimiento de la carga, el régimen y la potencia en cada movimiento de control sin esfuerzo perceptible. Lo que es caro —entrenar el surrogate de potencia y el autoencoder OOD sobre miles de configuraciones— se hace OFFLINE y se entrega como el RESULTADO de ese cómputo (modelos ONNX + sus errores held-out), nunca re-derivado en la página.'
            : 'The split is deliberate. The mill engine is cheap enough to run interactively — it recomputes the critical speed, the charge motion, the regime and the power on every control move with no perceptible effort. What is expensive — training the power surrogate and the OOD autoencoder over thousands of configurations — is done OFFLINE and shipped as the RESULT of that computation (ONNX models + their held-out errors), never re-derived in the page.'}</p>
          <p>{es
            ? 'El contrato entre el navegador en vivo y el horneado offline es que CORREN EL MISMO MOTOR. El horneado importa el motor TypeScript exacto sin cambios y evalúa cada caso; el navegador importa el mismo motor y lo evalúa en vivo. Por eso los números que ves en el App, en Experimentos y en los artefactos son idénticos por construcción, no por coincidencia.'
            : 'The contract between the live browser and the offline bake is that they RUN THE SAME ENGINE. The bake imports the exact TypeScript engine unchanged and evaluates each case; the browser imports the same engine and evaluates it live. That is why the numbers you see in the App, in Experiments and in the artifacts are identical by construction, not by coincidence.'}</p>
          <div className="fig-svg">{ArchSVG}</div>
          <p className="muted small">{es
            ? 'Motor exacto compartido → en vivo en el navegador y en el horneado offline; el carril torch→ONNX produce el surrogate + el AE; el CDN solo entrega archivos.'
            : 'Shared exact engine → live in the browser and in the offline bake; the torch→ONNX lane produces the surrogate + the AE; the CDN only delivers files.'}</p>
          <Refs ids={['wills2016', 'napiermunn1996']} label={refsL} />
        </div>
      ),
    },
    // 2 — THE MILL ENGINE
    {
      id: 'engine', label: es ? 'El motor del molino' : 'The mill engine',
      content: (
        <div className="prose">
          <p>{es
            ? 'El corazón es una función pura: dada una operación de molino (geometría D, L; llenado J; tamaño de bola d; fracción de velocidad crítica φc; densidad de carga) devuelve un resultado completo —velocidad crítica, ω, los ángulos de partida por capa, las trayectorias, el régimen, la fracción centrifugando, la potencia y la energía de Bond. Es la ÚNICA fuente de verdad física; todo lo demás (el 3D, las pestañas, el horneado) la consume.'
            : 'The heart is a pure function: given a mill operation (geometry D, L; fill J; ball size d; fraction of critical speed φc; charge density) it returns a complete result — critical speed, ω, the per-shell departure angles, the trajectories, the regime, the centrifuging fraction, the power and the Bond duty. It is the SINGLE source of physics truth; everything else (the 3D, the tabs, the bake) consumes it.'}</p>
          <p>{es
            ? 'Internamente se organiza en módulos pequeños y verificables: la velocidad crítica (Nc = 42.3/√(D−d), φc, ω), el movimiento de la carga (la partida de Davis cos α = ω²r/g por capa + las parábolas + el shoulder/toe), la clasificación de régimen (las bandas de φc + la fracción centrifugando) y la potencia (Hogg–Fuerstenau, forma Morrell, Bond). Cada módulo corresponde a una sección de la Metodología, y sin dependencias externas: aritmética IEEE-754 pura, así que es determinista y auditable.'
            : 'Internally it is organised into small, verifiable modules: the critical speed (Nc = 42.3/√(D−d), φc, ω), the charge motion (the per-shell Davis departure cos α = ω²r/g + the parabolas + the shoulder/toe), the regime classification (the φc bands + the centrifuging fraction) and the power (Hogg–Fuerstenau, Morrell-form, Bond). Each module maps to a Methodology section, and with no external dependencies: pure IEEE-754 arithmetic, so it is deterministic and auditable.'}</p>
          <Equation tex="\texttt{evaluate}(op)\to\{N_c,\ \varphi_c,\ \alpha(r),\ \text{regime},\ f_{\text{cent}},\ P,\ W_{\text{Bond}}\}" caption={es ? 'la firma del motor: una operación de molino entra, un resultado físico completo sale' : 'the engine signature: a mill operation in, a complete physics result out'} />
          <ul>
            <li><InlineMath tex="op" /> — {es ? 'la operación de molino (D, L, J, d, φc, densidad de carga)' : 'the mill operation (D, L, J, d, φc, charge density)'}.</li>
            <li><InlineMath tex="N_c,\ \varphi_c,\ \omega" /> — {es ? 'velocidad crítica, fracción de crítica y velocidad angular' : 'critical speed, fraction of critical and angular speed'}.</li>
            <li><InlineMath tex="\alpha(r)" /> — {es ? 'ángulo de partida de Davis por capa de radio r' : 'Davis departure angle per shell of radius r'}; <InlineMath tex="f_{\text{cent}}" /> — {es ? 'fracción de capas centrifugando' : 'fraction of shells centrifuging'}.</li>
          </ul>
          <Callout variant="honest" title={es ? 'Una sola verdad, sin duplicación' : 'One truth, no duplication'}>
            {es ? 'No hay una "versión del navegador" y una "versión del horneado" del cálculo de potencia que pudieran divergir: hay UN motor, importado por ambos. Si el motor estuviera mal, lo estaría en vivo y offline por igual — no hay un camino para esconder un número fabricado.' : 'There is no "browser version" and "bake version" of the power calculation that could drift apart: there is ONE engine, imported by both. If the engine were wrong, it would be wrong live and offline alike — there is no path to hide a fabricated number.'}
          </Callout>
          <Refs ids={['wills2016', 'hoggfuerstenau1972']} label={refsL} />
        </div>
      ),
    },
    // 3 — THE 3D CHARGE
    {
      id: 'charge3d', label: es ? 'La carga 3D' : 'The 3D charge',
      content: (
        <div className="prose">
          <p>{es
            ? 'El molino 3D (Three.js) anima EXACTAMENTE las trayectorias que el motor computa: cada partícula sube con la pared, parte en su ángulo de Davis (cos α = φc²·r/R) y vuela una parábola balística hasta reimpactar en el toe. No es una animación decorativa —es la solución cinemática del motor, renderizada. Sube la velocidad y verás el abanico de cataract abrirse; ponla en φc = 1 y la carga se pega a la pared (centrifugado).'
            : 'The 3D mill (Three.js) animates EXACTLY the trajectories the engine computes: each particle rides up with the wall, departs at its Davis angle (cos α = φc²·r/R) and flies a ballistic parabola until it re-impacts at the toe. It is not a decorative animation — it is the engine\'s kinematic solution, rendered. Raise the speed and you watch the cataract fan open; set φc = 1 and the charge pins to the wall (centrifuging).'}{' '}<Cite id="davis1919" paren /></p>
          <p>{es
            ? 'La construcción sigue el patrón establecido (WebGLRenderer + OrbitControls + una nube de partículas instanciadas + dispose limpio al desmontar para no fugar contexto WebGL). Las posiciones de partícula no son aleatorias ni "físicas de juguete": se calculan a partir del ángulo de partida y la ecuación de vuelo libre de cada capa, las mismas ecuaciones de la Metodología.'
            : 'The construction follows the established pattern (WebGLRenderer + OrbitControls + an instanced particle cloud + clean dispose on unmount so the WebGL context does not leak). The particle positions are not random or "toy physics": they are computed from the departure angle and free-flight equation of each shell, the same equations as the Methodology.'}</p>
          <Equation tex="\vec{r}(t)=\begin{cases}\text{wall, rises with }\omega & t<t_{\text{dep}}\\[2pt] \text{parabola: } y=x\tan\alpha-\dfrac{g\,x^2}{2v^2\cos^2\alpha} & t\ge t_{\text{dep}}\end{cases}" caption={es ? 'la trayectoria de cada partícula 3D: arrastre por la pared, luego vuelo libre desde el ángulo de partida' : 'each 3D particle\'s trajectory: wall drag, then free flight from the departure angle'} />
          <Callout variant="honest" title={es ? 'Cinemático, no DEM' : 'Kinematic, not DEM'}>
            {es ? 'El 3D es un modelo CINEMÁTICO de partículas independientes siguiendo física publicada (Davis + parábola) — no un solve DEM de N cuerpos con colisiones y fricción de contacto. Es correcto como envolvente de trayectorias, no como simulación de cada choque. Un trazado DEM real es la mejora offline documentada, no un reemplazo silencioso.' : 'The 3D is a KINEMATIC model of independent particles following published physics (Davis + parabola) — not an N-body DEM solve with collisions and contact friction. It is correct as a trajectory envelope, not as a simulation of every collision. A real DEM trace is the documented offline upgrade, not a silent replacement.'}
          </Callout>
          <Refs ids={['davis1919', 'rosesullivan1957']} label={refsL} />
        </div>
      ),
    },
    // 4 — POWER COMPUTATION
    {
      id: 'power', label: es ? 'Cálculo de potencia' : 'Power computation',
      content: (
        <div className="prose">
          <p>{es
            ? 'La potencia se computa con el modelo de brazo de torque de Hogg–Fuerstenau: la masa de carga por el brazo del centroide por la gravedad por la velocidad angular. El término de llenado J(1−1.065J) tiene su pico cerca de J ≈ 0.47, y la potencia escala con D^2.5 por geometría — ambos emergen del modelo, no se imponen.'
            : 'Power is computed with the Hogg–Fuerstenau torque-arm model: the charge mass times the centroid arm times gravity times the angular speed. The fill term J(1−1.065J) peaks near J ≈ 0.47, and the power scales as D^2.5 by geometry — both emerge from the model, not imposed.'}{' '}<Cite id="hoggfuerstenau1972" paren /></p>
          <Equation tex="P_{\text{net}}=\omega\,M\,g\,a,\qquad M=\rho_c\pi R^2 L\,J,\qquad a=c\,R\sin\theta\,(1-1.065J)" caption={es ? 'el modelo de potencia implementado; c es la constante de calibración (un punto de anclaje)' : 'the implemented power model; c is the calibration constant (one anchor point)'} />
          <p>{es
            ? 'La MAGNITUD necesita una constante de calibración c que absorbe la fricción del cojinete, la eficiencia del motor y la geometría del lifter. El motor la fija a una referencia industrial real (~1.3 MW para el molino de bolas de 4×6 m), así que las potencias mostradas son realistas. Es honesto: c es UN ancla, no una predicción ciega — y junto a Hogg–Fuerstenau corre una forma Morrell CALIBRADA (un reescalado del mismo brazo de torque, no un modelo independiente) como compañera de consistencia. El C-model real de Morrell — validado a ±9.8% sobre 82 sets industriales — está citado pero no implementado.'
            : 'The MAGNITUDE needs a calibration constant c absorbing bearing friction, motor efficiency and lifter geometry. The engine fixes it to a real industrial reference (~1.3 MW for the 4×6 m ball mill), so the displayed powers are realistic. It is honest: c is ONE anchor, not a blind prediction — and alongside Hogg–Fuerstenau runs a CALIBRATED Morrell-form (a rescale of the same torque arm, not an independent model) as a consistency companion. Morrell\'s real C-model — validated to ±9.8% over 82 industrial sets — is cited but not implemented.'}{' '}<Cite id="morrell1996" paren /></p>
          <p>{es
            ? 'La ley de Bond se computa por separado como un cruce de cordura del consumo (W = 10·Wi·(1/√P80 − 1/√F80), kWh/t) — NO es la potencia de carga; es la energía específica de proceso para reducir de F80 a P80, y no anima con φc. El App las mantiene visiblemente distintas para no confundir potencia con energía.'
            : 'Bond\'s law is computed separately as a consumption sanity-check (W = 10·Wi·(1/√P80 − 1/√F80), kWh/t) — it is NOT the charge power; it is the specific process energy to reduce from F80 to P80, and it does not animate with φc. The App keeps the two visibly distinct so power is not confused with energy.'}{' '}<Cite id="bond1961" paren /></p>
          <Callout variant="honest" title={es ? 'Forma exacta, magnitud calibrada' : 'Exact shape, calibrated magnitude'}>
            {es ? 'La forma de la potencia (el término de llenado, el escalado D^2.5, la dependencia de φc) es exacta y publicada; la magnitud está anclada a ~1.3 MW. Honestidad clave: el motor NO atenúa el modelo de torque al centrifugar — a φc = 1 la potencia de tracción sigue alta; lo que colapsa es la molienda. Por eso C-CRITICAL (φc ≥ 1 → fracción centrifugando > 0, régimen = centrifuging) se verifica sobre la fracción/el régimen, y C-EMPTY (J = 0 → 0 potencia) es el control de potencia-cero. Ambos son controles analíticos exactos que el motor DEBE reproducir.' : 'The power shape (the fill term, the D^2.5 scaling, the φc dependence) is exact and published; the magnitude is anchored to ~1.3 MW. Key honesty: the engine does NOT taper the torque model when centrifuging — at φc = 1 the draw power stays high; what collapses is the grinding. So C-CRITICAL (φc ≥ 1 → centrifuging fraction > 0, regime = centrifuging) is verified on the fraction/regime, and C-EMPTY (J = 0 → 0 power) is the zero-power control. Both are exact analytic controls the engine MUST reproduce.'}
          </Callout>
          <Refs ids={['hoggfuerstenau1972', 'morrell1996', 'bond1961']} label={refsL} />
        </div>
      ),
    },
    // 5 — LEARNED MODELS (ONNX LANE)
    {
      id: 'learned', label: es ? 'Modelos aprendidos (ONNX)' : 'Learned models (ONNX)',
      content: (
        <div className="prose">
          <p>{es
            ? 'Dos modelos aprendidos se entrenan offline (torch) y se exportan a ONNX para correr EN VIVO en el navegador (onnxruntime-web). El primero es un surrogate de potencia: un MLP que mapea las features del molino directamente a la potencia, entrenado para reproducir el motor exacto. Su rol previsto son los barridos masivos (Monte-Carlo, mapas (φc, J)); ninguna pestaña publicada corre aún ese barrido — las pestañas en vivo usan el motor exacto sub-milisegundo, y la pestaña What-if compara el surrogate contra él. Su error held-out (~±12.5%) se reporta siempre, junto a la potencia exacta.'
            : 'Two learned models train offline (torch) and export to ONNX to run LIVE in the browser (onnxruntime-web). The first is a power surrogate: an MLP mapping the mill features directly to power, trained to reproduce the exact engine. Its intended role is mass sweeps (Monte-Carlo, (φc, J) maps); no shipped tab runs such a sweep yet — the live tabs use the exact sub-millisecond engine, and the What-if tab compares the surrogate against it. Its held-out error (~±12.5%) is always reported, alongside the exact power.'}</p>
          <Equation tex="\hat P=\text{MLP}_\theta(x),\qquad \theta^\*=\arg\min_\theta\tfrac1N\textstyle\sum_i(\text{MLP}_\theta(x_i)-P_i^{\text{exact}})^2" caption={es ? 'el surrogate se entrena a reproducir la potencia del motor exacto sobre las features físicas x' : 'the surrogate trains to reproduce the exact engine power over the physical features x'} />
          <p>{es
            ? 'El segundo protege al primero: un autoencoder OOD aprende a reconstruir las configuraciones del conjunto de entrenamiento; un molino con error de reconstrucción alto está FUERA de la envolvente, donde el surrogate extrapolaría y no se debe confiar. El umbral es el percentil 99 de los errores de entrenamiento; la separación held-out es un AUC de ~0.92.'
            : 'The second protects the first: an OOD autoencoder learns to reconstruct the training-set configurations; a mill with high reconstruction error is OUTSIDE the envelope, where the surrogate would extrapolate and must not be trusted. The threshold is the p99 of the training errors; the held-out separation is an AUC of ~0.92.'}</p>
          <Equation tex="\text{OOD}(x)=\lVert x-\text{AE}(x)\rVert^2,\qquad \text{flag if }\text{OOD}(x)>\theta_{p99}\quad(\text{AUC}\approx0.92)" caption={es ? 'el puntaje OOD es el error de reconstrucción; sobre el umbral p99 se marca el molino' : 'the OOD score is the reconstruction error; above the p99 threshold the mill is flagged'} />
          <Callout variant="honest" title={es ? 'Herramientas, no reemplazos' : 'Tools, not replacements'}>
            {es ? 'El motor exacto corre en vivo por defecto y es siempre la autoridad. El surrogate (~±12.5%) es el carril aprendido medido — comparado en vivo contra el exacto en la pestaña What-if; ninguna funcionalidad publicada lo consume aún en masa. El AE (AUC ~0.92) marca cuándo el surrogate extrapola. Ambos errores se reportan tal cual — sin victorias fabricadas, sin presentar un estimador rápido como verdad.' : 'The exact engine runs live by default and is always the authority. The surrogate (~±12.5%) is the measured learned lane — compared live against the exact engine on the What-if tab; no shipped feature consumes it in bulk yet. The AE (AUC ~0.92) flags when the surrogate extrapolates. Both errors are reported as they land — no fabricated wins, no presenting a fast estimator as truth.'}
          </Callout>
          <Refs ids={['hoggfuerstenau1972', 'morrell1996']} label={refsL} />
        </div>
      ),
    },
    // 6 — DATA CONTRACTS
    {
      id: 'contracts', label: es ? 'Contratos de datos' : 'Data contracts',
      content: (
        <div className="prose">
          <p>{es
            ? 'Dos contratos de datos (validados en Python) definen lo que el sistema acepta. El primero describe un molino + su carga: tipo (SAG / bolas / barras), diámetro D, largo L, llenado J, tamaño de bola d, fracción de velocidad crítica φc y densidad de carga, cada campo con su rango físico y sus guardas de honestidad (rechaza geometrías imposibles en vez de devolver un número sin sentido). El segundo describe un caso: el molino más sus metadatos (nombre, categoría, real-o-sintético) para el horneado.'
            : 'Two data contracts (validated in Python) define what the system accepts. The first describes a mill + its charge: type (SAG / ball / rod), diameter D, length L, fill J, ball size d, fraction of critical speed φc and charge density, each field with its physical range and honesty guards (it rejects impossible geometries rather than returning a meaningless number). The second describes a case: the mill plus its metadata (name, category, real-or-synthetic) for the bake.'}</p>
          <p>{es
            ? 'El contrato es lo que permite "trae tu propio molino": un usuario puede ingresar un SAG, un molino de bolas o uno de barras reales y el motor lo evalúa con la misma física, siempre que pase las guardas de rango. La marca real-o-sintético es obligatoria, así cada caso declara honestamente si es un molino industrial publicado o una configuración ilustrativa.'
            : 'The contract is what enables "bring your own mill": a user can enter a real SAG, ball or rod mill and the engine evaluates it with the same physics, provided it passes the range guards. The real-or-synthetic flag is mandatory, so every case honestly declares whether it is a published industrial mill or an illustrative configuration.'}</p>
          <Callout variant="honest" title={es ? 'Guardas de rango, no recortes silenciosos' : 'Range guards, not silent clamps'}>
            {es ? 'Un molino fuera de rango se RECHAZA con un error explícito, no se recorta en silencio a un valor "cercano" que produciría un número engañoso. El usuario sabe que su entrada no es válida en vez de recibir una potencia plausible pero falsa.' : 'An out-of-range mill is REJECTED with an explicit error, not silently clamped to a "nearby" value that would produce a misleading number. The user knows their input is invalid rather than receiving a plausible but false power.'}
          </Callout>
          <Refs ids={['wills2016', 'napiermunn1996']} label={refsL} />
        </div>
      ),
    },
    // 7 — VERIFICATION
    {
      id: 'verify', label: es ? 'Verificación' : 'Verification',
      content: (
        <div className="prose">
          <p>{es
            ? 'El motor se verifica contra oráculos analíticos —resultados conocidos de la física, no auto-referencias. Diez oráculos cubren: la velocidad crítica (Nc = 42.3/√(D−d) para un molino de referencia), el inicio de centrifugado a φc = 1 (la fracción centrifugando se vuelve positiva, el régimen pasa a centrifuging), el pico de potencia en J ≈ 0.47, el escalado P ∝ D^2.5 (duplicar D multiplica la potencia por ~5.7), la magnitud realista (~1.3 MW de referencia), la potencia cero a J = 0 y la ley de Bond.'
            : 'The engine is verified against analytic oracles — known physics results, not self-references. Ten oracles cover: the critical speed (Nc = 42.3/√(D−d) for a reference mill), the φc = 1 centrifuging onset (the centrifuging fraction turns positive, the regime switches to centrifuging), the J ≈ 0.47 power peak, the P ∝ D^2.5 scaling (doubling D multiplies power by ~5.7), the realistic magnitude (~1.3 MW reference), the zero power at J = 0 and Bond\'s law.'}</p>
          <Equation tex="\text{C-CRITICAL: }\varphi_c\ge1\Rightarrow f_{\text{cent}}>0,\ \text{centrifuging};\quad \text{C-EMPTY: }J=0\Rightarrow P=0;\quad \frac{P(2D)}{P(D)}\approx2^{2.5}\approx5.7" caption={es ? 'tres de los oráculos exactos que la verificación exige al motor (C-CRITICAL sobre la fracción/régimen, no la potencia)' : 'three of the exact oracles the verification holds the engine to (C-CRITICAL on the fraction/regime, not the power)'} />
          <p>{es
            ? 'El pipeline completo se valida de punta a punta: el linter (ruff) y los tests de los dos contratos (pytest), el horneado de los 10 casos, una verificación de artefactos, una re-ejecución byte-idéntica (la prueba de determinismo: misma entrada → mismos bytes) y el build del frontend. Si cualquiera falla, el release no sale.'
            : 'The full pipeline is validated end-to-end: the linter (ruff) and the two contracts\' tests (pytest), the bake of the 10 cases, an artifact check, a byte-identical re-run (the determinism proof: same input → same bytes) and the frontend build. If any fails, the release does not ship.'}</p>
          <Callout variant="honest" title={es ? 'Oráculos, no auto-confirmación' : 'Oracles, not self-confirmation'}>
            {es ? 'Los tests comparan contra resultados de física conocidos a priori (el pico en J≈0.47, el escalado D^2.5), no contra una salida anterior del propio motor. Eso impide que un bug "se confirme a sí mismo": un motor mal escrito falla el oráculo, no lo pasa.' : 'The tests compare against physics results known a priori (the J≈0.47 peak, the D^2.5 scaling), not against a prior output of the engine itself. That keeps a bug from "confirming itself": a wrong engine fails the oracle, it does not pass it.'}
          </Callout>
          <Refs ids={['hoggfuerstenau1972', 'wills2016']} label={refsL} />
        </div>
      ),
    },
    // 8 — DEPLOYMENT
    {
      id: 'deploy', label: es ? 'Despliegue' : 'Deployment',
      content: (
        <div className="prose">
          <p>{es
            ? 'El producto se entrega como activos estáticos pre-construidos —HTML, JavaScript, los modelos ONNX, los artefactos horneados— servidos directamente desde un CDN, sin servidor de aplicación ni base de datos en la ruta de la solicitud. El navegador descarga el bundle una vez y corre el motor + la inferencia ONNX localmente; el único "backend" es la caché de borde del CDN.'
            : 'The product ships as pre-built static assets — HTML, JavaScript, the ONNX models, the baked artifacts — served directly from a CDN, with no application server and no database in the request path. The browser fetches the bundle once and runs the engine + ONNX inference locally; the only "backend" is the CDN\'s edge cache.'}</p>
          <p>{es
            ? 'El armazón de aplicación —navegación, tema claro/oscuro, contenido bilingüe (EN/ES), el marco de citas y metodología, el modal de arquitectura ⓘ y el lenguaje visual (paleta, tipografía, convenciones de diagramas)— proviene de un design system compartido reutilizado en la suite de apps de analítica, así que ChargeCascade hereda un armazón consistente y solo aporta su física de dominio y sus artefactos.'
            : 'The application shell — navigation, light/dark theming, bilingual (EN/ES) content, the citation and methodology framing, the ⓘ architecture modal and the visual language (palette, typography, diagram conventions) — comes from a shared design system reused across the analytics-app suite, so ChargeCascade inherits a consistent shell and only contributes its domain physics and artifacts.'}</p>
          <Callout variant="strong" title={es ? 'Reproducible por construcción' : 'Reproducible by construction'}>
            {es ? 'Hosting estático + un motor determinista y sembrado significa que cada figura de la página es reproducible: no hay servicio en vivo cuyo estado pudiera derivar, así que la misma página siempre renderiza los mismos números.' : 'Static hosting + a deterministic, seeded engine means every figure on the page is reproducible: there is no live service whose state could drift, so the same page always renders the same numbers.'}
          </Callout>
          <Refs ids={['wills2016', 'napiermunn1996']} label={refsL} />
        </div>
      ),
    },
  ];

  return (
    <div className="page-body">
      <div className="page-head prose">
        <h1>{es ? 'Implementación' : 'Implementation'}</h1>
        <p className="lede">{es
          ? 'Un motor TypeScript exacto corre en vivo en el navegador (incluido el 3D) y, sin cambios, en el horneado offline → artefactos compactos. Un carril torch→ONNX produce el surrogate de potencia + el autoencoder OOD. Todo determinista, todo reproducible.'
          : 'An exact TypeScript engine runs live in the browser (including the 3D) and, unchanged, in the offline bake → compact artifacts. A torch→ONNX lane produces the power surrogate + the OOD autoencoder. All deterministic, all reproducible.'} <InlineMath tex="\varphi_c=N/N_c" /></p>
      </div>
      <Tabs tabs={tabs} ariaLabel={es ? 'implementación' : 'implementation'} />
    </div>
  );
}
