import { ReentrySighting } from "./Reentry.js"
import type { ReentryFragment, ReentryJson } from "./Reentry.js"
import type { ParameterHolder, ParameterSet, ParameterSpec } from "./Parameters.js"

/**
 * What a fireball or a re-entry lets its author set (see ReentryJson): its name and the object that came down, the points of its path,
 * its pieces, and how the light of each ran through its flight. The whole of what the editor knows of it: the forms are built from these
 * sets (see ParameterForm). The smaller pieces a burning one sheds (ReentryFragment.sheds) are not offered: their rates and means are
 * stated in the file, and absent, every piece sheds as a burning one does.
 */
export class ReentryParameters {
  private static readonly NAME = { en: "Name", fr: "Nom", es: "Nombre", it: "Nome" }
  private static readonly OBJECT = { en: "Object", fr: "Objet", es: "Objeto", it: "Oggetto" }
  private static readonly LIGHT = { en: "Light", fr: "Lumière", es: "Luz", it: "Luce" }
  private static readonly WHEN = { en: "When", fr: "Quand", es: "Cuándo", it: "Quando" }

  /** The path goes on as it was going: the step between the last two points taken once more, or a second further at the same place. */
  static nextPlace(rows: ReadonlyArray<Record<string, number>>): Record<string, number> {
    const last = rows[rows.length - 1] ?? { t: 0, lat: 0, lng: 0, altitudeKm: 80 }
    const before = rows[rows.length - 2]
    if (!before) return { t: last.t + 1000, lat: last.lat, lng: last.lng, altitudeKm: last.altitudeKm }
    return {
      t: 2 * last.t - before.t, lat: 2 * last.lat - before.lat, lng: 2 * last.lng - before.lng,
      altitudeKm: Math.max(0, 2 * last.altitudeKm - before.altitudeKm)
    }
  }

  /** A point of the light curve after the last, a second later and as bright, or one at the piece's start as bright as it is said to be. */
  static nextCurvePoint(fragment: ReentryFragment, reentry: ReentryJson): { t: number, absoluteMagnitude: number } {
    const curve = fragment.lightCurve ?? []
    const last = curve[curve.length - 1]
    if (last) return { t: last.t + 1000, absoluteMagnitude: last.absoluteMagnitude }
    return { t: fragment.fromT ?? reentry.track[0]?.t ?? 0, absoluteMagnitude: fragment.absoluteMagnitude }
  }

  /** An instant of the recording: stored in milliseconds, typed in seconds. */
  private static instant(key: string, label: ParameterSpec["label"], hint: ParameterSpec["label"], extra: Partial<ParameterSpec> = {}): ParameterSpec {
    return { type: "number", key, min: -3600, max: 36000, step: 0.1, unit: "s", scale: 0.001, label, hint, ...extra } as ParameterSpec
  }

  static readonly SET: ParameterSet = {
    kind: "reentry",
    title: { en: "Fireball or re-entry", fr: "Bolide ou rentrée", es: "Bólido o reentrada", it: "Bolide o rientro" },
    parameters: ([
      { type: "said", key: "title", label: ReentryParameters.NAME },
      {
        type: "text", key: "object.name", group: ReentryParameters.OBJECT,
        label: { en: "Catalogue name", fr: "Nom au catalogue", es: "Nombre en el catálogo", it: "Nome a catalogo" },
        hint: { en: "For a re-entry, the piece as the satellite catalogue names it: \"SL-12 R/B\". Empty for a meteor.",
          fr: "Pour une rentrée, la pièce comme le catalogue des satellites la nomme : « SL-12 R/B ». Vide pour un météore.",
          es: "Para una reentrada, la pieza como la nombra el catálogo de satélites: «SL-12 R/B». Vacío para un meteoro.",
          it: "Per un rientro, il pezzo come lo chiama il catalogo dei satelliti: «SL-12 R/B». Vuoto per una meteora." }
      },
      { type: "text", key: "object.cosparId", group: ReentryParameters.OBJECT, label: { en: "COSPAR id", fr: "Identifiant COSPAR", es: "Identificador COSPAR", it: "Identificativo COSPAR" },
        placeholder: { en: "1968-013C", fr: "1968-013C", es: "1968-013C", it: "1968-013C" } },
      { type: "number", key: "object.norad", min: 1, max: 999999, step: 1, group: ReentryParameters.OBJECT, label: { en: "NORAD number", fr: "Numéro NORAD", es: "Número NORAD", it: "Numero NORAD" } }
    ] satisfies ParameterSpec[])
  }

