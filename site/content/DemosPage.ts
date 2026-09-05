import { DemoCatalogue } from "./DemoCatalogue.js"
import type { PageMeta, SiteLanguage, SitePage } from "../SitePage.js"

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

  private readonly catalogue = new DemoCatalogue()

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

  render(language: SiteLanguage): string {
    const fr = language === "fr"
    const playerPath = "/player/"
    const editorPath = "/editor/"
    const openLabel = fr ? "Ouvrir en grand" : "Open full size"
    const editLabel = fr ? "Éditer" : "Edit"
    const loading = fr ? "Chargement du ciel…" : "Loading the sky…"

    const groups = this.catalogue.groups.map(group => `
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
      ? "Dix-sept reconstitutions. Aucune n'est une vidéo : chacune est calculée pendant que vous la "
        + "regardez, à partir d'une date, d'une heure et d'un lieu réels — appuyez sur lecture là où "
        + "cela vous intéresse."
      : "Seventeen reconstructions. None of them is a video: each is computed while you watch it, from "
        + "a real date, a real hour and a real place — press play on whichever interests you."}</p>
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
         Le détail, et ce que chacun attend, est sur <a href="/roadmap/">la page du plan</a>.`
      : `Atmospheric re-entries, a satellite pass actually computed for recent dates, volumetric
         clouds, observing from an aircraft, radar propagation anomalies. What each one is waiting
         on is on <a href="/roadmap/">the roadmap</a>.`}</p>
  </div>
</section>
`
  }
}
