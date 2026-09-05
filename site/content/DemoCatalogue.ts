import type { Said } from "../SitePage.js"

export interface Demo {
  readonly id: string
  readonly src: string
  /** Which recording the View/Edit links point at, when `src` is a several-witness manifest. */
  readonly editSrc?: string
  readonly title: Said<string>
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
        en: "Four documented cases, each replayed in the sky of its own reported date, time and place.",
        fr: "Quatre dossiers documentés, chacun rejoué dans le ciel de sa propre date, heure et lieu déclarés."
      },
      demos: [
        {
          id: "chiles-whitted",
          src: "/demo-data/witness-chiles.json",
          title: { en: "Chiles & Whitted, 1948", fr: "Chiles et Whitted, 1948" },
          blurb: {
            en: "Night over Alabama, 02:45. Two airline pilots described the same object differently — open it full size to switch witness.",
            fr: "Nuit au-dessus de l'Alabama, 02:45. Deux pilotes de ligne ont décrit le même objet différemment — ouvrez-le en grand pour changer de témoin."
          }
        },
        {
          id: "valensole",
          src: "/demo-data/witness-valensole.json",
          title: { en: "Valensole, 1965", fr: "Valensole, 1965" },
          blurb: {
            en: "Dawn on the plateau, 05:45, the Sun still below the horizon — and the real relief of that field under the witness's feet.",
            fr: "L'aube sur le plateau, 05:45, le Soleil encore sous l'horizon — et le relief réel de ce champ sous les pieds du témoin."
          }
        },
        {
          id: "socorro",
          src: "/demo-data/witness-socorro.json",
          title: { en: "Socorro, 1964", fr: "Socorro, 1964" },
          blurb: {
            en: "Low sun, 17:50, New Mexico. The case people argue about the object's size in — and where the reconstruction refuses to state one.",
            fr: "Soleil bas, 17:50, Nouveau-Mexique. Le cas dont on discute la taille de l'objet — et où la reconstitution refuse d'en énoncer une."
          }
        },
        {
          id: "wilcox",
          src: "/demo-data/witness-wilcox.json",
          title: { en: "Wilcox, 1964", fr: "Wilcox, 1964" },
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
        en: "These hold no recorded object at all. They are skies set up with the conditions one "
          + "sight needs, for looking at that sight — because most of them need three or four "
          + "conditions at once, and knowing which is exactly what separates “there was no Milky "
          + "Way” from “I could not have seen it”.",
        fr: "Ceux-ci ne contiennent aucun objet enregistré. Ce sont des ciels réglés avec les "
          + "conditions qu'exige un phénomène, pour regarder ce phénomène — car la plupart en "
          + "demandent trois ou quatre à la fois, et savoir lesquelles est exactement ce qui sépare "
          + "« il n'y avait pas de Voie lactée » de « je n'aurais pas pu la voir »."
      },
      demos: [
        {
          id: "halos",
          src: "/demo-data/sky-test-halos.json",
          title: { en: "Ice haloes and sundogs", fr: "Halos de glace et parhélies" },
          blurb: {
            en: "A cirrus veil, a Sun 20° up, crystals falling level. Nothing is placed: a hexagonal ice prism and Snell's law give every angle.",
            fr: "Un voile de cirrus, un Soleil à 20°, des cristaux tombant à plat. Rien n'est posé : un prisme hexagonal de glace et la loi de Snell donnent chaque angle."
          }
        },
        {
          id: "rainbow",
          src: "/demo-data/sky-test-rainbow.json",
          title: { en: "Rainbow", fr: "Arc-en-ciel" },
          blurb: {
            en: "Rain, a Sun 9° up, a gap in the cloud, a witness facing away from it — all four, or nothing. Primary, secondary reversed, Alexander's band between.",
            fr: "De la pluie, un Soleil à 9°, une trouée dans les nuages, un témoin tournant le dos — les quatre, ou rien. Primaire, secondaire inversé, bande d'Alexandre entre les deux."
          }
        },
        {
          id: "moonbow",
          src: "/demo-data/sky-test-moonbow.json",
          title: { en: "Moonbow", fr: "Arc lunaire" },
          blurb: {
            en: "The same geometry under a full Moon 22° up. Too faint for colour vision, so the eye sees a white arc — which is what witnesses describe.",
            fr: "La même géométrie sous une pleine Lune à 22°. Trop faible pour la vision des couleurs : l'œil voit un arc blanc — c'est ce que décrivent les témoins."
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
            en: "Sun 16° down, a steep ecliptic, no Moon: a leaning cone with no edge, gone within the hour.",
            fr: "Soleil à 16° sous l'horizon, écliptique redressée, pas de Lune : un cône penché sans bord, disparu en une heure."
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
          id: "meteors",
          src: "/demo-data/sky-test-meteors.json",
          title: { en: "A meteor shower", fr: "Une pluie de météores" },
          blurb: {
            en: "Perseids, 13 August 2018, 03:30, radiant high and no Moon — over the sporadic background that falls every night of the year.",
            fr: "Perséides, 13 août 2018, 03:30, radiant haut et pas de Lune — au-dessus du fond sporadique qui tombe toutes les nuits de l'année."
          }
        },
        {
          id: "satellites",
          src: "/demo-data/sky-test-satellites.json",
          title: { en: "Could a satellite have been lit?", fr: "Un satellite pouvait-il être éclairé ?" },
          blurb: {
            en: "No pass is drawn — no historical orbital elements are reachable. What is computed is the height of the Earth's shadow, which settles the question.",
            fr: "Aucun passage n'est dessiné — aucun élément orbital historique n'est joignable. Ce qui est calculé, c'est la hauteur de l'ombre de la Terre, qui tranche."
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
          title: { en: "Through a 50 mm lens", fr: "Au 50 mm" },
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
            en: "Cloud base at 600 m, heavy rain drifting on a real 14 m/s wind, lightning lighting the scene's haze, thunder arriving late. Pause it: all of it stops.",
            fr: "Base des nuages à 600 m, pluie forte dérivant sur un vent réel de 14 m/s, éclairs illuminant la brume, tonnerre en retard. Mettez en pause : tout s'arrête."
          }
        },
        {
          id: "aircraft",
          src: "/demo-data/sky-test-aircraft.json",
          title: { en: "An airliner on a 20-second exposure", fr: "Un avion de ligne sur une pose de 20 s" },
          blurb: {
            en: "No object is drawn here — there isn't one. Steady lamps draw lines, flashing ones drop dots, and their spacing is the flash rate times the angular speed.",
            fr: "Aucun objet n'est dessiné ici — il n'y en a pas. Les feux fixes tracent des lignes, les clignotants posent des points, et leur espacement est la cadence multipliée par la vitesse angulaire."
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
