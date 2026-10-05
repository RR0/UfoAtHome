import { DemoCatalogue, type DemoSection } from "./DemoCatalogue.js"
import type { PageMeta, Said, SiteLanguage, SitePage } from "../SitePage.js"

/**
 * One part of the catalogue, under the hub at `/demos/`: every entry has its own live player, all of
 * them on the page at once, grouped by what they show.
 *
 * The one concession to the machine is that a scene is MOUNTED as it comes near the viewport and
 * unmounted once it is far behind, keeping at most a handful of WebGL contexts alive — a browser
 * hands out about sixteen and silently loses the oldest beyond that, which on a page of fourteen
 * skies would blank the ones the reader had already scrolled past. Everything on screen is
 * running; the budget is spent on what is being looked at.
 */
export class DemoSectionPage implements SitePage {

  readonly meta: PageMeta

  private readonly groups

  constructor(private readonly section: DemoSection, catalogue: DemoCatalogue) {
    this.groups = catalogue.groups.filter(group => group.section === section.id)
    this.meta = {
      slug: `demos/${section.id}`,
      navLabel: section.title,
      title: section.title,
      description: section.blurb,
      modules: ["/lib/rr0-scene.mjs"],
      asideFromNav: true,
      asideFromFooter: true
    }
  }

  /**
   * Mounts a scene as its card nears the viewport, plays it while it is actually on screen, and
   * takes the oldest ones down once too many are alive at once.
   */
  script(language: SiteLanguage): string {
    const loading = DemoSectionPage.LOADING[language]
    return `// A browser hands out about sixteen WebGL contexts and silently loses the oldest past that,
// which on a page of seventeen skies blanks the ones already scrolled through. A card taken down
// now gives its context back at once (see SceneElement's disconnection), so twelve alive stay
// well inside that; and twelve is what a wide screen with its mounting margin actually reaches —
// at eight, a 1440 px window mounted and took down the same cards over and over as it scrolled.
// On a phone the budget is memory, not contexts: each live sky holds tens of megabytes of scene and of
// graphics memory, and a phone's browser does not lose the oldest, it takes the whole tab down. One or
// two cards are on screen at a time there, so four alive leave a card's worth of room to scroll back.
const MAX_LIVE = matchMedia("(pointer: coarse)").matches ? 4 : 12
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
    const loading = DemoSectionPage.LOADING[language]

    // The heading has an id of its own, so that the site does not give it the "#" link it gives every other: a card is already a link, to its
    // player, and the card itself (by the demo's id) is what a reader would share.
    const groups = this.groups.map(group => `
    <section class="demo-group">
      <h2>${group.heading[language]}</h2>
      <p class="prose-wide">${group.intro[language]}</p>
      <div class="demo-grid">
        ${group.demos.map(demo => {
          const played = encodeURIComponent(demo.playSrc ?? demo.editSrc ?? demo.src)
          return `<figure class="demo-card" id="${demo.id}" data-src="${demo.src}">
          <div class="demo-mount"><p class="loading">${loading}</p></div>
          <figcaption>
            <h3 id="${demo.id}-title"><a href="${playerPath}?file=${played}">${demo.title[language]}</a></h3>
            <p>${demo.blurb[language]}</p>
          </figcaption>
        </figure>`
        }).join("\n        ")}
      </div>
    </section>`).join("\n")

    const count = this.groups.reduce((total, group) => total + group.demos.length, 0)
    const back = { en: "What it can do", fr: "Ce qu'il sait faire", es: "Lo que sabe hacer", it: "Cosa sa fare" }
    return `
<section class="band hero">
  <div class="wrap">
    <p class="eyebrow"><a class="crumb" href="/demos/">← ${back[language]}</a></p>
    <h1>${this.section.title[language]}</h1>
    <p class="lede">${this.section.blurb[language]} ${({
      en: `${count} reconstructions, none of them a video: each is computed while you watch it.`,
      fr: `${count} reconstitutions, aucune n'est une vidéo : chacune est calculée pendant que vous la regardez.`,
      es: `${count} reconstrucciones, ninguna es un vídeo: cada una se calcula mientras la miras.`,
      it: `${count} ricostruzioni, nessuna è un video: ognuna viene calcolata mentre la guardi.`
    })[language]}</p>
  </div>
</section>

<section class="band">
  <div class="wrap">
${groups}
  </div>
</section>
`
  }
}
