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
  /**
   * Whether to offer the map of where the observer stood — see the `show-observer-map` attribute,
   * which is off everywhere by default.
   *
   * Per demo, not per page, because it is a fact about the RECONSTRUCTION and not about where it is
   * being shown: a case whose observer never moved and whose heading nobody recorded has a map with
   * one pin and no cone on it, which is worth less than the room it takes. The two that carry it are
   * the two that went somewhere — Socorro's eleven hundred metres of road, and an airliner crossing
   * Alabama at night.
   *
   * It decides the map's STARTING state, not whether it exists: every reconstruction that states a
   * place has the button (see OBSERVER_MAP_ATTRIBUTE), and a reader can open one this list does not.
   * Honoured by the front page's carousel and by the full-size player, not by the catalogue's cards:
   * a map is a fixed 140 px square, and a card's sky is 181 px tall.
   */
  readonly observerMap?: boolean
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
      heading: { en: "Real sightings", fr: "Des observations réelles" },
      intro: {
        en: "Five documented cases, each replayed in the sky of its own reported date, time and place.",
        fr: "Cinq dossiers documentés, chacun rejoué dans le ciel de sa propre date, heure et lieu déclarés."
      },
      demos: [
        {
          id: "chiles-whitted",
          src: "/demo-data/observer-chiles.json",
          playSrc: "/demo-data/case-chiles-whitted.json",
          observerMap: true,
          title: { en: "Chiles & Whitted, 1948", fr: "Chiles et Whitted, 1948" },
          titleIsName: true,
          blurb: {
            en: "Night over Alabama, 02:45. Two airline pilots described the same phenomenon differently — open it full size to switch observer.",
            fr: "Nuit au-dessus de l'Alabama, 02:45. Deux pilotes de ligne ont décrit le même phénomène différemment — ouvrez-le en grand pour changer d'observateur."
          }
        },
        {
          id: "valensole",
          src: "/demo-data/observer-valensole.json",
          title: { en: "Valensole, 1965", fr: "Valensole, 1965" },
          titleIsName: true,
          blurb: {
            en: "Early morning on the plateau, 05:45, the Sun forty minutes up and 7° high in the north-east — and the real relief of that field under the observer's feet.",
            fr: "Petit matin sur le plateau, 05:45, le Soleil levé depuis quarante minutes, à 7° de hauteur au nord-est — et le relief réel de ce champ sous les pieds de l'observateur."
          }
        },
        {
          id: "cussac",
          src: "/demo-data/observer-cussac.json",
          title: { en: "Cussac, 1967", fr: "Cussac, 1967" },
          titleIsName: true,
          blurb: {
            en: "Mid-morning on a Cantal plateau, 10:30. A sphere 82 m off behind a hedge, four small black beings diving into it, a widening helix — every angle from the GEPAN's 1978 theodolite survey.",
            fr: "Milieu de matinée sur un plateau du Cantal, 10:30. Une sphère à 82 m derrière une haie, quatre petits êtres noirs qui y plongent, une hélice qui s'élargit — chaque angle vient du relevé au théodolite du GEPAN en 1978."
          }
        },
        {
          id: "socorro",
          src: "/demo-data/observer-socorro.json",
          // The case, for the player: it holds an interpretation beside the account to choose from.
          playSrc: "/demo-data/case-socorro.json",
          observerMap: true,
          title: { en: "Socorro, 1964", fr: "Socorro, 1964" },
          titleIsName: true,
          blurb: {
            en: "Low sun, 17:50, New Mexico. The case people argue about the phenomenon's size in — and where the reconstruction refuses to state one.",
            fr: "Soleil bas, 17:50, Nouveau-Mexique. Le cas dont on discute la taille du phénomène — et où la reconstitution refuse d'en énoncer une."
          }
        },
        {
          id: "wilcox",
          src: "/demo-data/observer-wilcox.json",
          title: { en: "Wilcox, 1964", fr: "Wilcox, 1964" },
          titleIsName: true,
          blurb: {
            en: "Broad daylight, 10:00, New York State, with a cloud deck lifting from 800 m to 913 m across the two hours the record covers.",
            fr: "Plein jour, 10:00, État de New York, avec une base de nuages qui monte de 800 m à 913 m sur les deux heures que couvre le relevé."
          }
        }
      ]
    },
    {
      heading: { en: "What the sky can hold", fr: "Ce que le ciel peut contenir" },
      intro: {
        en: "These hold no recorded phenomenon at all. They are skies set up with the conditions one "
          + "sight needs, for looking at that sight — because most of them need three or four "
          + "conditions at once, and knowing which is exactly what separates “there was no Milky "
          + "Way” from “I could not have seen it”.",
        fr: "Ceux-ci ne contiennent aucun phénomène enregistré. Ce sont des ciels réglés avec les "
          + "conditions qu'exige un phénomène, pour regarder ce phénomène — car la plupart en "
          + "demandent trois ou quatre à la fois, et savoir lesquelles est exactement ce qui sépare "
          + "« il n'y avait pas de Voie lactée » de « je n'aurais pas pu la voir »."
      },
      demos: [
        {
          id: "clouds",
          src: "/demo-data/sky-test-clouds.json",
          title: { en: "Cloud layers in motion", fr: "Couches nuageuses en mouvement" },
          blurb: {
            en: "Cloud layers you can set — altitude, thickness, coverage, size, density, wind — down to individual clouds driven one by one.",
            fr: "Des couches nuageuses paramétrables — altitude, épaisseur, couverture, taille, densité, vent — jusqu'à des nuages individuels pilotés un par un."
          }
        },
        {
          id: "halos",
          src: "/demo-data/sky-test-halos.json",
          title: { en: "Ice haloes and sundogs", fr: "Halos de glace et parhélies" },
          blurb: {
            en: "A cirrus veil, a Sun 20° up, crystals falling level: a hexagonal ice prism and Snell's law give every angle. Then the crystals tumble, the veil thins, a cumulus deck passes under it, and the display changes with each.",
            fr: "Un voile de cirrus, un Soleil à 20°, des cristaux tombant à plat : un prisme hexagonal de glace et la loi de Snell donnent chaque angle. Puis les cristaux tourbillonnent, le voile s'amincit, des cumulus passent dessous, et le halo change avec chacun."
          }
        },
        {
          id: "rainbow",
          src: "/demo-data/sky-test-rainbow.json",
          title: { en: "Rainbow", fr: "Arc-en-ciel" },
          blurb: {
            en: "Rain, a Sun 9° up, a gap in the cloud, an observer facing away from it — all four, or nothing. Primary, secondary reversed, Alexander's band between.",
            fr: "De la pluie, un Soleil à 9°, une trouée dans les nuages, un observateur tournant le dos — les quatre, ou rien. Primaire, secondaire inversé, bande d'Alexandre entre les deux."
          }
        },
        {
          id: "moonbow",
          src: "/demo-data/sky-test-moonbow.json",
          title: { en: "Moonbow", fr: "Arc lunaire" },
          blurb: {
            en: "The same geometry under a full Moon 22° up. Too faint for colour vision, so the eye sees a white arc — which is what observers describe.",
            fr: "La même géométrie sous une pleine Lune à 22°. Trop faible pour la vision des couleurs : l'œil voit un arc blanc — c'est ce que décrivent les observateurs."
          }
        },
        {
          id: "milkyway",
          src: "/demo-data/sky-test-milkyway.json",
          title: { en: "The Milky Way", fr: "La Voie lactée" },
          blurb: {
            en: "New Moon, Sun 65° down, galactic centre 81° up over the Atacama. Integrated through a real dust model, so the dark rift falls out of the calculation.",
            fr: "Nouvelle Lune, Soleil à 65° sous l'horizon, centre galactique à 81° au-dessus de l'Atacama. Intégrée dans un vrai modèle de poussière : le rift sombre sort du calcul."
          }
        },
        {
          id: "zodiacal",
          src: "/demo-data/sky-test-zodiacal.json",
          title: { en: "Zodiacal light", fr: "Lumière zodiacale" },
          blurb: {
            en: "Sun 16° below the horizon, no Moon, the Sun's path standing steep over the west: a faint tilted cone of light with blurred edges, gone within the hour.",
            fr: "Soleil à 16° sous l'horizon, pas de Lune, la route du Soleil presque dressée au couchant : une faible lueur en cône incliné, aux contours flous, disparue en moins d'une heure."
          }
        },
        {
          id: "comet",
          src: "/demo-data/sky-test-comet.json",
          title: { en: "A comet", fr: "Une comète" },
          blurb: {
            en: "Hale-Bopp at dusk on 1 April 1997, magnitude −0.8, 30° up to the north-west with a 20° tail. The orbit is propagated from that apparition's own elements.",
            fr: "Hale-Bopp au crépuscule du 1ᵉʳ avril 1997, magnitude −0,8, à 30° de hauteur au nord-ouest, queue de 20°. L'orbite est propagée depuis les éléments de cette apparition."
          }
        },
        {
          id: "nova",
          src: "/demo-data/sky-test-nova.json",
          title: { en: "A new star", fr: "Une étoile nouvelle" },
          blurb: {
            en: "Nova Aquilae over Paris, 10 June 1918, 23:30, magnitude 0.2 where nothing shone the night before. Its brightness is interpolated between the AAVSO's own observations.",
            fr: "La nova de l'Aigle au-dessus de Paris, 10 juin 1918, 23 h 30, magnitude 0,2 là où rien ne brillait la veille. Son éclat est interpolé entre les observations de l'AAVSO."
          }
        },
        {
          id: "meteors",
          src: "/demo-data/sky-test-meteors.json",
          title: { en: "A meteor shower", fr: "Une pluie de météores" },
          blurb: {
            en: "Perseids, 13 August 2018, 04:05, radiant high and no Moon — over the sporadic background that falls every night of the year.",
            fr: "Perséides, 13 août 2018, 04:05, radiant haut et pas de Lune — au-dessus du fond sporadique qui tombe toutes les nuits de l'année."
          }
        },
        {
          id: "satellites",
          src: "/demo-data/sky-test-satellites.json",
          title: { en: "A Starlink train", fr: "Un train de Starlink" },
          blurb: {
            en: "Paris, 29 July 2025 at 11 pm, two days after a launch: the new satellites cross in a line, each propagated from the orbital elements archived that day.",
            fr: "Paris, 29 juillet 2025 à 23 h, deux jours après un lancement : les nouveaux satellites passent en file, chacun propagé depuis les éléments orbitaux archivés ce jour-là."
          }
        }
      ]
    },
    {
      heading: {
        en: "One sighting, three instruments",
        fr: "Une observation, trois instruments"
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
          + "où les réglages qu'elle autorise l'étaient."
      },
      demos: [
        {
          id: "instrument-eye",
          src: "/demo-data/instrument-eye.json",
          title: { en: "Seen with the naked eye", fr: "Vue à l'œil nu" },
          blurb: {
            en: "An eye perceives an angle as an angle wherever it falls, so the image is equidistant and a ruler held to the screen means something. 60° tall, and no frame at all: an eye has no rectangle.",
            fr: "Un œil perçoit un angle comme un angle où qu'il tombe : l'image est équidistante et une règle posée sur l'écran y mesure quelque chose. 60° de haut, et aucun cadre : un œil n'a pas de rectangle."
          }
        },
        {
          id: "instrument-instamatic",
          src: "/demo-data/instrument-instamatic.json",
          title: { en: "On 126 film, 1964", fr: "Sur film 126, en 1964" },
          blurb: {
            en: "A SQUARE frame 36° on a side — 28 mm of image behind a 43 mm lens. One aperture, one shutter speed, one focal length, all fixed: nothing to set, and nothing offered.",
            fr: "Un cadre CARRÉ de 36° de côté — 28 mm d'image derrière un objectif de 43 mm. Un diaphragme, une vitesse, une focale, tous fixes : rien à régler, et rien de proposé."
          }
        },
        {
          id: "instrument-slr",
          src: "/demo-data/instrument-slr.json",
          title: { en: "Through a 50\u00a0mm lens", fr: "Au 50\u00a0mm" },
          blurb: {
            en: "27° tall, which is why a photographed light so often has nothing recognisable beside it. A lens maps f·tan θ: everything off-axis is stretched, 42% at 33° from the centre.",
            fr: "27° de haut — d'où le fait qu'une lumière photographiée n'a si souvent rien de reconnaissable à côté d'elle. Un objectif projette en f·tan θ : hors axe tout est étiré, de 42 % à 33° du centre."
          }
        }
      ]
    },
    {
      heading: { en: "Weather, and the instrument", fr: "La météo, et l'instrument" },
      intro: {
        en: "The two things that most often turn an ordinary object into an extraordinary account.",
        fr: "Les deux choses qui transforment le plus souvent un objet ordinaire en récit extraordinaire."
      },
      demos: [
        {
          id: "storm",
          src: "/demo-data/sky-test-storm.json",
          title: { en: "A thunderstorm", fr: "Un orage" },
          blurb: {
            en: "Cloud base at 600 m, heavy rain drifting on a 5 m/s wind, lightning lighting the clouds and the whole scene, thunder arriving as late as its distance makes it. Pause it: all of it stops.",
            fr: "Base des nuages à 600 m, pluie forte dérivant sur un vent de 5 m/s, éclairs illuminant les nuages et toute la scène, tonnerre en retard selon la distance. Mettez en pause : tout s'arrête."
          }
        },
        {
          id: "aircraft",
          src: "/demo-data/sky-test-aircraft.json",
          title: { en: "An airliner on a 20-second exposure", fr: "Un avion de ligne sur une pose de 20\u00a0s" },
          blurb: {
            en: "No phenomenon is drawn here — there isn't one. Steady lamps draw lines, flashing ones drop dots, and their spacing is the flash rate times the angular speed.",
            fr: "Aucun phénomène n'est dessiné ici — il n'y en a pas. Les feux fixes tracent des lignes, les clignotants posent des points, et leur espacement est la cadence multipliée par la vitesse angulaire."
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
