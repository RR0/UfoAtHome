import { DocsFormatSubpage } from "./DocsFormatSubpage.js"
import { DocsComponentsPage } from "./DocsComponentsPage.js"
import { COMPONENT_DOCS, DocsComponentPage } from "./DocsComponentPage.js"
import type { Said, SiteLanguage } from "../SitePage.js"

/**
 * The components that show or edit an observation: what they have in common, then the scene, the player and the editor of a recording, each
 * as a section. The editors of a case and of an interview have theirs on the pages about those. A part of the observation's technical side
 * (see DocsFormatSubpage).
 */
export class DocsFormatComponentsPage extends DocsFormatSubpage {

  static readonly TITLE: Said<string> = { en: "Components", fr: "Les composants", es: "Los componentes", it: "I componenti" }

  /** The tags this page documents, in the order a reader meets them: the player, the scene inside it, the editor around it. */
  private static readonly ORDER = ["rr0-sighting", "rr0-scene", "rr0-sighting-editor"]

  constructor() {
    super("docs/format/components", DocsFormatComponentsPage.TITLE, {
      en: "Three of the standard elements are about an observation: the scene it is replayed in, the player that shows it, and the editor that describes it. The editor of a case and the editor of an interview have their own sections, on the pages about those.",
      fr: "Trois des éléments standards concernent une observation : la scène où elle est rejouée, le lecteur qui la montre, et l'éditeur qui la décrit. L'éditeur de dossier et l'éditeur d'interview sont décrits sur les pages consacrées aux dossiers et aux interviews.",
      es: "Tres de los elementos estándar tratan de una observación: la escena en que se reproduce, el reproductor que la muestra y el editor que la describe. El editor de casos y el editor de entrevistas tienen sus secciones en las páginas que hablan de ellos.",
      it: "Tre degli elementi standard riguardano un'osservazione: la scena in cui viene riprodotta, il lettore che la mostra e l'editor che la descrive. L'editor di casi e l'editor di interviste hanno le loro sezioni, nelle pagine che ne parlano."
    }, {
      en: "The scene, the player and the editor of an observation, as standard Web Components: which one you want, how to load it, and everything it answers to.",
      fr: "La scène, le lecteur et l'éditeur d'une observation, en composants web standards : lequel vous faut, comment le charger, et tout ce à quoi il répond.",
      es: "La escena, el reproductor y el editor de una observación, como Web Components estándar: cuál necesitas, cómo cargarlo y todo aquello a lo que responde.",
      it: "La scena, il lettore e l'editor di un'osservazione, come Web Component standard: quale ti serve, come caricarlo e tutto ciò a cui risponde."
    })
  }

  protected body(language: SiteLanguage): string {
    const docs = DocsFormatComponentsPage.ORDER.flatMap(tag => COMPONENT_DOCS.filter(doc => doc.tag === tag))
    return `
<section class="band">
  <div class="wrap prose-wide">
    ${new DocsComponentsPage().section(language)}
    ${docs.map(doc => new DocsComponentPage(doc).section(language)).join("\n")}
  </div>
</section>
`
  }
}
