import { type PageMeta, type Said, SITE_LANGUAGES, type SiteLanguage, type SitePage } from "./SitePage.js"

/**
 * Wraps a page's own content in the site shell: head, header with its language switch, footer.
 *
 * It owns the URL scheme too, since the header, the `hreflang` alternates and the file the builder
 * writes must all agree on it: English at the root (`/editor/`), French under `/fr/` with its own
 * slugs (`/fr/editeur/`). Root-absolute URLs throughout — this is a site at a domain root, and a
 * page two directories deep should not have to know how deep it is.
 */
export class Layout {

  static readonly ORIGIN = "https://ufoathome.org"

  private readonly footer: Said<string>

  constructor(private readonly pages: readonly SitePage[], private readonly version: string) {
    this.footer = {
      en: `UFO@home v${version} — MIT licensed`,
      fr: `UFO@home v${version} — sous licence MIT`
    }
  }

  /** The site-root-relative directory a page lives in, with a trailing slash. */
  path(meta: PageMeta, language: SiteLanguage): string {
    const slug = meta.slug[language]
    const prefix = language === "en" ? "/" : "/fr/"
    return slug ? `${prefix}${slug}/` : prefix
  }

  render(page: SitePage, language: SiteLanguage): string {
    const meta = page.meta
    const self = this.path(meta, language)
    const alternates = SITE_LANGUAGES
      .map(other => `<link rel="alternate" hreflang="${other}" href="${Layout.ORIGIN}${this.path(meta, other)}">`)
      .concat(`<link rel="alternate" hreflang="x-default" href="${Layout.ORIGIN}${this.path(meta, "en")}">`)
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
${page.render(language)}
</main>
${this.siteFooter(language)}
${script ? `<script type="module">\n${script}\n</script>` : ""}
</body>
</html>
`
  }

  /**
   * No language picker, deliberately — the same rule the components follow: detect, and fall back
   * to English. The French tree is reached by detection (see the Netlify rules build.ts emits) and
   * declared to search engines through `hreflang`, which is metadata rather than a control.
   */
  private header(current: SitePage, language: SiteLanguage): string {
    const links = this.pages.filter(page => !page.meta.asideFromNav).map(page => {
      const href = this.path(page.meta, language)
      const currentAttr = page === current ? ` aria-current="page"` : ""
      return `<a href="${href}"${currentAttr}>${page.meta.navLabel[language]}</a>`
    }).join("\n    ")
    return `<header class="site-header">
  <a class="brand" href="${language === "en" ? "/" : "/fr/"}">UFO<span class="at">@</span>home</a>
  <nav class="site-nav" aria-label="${language === "fr" ? "Navigation principale" : "Main navigation"}">
    ${links}
  </nav>
</header>`
  }

  private siteFooter(language: SiteLanguage): string {
    const fr = language === "fr"
    const nav = this.pages
      .map(page => `<li><a href="${this.path(page.meta, language)}">${page.meta.navLabel[language]}</a></li>`)
      .join("\n      ")
    return `<footer class="site-footer">
  <div class="wrap">
    <div>
      <h4>UFO@home</h4>
      <p>${this.footer[language]}<br>
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
