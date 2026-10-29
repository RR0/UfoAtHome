import { ParameterRegistry } from "./Parameters.js"
import type { ParameterSet, ParameterSpec } from "./Parameters.js"
import { SkyLantern } from "./SkyLantern.js"

/** What the form of a launch of lanterns needs of the editor: the shapes the lanterns may stand for. */
export interface LanternContext {
  shapes: { value: string, label: string }[]
}

/**
 * What a launch of sky lanterns lets its author set (see LanternLaunchJson): where they are let go, how many, over what span and how
 * unlike each other, the air they climb into, and the lantern itself. The lantern kind's whole contribution to the editor: the form is
 * built from it (see ParameterForm), and nothing of the flight is offered, since it is computed (see SkyLantern.trajectory).
 *
 * Its lanterns are stated as a group: drawn at random within what is stated, the same for the same seed. Lanterns stated one by one
 * (`releases`) are kept as they are, and computed with the group's.
 */
export class LanternParameters {
  private static readonly RELEASE = { en: "Let go", fr: "Lâcher", es: "Suelta", it: "Lancio" }
  private static readonly LANTERNS = { en: "Lanterns", fr: "Lanternes", es: "Farolillos", it: "Lanterne" }
  private static readonly AIR = { en: "Air", fr: "Air", es: "Aire", it: "Aria" }
  private static readonly LANTERN = { en: "Each lantern", fr: "Chaque lanterne", es: "Cada farolillo", it: "Ogni lanterna" }

  /** An instant of the recording: stored in milliseconds, typed in seconds. */
  private static instant(key: string, label: ParameterSpec["label"], hint: ParameterSpec["label"]): ParameterSpec {
    return { type: "number", key, min: -36000, max: 36000, step: 1, unit: "s", scale: 0.001, required: true, label, hint, group: LanternParameters.LANTERNS }
  }

  /** A wind as these lanterns state one: where it blows TOWARDS, and how fast. */
  private static wind(key: string, label: Record<"en" | "fr" | "es" | "it", string>, hint: ParameterSpec["label"]): ParameterSpec[] {
    return [
      {
        type: "number", key: `${key}.towardDeg`, min: 0, max: 360, step: 1, unit: "°", group: LanternParameters.AIR, hint,
        label: { en: `${label.en}, towards`, fr: `${label.fr}, vers`, es: `${label.es}, hacia`, it: `${label.it}, verso` }
      },
      {
        type: "number", key: `${key}.speedMS`, min: 0, max: 60, step: 0.1, unit: "m/s", group: LanternParameters.AIR,
        label: { en: `${label.en}, speed`, fr: `${label.fr}, vitesse`, es: `${label.es}, velocidad`, it: `${label.it}, velocità` }
      }
    ]
  }

