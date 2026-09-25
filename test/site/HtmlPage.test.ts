import { describe, expect, it } from "vitest"
import { HtmlPage } from "../../site/HtmlPage.js"

describe("HtmlPage", () => {

  const doc = (title: string, body: string, navLabel?: string): string => `<!doctype html>
<html>
<head>
  <title>${title}</title>
  <meta name="description" content="About &quot;${title}&quot;">
  ${navLabel ? `<meta name="nav-label" content="${navLabel}">` : ""}
</head>
<body>
${body}
</body>
</html>`

  it("reads the title, description, navigation label and body", () => {
    const page = HtmlPage.parse(doc("Future developments", "<h1>Next.</h1>", "Roadmap"), "index.html", "1.2.3")
    expect(page).toEqual({
      title: "Future developments", description: 'About "Future developments"', navLabel: "Roadmap", body: "<h1>Next.</h1>"
    })
  })

  it("falls back on the title when no navigation label is given", () => {
    expect(HtmlPage.parse(doc("Sources", "<p>x</p>"), "index.html", "1.2.3").navLabel).toBe("Sources")
  })

  it("writes the version being built where the page asks for it, rather than a typed one", () => {
    const html = doc("Roadmap", '<p>version <!--#echo var="version" --></p>')
    expect(HtmlPage.parse(html, "index.html", "1.2.3").body).toBe("<p>version 1.2.3</p>")
  })

  it("refuses a file without a description, naming it", () => {
    expect(() => HtmlPage.parse("<title>t</title><body></body>", "roadmap/index_fr.html", "1.2.3"))
      .toThrow("roadmap/index_fr.html")
  })

  it("holds each language's content under one address", () => {
    const page = HtmlPage.of("roadmap/evaluation", {
      en: { name: "index.html", html: doc("Evaluation", "<h1>Evaluation</h1>") },
      fr: { name: "index_fr.html", html: doc("Évaluation", "<h1>Évaluation</h1>") }
    }, "1.2.3", { asideFromNav: true, asideFromFooter: true })
    expect(page.meta).toMatchObject({
      slug: "roadmap/evaluation", title: { en: "Evaluation", fr: "Évaluation" }, asideFromNav: true, asideFromFooter: true
    })
    expect(page.render("fr")).toBe("<h1>Évaluation</h1>")
  })
})
