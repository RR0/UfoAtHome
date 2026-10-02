import type { SiteLanguage } from "../SitePage.js"
import { DemoCatalogue } from "./DemoCatalogue.js"

/**
 * What a page of this site calls the observation it is showing: the same name in the Player and in the editor.
 *
 * The page script that does it is written out here once, for both pages to carry, and the demos' own names are given to it by language.
 */
export class RecordingTitle {
  private static readonly catalogue = new DemoCatalogue()

  /**
   * The names this site gives its own demos, by the address of their file, as they read inside a sentence: a title that is not a name loses
   * the capital it only had for starting a card (see Demo.titleIsName). Also under the case the Player is handed (see Demo.playSrc), so
   * a case opened with all its observers is called by this site's name for it. A case id like `sky-test-halos` does not name itself.
   */
  static demoTitles(language: SiteLanguage): Record<string, string> {
    return Object.fromEntries(
      RecordingTitle.catalogue.demos.flatMap(demo => {
        const title = demo.title[language]
        const said = demo.titleIsName ? title : title.charAt(0).toLocaleLowerCase(language) + title.slice(1)
        return [demo.src, ...(demo.playSrc ? [demo.playSrc] : [])].map(src => [src, said])
      }))
  }

  /**
   * The page script's `titleOf(sighting, source)`, which needs a `demoTitles` in scope.
   *
   * A case by its title, because that is the name a case is filed and argued under; a recording by its observer's name, since an account is
   * known by who gave it (it does not name its case); then its own id, and the file's own name last, which at least distinguishes one
   * recording from another. A recording that says none of these has no name, and the page keeps its general title, which is then the accurate one.
   */
  static readonly SCRIPT = `const titleOf = (sighting, source) => {
  const known = source && demoTitles[new URL(source, location.href).pathname]
  if (known) return known
  // A case (a case.json with its events, and no timeline of its own) is named by its title.
  if (sighting && Array.isArray(sighting.events) && !sighting.timeline) return sighting.title || sighting.id || undefined
  const observer = sighting && sighting.observer
  const fullName = observer && [...(observer.firstNames || []), observer.lastName].filter(Boolean).join(" ")
  return (observer && (observer.title || fullName || observer.id))
    || (sighting && sighting.id)
    || (source && decodeURIComponent(source.split("/").pop() || "").replace(/\\.json$/, ""))
    || undefined
}`
}
