import { Callout, Cite, Equation, InlineMath, Refs, Tabs, useShellLang } from '@fasl-work/caos-app-shell';

// Shared themed SVG classes (CSS-var tokens only — repaint with the theme, no hardcoded hex).
const SVG_STYLE = `
  .cc-msvg .bx { fill: var(--color-surface-2, var(--color-surface)); stroke: var(--color-border); stroke-width: 1.1; }
  .cc-msvg .hi { stroke: var(--color-accent); } .cc-msvg .gd { stroke: var(--color-good); }
  .cc-msvg .t { fill: var(--color-fg); font-size: 11px; font-weight: 700; }
  .cc-msvg .s { fill: var(--color-fg-subtle); font-size: 9px; }
  .cc-msvg .ax { stroke: var(--color-border); stroke-width: 1; }
  .cc-msvg .shell { fill: none; stroke: var(--color-fg-subtle); stroke-width: 1.3; }
  .cc-msvg .toe { fill: var(--color-accent); opacity: 0.4; }
  .cc-msvg .ball { fill: var(--color-magenta); }
  .cc-msvg .cat { fill: none; stroke: var(--color-bad); stroke-width: 1.5; }
  .cc-msvg .la { fill: none; stroke: var(--color-accent); stroke-width: 2; }
  .cc-msvg .lg { fill: none; stroke: var(--color-good); stroke-width: 2; }
  .cc-msvg .vec { stroke: var(--color-bad); stroke-width: 1.6; }
  .cc-msvg .fl { fill: none; stroke: var(--color-fg-faint); stroke-width: 1.5; }
`;

