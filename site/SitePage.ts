/**
 * The site's own page model.
 *
 * A page holds BOTH languages in one module rather than one file per language: the pages here are
 * translations of each other, and keeping a sentence next to its counterpart is what stops the two
 * from drifting. Only the strings differ — the markup around them is written once, by the page's
 * own `render`.
 */

export const SITE_LANGUAGES = ["en", "fr"] as const

/** The one every other language falls back to, and the one served at a page's canonical URL. */
export const FALLBACK_LANGUAGE = "en"

export type SiteLanguage = (typeof SITE_LANGUAGES)[number]

/** A value said in every supported language. */
export type Said<T> = Record<SiteLanguage, T>

export interface PageMeta {
  /**
   * Directory name under the site root; the empty string is the home page.
   *
   * ONE slug, not one per language. A page has a single address that everybody can be given —
   * `ufoathome.org/editor/` is the editor for a French reader as much as for an English one — and
   * which language they get is decided when they arrive, not by which link they were handed.
   */
  readonly slug: string
  readonly navLabel: Said<string>
  /** `<title>`, without the site name — the layout appends it. */
  readonly title: Said<string>
  readonly description: Said<string>
  /** Module URLs this page needs, root-absolute (e.g. `/lib/rr0-scene.mjs`). */
  readonly modules?: readonly string[]
  /** Kept out of the top navigation — reached from the pages that have a reason to link to it, and
   * from the footer. For something worth publishing but not worth a permanent tab. */
  readonly asideFromNav?: boolean
}

export interface SitePage {
  readonly meta: PageMeta
  /** The page's `<main>` content, already localized. */
  render(language: SiteLanguage): string
  /** Page-specific script, appended as a module at the end of `<body>`. */
  script?(language: SiteLanguage): string
}
