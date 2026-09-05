import { Headings } from "./Headings.js"
import {
  FALLBACK_LANGUAGE, type PageMeta, SITE_LANGUAGES, type SiteLanguage, type SitePage
} from "./SitePage.js"

/**
 * Wraps a page's own content in the site shell: head, header, footer.
 *
 * It owns the URL scheme, and the scheme has one rule: **a page's address does not depend on the
 * language it is read in.** `ufoathome.org/editor/` is the editor for everybody, and which
 * translation is served is decided on arrival. So there is one directory per page, holding
 * `index.html` (English, the fallback) beside `index_fr.html` — the sibling-file convention rr0.org
 * and cosmochrony.org already use — and every link on this site, in either language, points at the
 * directory.
 */
export class Layout {

  static readonly ORIGIN = "https://ufoathome.org"

  private readonly headings = new Headings()

  constructor(private readonly pages: readonly SitePage[], private readonly version: string) {
  }

  /** A page's canonical, language-independent address. This is what every link uses. */
  path(meta: PageMeta): string {
    return meta.slug ? `/${meta.slug}/` : "/"
  }

  /** Where a given language's file actually sits — the canonical path for the fallback, a
   * `_<lang>` sibling for the rest. Used for the files written, for `hreflang`, and by the
   * redirect. */
  fileUrl(meta: PageMeta, language: SiteLanguage): string {
    const path = this.path(meta)
    return language === FALLBACK_LANGUAGE ? path : `${path}index_${language}.html`
  }

  /** Where the built file goes, relative to the output root. */
  fileName(meta: PageMeta, language: SiteLanguage): string {
    const name = language === FALLBACK_LANGUAGE ? "index.html" : `index_${language}.html`
    return `${this.path(meta)}${name}`.replace(/^\//, "")
  }

  render(page: SitePage, language: SiteLanguage): string {
    const meta = page.meta
    const self = this.fileUrl(meta, language)
    const alternates = SITE_LANGUAGES
      .map(other => `<link rel="alternate" hreflang="${other}" href="${Layout.ORIGIN}${this.fileUrl(meta, other)}">`)
      .concat(`<link rel="alternate" hreflang="x-default" href="${Layout.ORIGIN}${this.path(meta)}">`)
      .join("\n  ")
    const modules = (meta.modules ?? [])
      .map(src => `<script type="module" src="${src}"></script>`)
      .join("\n  ")
    const script = page.script?.(language)
    return `<!doctype html>
<html lang="${language}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
${this.languageRedirect(meta, language)}
  <title>${meta.title[language]} — UFO@home</title>
  <meta name="description" content="${this.attribute(meta.description[language])}">
  <link rel="canonical" href="${Layout.ORIGIN}${self}">
  ${alternates}
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="UFO@home">
  <meta property="og:title" content="${this.attribute(meta.title[language])} — UFO@home">
  <meta property="og:description" content="${this.attribute(meta.description[language])}">
  <meta property="og:url" content="${Layout.ORIGIN}${self}">
  <meta property="og:locale" content="${language === "fr" ? "fr_FR" : "en_US"}">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/style.css">
  ${modules}
</head>
<body>
${this.header(page, language)}
<main>
${this.headings.withAnchors(page.render(language), language === "fr" ? "Lien vers cette section" : "Link to this section")}
</main>
${this.siteFooter(language)}
${script ? `<script type="module">\n${script}\n</script>` : ""}
</body>
</html>
`
  }

  /**
   * Sends a reader to their own language's copy of THIS page.
   *
   * Blocking, inline, and first in the head: it has to decide before anything is painted, or a
   * French reader sees the English page flash past on every single navigation. That is also why it
   * is plain ES5 in a classic script rather than a module — a module is deferred by definition, and
   * deferred is too late.
   *
   * `location.search` and `location.hash` are carried across, which is not a nicety:
   * `/player/?sighting=…` is the whole point of that page, and a redirect that dropped the query
   * would turn every shared link into an empty player for anyone whose browser is not English.
   *
   * There is no picker, here or anywhere — same rule the components follow. And no server-side
   * `Language=` rule either: one mechanism, in one place, that a reader can see the effect of.
   */
  private languageRedirect(meta: PageMeta, pageLanguage: SiteLanguage): string {
    const supported = JSON.stringify([...SITE_LANGUAGES])
    const path = this.path(meta)
    return `  <script>
    (function () {
      var supported = ${supported}, pageLanguage = ${JSON.stringify(pageLanguage)}, path = ${JSON.stringify(path)}
      var preferences = navigator.languages || [navigator.language || "${FALLBACK_LANGUAGE}"]
      var chosen = "${FALLBACK_LANGUAGE}"
      for (var i = 0; i < preferences.length; i++) {
        var base = String(preferences[i]).toLowerCase().split("-")[0]
        if (supported.indexOf(base) >= 0) { chosen = base; break }
      }
      if (chosen !== pageLanguage) {
        location.replace(path + (chosen === "${FALLBACK_LANGUAGE}" ? "" : "index_" + chosen + ".html")
          + location.search + location.hash)
      }
    })()
  </script>`
  }

  private header(current: SitePage, language: SiteLanguage): string {
    const links = this.pages.filter(page => !page.meta.asideFromNav).map(page => {
      const currentAttr = page === current ? ` aria-current="page"` : ""
      return `<a href="${this.path(page.meta)}"${currentAttr}>${page.meta.navLabel[language]}</a>`
    }).join("\n    ")
    return `<header class="site-header">
  <a class="brand" href="/">UFO<span class="at">@</span>home</a>
  <nav class="site-nav" aria-label="${language === "fr" ? "Navigation principale" : "Main navigation"}">
    ${links}
  </nav>
</header>`
  }

  private siteFooter(language: SiteLanguage): string {
    const fr = language === "fr"
    const nav = this.pages
      .map(page => `<li><a href="${this.path(page.meta)}">${page.meta.navLabel[language]}</a></li>`)
      .join("\n      ")
    return `<footer class="site-footer">
  <div class="wrap">
    <div>
      <h4>UFO@home</h4>
      <p>${fr ? `UFO@home v${this.version} — sous licence MIT` : `UFO@home v${this.version} — MIT licensed`}<br>
      ${fr
        ? `Créé et maintenu par <a href="https://rr0.org">RR0</a> — utilisable sans lui.`
        : `Created and maintained by <a href="https://rr0.org">RR0</a> — usable without it.`}</p>
    </div>
    <div>
      <h4>${fr ? "Le site" : "This site"}</h4>
      <ul>
      ${nav}
      </ul>
    </div>
    <div>
      <h4>${fr ? "Le code" : "The code"}</h4>
      <ul>
        <li><a href="https://github.com/RR0/UfoAtHome">GitHub</a></li>
        <li><a href="https://www.npmjs.com/package/@rr0/ufoathome">npm</a></li>
        <li><a href="https://github.com/RR0/UfoAtHome/issues/new">${fr ? "Proposer une amélioration" : "Request a feature"}</a></li>
        <li><a href="https://github.com/RR0/UfoAtHome/blob/main/LICENSE">${fr ? "Licence MIT" : "MIT licence"}</a></li>
      </ul>
    </div>
  </div>
</footer>`
  }

  private attribute(text: string): string {
    return text.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;")
  }
}