  static readonly SET: ParameterSet = {
    kind: "lantern",
    title: { en: "Sky lanterns", fr: "Lanternes célestes", es: "Farolillos voladores", it: "Lanterne volanti" },
    parameters: ([
      { type: "said", key: "title", label: { en: "Name", fr: "Nom", es: "Nombre", it: "Nome" }, group: LanternParameters.RELEASE },
      {
        // From the observer, from a decor object (a house, a field), or as degrees: see PositionInputElement.
        type: "position", key: "site.eastM", secondKey: "site.northM", saidKey: "site.saidPosition", native: "local", step: 1, rangeM: 100000,
        group: LanternParameters.RELEASE,
        label: { en: "Where they are let go", fr: "Lieu du lâcher", es: "Lugar de la suelta", it: "Luogo del rilascio" },
        hint: { en: "Where they are let go: from the observer, from something else in the scene, or as a latitude and a longitude.",
          fr: "D'où elles sont lâchées : par rapport à l'observateur, à autre chose dans la scène, ou en latitude et longitude.",
          es: "Desde dónde se sueltan: respecto al observador, a otra cosa de la escena, o en latitud y longitud.",
          it: "Da dove vengono lasciate andare: rispetto all'osservatore, a qualcos'altro nella scena, o in latitudine e longitudine." }
      },
      {
        type: "number", key: "site.altitudeM", min: -1000, max: 5000, step: 0.1, unit: "m", group: LanternParameters.RELEASE, effective: () => 0,
        label: { en: "Height above the place's ground", fr: "Hauteur au-dessus du sol du lieu", es: "Altura sobre el suelo del lugar", it: "Altezza sul suolo del luogo" },
        hint: { en: "A garden on a hill above the place, a roof.", fr: "Un jardin sur une colline au-dessus du lieu, un toit.",
          es: "Un jardín en una colina sobre el lugar, un tejado.", it: "Un giardino su una collina sopra il luogo, un tetto." }
      },
      {
        type: "number", key: "site.originElevationM", min: -500, max: 6000, step: 1, unit: "m", group: LanternParameters.RELEASE, effective: () => 0,
        label: { en: "The place's ground above the sea", fr: "Sol du lieu au-dessus de la mer", es: "Suelo del lugar sobre el mar", it: "Suolo del luogo sul mare" },
        hint: { en: "What sets how thin the air they climb into is: a lantern climbs less high from a mountain town.",
          fr: "Ce qui règle la raréfaction de l'air où elles montent : une lanterne monte moins haut depuis une ville de montagne.",
          es: "Lo que fija lo enrarecido del aire en que suben: un farolillo sube menos desde un pueblo de montaña.",
          it: "Ciò che fissa la rarefazione dell'aria in cui salgono: una lanterna sale meno in alto da un paese di montagna." }
      },
      {
        type: "number", key: "group.count", min: 1, max: 200, step: 1, required: true, group: LanternParameters.LANTERNS,
        label: { en: "How many", fr: "Combien", es: "Cuántos", it: "Quante" }
      },
      LanternParameters.instant("group.fromT", { en: "First let go at", fr: "Première lâchée à", es: "Primero soltado a", it: "Prima lasciata a" },
        { en: "Seconds of the recording: before its start (negative) for lanterns already up when it begins.",
          fr: "Secondes de l'enregistrement : avant son début (négatif) pour des lanternes déjà en l'air quand il commence.",
          es: "Segundos de la grabación: antes de su inicio (negativo) para farolillos ya en el aire cuando empieza.",
          it: "Secondi della registrazione: prima del suo inizio (negativo) per lanterne già in aria quando inizia." }),
      LanternParameters.instant("group.untilT", { en: "Last let go at", fr: "Dernière lâchée à", es: "Último soltado a", it: "Ultima lasciata a" },
        { en: "Seconds of the recording; the others in between, about evenly.", fr: "Secondes de l'enregistrement ; les autres entre les deux, à peu près régulièrement.",
          es: "Segundos de la grabación; los demás entre ambos, más o menos regularmente.", it: "Secondi della registrazione; le altre in mezzo, più o meno regolarmente." }),
      {
        type: "number", key: "group.radiusM", min: 0, max: 5000, step: 1, unit: "m", group: LanternParameters.LANTERNS, effective: () => 20,
        label: { en: "Let go within", fr: "Lâchées dans un rayon de", es: "Soltados en un radio de", it: "Lasciate entro" },
        hint: { en: "A crowd lets them go a few metres apart.", fr: "Une foule les lâche à quelques mètres les unes des autres.",
          es: "Una multitud los suelta a pocos metros unos de otros.", it: "Una folla le lascia andare a pochi metri l'una dall'altra." }
      },
      {
        type: "number", key: "group.burnS.min", min: 10, max: 3600, step: 1, unit: "s", group: LanternParameters.LANTERNS, effective: () => 480,
        label: { en: "Burns at least", fr: "Brûle au moins", es: "Arde al menos", it: "Brucia almeno" },
        hint: { en: "How long each burns from when it is let go, drawn between the two: 8 to 15 minutes by the sellers. It vanishes when it goes out.",
          fr: "Combien de temps chacune brûle après son lâcher, tiré entre les deux : 8 à 15 minutes selon les vendeurs. Elle disparaît en s'éteignant.",
          es: "Cuánto arde cada uno desde que se suelta, sorteado entre ambos: de 8 a 15 minutos según los vendedores. Desaparece al apagarse.",
          it: "Quanto brucia ciascuna da quando è lasciata andare, estratto tra i due: da 8 a 15 minuti secondo i venditori. Scompare spegnendosi." }
      },
      {
        type: "number", key: "group.burnS.max", min: 10, max: 3600, step: 1, unit: "s", group: LanternParameters.LANTERNS, effective: () => 900,
        label: { en: "Burns at most", fr: "Brûle au plus", es: "Arde como mucho", it: "Brucia al massimo" }
      },
      {
        type: "number", key: "group.insideExcessK.min", min: 10, max: 400, step: 1, unit: "K", group: LanternParameters.LANTERNS, effective: () => 125,
        label: { en: "Hotter than the air, at least", fr: "Plus chaude que l'air, au moins", es: "Más caliente que el aire, al menos", it: "Più calda dell'aria, almeno" },
        hint: { en: "How much hotter than the air its air is at full burn, drawn between the two: what sets how fast it climbs, and so how high it gets.",
          fr: "De combien son air est plus chaud que l'air autour à plein feu, tiré entre les deux : ce qui règle à quelle vitesse elle monte, et donc jusqu'où.",
          es: "Cuánto más caliente que el aire está su aire a pleno fuego, sorteado entre ambos: lo que fija lo rápido que sube, y por tanto hasta dónde.",
          it: "Di quanto la sua aria è più calda dell'aria intorno a piena fiamma, estratto tra i due: ciò che fissa quanto in fretta sale, e quindi fin dove." }
      },
      {
        type: "number", key: "group.insideExcessK.max", min: 10, max: 400, step: 1, unit: "K", group: LanternParameters.LANTERNS, effective: () => 175,
        label: { en: "Hotter than the air, at most", fr: "Plus chaude que l'air, au plus", es: "Más caliente que el aire, como mucho", it: "Più calda dell'aria, al massimo" }
      },
      {
        type: "number", key: "group.burnedS", min: 0, max: 3600, step: 1, unit: "s", group: LanternParameters.LANTERNS, effective: () => 0,
        label: { en: "Already burnt when let go", fr: "Déjà brûlé au lâcher", es: "Ya ardido al soltarlo", it: "Già bruciato al lancio" },
        hint: { en: "For lanterns the account only has from where they were first seen, already up and partly burnt.",
          fr: "Pour des lanternes que le compte rendu n'a que depuis là où elles ont été vues la première fois, déjà en l'air et en partie consumées.",
          es: "Para farolillos que el relato solo tiene desde donde se vieron por primera vez, ya en el aire y en parte consumidos.",
          it: "Per lanterne che il resoconto ha solo da dove sono state viste la prima volta, già in aria e in parte consumate." }
      },
      {
        type: "number", key: "group.seed", min: 0, max: 4294967295, step: 1, group: LanternParameters.LANTERNS, effective: () => 1,
        label: { en: "Draw", fr: "Tirage", es: "Sorteo", it: "Estrazione" },
        hint: { en: "What the draws start from: another number, other lanterns within the same bounds, the same each time for the same number.",
          fr: "Ce dont partent les tirages : un autre nombre, d'autres lanternes dans les mêmes bornes, les mêmes à chaque fois pour le même nombre.",
          es: "De qué parten los sorteos: otro número, otros farolillos dentro de los mismos límites, los mismos cada vez para el mismo número.",
          it: "Da cosa partono le estrazioni: un altro numero, altre lanterne negli stessi limiti, le stesse ogni volta per lo stesso numero." }
      },
      {
        type: "set", key: "group.explains", group: LanternParameters.LANTERNS,
        label: { en: "Stand for the shapes", fr: "Représentent les formes", es: "Representan las formas", it: "Rappresentano le forme" },
        // A shape named that the recording no longer holds is still listed: dropping it silently would be an edit nobody made.
        options: (launch, context) => {
          const shapes = (context as LanternContext | undefined)?.shapes ?? []
          const named = ((launch as { group?: { explains?: string[] } }).group?.explains ?? []).filter(id => !shapes.some(shape => shape.value === id))
          return [...shapes, ...named.map(value => ({ value, label: value }))]
        },
        empty: { en: "No shape", fr: "Aucune forme", es: "Ninguna forma", it: "Nessuna forma" }
      },
      ...LanternParameters.wind("wind", { en: "Wind at the ground", fr: "Vent au sol", es: "Viento en el suelo", it: "Vento al suolo" },
        { en: "Where it blows TOWARDS, which is where the lanterns go: the opposite of where a weather report says it comes from.",
          fr: "Là où il souffle, VERS où, qui est où vont les lanternes : l'inverse d'où un bulletin météo dit qu'il vient.",
          es: "Hacia DÓNDE sopla, que es adonde van los farolillos: lo contrario de donde un parte dice que viene.",
          it: "VERSO dove soffia, che è dove vanno le lanterne: l'opposto di da dove un bollettino dice che viene." }),
      ...LanternParameters.wind("windAloft", { en: "Wind aloft", fr: "Vent en altitude", es: "Viento en altura", it: "Vento in quota" },
        { en: "The wind higher up, blended with the ground's in between: what makes lanterns let go at one spot part ways as they climb.",
          fr: "Le vent plus haut, mêlé à celui du sol entre les deux : ce qui fait se séparer en montant des lanternes lâchées au même endroit.",
          es: "El viento más arriba, mezclado con el del suelo en medio: lo que separa al subir farolillos soltados en el mismo sitio.",
          it: "Il vento più in alto, mescolato a quello al suolo nel mezzo: ciò che separa salendo lanterne lasciate andare nello stesso punto." }),
      {
        type: "number", key: "windAloft.atM", min: 10, max: 10000, step: 10, unit: "m", group: LanternParameters.AIR,
        label: { en: "Wind aloft, at", fr: "Vent en altitude, à", es: "Viento en altura, a", it: "Vento in quota, a" },
        hint: { en: "Metres above where they are let go.", fr: "Mètres au-dessus d'où elles sont lâchées.", es: "Metros sobre donde se sueltan.", it: "Metri sopra dove vengono lasciate andare." }
      },
      {
        type: "number", key: "airTemperatureC", min: -60, max: 50, step: 0.5, unit: "°C", group: LanternParameters.AIR, effective: () => 10,
        label: { en: "Air temperature", fr: "Température de l'air", es: "Temperatura del aire", it: "Temperatura dell'aria" },
        hint: { en: "At the ground, falling by 6.5 °C a kilometre above: what their hot air is lighter than. A cold night lifts them higher.",
          fr: "Au sol, baissant de 6,5 °C par kilomètre au-dessus : ce dont leur air chaud est plus léger. Une nuit froide les porte plus haut.",
          es: "En el suelo, bajando 6,5 °C por kilómetro: de lo que su aire caliente es más ligero. Una noche fría los sube más.",
          it: "Al suolo, calando di 6,5 °C per chilometro: ciò di cui la loro aria calda è più leggera. Una notte fredda le porta più in alto." }
      },
      {
        type: "number", key: "turbulence.horizontalMS", min: 0, max: 10, step: 0.1, unit: "m/s", group: LanternParameters.AIR,
        effective: () => SkyLantern.TURBULENCE.horizontalMS,
        label: { en: "Gusts, across", fr: "Rafales, à l'horizontale", es: "Ráfagas, en horizontal", it: "Raffiche, in orizzontale" },
        hint: { en: "How far the air's speed strays from the wind's, each lantern meeting its own gusts: what stretches a group into a shifting string. 0 for a still air.",
          fr: "De combien la vitesse de l'air s'écarte de celle du vent, chaque lanterne prise dans ses propres rafales : ce qui étire un groupe en une file mouvante. 0 pour un air immobile.",
          es: "Cuánto se aparta la velocidad del aire de la del viento, cada farolillo en sus propias ráfagas: lo que estira un grupo en una fila cambiante. 0 para un aire quieto.",
          it: "Di quanto la velocità dell'aria si scosta da quella del vento, ogni lanterna nelle proprie raffiche: ciò che allunga un gruppo in una fila mutevole. 0 per un'aria ferma." }
      },
      {
        type: "number", key: "turbulence.verticalMS", min: 0, max: 10, step: 0.1, unit: "m/s", group: LanternParameters.AIR,
        effective: () => SkyLantern.TURBULENCE.verticalMS,
        label: { en: "Gusts, up and down", fr: "Rafales, de haut en bas", es: "Ráfagas, arriba y abajo", it: "Raffiche, in su e in giù" }
      },
      {
        type: "number", key: "turbulence.timescaleS", min: 1, max: 600, step: 1, unit: "s", group: LanternParameters.AIR,
        effective: () => SkyLantern.TURBULENCE.timescaleS,
        label: { en: "A gust lasts", fr: "Une rafale dure", es: "Una ráfaga dura", it: "Una raffica dura" }
      },
      {
        type: "number", key: "lantern.luminousIntensityCd", min: 0.1, max: 1000, step: 0.1, unit: "cd", group: LanternParameters.LANTERN,
        effective: () => SkyLantern.COMMON.luminousIntensityCd,
        label: { en: "Light", fr: "Lumière", es: "Luz", it: "Luce" },
        hint: { en: "Its flame's light through the paper, at full burn.", fr: "La lumière de sa flamme à travers le papier, à plein feu.",
          es: "La luz de su llama a través del papel, a pleno fuego.", it: "La luce della sua fiamma attraverso la carta, a piena fiamma." }
      },
      {
        type: "choice", key: "lantern.shape", group: LanternParameters.LANTERN,
        effective: () => SkyLantern.COMMON.shape,
        label: { en: "Shape", fr: "Forme", es: "Forma", it: "Forma" },
        choices: [
          { value: "classic", label: { en: "Round at the mouth, square at the top", fr: "Ronde à la base, carrée au sommet", es: "Redonda en la base, cuadrada arriba", it: "Rotonda alla base, quadrata in cima" } },
          { value: "balloon", label: { en: "Balloon, lobed top", fr: "Montgolfière, sommet en lobes", es: "Globo, cima lobulada", it: "Mongolfiera, cima a lobi" } }
        ]
      },
      {
        type: "colour", key: "lantern.paperColor", group: LanternParameters.LANTERN, fallback: SkyLantern.COMMON.paperColor,
        label: { en: "Paper colour", fr: "Couleur du papier", es: "Color del papel", it: "Colore della carta" },
        hint: { en: "What it looks like by day; by night, what its flame's light comes through.",
          fr: "Son aspect de jour ; de nuit, ce que traverse la lumière de sa flamme.",
          es: "Su aspecto de día; de noche, lo que atraviesa la luz de su llama.",
          it: "Il suo aspetto di giorno; di notte, ciò che attraversa la luce della sua fiamma." }
      },
      {
        type: "colour", key: "lantern.color", group: LanternParameters.LANTERN, fallback: SkyLantern.COMMON.color,
        label: { en: "Flame light", fr: "Lumière de la flamme", es: "Luz de la llama", it: "Luce della fiamma" },
        hint: { en: "Its flame's light through white paper.", fr: "La lumière de sa flamme à travers un papier blanc.",
          es: "La luz de su llama a través de un papel blanco.", it: "La luce della sua fiamma attraverso una carta bianca." }
      },
      {
        type: "number", key: "lantern.envelopeVolumeM3", min: 0.01, max: 10, step: 0.01, unit: "m³", group: LanternParameters.LANTERN,
        effective: () => SkyLantern.COMMON.envelopeVolumeM3,
        label: { en: "Air it holds", fr: "Air qu'elle contient", es: "Aire que contiene", it: "Aria che contiene" }
      },
      {
        type: "number", key: "lantern.massKg", min: 0.005, max: 5, step: 0.001, unit: "kg", group: LanternParameters.LANTERN,
        effective: () => SkyLantern.COMMON.massKg,
        label: { en: "Weight when let go", fr: "Poids au lâcher", es: "Peso al soltarlo", it: "Peso al lancio" }
      }
    ] satisfies ParameterSpec[])
  }

  /** Makes the lantern kind known to the editor. */
  static publish(): void {
    ParameterRegistry.publish(LanternParameters.SET)
  }
}
