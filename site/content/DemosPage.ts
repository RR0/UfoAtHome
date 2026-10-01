import { DemoCatalogue } from "./DemoCatalogue.js"
import type { PageMeta, Said, SiteLanguage, SitePage } from "../SitePage.js"

/**
 * The catalogue, and it really is one: every entry has its own live player, all of them on the
 * page at once, grouped by what they show.
 *
 * The one concession to the machine is that a scene is MOUNTED as it comes near the viewport and
 * unmounted once it is far behind, keeping at most a handful of WebGL contexts alive — a browser
 * hands out about sixteen and silently loses the oldest beyond that, which on a page of fourteen
 * skies would blank the ones the reader had already scrolled past. Everything on screen is
 * running; the budget is spent on what is being looked at.
 */
export class DemosPage implements SitePage {

  readonly meta: PageMeta = {
    slug: "demos",
    navLabel: { en: "Demos", fr: "Démos", es: "Demos", it: "Demo" },
    title: { en: "What it can do", fr: "Ce qu'il sait faire", es: "Lo que sabe hacer", it: "Cosa sa fare" },
    description: {
      en: "Real sightings reconstructed, and skies set up for one sight at a time: haloes, rainbows, "
        + "the Milky Way, a comet, a new star, a meteor shower, a Starlink train, a storm, an airliner on a long exposure.",
      fr: "Des observations réelles reconstituées, et des ciels réglés pour un phénomène à la fois : "
        + "halos, arcs-en-ciel, Voie lactée, comète, étoile nouvelle, pluie de météores, train de Starlink, orage, avion en pose longue.",
      es: "Avistamientos reales reconstruidos, y cielos preparados para un fenómeno cada vez: halos, arcoíris, "
        + "la Vía Láctea, un cometa, una estrella nueva, una lluvia de meteoros, un tren de Starlink, una tormenta, un avión de línea en exposición larga.",
      it: "Avvistamenti reali ricostruiti, e cieli preparati per un fenomeno alla volta: aloni, arcobaleni, "
        + "la Via Lattea, una cometa, una stella nuova, uno sciame meteorico, un treno di Starlink, un temporale, un aereo di linea in posa lunga."
    },
    modules: ["/lib/rr0-scene.mjs"]
  }

  private readonly catalogue = new DemoCatalogue()

  /**
   * Mounts a scene as its card nears the viewport, plays it while it is actually on screen, and
   * takes the oldest ones down once too many are alive at once.
   */
  script(language: SiteLanguage): string {
    const loading = DemosPage.LOADING[language]
    return `// A browser hands out about sixteen WebGL contexts and silently loses the oldest past that,
// which on a page of seventeen skies blanks the ones already scrolled through. A card taken down
// now gives its context back at once (see SceneElement's disconnection), so twelve alive stay
// well inside that; and twelve is what a wide screen with its mounting margin actually reaches —
// at eight, a 1440 px window mounted and took down the same cards over and over as it scrolled.
const MAX_LIVE = 12
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
  // No map open on a card, even for an observer who travelled (see OBSERVER_MAP_ATTRIBUTE, whose
  // default would open it): the map is 140 px square in a card 181 px tall, so it covered three
  // quarters of the sky it was meant to sit in a corner of. The button stays, and the full-size
  // View page opens the map on its own.
  scene.setAttribute("show-observer-map", "false")
  card.querySelector(".demo-mount").replaceChildren(scene)
  await customElements.whenDefined("rr0-scene")
  await scene.loadFromSrc(card.dataset.src)
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
}, { rootMargin: "200px 0px" })

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
    // Nothing starts on its own. Seventeen skies playing at once is seventeen WebGL contexts each
    // asking for sixty frames a second, and the reader is looking at one of them — so a card shows
    // its first frame and its own play button, and runs when it is asked to. What is still
    // automatic is STOPPING: a scene the reader has scrolled past keeps its context but gives back
    // the frames.
    const scene = card.querySelector("rr0-scene")
    if (!entry.isIntersecting) scene?.ufoElement?.pause()
  }
}, { threshold: 0.1 })

for (const card of cards) {
  nearby.observe(card)
  onScreen.observe(card)
}`
  }

