/**
 * Picks the first of `preferences` (typically `navigator.languages`) whose base language tag
 * (before any `-region` suffix, e.g. "fr" from "fr-FR") is in `supported`, falling back to "en"
 * when none match — see https://javarome.medium.com/vanilla-programming-internationalization-7f07443a951a,
 * the pattern this follows across RR0's vanilla (no-framework) components.
 */
export function selectLocale(preferences: readonly string[], supported: readonly string[]): string {
  for (const tag of preferences) {
    const language = tag.toLowerCase().split("-")[0]
    if (supported.includes(language)) return language
  }
  return "en"
}

/**
 * Which languages a component placed on a given page should consider, in order.
 *
 * The page's own declared language comes first, and the reason is COHERENCE OF THE PAGE. A
 * reconstruction is not a widget standing beside an article, it is part of it — the paragraph above
 * introduces it and the one below comments on it. So a French article showing an English
 * simulation reads as a defect, never as a service, however well the reader happens to know
 * English. The page decides, because the page is what is being read.
 *
 * Which settles the case that looks like a bug and is not: rr0.org's dossiers say `lang="fr"`, so
 * an English reader gets the French account there, while the same recording on ufoathome.org gives
 * them the English one — that site having served them an `<html lang="en">` page in the first
 * place. Two sites, two coherent pages, one rule. (Do not be tempted to demote this below
 * `navigator.languages` on the grounds that `lang` describes the prose rather than the reader: it
 * does describe the prose, and the prose is precisely what the simulation has to match.)
 *
 * Reading the nearest ancestor rather than only the root lets one section of a page be marked in
 * another language and carry its widgets with it — and an embedder who wants one reconstruction to
 * speak differently from the article around it says so on the element: `<rr0-sighting lang="en">`.
 *
 * The browser's own list follows, and remains the whole answer for a page that declares nothing.
 * It is a fallback, never a restriction: a page declaring a language the recording does not have
 * still reaches its reader in one they can read (see SaidText, which falls back again rather than
 * showing nothing).
 *
 * "Nearest" reaches out of a shadow root and into the page: see declaredFor.
 */
export class HostLocale {

  static preferencesFor(element: Element): readonly string[] {
    const browser = navigator.languages ?? []
    const declared = this.declaredFor(element)
    return declared ? [declared, ...browser] : browser
  }

  /**
   * The nearest declared language, ACROSS shadow boundaries.
   *
   * `closest` stops at the shadow root it is called in, so an element inside another element's
   * shadow DOM could never see the page around it: `<rr0-ufo>`, which lives inside
   * `<rr0-sighting>`'s shadow root, read the page's own `lang` as absent and fell back to the
   * browser's list alone. Which went unnoticed for as long as the two agreed — and stopped
   * agreeing the moment a recording began carrying several languages of its own (see SaidText): on
   * a French article read by an English browser, the outer element showed the French account and
   * the milestone captions inside it showed the English one, in the same frame.
   *
   * So each root that has no `[lang]` hands the search on to its host, which is the element the
   * document actually holds.
   */
  private static declaredFor(element: Element): string | undefined {
    for (let node: Element | undefined = element; node; ) {
      const declared = node.closest("[lang]")?.getAttribute("lang")?.trim()
      if (declared) {
        return declared
      }
      const root = node.getRootNode()
      node = root instanceof ShadowRoot ? root.host : undefined
    }
    return undefined
  }
}
