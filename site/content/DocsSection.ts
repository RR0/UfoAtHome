import type { PageMeta, Said, SiteLanguage, SitePage } from "../SitePage.js"

/**
 * One page of the documentation, under the hub at `/docs/`.
 *
 * The documentation used to be a single page, and the trouble with it was not its length but that
 * length was the only way through it: someone who had a recording and wanted a link to send had to
 * scroll past the component bundles and the whole recording format to find two sentences. These
 * are split by the QUESTION being asked rather than by subject matter, which is why "share a link"
 * and "put it on a page" are separate pages although both are two lines long — they are asked by
 * different people on different days.
 *
 * The shared parts are here: the way back to the hub, and the hero every one of them opens with.
 */
export abstract class DocsSection implements SitePage {

  abstract readonly meta: PageMeta

  abstract render(language: SiteLanguage): string

  /** The way back up. These pages are reached from the hub, and the top navigation only names the
   * hub, so without this a reader has nothing but the browser's own Back. */
  protected hero(language: SiteLanguage, title: Said<string>, lede: Said<string>): string {
    const back = language === "fr" ? "Documentation" : "Documentation"
    return `
<section class="band hero">
  <div class="wrap">
    <p class="eyebrow"><a class="crumb" href="/docs/">← ${back}</a></p>
    <h1>${title[language]}</h1>
    <p class="lede">${lede[language]}</p>
  </div>
</section>`
  }
}
