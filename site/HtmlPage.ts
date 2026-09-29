import { type PageMeta, type Said, SITE_LANGUAGES, type SiteLanguage, type SitePage } from "./SitePage.js"

/** How a page read from HTML files sits in the site's navigation. */
export interface HtmlPagePlacement {
  readonly asideFromNav?: boolean
  readonly asideFromFooter?: boolean
}

/**
 * A page written as HTML files rather than as a module.
 *
 * Pages that are mostly prose — the roadmap and what hangs under it — are easier to write and to
 * review as the HTML they are, the way rr0.org's pages are: one directory per page, `index.html`
 * for the fallback language and `index_<lang>.html` for each other one, the same layout as what the
 * build writes out. A page's sub-pages are its sub-directories, published under its path.
 *
 * Each file is a complete document: its `<title>`, its `<meta name="description">` and its
 * `<meta name="nav-label">` become the page's meta, and its `<body>` becomes the content of
 * `<main>`. The version being built is written `<!--#echo var="version" -->`, never typed (see
 * SiteBuilder.checkPrintedVersions). Reading the files off disk is HtmlPageTree's job.
 */
export class HtmlPage implements SitePage {

  private static readonly VERSION = /<!--#echo var="version"\s*-->/g

  private constructor(readonly meta: PageMeta, private readonly bodies: Said<string>) {
  }

  /**
   * The page made of one file per language.
   *
   * @param files Each language's file name (for error messages) and content.
   */
  static of(slug: string, files: Said<{ name: string, html: string }>, version: string, placement: HtmlPagePlacement = {}): HtmlPage {
    const parsed = Object.fromEntries(SITE_LANGUAGES.map(language =>
      [language, HtmlPage.parse(files[language].html, files[language].name, version)])) as Record<SiteLanguage, ReturnType<typeof HtmlPage.parse>>
    const said = (key: "title" | "description" | "navLabel" | "body"): Said<string> =>
      Object.fromEntries(SITE_LANGUAGES.map(language => [language, parsed[language][key]])) as Said<string>
    const meta: PageMeta = {
      slug, title: said("title"), description: said("description"), navLabel: said("navLabel"), ...placement
    }
    return new HtmlPage(meta, said("body"))
  }

  /** Reads one language's file. Throws on a missing part, naming the file: a page without a title
   * or a description would be published without one. */
  static parse(html: string, file: string, version: string): { title: string, description: string, navLabel: string, body: string } {
    const title = /<title>([\s\S]*?)<\/title>/.exec(html)?.[1]
    const description = HtmlPage.metaContent(html, "description")
    const body = /<body[^>]*>([\s\S]*)<\/body>/.exec(html)?.[1]
    if (title === undefined || description === undefined || body === undefined) {
      throw new Error(`${file} needs a <title>, a <meta name="description"> and a <body>.`)
    }
    return {
      title: HtmlPage.decode(title.trim()),
      description: HtmlPage.decode(description),
      navLabel: HtmlPage.decode(HtmlPage.metaContent(html, "nav-label") ?? title.trim()),
      body: body.replace(HtmlPage.VERSION, version).trim()
    }
  }

  private static metaContent(html: string, name: string): string | undefined {
    const tag = new RegExp(`<meta\\s+name="${name}"\\s+content="([^"]*)"\\s*/?>`).exec(html)
    return tag?.[1]
  }

  /** The Layout escapes titles and descriptions itself, so they are handed over as plain text. */
  private static decode(text: string): string {
    return text.replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
  }

  render(language: SiteLanguage): string {
    return this.bodies[language]
  }
}
