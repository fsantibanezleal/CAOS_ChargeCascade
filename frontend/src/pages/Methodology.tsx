import { Callout, Cite, Equation, InlineMath, ReferenceList, Tabs, useShellLang } from '@fasl-work/caos-app-shell';

export default function Methodology() {
  const es = useShellLang() === 'es';
  return (
    <article className="page-body prose">
      <h1>{es ? 'Metodología' : 'Methodology'}</h1>
      <p className="lede">{es
        ? 'Velocidad crítica → la partida de Davis de partícula única + el vuelo parabólico → los regímenes → la potencia (Hogg-Fuerstenau / Morrell / Bond).'
        : 'Critical speed → the Davis single-particle departure + the parabolic flight → the regimes → the power (Hogg-Fuerstenau / Morrell / Bond).'}</p>

      <Tabs ariaLabel={es ? 'metodología' : 'methodology'} tabs={[
        {
          id: 'crit', label: es ? 'Velocidad crítica' : 'Critical speed',
          content: (
            <div className="pf-doc-sec">
              <p>{es ? 'La capa externa centrifuga (se pega a la pared arriba) cuando la fuerza centrípeta iguala a la gravedad: ' : 'The outer layer centrifuges (pins to the shell at the top) when the centripetal force equals gravity: '}<InlineMath tex="m\,\omega^2 R = m g" />{es ? '. En rpm con la corrección del tamaño de bola:' : '. In rpm with the ball-size correction:'}</p>
              <Equation tex="N_c = \frac{42.3}{\sqrt{D-d}}\ \text{[rpm]},\qquad \varphi_c=\frac{N}{N_c}" />
              <p>{es ? 'La constante 42.3 = ' : 'The constant 42.3 = '}<InlineMath tex="\tfrac{60}{2\pi}\sqrt{2g}" />{es ? ' (derivada, no ajustada). Los molinos reales corren ' : ' (derived, not fitted). Real mills run '}<InlineMath tex="\varphi_c\approx0.65\text{–}0.82" />{es ? '.' : '.'} <Cite id="wills2016" paren /></p>
            </div>
          ),
        },
        {
          id: 'davis', label: es ? 'Movimiento de la carga' : 'Charge motion',
          content: (
            <div className="pf-doc-sec">
              <p>{es ? 'Un elemento en una capa radial de radio ' : 'An element on a radial shell at radius '}<InlineMath tex="r" />{es ? ' es llevado por la pared hasta el ángulo de partida donde la componente radial de la gravedad ya no aporta la fuerza centrípeta ' : ' is carried by the shell until the departure angle where the radial component of gravity can no longer supply the centripetal force '}<InlineMath tex="m\omega^2 r" />{es ? ' (Davis 1919):' : ' (Davis 1919):'}</p>
              <Equation tex="\cos\alpha = \frac{\omega^2 r}{g} = \varphi_c^2\,\frac{r}{R}" />
              <p>{es ? 'Luego vuela una parábola hasta el pie de la carga (toe):' : 'It then flies a parabola to the charge toe:'}</p>
              <Equation tex="y = x\tan\alpha - \frac{g\,x^2}{2v^2\cos^2\alpha},\qquad v=\omega r" />
              <Callout variant="note" title={es ? 'Por qué el abanico de cataract' : 'Why the cataract fan'}>
                {es ? 'Las capas externas (' : 'The outer shells ('}<InlineMath tex="r=R" />{es ? ') parten cerca del tope (α pequeño) y se lanzan más alto; las internas parten más tarde — el abanico. Cuando ' : ') depart near the top (small α) and are thrown highest; the inner shells depart later — the fan. When '}<InlineMath tex="\varphi_c^2\,r/R\ge1" />{es ? ' la capa CENTRIFUGA (no hay partida).' : ' the shell CENTRIFUGES (no departure).'} <Cite id="davis1919" paren />
              </Callout>
            </div>
          ),
        },
        {
          id: 'regime', label: es ? 'Regímenes' : 'Regimes',
          content: (
            <div className="pf-doc-sec">
              <p>{es ? 'La transición que observas, en bandas de φc (Wills & Finch; Napier-Munn et al.):' : 'The transition you watch, in φc bands (Wills & Finch; Napier-Munn et al.):'}</p>
              <ul>
                <li><b>{es ? 'slumping' : 'slumping'}</b> <InlineMath tex="\varphi_c\lesssim0.4" /> — {es ? 'la carga resbala y se desploma.' : 'the charge slips & slumps.'}</li>
                <li><b>cascading</b> <InlineMath tex="0.4\text{–}0.65" /> — {es ? 'rueda por la superficie libre; abrasión.' : 'rolls down the free surface; abrasion.'}</li>
                <li><b>cataracting</b> <InlineMath tex="0.65\text{–}0.9" /> — {es ? 'arcos parabólicos, impacto en el toe.' : 'parabolic arcs, impact at the toe.'}</li>
                <li><b>centrifuging</b> <InlineMath tex="\varphi_c\gtrsim0.9" /> — {es ? 'la capa externa se pega; la molienda colapsa.' : 'the outer layer pins; grinding collapses.'}</li>
              </ul>
              <p>{es ? 'El % de carga centrifugando (la fracción de capas con ' : 'The % of charge centrifuging (the fraction of shells with '}<InlineMath tex="\cos\alpha\ge1" />{es ? ') da la transición con precisión.' : ') gives the onset precisely.'} <Cite id="napiermunn1996" paren /></p>
            </div>
          ),
        },
        {
          id: 'power', label: es ? 'Potencia' : 'Power',
          content: (
            <div className="pf-doc-sec">
              <p>{es ? 'Hogg & Fuerstenau (1972): la potencia neta es el brazo de torque del centro de masa de la carga, toda girando rígidamente:' : 'Hogg & Fuerstenau (1972): the net power is the torque-arm of the charge centre of mass, all rotating rigidly:'}</p>
              <Equation tex="P_{net} = \omega\,M\,g\,a,\qquad M=\rho_c\,\pi R^2 L\,J,\qquad a = c\,R\sin\alpha\,(1-1.065\,J)" />
              <p>{es ? 'El factor ' : 'The factor '}<InlineMath tex="J(1-1.065J)" />{es ? ' hace que la potencia llegue a su máximo cerca de ' : ' peaks the power near '}<InlineMath tex="J\approx0.47" />{es ? ' (la clásica "potencia máxima al 45–50% de llenado"); de primeros principios ' : ' (the classic "power peaks at 45–50% fill"); from first principles '}<InlineMath tex="P\propto D^{2.5}" />{es ? '. El brazo está calibrado a ~1.3 MW para el molino de referencia. ' : '. The arm is calibrated to ~1.3 MW for the reference mill. '}<Cite id="hoggfuerstenau1972" paren /></p>
              <Callout variant="strong" title={es ? 'Morrell + Bond' : 'Morrell + Bond'}>
                {es ? 'El C-model de Morrell (1996) es la referencia SOTA (continuo entre toe y shoulder, ±9.8% en 82 sets) ' : "Morrell's (1996) C-model is the SOTA reference (continuum between toe and shoulder, ±9.8% on 82 sets) "}<Cite id="morrell1996" paren />{es ? '; lo mostramos como forma calibrada. Bond ' : '; we show it as a calibrated form. Bond '}<InlineMath tex="W=10\,W_i(1/\sqrt{P_{80}}-1/\sqrt{F_{80}})" />{es ? ' es la ENERGÍA de proceso (kWh/t), no la potencia de carga — un cruce, no anima con φc.' : ' is the process ENERGY (kWh/t), not the charge power — a cross-check, it does not animate with φc.'} <Cite id="bond1961" paren /></Callout>
            </div>
          ),
        },
      ]} />
      <ReferenceList />
    </article>
  );
}
