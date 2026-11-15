import { describe, expect, it } from "vitest"
import { Headings } from "../../site/Headings.js"
import { PageOutline } from "../../site/PageOutline.js"

describe("PageOutline", () => {

  const outline = new PageOutline()
  const anchored = (html: string): string => new Headings().withAnchors(html, "Link to this section")
  const sections = (count: number): string =>
    Array.from({length: count}, (_, n) => `<h2>Part ${n + 1}</h2><p>Text ${n + 1}</p>`).join("")
  const linksIn = (html: string | undefined): string[] =>
    [...(html ?? "").matchAll(/<li class="(h[23])"><a href="#([^"]+)">([^<]*)<\/a>/g)].map(m => `${m[1]} ${m[2]} ${m[3]}`)

  it("is left out of a page with few sections", () => {
    expect(outline.render(anchored(sections(PageOutline.MIN_SECTIONS - 1)), "On this page")).toBeUndefined()
  })

  it("lists every section of a long page, sub-sections marked as such", () => {
    const html = anchored(sections(4) + "<h3>A <code>&lt;rr0-scene&gt;</code> detail</h3>")
    expect(linksIn(outline.render(html, "On this page"))).toEqual([
      "h2 part-1 Part 1", "h2 part-2 Part 2", "h2 part-3 Part 3", "h2 part-4 Part 4",
      "h3 a-rr0-scene-detail A &lt;rr0-scene&gt; detail"
    ])
  })

  it("leaves out a card's title, and never takes the text after it for a title", () => {
    const html = anchored(`<a href="/demos/"><h3>A demo card</h3><p>Its caption</p></a>` + sections(5))
    const links = linksIn(outline.render(html, "On this page"))
    expect(links).toHaveLength(5)
    expect(links[0]).toBe("h2 part-1 Part 1")
  })
})
