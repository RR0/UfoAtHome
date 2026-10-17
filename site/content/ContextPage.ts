import type { PageMeta, Said, SiteLanguage, SitePage } from "../SitePage.js"
import { CONTEXT_SECTIONS, type ContextSection } from "./ContextSections.js"

/**
 * The long form of the home page's "Contextualise" cards.
 *
 * Named after the principle it belongs to rather than after the data it cites: "sources" was only
 * half of it — half of this page is derived rather than looked up, and none of it is here to credit
 * anybody. It is here to say what the context of an observation was.
 *
 * Those cards had grown into the detail itself — magnitudes, catalogue sizes in kilobytes, the
 * projection formula — which is the wrong place for it twice over: it buries what a first reader
 * needs (what is taken care of, and how carefully) under what only a second reader wants (the
 * number, and where it stops). So the cards state the rule, and each links to its section here.
 *
 * Every number on this page is one the tool actually applies; the point of naming them is that a
 * reconstruction's claims can be checked, so a claim that cannot be checked has no business here.
 */
export class ContextPage implements SitePage {

  readonly meta: PageMeta = {
    slug: "context",
    navLabel: { en: "Context", fr: "Contexte", es: "Contexto", it: "Contesto" },
    title: {
      en: "Check what the scene claims",
      fr: "Vérifier ce que la scène affirme",
      es: "Comprobar lo que afirma la escena",
      it: "Verificare ciò che la scena afferma"
    },
    asideFromNav: true,
    description: {
      en: "Every part of a reconstruction that is not the observer's own account: where its data "
        + "comes from, how it is computed, and the point at which it stops and says so.",
      fr: "Chaque partie d'une reconstitution qui n'est pas le compte rendu lui-même : d'où vient sa "
        + "donnée, comment elle est calculée, et le point où elle s'arrête et le dit.",
      es: "Cada parte de una reconstrucción que no es el propio relato del observador: de dónde proceden sus "
        + "datos, cómo se calcula y el punto en el que se detiene y lo dice.",
      it: "Ogni parte di una ricostruzione che non è il resoconto dell'osservatore stesso: da dove vengono i suoi "
        + "dati, come viene calcolata e il punto in cui si ferma e lo dice."
    }
  }

  render(language: SiteLanguage): string {
    const cards = CONTEXT_SECTIONS.map(section => `      <a class="use" href="/context/${section.id}/">
        <h3>${section.title[language]}</h3>
        <p>${ContextText.summary(section.body[language])}</p>
      </a>`).join("\n")
    return `
${ContextText.HERO[language]}

<section class="band">
  <div class="wrap">
    <div class="uses context-uses">
${cards}
    </div>
    ${ContextText.FOOT[language]}
  </div>
</section>
`
  }
}

/** One section of the context, as a page of its own under the hub. */
export class ContextSectionPage implements SitePage {

  readonly meta: PageMeta

  constructor(private readonly section: ContextSection) {
    this.meta = {
      slug: `context/${section.id}`,
      navLabel: section.title,
      title: section.title,
      description: {
        en: ContextText.description(section.body.en),
        fr: ContextText.description(section.body.fr),
        es: ContextText.description(section.body.es),
        it: ContextText.description(section.body.it)
      },
      asideFromNav: true,
      asideFromFooter: true
    }
  }

  render(language: SiteLanguage): string {
    const index = CONTEXT_SECTIONS.indexOf(this.section)
    const previous = CONTEXT_SECTIONS[index - 1]
    const next = CONTEXT_SECTIONS[index + 1]
    const words = ContextText.WORDS[language]
    const link = (other: ContextSection | undefined, label: string, side: string) => other
      ? `<a class="context-${side}" href="/context/${other.id}/"><small>${label}</small><br>${other.title[language]}</a>`
      : ""
    return `
<section class="band hero">
  <div class="wrap">
    <p class="eyebrow"><a class="crumb" href="/context/">← ${words.hub}</a></p>
    <h1>${this.section.title[language]}</h1>
  </div>
</section>

<section class="band">
  <div class="wrap prose-wide">
${this.section.body[language]}
    <nav class="context-pager">${link(previous, words.previous, "previous")}${link(next, words.next, "next")}</nav>
    ${ContextText.FOOT[language]}
  </div>
</section>
`
  }
}

/** The words the hub and its pages share, and the little that is derived from a section's own text. */
class ContextText {

