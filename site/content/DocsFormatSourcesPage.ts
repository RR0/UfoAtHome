import { DocsFormatSubpage } from "./DocsFormatSubpage.js"
import { DocsSourcesPage } from "./DocsSourcesPage.js"
import type { Said, SiteLanguage } from "../SitePage.js"

/**
 * Where what the scene shows comes from, and the choices made with each source: the page to check before trusting the tool. A part of the
 * observation's technical side (see DocsFormatSubpage); the sources of drafting have theirs on the page about creating an observation.
 */
export class DocsFormatSourcesPage extends DocsFormatSubpage {

  static readonly TITLE: Said<string> = { en: "Sources and choices", fr: "Sources et choix", es: "Fuentes y decisiones", it: "Fonti e scelte" }

  /** The groups of sources the scene of an observation reads. */
  private static readonly GROUPS = ["sky", "air", "satellites", "aircraft", "weather", "ground", "place-time", "decor"]

  private static readonly SOURCES = new DocsSourcesPage()

  constructor() {
    super("docs/format/sources", DocsFormatSourcesPage.TITLE, DocsFormatSourcesPage.SOURCES.lede, {
      en: "Every source the scene of an observation reads (sky, air, satellites, aircraft, weather, ground, decor), its credit, and the choices made about it.",
      fr: "Chaque source que lit la scène d'une observation (ciel, air, satellites, avions, météo, sol, décor), son crédit, et les choix faits à son sujet.",
      es: "Cada fuente que lee la escena de una observación (cielo, aire, satélites, aviones, tiempo, suelo, decorado), su crédito y las decisiones tomadas sobre ella.",
      it: "Ogni fonte che legge la scena di un'osservazione (cielo, aria, satelliti, aerei, meteo, suolo, scenario), il suo credito e le scelte fatte al riguardo."
    })
  }

  protected body(language: SiteLanguage): string {
    return DocsFormatSourcesPage.SOURCES.section(language, DocsFormatSourcesPage.GROUPS, true, true)
  }
}
