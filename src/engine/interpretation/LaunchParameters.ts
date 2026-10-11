import { LaunchPlumeSighting } from "./LaunchPlume.js"
import type { LaunchJson, LaunchPlumeJson } from "./LaunchPlume.js"
import { ParameterRegistry } from "./Parameters.js"
import type { NumberParameter, ParameterHolder, ParameterSet, ParameterSpec } from "./Parameters.js"

/**
 * What a rocket launch lets its author set: the engine's thrust and impulse and the propellant, from
 * which the plume follows (see LaunchPlumeSighting.plumeOf), and the plume's own values, each of which
 * overrides what the engine implies.
 *
 * This is the launch kind's whole contribution to the editor: the form is built from it (see
 * ParameterForm) and nothing in the editor knows what a launch is. The values in force when a field
 * is empty are the plume's own (`effective`), so an empty field shows what the plume will use and
 * clearing a field goes back to it.
 */
export class LaunchParameters {

  /** The value the plume uses for `key` when the launch does not state it. */
  private static plumeValue(key: keyof LaunchPlumeJson): (element: ParameterHolder) => number {
    return element => LaunchPlumeSighting.plumeOf(element as unknown as LaunchJson)[key]
  }

  private static plume(key: keyof LaunchPlumeJson, spec: Omit<NumberParameter, "type" | "key" | "effective">): NumberParameter {
    return { type: "number", key: `plume.${key}`, effective: LaunchParameters.plumeValue(key), ...spec }
  }

