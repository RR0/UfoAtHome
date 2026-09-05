import type { PageMeta, Said, SiteLanguage, SitePage } from "../SitePage.js"

interface Demo {
  readonly id: string
  readonly src: string
  /** Which recording the Edit/Open links point at, when `src` is a several-witness manifest. */
  readonly editSrc?: string
  readonly title: Said<string>
  readonly blurb: Said<string>
}

interface DemoGroup {
  readonly heading: Said<string>
  readonly intro: Said<string>
  readonly demos: readonly Demo[]
}

/**
 * The catalogue, and it really is one: every entry has its own live player, all of them on the
 * page at once, grouped by what they show.
 *
 * The one concession to the machine is that a scene is MOUNTED as it comes near the viewport and
 * unmounted once it is far behind, keeping at most a handful of WebGL contexts alive — a browser
 * hands out about sixteen and silently loses the oldest beyond that, which on a page of fifteen
 * skies would blank the ones the reader had already scrolled past. Everything on screen is
 * running; the budget is spent on what is being looked at.
 */
export class DemosPage implements SitePage {

  readonly meta: PageMeta = {
    slug: { en: "demos", fr: "demos" },
    navLabel: { en: "Demos", fr: "Démos" },
    title: { en: "What it can do", fr: "Ce qu'il sait faire" },
    description: {
      en: "Real sightings reconstructed, and skies set up for one sight at a time: haloes, rainbows, "
        + "the Milky Way, a comet, a meteor shower, a satellite window, a storm, an airliner on a long exposure.",
      fr: "Des observations réelles reconstituées, et des ciels réglés pour un phénomène à la fois : "
        + "halos, arcs-en-ciel, Voie lactée, comète, pluie de météores, fenêtre satellite, orage, avion en pose longue."
    },
    modules: ["/lib/rr0-scene.mjs"]
  }

