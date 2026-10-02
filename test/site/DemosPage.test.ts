import { describe, expect, it } from "vitest"
import { DemosPage } from "../../site/content/DemosPage.js"
import { Headings } from "../../site/Headings.js"

describe("DemosPage", () => {
  const html = new DemosPage().render("fr")

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
})