  static readonly SET: ParameterSet = {
    kind: "launch",
    title: { en: "Launch", fr: "Lancement", es: "Lanzamiento", it: "Lancio" },
    parameters: ([
      {
        type: "text", key: "vehicle.name",
        label: { en: "Vehicle", fr: "Lanceur", es: "Lanzador", it: "Lanciatore" },
        placeholder: "Falcon 9",
        group: { en: "Vehicle", fr: "Lanceur", es: "Lanzador", it: "Lanciatore" }
      },
      {
        type: "text", key: "vehicle.mission",
        label: { en: "Mission", fr: "Mission", es: "Misión", it: "Missione" },
        placeholder: "Starlink Group 10-49",
        group: { en: "Vehicle", fr: "Lanceur", es: "Lanzador", it: "Lanciatore" }
      },
      {
        type: "number", key: "vehicle.engine.thrustKN", min: 1, max: 100000, step: 1, unit: "kN",
        label: { en: "Thrust (vacuum)", fr: "Poussée (dans le vide)", es: "Empuje (en el vacío)", it: "Spinta (nel vuoto)" },
        hint: { en: "Merlin Vacuum 934, RL10 110, a solid booster several thousand. With the specific impulse, it sets how much exhaust leaves each second.",
          fr: "Merlin Vacuum 934, RL10 110, un booster à poudre plusieurs milliers. Avec l'impulsion spécifique, elle fixe le débit d'échappement.",
          es: "Merlin Vacuum 934, RL10 110, un propulsor sólido varios miles. Con el impulso específico, fija el caudal de escape.",
          it: "Merlin Vacuum 934, RL10 110, un booster solido diverse migliaia. Con l'impulso specifico, fissa la portata dello scarico." },
        group: { en: "Engine", fr: "Moteur", es: "Motor", it: "Motore" }
      },
      {
        type: "number", key: "vehicle.engine.specificImpulseS", min: 100, max: 500, step: 1, unit: "s",
        label: { en: "Specific impulse (vacuum)", fr: "Impulsion spécifique (dans le vide)", es: "Impulso específico (en el vacío)", it: "Impulso specifico (nel vuoto)" },
        hint: { en: "Times 9.81 m/s² it is the exhaust velocity, which sets how fast the exhaust spreads round the stage: 348 s is 3.4 km/s.",
          fr: "Multipliée par 9,81 m/s², c'est la vitesse d'éjection, qui fixe la vitesse à laquelle l'échappement s'étale autour de l'étage : 348 s font 3,4 km/s.",
          es: "Multiplicado por 9,81 m/s² es la velocidad de escape, que fija la rapidez con que el escape se extiende alrededor de la etapa: 348 s son 3,4 km/s.",
          it: "Moltiplicato per 9,81 m/s² è la velocità di scarico, che fissa quanto in fretta lo scarico si allarga attorno allo stadio: 348 s sono 3,4 km/s." },
        group: { en: "Engine", fr: "Moteur", es: "Motor", it: "Motore" }
      },
      {
        type: "choice", key: "vehicle.engine.propellant",
        label: { en: "Propellant", fr: "Ergols", es: "Propelentes", it: "Propellenti" },
        hint: { en: "What the exhaust is made of decides how much of it turns into particles that scatter light.",
          fr: "Ce dont l'échappement est fait décide quelle part devient des particules qui diffusent la lumière.",
          es: "De qué está hecho el escape decide qué parte se vuelve partículas que difunden la luz.",
          it: "Di cosa è fatto lo scarico decide quanta parte diventa particelle che diffondono la luce." },
        choices: [
          { value: "rp1-lox", label: { en: "Kerosene and oxygen", fr: "Kérosène et oxygène", es: "Queroseno y oxígeno", it: "Cherosene e ossigeno" } },
          { value: "methane-lox", label: { en: "Methane and oxygen", fr: "Méthane et oxygène", es: "Metano y oxígeno", it: "Metano e ossigeno" } },
          { value: "hydrogen-lox", label: { en: "Hydrogen and oxygen", fr: "Hydrogène et oxygène", es: "Hidrógeno y oxígeno", it: "Idrogeno e ossigeno" } },
          { value: "hypergolic", label: { en: "Hypergolic", fr: "Hypergolique", es: "Hipergólico", it: "Ipergolico" } },
          { value: "solid", label: { en: "Solid", fr: "Poudre", es: "Sólido", it: "Solido" } }
        ],
        group: { en: "Engine", fr: "Moteur", es: "Motor", it: "Motore" }
      },
      LaunchParameters.plume("exhaustKgPerS", {
        min: 0.1, max: 100000, step: 0.1, unit: "kg/s",
        label: { en: "Exhaust flow", fr: "Débit d'échappement", es: "Caudal de escape", it: "Portata di scarico" },
        hint: { en: "How much exhaust leaves the engine each second: how bright the plume is. Thrust over exhaust velocity when the engine is stated.",
          fr: "La masse d'échappement qui sort du moteur chaque seconde : la luminosité du panache. La poussée sur la vitesse d'éjection quand le moteur est donné.",
          es: "La masa de escape que sale del motor cada segundo: el brillo de la estela. El empuje sobre la velocidad de escape cuando se da el motor.",
          it: "La massa di scarico che esce dal motore ogni secondo: la luminosità della scia. La spinta sulla velocità di scarico quando il motore è dato." },
        group: { en: "Plume", fr: "Panache", es: "Estela", it: "Scia" }
      }),
      LaunchParameters.plume("condensedShare", {
        min: 0, max: 1, step: 0.01,
        label: { en: "Share that scatters", fr: "Part qui diffuse", es: "Parte que difunde", it: "Parte che diffonde" },
        hint: { en: "The share of the exhaust that ends up as particles that scatter the Sun's light. Nobody has measured it for a launch: the one number to fit against a photograph.",
          fr: "La part de l'échappement qui devient des particules diffusant la lumière du Soleil. Personne ne l'a mesurée pour un lancement : le seul nombre à caler sur une photographie.",
          es: "La parte del escape que acaba como partículas que difunden la luz del Sol. Nadie la ha medido para un lanzamiento: el único número que ajustar con una fotografía.",
          it: "La parte dello scarico che diventa particelle che diffondono la luce del Sole. Nessuno l'ha misurata per un lancio: l'unico numero da tarare su una fotografia." },
        group: { en: "Plume", fr: "Panache", es: "Estela", it: "Scia" }
      }),
      LaunchParameters.plume("particleRadiusUm", {
        min: 0.05, max: 5, step: 0.05, unit: "µm",
        label: { en: "Particle radius", fr: "Rayon des particules", es: "Radio de las partículas", it: "Raggio delle particelle" },
        group: { en: "Plume", fr: "Panache", es: "Estela", it: "Scia" }
      }),
      LaunchParameters.plume("lifetimeS", {
        min: 10, max: 3600, step: 10, unit: "s",
        label: { en: "Trail lifetime", fr: "Durée de la traînée", es: "Duración de la estela", it: "Durata della scia" },
        hint: { en: "How long the narrow trail lasts before the particles have gone.",
          fr: "Combien de temps la traînée étroite dure avant que les particules aient disparu.",
          es: "Cuánto dura la estela estrecha antes de que las partículas hayan desaparecido.",
          it: "Quanto dura la scia stretta prima che le particelle siano sparite." },
        group: { en: "Plume", fr: "Panache", es: "Estela", it: "Scia" }
      }),
      LaunchParameters.plume("expansionKmPerS", {
        min: 0, max: 5, step: 0.01, unit: "km/s",
        label: { en: "Trail spreading", fr: "Étalement de la traînée", es: "Expansión de la estela", it: "Espansione della scia" },
        group: { en: "Plume", fr: "Panache", es: "Estela", it: "Scia" }
      }),
      LaunchParameters.plume("initialRadiusKm", {
        min: 0, max: 50, step: 0.1, unit: "km",
        label: { en: "Radius at release", fr: "Rayon au lâcher", es: "Radio al soltar", it: "Raggio al rilascio" },
        group: { en: "Plume", fr: "Panache", es: "Estela", it: "Scia" }
      }),
      LaunchParameters.plume("collarShare", {
        min: 0, max: 1, step: 0.01,
        label: { en: "Share in the collar", fr: "Part dans la collerette", es: "Parte en el collar", it: "Parte nel collare" },
        hint: { en: "The collar is the exhaust just let go, which spreads fast into a wide short-lived shell round the stage; the rest stays behind as the narrow trail.",
          fr: "La collerette est l'échappement qui vient d'être lâché, qui s'étale vite en une coque large et brève autour de l'étage ; le reste demeure derrière en traînée étroite.",
          es: "El collar es el escape recién soltado, que se extiende rápido en una envoltura ancha y breve alrededor de la etapa; el resto queda detrás como estela estrecha.",
          it: "Il collare è lo scarico appena rilasciato, che si allarga in fretta in un guscio largo e breve attorno allo stadio; il resto resta dietro come scia stretta." },
        group: { en: "Collar", fr: "Collerette", es: "Collar", it: "Collare" }
      }),
      LaunchParameters.plume("collarExpansionKmPerS", {
        min: 0, max: 10, step: 0.05, unit: "km/s",
        label: { en: "Collar spreading", fr: "Étalement de la collerette", es: "Expansión del collar", it: "Espansione del collare" },
        hint: { en: "How fast the collar widens: three quarters of the exhaust velocity when the engine is stated.",
          fr: "La vitesse à laquelle la collerette s'élargit : les trois quarts de la vitesse d'éjection quand le moteur est donné.",
          es: "La rapidez con que el collar se ensancha: tres cuartos de la velocidad de escape cuando se da el motor.",
          it: "Quanto in fretta il collare si allarga: tre quarti della velocità di scarico quando il motore è dato." },
        group: { en: "Collar", fr: "Collerette", es: "Collar", it: "Collare" }
      }),
      LaunchParameters.plume("collarLifetimeS", {
        min: 1, max: 300, step: 1, unit: "s",
        label: { en: "Collar lifetime", fr: "Durée de la collerette", es: "Duración del collar", it: "Durata del collare" },
        group: { en: "Collar", fr: "Collerette", es: "Collar", it: "Collare" }
      })
    ] satisfies ParameterSpec[])
  }

  /** Makes the launch kind known to whatever builds forms from the registry. */
  static publish(): void {
    ParameterRegistry.publish(LaunchParameters.SET)
  }
}
