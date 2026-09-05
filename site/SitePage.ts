/**
 * The site's own page model.
 *
 * A page holds BOTH languages in one module rather than one file per language: the pages here are
 * translations of each other, and keeping a sentence next to its counterpart is what stops the two
 * from drifting. Only the strings differ — the markup around them is written once, by the page's
 * own `render`.
 */

export const SITE_LANGUAGES = ["en", "fr"] as const

export type SiteLanguage = (typeof SITE_LANGUAGES)[number]

/** A value said in every supported language. */
export type Said<T> = Record<SiteLanguage, T>

export interface PageMeta {
  /** Directory name under the language root; the empty string is the language's home page. */
  readonly slug: Said<string>
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
