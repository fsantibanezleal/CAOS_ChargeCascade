import { Callout, Cite, Equation, InlineMath, Refs, useShellLang } from '@fasl-work/caos-app-shell';

export default function Introduction() {
  const es = useShellLang() === 'es';
  return (
    <article className="page-body prose">
      <h1>{es ? 'Introducción' : 'Introduction'}</h1>
      <p className="lede">{es
        ? 'En un molino de tambor la carga es invisible dentro del acero, pero cómo se mueve fija la potencia, la molienda y el desgaste del revestimiento. ChargeCascade hace visible esa física: de la geometría, el llenado, el tamaño de bola y la velocidad al régimen de carga, las trayectorias y la potencia, en vivo en 3D.'
        : "In a tumbling mill the charge is invisible inside the steel, yet how it moves sets the power, the grind and the liner wear. ChargeCascade makes that physics visible: from geometry, fill, ball size and speed to the charge regime, the trajectories and the power draw, live in 3D."}{' '}<InlineMath tex={String.raw`\varphi_c=N/N_c`} /></p>

      {/* ===== overview SVG ===== */}
      <figure className="cc-fig">
        <svg viewBox="0 0 880 250" width="100%" role="img" aria-labelledby="cc-ov-t cc-ov-d" style={{ display: 'block', fontFamily: 'var(--font-sans, system-ui, sans-serif)' }}>
          <title id="cc-ov-t">{es ? 'De la geometría y la velocidad del molino al régimen y la potencia' : 'From mill geometry and speed to the charge regime and power'}</title>
          <desc id="cc-ov-d">{es ? 'La geometría del molino, el llenado, el tamaño de bola y la fracción de velocidad crítica alimentan la velocidad crítica, la partida de Davis y las trayectorias, que determinan el régimen y la potencia.' : 'Mill geometry, fill, ball size and the fraction of critical speed feed the critical speed, the Davis departure and the trajectories, which determine the regime and the power.'}</desc>
          <style>{`
            .cc-ov .bx { fill: var(--color-surface-2, var(--color-surface)); stroke: var(--color-border); stroke-width: 1.2; }
            .cc-ov .hi { stroke: var(--color-accent); } .cc-ov .gd { stroke: var(--color-good); }
            .cc-ov .t { fill: var(--color-fg); font-size: 12px; font-weight: 700; }
            .cc-ov .s { fill: var(--color-fg-subtle); font-size: 9.5px; }
            .cc-ov .shell { fill: none; stroke: var(--color-fg-subtle); stroke-width: 1.3; }
            .cc-ov .toe { fill: var(--color-accent); opacity: 0.45; }
            .cc-ov .ball { fill: var(--color-magenta); }
            .cc-ov .cat { fill: none; stroke: var(--color-bad); stroke-width: 1.5; }
            .cc-ov .fl { fill: none; stroke: var(--color-fg-faint); stroke-width: 1.6; }
          `}</style>
          <defs><marker id="cc-ar" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" fill="var(--color-fg-faint)" /></marker></defs>
          <g className="cc-ov">
            <rect className="bx hi" x="12" y="22" width="180" height="150" rx="10" />
            <text className="t" x="26" y="44">{es ? 'El molino' : 'The mill'}</text>
            <circle className="shell" cx="100" cy="118" r="44" />
            <path className="toe" d="M100,118 L100,162 A44,44 0 0,1 60,132 Z" />
            <circle className="ball" cx="76" cy="108" r="3.5" /><circle className="ball" cx="90" cy="128" r="3.5" /><circle className="ball" cx="112" cy="134" r="3.5" />
            {/* cataract flight: departs the shoulder (upper right, on the shell), arcs over and lands on the toe
                (lower left). Every point stays INSIDE the r=44 shell (verified by sampling the Bezier). */}
            <path className="cat" d="M122,84 C110,78 84,150 72,146" />
            <text className="s" x="26" y="186">{es ? 'D · L · J(llenado) · bola d · φc' : 'D · L · J(fill) · ball d · φc'}</text>
            <rect className="bx" x="222" y="22" width="180" height="150" rx="10" />
            <text className="t" x="236" y="44">{es ? 'La física' : 'The physics'}</text>
            <text className="s" x="236" y="68">{es ? 'velocidad crítica Nc' : 'critical speed Nc'}</text>
            <text className="s" x="236" y="88">{es ? 'partida de Davis (cos α)' : 'Davis departure (cos α)'}</text>
            <text className="s" x="236" y="108">{es ? 'vuelo parabólico' : 'parabolic flight'}</text>
            <text className="s" x="236" y="128">{es ? 'régimen (cascada/catarata/' : 'regime (cascade/cataract/'}</text>
            <text className="s" x="236" y="142">{es ? 'centrifugado)' : 'centrifuge)'}</text>
            <text className="s" x="236" y="164">{es ? 'potencia Hogg–Fuerstenau' : 'Hogg–Fuerstenau power'}</text>
            <rect className="bx gd" x="432" y="22" width="180" height="150" rx="10" />
            <text className="t" x="446" y="44">{es ? 'El valor' : 'The value'}</text>
            <text className="s" x="446" y="70">{es ? 'potencia (MW)' : 'power draw (MW)'}</text>
            <text className="s" x="446" y="92">{es ? 'régimen que limita' : 'the binding regime'}</text>
            <text className="s" x="446" y="114">{es ? 'ángulos toe/shoulder' : 'toe/shoulder angles'}</text>
            <text className="s" x="446" y="136">{es ? 'capacidad' : 'capacity'}</text>
            <text className="s" x="446" y="164">{es ? 'recalculado en cada control' : 'recomputed on every control'}</text>
            <rect className="bx hi" x="642" y="22" width="226" height="150" rx="10" />
            <text className="t" x="656" y="44">{es ? '3D en vivo + ONNX' : 'live 3D + ONNX'}</text>
            <text className="s" x="656" y="68">{es ? 'carga 3D: DEM real (horneado)' : '3D charge: real DEM (baked)'}</text>
            <text className="s" x="656" y="88">{es ? '+ Davis cinemático (en vivo)' : '+ Davis kinematic (live)'}</text>
            <text className="s" x="656" y="112">{es ? 'surrogate de potencia (ONNX, medido)' : 'power surrogate (ONNX, measured)'}</text>
            <text className="s" x="656" y="132">{es ? 'autoencoder OOD (fuera de envolvente)' : 'OOD autoencoder (out-of-envelope)'}</text>
            <text className="s" x="656" y="160">{es ? 'C-CRITICAL · C-EMPTY (controles exactos)' : 'C-CRITICAL · C-EMPTY (exact controls)'}</text>
            <path className="fl" d="M192,97 H220" markerEnd="url(#cc-ar)" /><path className="fl" d="M402,97 H430" markerEnd="url(#cc-ar)" /><path className="fl" d="M612,97 H640" markerEnd="url(#cc-ar)" />
            <text className="s" x="12" y="210">{es ? 'Velocidad mal puesta o llenado mal elegido = potencia desperdiciada, capacidad perdida y revestimientos rotos por impacto contra el acero.' : 'A mis-set speed or wrong fill = wasted power, lost capacity and liners broken by impact against the steel.'}</text>
            <text className="s" x="12" y="230">{es ? 'C-CRITICAL (φc ≥ 1 → la carga centrifuga, la molienda colapsa) y C-EMPTY (J = 0 → 0 potencia) son controles analíticos exactos; nada está fabricado.' : 'C-CRITICAL (φc ≥ 1 → the charge centrifuges, grinding collapses) and C-EMPTY (J = 0 → 0 power) are exact analytic controls; nothing is fabricated.'}</text>
          </g>
        </svg>
        <figcaption>{es ? 'Geometría + velocidad → velocidad crítica + partida de Davis + trayectorias → régimen y potencia, en vivo.' : 'Geometry + speed → critical speed + Davis departure + trajectories → regime and power, live.'}</figcaption>
      </figure>

      <h2>{es ? 'El problema industrial' : 'The industrial problem'}</h2>
      <p>{es
        ? 'La molienda es el mayor consumidor de energía de una planta concentradora, a menudo más del 50 % del consumo eléctrico del sitio. Un molino SAG o de bolas grande dibuja varios MW de forma continua, y la decisión de a qué velocidad y con qué llenado operarlo fija cuánta de esa energía se convierte en molienda útil en vez de en calor, ruido y desgaste. Operar demasiado rápido lanza la carga contra el revestimiento (impacto acero-acero que rompe lifters); demasiado lento la deja rodar sin romper; el llenado equivocado deja capacidad de molino ociosa o sobrecarga el motor.'
        : "Grinding is the single biggest energy consumer in a concentrator, often more than 50 % of site electricity. A large SAG or ball mill draws several MW continuously, and the decision of what speed and what fill to run it at sets how much of that energy becomes useful grinding rather than heat, noise and wear. Run too fast and the charge is thrown against the liner (steel-on-steel impact that breaks lifters); too slow and it rolls without breaking; the wrong fill leaves mill capacity idle or overloads the motor."}{' '}<Cite id="wills2016" paren /></p>
      <p>{es
        ? 'La carga no es visible desde fuera: vive dentro de un tambor de acero girando. El ingeniero de molienda no puede verla, así que razona sobre ella con modelos. ChargeCascade hace visible ese razonamiento, el mismo que está detrás del dimensionamiento de molinos, la selección de revestimientos y la optimización de velocidad variable.'
        : 'The charge is not visible from outside: it lives inside a rotating steel drum. The grinding engineer cannot see it, so they reason about it with models. ChargeCascade makes that reasoning visible, the same reasoning behind mill sizing, liner selection and variable-speed optimisation.'}</p>
      <Refs ids={['wills2016', 'napiermunn1996']} label="Refs" />

      <h2>{es ? 'La física del movimiento de carga' : 'The physics of charge motion'}</h2>
      <p>{es
        ? 'Al girar el tambor, la pared y los lifters levantan la carga por fricción hasta un ángulo en que la gravedad la vence; entonces cada partícula parte de la pared y cae. Si la velocidad es baja, la carga rueda y se desliza sobre sí misma (cascading, molienda por abrasión). A velocidad media, la capa externa es lanzada en vuelo parabólico y golpea el pie (toe) de la carga (cataracting, molienda por impacto, el régimen de los molinos SAG). Cerca de la velocidad crítica la fuerza centrípeta iguala a la gravedad y la carga se pega a la pared, girando con ella sin caer (centrifuging): no hay molienda.'
        : 'As the drum turns, the shell and lifters lift the charge by friction to an angle where gravity overcomes it; each particle then departs the wall and falls. At low speed the charge rolls and slumps on itself (cascading, abrasion grinding). At medium speed the outer layer is thrown in parabolic flight and strikes the toe of the charge (cataracting, impact grinding, the SAG-mill regime). Near the critical speed the centripetal force equals gravity and the charge sticks to the wall, turning with it without falling (centrifuging): no grinding.'}{' '}<Cite id="davis1919" paren /></p>
      <p>{es
        ? 'Davis (1919) modeló esto a nivel de partícula única: para una partícula a radio r en una pared girando a fracción φc de la velocidad crítica, el ángulo de partida α es donde la componente de gravedad iguala a la centrípeta. Después de partir, la partícula sigue una parábola balística hasta reimpactar. El régimen del molino es la envolvente de todas las trayectorias de partida sobre todos los radios de la carga.'
        : "Davis (1919) modelled this at the single-particle level: for a particle at radius r on a wall turning at a fraction φc of critical speed, the departure angle α is where the gravity component equals the centripetal one. After departing, the particle follows a ballistic parabola until re-impact. The mill's regime is the envelope of all departure trajectories over all charge radii."}{' '}<Cite id="davis1919" paren /></p>
      <Refs ids={['davis1919', 'rosesullivan1957', 'wills2016']} label="Refs" />

      <h2>{es ? 'La matemática rectora' : 'The governing math'}</h2>
      <p>{es ? 'La velocidad crítica es la velocidad a la que una partícula en la pared interna centrifugaría, su peso queda exactamente equilibrado por la fuerza centrípeta:' : 'The critical speed is the speed at which a particle on the inner wall would centrifuge, its weight exactly balanced by the centripetal force:'}</p>
      <Equation tex={String.raw`N_c=\frac{42.3}{\sqrt{D-d}}\ \text{rpm},\qquad \varphi_c=\frac{N}{N_c}`} caption={es ? 'velocidad crítica (D = diámetro interno del molino en m, d = diámetro de bola en m) y la fracción de velocidad crítica φc; la constante 42.3 = 60·√(2g)/(2π) es derivada, no ajustada' : 'critical speed (D = mill inside diameter in m, d = ball diameter in m) and the fraction of critical speed φc; the constant 42.3 = 60·√(2g)/(2π) is derived, not fitted'} />
      <p>{es ? 'El ángulo de partida de Davis para una capa a radio r (con R el radio interno del molino) sale de igualar la gravedad a la centrípeta:' : 'Davis\'s departure angle for a shell at radius r (R the mill inner radius) follows from balancing gravity against the centripetal term:'}</p>
      <Equation tex={String.raw`\cos\alpha=\varphi_c^{\,2}\,\frac{r}{R}` } caption={es ? 'ángulo de partida α medido desde la vertical; en la pared (r = R) y a velocidad crítica (φc = 1) → α = 0 (centrifuga)' : 'departure angle α measured from vertical; at the wall (r = R) and critical speed (φc = 1) → α = 0 (centrifuges)'} />
      <p>{es ? 'La potencia es el modelo de brazo de torque de Hogg–Fuerstenau: el peso de la carga por su brazo de palanca por la velocidad angular, con un término de llenado que alcanza su máximo cerca de J ≈ 0.45:' : 'The power is the Hogg–Fuerstenau torque-arm model: the charge weight times its lever arm times the angular speed, with a fill term that peaks near J ≈ 0.45:'}</p>
      <Equation tex={String.raw`P=\omega\,M\,g\,R_{\text{arm}}\sin\theta,\qquad M\propto J(1-1.065\,J)\,\rho_c` } caption={es ? 'P = potencia; ω = velocidad angular; M = masa de carga (∝ término de llenado · densidad de carga ρc); R_arm·sinθ = brazo de torque al centroide de la carga; se muestra junto una forma Morrell calibrada (Morrell 1996 citado; no un modelo independiente)' : 'P = power; ω = angular speed; M = charge mass (∝ fill term · charge density ρc); R_arm·sinθ = torque arm to the charge centroid; a calibrated Morrell-form is shown alongside (Morrell 1996 cited; not an independent model)'} />
      <h3>{es ? 'Símbolos' : 'Symbols'}</h3>
      <ul>
        <li><InlineMath tex="D" />, {es ? 'diámetro interno del molino (m).' : 'mill inside diameter (m).'}</li>
        <li><InlineMath tex="L" />, {es ? 'largo efectivo del molino (m).' : 'effective mill length (m).'}</li>
        <li><InlineMath tex="d" />, {es ? 'diámetro del medio de molienda (bola/barra) (m).' : 'grinding-media (ball/rod) diameter (m).'}</li>
        <li><InlineMath tex="R" />, {es ? 'radio interno del molino (m), = D/2.' : 'mill inner radius (m), = D/2.'}</li>
        <li><InlineMath tex="r" />, {es ? 'radio de la capa de carga considerada (m).' : 'radius of the considered charge shell (m).'}</li>
        <li><InlineMath tex="N" />, {es ? 'velocidad de giro del molino (rpm).' : 'mill rotational speed (rpm).'}</li>
        <li><InlineMath tex="N_c" />, {es ? 'velocidad crítica (rpm).' : 'critical speed (rpm).'}</li>
        <li><InlineMath tex="\varphi_c" />, {es ? 'fracción de velocidad crítica, = N/Nc.' : 'fraction of critical speed, = N/Nc.'}</li>
        <li><InlineMath tex="J" />, {es ? 'llenado de carga, fracción del volumen del molino ∈ [0, 0.6].' : 'charge fill, fraction of mill volume ∈ [0, 0.6].'}</li>
        <li><InlineMath tex="\alpha" />, {es ? 'ángulo de partida de Davis (desde la vertical).' : 'Davis departure angle (from vertical).'}</li>
        <li><InlineMath tex="M" />, {es ? 'masa de la carga (t).' : 'charge mass (t).'}</li>
        <li><InlineMath tex="\rho_c" />, {es ? 'densidad aparente de la carga (t/m³).' : 'charge bulk density (t/m³).'}</li>
        <li><InlineMath tex="P" />, {es ? 'potencia al eje (MW).' : 'mill power draw (MW).'}</li>
      </ul>
      <Refs ids={['wills2016', 'hoggfuerstenau1972', 'morrell1996', 'davis1919']} label="Refs" />

      <h2>{es ? 'El pipeline' : 'The pipeline'}</h2>
      <ol>
        <li>{es ? 'Validar el molino (tipo, D, L, J, tamaño de bola, φc, densidad de carga) contra rangos físicos, el Contrato 1.' : 'Validate the mill (type, D, L, J, ball size, φc, charge density) against physical ranges, Contract 1.'}</li>
        <li>{es ? 'Calcular la velocidad crítica Nc y φc.' : 'Compute the critical speed Nc and φc.'}</li>
        <li>{es ? 'Para cada capa de carga, el ángulo de partida de Davis cos α = φc²·r/R y la parábola de vuelo.' : 'For each charge shell, the Davis departure angle cos α = φc²·r/R and the flight parabola.'}</li>
        <li>{es ? 'Clasificar el régimen (cascada / catarata / centrifugado) por φc y la envolvente de trayectorias.' : 'Classify the regime (cascade / cataract / centrifuge) by φc and the trajectory envelope.'}</li>
        <li>{es ? 'Calcular la potencia (Hogg–Fuerstenau, con la forma Morrell calibrada al lado) y la capacidad.' : 'Compute the power (Hogg–Fuerstenau, with the calibrated Morrell-form alongside) and the capacity.'}</li>
        <li>{es ? 'Animar la carga en 3D y leer potencia · régimen · ángulos · capacidad, todo en vivo.' : 'Animate the charge in 3D and read power · regime · angles · capacity, all live.'}</li>
      </ol>
      <Refs ids={['wills2016', 'napiermunn1996', 'bond1952']} label="Refs" />

      <Callout variant="honest" title={es ? 'Qué es exacto y qué es ilustrativo' : 'What is exact and what is illustrative'}>
        {es
          ? 'Las ecuaciones son exactas y publicadas: la velocidad crítica, el ángulo de partida de Davis, la potencia de Hogg–Fuerstenau y la ley de Bond se transfieren a molinos reales tal cual. La carga 3D tiene dos vistas: DEM real horneado con milldem (colisiones, fricción, cadenas de fuerza; potencia neta validada dentro de ~10-20% de Hogg-Fuerstenau y consistente con el tamaño) y la vista cinemática de Davis en vivo. La magnitud de potencia está calibrada a potencias industriales reales (~1.3 MW para el molino de bolas de referencia); este build no incluye ningún dataset de molinos publicados, así que no se afirma un cruce externo (un set de anclas comprometido es la mejora documentada). C-CRITICAL (φc = 1) y C-EMPTY (J = 0) son controles exactos que el motor debe reproducir.'
          : 'The equations are exact and published: the critical speed, the Davis departure angle, the Hogg–Fuerstenau power and Bond\'s law transfer to real mills as written. The 3D charge has two views: real DEM baked with milldem (collisions, friction, force chains; net power validated within ~10-20% of Hogg-Fuerstenau and size-consistent) and the live Davis kinematic view. The power magnitude is calibrated to real industrial power (~1.3 MW for the reference ball mill); no published-mill dataset ships in this build, so no external cross-check is claimed (a committed anchor set is the documented upgrade). C-CRITICAL (φc = 1) and C-EMPTY (J = 0) are exact controls the engine must reproduce.'}{' '}<Cite id="bond1952" paren /> <Cite id="morrell1996" paren />
      </Callout>
      <Refs ids={['davis1919', 'hoggfuerstenau1972', 'morrell1996', 'bond1952']} label="Refs" />
    </article>
  );
}