  /** A point of the path: where the leading piece was at an instant, joined to the next along the great circle. */
  static readonly PLACE: ParameterSet = {
    kind: "reentry-place",
    title: { en: "Point of the path", fr: "Point du trajet", es: "Punto del trayecto", it: "Punto del percorso" },
    parameters: ([
      ReentryParameters.instant("t", { en: "Time", fr: "Instant", es: "Instante", it: "Istante" },
        { en: "Seconds of the recording; negative before it began.", fr: "Secondes de l'enregistrement ; négatives avant son début.",
          es: "Segundos de la grabación; negativos antes de su inicio.", it: "Secondi della registrazione; negativi prima del suo inizio." }, { required: true }),
      // As degrees, or from the observer or a decor object: see PositionInputElement.
      { type: "position", key: "lat", secondKey: "lng", saidKey: "saidPosition", native: "geo", step: 1, rangeM: 2000000, label: { en: "Position", fr: "Position", es: "Posición", it: "Posizione" } },
      {
        type: "number", key: "altitudeKm", min: 0, max: 300, step: 0.1, unit: "km", required: true,
        label: { en: "Altitude", fr: "Altitude", es: "Altitud", it: "Altitudine" },
        hint: { en: "Above the ellipsoid. A meteor begins to glow between 120 and 80 km; a satellite breaks up near 80.",
          fr: "Au-dessus de l'ellipsoïde. Un météore s'allume entre 120 et 80 km ; un satellite se brise vers 80.",
          es: "Sobre el elipsoide. Un meteoro se enciende entre 120 y 80 km; un satélite se rompe hacia los 80.",
          it: "Sopra l'ellissoide. Una meteora si accende tra 120 e 80 km; un satellite si spezza verso gli 80." }
      }
    ] satisfies ParameterSpec[])
  }

  /** Where the track starts and ends, for what a piece's life is when it does not say. */
  private static trackEnd(context: unknown, end: "first" | "last"): number | undefined {
    const track = (context as ReentryJson | undefined)?.track
    if (!track?.length) return undefined
    return end === "first" ? track[0].t : track[track.length - 1].t
  }