  /** The placeholder a card shows while its scene is not mounted. */
  private static readonly LOADING: Said<string> = {
    en: "Loading the sky…",
    fr: "Chargement du ciel…",
    es: "Cargando el cielo…",
    it: "Caricamento del cielo…"
  }

  render(language: SiteLanguage): string {
    const playerPath = "/play/"
    // The title is the way to watch a demo in full, and editing is one button away from there:
    // a "View · Edit" pair under each card repeated both.
    const loading = DemosPage.LOADING[language]

    const groups = this.catalogue.groups.map(group => `
    <section class="demo-group">
      <h2>${group.heading[language]}</h2>
      <p class="prose-wide">${group.intro[language]}</p>
      <div class="demo-grid">
        ${group.demos.map(demo => {
          const played = encodeURIComponent(demo.playSrc ?? demo.editSrc ?? demo.src)
          return `<figure class="demo-card" id="${demo.id}" data-src="${demo.src}">
          <div class="demo-mount"><p class="loading">${loading}</p></div>
          <figcaption>
            <h3><a href="${playerPath}?sighting=${played}">${demo.title[language]}</a></h3>
            <p>${demo.blurb[language]}</p>
          </figcaption>
        </figure>`
        }).join("\n        ")}
      </div>
    </section>`).join("\n")

    // Counted, not written: the lede said "seventeen" long after the catalogue had grown past it.
    const count = this.catalogue.groups.reduce((total, group) => total + group.demos.length, 0)
    return `
<section class="band hero">
  <div class="wrap">
    <p class="eyebrow">${({ en: "Catalogue", fr: "Catalogue", es: "Catálogo", it: "Catalogo" })[language]}</p>
    <h1>${({ en: "What it can do.", fr: "Ce qu'il sait faire.", es: "Lo que sabe hacer.", it: "Cosa sa fare." })[language]}</h1>
    <p class="lede">${({
      en: `${count} reconstructions. None of them is a video: each is computed while you watch it, from `
        + "a real date, a real hour and a real place — press play on whichever interests you.",
      fr: `${count} reconstitutions. Aucune n'est une vidéo : chacune est calculée pendant que vous la `
        + "regardez, à partir d'une date, d'une heure et d'un lieu réels — appuyez sur lecture là où "
        + "cela vous intéresse.",
      es: `${count} reconstrucciones. Ninguna es un vídeo: cada una se calcula mientras la miras, a partir `
        + "de una fecha real, una hora real y un lugar real — pulsa reproducir en la que te interese.",
      it: `${count} ricostruzioni. Nessuna è un video: ognuna viene calcolata mentre la guardi, a partire `
        + "da una data reale, un'ora reale e un luogo reale — premi play su quella che ti interessa."
    })[language]}</p>
  </div>
</section>

<section class="band">
  <div class="wrap">
${groups}
  </div>
</section>

<section class="band">
  <div class="wrap prose-wide">
    <h2>${({
      en: "What is not here yet",
      fr: "Ce qui n'est pas encore là",
      es: "Lo que aún no está",
      it: "Ciò che non c'è ancora"
    })[language]}</h2>
    <p>${({
      en: `Atmospheric re-entries, observing from an aircraft, radar propagation anomalies. What each one is waiting
         on is on <a href="/roadmap/">the roadmap</a>.`,
      fr: `Les rentrées atmosphériques, l'observation depuis un avion, les anomalies de propagation radar.
         Le détail, et ce que chacun attend, est sur <a href="/roadmap/">la page des futures évolutions</a>.`,
      es: `Las reentradas atmosféricas, la observación desde un avión, las anomalías de propagación del radar. Lo que
         espera cada una está en <a href="/roadmap/">la hoja de ruta</a>.`,
      it: `I rientri atmosferici, l'osservazione da un aereo, le anomalie di propagazione radar. Ciò che ciascuna
         aspetta è nella <a href="/roadmap/">tabella di marcia</a>.`
    })[language]}</p>
  </div>
</section>
`
  }
}
