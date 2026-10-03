import { describe, expect, it } from "vitest"
import { DemoCatalogue } from "../../site/content/DemoCatalogue.js"
import { DemoSectionPage } from "../../site/content/DemoSectionPage.js"
import { DemosPage } from "../../site/content/DemosPage.js"
import { Headings } from "../../site/Headings.js"

describe("DemoSectionPage", () => {
  const catalogue = new DemoCatalogue()
  const html = catalogue.sections.map(section => new DemoSectionPage(section, catalogue).render("fr")).join("\n")

  it("gives each card's title an id, so that the site adds no anchor link beside it", () => {
    const titles = [...html.matchAll(/<h3\b([^>]*)>/g)]
    expect(titles.length).toBeGreaterThan(10)
    expect(titles.every(([, attributes]) => /\bid="[^"]+-title"/.test(attributes))).toBe(true)
  })

  it("leaves no heading anchor in a card once the site has laid its anchors", () => {
    const anchored = new Headings().withAnchors(html, "Link to this section")
    const cards = [...anchored.matchAll(/<figure class="demo-card"[\s\S]*?<\/figure>/g)].map(match => match[0])
    expect(cards.length).toBeGreaterThan(10)
    expect(cards.some(card => card.includes("heading-anchor"))).toBe(false)
    // The page's own sections keep theirs.
    expect(anchored).toContain("heading-anchor")
  })

  it("keeps the card itself addressable by the demo's own id", () => {
    expect(html).toContain('<figure class="demo-card" id="air-traffic"')
    expect(html).toContain('<figure class="demo-card" id="aircraft"')
  })

  it("puts every demo of the catalogue on exactly one sub-page", () => {
    const count = catalogue.groups.reduce((total, group) => total + group.demos.length, 0)
    expect([...html.matchAll(/<figure class="demo-card"/g)]).toHaveLength(count)
  })
})

describe("DemosPage", () => {
  const page = new DemosPage()
  const html = page.render("fr")

  it("links to each sub-page and mounts no scene itself", () => {
    for (const section of new DemoCatalogue().sections) expect(html).toContain(`href="/demos/${section.id}/"`)
    expect(html).not.toContain("demo-card")
    expect(page.meta.modules).toBeUndefined()
  })

  it("sends a link to a card's old address to the sub-page that holds it", () => {
    expect(page.script("fr")).toContain('"cussac":"/demos/sightings/#cussac"')
  })
})