  /** One burning piece: when it is seen, how far behind the leading point, how bright and of what colour. */
  static readonly FRAGMENT: ParameterSet = {
    kind: "reentry-fragment",
    title: { en: "Piece", fr: "Pièce", es: "Pieza", it: "Pezzo" },
    parameters: ([
      {
        type: "text", key: "id", label: { en: "Id", fr: "Identifiant", es: "Identificador", it: "Identificativo" },
        validate: (value, element, context) => !(context as ReentryJson | undefined)?.fragments.some(other => other !== (element as unknown) && other.id === value)
      },
      {
        type: "number", key: "absoluteMagnitude", min: -40, max: 10, step: 0.1, required: true, group: ReentryParameters.LIGHT,
        label: { en: "Absolute magnitude", fr: "Magnitude absolue", es: "Magnitud absoluta", it: "Magnitudine assoluta" },
        hint: { en: "Its brightness seen from 100 km, as fireball reports give it: −4 or brighter is a fireball, −17 a superbolide. Its light curve, when it has one, stands instead.",
          fr: "Son éclat vu à 100 km, comme le donnent les rapports de bolides : −4 ou plus brillant est un bolide, −17 un superbolide. Sa courbe de lumière, quand il en a une, vaut à la place.",
          es: "Su brillo visto a 100 km, como lo dan los informes de bólidos: −4 o más brillante es un bólido, −17 un superbólido. Su curva de luz, cuando la tiene, vale en su lugar.",
          it: "La sua luminosità vista da 100 km, come la danno i rapporti sui bolidi: −4 o più brillante è un bolide, −17 un superbolide. La sua curva di luce, quando ce l'ha, vale al suo posto." }
      },
      { type: "colour", key: "color", group: ReentryParameters.LIGHT, fallback: ReentrySighting.DEFAULT_COLOR, label: { en: "Colour", fr: "Couleur", es: "Color", it: "Colore" } },
      {
        type: "number", key: "trainS", min: 0, max: 600, step: 0.1, unit: "s", group: ReentryParameters.LIGHT, effective: () => ReentrySighting.DEFAULT_TRAIN_S,
        label: { en: "Train", fr: "Traînée", es: "Estela", it: "Scia" },
        hint: { en: "How long a stretch of its own past path still glows behind it, seconds.", fr: "Combien de secondes de son propre trajet brillent encore derrière lui.",
          es: "Cuántos segundos de su propio trayecto siguen brillando detrás de él.", it: "Quanti secondi del suo stesso percorso brillano ancora dietro di lui." }
      },
      {
        type: "number", key: "lagS", min: 0, max: 600, step: 0.1, unit: "s", group: ReentryParameters.WHEN, effective: () => 0,
        label: { en: "Behind the lead", fr: "Retard sur la tête", es: "Retraso sobre la cabeza", it: "Ritardo sulla testa" },
        hint: { en: "Seconds behind the leading point along the same path: 0 is the leading piece itself.", fr: "Secondes de retard sur le point de tête, sur le même trajet : 0 est la pièce de tête elle-même.",
          es: "Segundos de retraso sobre el punto de cabeza, en el mismo trayecto: 0 es la propia pieza de cabeza.", it: "Secondi di ritardo sul punto di testa, sullo stesso percorso: 0 è il pezzo di testa stesso." }
      },
      ReentryParameters.instant("fromT", { en: "Seen from", fr: "Vu à partir de", es: "Visto desde", it: "Visto da" },
        { en: "When it breaks off or begins to glow; empty, the start of the path.", fr: "Quand il se détache ou s'allume ; vide, le début du trajet.",
          es: "Cuando se desprende o se enciende; vacío, el inicio del trayecto.", it: "Quando si stacca o si accende; vuoto, l'inizio del percorso." },
        { group: ReentryParameters.WHEN, effective: (_: ParameterHolder, context?: unknown) => ReentryParameters.trackEnd(context, "first") }),
      ReentryParameters.instant("untilT", { en: "Out at", fr: "Éteint à", es: "Apagado a", it: "Spento a" },
        { en: "When it has burned up or slowed below glowing; empty, the end of the path.", fr: "Quand il s'est consumé ou a trop ralenti pour briller ; vide, la fin du trajet.",
          es: "Cuando se ha consumido o ha frenado demasiado para brillar; vacío, el final del trayecto.", it: "Quando si è consumato o ha rallentato troppo per brillare; vuoto, la fine del percorso." },
        { group: ReentryParameters.WHEN, effective: (_: ParameterHolder, context?: unknown) => ReentryParameters.trackEnd(context, "last") })
    ] satisfies ParameterSpec[])
  }

  /** A point of a piece's light curve: how bright it was at an instant, joined linearly in magnitude to the next. */
  static readonly CURVE_POINT: ParameterSet = {
    kind: "reentry-curve-point",
    title: { en: "Point of the light curve", fr: "Point de la courbe de lumière", es: "Punto de la curva de luz", it: "Punto della curva di luce" },
    parameters: ([
      ReentryParameters.instant("t", { en: "Time", fr: "Instant", es: "Instante", it: "Istante" },
        { en: "Seconds of the recording.", fr: "Secondes de l'enregistrement.", es: "Segundos de la grabación.", it: "Secondi della registrazione." }, { required: true }),
      { type: "number", key: "absoluteMagnitude", min: -40, max: 10, step: 0.1, required: true, label: { en: "Absolute magnitude", fr: "Magnitude absolue", es: "Magnitud absoluta", it: "Magnitudine assoluta" } }
    ] satisfies ParameterSpec[])
  }
}
