import { DocsSection } from "./DocsSection.js"
import type { PageMeta, Said, SiteLanguage } from "../SitePage.js"

/**
 * A page under the observation's (DocsFormatPage), where its technical side goes on.
 *
 * The observation's page held all of it, components and sources included: some 200 kB that a reader had nowhere to go in but down. Its bulk
 * now has pages of their own, which still belong to it: their way back is to it, not to the documentation hub, and their sections keep the ids
 * they had there, so that the observation's page can send an old link on (DocsFormatPage.MOVED).
 */
export abstract class DocsFormatSubpage extends DocsSection {

  /** The way back, to the observation's page. */
  private static readonly CRUMB = {
    href: "/docs/format/",
    label: { en: "Observations", fr: "Les observations", es: "Las observaciones", it: "Le osservazioni" } satisfies Said<string>
  }

  readonly meta: PageMeta

  protected constructor(slug: string, private readonly title: Said<string>, private readonly lede: Said<string>, description: Said<string>) {
    super()
    this.meta = { slug, navLabel: title, title, description, asideFromNav: true }
  }

  render(language: SiteLanguage): string {
    return this.hero(language, this.title, this.lede, DocsFormatSubpage.CRUMB) + this.body(language)
  }

  /** The page's sections, after its hero. */
  protected abstract body(language: SiteLanguage): string

  script(): string {
    return this.excerptsScript()
  }
}
