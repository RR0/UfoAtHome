import { DemoCatalogue } from "./DemoCatalogue.js"
import type { PageMeta, Said, SiteLanguage, SitePage } from "../SitePage.js"

/**
 * The hub of the catalogue, like the documentation's: a card for each part, and nothing live on
 * the page itself. The skies are on the sub-pages (see `DemoSectionPage`), because fifteen of them
 * on one page made a reader scroll past the ones they did not come for to reach the ones they did.
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
    }
  }

  private readonly catalogue = new DemoCatalogue()

  private static readonly WORDS: Said<{
    search: string, placeholder: string, tags: string, none: string, results: (n: number) => string, clear: string
  }> = {
    en: { search: "Search the demos", placeholder: "Text, date (1965, 1965-07) or tag", tags: "Tags",
      none: "No demo matches.", results: n => `${n} demo${n === 1 ? "" : "s"}`, clear: "Clear" },
    fr: { search: "Chercher dans les démos", placeholder: "Texte, date (1965, 1965-07) ou tag", tags: "Tags",
      none: "Aucune démo ne correspond.", results: n => `${n} démo${n > 1 ? "s" : ""}`, clear: "Effacer" },
    es: { search: "Buscar en las demos", placeholder: "Texto, fecha (1965, 1965-07) o etiqueta", tags: "Etiquetas",
      none: "Ninguna demo coincide.", results: n => `${n} demo${n === 1 ? "" : "s"}`, clear: "Borrar" },
    it: { search: "Cerca nelle demo", placeholder: "Testo, data (1965, 1965-07) o tag", tags: "Tag",
      none: "Nessuna demo corrisponde.", results: n => `${n} demo`, clear: "Cancella" }
  }

  /**
   * The search, and the redirect of old links.
   *
   * The index is fetched when the page loads, not on first use: the chips are drawn from it, and a
   * reader who has to touch the field before seeing what they could search for is not told. It is
   * one small file per language; loading it on focus instead is the optimisation if it grows.
   *
   * Filtering is text AND tags, both narrowing: every word typed must be found in the title, blurb,
   * date or tags of a demo (accents and case ignored), and a demo must carry every chosen tag. The
   * state is in the address (`?q=…&tag=…`), so a search can be sent to somebody.
   */
  script(language: SiteLanguage): string {
    const where: Record<string, string> = {}
    for (const group of this.catalogue.groups) {
      for (const demo of group.demos) where[demo.id] = `/demos/${group.section}/#${demo.id}`
    }
    const words = DemosPage.WORDS[language]
    const said = { ...words, results: undefined }
    return `// Links given out before the catalogue was split: /demos/#cussac now lives on a sub-page.
const where = ${JSON.stringify(where)}
const moved = where[decodeURIComponent(location.hash.slice(1))]
if (moved) location.replace(moved)

const said = ${JSON.stringify(said)}
const plural = ${words.results.toString()}
const form = document.getElementById("demo-search")
const input = document.getElementById("demo-q")
const tagBox = document.getElementById("demo-tags")
const resultBox = document.getElementById("demo-results")
const sections = document.getElementById("demo-sections")
const status = document.getElementById("demo-status")

const fold = text => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
const chosen = new Set()
let entries = []

const render = () => {
  const terms = fold(input.value).split(/\s+/).filter(Boolean)
  const matching = entries.filter(entry =>
    [...chosen].every(tag => entry.tags.includes(tag))
    && terms.every(term => entry.haystack.includes(term)))
  const filtering = terms.length > 0 || chosen.size > 0
  sections.hidden = filtering
  resultBox.hidden = !filtering
  status.textContent = filtering ? (matching.length ? plural(matching.length) : said.none) : ""
  resultBox.replaceChildren(...matching.map(entry => {
    const link = document.createElement("a")
    link.className = "use"
    link.href = entry.href
    const title = document.createElement("h3")
    title.textContent = entry.title
    const blurb = document.createElement("p")
    blurb.textContent = entry.blurb
    const meta = document.createElement("p")
    meta.className = "demo-meta"
    meta.textContent = [entry.date, ...entry.tags].filter(Boolean).join(" · ")
    link.append(title, blurb, meta)
    return link
  }))
  for (const chip of tagBox.querySelectorAll("button")) {
    chip.setAttribute("aria-pressed", String(chosen.has(chip.dataset.tag)))
  }
  const query = new URLSearchParams()
  if (input.value.trim()) query.set("q", input.value.trim())
  for (const tag of chosen) query.append("tag", tag)
  history.replaceState(null, "", location.pathname + (query.size ? "?" + query : ""))
}

const load = async () => {
  const response = await fetch("/demos/index.${language}.json")
  if (!response.ok) return
  entries = (await response.json()).map(entry => ({
    ...entry,
    haystack: fold([entry.title, entry.blurb, entry.date ?? "", ...entry.tags].join(" "))
  }))
  const counts = new Map()
  for (const entry of entries) for (const tag of entry.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1)
  // A tag on one demo only is found by typing it; offering all of them as chips would bury the
  // few that actually group anything.
  const offered = [...counts].filter(([, count]) => count > 1).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  tagBox.replaceChildren(...offered.map(([tag, count]) => {
    const chip = document.createElement("button")
    chip.type = "button"
    chip.className = "tag-chip"
    chip.dataset.tag = tag
    chip.append(tag + " ")
    const number = document.createElement("span")
    number.className = "tag-count"
    number.textContent = "(" + count + ")"
    chip.append(number)
    chip.addEventListener("click", () => {
      if (!chosen.delete(tag)) chosen.add(tag)
      render()
    })
    return chip
  }))
  const params = new URLSearchParams(location.search)
  input.value = params.get("q") ?? ""
  for (const tag of params.getAll("tag")) chosen.add(tag)
  render()
}

input.addEventListener("input", render)
form.addEventListener("submit", event => event.preventDefault())
form.hidden = false
void load()`
  }

  render(language: SiteLanguage): string {
    const words = DemosPage.WORDS[language]
    const count = this.catalogue.groups.reduce((total, group) => total + group.demos.length, 0)
    const open = { en: "Open", fr: "Ouvrir", es: "Abrir", it: "Apri" }
    const cards = this.catalogue.sections.map(section => {
      const demos = this.catalogue.groups.filter(group => group.section === section.id)
        .reduce((total, group) => total + group.demos.length, 0)
      return `      <a class="use" href="/demos/${section.id}/">
        <h3>${section.title[language]}</h3>
        <p>${section.blurb[language]}</p>
        <p class="use-more">${open[language]} (${demos}) →</p>
      </a>`
    }).join("\n")
    return `
<section class="band hero">
  <div class="wrap">
    <p class="eyebrow">${({ en: "Examples", fr: "Exemples", es: "Ejemplos", it: "Esempi" })[language]}</p>
    <h1>${this.meta.title[language]}.</h1>
    <p class="lede">${({
      en: `${count} reconstructions. None of them is a video: each is computed while you watch it, from `
        + "a real date, a real hour and a real place — choose where to start.",
      fr: `${count} reconstitutions. Aucune n'est une vidéo : chacune est calculée pendant que vous la `
        + "regardez, à partir d'une date, d'une heure et d'un lieu réels — choisissez par où commencer.",
      es: `${count} reconstrucciones. Ninguna es un vídeo: cada una se calcula mientras la miras, a partir `
        + "de una fecha real, una hora real y un lugar real — elige por dónde empezar.",
      it: `${count} ricostruzioni. Nessuna è un video: ognuna viene calcolata mentre la guardi, a partire `
        + "da una data reale, un'ora reale e un luogo reale — scegli da dove cominciare."
    })[language]}</p>
  </div>
