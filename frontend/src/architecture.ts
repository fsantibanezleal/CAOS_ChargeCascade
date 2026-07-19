// In-app Architecture / "How it works" modal config (ADR-0058) for ChargeCascade.
// Passed to <AppShell config={{ ...config, architecture }}>. The ⓘ header button opens the modal. Each tab pairs one
// themed SVG (frontend/public/svg/tech/) with a bilingual ES/EN body.
import type { ArchitectureConfig } from '@fasl-work/caos-app-shell';

export const architecture: ArchitectureConfig = {
  tabs: [
    {
      id: 'app',
      en: 'The app',
      es: 'La app',
      svg: 'svg/tech/01-the-app.svg',
      body_en:
        'ChargeCascade answers "how does a tumbling mill grind?", set the diameter, fill %, ball size and the fraction ' +
        'of critical speed on a SAG / ball / rod mill and watch the charge transition cascading → cataracting → ' +
        'centrifuging in 3D, with the live power draw.\n\n' +
        'It is a real physics workbench, not a demo. The TypeScript mill engine recomputes the charge motion ' +
        '+ the regime + the power on every control: the critical speed, the Davis single-particle departure + the ' +
        'parabolic cataract trajectories the 3D viz animates, and the Hogg-Fuerstenau / Morrell power. The 3D charge is ' +
        'a kinematic animation of the analytic engine, not a DEM solve; a real DEM trace is the documented offline ' +
        'upgrade. C-CRITICAL (φc = 1) and C-EMPTY (J = 0) are exact analytic controls.',
      body_es:
        'ChargeCascade responde "¿cómo muele un molino de tambor?": al fijar el diámetro, el % de llenado, el tamaño ' +
        'de bolas y la fracción de velocidad crítica en un molino SAG / bolas / barras, se observa la carga transicionar cascading → ' +
        'cataracting → centrifuging en 3D, con la potencia en vivo.\n\n' +
        'Es un entorno de física real, no un demo. El motor TypeScript recalcula el movimiento de la carga + el ' +
        'régimen + la potencia con cada control: la velocidad crítica, la partida de Davis de partícula única + las ' +
        'trayectorias parabólicas de cataract que anima el 3D, y la potencia Hogg-Fuerstenau / Morrell. La carga 3D es ' +
        'una animación cinemática del motor analítico, no es un solve DEM; una traza DEM real es la mejora offline ' +
        'documentada. C-CRITICAL (φc = 1) y C-EMPTY (J = 0) son controles analíticos exactos.',
    },
    {
      id: 'lanes',
      en: 'Lanes, web / offline / compute',
      es: 'Carriles, web / offline / cómputo',
      svg: 'svg/tech/02-lanes.svg',
      body_en:
        'Three lanes. web (live, in the browser): the TypeScript mill engine recomputes on every ' +
        'control, the Three.js 3D mill animates the charge, and onnxruntime-web runs the power surrogate + the OOD ' +
        'autoencoder, no server. offline / compute (your machine, isolated environment): the Python pipeline bakes the ' +
        'canonical case artifacts (the same TS engine) and the heavy lane (retrain, torch) trains the two ' +
        'learned models → ONNX. replay: the small committed artifacts are overlaid into the SPA by the data-copy step; ' +
        'the typed contract mirror fails the build if the web and pipeline shapes diverge.',
      body_es:
        'Tres carriles. web (en vivo): el motor TypeScript recalcula con cada control, el molino ' +
        '3D de Three.js anima la carga, y onnxruntime-web ejecuta el surrogate de potencia + el autoencoder OOD, sin ' +
        'servidor. offline / cómputo (entorno aislado): el pipeline Python precalcula los artefactos canónicos (el mismo ' +
        'motor TS) y el carril pesado (retrain, torch) entrena los dos modelos → ONNX. replay: los ' +
        'artefactos versionados se superponen con el paso de copia de datos; el espejo de contrato tipado ' +
        'rompe el build si la web y el pipeline divergen.',
    },
    {
      id: 'web-flow',
      en: 'Web-app flow',
      es: 'Flujo de la web',
      svg: 'svg/tech/03-web-flow.svg',
      body_en:
        'The App page recomputes live: the case selector or a custom mill + the diameter / fill / ball-size / φc / ' +
        'mill-type controls feed the TypeScript engine and the onnxruntime-web models, which feed the workbench, the ' +
        '3D mill, the trajectory diagram, the regime map, the power-draw curve, the charge cross-section, the What-if ' +
        'surrogate and the anomaly guard. The six sibling pages (App · Introduction · Methodology · Implementation · ' +
        'Experiments · Benchmark) are identical across every CAOS product. vite builds the static output; GitHub Pages ' +
        'serves it at chargecascade.fasl-work.com.',
      body_es:
        'La página App recalcula en vivo: el selector de casos o el molino propio + los controles de diámetro / ' +
        'llenado / tamaño de bolas / φc / tipo alimentan el motor TypeScript y los modelos onnxruntime-web, que ' +
        'alimentan el entorno, el molino 3D, el diagrama de trayectorias, el mapa de regímenes, la curva de potencia, ' +
        'el corte de la carga, el surrogate What-if y el guardia de anomalías. Las seis páginas hermanas (App · ' +
        'Introducción · Metodología · Implementación · Experimentos · Benchmark) son idénticas en todo producto CAOS. ' +
        'vite construye el estático; GitHub Pages lo sirve en chargecascade.fasl-work.com.',
    },
    {
      id: 'science',
      en: 'The science',
      es: 'La ciencia',
      svg: 'svg/tech/04-the-science.svg',
      body_en:
        'Tumbling-mill physics, step by step: ① the critical speed Nc = 42.3/√(D−d) and the fraction φc = N/Nc; ② the ' +
        'Davis single-particle model, a charge element on a radial shell at radius r departs the shell at the angle ' +
        'where cos α = ω²r/g (= φc²·r/R per shell), then flies a parabola y = x·tanα − gx²/(2v²cos²α) to the toe, the ' +
        'outer shells thrown highest, the fanned cataract; ③ the regimes cascading / cataracting / centrifuging vs φc ' +
        '(and the % of charge centrifuging when φc → 1); ④ the power, Hogg-Fuerstenau (1972) as the torque-arm of the ' +
        'charge centre of mass (P = ω·M·g·arm, peaking near 45–50% fill), with a calibrated Morrell-form (the same torque arm rescaled 1.06x, not the ' +
        'full C-model, which is the documented upgrade) as the consistency comparison and Bond as the process-energy cross-check.\n\n' +
        'The analytic engine is the authority. The learned lane: a power surrogate for instant operating-envelope ' +
        'sweeps, measured downstream against the exact engine, and an OOD autoencoder that flags off-envelope (over-' +
        'speed / near-centrifuging) operating points; both run client-side as ONNX, never as a black box.',
      body_es:
        'Física de molino de tambor, paso a paso: ① la velocidad crítica Nc = 42.3/√(D−d) y la fracción φc = N/Nc; ② el ' +
        'modelo de Davis de partícula única, un elemento de carga en una capa radial de radio r se separa de la pared ' +
        'donde cos α = ω²r/g (= φc²·r/R por capa), luego vuela una parábola y = x·tanα − gx²/(2v²cos²α) hasta el toe, ' +
        'las capas externas lanzadas más alto, el abanico de cataract; ③ los regímenes cascading / cataracting / ' +
        'centrifuging vs φc (y el % de carga centrifugando cuando φc → 1); ④ la potencia, Hogg-Fuerstenau (1972) como ' +
        'el brazo de torque del centro de masa de la carga (P = ω·M·g·brazo, máxima cerca del 45–50% de llenado), con ' +
        'una forma Morrell calibrada (el mismo brazo de torque reescalado 1.06x, no el C-model completo, que es la mejora documentada) como comparación de consistencia y Bond como cruce de energía de proceso.\n\n' +
        'El motor analítico es la autoridad. El carril aprendido: un surrogate de potencia para barridos instantáneos ' +
        'del envolvente, medido downstream contra el motor exacto, y un autoencoder OOD que marca puntos fuera del ' +
        'envolvente (sobre-velocidad / casi-centrifugando); ambos se ejecutan en el cliente como ONNX, nunca como caja negra.',
    },
    {
      id: 'design',
      en: 'Data contracts / design',
      es: 'Contratos de datos / diseño',
      svg: 'svg/tech/05-data-contracts.svg',
      body_en:
        'Two validated data contracts bracket the pipeline. Contract 1 (ingestion) defines a valid mill operating ' +
        'point, the mill type, diameter, length, fill, fraction of critical speed, ball size and charge density, with ' +
        'range guards (J ∈ [0,0.6], φc ∈ (0,1.5], ball < diameter) and honesty flags (φc ≥ 1 centrifuging, over-speed, ' +
        'high/low fill), so the app accepts a custom mill, not just the built-in cases. Contract 2 (artifact) defines the ' +
        'output the web reads (the critical speed, the regime, the charge toe/shoulder, the power + the power-vs-φc ' +
        'curve, the model index), mirrored by the typed contract. Between them the staged deterministic pipeline runs ' +
        'the lane gate (numpy-light by default, a retrain mode for the heavy torch lane) and writes a provenance manifest, ' +
        'so every result is reproducible and the web can never silently drift.',
      body_es:
        'Dos contratos de datos validados encierran el pipeline. El Contrato 1 (ingesta) define un punto de operación ' +
        'válido, el tipo, diámetro, largo, llenado, fracción de velocidad crítica, tamaño de bolas y densidad de ' +
        'carga, con guardas de rango (J ∈ [0,0.6], φc ∈ (0,1.5], bola < diámetro) y flags de honestidad (φc ≥ 1 ' +
        'centrifugando, sobre-velocidad, llenado alto/bajo), para que la app acepte un molino propio, no solo los casos ' +
        'incluidos. El Contrato 2 (artefacto) define la salida que lee la web (la velocidad crítica, el régimen, el ' +
        'toe/shoulder de la carga, la potencia + la curva potencia-vs-φc, el índice de modelos), espejado por ' +
        'el contrato tipado. Entre ambos, el pipeline por etapas y determinista ejecuta el lane gate (numpy-light por ' +
        'defecto, un modo de re-entrenamiento para el carril torch) y escribe un manifest de procedencia, de modo que cada resultado es ' +
        'reproducible y la web nunca diverge en silencio.',
    },
  ],
};
