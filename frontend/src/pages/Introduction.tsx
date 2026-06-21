import { Callout, Cite, ReferenceList, useShellLang } from '@fasl-work/caos-app-shell';

export default function Introduction() {
  const es = useShellLang() === 'es';
  return (
    <article className="page-body prose">
      <h1>{es ? 'Introducción' : 'Introduction'}</h1>
      <p className="lede">{es
        ? 'ChargeCascade muestra cómo se mueve la carga de un molino de tambor (SAG / bolas / barras) y cuánta potencia dibuja — y deja ver, en 3D, la transición cascading → cataracting → centrifuging.'
        : 'ChargeCascade shows how a tumbling mill (SAG / ball / rod) charge moves and how much power it draws — and lets you watch, in 3D, the cascading → cataracting → centrifuging transition.'}</p>

      <h2>{es ? 'El problema' : 'The problem'}</h2>
      <p>{es
        ? 'En un molino rotatorio la carga (medios de molienda + mineral) es levantada por la pared y los lifters y vuelve a caer, rompiendo el mineral por impacto y abrasión. CÓMO se mueve la carga — y la potencia — depende de la fracción de velocidad crítica φc y del llenado J '
        : 'In a rotating mill the charge (grinding media + ore) is lifted by the shell + lifters and falls back, breaking the ore by impact + abrasion. HOW the charge moves — and the power — depends on the fraction of critical speed φc and the fill J '}
        <Cite id="wills2016" paren />{es ? '.' : '.'}</p>

      <Callout variant="honest" title={es ? 'Qué es y qué NO es' : 'What it is and is NOT'}>
        {es
          ? 'La carga 3D es una ANIMACIÓN CINEMÁTICA del motor analítico (las partículas siguen el ángulo de partida de Davis + la parábola), NO un solve DEM de N cuerpos. Una traza DEM/PEPT real es la mejora offline documentada. La potencia es Hogg-Fuerstenau (1972) / Morrell (1996), ecuaciones publicadas; la magnitud está calibrada a potencias industriales reales (~1.3 MW para el molino de bolas de referencia 4×6 m). C-CRITICAL y C-EMPTY son controles exactos.'
          : 'The 3D charge is a KINEMATIC ANIMATION of the analytic engine (particles follow the Davis departure angle + the parabola), NOT an N-body DEM solve. A real DEM/PEPT trace is the documented offline upgrade. The power is Hogg-Fuerstenau (1972) / Morrell (1996), published equations; the magnitude is calibrated to real industrial power (~1.3 MW for the reference 4×6 m ball mill). C-CRITICAL and C-EMPTY are exact controls.'}
      </Callout>

      <h2>{es ? 'Datos' : 'Data'}</h2>
      <p>{es
        ? 'Los puntos de operación son SINTÉTICOS pero físicamente realistas (geometrías y velocidades típicas de molinos SAG / bolas / barras), claramente etiquetados. La física son modelos analíticos publicados (Davis 1919; Hogg-Fuerstenau 1972; Morrell 1996; Bond 1961). No se redistribuyen datos de molinos reales; las predicciones de potencia se cruzan contra el set público SAGMILLING/Doll (±~10%) como ancla.'
        : 'The operating points are SYNTHETIC but physically realistic (typical SAG / ball / rod geometries + speeds), clearly labelled. The physics is published analytic models (Davis 1919; Hogg-Fuerstenau 1972; Morrell 1996; Bond 1961). No real mill data is redistributed; the power predictions are cross-checked against the public SAGMILLING/Doll set (±~10%) as an anchor.'}</p>

      <ReferenceList />
    </article>
  );
}