</section>

<section class="band">
  <div class="wrap">
    <!-- Hidden until the script runs: without it there is nothing to search with, and the cards below are the whole page. -->
    <form id="demo-search" class="demo-search" role="search" hidden>
      <label class="visually-hidden" for="demo-q">${words.search}</label>
      <input id="demo-q" type="search" placeholder="${words.placeholder}" autocomplete="off">
      <div id="demo-tags" class="demo-tags" role="group" aria-label="${words.tags}"></div>
      <p id="demo-status" class="demo-status" aria-live="polite"></p>
    </form>
    <div id="demo-results" class="uses" hidden></div>
    <div id="demo-sections" class="uses">
${cards}
    </div>
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
      en: `Observing from an aircraft, radar propagation anomalies. What each one is waiting
         on is on <a href="/roadmap/">the roadmap</a>.`,
      fr: `L'observation depuis un avion, les anomalies de propagation radar.
         Le détail, et ce que chacun attend, est sur <a href="/roadmap/">la page des futures évolutions</a>.`,
      es: `La observación desde un avión, las anomalías de propagación del radar. Lo que
         espera cada una está en <a href="/roadmap/">la hoja de ruta</a>.`,
      it: `L'osservazione da un aereo, le anomalie di propagazione radar. Ciò che ciascuna
         aspetta è nella <a href="/roadmap/">tabella di marcia</a>.`
    })[language]}</p>
  </div>
</section>
`
  }
}
