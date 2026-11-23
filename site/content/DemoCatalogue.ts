import type { Said } from "../SitePage.js"

/**
 * The address a demo is watched at: the case where it has one, and what the player is asked to show. A demo of a case says what the case
 * is about and opens its first event, with no history in the way — a demo is something to watch, not a list to choose from; whoever wants
 * the rest brings the history back from its own button. A demo of a lone observation just keeps the chips on, the player's own default.
 */
export function demoPlayUrl(demo: Demo, playerPath = "/play/"): string {
  // A whole address, as every link that opens a recording carries one (see PlayerPage): a path of this site would open here only.
  const file = new URL(demo.playSrc ?? demo.editSrc ?? demo.src, "https://ufoathome.org").href
  const asked = demo.playSrc ? "&info=1&timeline=0" : ""
  const opened = demo.openEvents ? `&events=${encodeURIComponent(demo.openEvents)}` : ""
  return `${playerPath}?file=${encodeURIComponent(file)}${asked}${opened}`
}

export interface Demo {
  readonly id: string
  readonly src: string
  /** Which recording the View/Edit links point at, when `src` is a several-observer case. */
  readonly editSrc?: string
  /**
   * What the full-size Player opens, when it is not `src`: the case.json of a several-observer case
   * whose card can only show one of them. A card's sky is a bare `<rr0-scene>`, which plays one
   * recording; the Player is an `<rr0-sighting>`, whose whole point on such a case is the observer
   * picker, so handing it one observer's file took away the very thing the card sends people there
   * for. The editor still opens one recording (`editSrc`, or `src`).
   */
  readonly playSrc?: string
  /**
   * The case's event the Player opens instead of its first one (see PlayUrl's `events=`): the reading that shows the case best, when the
   * witness's own account shows little (Mount Rainier's nine flashes are specks at 20 miles; the Army Air Force's 60 m craft are not).
   */
  readonly openEvents?: string
  readonly title: Said<string>
  /**
   * Whether the title is a NAME — a place, people — whose capital stays wherever the title goes.
   *
   * The others ("A comet", "Un train de Starlink") are capitalised only because a card title starts
   * with them, and lose that capital once put inside a sentence: the player's heading reads
   * "Rejouer un train de Starlink", not "Rejouer Un train de Starlink". Nothing in the text itself
   * tells the two apart, so the catalogue says it.
   */
  readonly titleIsName?: boolean
  readonly blurb: Said<string>
}

/** The sub-pages the catalogue is split over, in the order the hub shows their cards. */
export type DemoSectionId = "sightings" | "sky" | "instruments"

export interface DemoSection {
  readonly id: DemoSectionId
  readonly title: Said<string>
  /** What the hub's card says, and the sub-page's lede. */
  readonly blurb: Said<string>
}

export interface DemoGroup {
  /** The sub-page this group is on. */
  readonly section: DemoSectionId
  readonly heading: Said<string>
  readonly intro: Said<string>
  readonly demos: readonly Demo[]
}

/**
 * The reconstructions this site shows off, in one place.
 *
 * Shared by the catalogue page and by the front page's carousel, because they were showing
 * different subsets of the same thing — a visitor who saw four on the way in and fourteen a click
 * later had been told the tool was smaller than it is. One list, and both pages are as wide as it.
 */
export class DemoCatalogue {

  readonly sections: readonly DemoSection[] = [
    {
      id: "sightings",
      title: { en: "Real sightings", fr: "Observations réelles", es: "Avistamientos reales", it: "Avvistamenti reali" },
      blurb: {
        en: "Documented cases, each replayed in the sky of its own reported date, time and place.",
        fr: "Des dossiers documentés, chacun rejoué dans le ciel de sa propre date, heure et lieu déclarés.",
        es: "Casos documentados, cada uno reproducido en el cielo de su propia fecha, hora y lugar declarados.",
        it: "Casi documentati, ciascuno riprodotto nel cielo della propria data, ora e luogo dichiarati."
      }
    },
    {
      id: "sky",
      title: { en: "What the sky contains", fr: "Ce que contient le ciel", es: "Lo que contiene el cielo", it: "Ciò che contiene il cielo" },
      blurb: {
        en: "Haloes, rainbows, the Milky Way, a comet, a nova, meteors, satellites, a fireball: one sight at a time.",
        fr: "Halos, arcs-en-ciel, Voie lactée, comète, nova, météores, satellites, bolide : un phénomène à la fois.",
        es: "Halos, arcoíris, la Vía Láctea, un cometa, una nova, meteoros, satélites, un bólido: un fenómeno cada vez.",
        it: "Aloni, arcobaleni, la Via Lattea, una cometa, una nova, meteore, satelliti, un bolide: un fenomeno alla volta."
      }
    },
    {
      id: "instruments",
      title: { en: "Instrument and weather", fr: "Instrument et météo", es: "Instrumento y tiempo", it: "Strumento e meteo" },
      blurb: {
        en: "The same sighting through an eye, an Instamatic and a reflex; a storm; an airliner on a long exposure; the ghosts of a lens, and rain on the glass.",
        fr: "La même observation à l'œil, à l'Instamatic et au reflex ; un orage ; un avion en pose longue ; les reflets d'un objectif, et la pluie sur le verre.",
        es: "El mismo avistamiento a ojo, con una Instamatic y con una réflex; una tormenta; un avión en exposición larga; los reflejos de un objetivo, y la lluvia en el cristal.",
        it: "Lo stesso avvistamento a occhio, con una Instamatic e con una reflex; un temporale; un aereo in posa lunga; i riflessi di un obiettivo, e la pioggia sul vetro."
      }
    }
  ]