  static readonly HERO: Said<string> = {
    en: `<section class="band hero">
  <div class="wrap">
    <p class="eyebrow"><a class="crumb" href="/">← Home</a></p>
    <h1>Check what the scene claims.</h1>
    <p class="lede">The observer supplies the phenomenon. Everything else is looked up in a named
      record or computed from physics — and where neither can answer, the tool says so instead of
      drawing something plausible. This is that, part by part, with the numbers it actually
      applies.</p>
  </div>
</section>`,
    fr: `<section class="band hero">
  <div class="wrap">
    <p class="eyebrow"><a class="crumb" href="/">← Accueil</a></p>
    <h1>Vérifier ce que la scène affirme.</h1>
    <p class="lede">L'observateur fournit le phénomène. Tout le reste est relevé dans une source nommée
      ou calculé depuis la physique — et là où ni l'un ni l'autre ne répond, l'outil le dit plutôt
      que de dessiner quelque chose de vraisemblable. Voici cela, élément par élément, avec les
      nombres qu'il applique réellement.</p>
  </div>
</section>`,
    es: `<section class="band hero">
  <div class="wrap">
    <p class="eyebrow"><a class="crumb" href="/">← Inicio</a></p>
    <h1>Comprobar lo que afirma la escena.</h1>
    <p class="lede">El observador aporta el fenómeno. Todo lo demás se consulta en un registro con
      nombre o se calcula a partir de la física — y allí donde ni lo uno ni lo otro puede responder,
      la herramienta lo dice en lugar de dibujar algo verosímil. Esto es eso, parte por parte, con
      los números que realmente aplica.</p>
  </div>
</section>`,
    it: `<section class="band hero">
  <div class="wrap">
    <p class="eyebrow"><a class="crumb" href="/">← Home</a></p>
    <h1>Verificare ciò che la scena afferma.</h1>
    <p class="lede">L'osservatore fornisce il fenomeno. Tutto il resto è ricavato da una fonte
      nominata o calcolato dalla fisica — e dove né l'una né l'altra sanno rispondere, lo strumento
      lo dice invece di disegnare qualcosa di plausibile. Eccolo, parte per parte, con i numeri che
      applica davvero.</p>
  </div>
</section>`
  }

  static readonly FOOT: Said<string> = {
    en: `<p class="small">Every source is named where its data is reported, with the attribution its
      licence requires — and can be swapped for another. The picker <em>is</em> the credit. What is
      still missing, and what each item is waiting on, is on <a href="/roadmap/">the roadmap</a>.</p>`,
    fr: `<p class="small">Chaque source est nommée là où sa donnée est rapportée, avec l'attribution
      qu'exige sa licence — et peut être remplacée par une autre. Le sélecteur <em>est</em> le
      crédit. Ce qui manque encore, et ce que chaque élément attend, est sur
      <a href="/roadmap/">la page des futures évolutions</a>.</p>`,
    es: `<p class="small">Cada fuente se nombra allí donde se presentan sus datos, con la atribución que
      exige su licencia — y puede sustituirse por otra. El selector <em>es</em> el crédito. Lo que aún
      falta, y lo que espera cada elemento, está en <a href="/roadmap/">la hoja de ruta</a>.</p>`,
    it: `<p class="small">Ogni fonte è nominata là dove i suoi dati sono riportati, con l'attribuzione che la
      sua licenza richiede — e può essere sostituita con un'altra. Il selettore <em>è</em> il credito.
      Ciò che manca ancora, e ciò che ogni elemento aspetta, è nella <a href="/roadmap/">tabella di marcia</a>.</p>`
  }

  static readonly WORDS: Said<{ hub: string, previous: string, next: string }> = {
    en: { hub: "Context", previous: "Previous", next: "Next" },
    fr: { hub: "Contexte", previous: "Précédent", next: "Suivant" },
    es: { hub: "Contexto", previous: "Anterior", next: "Siguiente" },
    it: { hub: "Contesto", previous: "Precedente", next: "Successivo" }
  }

  /** A section's first paragraph as plain text, cut after its second sentence: what its card says. */
  static summary(body: string): string {
    const text = ContextText.plain(body)
    const sentences = text.match(/[^.!?]+[.!?]+(?=\s|$)/g) ?? [text]
    return sentences.slice(0, 2).join("").trim()
  }

  static description(body: string): string {
    return ContextText.summary(body).replace(/"/g, "&quot;")
  }

  private static plain(body: string): string {
    const first = /<p>([\s\S]*?)<\/p>/.exec(body)?.[1] ?? ""
    return first.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()
  }
}