export default function Methodology() {
  const es = useShellLang() === 'es';
  return (
    <article className="page-body prose">
      <style>{SVG_STYLE}</style>
      <h1>{es ? 'Metodología' : 'Methodology'}</h1>
      <p className="lede">{es
        ? 'Velocidad crítica → la partida de Davis de partícula única + el vuelo parabólico → los regímenes → la potencia (Hogg–Fuerstenau / forma Morrell / Bond) → los dos modelos aprendidos (surrogate de potencia + autoencoder OOD). Clásico a SOTA, con lo exacto siempre distinguido de lo ilustrativo.'
        : 'Critical speed → the Davis single-particle departure + the parabolic flight → the regimes → the power (Hogg–Fuerstenau / Morrell-form / Bond) → the two learned models (power surrogate + OOD autoencoder). Classical to SOTA, with the exact always distinguished from the illustrative.'}{' '}<InlineMath tex={String.raw`\varphi_c=N/N_c`} /></p>

      <Tabs ariaLabel={es ? 'metodología' : 'methodology'} tabs={[
        // ============================================================ CRITICAL SPEED
        {
          id: 'crit', label: es ? 'Velocidad crítica' : 'Critical speed',
          content: (
            <div className="cc-doc-sec">
              <p>{es ? 'Todo en la molienda de tambor se mide contra UNA velocidad de referencia: la velocidad crítica, a la que la capa más externa de carga centrifugaría — se pegaría a la pared en el tope del giro sin caer nunca. En ese punto la fuerza centrípeta requerida iguala exactamente al peso: ' : 'Everything in tumbling-mill grinding is measured against ONE reference speed: the critical speed, at which the outermost charge layer would centrifuge — pin to the wall at the top of the turn and never fall. At that point the required centripetal force exactly equals the weight: '}<InlineMath tex="m\,\omega^2 R = m g" />{es ? '. Despejando y pasando a rpm, con la corrección por el diámetro de bola (la bola gira a radio R−d/2):' : '. Solving and converting to rpm, with the ball-diameter correction (a ball orbits at radius R−d/2):'}</p>
              <Equation tex="N_c = \frac{42.3}{\sqrt{D-d}}\ \text{[rpm]},\qquad \varphi_c=\frac{N}{N_c}" caption={es ? 'velocidad crítica Nc (D = diámetro interno, d = diámetro de bola, ambos en m) y la fracción de velocidad crítica φc' : 'critical speed Nc (D = inside diameter, d = ball diameter, both in m) and the fraction of critical speed φc'} />
              <p>{es ? 'La constante ' : 'The constant '}<InlineMath tex="42.3=\tfrac{60}{2\pi}\sqrt{2g}" />{es ? ' es DERIVADA de la física, no ajustada a datos — una propiedad importante: significa que la velocidad crítica es exacta y transferible a cualquier molino, no un número calibrado. Los molinos industriales reales operan típicamente entre ' : ' is DERIVED from the physics, not fitted to data — an important property: it means the critical speed is exact and transferable to any mill, not a calibrated number. Real industrial mills typically operate between '}<InlineMath tex="\varphi_c\approx0.65" />{es ? ' y ' : ' and '}<InlineMath tex="0.82" />{es ? ' (los SAG más bajo, los de bolas más alto).' : ' (SAG mills lower, ball mills higher).'}{' '}<Cite id="wills2016" paren /></p>
              <p>{es ? 'Por qué importa tanto: φc es el ÚNICO parámetro adimensional que controla el régimen de movimiento. Dos molinos de tamaños distintos con el mismo φc tienen carga que se mueve de la misma forma (similaridad dinámica). Por eso el φc, no la velocidad en rpm, es la perilla con la que el ingeniero piensa, y por eso es el control central del App.' : 'Why it matters so much: φc is the ONLY dimensionless parameter controlling the motion regime. Two mills of different sizes at the same φc have charge that moves the same way (dynamic similarity). That is why φc, not the rpm speed, is the knob the engineer thinks in, and why it is the App\'s central control.'}</p>
              <p>{es ? 'El segundo control es la fracción de llenado J — qué tanto del volumen del molino ocupa la carga. Junto, (φc, J) fijan el régimen y la potencia. La velocidad crítica entra en TODO lo que sigue: el ángulo de partida de Davis lleva φc², la transición de régimen es en bandas de φc, y la potencia escala con la velocidad.' : 'The second control is the fill fraction J — how much of the mill volume the charge occupies. Together, (φc, J) set the regime and the power. The critical speed enters EVERYTHING that follows: the Davis departure angle carries φc², the regime transition is in φc bands, and the power scales with speed.'}</p>
              <p>{es ? 'La velocidad angular sale directo de φc, y la condición de centrifugado por capa también: una capa de radio r centrifuga cuando la centrípeta requerida supera lo que la gravedad puede dar, es decir cuando φc²·r/R ≥ 1. A φc = 1 esa condición la alcanza solo la capa de la pared (r = R); por eso la velocidad crítica es el umbral exacto del centrifugado.' : 'The angular speed comes straight from φc, and so does the per-shell centrifuging condition: a shell of radius r centrifuges when the required centripetal force exceeds what gravity can supply, i.e. when φc²·r/R ≥ 1. At φc = 1 only the wall shell (r = R) meets it; that is why the critical speed is the exact centrifuging threshold.'}</p>
              <Equation tex="\omega = \frac{2\pi}{60}\,\varphi_c N_c,\qquad \varphi_c^2\,\frac{r}{R}\ge1\ \Leftrightarrow\ r\ge\frac{R}{\varphi_c^2}" caption={es ? 'velocidad angular ω y la condición de centrifugado por capa; a φc = 1 el radio umbral es R (solo la pared)' : 'angular speed ω and the per-shell centrifuging condition; at φc = 1 the threshold radius is R (the wall only)'} />
              <figure className="cc-fig">
                <svg viewBox="0 0 460 180" width="100%" role="img" className="cc-msvg" aria-label={es ? 'balance de fuerzas en la velocidad crítica' : 'force balance at critical speed'}>
                  <circle className="shell" cx="120" cy="95" r="62" /><circle className="ball" cx="120" cy="33" r="6" />
                  <line className="vec" x1="120" y1="33" x2="120" y2="8" /><text className="s" x="124" y="14">mg ↓</text>
                  <line className="vec" x1="120" y1="33" x2="120" y2="58" style={{ stroke: 'var(--color-accent)' }} /><text className="s" x="124" y="52">mω²R ↑</text>
                  <text className="s" x="70" y="170">{es ? 'en Nc: mω²R = mg → la bola del tope nunca cae' : 'at Nc: mω²R = mg → the top ball never falls'}</text>
                  <text className="t" x="250" y="40">{es ? 'φc bajo → la carga cae' : 'low φc → charge falls'}</text>
                  <text className="t" x="250" y="64" style={{ fill: 'var(--color-bad)' }}>{es ? 'φc = 1 → centrifuga' : 'φc = 1 → centrifuges'}</text>
                  <text className="s" x="250" y="92">Nc = 42.3 / √(D − d)</text>
                  <text className="s" x="250" y="112">{es ? 'molinos reales: φc ≈ 0.65–0.82' : 'real mills: φc ≈ 0.65–0.82'}</text>
                </svg>
                <figcaption>{es ? 'En la velocidad crítica la centrípeta iguala al peso; φc = N/Nc es la perilla adimensional del régimen.' : 'At critical speed the centripetal force equals the weight; φc = N/Nc is the dimensionless regime knob.'}</figcaption>
              </figure>
              <Callout variant="honest" title={es ? 'Exacto y transferible' : 'Exact and transferable'}>
                {es ? 'La velocidad crítica y φc son física exacta — valen para un molino real medido tal cual, sin calibración. Importante y honesto: el control C-CRITICAL NO es "la potencia cae a 0". El motor sigue traccionando torque aun centrifugando (no atenúa el modelo de potencia publicado), así que a φc = 1 la potencia de tracción sigue alta. Lo que el motor DEBE reproducir es que a φc ≥ 1 la fracción centrifugando se vuelve POSITIVA y el régimen pasa a centrifuging — la molienda útil colapsa aunque la potencia siga alta. (El control de potencia-cero es C-EMPTY: J = 0 → sin carga → 0 potencia.)' : 'The critical speed and φc are exact physics — they hold for a real measured mill as written, with no calibration. Important and honest: the C-CRITICAL control is NOT "power drops to 0". The motor keeps drawing torque even while centrifuging (it does not taper the published power model), so at φc = 1 the draw power stays high. What the engine MUST reproduce is that at φc ≥ 1 the centrifuging fraction turns POSITIVE and the regime switches to centrifuging — useful grinding collapses even though the power stays high. (The zero-power control is C-EMPTY: J = 0 → no charge → 0 power.)'}
              </Callout>
              <Refs ids={['wills2016', 'rosesullivan1957']} label="Refs" />
            </div>
          ),
        },
        // ============================================================ CHARGE MOTION (DAVIS)
        {
          id: 'davis', label: es ? 'Movimiento de la carga' : 'Charge motion',
          content: (
            <div className="cc-doc-sec">
              <p>{es ? 'Davis (1919) resolvió el movimiento de la carga a nivel de UNA partícula, y esa solución de partícula única sigue siendo la base de toda visualización de carga. Un elemento en una capa radial de radio ' : 'Davis (1919) solved the charge motion at the level of ONE particle, and that single-particle solution is still the basis of every charge visualisation. An element on a radial shell at radius '}<InlineMath tex="r" />{es ? ' es llevado por la pared (por fricción) subiendo hasta el ÁNGULO DE PARTIDA: el punto donde la componente radial de la gravedad ya no alcanza para dar la fuerza centrípeta ' : ' is carried up by the wall (by friction) until the DEPARTURE ANGLE: the point where the radial component of gravity can no longer supply the centripetal force '}<InlineMath tex="m\omega^2 r" />{es ? '. Igualando:' : '. Equating:'}</p>
              <Equation tex="\cos\alpha = \frac{\omega^2 r}{g} = \varphi_c^2\,\frac{r}{R}" caption={es ? 'ángulo de partida α (desde la vertical); depende solo de φc y del radio relativo r/R' : 'departure angle α (from vertical); depends only on φc and the relative radius r/R'} />
              <p>{es ? 'Después de partir, la partícula es un proyectil: vuela una PARÁBOLA balística hasta reimpactar en el pie (toe) de la carga, donde su energía cinética rompe el mineral. La trayectoria, con velocidad de partida ' : 'After departing, the particle is a projectile: it flies a ballistic PARABOLA until it re-impacts at the charge toe, where its kinetic energy breaks the ore. The trajectory, with departure speed '}<InlineMath tex="v=\omega r" />{es ? ', es:' : ', is:'}</p>
              <Equation tex="y = x\tan\alpha - \frac{g\,x^2}{2v^2\cos^2\alpha},\qquad v=\omega r" caption={es ? 'la parábola de vuelo libre desde el punto de partida; x, y relativos al punto de partida' : 'the free-flight parabola from the departure point; x, y relative to the departure point'} />
              <p>{es ? 'El movimiento del molino completo es la SUPERPOSICIÓN de estas trayectorias sobre todas las capas de carga. Las capas externas (r = R) parten cerca del tope (α pequeño) y vuelan más alto y más lejos; las capas internas parten más tarde y vuelan arcos más cortos. El conjunto es el "abanico de cataract" que el 3D anima — y por eso el régimen no es un estado único sino una envolvente de trayectorias.' : 'The full mill motion is the SUPERPOSITION of these trajectories over all charge shells. The outer shells (r = R) depart near the top (small α) and fly highest and farthest; the inner shells depart later and fly shorter arcs. The ensemble is the "cataract fan" the 3D animates — and that is why the regime is not a single state but an envelope of trajectories.'}</p>
              <p>{es ? 'La condición de centrifugado cae de la misma ecuación: cuando ' : 'The centrifuging condition falls out of the same equation: when '}<InlineMath tex="\varphi_c^2\,r/R\ge1" />{es ? ' el coseno pediría un valor > 1 — imposible — así que esa capa NUNCA parte: gira pegada a la pared. La fracción de capas con esa condición da el % de carga centrifugando, el detector preciso de la transición.' : ' the cosine would need a value > 1 — impossible — so that shell NEVER departs: it turns pinned to the wall. The fraction of shells meeting that condition gives the % of charge centrifuging, the precise onset detector.'}</p>
              <figure className="cc-fig">
                <svg viewBox="0 0 460 190" width="100%" role="img" className="cc-msvg" aria-label={es ? 'partida de Davis y abanico de trayectorias parabólicas' : 'Davis departure and parabolic trajectory fan'}>
                  <circle className="shell" cx="150" cy="100" r="70" />
                  <path className="toe" d="M150,100 L150,170 A70,70 0 0,1 92,128 Z" />
                  <circle className="ball" cx="108" cy="58" r="4" /><circle className="ball" cx="150" cy="42" r="4" /><circle className="ball" cx="192" cy="58" r="4" />
                  <path className="cat" d="M192,58 C250,30 300,70 300,150" /><path className="cat" d="M150,42 C210,20 270,60 280,150" style={{ opacity: 0.6 }} />
                  <text className="s" x="200" y="40">{es ? 'capa externa parte primero' : 'outer shell departs first'}</text>
                  <text className="s" x="250" y="165">{es ? 'impacto en el toe' : 'impact at the toe'}</text>
                  <text className="s" x="90" y="186">cos α = φc²·r/R · {es ? 'parábola: y = x·tanα − g·x²/(2v²cos²α)' : 'parabola: y = x·tanα − g·x²/(2v²cos²α)'}</text>
                </svg>
                <figcaption>{es ? 'Cada capa parte en su propio ángulo de Davis y vuela una parábola; el conjunto es el abanico de cataract.' : 'Each shell departs at its own Davis angle and flies a parabola; the ensemble is the cataract fan.'}</figcaption>
              </figure>
              <Callout variant="honest" title={es ? 'Cinemática, no DEM' : 'Kinematic, not DEM'}>
                {es ? 'Las partículas del 3D siguen EXACTAMENTE el ángulo de partida de Davis + la parábola — física publicada, no inventada. Pero es un modelo CINEMÁTICO de partículas independientes: no hay colisiones partícula-partícula ni fricción de contacto (eso es DEM, un solve de N cuerpos, la mejora offline documentada). Lo que ves es correcto como envolvente de trayectorias, no como una simulación de cada choque.' : 'The 3D particles follow EXACTLY the Davis departure angle + the parabola — published physics, not invented. But it is a KINEMATIC model of independent particles: there are no particle–particle collisions or contact friction (that is DEM, an N-body solve, the documented offline upgrade). What you see is correct as a trajectory envelope, not as a simulation of every collision.'}
              </Callout>
              <Refs ids={['davis1919', 'rosesullivan1957']} label="Refs" />
            </div>
          ),
        },
        // ============================================================ REGIMES
        {
          id: 'regime', label: es ? 'Regímenes' : 'Regimes',
          content: (
            <div className="cc-doc-sec">
              <p>{es ? 'La transición que se observa al subir la velocidad no es continua: pasa por regímenes cualitativamente distintos, cada uno con un mecanismo de molienda diferente, en bandas de φc (Wills & Finch; Napier-Munn et al.).' : 'The transition you watch as speed rises is not continuous: it passes through qualitatively distinct regimes, each with a different grinding mechanism, in φc bands (Wills & Finch; Napier-Munn et al.).'}</p>
              <ul>
                <li><b>{es ? 'slumping' : 'slumping'}</b> <InlineMath tex="\varphi_c\lesssim0.4" /> — {es ? 'la carga resbala y se desploma sobre sí misma; molienda mínima.' : 'the charge slips and slumps on itself; minimal grinding.'}</li>
                <li><b>cascading</b> <InlineMath tex="0.4\text{–}0.65" /> — {es ? 'rueda por la superficie libre; molienda por ABRASIÓN (apta para producto fino).' : 'rolls down the free surface; ABRASION grinding (good for fine product).'}</li>
                <li><b>cataracting</b> <InlineMath tex="0.65\text{–}0.9" /> — {es ? 'arcos parabólicos, IMPACTO en el toe; el régimen de los molinos SAG (rompe mineral grueso).' : 'parabolic arcs, IMPACT at the toe; the SAG-mill regime (breaks coarse ore).'}</li>
                <li><b>centrifuging</b> <InlineMath tex="\varphi_c\gtrsim0.9" /> — {es ? 'la capa externa se pega a la pared; la molienda COLAPSA.' : 'the outer layer pins to the wall; grinding COLLAPSES.'}</li>
              </ul>
              <p>{es ? 'El detector preciso del inicio de centrifugado es la FRACCIÓN DE CAPAS centrifugando — el conjunto de radios r para los que la condición de Davis ya no permite partir:' : 'The precise onset detector of centrifuging is the FRACTION OF SHELLS centrifuging — the set of radii r for which the Davis condition no longer allows departure:'}</p>
              <Equation tex="f_{\text{cent}}^{\text{cont}}(\varphi_c)=\frac{1}{R}\int_{r:\,\varphi_c^2 r/R\ge1} dr = \max\!\left(0,\ 1-\frac{1}{\varphi_c^2}\right)" caption={es ? 'fracción centrifugando en el límite CONTINUO (integrando sobre todas las capas hasta la pared); el inicio analítico está en φc = 1' : 'centrifuging fraction in the CONTINUUM limit (integrating over all shells to the wall); the analytic onset is at φc = 1'} />
              <p>{es ? 'El motor no evalúa ese continuo sino una MUESTRA discreta de capas (9 capas sobre r ∈ [0.5R, R−d/2]); una capa centrifuga cuando φc²·r/R ≥ 1. Por eso, cerca de φc = 1, la fracción que el motor reporta es un valor pequeño y POSITIVO (las capas más externas de la muestra) en vez de un cero exacto — exactamente lo que muestra el caso de control horneado C-CRITICAL. La fórmula continua da el inicio; el motor muestreado da el valor realizable y dependiente de la geometría que el App despliega.' : 'The engine evaluates not that continuum but a DISCRETE sample of shells (9 shells over r ∈ [0.5R, R−d/2]); a shell centrifuges when φc²·r/R ≥ 1. So near φc = 1, the fraction the engine reports is a small POSITIVE value (the outermost sampled shells) rather than an exact zero — exactly what the baked C-CRITICAL control case shows. The continuum formula gives the onset; the sampled engine gives the realizable, geometry-dependent value the App displays.'}</p>
              <p>{es ? 'Dónde cae el toe (el punto de impacto) también es cuantitativo: la envolvente de las parábolas de las capas externas define el ángulo de hombro (shoulder, donde la carga deja la pared) y el ángulo de pie (toe, donde reimpacta). La diferencia hombro−pie es el "ángulo de carga" que aparece en el modelo de potencia.' : 'Where the toe (the impact point) lands is also quantitative: the envelope of the outer shells\' parabolas defines the shoulder angle (where the charge leaves the wall) and the toe angle (where it re-impacts). The shoulder−toe difference is the "charge angle" that appears in the power model.'}</p>
              <Equation tex="\theta_{\text{toe}},\ \theta_{\text{shoulder}}\ \leftarrow\ \text{env}\{\text{trajectories}\},\qquad \Delta\theta=\theta_{\text{shoulder}}-\theta_{\text{toe}}" caption={es ? 'ángulos de pie y hombro de la envolvente de trayectorias; Δθ es el ángulo de carga que entra en la potencia' : 'toe and shoulder angles from the trajectory envelope; Δθ is the charge angle entering the power'} />
              <figure className="cc-fig">
                <svg viewBox="0 0 460 150" width="100%" role="img" className="cc-msvg" aria-label={es ? 'diagrama de fase de regímenes por φc' : 'regime phase diagram by φc'}>
                  <line className="ax" x1="30" y1="100" x2="440" y2="100" /><text className="s" x="380" y="120">φc →</text>
                  {[[30, 130, 'slump', 'fl'], [130, 230, 'cascade', 'gd'], [230, 350, 'cataract', 'la'], [350, 440, 'centrifuge', 'cat']].map(([x1, x2, lbl, cls], i) => (
                    <g key={i}><line className={cls as string} x1={x1 as number} y1="100" x2={x2 as number} y2="100" style={{ strokeWidth: 5 }} /><text className="s" x={((x1 as number) + (x2 as number)) / 2 - 18} y="86">{lbl as string}</text></g>
                  ))}
                  <text className="s" x="118" y="138">0.4</text><text className="s" x="218" y="138">0.65</text><text className="s" x="338" y="138">0.9</text><text className="s" x="430" y="138">1.0</text>
                  <text className="s" x="170" y="60">{es ? 'abrasión' : 'abrasion'}</text><text className="s" x="270" y="60">{es ? 'impacto (SAG)' : 'impact (SAG)'}</text>
                </svg>
                <figcaption>{es ? 'Los cuatro regímenes en bandas de φc: cada uno un mecanismo de molienda distinto; el centrifugado mata la molienda.' : 'The four regimes in φc bands: each a distinct grinding mechanism; centrifuging kills grinding.'}</figcaption>
              </figure>
              <Callout variant="honest" title={es ? 'Bandas vs inicio exacto' : 'Bands vs exact onset'}>
                {es ? 'Las bandas de φc (0.4 / 0.65 / 0.9) son convenciones de la literatura, ÚTILES pero aproximadas — la transición real depende también del llenado y de los lifters. Lo EXACTO es el umbral de centrifugado en φc = 1: en el continuo la fracción es 0 por debajo y crece después; el motor, que muestrea capas discretas, la reporta como un valor pequeño y positivo justo en el inicio. El App muestra la fracción muestreada (lo realizable), no la idealización — sin maquillar el cero.' : 'The φc bands (0.4 / 0.65 / 0.9) are literature conventions, USEFUL but approximate — the real transition also depends on fill and lifters. What is EXACT is the centrifuging threshold at φc = 1: in the continuum the fraction is 0 below and rises after; the engine, sampling discrete shells, reports it as a small positive value right at the onset. The App shows the sampled fraction (the realizable one), not the idealization — no airbrushed zero.'}
              </Callout>
              <Refs ids={['wills2016', 'napiermunn1996']} label="Refs" />
            </div>
          ),
        },
        // ============================================================ POWER
        {
          id: 'power', label: es ? 'Potencia' : 'Power',
          content: (
            <div className="cc-doc-sec">
              <p>{es ? 'La potencia al eje es lo que el molino le cuesta a la planta, y Hogg & Fuerstenau (1972) la derivaron del TORQUE: la carga, vista como un cuerpo rígido girando, tiene su centro de masa desplazado del eje, y mantenerlo levantado contra la gravedad cuesta torque. La potencia neta es ese torque por la velocidad angular:' : 'The mill power draw is what the mill costs the plant, and Hogg & Fuerstenau (1972) derived it from the TORQUE: the charge, seen as a rigid body turning, has its centre of mass offset from the axis, and holding it lifted against gravity costs torque. The net power is that torque times the angular speed:'}</p>
              <Equation tex="P_{\text{net}} = \omega\,M\,g\,a,\qquad M=\rho_c\,\pi R^2 L\,J,\qquad a = c\,R\sin\theta\,(1-1.065\,J)" caption={es ? 'P = potencia neta; ω = velocidad angular; M = masa de carga (ρc = densidad, J = llenado); a = brazo de torque al centroide; θ = ángulo de carga' : 'P = net power; ω = angular speed; M = charge mass (ρc = density, J = fill); a = torque arm to the centroid; θ = charge angle'} />
              <p>{es ? 'El término de llenado ' : 'The fill term '}<InlineMath tex="J(1-1.065J)" />{es ? ' tiene un máximo: derivando, la potencia llega a su pico cerca de ' : ' has a maximum: differentiating, the power peaks near '}<InlineMath tex="J\approx0.47" />{es ? '. Esa es la clásica regla de "potencia máxima al 45–50% de llenado" — no una heurística, sino una consecuencia directa de cómo el centro de masa de la carga se mueve con el llenado. Por geometría, la potencia escala fuerte con el tamaño: ' : '. That is the classic "power peaks at 45–50% fill" rule — not a heuristic but a direct consequence of how the charge centre of mass moves with fill. By geometry, the power scales strongly with size: '}<InlineMath tex="P\propto D^{2.5}" />{es ? ', por lo que los molinos grandes dominan el consumo de la planta.' : ', so large mills dominate the plant\'s consumption.'}</p>
              <Equation tex="\frac{dP}{dJ}=0\ \Rightarrow\ \frac{d}{dJ}\big[J(1-1.065J)\big]=1-2.13\,J=0\ \Rightarrow\ J^\*=\frac{1}{2.13}\approx0.469" caption={es ? 'el llenado que maximiza la potencia, derivado del término J(1−1.065J) — la regla del 45–50% no es heurística, es el máximo exacto' : 'the fill that maximises power, derived from the J(1−1.065J) term — the 45–50% rule is not a heuristic, it is the exact maximum'} />
              <p>{es ? 'La forma del modelo es exacta; la MAGNITUD necesita una constante de calibración c (que absorbe la fricción del cojinete, la eficiencia del motor y la geometría del lifter). El App la fija a una referencia industrial real: ~1.3 MW para el molino de bolas de 4×6 m. Eso hace que las potencias mostradas sean realistas, no inventadas, pero la calibración es honesta: es UN punto de anclaje, no una predicción ciega.' : 'The model\'s shape is exact; the MAGNITUDE needs a calibration constant c (absorbing bearing friction, motor efficiency and lifter geometry). The App fixes it to a real industrial reference: ~1.3 MW for the 4×6 m ball mill. That makes the displayed powers realistic, not invented, but the calibration is honest: it is ONE anchor point, not a blind prediction.'}</p>
              <p>{es ? 'El modelo de Morrell (1996) es la referencia SOTA: trata la carga como un continuo entre el pie y el hombro en vez de un cuerpo rígido, y predice la potencia a ±9.8% sobre 82 conjuntos de datos industriales. El App NO implementa ese C-model completo: muestra una forma Morrell CALIBRADA — el mismo brazo de torque con un ángulo de levante efectivo acotado por la forma de la carga, reescalado 1.06× — junto a Hogg–Fuerstenau. Su cercanía es un chequeo de consistencia por construcción, no una validación de dos modelos independientes; el C-model real es la mejora documentada.' : 'Morrell\'s (1996) model is the SOTA reference: it treats the charge as a continuum between toe and shoulder rather than a rigid body, and predicts power to ±9.8% over 82 industrial data sets. The App does NOT implement that full C-model: it shows a CALIBRATED Morrell-form — the same torque arm driven by a bounded charge-shape effective lift angle, rescaled 1.06× — alongside Hogg–Fuerstenau. Their closeness is a consistency check by construction, not a two-independent-model validation; the real C-model is the documented upgrade.'}</p>
              <figure className="cc-fig">
                <svg viewBox="0 0 460 180" width="100%" role="img" className="cc-msvg" aria-label={es ? 'potencia vs llenado y el brazo de torque' : 'power vs fill and the torque arm'}>
                  <line className="ax" x1="40" y1="150" x2="240" y2="150" /><line className="ax" x1="40" y1="20" x2="40" y2="150" />
                  <path className="la" d="M44,148 C90,80 130,60 150,60 C180,62 210,100 236,140" />
                  <line x1="150" y1="20" x2="150" y2="150" className="ax" style={{ strokeDasharray: '3 3', stroke: 'var(--color-warn)' }} /><text className="s" x="124" y="34">J ≈ 0.47</text>
                  <text className="s" x="100" y="170">{es ? 'llenado J →' : 'fill J →'}</text><text className="s" x="6" y="90" transform="rotate(-90 14 90)">{es ? 'potencia' : 'power'}</text>
                  <circle className="shell" cx="350" cy="90" r="48" /><circle cx="350" cy="90" r="3" fill="var(--color-fg)" />
                  <circle cx="332" cy="112" r="3" fill="var(--color-magenta)" /><line className="vec" x1="350" y1="90" x2="332" y2="112" style={{ stroke: 'var(--color-accent)' }} />
                  <text className="s" x="300" y="160">{es ? 'brazo de torque al centroide' : 'torque arm to the centroid'}</text>
                </svg>
                <figcaption>{es ? 'La potencia llega a su pico cerca de J ≈ 0.47 (término de llenado) — el brazo de torque del centroide de la carga.' : 'Power peaks near J ≈ 0.47 (fill term) — the torque arm of the charge centroid.'}</figcaption>
              </figure>
              <Callout variant="honest" title={es ? 'Forma exacta, magnitud calibrada; Bond es energía, no potencia' : 'Exact shape, calibrated magnitude; Bond is energy, not power'}>
                {es ? 'La forma de la potencia (el término de llenado, el escalado con D, la dependencia de φc) es exacta y publicada; la magnitud está anclada a ~1.3 MW de referencia. La ley de Bond ' : 'The power shape (the fill term, the D-scaling, the φc dependence) is exact and published; the magnitude is anchored to a ~1.3 MW reference. Bond\'s law '}<InlineMath tex="W=10\,W_i(1/\sqrt{P_{80}}-1/\sqrt{F_{80}})" />{es ? ' es la ENERGÍA específica de proceso (kWh/t) para reducir de F80 a P80 — NO es la potencia de carga; es un cruce de cordura del consumo, no anima con φc.' : ' is the specific process ENERGY (kWh/t) to reduce from F80 to P80 — it is NOT the charge power; it is a consumption sanity-check, it does not animate with φc.'}{' '}<Cite id="bond1961" paren /> <Cite id="morrell1996" paren /></Callout>
              <Refs ids={['hoggfuerstenau1972', 'morrell1996', 'bond1961']} label="Refs" />
            </div>
          ),
        },
        // ============================================================ SURROGATE (LEARNED)
        {
          id: 'surrogate', label: es ? 'Surrogate de potencia' : 'Power surrogate',
          content: (
            <div className="cc-doc-sec">
              <p>{es ? 'El primer modelo aprendido es un SURROGATE: un perceptrón multicapa (MLP) que mapea las features del molino (D, L, J, tamaño de bola, φc, densidad de carga) directamente a la potencia, entrenado para REPRODUCIR el motor analítico exacto. No reemplaza al motor. Su rol previsto es acelerar barridos masivos (Monte-Carlo de incertidumbre, mapas de potencia sobre grillas (φc, J)); ninguna funcionalidad publicada corre aún ese barrido — las pestañas en vivo evalúan el motor exacto sub-milisegundo, y la pestaña What-if compara el surrogate contra él.' : 'The first learned model is a SURROGATE: a multilayer perceptron (MLP) mapping the mill features (D, L, J, ball size, φc, charge density) directly to power, trained to REPRODUCE the exact analytic engine. It does not replace the engine. Its intended role is to accelerate mass sweeps (uncertainty Monte-Carlo, power maps over (φc, J) grids); no shipped feature runs such a sweep yet — the live tabs evaluate the exact sub-millisecond engine, and the What-if tab compares the surrogate against it.'}</p>
              <Equation tex="\hat P=\text{MLP}_\theta(x),\qquad \theta^\*=\arg\min_\theta \tfrac{1}{N}\textstyle\sum_i \big(\text{MLP}_\theta(x_i)-P_i^{\text{exact}}\big)^2" caption={es ? 'el surrogate se entrena para reproducir la potencia del motor EXACTO (x = features del molino; P = potencia)' : 'the surrogate is trained to reproduce the EXACT engine power (x = mill features; P = power)'} />
              <p>{es ? 'Se entrena offline (torch → ONNX) y corre EN VIVO en el navegador (onnxruntime-web). Su error held-out se reporta tal cual — ~±12.5% sobre el conjunto de prueba no visto. Crucialmente, el App muestra SIEMPRE la potencia exacta junto a la del surrogate y el error en vivo entre ambas, así el surrogate nunca se presenta como verdad sino como un estimador rápido con incertidumbre declarada.' : 'It trains offline (torch → ONNX) and runs LIVE in the browser (onnxruntime-web). Its held-out error is reported as it lands — ~±12.5% on the unseen test set. Crucially, the App ALWAYS shows the exact power next to the surrogate\'s and the live error between them, so the surrogate is never presented as truth but as a fast estimator with stated uncertainty.'}</p>
              <Equation tex="\varepsilon=\frac{|\hat P-P^{\text{exact}}|}{P^{\text{exact}}}" caption={es ? 'el error relativo del surrogate vs el exacto, mostrado en vivo en la pestaña What-if junto a la potencia exacta' : 'the surrogate\'s relative error vs the exact, shown live on the What-if tab next to the exact power'} />
              <p>{es ? 'Por qué un MLP y no algo más simple: la potencia es no-lineal en φc y J (el término de llenado, el escalado con D), y un surrogate suave que captura esa superficie en microsegundos haría posible el Monte-Carlo interactivo (una extensión documentada, aún no publicada). Las features son cantidades físicas ya interpretables, no datos crudos, así que las salidas se pueden auditar contra la intuición.' : 'Why an MLP and not something simpler: power is non-linear in φc and J (the fill term, the D-scaling), and a smooth surrogate capturing that surface in microseconds would make interactive Monte-Carlo possible (a documented extension, not yet shipped). The features are already-interpretable physical quantities, not raw data, so the outputs can be audited against intuition.'}</p>
              <p>{es ? 'El conjunto de entrenamiento se genera por muestreo Latin-Hypercube del espacio de operación (D, L, J, d, φc, densidad) y se etiqueta con el motor exacto — es decir, las etiquetas son verdad analítica, no mediciones ruidosas, así que el error held-out mide puramente la capacidad del MLP de interpolar la superficie de potencia, sin confundirse con ruido de datos. El error se evalúa siempre sobre molinos no vistos en entrenamiento (partición sin fuga), nunca sobre el conjunto de ajuste.' : 'The training set is generated by Latin-Hypercube sampling of the operating space (D, L, J, d, φc, density) and labelled with the exact engine — so the labels are analytic truth, not noisy measurements, and the held-out error purely measures the MLP\'s ability to interpolate the power surface, not confounded with data noise. The error is always evaluated on mills unseen in training (a leakage-safe split), never on the fit set.'}</p>
              <figure className="cc-fig">
                <svg viewBox="0 0 460 130" width="100%" role="img" className="cc-msvg" aria-label={es ? 'pipeline del surrogate de potencia' : 'power surrogate pipeline'}>
                  {[[16, 'motor exacto', 'exact engine', 'gd'], [150, 'muestras (x,P)', 'samples (x,P)', 'bx'], [288, 'MLP → ONNX', 'MLP → ONNX', 'hi']].map(([x, esl, enl, cls], i) => (
                    <g key={i}><rect className={`bx ${cls}` as string} x={x as number} y="34" width="118" height="44" rx="8" /><text className="t" x={(x as number) + 59} y="60" textAnchor="middle" style={{ fontSize: 10 }}>{es ? esl as string : enl as string}</text></g>
                  ))}
                  <path className="fl" d="M136,56 H148" markerEnd="url(#cc-ar2)" /><path className="fl" d="M270,56 H286" markerEnd="url(#cc-ar2)" />
                  <defs><marker id="cc-ar2" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" fill="var(--color-fg-faint)" /></marker></defs>
                  <text className="s" x="16" y="104">{es ? 'surrogate: error VAN ~±12.5% held-out · vive en vivo (onnxruntime-web)' : 'surrogate: ~±12.5% held-out error · runs live (onnxruntime-web)'}</text>
                </svg>
                <figcaption>{es ? 'El motor exacto genera los datos; el MLP se entrena, exporta a ONNX y corre en vivo, medido contra el exacto.' : 'The exact engine generates the data; the MLP trains, exports to ONNX and runs live, measured against the exact.'}</figcaption>
              </figure>
              <Callout variant="honest" title={es ? 'El exacto es la autoridad' : 'The exact engine is the authority'}>
                {es ? 'El surrogate NO reemplaza el modelo de potencia: el exacto corre en vivo por defecto y es la referencia. El rol previsto del surrogate son los barridos masivos donde 10⁴ evaluaciones exactas sumarían; ninguna funcionalidad publicada corre aún ese barrido, y su error (~±12.5%) se reporta siempre. Sin victorias fabricadas.' : 'The surrogate does NOT replace the power model: the exact engine runs live by default and is the reference. The surrogate\'s intended role is mass sweeps where 10⁴ exact evaluations would add up; no shipped feature runs such a sweep yet, and its error (~±12.5%) is always reported. No fabricated wins.'}
              </Callout>
              <Refs ids={['hoggfuerstenau1972', 'morrell1996']} label="Refs" />
            </div>
          ),
        },
        // ============================================================ OOD-AE (LEARNED)
        {
          id: 'ood', label: es ? 'Autoencoder OOD' : 'OOD autoencoder',
          content: (
            <div className="cc-doc-sec">
              <p>{es ? 'El segundo modelo aprendido protege al primero. Un surrogate entrenado sobre un rango de molinos es confiable DENTRO de ese rango y poco confiable fuera (extrapola). El AUTOENCODER de escenarios aprende a reconstruir las configuraciones de molino del conjunto de entrenamiento; un molino con error de reconstrucción alto está FUERA de la envolvente — el surrogate estaría extrapolando y no se debe confiar en él ahí.' : 'The second learned model protects the first. A surrogate trained over a range of mills is trustworthy WITHIN that range and unreliable outside it (it extrapolates). The scenario AUTOENCODER learns to reconstruct the training-set mill configurations; a mill with high reconstruction error is OUTSIDE the envelope — the surrogate would be extrapolating and must not be trusted there.'}</p>
              <Equation tex="\text{AE}:\ x\to z\to \hat x,\qquad \text{OOD}(x)=\lVert x-\hat x\rVert^2" caption={es ? 'el autoencoder comprime x a un código z y reconstruye x̂; el puntaje OOD es el error de reconstrucción' : 'the autoencoder compresses x to a code z and reconstructs x̂; the OOD score is the reconstruction error'} />
              <p>{es ? 'El puntaje OOD se umbral­iza al percentil p99 de los errores de entrenamiento: un molino sobre ese umbral se MARCA como fuera de distribución. En datos held-out, el AE separa dentro/fuera de envolvente con un AUC de ~0.92 — bueno, no perfecto, y reportado como cae.' : 'The OOD score is thresholded at the p99 of the training errors: a mill above that threshold is FLAGGED as out-of-distribution. On held-out data, the AE separates in/out-of-envelope at an AUC of ~0.92 — good, not perfect, and reported as it lands.'}</p>
              <Equation tex="\text{flag if } \text{OOD}(x) > \theta_{p99},\qquad \text{AUC}_{\text{held-out}}\approx0.92" caption={es ? 'regla de marcado y la separación held-out (dentro vs fuera de la envolvente de entrenamiento)' : 'the flag rule and the held-out separation (in vs out of the training envelope)'} />
              <p>{es ? 'Por qué importa: sin el AE, un usuario que ingrese un molino exótico (un diámetro enorme, una densidad de carga rara) vería una predicción del surrogate sin saber que es una extrapolación ciega. El AE convierte eso en una advertencia honesta — "este molino está fuera de lo que el surrogate vio; confía en el motor exacto".' : 'Why it matters: without the AE, a user entering an exotic mill (a huge diameter, an odd charge density) would see a surrogate prediction with no warning it is a blind extrapolation. The AE turns that into an honest warning — "this mill is outside what the surrogate saw; trust the exact engine".'}</p>
              <p>{es ? 'Como el surrogate, el AE se entrena offline (torch → ONNX) y corre en vivo en el navegador, sobre las mismas features físicas. Es una herramienta de honestidad, no un adorno: existe precisamente para impedir que el surrogate se use ciegamente fuera de su envolvente.' : 'Like the surrogate, the AE trains offline (torch → ONNX) and runs live in the browser, over the same physical features. It is an honesty tool, not an ornament: it exists precisely to keep the surrogate from being used blindly outside its envelope.'}</p>
              <figure className="cc-fig">
                <svg viewBox="0 0 460 130" width="100%" role="img" className="cc-msvg" aria-label={es ? 'autoencoder OOD: reconstrucción y umbral' : 'OOD autoencoder: reconstruction and threshold'}>
                  {[[20, 'x', 'x'], [110, 'z', 'z'], [200, 'x̂', 'x̂']].map(([x, esl], i) => (
                    <g key={i}><rect className="bx hi" x={x as number} y="34" width="60" height="40" rx="7" /><text className="t" x={(x as number) + 30} y="58" textAnchor="middle">{esl as string}</text></g>
                  ))}
                  <path className="fl" d="M82,54 H108" markerEnd="url(#cc-ar3)" /><path className="fl" d="M172,54 H198" markerEnd="url(#cc-ar3)" />
                  <defs><marker id="cc-ar3" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" fill="var(--color-fg-faint)" /></marker></defs>
                  <text className="s" x="280" y="44">OOD = ‖x − x̂‖²</text>
                  <text className="s" x="280" y="64">{es ? 'marca si > umbral p99' : 'flag if > p99 threshold'}</text>
                  <text className="s" x="280" y="84">AUC ≈ 0.92 (held-out)</text>
                  <text className="s" x="20" y="104">{es ? 'reconstruir bien = dentro de envolvente; mal = el surrogate extrapola' : 'reconstruct well = in-envelope; badly = the surrogate extrapolates'}</text>
                </svg>
                <figcaption>{es ? 'El AE marca molinos fuera de la envolvente de entrenamiento, donde no se debe confiar en el surrogate.' : 'The AE flags mills outside the training envelope, where the surrogate must not be trusted.'}</figcaption>
              </figure>
              <Callout variant="honest" title={es ? 'Una herramienta de honestidad, medida' : 'An honesty tool, measured'}>
                {es ? 'El AUC ~0.92 se reporta tal cual — el AE es bueno separando dentro/fuera de envolvente pero no infalible. Es exactamente para eso: convertir una extrapolación silenciosa del surrogate en una advertencia visible. El motor exacto sigue corriendo en vivo y es siempre la autoridad.' : 'The ~0.92 AUC is reported as it lands — the AE is good at separating in/out-of-envelope but not infallible. That is exactly its job: to turn a silent surrogate extrapolation into a visible warning. The exact engine keeps running live and is always the authority.'}
              </Callout>
              <Refs ids={['napiermunn1996', 'wills2016']} label="Refs" />
            </div>
          ),
        },
      ]} />
    </article>
  );
}