  readonly groups: readonly DemoGroup[] = [
    {
      section: "sightings",
      heading: { en: "Real sightings", fr: "Des observations réelles", es: "Avistamientos reales", it: "Avvistamenti reali" },
      intro: {
        en: "Sixteen documented cases, each replayed in the sky of its own reported date, time and place.",
        fr: "Seize dossiers documentés, chacun rejoué dans le ciel de sa propre date, heure et lieu déclarés.",
        es: "Dieciséis casos documentados, cada uno reproducido en el cielo de su propia fecha, hora y lugar declarados.",
        it: "Sedici casi documentati, ciascuno riprodotto nel cielo della propria data, ora e luogo dichiarati."
      },
      demos: [
        {
          id: "chiles-whitted",
          src: "/demo-data/observer-chiles.json",
          playSrc: "/demo-data/case-chiles-whitted.json",
          title: { en: "Chiles & Whitted, 1948", fr: "Chiles et Whitted, 1948", es: "Chiles y Whitted, 1948", it: "Chiles e Whitted, 1948" },
          titleIsName: true,
          blurb: {
            en: "Night over Alabama, 02:45. Two airline pilots described the same phenomenon differently — open it full size to switch witness.",
            fr: "Nuit au-dessus de l'Alabama, 02:45. Deux pilotes de ligne ont décrit le même phénomène différemment — ouvrez-le en grand pour changer de témoin.",
            es: "Noche sobre Alabama, 02:45. Dos pilotos de línea describieron el mismo fenómeno de forma distinta — ábrelo a tamaño completo para cambiar de testigo.",
            it: "Notte sull'Alabama, 02:45. Due piloti di linea descrissero lo stesso fenomeno in modo diverso — aprilo a schermo intero per cambiare testimone."
          }
        },
        {
          id: "valensole",
          src: "/demo-data/observer-valensole.json",
          // The case, for the player: the witness told it twice to the gendarmerie, and the two statements differ.
          playSrc: "/demo-data/case-valensole.json",
          title: { en: "Valensole, 1965", fr: "Valensole, 1965", es: "Valensole, 1965", it: "Valensole, 1965" },
          titleIsName: true,
          blurb: {
            en: "Early morning on the plateau, 05:45, the Sun forty minutes up and 7° high in the north-east — and the real relief of that field under the witness's feet. Two statements of the same witness, the gendarmerie's report of 2 July and his deposition of 18 August — open it full size to switch.",
            fr: "Petit matin sur le plateau, 05:45, le Soleil levé depuis quarante minutes, à 7° de hauteur au nord-est — et le relief réel de ce champ sous les pieds du témoin. Deux déclarations du même témoin, le procès-verbal du 2 juillet et sa déposition du 18 août — ouvrez-le en grand pour passer de l'une à l'autre.",
            es: "Primera hora de la mañana en la meseta, 05:45, el Sol salido hace cuarenta minutos y a 7° de altura al nordeste — y el relieve real de ese campo bajo los pies del testigo. Dos declaraciones del mismo testigo, el acta del 2 de julio y su declaración del 18 de agosto — ábrelo a tamaño completo para pasar de una a otra.",
            it: "Primo mattino sull'altopiano, 05:45, il Sole sorto da quaranta minuti e alto 7° a nord-est — e il rilievo reale di quel campo sotto i piedi del testimone. Due dichiarazioni dello stesso testimone, il verbale del 2 luglio e la sua deposizione del 18 agosto — aprilo a schermo intero per passare dall'una all'altra."
          }
        },
        {
          id: "cussac",
          src: "/demo-data/observer-cussac.json",
          // The case, for the player: the two children each saw it from their own spot, and the GEPAN measured both.
          playSrc: "/demo-data/case-cussac.json",
          title: { en: "Cussac, 1967", fr: "Cussac, 1967", es: "Cussac, 1967", it: "Cussac, 1967" },
          titleIsName: true,
          blurb: {
            en: "Mid-morning on a Cantal plateau, 10:30. A sphere 82 m off behind a hedge, four small black beings diving into it, a widening helix — every angle from the GEPAN's 1978 theodolite survey. Two accounts, François's and his sister Anne-Marie's — open it full size to switch.",
            fr: "Milieu de matinée sur un plateau du Cantal, 10:30. Une sphère à 82 m derrière une haie, quatre petits êtres noirs qui y plongent, une hélice qui s'élargit — chaque angle vient du relevé au théodolite du GEPAN en 1978. Deux comptes rendus, celui de François et celui de sa sœur Anne-Marie — ouvrez-le en grand pour passer de l'un à l'autre.",
            es: "Media mañana en una meseta del Cantal, 10:30. Una esfera a 82 m tras un seto, cuatro pequeños seres negros que se zambullen en ella, una hélice que se ensancha — cada ángulo procede del levantamiento con teodolito del GEPAN en 1978. Dos relatos, el de François y el de su hermana Anne-Marie — ábrelo a tamaño completo para pasar de uno a otro.",
            it: "Metà mattina su un altopiano del Cantal, 10:30. Una sfera a 82 m dietro una siepe, quattro piccoli esseri neri che vi si tuffano dentro, un'elica che si allarga — ogni angolo viene dal rilievo al teodolite del GEPAN del 1978. Due racconti, quello di François e quello della sorella Anne-Marie — aprilo a schermo intero per passare dall'uno all'altro."
          }
        },
        {
          id: "socorro",
          src: "/demo-data/observer-socorro.json",
          // The case, for the player: it holds an interpretation beside the account to choose from.
          playSrc: "/demo-data/case-socorro.json",
          title: { en: "Socorro, 1964", fr: "Socorro, 1964", es: "Socorro, 1964", it: "Socorro, 1964" },
          titleIsName: true,
          blurb: {
            en: "Low sun, 17:50, New Mexico. The case people argue about the phenomenon's size in — and where the reconstruction refuses to state one.",
            fr: "Soleil bas, 17:50, Nouveau-Mexique. Le dossier dont on discute la taille du phénomène — et où la reconstitution refuse d'en énoncer une.",
            es: "Sol bajo, 17:50, Nuevo México. El caso en el que se discute el tamaño del fenómeno — y donde la reconstrucción se niega a afirmar uno.",
            it: "Sole basso, 17:50, Nuovo Messico. Il caso in cui si discute delle dimensioni del fenomeno — e in cui la ricostruzione si rifiuta di indicarne una."
          }
        },
        {
          id: "maffliers",
          src: "/demo-data/observer-maffliers.json",
          title: { en: "Maffliers, 2012", fr: "Maffliers, 2012", es: "Maffliers, 2012", it: "Maffliers, 2012" },
          titleIsName: true,
          blurb: {
            en: "Dawn under a low grey sky, 06:06, Val-d'Oise. A silvery shape 8.5° wide before a wood's edge, then a shower, a tilt and a departure, each angle from the GEIPAN's calibrated photographs — and the rising Sun, hidden, 60° to the right.",
            fr: "Petit matin sous un ciel bas et gris, 06:06, Val-d'Oise. Une forme argentée de 8,5° devant une lisière, puis une averse, une bascule et un départ, chaque angle tiré des photos calibrées du GEIPAN — et le Soleil levant, caché, à 60° sur la droite.",
            es: "Amanecer bajo un cielo gris y bajo, 06:06, Val-d'Oise. Una forma plateada de 8,5° de ancho ante el lindero de un bosque, luego un chaparrón, una inclinación y una partida, cada ángulo sacado de las fotografías calibradas del GEIPAN — y el Sol naciente, oculto, 60° a la derecha.",
            it: "Alba sotto un cielo grigio e basso, 06:06, Val-d'Oise. Una forma argentea larga 8,5° davanti al margine di un bosco, poi un rovescio, un'inclinazione e una partenza, ogni angolo tratto dalle fotografie calibrate del GEIPAN — e il Sole nascente, nascosto, 60° sulla destra."
          }
        },
        {
          id: "mcminnville",
          src: "/demo-data/observer-mcminnville.json",
          // The case, for the player: it holds the IPACO study's model on its thread beside the account.
          playSrc: "/demo-data/case-mcminnville.json",
          title: { en: "McMinnville, 1950", fr: "McMinnville, 1950", es: "McMinnville, 1950", it: "McMinnville, 1950" },
          titleIsName: true,
          blurb: {
            en: "Evening on an Oregon farm, 19:45: Paul Trent's two photographs, through the Roamer 1 he took them with. Switch to the 2013 study by Cousyn, Louange and Quick to see what they found: a model 12 cm across on a 70 cm thread under the electric line, swinging 9° between the two exposures — or to the same object as a hubcap, a car mirror, a disc 25 m wide, all of the same angular width and look.",
            fr: "Soir sur une ferme de l'Oregon, 19:45 : les deux photographies de Paul Trent, à travers le Roamer 1 qui les a prises. Passez à l'étude de 2013 de Cousyn, Louange et Quick pour voir ce qu'ils ont trouvé : une maquette de 12 cm au bout d'un fil de 70 cm sous la ligne électrique, qui oscille de 9° entre les deux poses — ou au même objet en enjoliveur, en rétroviseur, en disque de 25 m, tous de même largeur angulaire et de même aspect.",
            es: "Tarde en una granja de Oregón, 19:45: las dos fotografías de Paul Trent, a través de la Roamer 1 con la que las hizo. Pasa al estudio de 2013 de Cousyn, Louange y Quick para ver lo que encontraron: una maqueta de 12 cm colgada de un hilo de 70 cm bajo la línea eléctrica, que oscila 9° entre las dos tomas — o al mismo objeto como tapacubos, retrovisor, disco de 25 m, todos de la misma anchura angular y el mismo aspecto.",
            it: "Sera in una fattoria dell'Oregon, 19:45: le due fotografie di Paul Trent, attraverso la Roamer 1 con cui le scattò. Passa allo studio del 2013 di Cousyn, Louange e Quick per vedere cosa trovarono: un modellino di 12 cm appeso a un filo di 70 cm sotto la linea elettrica, che oscilla di 9° fra i due scatti — o allo stesso oggetto come copricerchio, specchietto, disco di 25 m, tutti con la stessa larghezza angolare e lo stesso aspetto."
          }
        },
        {
          id: "silly-le-long",
          src: "/demo-data/observer-silly-le-long.json",
          // The case, for the player: it holds the GEIPAN's reading beside the account.
          playSrc: "/demo-data/case-silly-le-long.json",
          title: { en: "Silly-le-Long, 2015", fr: "Silly-le-Long, 2015", es: "Silly-le-Long, 2015", it: "Silly-le-Long, 2015" },
          titleIsName: true,
          blurb: {
            en: "A gendarmerie van on the RN2 at 00:50, a Moon almost full behind it, and a light aircraft on final that stays pinned to one spot as both close in. Switch to the GEIPAN's reading to see it — and how far it stays from what the driver described.",
            fr: "Un fourgon de gendarmerie sur la RN2 à 00:50, une Lune presque pleine dans son dos, et un avion de tourisme en finale qui reste accroché au même point pendant que tous deux se rapprochent. Passez à la lecture du GEIPAN pour le voir — et mesurer ce qui le sépare de ce que le conducteur a décrit.",
            es: "Una furgoneta de la gendarmería en la RN2 a las 00:50, una Luna casi llena a su espalda, y una avioneta en final que permanece clavada en un mismo punto mientras ambos se acercan. Pasa a la lectura del GEIPAN para verla — y cuánto se aleja de lo que describió el conductor.",
            it: "Un furgone della gendarmeria sulla RN2 alle 00:50, una Luna quasi piena alle spalle, e un aereo da turismo in finale che resta fermo nello stesso punto mentre entrambi si avvicinano. Passa alla lettura del GEIPAN per vederlo — e quanto resta lontano da ciò che il conducente descrisse."
          }
        },
        {
          id: "braine-le-comte",
          src: "/demo-data/observer-braine-le-comte-akh.json",
          // The case, for the player: three observers, each with a different account of the same ten seconds.
          playSrc: "/demo-data/case-braine-le-comte.json",
          title: { en: "Braine-le-Comte, 2015", fr: "Braine-le-Comte, 2015", es: "Braine-le-Comte, 2015", it: "Braine-le-Comte, 2015" },
          titleIsName: true,
          blurb: {
            en: "A July night in Hainaut, 00:45, no Moon. Three witnesses on a lawn, each watching a different part of the sky, see a dark boomerang cross it in ten seconds — with orange lights for one, red lights for another, and none for the third. Open it full size to switch witness.",
            fr: "Une nuit de juillet dans le Hainaut, 00:45, sans Lune. Trois témoins sur une pelouse, chacun regardant une partie différente du ciel, voient un boomerang sombre le traverser en dix secondes — avec des lumières orange pour l'un, des lumières rouges pour un autre, et aucune pour le troisième. Ouvrez-le en grand pour changer de témoin.",
            es: "Una noche de julio en el Hainaut, 00:45, sin Luna. Tres testigos en un césped, cada uno mirando una parte distinta del cielo, ven cruzarlo un bumerán oscuro en diez segundos — con luces naranjas para uno, luces rojas para otro, y ninguna para el tercero. Ábrelo a tamaño completo para cambiar de testigo.",
            it: "Una notte di luglio nell'Hainaut, 00:45, senza Luna. Tre testimoni su un prato, ciascuno rivolto a una parte diversa del cielo, vedono attraversarlo un boomerang scuro in dieci secondi — con luci arancioni per uno, luci rosse per un altro, e nessuna per il terzo. Aprilo a schermo intero per cambiare testimone."
          }
        },
        {
          id: "mont-rainier",
          src: "/demo-data/observer-arnold.json",
          // The case, for the player: his own reading and the pelicans, solved from his two timings.
          playSrc: "/demo-data/case-mont-rainier.json",
          openEvents: "interpretation-mont-rainier-aaf",
          title: { en: "Mount Rainier, 1947", fr: "Mont Rainier, 1947", es: "Monte Rainier, 1947", it: "Monte Rainier, 1947" },
          titleIsName: true,
          blurb: {
            en: "24 June 1947, 14:59, from the cockpit at 9,200 ft. Kenneth Arnold times a chain of nine flashing objects from Mount Rainier to Mount Adams, 90 km away on a crystal-clear day. Replayed from his report, with his reading, the pelican one his timings put 5.6 km from him, and the craft as large as the Army Air Force's analysts worked out they had to be to be seen.",
            fr: "24 juin 1947, 14 h 59, depuis le poste à 9 200 pieds. Kenneth Arnold chronomètre une chaîne de neuf objets étincelants du mont Rainier au mont Adams, à 90 km par un jour d'une clarté de cristal. Rejoué d'après son rapport, avec sa lecture, celle des pélicans, que ses chronométrages placent à 5,6 km de lui, et des engins aussi grands que les analystes de l'Army Air Force les jugèrent nécessaires pour être vus.",
            es: "24 de junio de 1947, 14:59, desde la cabina a 9.200 pies. Kenneth Arnold cronometra una cadena de nueve objetos destellantes del monte Rainier al monte Adams, a 90 km en un día claro como el cristal. Reproducido según su informe, con su lectura, la de los pelícanos, que sus cronometrajes sitúan a 5,6 km de él, y aparatos tan grandes como los analistas de la Army Air Force calcularon que debían ser para verse.",
            it: "24 giugno 1947, 14:59, dalla cabina a 9.200 piedi. Kenneth Arnold cronometra una catena di nove oggetti scintillanti dal monte Rainier al monte Adams, a 90 km in una giornata limpida come il cristallo. Riprodotto dal suo rapporto, con la sua lettura, quella dei pellicani, che i suoi cronometraggi collocano a 5,6 km da lui, e velivoli grandi quanto gli analisti della Army Air Force calcolarono che dovessero essere per essere visti."
          }
        },
        {
          id: "montclair",
          src: "/demo-data/observer-montclair-2024-11-30-road.json",
          // The case, for the player: both nights "Friday night" may be, both ways he may have looked, and the readings of the Metabunk thread.
          playSrc: "/demo-data/case-montclair.json",
          openEvents: "interpretation-montclair-spirit-nks1862-road",
          title: { en: "Montclair, 2024", fr: "Montclair, 2024", es: "Montclair, 2024", it: "Montclair, 2024" },
          titleIsName: true,
          blurb: {
            en: "New Jersey's drone wave, about 00:40. Driving into Montclair, Evan Cutler sees a light \"like the full Moon\" right over the horizon, coming towards him, and takes it for a drone the size of a school bus. Replayed with every aircraft of the ADS-B record: at 00:40 on the 30th a Spirit A320neo flies straight at him with its landing lights on.",
            fr: "Vague de drones du New Jersey, vers 0 h 40. En entrant dans Montclair, Evan Cutler voit une lumière « comme la pleine Lune » juste au-dessus de l'horizon, qui vient vers lui, et la prend pour un drone de la taille d'un bus scolaire. Rejoué avec tous les avions du relevé ADS-B : le 30 à 0 h 40, un A320neo de Spirit vole droit sur lui, phares d'atterrissage allumés.",
            es: "Oleada de drones de Nueva Jersey, hacia las 00:40. Entrando en Montclair, Evan Cutler ve una luz «como la luna llena» justo sobre el horizonte, que viene hacia él, y la toma por un dron del tamaño de un autobús escolar. Reproducido con todos los aviones del registro ADS-B: el 30 a las 00:40, un A320neo de Spirit vuela derecho hacia él con las luces de aterrizaje encendidas.",
            it: "Ondata di droni del New Jersey, verso le 00:40. Entrando a Montclair, Evan Cutler vede una luce «come la luna piena» appena sopra l'orizzonte, che viene verso di lui, e la prende per un drone grande come uno scuolabus. Riprodotto con tutti gli aerei del registro ADS-B: il 30 alle 00:40, un A320neo di Spirit vola dritto verso di lui con le luci di atterraggio accese."
          }
        },
        {
          id: "trans-en-provence",
          src: "/demo-data/observer-trans-en-provence.json",
          playSrc: "/demo-data/case-trans-en-provence.json",
          title: { en: "Trans-en-Provence, 1981", fr: "Trans-en-Provence, 1981", es: "Trans-en-Provence, 1981", it: "Trans-en-Provence, 1981" },
          titleIsName: true,
          blurb: {
            en: "Dusk in the Var, 17:00, 8 January. A man building a pump shelter hears a faint whistle: a grey machine of two upturned saucers, 2.5 m across, drops onto his terrace, stays some twenty seconds against the retaining wall, then tilts and leaves to the north-east. The GEPAN measured its mark and the plants around it — the metres here are its reconstruction's. Switch to its reading to see what the witness could not have seen from where he stood.",
            fr: "Crépuscule dans le Var, 17:00, le 8 janvier. Un homme qui construit l'abri d'une pompe entend un léger sifflement : un engin gris fait de deux assiettes renversées, de 2,5 m de diamètre, tombe sur sa terrasse, reste une vingtaine de secondes contre le mur de soutènement, puis bascule et repart vers le nord-est. Le GEPAN a mesuré sa trace et les plantes alentour — les mètres sont ceux de sa reconstitution. Passez à sa lecture pour voir ce que le témoin ne pouvait pas voir d'où il se tenait.",
            es: "Anochecer en el Var, 17:00, el 8 de enero. Un hombre que construye el cobertizo de una bomba oye un leve silbido: un aparato gris de dos platos invertidos, de 2,5 m de diámetro, cae sobre su terraza, se queda una veintena de segundos contra el muro de contención, luego se inclina y se va hacia el nordeste. El GEPAN midió su huella y las plantas de alrededor — los metros son los de su reconstrucción. Pasa a su lectura para ver lo que el testigo no podía ver desde donde estaba.",
            it: "Crepuscolo nel Var, 17:00, l'8 gennaio. Un uomo che costruisce il riparo di una pompa sente un leggero sibilo: un velivolo grigio fatto di due piatti rovesciati, di 2,5 m di diametro, cade sulla sua terrazza, resta una ventina di secondi contro il muro di sostegno, poi si inclina e riparte verso nord-est. Il GEPAN ha misurato la sua traccia e le piante intorno — i metri sono quelli della sua ricostruzione. Passa alla sua lettura per vedere ciò che il testimone non poteva vedere da dove si trovava."
          }
        },
        {
          id: "wilcox",
          src: "/demo-data/observer-wilcox.json",
          title: { en: "Wilcox, 1964", fr: "Wilcox, 1964", es: "Wilcox, 1964", it: "Wilcox, 1964" },
          titleIsName: true,
          blurb: {
            en: "Broad daylight, 10:00, New York State, with a cloud deck lifting from 800 m to 913 m across the two hours the record covers.",
            fr: "Plein jour, 10:00, État de New York, avec une base de nuages qui monte de 800 m à 913 m sur les deux heures que couvre le relevé.",
            es: "Pleno día, 10:00, estado de Nueva York, con una capa de nubes que sube de 800 m a 913 m durante las dos horas que abarca el registro.",
            it: "Pieno giorno, 10:00, Stato di New York, con uno strato di nubi che sale da 800 m a 913 m nelle due ore coperte dalla registrazione."
          }
        },
        {
          id: "mission-viejo",
          src: "/demo-data/observer-mission-viejo.json",
          title: { en: "Mission Viejo, 2026", fr: "Mission Viejo, 2026", es: "Mission Viejo, 2026", it: "Mission Viejo, 2026" },
          titleIsName: true,
          blurb: {
            en: "Dusk in Orange County, 19:45. A yellow orb with an orange rim crosses the southern sky in two seconds and drops behind a tree line. Built from a single post on X and the witness's own sketch, with every guess marked as one.",
            fr: "Crépuscule dans le comté d'Orange, 19:45. Une boule jaune cerclée d'orange traverse le ciel sud en deux secondes et plonge derrière une lisière. Reconstituée à partir d'un seul post sur X et du croquis du témoin, chaque supposition marquée comme telle.",
            es: "Anochecer en el condado de Orange, 19:45. Un orbe amarillo con borde naranja cruza el cielo sur en dos segundos y cae tras una hilera de árboles. Reconstruido a partir de una sola publicación en X y del boceto del testigo, cada suposición marcada como tal.",
            it: "Crepuscolo nella contea di Orange, 19:45. Una sfera gialla bordata d'arancio attraversa il cielo a sud in due secondi e scende dietro una fila d'alberi. Ricostruita da un solo post su X e dallo schizzo del testimone, ogni supposizione segnata come tale."
          }
        },
        {
          id: "saint-lo",
          src: "/demo-data/observer-saint-lo.json",
          // The case, for the player and its editor: the observer's account, and the interview held with him.
          playSrc: "/demo-data/case-saint-lo.json",
          title: { en: "Saint-Lô, 2026", fr: "Saint-Lô, 2026", es: "Saint-Lô, 2026", it: "Saint-Lô, 2026" },
          titleIsName: true,
          blurb: {
            en: "A moonless night in Normandy, about 2:30. A translucent white half-moon trailing filaments crosses the whole sky from north to south in four seconds and ends in a 720-degree spiral behind the trees. Built from the witness's written replies to an investigator's questions; his drawing is still to come.",
            fr: "Une nuit sans Lune en Normandie, vers 2 h 30. Une demi-lune blanche translucide, traînant des filaments, traverse tout le ciel du nord au sud en quatre secondes et finit en spirale de 720° derrière les arbres. Reconstituée d'après les réponses écrites du témoin aux questions d'un enquêteur ; son dessin reste à venir.",
            es: "Una noche sin Luna en Normandía, hacia las 2:30. Una media luna blanca translúcida, con filamentos tras de sí, cruza todo el cielo de norte a sur en cuatro segundos y termina en una espiral de 720° tras los árboles. Reconstruido a partir de las respuestas escritas del testigo a las preguntas de un investigador; su dibujo está por llegar.",
            it: "Una notte senza Luna in Normandia, verso le 2:30. Una mezzaluna bianca traslucida, con filamenti al seguito, attraversa tutto il cielo da nord a sud in quattro secondi e finisce in una spirale di 720° dietro gli alberi. Ricostruita dalle risposte scritte del testimone alle domande di un investigatore; il suo disegno deve ancora arrivare."
          }
        },
        {
          id: "duboc",
          src: "/demo-data/observer-duboc.json",
          // The case, for the player: the captain's account and the co-pilot's, of the same two minutes.
          playSrc: "/demo-data/case-duboc.json",
          title: { en: "Duboc, 1994", fr: "Duboc, 1994", es: "Duboc, 1994", it: "Duboc, 1994" },
          titleIsName: true,
          blurb: {
            en: "An Air France A320 at 11,700 m near Coulommiers, 13:14, above a deck of altocumulus. A dark red-brown disc sits motionless below and to the left, is left behind in two minutes, then turns transparent and vanishes. Open it full size to switch to the co-pilot, who saw it keep up with the airliner and change shape.",
            fr: "Un A320 d'Air France à 11 700 m près de Coulommiers, 13 h 14, au-dessus d'une couche d'altocumulus. Un disque brun-rouge sombre reste immobile en dessous et à gauche, est laissé derrière en deux minutes, puis devient transparent et disparaît. Ouvrez-le en grand pour passer à la copilote, qui l'a vu suivre l'avion et changer de forme.",
            es: "Un A320 de Air France a 11.700 m cerca de Coulommiers, 13:14, sobre una capa de altocúmulos. Un disco pardo rojizo oscuro permanece inmóvil por debajo y a la izquierda, queda atrás en dos minutos, luego se vuelve transparente y desaparece. Ábrelo a tamaño completo para pasar a la copiloto, que lo vio seguir al avión y cambiar de forma.",
            it: "Un A320 Air France a 11.700 m vicino a Coulommiers, 13:14, sopra uno strato di altocumuli. Un disco bruno-rosso scuro resta immobile sotto e a sinistra, viene lasciato indietro in due minuti, poi diventa trasparente e scompare. Aprilo a schermo intero per passare alla copilota, che lo vide tenere il passo dell'aereo e cambiare forma."
          }
        },
        {
          id: "concorde-1976",
          src: "/demo-data/observer-concorde-1976.json",
          // The case, for the player: the film, and the eight readings of the orb tested against it.
          playSrc: "/demo-data/case-concorde-1976.json",
          title: { en: "Concorde and its orb, 1976", fr: "Le Concorde et son orbe, 1976", es: "El Concorde y su orbe, 1976", it: "Il Concorde e la sua sfera, 1976" },
          blurb: {
            en: "The British Airways film of Concorde shot from a Learjet through the Astrovision periscope, laid over the reconstruction: a pale orb comes down beside the aircraft, turns back as the camera does, slides along the fuselage and rises above it. Slide the film in and out against the scene. Measured on the film: the camera's moves, the ground sliding by, the copy's look; supposed: the date, the height, the lens, and so the Sun. Open it full size for the eight readings of the orb, each with what it was tested against: a lens ghost, the periscope, a pane, a glint on Concorde, a drop, dust, a flaw of the film, a real object.",
            fr: "Le film British Airways du Concorde tourné depuis un Learjet par le périscope Astrovision, posé sur la reconstitution : une orbe pâle descend près de l'avion, repart quand la caméra repart, glisse le long du fuselage et remonte au-dessus. Faites varier l'opacité du film contre la scène. Mesurés sur le film : les mouvements de la caméra, le défilement du sol, l'aspect de la copie ; supposés : la date, l'altitude, la focale, et donc le Soleil. Ouvrez-le en grand pour les huit lectures de l'orbe, chacune avec ce à quoi elle a été confrontée : reflet d'objectif, périscope, vitre, éclat sur le Concorde, goutte, poussière, défaut du film, objet réel.",
            es: "La película de British Airways del Concorde rodada desde un Learjet con el periscopio Astrovision, superpuesta a la reconstrucción: un orbe pálido baja junto al avión, vuelve a subir cuando lo hace la cámara, se desliza a lo largo del fuselaje y asciende por encima. Varíe la opacidad de la película frente a la escena. Medidos en la película: los movimientos de la cámara, el desfile del suelo, el aspecto de la copia; supuestos: la fecha, la altitud, la focal, y por tanto el Sol. Ábralo a tamaño completo para las ocho lecturas del orbe, cada una con aquello con lo que se contrastó: reflejo de objetivo, periscopio, cristal, destello en el Concorde, gota, polvo, defecto de la película, objeto real.",
            it: "Il film British Airways del Concorde girato da un Learjet con il periscopio Astrovision, sovrapposto alla ricostruzione: una sfera pallida scende accanto all'aereo, risale quando lo fa la camera, scivola lungo la fusoliera e sale sopra di essa. Variate l'opacità del film rispetto alla scena. Misurati sul film: i movimenti della camera, lo scorrere del suolo, l'aspetto della copia; supposti: la data, l'altitudine, la focale, e quindi il Sole. Apritelo a schermo intero per le otto letture della sfera, ciascuna con ciò con cui è stata confrontata: riflesso d'obiettivo, periscopio, vetro, bagliore sul Concorde, goccia, polvere, difetto della pellicola, oggetto reale."
          }
        },
        {
          id: "western-us-event",
          src: "/demo-data/observer-western-us-event-w3-1.json",
          // The case, for the player: five federal agents over two evenings and a dawn, and every reading tested against them.
          playSrc: "/demo-data/case-western-us-event.json",
          title: { en: "Western US Event, 2023", fr: "Western US Event, 2023", es: "Western US Event, 2023", it: "Western US Event, 2023" },
          titleIsName: true,
          blurb: {
            en: "Dusk in a Nevada valley, 19:00. An orange orb comes on from the east, turns clear and orange in turn, and expels three small red orbs that head south. The case the FBI recreated in two videos, rebuilt here in 3D for all five agents, with the readings tested against them: AARO's decoy flares, an illumination flare, a drone, obstruction lights, gossamer. Open it full size to switch witness and reading.",
            fr: "Crépuscule dans une vallée du Nevada, 19:00. Une orbe orange arrive de l'est, tour à tour transparente et orange, et expulse trois petites orbes rouges qui partent vers le sud. Le cas que le FBI a reconstitué en deux vidéos, refait ici en 3D pour les cinq agents, avec les lectures confrontées à leurs récits : leurres de l'AARO, fusée éclairante, drone, feux d'obstacle, fils de la Vierge. Ouvrez-le en grand pour changer de témoin et de lecture.",
            es: "Anochecer en un valle de Nevada, 19:00. Un orbe naranja llega del este, alternando transparente y naranja, y expulsa tres pequeños orbes rojos que se van hacia el sur. El caso que el FBI recreó en dos vídeos, reconstruido aquí en 3D para los cinco agentes, con las lecturas confrontadas a sus relatos: señuelos de la AARO, bengala de iluminación, dron, luces de obstáculo, hilos de araña. Ábrelo a tamaño completo para cambiar de testigo y de lectura.",
            it: "Crepuscolo in una valle del Nevada, 19:00. Una sfera arancione arriva da est, alternando trasparente e arancione, ed espelle tre piccole sfere rosse che vanno verso sud. Il caso che l'FBI ha ricostruito in due video, rifatto qui in 3D per i cinque agenti, con le letture confrontate ai loro resoconti: esche dell'AARO, razzo illuminante, drone, luci di ostacolo, fili di ragno. Aprilo a schermo intero per cambiare testimone e lettura."
          }
        },
        {
          id: "washington-capitol",
          src: "/demo-data/sky-test-washington-capitol.json",
          title: { en: "The Capitol, July 1952", fr: "Le Capitole, juillet 1952", es: "El Capitolio, julio de 1952", it: "Il Campidoglio, luglio 1952" },
          blurb: {
            en: "The photograph of lights above the Capitol dome during the Washington sightings, laid over the scene: each is the ghost of a lamp standard below, mirrored through the lens's axis by a filter, a pair of points because the standards carry several globes. Point at one to see which. Camera, standpoint and night assumed.",
            fr: "La photo de lumières au-dessus du dôme du Capitole lors des observations de Washington, posée sur la scène : chacune est le reflet d'un candélabre en contrebas, renvoyé à l'opposé de l'axe de l'objectif par un filtre, en paire de points parce que les candélabres portent plusieurs globes. Pointez-en une pour voir lequel. Appareil, point de vue et nuit supposés.",
            es: "La foto de luces sobre la cúpula del Capitolio durante los avistamientos de Washington, superpuesta a la escena: cada una es el reflejo de un candelabro de abajo, devuelto al otro lado del eje del objetivo por un filtro, en pareja de puntos porque los candelabros llevan varios globos. Señala una para ver cuál. Cámara, punto de vista y noche supuestos.",
            it: "La foto di luci sopra la cupola del Campidoglio durante gli avvistamenti di Washington, sovrapposta alla scena: ognuna è il riflesso di un candelabro sottostante, rimandato dalla parte opposta dell'asse dell'obiettivo da un filtro, in coppia di punti perché i candelabri portano più globi. Indicane una per vedere quale. Fotocamera, punto di vista e notte ipotizzati."
          }
        }
      ]
    },
    {
      section: "sky",
      heading: { en: "What the sky can hold", fr: "Ce que le ciel peut contenir", es: "Lo que puede contener el cielo", it: "Ciò che il cielo può contenere" },
      intro: {
        en: "These hold no recorded phenomenon at all. They are skies set up with the conditions one "
          + "sight needs, for looking at that sight — because most of them need three or four "
          + "conditions at once, and knowing which is exactly what separates “there was no Milky "
          + "Way” from “I could not have seen it”.",
        fr: "Ceux-ci ne contiennent aucun phénomène enregistré. Ce sont des ciels réglés avec les "
          + "conditions qu'exige un phénomène, pour regarder ce phénomène — car la plupart en "
          + "demandent trois ou quatre à la fois, et savoir lesquelles est exactement ce qui sépare "
          + "« il n'y avait pas de Voie lactée » de « je n'aurais pas pu la voir ».",
        es: "Estos no contienen ningún fenómeno registrado. Son cielos preparados con las condiciones que "
          + "exige una visión, para contemplar esa visión — porque la mayoría necesitan tres o cuatro "
          + "condiciones a la vez, y saber cuáles es exactamente lo que separa “no había Vía Láctea” de "
          + "“no habría podido verla”.",
        it: "Questi non contengono alcun fenomeno registrato. Sono cieli impostati con le condizioni che "
          + "una visione richiede, per osservare quella visione — perché la maggior parte ne richiede tre o "
          + "quattro insieme, e sapere quali è esattamente ciò che separa “non c'era la Via Lattea” da "
          + "“non avrei potuto vederla”."
      },
      demos: [
        {
          id: "air-traffic",
          src: "/demo-data/sky-test-air-traffic.json",
          title: { en: "Air traffic and trails", fr: "Trafic aérien et traînées", es: "Tráfico aéreo y estelas", it: "Traffico aereo e scie" },
          blurb: {
            en: "Gonesse, 30 December 2025, 16:10 UTC: the aircraft that were really in this sky, from adsb.lol's record. Their lamps, the Sun still lighting them after the ground has lost it, the trail their engines leave where the air aloft allows one, and the sound of those that could be heard. Point at one to read what the record says of it. A compatible candidate, never an identification.",
            fr: "Gonesse, 30 décembre 2025, 16 h 10 UTC : les avions qui étaient réellement dans ce ciel, d'après le relevé d'adsb.lol. Leurs feux, le Soleil qui les éclaire encore quand le sol l'a perdu, la traînée que leurs moteurs laissent là où l'air en altitude le permet, et le son de ceux qu'on pouvait entendre. Pointez-en un pour lire ce que le relevé en dit. Un candidat compatible, jamais une identification.",
            es: "Gonesse, 30 de diciembre de 2025, 16:10 UTC: los aviones que realmente estaban en este cielo, según el registro de adsb.lol. Sus luces, el Sol que aún los ilumina cuando el suelo lo ha perdido, la estela que dejan sus motores donde el aire en altura lo permite y el sonido de los que podían oírse. Apunte a uno para leer lo que el registro dice de él. Un candidato compatible, nunca una identificación.",
            it: "Gonesse, 30 dicembre 2025, 16:10 UTC: gli aerei che erano davvero in questo cielo, secondo l'archivio di adsb.lol. Le loro luci, il Sole che li illumina ancora quando il suolo l'ha perso, la scia che i loro motori lasciano dove l'aria in quota lo consente e il suono di quelli che si potevano sentire. Puntatene uno per leggere cosa dice l'archivio. Un candidato compatibile, mai un'identificazione."
          }
        },
        {
          id: "clouds",
          src: "/demo-data/sky-test-clouds.json",
          title: { en: "Cloud layers in motion", fr: "Couches nuageuses en mouvement", es: "Capas de nubes en movimiento", it: "Strati di nubi in movimento" },
          blurb: {
            en: "Cloud layers you can set — altitude, thickness, coverage, size, density, wind — down to individual clouds driven one by one.",
            fr: "Des couches nuageuses paramétrables — altitude, épaisseur, couverture, taille, densité, vent — jusqu'à des nuages individuels pilotés un par un.",
            es: "Capas de nubes configurables — altitud, espesor, cobertura, tamaño, densidad, viento — hasta nubes individuales dirigidas una a una.",
            it: "Strati di nubi regolabili — quota, spessore, copertura, dimensione, densità, vento — fino a singole nubi guidate una per una."
          }
        },
        {
          id: "halos",
          src: "/demo-data/sky-test-halos.json",
          title: { en: "Ice haloes and sundogs", fr: "Halos de glace et parhélies", es: "Halos de hielo y parhelios", it: "Aloni di ghiaccio e pareli" },
          blurb: {
            en: "A halo photographed with a phone in Royan, rebuilt where, when and through what it was taken: a cirrostratus veil, a Sun 21° up, crystals falling level; a hexagonal ice prism and Snell's law give every angle. The sky stays as it is and the phone moves: the round ghost of the Sun in its lens swings to the other side of the centre, merges with the Sun, spreads as it zooms. Angles checked against Atmospheric Optics.",
            fr: "Un halo photographié au téléphone à Royan, reconstitué là, à l'heure et à travers l'appareil où il l'a été : un voile de cirrostratus, un Soleil à 21°, des cristaux tombant à plat ; un prisme hexagonal de glace et la loi de Snell donnent chaque angle. Le ciel ne change pas, le téléphone bouge : le reflet rond du Soleil dans son objectif passe de l'autre côté du centre, se confond avec le Soleil, s'écarte quand on zoome. Angles vérifiés cohérents avec Atmospheric Optics.",
            es: "Un halo fotografiado con un teléfono en Royan, reconstruido donde, cuando y a través de lo que se tomó: un velo de cirrostratos, un Sol a 21° de altura, cristales que caen planos; un prisma hexagonal de hielo y la ley de Snell dan cada ángulo. El cielo no cambia y el teléfono se mueve: el reflejo redondo del Sol en su objetivo pasa al otro lado del centro, se confunde con el Sol y se separa al hacer zoom. Ángulos comprobados con Atmospheric Optics.",
            it: "Un alone fotografato con un telefono a Royan, ricostruito dove, quando e attraverso cosa è stato scattato: un velo di cirrostrati, un Sole alto 21°, cristalli che cadono orizzontali; un prisma esagonale di ghiaccio e la legge di Snell danno ogni angolo. Il cielo non cambia e il telefono si muove: il riflesso rotondo del Sole nel suo obiettivo passa dall'altra parte del centro, si confonde con il Sole e si allontana zoomando. Angoli verificati con Atmospheric Optics."
          }
        },
        {
          id: "rainbow",
          src: "/demo-data/sky-test-rainbow.json",
          title: { en: "Rainbow", fr: "Arc-en-ciel", es: "Arcoíris", it: "Arcobaleno" },
          blurb: {
            en: "Rain, a Sun 9° up, a gap in the cloud, a witness facing away from it — all four, or nothing. Primary, secondary reversed, Alexander's band between.",
            fr: "De la pluie, un Soleil à 9°, une trouée dans les nuages, un témoin tournant le dos — les quatre, ou rien. Primaire, secondaire inversé, bande d'Alexandre entre les deux.",
            es: "Lluvia, un Sol a 9° de altura, un claro en las nubes, un testigo de espaldas a él — los cuatro, o nada. Primario, secundario invertido, banda de Alejandro entre ambos.",
            it: "Pioggia, un Sole alto 9°, uno squarcio tra le nubi, un testimone che gli volta le spalle — tutti e quattro, o niente. Primario, secondario invertito, banda di Alessandro in mezzo."
          }
        },
        {
          id: "moonbow",
          src: "/demo-data/sky-test-moonbow.json",
          title: { en: "Moonbow", fr: "Arc lunaire", es: "Arcoíris lunar", it: "Arcobaleno lunare" },
          blurb: {
            en: "The same geometry under a full Moon 22° up. Too faint for colour vision, so the eye sees a white arc — which is what witnesses describe.",
            fr: "La même géométrie sous une pleine Lune à 22°. Trop faible pour la vision des couleurs : l'œil voit un arc blanc — c'est ce que décrivent les témoins.",
            es: "La misma geometría bajo una Luna llena a 22° de altura. Demasiado débil para la visión de los colores, así que el ojo ve un arco blanco — que es lo que describen los testigos.",
            it: "La stessa geometria sotto una Luna piena alta 22°. Troppo debole per la visione dei colori, così l'occhio vede un arco bianco — che è ciò che descrivono i testimoni."
          }
        },
        {
          id: "milkyway",
          src: "/demo-data/sky-test-milkyway.json",
          title: { en: "The Milky Way", fr: "La Voie lactée", es: "La Vía Láctea", it: "La Via Lattea" },
          blurb: {
            en: "New Moon, Sun 65° down, galactic centre 81° up over the Atacama. Integrated through a real dust model, so the dark rift falls out of the calculation.",
            fr: "Nouvelle Lune, Soleil à 65° sous l'horizon, centre galactique à 81° au-dessus de l'Atacama. Intégrée dans un vrai modèle de poussière : le rift sombre sort du calcul.",
            es: "Luna nueva, Sol a 65° bajo el horizonte, centro galáctico a 81° de altura sobre Atacama. Integrada a través de un modelo real de polvo, así que la grieta oscura sale del propio cálculo.",
            it: "Luna nuova, Sole 65° sotto l'orizzonte, centro galattico alto 81° sopra l'Atacama. Integrata attraverso un vero modello di polvere, così la fenditura oscura emerge dal calcolo stesso."
          }
        },
        {
          id: "zodiacal",
          src: "/demo-data/sky-test-zodiacal.json",
          title: { en: "Zodiacal light", fr: "Lumière zodiacale", es: "Luz zodiacal", it: "Luce zodiacale" },
          blurb: {
            en: "Sun 16° below the horizon, no Moon, the Sun's path standing steep over the west: a faint tilted cone of light with blurred edges, gone within the hour.",
            fr: "Soleil à 16° sous l'horizon, pas de Lune, la route du Soleil presque dressée au couchant : une faible lueur en cône incliné, aux contours flous, disparue en moins d'une heure.",
            es: "Sol a 16° bajo el horizonte, sin Luna, la trayectoria del Sol casi vertical sobre el oeste: un débil cono de luz inclinado, de bordes difusos, desaparecido antes de una hora.",
            it: "Sole 16° sotto l'orizzonte, niente Luna, il percorso del Sole quasi verticale sull'ovest: un debole cono di luce inclinato, dai contorni sfumati, scomparso entro l'ora."
          }
        },
        {
          id: "comet",
          src: "/demo-data/sky-test-comet.json",
          title: { en: "A comet", fr: "Une comète", es: "Un cometa", it: "Una cometa" },
          blurb: {
            en: "Hale-Bopp at dusk on 1 April 1997, magnitude −0.8, 30° up to the north-west with a 20° tail. The orbit is propagated from that apparition's own elements.",
            fr: "Hale-Bopp au crépuscule du 1ᵉʳ avril 1997, magnitude −0,8, à 30° de hauteur au nord-ouest, queue de 20°. L'orbite est propagée depuis les éléments de cette apparition.",
            es: "Hale-Bopp al anochecer del 1 de abril de 1997, magnitud −0,8, a 30° de altura al noroeste con una cola de 20°. La órbita se propaga a partir de los elementos de esa misma aparición.",
            it: "Hale-Bopp al crepuscolo del 1º aprile 1997, magnitudine −0,8, alta 30° a nord-ovest con una coda di 20°. L'orbita è propagata dagli elementi di quella stessa apparizione."
          }
        },
        {
          id: "nova",
          src: "/demo-data/sky-test-nova.json",
          title: { en: "A new star", fr: "Une étoile nouvelle", es: "Una estrella nueva", it: "Una stella nuova" },
          blurb: {
            en: "Nova Aquilae over Paris, 10 June 1918, 23:30, magnitude 0.2 where nothing shone the night before. Its brightness is interpolated between the AAVSO's own observations.",
            fr: "La nova de l'Aigle au-dessus de Paris, 10 juin 1918, 23 h 30, magnitude 0,2 là où rien ne brillait la veille. Son éclat est interpolé entre les observations de l'AAVSO.",
            es: "Nova Aquilae sobre París, 10 de junio de 1918, 23:30, magnitud 0,2 donde la noche anterior no brillaba nada. Su brillo se interpola entre las observaciones de la propia AAVSO.",
            it: "Nova Aquilae sopra Parigi, 10 giugno 1918, 23:30, magnitudine 0,2 dove la notte prima non brillava nulla. La sua luminosità è interpolata tra le osservazioni dell'AAVSO."
          }
        },
        {
          id: "eclipse",
          src: "/demo-data/sky-test-eclipse.json",
          title: { en: "A total solar eclipse", fr: "Une éclipse totale de Soleil", es: "Un eclipse total de Sol", it: "Un'eclissi totale di Sole" },
          blurb: {
            en: "Reims, 11 August 1999, 12:15 to 12:35: the partial phases through eclipse glasses, then the glasses come off for totality at 12:24:30. Nothing is declared: the Moon's position over the Sun's, worked out for this place and this second, gives the crescent, the failing light, the corona and the stars. Paris, 130 km away, had only 99%.",
            fr: "Reims, 11 août 1999, de 12 h 15 à 12 h 35 : les phases partielles à travers des lunettes d'éclipse, puis on les ôte pour la totalité, à 12 h 24 min 30 s. Rien n'est déclaré : la position de la Lune sur celle du Soleil, calculée pour ce lieu et cette seconde, donne le croissant, le jour qui baisse, la couronne et les étoiles. Paris, à 130 km, n'avait que 99 %.",
            es: "Reims, 11 de agosto de 1999, de 12:15 a 12:35: las fases parciales con gafas de eclipse, y luego se quitan para la totalidad, a las 12:24:30. Nada se declara: la posición de la Luna sobre la del Sol, calculada para este lugar y este segundo, da el creciente, la luz que baja, la corona y las estrellas. París, a 130 km, solo tuvo el 99 %.",
            it: "Reims, 11 agosto 1999, dalle 12:15 alle 12:35: le fasi parziali con occhiali da eclissi, poi li si toglie per la totalità, alle 12:24:30. Nulla è dichiarato: la posizione della Luna sopra quella del Sole, calcolata per questo luogo e questo secondo, dà la falce, la luce che cala, la corona e le stelle. Parigi, a 130 km, ebbe solo il 99 %."
          }
        },
        {
          id: "supermoon",
          src: "/demo-data/sky-test-supermoon.json",
          title: { en: "The giant moon", fr: "La lune géante", es: "La luna gigante", it: "La luna gigante" },
          blurb: {
            en: "Paris, 14 November 2016, moonrise: the closest full Moon since 1948, 356,600 km away, 8% wider than on average. What is true of a “giant moon”, and nothing more: it is no bigger on the horizon than overhead.",
            fr: "Paris, 14 novembre 2016, lever de Lune : la pleine Lune la plus proche depuis 1948, à 356 600 km, 8 % plus large qu'en moyenne. Ce qu'il y a de vrai dans une « lune géante », et rien de plus : elle n'est pas plus grosse à l'horizon qu'au zénith.",
            es: "París, 14 de noviembre de 2016, salida de la Luna: la Luna llena más cercana desde 1948, a 356 600 km, un 8 % más ancha que de media. Lo que hay de cierto en una «luna gigante», y nada más: no es más grande en el horizonte que en lo alto.",
            it: "Parigi, 14 novembre 2016, sorgere della Luna: la Luna piena più vicina dal 1948, a 356 600 km, l'8 % più larga della media. Ciò che c'è di vero in una «luna gigante», e nulla di più: non è più grande all'orizzonte che in alto."
          }
        },
        {
          id: "red-moon",
          src: "/demo-data/sky-test-red-moon.json",
          title: { en: "The lune rousse", fr: "La lune rousse", es: "La luna rojiza", it: "La luna rossa" },
          blurb: {
            en: "Paris, 1 May 2026, moonrise: the full Moon of the lunation after Easter, which stands low and is reddened by the air it crosses — and is neither bigger nor brighter than another.",
            fr: "Paris, 1er mai 2026, lever de Lune : la pleine Lune de la lunaison qui suit Pâques, basse, rougie par l'air qu'elle traverse — et ni plus grosse ni plus brillante qu'une autre.",
            es: "París, 1 de mayo de 2026, salida de la Luna: la Luna llena de la lunación que sigue a la Pascua, baja y enrojecida por el aire que atraviesa — y ni más grande ni más brillante que otra.",
            it: "Parigi, 1° maggio 2026, sorgere della Luna: la Luna piena della lunazione che segue la Pasqua, bassa e arrossata dall'aria che attraversa — e né più grande né più luminosa di un'altra."
          }
        },
        {
          id: "meteors",
          src: "/demo-data/sky-test-meteors.json",
          title: { en: "A meteor shower", fr: "Une pluie de météores", es: "Una lluvia de meteoros", it: "Uno sciame meteorico" },
          blurb: {
            en: "Perseids, 13 August 2018, 04:05, radiant high and no Moon — over the sporadic background that falls every night of the year.",
            fr: "Perséides, 13 août 2018, 04:05, radiant haut et pas de Lune — au-dessus du fond sporadique qui tombe toutes les nuits de l'année.",
            es: "Perseidas, 13 de agosto de 2018, 04:05, radiante alto y sin Luna — sobre el fondo esporádico que cae todas las noches del año.",
            it: "Perseidi, 13 agosto 2018, 04:05, radiante alto e niente Luna — sopra il fondo sporadico che cade ogni notte dell'anno."
          }
        },
        {
          id: "satellites",
          src: "/demo-data/sky-test-satellites.json",
          title: { en: "A Starlink train", fr: "Un train de Starlink", es: "Un tren de Starlink", it: "Un treno di Starlink" },
          blurb: {
            en: "Paris, 29 July 2025 at 11 pm, two days after a launch: the new satellites cross in a line, each propagated from the orbital elements archived that day.",
            fr: "Paris, 29 juillet 2025 à 23 h, deux jours après un lancement : les nouveaux satellites passent en file, chacun propagé depuis les éléments orbitaux archivés ce jour-là.",
            es: "París, 29 de julio de 2025 a las 23:00, dos días después de un lanzamiento: los nuevos satélites cruzan en fila, cada uno propagado a partir de los elementos orbitales archivados ese día.",
            it: "Parigi, 29 luglio 2025 alle 23, due giorni dopo un lancio: i nuovi satelliti passano in fila, ciascuno propagato dagli elementi orbitali archiviati quel giorno."
          }
        },
        {
          id: "chelyabinsk",
          src: "/demo-data/sky-test-chelyabinsk.json",
          // The case, for the player: the same instant seen by an eye, a dashcam and a security camera, to switch between.
          playSrc: "/demo-data/case-chelyabinsk.json",
          title: { en: "The Chelyabinsk superbolide", fr: "Le superbolide de Tcheliabinsk", es: "El superbólido de Cheliábinsk", it: "Il superbolide di Čeljabinsk" },
          blurb: {
            en: "15 February 2013, 9:20: brighter than the Sun along its published path, it lights the city from where it is, and every shadow swings round as it crosses the sky. Nothing placed to light it. Seen by the eye, a dashcam and a security camera. Open it full size to switch.",
            fr: "15 février 2013, 9 h 20 : plus brillant que le Soleil sur sa trajectoire publiée, il éclaire la ville depuis là où il est, et chaque ombre tourne à mesure qu'il traverse le ciel. Rien n'est posé pour l'éclairer. Vu par l'œil, une caméra de tableau de bord et une caméra de surveillance. Ouvrez-le en grand pour passer de l'un à l'autre.",
            es: "15 de febrero de 2013, 9:20: más brillante que el Sol en su trayectoria publicada, ilumina la ciudad desde donde está, y cada sombra gira mientras cruza el cielo. Nada se coloca para iluminarlo. Visto por el ojo, una cámara de salpicadero y una cámara de vigilancia. Ábrelo a tamaño completo para pasar de uno a otro.",
            it: "15 febbraio 2013, 9:20: più brillante del Sole lungo la traiettoria pubblicata, illumina la città da dove si trova, e ogni ombra ruota mentre attraversa il cielo. Nulla è posto per illuminarlo. Visto dall'occhio, da una dashcam e da una telecamera di sorveglianza. Aprilo a schermo intero per passare dall'uno all'altro."
          }
        },
        {
          id: "reentry",
          src: "/demo-data/sky-test-reentry.json",
          title: { en: "A re-entry", fr: "Une rentrée atmosphérique", es: "Una reentrada", it: "Un rientro atmosferico" },
          blurb: {
            en: "Zond 4's launcher breaking up over Kentucky, 3 March 1968 at 21:45: the burning string that 78 reports turned into a formation, a cigar with windows, a silent craft.",
            fr: "Le lanceur de Zond 4 se désagrégeant au-dessus du Kentucky, 3 mars 1968 à 21 h 45 : la file brûlante dont 78 signalements ont fait une formation, un cigare à fenêtres, un appareil silencieux.",
            es: "El lanzador de Zond 4 desintegrándose sobre Kentucky, 3 de marzo de 1968 a las 21:45: la fila ardiente que 78 informes convirtieron en una formación, un cigarro con ventanas, una nave silenciosa.",
            it: "Il lanciatore di Zond 4 che si disintegra sopra il Kentucky, 3 marzo 1968 alle 21:45: la fila ardente che 78 segnalazioni trasformarono in una formazione, un sigaro con finestre, un velivolo silenzioso."
          }
        },
        {
          id: "lanterns",
          src: "/demo-data/sky-test-lanterns.json",
          title: { en: "Sky lanterns", fr: "Des lanternes célestes", es: "Farolillos voladores", it: "Lanterne volanti" },
          blurb: {
            en: "A dozen lanterns let go from a garden, filmed with a phone from a crossroads 1.6 km away: the loose, silent \"formation\" of orange points a viral video took for an invasion fleet. Place and date assumed.",
            fr: "Une douzaine de lanternes lâchées d'un jardin, filmées au téléphone depuis un carrefour à 1,6 km : la « formation » lâche et silencieuse de points orangés qu'une vidéo virale a prise pour une flotte d'invasion. Lieu et date supposés.",
            es: "Una docena de farolillos soltados desde un jardín, filmados con un teléfono desde un cruce a 1,6 km: la «formación» suelta y silenciosa de puntos anaranjados que un vídeo viral tomó por una flota de invasión. Lugar y fecha supuestos.",
            it: "Una dozzina di lanterne lasciate andare da un giardino, filmate col telefono da un incrocio a 1,6 km: la «formazione» sparsa e silenziosa di punti arancioni che un video virale ha preso per una flotta d'invasione. Luogo e data ipotizzati."
          }
        },
        {
          id: "birds-gulls",
          src: "/demo-data/sky-test-birds-gulls.json",
          title: { en: "Gulls", fr: "Des goélands", es: "Gaviotas", it: "Gabbiani" },
          blurb: {
            en: "At sunset, lit from behind by the setting Sun, a phone follows a V of herring gulls crossing Lorient's harbour, then one alone the other way, beating, gliding and skimming the water over its own reflection, at a sixtieth of a second: its wingbeat and its flight smeared into the blurred \"saucer\" of so many photographs. The quay is real; the date and the gulls are assumed.",
            fr: "Au coucher du soleil, éclairés par l'arrière par le soleil couchant, un téléphone suit un V de goélands argentés qui traverse le port de Lorient, puis un seul dans l'autre sens, qui bat des ailes, plane et rase l'eau au-dessus de son reflet, au soixantième de seconde : son battement et son vol étalés en la « soucoupe » floue de tant de photos. Le quai est réel ; la date et les goélands sont supposés.",
            es: "Al atardecer, iluminadas por detrás por el sol poniente, un teléfono sigue una V de gaviotas argénteas que cruza el puerto de Lorient, y luego una sola en sentido contrario, que aletea, planea y roza el agua sobre su propio reflejo, a un sesentavo de segundo: su aleteo y su vuelo difuminados en el «platillo» borroso de tantas fotos. El muelle es real; la fecha y las gaviotas son supuestas.",
            it: "Al tramonto, illuminati da dietro dal sole calante, un telefono segue una V di gabbiani reali che attraversa il porto di Lorient, poi uno solo nell'altro senso, che batte le ali, plana e sfiora l'acqua sopra il proprio riflesso, a un sessantesimo di secondo: il battito e il volo sfumati nel «disco» sfocato di tante foto. Il molo è reale; la data e i gabbiani sono ipotizzati."
          }
        },
        {
          id: "lubbock",
          // The ducks of the Air Force's conclusion as Dr Robinson would have seen them; the player opens the case, the four professors and both bird readings.
          src: "/demo-data/interpretation-lubbock-robinson-ducks.json",
          playSrc: "/demo-data/case-lubbock.json",
          openEvents: "interpretation-lubbock-robinson-ducks",
          title: { en: "Lubbock, 1951", fr: "Lubbock, 1951", es: "Lubbock, 1951", it: "Lubbock, 1951" },
          titleIsName: true,
          blurb: {
            en: "25 August 1951, 21:20. Four Texas Tech professors drinking tea in a back yard look up as a semicircle of bluish green lights crosses the sky over their heads in three seconds, without a sound. Replayed for each of them with the Air Force's reading: ducks flying low, their bellies lit from below by the mercury-vapour lamps of the boulevard near by — and Ruppelt's plovers. Yard, seats and flight assumed.",
            fr: "25 août 1951, 21 h 20. Quatre professeurs de Texas Tech prenant le thé dans un jardin lèvent les yeux quand un demi-cercle de lumières bleu-vert traverse le ciel au-dessus de leurs têtes en trois secondes, sans un bruit. Rejoué pour chacun d'eux avec la lecture de l'Air Force : des canards volant bas, le ventre éclairé par en dessous par les lampes à vapeur de mercure du boulevard voisin — et les pluviers de Ruppelt. Jardin, places et vol supposés.",
            es: "25 de agosto de 1951, 21:20. Cuatro profesores de Texas Tech que toman té en un jardín alzan la vista cuando un semicírculo de luces verdiazules cruza el cielo sobre sus cabezas en tres segundos, sin un ruido. Reproducido para cada uno con la lectura de la Air Force: patos que vuelan bajo, el vientre iluminado desde abajo por las lámparas de vapor de mercurio del bulevar cercano — y los chorlitos de Ruppelt. Jardín, asientos y vuelo supuestos.",
            it: "25 agosto 1951, 21:20. Quattro professori della Texas Tech che prendono il tè in un giardino alzano gli occhi quando un semicerchio di luci verde-azzurre attraversa il cielo sopra le loro teste in tre secondi, senza un rumore. Riprodotto per ciascuno di loro con la lettura della Air Force: anatre in volo basso, il ventre illuminato dal basso dalle lampade a vapori di mercurio del viale vicino — e i pivieri di Ruppelt. Giardino, posti e volo ipotizzati."
          }
        },
        {
          id: "drones-night",
          src: "/demo-data/sky-test-drones-night.json",
          title: { en: "Drones at night", fr: "Des drones la nuit", es: "Drones de noche", it: "Droni di notte" },
          blurb: {
            en: "A clear December night over a New Jersey suburb, as in the 2024 wave of drone reports: a quadcopter hovering across the road, its strobe flashing white over its steady red and blinking green, then flying off; far off, a \"cluster of lights\" of six; a saucer-shaped \"drufo\" ringed with cyan LEDs, low and near; a fixed-wing drone crossing high with an aeroplane's lights. Each leans into where it goes and buzzes. Place, date and drones assumed.",
            fr: "Une nuit claire de décembre au-dessus d'une banlieue du New Jersey, comme lors de la vague de signalements de drones de 2024 : un quadricoptère en vol stationnaire de l'autre côté de la route, son feu à éclats blanc par-dessus son rouge fixe et son vert clignotant, qui repart ; au loin, un « groupe de lumières » de six ; un « drufo » en forme de soucoupe cerclé de LED cyan, bas et proche ; un drone à voilure fixe qui passe haut avec des feux d'avion. Chacun s'incline vers où il va et bourdonne. Lieu, date et drones supposés.",
            es: "Una noche clara de diciembre sobre un suburbio de Nueva Jersey, como en la oleada de avistamientos de drones de 2024: un cuadricóptero suspendido al otro lado de la carretera, su luz estroboscópica blanca sobre su rojo fijo y su verde intermitente, que luego se va; a lo lejos, un «grupo de luces» de seis; un «drufo» en forma de platillo rodeado de LED cian, bajo y cercano; un dron de ala fija que pasa alto con luces de avión. Cada uno se inclina hacia donde va y zumba. Lugar, fecha y drones supuestos.",
            it: "Una notte limpida di dicembre sopra un sobborgo del New Jersey, come nell'ondata di segnalazioni di droni del 2024: un quadricottero in volo stazionario dall'altra parte della strada, la luce stroboscopica bianca sopra il rosso fisso e il verde lampeggiante, che poi riparte; in lontananza, un «gruppo di luci» di sei; un «drufo» a forma di disco cerchiato di LED ciano, basso e vicino; un drone ad ala fissa che passa alto con luci da aereo. Ognuno si inclina verso dove va e ronza. Luogo, data e droni ipotizzati."
          }
        },
        {
          id: "balloons-dusk",
          src: "/demo-data/sky-test-balloons-dusk.json",
          title: { en: "Balloons in the Sun at dusk", fr: "Des ballons au Soleil au crépuscule", es: "Globos al Sol al anochecer", it: "Palloni al Sole al crepuscolo" },
          blurb: {
            en: "Twenty minutes after sunset over the plains of eastern New Mexico: a stratospheric balloon floating at 30 km, as those let go from Fort Sumner do, and a weather balloon nearing its burst, both still in the Sun while the ground is in the dusk, two white points against a darkening sky — until the weather balloon bursts. Place, date and balloons assumed.",
            fr: "Vingt minutes après le coucher du Soleil sur les plaines de l'est du Nouveau-Mexique : un ballon stratosphérique qui flotte à 30 km, comme ceux lâchés de Fort Sumner, et un ballon-sonde près d'éclater, tous deux encore au Soleil alors que le sol est dans le crépuscule, deux points blancs sur un ciel qui s'assombrit — jusqu'à ce que le ballon-sonde éclate. Lieu, date et ballons supposés.",
            es: "Veinte minutos después de la puesta del Sol sobre las llanuras del este de Nuevo México: un globo estratosférico que flota a 30 km, como los que se sueltan en Fort Sumner, y un globo sonda a punto de estallar, ambos todavía al Sol mientras el suelo está en el crepúsculo, dos puntos blancos sobre un cielo que se oscurece, hasta que el globo sonda estalla. Lugar, fecha y globos supuestos.",
            it: "Venti minuti dopo il tramonto sulle pianure del Nuovo Messico orientale: un pallone stratosferico che galleggia a 30 km, come quelli lanciati da Fort Sumner, e un pallone sonda prossimo a scoppiare, entrambi ancora al Sole mentre il suolo è nel crepuscolo, due punti bianchi su un cielo che si scurisce, finché il pallone sonda scoppia. Luogo, data e palloni ipotizzati."
          }
        },
        {
          id: "balloons-day",
          src: "/demo-data/sky-test-balloons-day.json",
          title: { en: "Hot-air balloons and a foil balloon", fr: "Des montgolfières et un ballon métallisé", es: "Globos aerostáticos y un globo metalizado", it: "Mongolfiere e un palloncino metallizzato" },
          blurb: {
            en: "A morning's mass ascension: eight hot-air balloons let go a few at a time, their pilots firing their burners to climb and level off at 350 m; high over them, a lost foil party balloon drifting at 1.2 km, a polished speck turning in the Sun; and a child's figure balloon drifting off low over the field. Place, date and balloons assumed.",
            fr: "L'envol groupé d'un matin : huit montgolfières lâchées quelques-unes à la fois, leurs pilotes allumant les brûleurs pour monter et se stabiliser à 350 m ; haut au-dessus, un ballon métallisé perdu qui dérive à 1,2 km, un point poli qui tourne au Soleil ; et un ballon en forme de personnage d'enfant qui s'éloigne bas au-dessus du terrain. Lieu, date et ballons supposés.",
            es: "El despegue en masa de una mañana: ocho globos aerostáticos soltados de pocos en pocos, sus pilotos encendiendo los quemadores para subir y estabilizarse a 350 m; muy por encima, un globo metalizado perdido que deriva a 1,2 km, un punto pulido que gira al Sol; y un globo con forma de niño que se aleja bajo sobre el campo. Lugar, fecha y globos supuestos.",
            it: "Il decollo in massa di una mattina: otto mongolfiere lasciate andare poche alla volta, i piloti che accendono i bruciatori per salire e stabilizzarsi a 350 m; in alto sopra di loro, un palloncino metallizzato perso che deriva a 1,2 km, un punto lucido che gira al Sole; e un palloncino a forma di bambino che si allontana basso sopra il campo. Luogo, data e palloni ipotizzati."
          }
        },
        {
          id: "balloons-prank",
          src: "/demo-data/sky-test-balloons-prank.json",
          title: { en: "Prank balloons over the sea", fr: "Des ballons farceurs au-dessus de la mer", es: "Globos de broma sobre el mar", it: "Palloni scherzo sopra il mare" },
          blurb: {
            en: "A summer night on a beach of the Vendée coast: a party lets prank balloons go over the sea, as were reported off the Île d'Yeu (2008) and Oléron (2010). Three are bags over birthday candles, each a ring of small orange lights under a faint glowing dome, turning slowly and swinging; one is a bag over a red road flare. They climb while their flames burn, and go out one by one. Place, date and balloons assumed.",
            fr: "Une nuit d'été sur une plage de la côte vendéenne : une fête lâche des ballons farceurs au-dessus de la mer, comme on en a signalé au large de l'Île d'Yeu (2008) et d'Oléron (2010). Trois sont des sacs au-dessus de bougies d'anniversaire, chacun un anneau de petites lumières orange sous un dôme qui luit faiblement, qui tourne lentement et se balance ; un est un sac au-dessus d'un feu de détresse rouge. Ils montent tant que leurs flammes brûlent, et s'éteignent un à un. Lieu, date et ballons supposés.",
            es: "Una noche de verano en una playa de la costa de Vendée: una fiesta suelta globos de broma sobre el mar, como los señalados frente a la isla de Yeu (2008) y Oléron (2010). Tres son bolsas sobre velas de cumpleaños, cada una un anillo de lucecitas naranjas bajo una cúpula que brilla débilmente, que gira despacio y se balancea; una es una bolsa sobre una bengala roja. Suben mientras arden sus llamas, y se apagan una a una. Lugar, fecha y globos supuestos.",
            it: "Una notte d'estate su una spiaggia della costa della Vandea: una festa lascia andare palloni scherzo sopra il mare, come quelli segnalati al largo dell'Île d'Yeu (2008) e di Oléron (2010). Tre sono sacchetti sopra candeline, ciascuno un anello di lucine arancioni sotto una cupola che brilla debolmente, che gira lentamente e oscilla; uno è un sacchetto sopra un razzo rosso. Salgono finché le fiamme bruciano, e si spengono uno a uno. Luogo, data e palloni ipotizzati."
          }
        },
        {
          id: "balloons-anti-hail",
          src: "/demo-data/sky-test-balloons-anti-hail.json",
          title: { en: "Anti-hail balloons", fr: "Des ballons anti-grêle", es: "Globos antigranizo", it: "Palloni antigrandine" },
          blurb: {
            en: "The vineyards of the Combe de Savoie on a summer night as a storm comes: three firing posts let an anti-hail balloon go each, as winegrowers there have done since 2018 at a radar's alert. At 600 m an altimeter lights each one's torch of hygroscopic salts, which bursts it; the torch comes down under its parachute, an orange glow that seems to hang still, the kind taken for ball lightning, and goes out. Place, date and balloons assumed.",
            fr: "Les vignes de la Combe de Savoie une nuit d'été à l'approche d'un orage : trois postes de tir lâchent chacun un ballon anti-grêle, comme les vignerons le font depuis 2018 à l'alerte d'un radar. À 600 m, un altimètre allume la torche de sels hygroscopiques de chacun, ce qui le fait éclater ; la torche descend sous son parachute, une lueur orange qui semble immobile, de celles qu'on prend pour de la foudre en boule, puis s'éteint. Lieu, date et ballons supposés.",
            es: "Los viñedos de la Combe de Savoie una noche de verano al acercarse una tormenta: tres puestos de tiro sueltan cada uno un globo antigranizo, como hacen los viticultores desde 2018 a la alerta de un radar. A 600 m un altímetro enciende la antorcha de sales higroscópicas de cada uno, lo que lo hace estallar; la antorcha baja bajo su paracaídas, un resplandor naranja que parece inmóvil, de los que se toman por rayos en bola, y se apaga. Lugar, fecha y globos supuestos.",
            it: "I vigneti della Combe de Savoie una notte d'estate all'arrivo di un temporale: tre postazioni di tiro lasciano andare ciascuna un pallone antigrandine, come fanno i viticoltori dal 2018 all'allerta di un radar. A 600 m un altimetro accende la torcia di sali igroscopici di ciascuno, facendolo scoppiare; la torcia scende sotto il paracadute, un bagliore arancione che sembra immobile, di quelli presi per fulmini globulari, e si spegne. Luogo, data e palloni ipotizzati."
          }
        },
        {
          id: "balloons-night",
          src: "/demo-data/sky-test-balloons-night.json",
          title: { en: "LED balloons at night", fr: "Des ballons à LED la nuit", es: "Globos de LED de noche", it: "Palloncini a LED di notte" },
          blurb: {
            en: "A summer night: fifteen LED balloons let go one after the other from a garden some 400 m away, red, white and blue, climbing at two metres a second and drifting off over the fields in a loose, slowly stretching line of silent coloured points. Place, date and balloons assumed.",
            fr: "Une nuit d'été : quinze ballons à LED lâchés l'un après l'autre depuis un jardin à quelque 400 m, rouges, blancs et bleus, qui montent à deux mètres par seconde et s'éloignent au-dessus des champs en une ligne lâche de points colorés silencieux, qui s'étire lentement. Lieu, date et ballons supposés.",
            es: "Una noche de verano: quince globos de LED soltados uno tras otro desde un jardín a unos 400 m, rojos, blancos y azules, que suben a dos metros por segundo y se alejan sobre los campos en una línea suelta de puntos de colores silenciosos, que se estira lentamente. Lugar, fecha y globos supuestos.",
            it: "Una notte d'estate: quindici palloncini a LED lasciati andare uno dopo l'altro da un giardino a circa 400 m, rossi, bianchi e blu, che salgono a due metri al secondo e si allontanano sopra i campi in una fila irregolare di punti colorati silenziosi, che si allunga lentamente. Luogo, data e palloni ipotizzati."
          }
        },
        {
          id: "airships-night",
          src: "/demo-data/sky-test-airships-night.json",
          title: { en: "Airships at night", fr: "Des dirigeables la nuit", es: "Dirigibles de noche", it: "Dirigibili di notte" },
          blurb: {
            en: "A night in the Florida Keys, from Sugarloaf Key: Cudjoe Key's tethered aerostat moored at 3 km, its nose in the wind and its red obstruction lights flashing under it; a blimp cruising along the coast, its sign of lamps a band of light along its flank, its strobe flashing; a lightship glowing from within, passing near. The aerostat's site is the real one; date, height, wind and airships assumed.",
            fr: "Une nuit dans les Keys de Floride, depuis Sugarloaf Key : l'aérostat captif de Cudjoe Key amarré à 3 km, le nez au vent, ses feux d'obstacle rouges clignotant dessous ; un dirigeable qui longe la côte, son enseigne lumineuse en bande sur son flanc, son feu à éclats ; un dirigeable lumineux, éclairé de l'intérieur, qui passe près. Le site de l'aérostat est le vrai ; date, hauteur, vent et dirigeables supposés.",
            es: "Una noche en los Cayos de Florida, desde Sugarloaf Key: el aeróstato cautivo de Cudjoe Key amarrado a 3 km, la proa al viento y sus luces rojas de obstáculo destellando debajo; un dirigible que bordea la costa, su letrero luminoso como una banda en su costado, su luz estroboscópica destellando; un dirigible luminoso, iluminado desde dentro, que pasa cerca. El sitio del aeróstato es el real; fecha, altura, viento y dirigibles supuestos.",
            it: "Una notte nelle Keys della Florida, da Sugarloaf Key: l'aerostato frenato di Cudjoe Key ormeggiato a 3 km, la prua al vento e le luci rosse di ostacolo che lampeggiano sotto; un dirigibile che costeggia la riva, l'insegna luminosa come una fascia sul fianco, la luce stroboscopica che lampeggia; un dirigibile luminoso, illuminato dall'interno, che passa vicino. Il sito dell'aerostato è quello vero; data, quota, vento e dirigibili ipotizzati."
          }
        },
        {
          id: "aurora-2024-05-10",
          src: "/demo-data/sky-test-aurora-2024-05-10.json",
          title: { en: "The aurora of 10 May 2024", fr: "L'aurore du 10 mai 2024", es: "La aurora del 10 de mayo de 2024", it: "L'aurora del 10 maggio 2024" },
          blurb: {
            en: "The great storm of 10 May 2024, from a beach of northern Brittany at a quarter to one in the morning: the GFZ's Hp60 index at 10⅔, past Kp's ceiling of 9, and the oval's edge a degree or two of latitude north of Brittany. To the eye adapted to the night, pale grey pillars over the northern sky, their red too faint for the cones. No aurora is stated: the scene shows the one the archived index implies, as it would for any recording of that night. Place assumed.",
            fr: "Le grand orage magnétique du 10 mai 2024, depuis une plage du nord de la Bretagne à une heure moins le quart : l'indice Hp60 du GFZ à 10⅔, au-delà du plafond de 9 de Kp, et le bord de l'ovale à un ou deux degrés de latitude au nord de la Bretagne. Pour l'œil adapté à la nuit, des colonnes gris pâle sur le ciel nord, leur rouge trop faible pour les cônes. Aucune aurore n'est donnée : la scène montre celle qu'implique l'indice archivé, comme elle le ferait pour tout enregistrement de cette nuit. Lieu supposé.",
            es: "La gran tormenta magnética del 10 de mayo de 2024, desde una playa del norte de Bretaña a la una menos cuarto de la madrugada: el índice Hp60 del GFZ en 10⅔, más allá del techo de 9 de Kp, y el borde del óvalo a uno o dos grados de latitud al norte de Bretaña. Para el ojo adaptado a la noche, columnas gris pálido sobre el cielo norte, su rojo demasiado débil para los conos. No se indica ninguna aurora: la escena muestra la que implica el índice archivado, como lo haría para cualquier grabación de esa noche. Lugar supuesto.",
            it: "La grande tempesta magnetica del 10 maggio 2024, da una spiaggia della Bretagna settentrionale all'una meno un quarto: l'indice Hp60 del GFZ a 10⅔, oltre il tetto di 9 di Kp, e il bordo dell'ovale a uno o due gradi di latitudine a nord della Bretagna. Per l'occhio adattato alla notte, colonne grigio pallido sul cielo nord, il loro rosso troppo debole per i coni. Nessuna aurora è indicata: la scena mostra quella che l'indice archiviato implica, come farebbe per qualsiasi registrazione di quella notte. Luogo ipotizzato."
          }
        },
        {
          id: "aurora-2024-05-10-phone",
          src: "/demo-data/sky-test-aurora-2024-05-10-phone.json",
          title: { en: "The same aurora, by a phone", fr: "La même aurore, au téléphone", es: "La misma aurora, con un teléfono", it: "La stessa aurora, con un telefono" },
          blurb: {
            en: "The same night from the same beach, by a phone in night mode, a pose of three seconds: what the eye saw grey comes out green near the horizon and red above, the high red line of a storm that the phone records and the eye's rods do not. Why so many saw the photographs of that night more vividly than the sky.",
            fr: "La même nuit depuis la même plage, au téléphone en mode nuit, une pose de trois secondes : ce que l'œil voyait gris sort vert près de l'horizon et rouge au-dessus, la raie rouge haute d'un orage que le téléphone enregistre et que les bâtonnets de l'œil ne voient pas. Pourquoi tant de gens ont vu les photos de cette nuit plus vives que le ciel.",
            es: "La misma noche desde la misma playa, con un teléfono en modo noche, una exposición de tres segundos: lo que el ojo veía gris sale verde cerca del horizonte y rojo por encima, la línea roja alta de una tormenta que el teléfono registra y que los bastones del ojo no ven. Por qué tantos vieron las fotos de esa noche más vivas que el cielo.",
            it: "La stessa notte dalla stessa spiaggia, con un telefono in modalità notte, una posa di tre secondi: ciò che l'occhio vedeva grigio esce verde vicino all'orizzonte e rosso sopra, la riga rossa alta di una tempesta che il telefono registra e che i bastoncelli dell'occhio non vedono. Perché tanti hanno visto le foto di quella notte più vivide del cielo."
          }
        },
        {
          id: "aurora-2023-03-23",
          src: "/demo-data/sky-test-aurora-2023-03-23.json",
          title: { en: "Looking round an aurora", fr: "Le tour d'une aurore", es: "Mirar alrededor de una aurora", it: "Guardarsi intorno sotto un'aurora" },
          blurb: {
            en: "The storm of 23 March 2023 from Ekerö, west of Stockholm, at eleven in the evening: the GFZ's Hp60 at 6⅓, the oval come down to the Mälaren. The witness looks about the whole sky, again and again, north, up to the zenith, east, south and west: to the eye adapted to the night the brightest arcs are a pale green, the fainter ones grey; the vivid greens of photographs are a long pose's. No aurora is stated: the scene shows the one the archived index implies. Place assumed.",
            fr: "L'orage du 23 mars 2023 depuis Ekerö, à l'ouest de Stockholm, à vingt-trois heures : l'indice Hp60 du GFZ à 6⅓, l'ovale descendu jusqu'au lac Mälar. Le témoin regarde tout le ciel, encore et encore, le nord, jusqu'au zénith, l'est, le sud et l'ouest : pour l'œil adapté à la nuit les arcs les plus vifs sont d'un vert pâle, les plus faibles gris ; les verts vifs des photographies sont ceux d'une longue pose. Aucune aurore n'est donnée : la scène montre celle qu'implique l'indice archivé. Lieu supposé.",
            es: "La tormenta del 23 de marzo de 2023 desde Ekerö, al oeste de Estocolmo, a las once de la noche: el índice Hp60 del GFZ en 6⅓, el óvalo bajado hasta el lago Mälaren. El testigo mira todo el cielo, una y otra vez, el norte, hasta el cénit, el este, el sur y el oeste: para el ojo adaptado a la noche los arcos más vivos son de un verde pálido, los más débiles grises; los verdes vivos de las fotografías son los de una larga exposición. No se indica ninguna aurora: la escena muestra la que implica el índice archivado. Lugar supuesto.",
            it: "La tempesta del 23 marzo 2023 da Ekerö, a ovest di Stoccolma, alle undici di sera: l'indice Hp60 del GFZ a 6⅓, l'ovale sceso fino al lago Mälaren. Il testimone guarda tutto il cielo, più e più volte, il nord, fino allo zenit, l'est, il sud e l'ovest: per l'occhio adattato alla notte gli archi più vivi sono di un verde pallido, i più deboli grigi; i verdi vivi delle fotografie sono quelli di una lunga posa. Nessuna aurora è indicata: la scena mostra quella che l'indice archiviato implica. Luogo ipotizzato."
          }
        },
        {
          id: "aurora-tromso",
          src: "/demo-data/sky-test-aurora-tromso.json",
          title: { en: "An aurora near Tromsø", fr: "Une aurore près de Tromsø", es: "Una aurora cerca de Tromsø", it: "Un'aurora vicino a Tromsø" },
          blurb: {
            en: "New Year's evening 2025 at a fjord's end near Tromsø, a moonless night with the field disturbed (the GFZ's Hp60 at 5⅓): an arc of rays across the northern sky, grey to the eye with a trace of green, drifting and brightening over minutes. The index is the archive's; where the oval stands follows from it, the details of its arcs are assumed.",
            fr: "Le soir du Nouvel An 2025 au fond d'un fjord près de Tromsø, une nuit sans Lune, le champ agité (l'indice Hp60 du GFZ à 5⅓) : un arc à rayons à travers le ciel nord, gris pour l'œil avec une trace de vert, qui dérive et s'avive en quelques minutes. L'indice est celui de l'archive ; la position de l'ovale s'en déduit, le détail de ses arcs est supposé.",
            es: "La noche de Año Nuevo de 2025 al fondo de un fiordo cerca de Tromsø, una noche sin luna con el campo agitado (el índice Hp60 del GFZ en 5⅓): un arco de rayos a través del cielo norte, gris para el ojo con un rastro de verde, que deriva y se aviva en unos minutos. El índice es el del archivo; de él se deduce dónde está el óvalo, el detalle de sus arcos es supuesto.",
            it: "La sera di Capodanno 2025 in fondo a un fiordo vicino a Tromsø, una notte senza luna con il campo agitato (l'indice Hp60 del GFZ a 5⅓): un arco di raggi attraverso il cielo nord, grigio per l'occhio con una traccia di verde, che deriva e si ravviva in pochi minuti. L'indice è quello dell'archivio; ne discende dove si trova l'ovale, il dettaglio dei suoi archi è ipotizzato."
          }
        },
        {
          id: "csg2",
          src: "/demo-data/observer-csg2-nassau.json",
          // The case, for the player: the same upper stage at its launch and at its end, an hour and a half and 2 500 km apart.
          playSrc: "/demo-data/case-csg2.json",
          title: { en: "CSG-2, 2022", fr: "CSG-2, 2022", es: "CSG-2, 2022", it: "CSG-2, 2022" },
          titleIsName: true,
          blurb: {
            en: "31 January 2022, just after sunset: a Falcon 9 launched from Florida climbs past the Bahamas, its exhaust lit high above the dusk. An hour and a half later its upper stage, back over North America, brakes out of orbit and vents its tanks: Ron Lee sees it due east from Colorado and reports it on SeeSat-L, others photograph spirals. Open it full size to switch from the launch (a witness assumed in Nassau) to his sky.",
            fr: "31 janvier 2022, juste après le coucher du Soleil : un Falcon 9 lancé de Floride monte le long des Bahamas, son échappement éclairé très haut au-dessus du crépuscule. Une heure et demie plus tard, son deuxième étage, revenu au-dessus de l'Amérique du Nord, freine pour quitter son orbite et vidange ses réservoirs : Ron Lee le voit plein est depuis le Colorado et le rapporte sur SeeSat-L, d'autres photographient des spirales. Ouvrez-le en grand pour passer du lancement (un témoin supposé à Nassau) à son ciel.",
            es: "31 de enero de 2022, justo después de la puesta del Sol: un Falcon 9 lanzado desde Florida sube junto a las Bahamas, su escape iluminado muy alto sobre el crepúsculo. Hora y media más tarde su segunda etapa, de vuelta sobre América del Norte, frena para salir de su órbita y purga sus depósitos: Ron Lee la ve al este desde Colorado y la cuenta en SeeSat-L, otros fotografían espirales. Ábrelo a tamaño completo para pasar del lanzamiento (un testigo supuesto en Nassau) a su cielo.",
            it: "31 gennaio 2022, subito dopo il tramonto: un Falcon 9 lanciato dalla Florida sale lungo le Bahamas, lo scarico illuminato molto in alto sopra il crepuscolo. Un'ora e mezza dopo il suo secondo stadio, tornato sopra il Nord America, frena per lasciare l'orbita e scarica i serbatoi: Ron Lee lo vede a est dal Colorado e lo riferisce su SeeSat-L, altri fotografano spirali. Aprilo a schermo intero per passare dal lancio (un testimone supposto a Nassau) al suo cielo."
          }
        },
        {
          id: "skytracker",
          src: "/demo-data/sky-test-skytracker.json",
          title: { en: "A skytracker on the clouds", fr: "Un skytracker sur les nuages", es: "Un skytracker en las nubes", it: "Uno skytracker sulle nuvole" },
          blurb: {
            en: "East of Lyon on a November night, a deck of stratocumulus at 900 m: a four-headed xenon skytracker 3 km off sends its beams up in a cloverleaf. The beams are pale from here; what stands out are the four patches of light running over the base of the clouds, going out where a beam meets a gap. Place, searchlight and clouds are assumed.",
            fr: "À l'est de Lyon une nuit de novembre, une couche de stratocumulus à 900 m : un skytracker au xénon à quatre têtes, à 3 km, envoie ses faisceaux en trèfle. D'ici les faisceaux sont pâles ; ce qui se voit, ce sont les quatre taches de lumière qui courent sur la base des nuages et s'éteignent là où un faisceau rencontre une trouée. Le lieu, le projecteur et les nuages sont supposés.",
            es: "Al este de Lyon una noche de noviembre, una capa de estratocúmulos a 900 m: un skytracker de xenón de cuatro cabezales, a 3 km, envía sus haces en trébol. Desde aquí los haces son pálidos; lo que destaca son las cuatro manchas de luz que corren por la base de las nubes y se apagan donde un haz encuentra un claro. El lugar, el reflector y las nubes son supuestos.",
            it: "A est di Lione una notte di novembre, uno strato di stratocumuli a 900 m: uno skytracker allo xeno a quattro teste, a 3 km, manda i suoi fasci a quadrifoglio. Da qui i fasci sono pallidi; ciò che si vede sono le quattro macchie di luce che corrono sulla base delle nuvole e si spengono dove un fascio incontra uno squarcio. Il luogo, il proiettore e le nuvole sono ipotizzati."
          }
        },
        {
          id: "laser-meudon",
          src: "/demo-data/sky-test-laser-meudon.json",
          title: { en: "A laser beam", fr: "Un faisceau laser", es: "Un haz láser", it: "Un fascio laser" },
          blurb: {
            en: "Meudon, 9 October 2026: the 10 W green laser the Paris Observatory shot from its dome of Meudon to its dome of Paris, 8.5 km over the city. What the air scatters of it towards the eye, metre by metre, is computed.",
            fr: "Meudon, 9 octobre 2026 : le laser vert de 10 W que l'Observatoire de Paris a tiré de sa coupole de Meudon à sa coupole de Paris, 8,5 km au-dessus de la ville. Ce que l'air en diffuse vers l'œil, mètre par mètre, est calculé.",
            es: "Meudon, 9 de octubre de 2026: el láser verde de 10 W que el Observatorio de París disparó desde su cúpula de Meudon a su cúpula de París, 8,5 km sobre la ciudad. Lo que el aire difunde de él hacia el ojo, metro a metro, se calcula.",
            it: "Meudon, 9 ottobre 2026: il laser verde da 10 W che l'Osservatorio di Parigi sparò dalla sua cupola di Meudon a quella di Parigi, 8,5 km sopra la città. Ciò che l'aria ne diffonde verso l'occhio, metro per metro, è calcolato."
          }
        }
      ]
    },
    {
      section: "instruments",
      heading: {
        en: "One sighting, three instruments",
        fr: "Une observation, trois instruments",
        es: "Un avistamiento, tres instrumentos",
        it: "Un avvistamento, tre strumenti"
      },
      intro: {
        en: "The same account, the same second, the same sky — changed in one field. What an "
          + "observation was made THROUGH decides the geometry of every frame, and the three below "
          + "differ in nothing else. Note also what each one lets you set: an Instamatic's owner had "
          + "one aperture and one shutter speed, so the editor offers them nothing to choose. A "
          + "reconstruction can only be as rational as the settings it permits.",
        fr: "Le même récit, la même seconde, le même ciel — un seul champ change. Ce à travers quoi "
          + "une observation a été faite décide de la géométrie de chaque image, et les trois "
          + "ci-dessous ne diffèrent en rien d'autre. Regardez aussi ce que chacun laisse régler : le "
          + "propriétaire d'un Instamatic avait un diaphragme et une vitesse, donc l'éditeur ne lui "
          + "propose rien à choisir. Une reconstitution ne peut être rationnelle que dans la mesure "
          + "où les réglages qu'elle autorise l'étaient.",
        es: "El mismo relato, el mismo segundo, el mismo cielo — cambiado en un solo campo. Aquello A "
          + "TRAVÉS de lo cual se hizo una observación decide la geometría de cada imagen, y las tres "
          + "de abajo no difieren en nada más. Fíjate también en lo que cada una deja ajustar: el dueño de "
          + "una Instamatic tenía una sola apertura y una sola velocidad de obturación, así que el editor "
          + "no le ofrece nada que elegir. Una reconstrucción solo puede ser tan racional como los ajustes "
          + "que permite.",
        it: "Lo stesso resoconto, lo stesso secondo, lo stesso cielo — cambiato in un solo campo. Ciò "
          + "ATTRAVERSO cui un'osservazione è stata fatta decide la geometria di ogni fotogramma, e i tre "
          + "qui sotto non differiscono in nient'altro. Nota anche ciò che ciascuno lascia regolare: il "
          + "proprietario di una Instamatic aveva un solo diaframma e un solo tempo di posa, quindi "
          + "l'editor non gli offre nulla da scegliere. Una ricostruzione può essere razionale solo quanto "
          + "le impostazioni che consente."
      },
      demos: [
        {
          id: "instrument-eye",
          src: "/demo-data/instrument-eye.json",
          title: { en: "Seen with the naked eye", fr: "Vue à l'œil nu", es: "Visto a simple vista", it: "Visto a occhio nudo" },
          blurb: {
            en: "An eye perceives an angle as an angle wherever it falls, so the image is equidistant and a ruler held to the screen means something. 60° tall, and no frame at all: an eye has no rectangle.",
            fr: "Un œil perçoit un angle comme un angle où qu'il tombe : l'image est équidistante et une règle posée sur l'écran y mesure quelque chose. 60° de haut, et aucun cadre : un œil n'a pas de rectangle.",
            es: "Un ojo percibe un ángulo como un ángulo dondequiera que caiga, así que la imagen es equidistante y una regla puesta sobre la pantalla mide algo. 60° de alto, y ningún marco: un ojo no tiene rectángulo.",
            it: "Un occhio percepisce un angolo come un angolo ovunque cada, quindi l'immagine è equidistante e un righello appoggiato sullo schermo misura qualcosa. 60° di altezza, e nessuna cornice: un occhio non ha rettangolo."
          }
        },
        {
          id: "instrument-instamatic",
          src: "/demo-data/instrument-instamatic.json",
          title: { en: "On 126 film, 1964", fr: "Sur film 126, en 1964", es: "En película 126, 1964", it: "Su pellicola 126, 1964" },
          blurb: {
            en: "A SQUARE frame 36° on a side — 28 mm of image behind a 43 mm lens. One aperture, one shutter speed, one focal length, all fixed: nothing to set, and nothing offered.",
            fr: "Un cadre CARRÉ de 36° de côté — 28 mm d'image derrière un objectif de 43 mm. Un diaphragme, une vitesse, une focale, tous fixes : rien à régler, et rien de proposé.",
            es: "Un encuadre CUADRADO de 36° de lado — 28 mm de imagen tras un objetivo de 43 mm. Una apertura, una velocidad de obturación, una distancia focal, todas fijas: nada que ajustar, y nada ofrecido.",
            it: "Un fotogramma QUADRATO di 36° di lato — 28 mm di immagine dietro un obiettivo da 43 mm. Un diaframma, un tempo di posa, una focale, tutti fissi: niente da regolare, e niente proposto."
          }
        },
        {
          id: "instrument-slr",
          src: "/demo-data/instrument-slr.json",
          title: { en: "Through a 50\u00a0mm lens", fr: "Au 50\u00a0mm", es: "Con un objetivo de 50\u00a0mm", it: "Con un obiettivo da 50\u00a0mm" },
          blurb: {
            en: "27° tall, which is why a photographed light so often has nothing recognisable beside it. A lens maps f·tan θ: everything off-axis is stretched, 42% at 33° from the centre.",
            fr: "27° de haut — d'où le fait qu'une lumière photographiée n'a si souvent rien de reconnaissable à côté d'elle. Un objectif projette en f·tan θ : hors axe tout est étiré, de 42 % à 33° du centre.",
            es: "27° de alto, y por eso una luz fotografiada tan a menudo no tiene nada reconocible a su lado. Un objetivo proyecta según f·tan θ: todo lo que está fuera del eje se estira, un 42 % a 33° del centro.",
            it: "27° di altezza, ed è per questo che una luce fotografata così spesso non ha nulla di riconoscibile accanto. Un obiettivo proietta secondo f·tan θ: tutto ciò che è fuori asse viene stirato, del 42% a 33° dal centro."
          }
        }
      ]
    },
    {
      section: "instruments",
      heading: { en: "Weather, and the instrument", fr: "La météo, et l'instrument", es: "El tiempo, y el instrumento", it: "Il meteo, e lo strumento" },
      intro: {
        en: "The two things that most often turn an ordinary object into an extraordinary account.",
        fr: "Les deux choses qui transforment le plus souvent un objet ordinaire en récit extraordinaire.",
        es: "Las dos cosas que con más frecuencia convierten un objeto corriente en un relato extraordinario.",
        it: "Le due cose che più spesso trasformano un oggetto ordinario in un resoconto straordinario."
      },
      demos: [
        {
          id: "storm",
          src: "/demo-data/sky-test-storm.json",
          title: { en: "A thunderstorm", fr: "Un orage", es: "Una tormenta", it: "Un temporale" },
          blurb: {
            en: "Cloud base at 600 m, heavy rain drifting on a 5 m/s wind, lightning lighting the clouds and the whole scene, thunder arriving as late as its distance makes it. Pause it: all of it stops.",
            fr: "Base des nuages à 600 m, pluie forte dérivant sur un vent de 5 m/s, éclairs illuminant les nuages et toute la scène, tonnerre en retard selon la distance. Mettez en pause : tout s'arrête.",
            es: "Base de las nubes a 600 m, lluvia intensa que deriva con un viento de 5 m/s, relámpagos que iluminan las nubes y toda la escena, truenos que llegan con el retraso que impone su distancia. Ponlo en pausa: todo se detiene.",
            it: "Base delle nubi a 600 m, pioggia forte che deriva con un vento di 5 m/s, lampi che illuminano le nubi e l'intera scena, tuoni che arrivano con il ritardo dovuto alla loro distanza. Mettilo in pausa: tutto si ferma."
          }
        },
        {
          id: "aircraft",
          src: "/demo-data/sky-test-aircraft.json",
          title: { en: "An airliner on a 20-second exposure", fr: "Un avion de ligne sur une pose de 20\u00a0s", es: "Un avión de pasajeros en una exposición de 20\u00a0s", it: "Un aereo di linea in una posa di 20\u00a0s" },
          blurb: {
            en: "What is seen is an airliner on final approach, its landing lights facing the lens. Pause it and the 20-second exposure develops: steady lamps draw lines, flashing ones drop dots, and their spacing is the angular speed divided by the flash rate.",
            fr: "Ce qu'on voit est un avion de ligne en finale, phares d'atterrissage face à l'objectif. Mettez en pause et la pose de 20 s se développe : les feux fixes tracent des lignes, les clignotants posent des points, et leur espacement est la vitesse angulaire divisée par la cadence.",
            es: "Lo que se ve es un avión de pasajeros en aproximación final, con las luces de aterrizaje hacia el objetivo. Ponlo en pausa y la exposición de 20 s se revela: las luces fijas trazan líneas, las intermitentes dejan puntos, y su separación es la velocidad angular dividida por la frecuencia de destello.",
            it: "Ciò che si vede è un aereo di linea in finale, con i fari di atterraggio rivolti all'obiettivo. Mettilo in pausa e la posa di 20 s si sviluppa: le luci fisse tracciano linee, quelle lampeggianti lasciano punti, e la loro spaziatura è la velocità angolare divisa per la frequenza dei lampi."
          }
        }
      ]
    },
    {
      section: "instruments",
      heading: { en: "Camera and optics", fr: "Appareil et optique", es: "Cámara y óptica", it: "Fotocamera e ottica" },
      intro: {
        en: "What the glass of a camera adds to a picture: the ghosts of its lights, across the centre, and the drops the rain leaves on it, which only land where the rain meets the glass.",
        fr: "Ce que le verre d'un appareil ajoute à l'image : les reflets de ses lumières, de l'autre côté du centre, et les gouttes que la pluie y laisse, qui ne se posent que là où elle frappe le verre.",
        es: "Lo que el cristal de una cámara añade a la imagen: los reflejos de sus luces, al otro lado del centro, y las gotas que deja la lluvia, que solo caen donde la lluvia golpea el cristal.",
        it: "Ciò che il vetro di una fotocamera aggiunge all'immagine: i riflessi delle sue luci, dall'altra parte del centro, e le gocce che vi lascia la pioggia, che si posano solo dove la pioggia colpisce il vetro."
      },
      demos: [
        {
          id: "lens-ghosts",
          src: "/demo-data/sky-test-lens-ghosts.json",
          title: { en: "Lens ghosts", fr: "Reflets d'objectif", es: "Reflejos del objetivo", it: "Riflessi dell'obiettivo" },
          blurb: {
            en: "A phone filming a crossroads at night: a traffic light, streetlamps, the full Moon and a car's headlights, each with its ghost across the centre of the picture, moving against it. The red disc of night street videos.",
            fr: "Un téléphone filme un carrefour la nuit : un feu, des lampadaires, la pleine Lune et les phares d'une voiture, chacun avec son reflet de l'autre côté du centre de l'image, qui se déplace à l'inverse. Le disque rouge des vidéos de rue nocturnes.",
            es: "Un teléfono filma un cruce de noche: un semáforo, farolas, la luna llena y los faros de un coche, cada uno con su reflejo al otro lado del centro de la imagen, que se mueve al revés. El disco rojo de los vídeos callejeros nocturnos.",
            it: "Un telefono filma un incrocio di notte: un semaforo, lampioni, la luna piena e i fari di un'auto, ciascuno col suo riflesso dall'altra parte del centro dell'immagine, che si muove al contrario. Il disco rosso dei video notturni di strada."
          }
        },
        {
          id: "lens-ghosts-rain",
          src: "/demo-data/sky-test-lens-ghosts-rain.json",
          title: { en: "A shower on the window", fr: "Une averse sur la vitre", es: "Un chubasco en la ventana", it: "Un acquazzone sul vetro" },
          blurb: {
            en: "The same crossroads through a window as a shower passes: rain from behind leaves the pane dry, then the wind turns and drops land, merge and run down, until the last ones go when it stops. Point at a halo to see what light it comes from.",
            fr: "Le même carrefour à travers une vitre pendant une averse : la pluie de dos laisse la vitre sèche, puis le vent tourne et les gouttes se posent, fusionnent et coulent, jusqu'aux dernières quand elle s'arrête. Pointez un halo pour voir de quelle lumière il vient.",
            es: "El mismo cruce a través de una ventana durante un chubasco: la lluvia de espaldas deja el cristal seco, luego el viento gira y las gotas caen, se funden y bajan, hasta las últimas cuando para. Señala un halo para ver de qué luz viene.",
            it: "Lo stesso incrocio attraverso una finestra durante un acquazzone: la pioggia alle spalle lascia il vetro asciutto, poi il vento gira e le gocce si posano, si fondono e scendono, fino alle ultime quando smette. Indica un alone per vedere da quale luce viene."
          }
        }
      ]
    }
  ]

  /** Flat, in reading order — what the carousel steps through. */
  get demos(): readonly Demo[] {
    return this.groups.flatMap(group => group.demos)
  }
}