  private readonly groups: readonly DemoGroup[] = [
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
            en: "Hale-Bopp at dusk on 1 April 1997. The orbit is propagated from that apparition's own elements; the tail from a physical length in space.",
            fr: "Hale-Bopp au crépuscule du 1ᵉʳ avril 1997. L'orbite est propagée depuis les éléments de cette apparition ; la queue depuis une longueur physique dans l'espace."
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

  /**
   * Mounts a scene as its card nears the viewport, plays it while it is actually on screen, and
   * takes the oldest ones down once too many are alive at once.
   */
  script(language: SiteLanguage): string {
    const loading = language === "fr" ? "Chargement du ciel…" : "Loading the sky…"
    return `// A browser hands out about sixteen WebGL contexts and silently loses the oldest past that,
// which on a page of fourteen skies blanks the ones already scrolled through. Eight alive is more
// than fits on any screen at once, so nothing visible is ever the one taken down.
const MAX_LIVE = 8
const cards = [...document.querySelectorAll(".demo-card")]
const live = []

const mount = async card => {
  if (card.dataset.mounted) return
  card.dataset.mounted = "1"
  live.push(card)
  while (live.length > MAX_LIVE) {
    // Never the one being looked at. If every live card is on screen there is nothing to give up:
    // going one over the budget is better than blanking a scene under the reader's eyes.
    const victim = live.find(other => !other.dataset.visible)
    if (!victim) break
    unmount(victim)
  }
  const scene = document.createElement("rr0-scene")
  card.querySelector(".demo-mount").replaceChildren(scene)
  await customElements.whenDefined("rr0-scene")
  // loadFromSrc rather than the src attribute, because it RESOLVES: playing has to wait until the
  // recording is in, or it finds a zero-length timeline and returns without doing anything.
  await scene.loadFromSrc(card.dataset.src)
  if (card.dataset.mounted && card.dataset.visible) scene.ufoElement.play()
}

const unmount = card => {
  const index = live.indexOf(card)
  if (index >= 0) live.splice(index, 1)
  delete card.dataset.mounted
  // Removing the element runs its own disconnectedCallback, which disposes the renderer and hands
  // the context back. A placeholder goes in so the card keeps its size.
  const placeholder = document.createElement("p")
  placeholder.className = "loading"
  placeholder.textContent = ${JSON.stringify(loading)}
  card.querySelector(".demo-mount").replaceChildren(placeholder)
}

const nearby = new IntersectionObserver(entries => {
  for (const entry of entries) {
    if (entry.isIntersecting) void mount(entry.target)
  }
}, { rootMargin: "400px 0px" })

const onScreen = new IntersectionObserver(entries => {
  for (const entry of entries) {
    const card = entry.target
    card.dataset.visible = entry.isIntersecting ? "1" : ""
    // Also the repair path: a card the budget took down while it was off screen would otherwise
    // stay a placeholder for good, since the observer that mounts it only fires on ENTERING its
    // margin and this card never left it.
    if (entry.isIntersecting && !card.dataset.mounted) {
      void mount(card)
      continue
    }
    const scene = card.querySelector("rr0-scene")
    // Off-screen scenes keep their context but stop burning frames on a sky nobody is watching.
    if (scene?.ufoElement) {
      if (entry.isIntersecting) scene.ufoElement.play()
      else scene.ufoElement.pause()
    }
  }
}, { threshold: 0.1 })

for (const card of cards) {
  nearby.observe(card)
  onScreen.observe(card)
}`
  }

  render(language: SiteLanguage): string {
    const fr = language === "fr"
    const playerPath = fr ? "/fr/lecteur/" : "/player/"
    const editorPath = fr ? "/fr/editeur/" : "/editor/"
    const openLabel = fr ? "Ouvrir en grand" : "Open full size"
    const editLabel = fr ? "Modifier" : "Edit"
    const loading = fr ? "Chargement du ciel…" : "Loading the sky…"

    const groups = this.groups.map(group => `
    <section class="demo-group">
      <h2>${group.heading[language]}</h2>
      <p class="prose-wide">${group.intro[language]}</p>
      <div class="demo-grid">
        ${group.demos.map(demo => {
          const target = encodeURIComponent(demo.editSrc ?? demo.src)
          return `<figure class="demo-card" id="${demo.id}" data-src="${demo.src}">
          <div class="demo-mount"><p class="loading">${loading}</p></div>
          <figcaption>
            <h3>${demo.title[language]}</h3>
            <p>${demo.blurb[language]}</p>
            <p class="demo-links">
              <a href="${playerPath}?sighting=${target}">${openLabel}</a>
              <span aria-hidden="true">·</span>
              <a href="${editorPath}?sighting=${target}">${editLabel}</a>
            </p>
          </figcaption>
        </figure>`
        }).join("\n        ")}
      </div>
    </section>`).join("\n")

    return `
<section class="band hero">
  <div class="wrap">
    <p class="eyebrow">${fr ? "Catalogue" : "Catalogue"}</p>
    <h1>${fr ? "Ce qu'il sait faire." : "What it can do."}</h1>
    <p class="lede">${fr
      ? "Quatorze reconstitutions, toutes en fonctionnement sur cette page. Aucune n'est une vidéo : "
        + "chacune est calculée pendant que vous la regardez, à partir d'une date, d'une heure et d'un "
        + "lieu réels. Cliquez dans l'une d'elles pour la mettre en pause."
      : "Fourteen reconstructions, all running on this page. None of them is a video: each is computed "
        + "while you watch it, from a real date, a real hour and a real place. Click inside one to pause it."}</p>
  </div>
</section>

<section class="band">
  <div class="wrap">
${groups}
  </div>
</section>

<section class="band">
  <div class="wrap prose-wide">
    <h2>${fr ? "Ce qui n'est pas encore là" : "What is not here yet"}</h2>
    <p>${fr
      ? `Les rentrées atmosphériques, un passage satellite réellement calculé pour les dates récentes,
         les nuages volumétriques, l'observation depuis un avion, les anomalies de propagation radar.
         Le détail, et ce que chacun attend, est sur <a href="/fr/plan/">la page du plan</a>.`
      : `Atmospheric re-entries, a satellite pass actually computed for recent dates, volumetric
         clouds, observing from an aircraft, radar propagation anomalies. What each one is waiting
         on is on <a href="/roadmap/">the roadmap</a>.`}</p>
  </div>
</section>
`
  }
}
