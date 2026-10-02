import type { Said } from "../SitePage.js"

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

export interface DemoGroup {
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

  readonly groups: readonly DemoGroup[] = [
    {
      heading: { en: "Real sightings", fr: "Des observations réelles", es: "Avistamientos reales", it: "Avvistamenti reali" },
      intro: {
        en: "Nine documented cases, each replayed in the sky of its own reported date, time and place.",
        fr: "Neuf dossiers documentés, chacun rejoué dans le ciel de sa propre date, heure et lieu déclarés.",
        es: "Nueve casos documentados, cada uno reproducido en el cielo de su propia fecha, hora y lugar declarados.",
        it: "Nove casi documentati, ciascuno riprodotto nel cielo della propria data, ora e luogo dichiarati."
      },
      demos: [
        {
          id: "chiles-whitted",
          src: "/demo-data/observer-chiles.json",
          playSrc: "/demo-data/case-chiles-whitted.json",
          title: { en: "Chiles & Whitted, 1948", fr: "Chiles et Whitted, 1948", es: "Chiles y Whitted, 1948", it: "Chiles e Whitted, 1948" },
          titleIsName: true,
          blurb: {
            en: "Night over Alabama, 02:45. Two airline pilots described the same phenomenon differently — open it full size to switch observer.",
            fr: "Nuit au-dessus de l'Alabama, 02:45. Deux pilotes de ligne ont décrit le même phénomène différemment — ouvrez-le en grand pour changer d'observateur.",
            es: "Noche sobre Alabama, 02:45. Dos pilotos de línea describieron el mismo fenómeno de forma distinta — ábrelo a tamaño completo para cambiar de observador.",
            it: "Notte sull'Alabama, 02:45. Due piloti di linea descrissero lo stesso fenomeno in modo diverso — aprilo a schermo intero per cambiare osservatore."
          }
        },
        {
          id: "valensole",
          src: "/demo-data/observer-valensole.json",
          title: { en: "Valensole, 1965", fr: "Valensole, 1965", es: "Valensole, 1965", it: "Valensole, 1965" },
          titleIsName: true,
          blurb: {
            en: "Early morning on the plateau, 05:45, the Sun forty minutes up and 7° high in the north-east — and the real relief of that field under the observer's feet.",
            fr: "Petit matin sur le plateau, 05:45, le Soleil levé depuis quarante minutes, à 7° de hauteur au nord-est — et le relief réel de ce champ sous les pieds de l'observateur.",
            es: "Primera hora de la mañana en la meseta, 05:45, el Sol salido hace cuarenta minutos y a 7° de altura al nordeste — y el relieve real de ese campo bajo los pies del observador.",
            it: "Primo mattino sull'altopiano, 05:45, il Sole sorto da quaranta minuti e alto 7° a nord-est — e il rilievo reale di quel campo sotto i piedi dell'osservatore."
          }
        },
        {
          id: "cussac",
          src: "/demo-data/observer-cussac.json",
          title: { en: "Cussac, 1967", fr: "Cussac, 1967", es: "Cussac, 1967", it: "Cussac, 1967" },
          titleIsName: true,
          blurb: {
            en: "Mid-morning on a Cantal plateau, 10:30. A sphere 82 m off behind a hedge, four small black beings diving into it, a widening helix — every angle from the GEPAN's 1978 theodolite survey.",
            fr: "Milieu de matinée sur un plateau du Cantal, 10:30. Une sphère à 82 m derrière une haie, quatre petits êtres noirs qui y plongent, une hélice qui s'élargit — chaque angle vient du relevé au théodolite du GEPAN en 1978.",
            es: "Media mañana en una meseta del Cantal, 10:30. Una esfera a 82 m tras un seto, cuatro pequeños seres negros que se zambullen en ella, una hélice que se ensancha — cada ángulo procede del levantamiento con teodolito del GEPAN en 1978.",
            it: "Metà mattina su un altopiano del Cantal, 10:30. Una sfera a 82 m dietro una siepe, quattro piccoli esseri neri che vi si tuffano dentro, un'elica che si allarga — ogni angolo viene dal rilievo al teodolite del GEPAN del 1978."
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
            fr: "Soleil bas, 17:50, Nouveau-Mexique. Le cas dont on discute la taille du phénomène — et où la reconstitution refuse d'en énoncer une.",
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
            en: "A July night in Hainaut, 00:45, no Moon. Three observers on a lawn, each watching a different part of the sky, see a dark boomerang cross it in ten seconds — with orange lights for one, red lights for another, and none for the third. Open it full size to switch observer.",
            fr: "Une nuit de juillet dans le Hainaut, 00:45, sans Lune. Trois observateurs sur une pelouse, chacun regardant une partie différente du ciel, voient un boomerang sombre le traverser en dix secondes — avec des lumières orange pour l'un, des lumières rouges pour un autre, et aucune pour le troisième. Ouvrez-le en grand pour changer d'observateur.",
            es: "Una noche de julio en el Hainaut, 00:45, sin Luna. Tres observadores en un césped, cada uno mirando una parte distinta del cielo, ven cruzarlo un bumerán oscuro en diez segundos — con luces naranjas para uno, luces rojas para otro, y ninguna para el tercero. Ábrelo a tamaño completo para cambiar de observador.",
            it: "Una notte di luglio nell'Hainaut, 00:45, senza Luna. Tre osservatori su un prato, ciascuno rivolto a una parte diversa del cielo, vedono attraversarlo un boomerang scuro in dieci secondi — con luci arancioni per uno, luci rosse per un altro, e nessuna per il terzo. Aprilo a schermo intero per cambiare osservatore."
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
        }
      ]
    },
    {
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
            en: "A cirrus veil, a Sun 20° up, crystals falling level: a hexagonal ice prism and Snell's law give every angle. Then the crystals tumble, the veil thins, a cumulus deck passes under it, and the display changes with each.",
            fr: "Un voile de cirrus, un Soleil à 20°, des cristaux tombant à plat : un prisme hexagonal de glace et la loi de Snell donnent chaque angle. Puis les cristaux tourbillonnent, le voile s'amincit, des cumulus passent dessous, et le halo change avec chacun.",
            es: "Un velo de cirros, un Sol a 20° de altura, cristales que caen planos: un prisma hexagonal de hielo y la ley de Snell dan cada ángulo. Luego los cristales dan vueltas, el velo se adelgaza, una capa de cúmulos pasa por debajo, y el halo cambia con cada uno.",
            it: "Un velo di cirri, un Sole alto 20°, cristalli che cadono orizzontali: un prisma esagonale di ghiaccio e la legge di Snell danno ogni angolo. Poi i cristalli ruotano, il velo si assottiglia, uno strato di cumuli gli passa sotto, e l'alone cambia con ciascuno."
          }
        },
        {
          id: "rainbow",
          src: "/demo-data/sky-test-rainbow.json",
          title: { en: "Rainbow", fr: "Arc-en-ciel", es: "Arcoíris", it: "Arcobaleno" },
          blurb: {
            en: "Rain, a Sun 9° up, a gap in the cloud, an observer facing away from it — all four, or nothing. Primary, secondary reversed, Alexander's band between.",
            fr: "De la pluie, un Soleil à 9°, une trouée dans les nuages, un observateur tournant le dos — les quatre, ou rien. Primaire, secondaire inversé, bande d'Alexandre entre les deux.",
            es: "Lluvia, un Sol a 9° de altura, un claro en las nubes, un observador de espaldas a él — los cuatro, o nada. Primario, secundario invertido, banda de Alejandro entre ambos.",
            it: "Pioggia, un Sole alto 9°, uno squarcio tra le nubi, un osservatore che gli volta le spalle — tutti e quattro, o niente. Primario, secondario invertito, banda di Alessandro in mezzo."
          }
        },
        {
          id: "moonbow",
          src: "/demo-data/sky-test-moonbow.json",
          title: { en: "Moonbow", fr: "Arc lunaire", es: "Arcoíris lunar", it: "Arcobaleno lunare" },
          blurb: {
            en: "The same geometry under a full Moon 22° up. Too faint for colour vision, so the eye sees a white arc — which is what observers describe.",
            fr: "La même géométrie sous une pleine Lune à 22°. Trop faible pour la vision des couleurs : l'œil voit un arc blanc — c'est ce que décrivent les observateurs.",
            es: "La misma geometría bajo una Luna llena a 22° de altura. Demasiado débil para la visión de los colores, así que el ojo ve un arco blanco — que es lo que describen los observadores.",
            it: "La stessa geometria sotto una Luna piena alta 22°. Troppo debole per la visione dei colori, così l'occhio vede un arco bianco — che è ciò che descrivono gli osservatori."
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
          id: "fireball",
          src: "/demo-data/sky-test-fireball.json",
          title: { en: "A recorded fireball", fr: "Un bolide enregistré", es: "Un bólido registrado", it: "Un bolide registrato" },
          blurb: {
            en: "Edinburgh, 27 December 2025 at 03:16: a bolide 13 cameras of the Global Meteor Network triangulated, found in its archive and drawn from here as it burned.",
            fr: "Édimbourg, 27 décembre 2025 à 3 h 16 : un bolide que 13 caméras du Global Meteor Network ont triangulé, trouvé dans son archive et dessiné d'ici tel qu'il a brûlé.",
            es: "Edimburgo, 27 de diciembre de 2025 a las 3:16: un bólido que 13 cámaras de la Global Meteor Network triangularon, encontrado en su archivo y dibujado desde aquí tal como ardió.",
            it: "Edimburgo, 27 dicembre 2025 alle 3:16: un bolide che 13 telecamere della Global Meteor Network hanno triangolato, trovato nel suo archivio e disegnato da qui come è bruciato."
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
        }
      ]
    },
    {
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
    }
  ]

  /** Flat, in reading order — what the carousel steps through. */
  get demos(): readonly Demo[] {
    return this.groups.flatMap(group => group.demos)
  }
}
