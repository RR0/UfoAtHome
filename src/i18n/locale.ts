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
 * The page's own declared language comes first. A document that says `<html lang="en">` has
 * already stated what language its reader is reading it in — and a bilingual site that serves the
 * same article at two URLs has stated it per URL, which `navigator.languages` cannot know. Reading
 * the nearest ancestor rather than only the root also lets one section of a page be marked in
 * another language and carry its widgets with it.
 *
 * The browser's own list follows, and remains the whole answer for a page that declares nothing —
 * which is what every consumer of this got before, so no page loses a translation by this.
 */
export class HostLocale {

  static preferencesFor(element: Element): readonly string[] {
    const browser = navigator.languages ?? []
    const declared = element.closest("[lang]")?.getAttribute("lang")?.trim()
    return declared ? [declared, ...browser] : browser
  }
}
