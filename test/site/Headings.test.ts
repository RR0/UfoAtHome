import { describe, expect, it } from "vitest"
import { Headings } from "../../site/Headings.js"

describe("Headings", () => {

  const headings = new Headings()
  const anchored = (html: string): string => headings.withAnchors(html, "Link to this section")
  const idsIn = (html: string): string[] =>
    [...anchored(html).matchAll(/<h[23][^>]* id="([^"]+)"/g)].map(match => match[1]!)

  it("derives an id from the heading's own words", () => {
    expect(idsIn("<h2>Which one you want</h2>")).toEqual(["which-one-you-want"])
  })

  it("strips accents rather than percent-encoding them into noise", () => {
    expect(idsIn("<h3>Créer une observation</h3>")).toEqual(["creer-une-observation"])
  })

  it("reads through the markup a heading contains, entities and all", () => {
    // Real headings on this site look like this one.
    expect(idsIn("<h2><code>&lt;rr0-ufo&gt;</code> — the object</h2>")).toEqual(["rr0-ufo-the-object"])
  })

  it("leaves a hand-written id alone, because something may already link to it", () => {
    const html = '<h2 id="manual">Three gestures to a first recording</h2>'
    expect(anchored(html)).toBe(html)
  })

  it("keeps two headings that say the same thing apart", () => {
    expect(idsIn("<h2>Sound</h2><h3>Sound</h3><h3>Sound</h3>")).toEqual(["sound", "sound-2", "sound-3"])
  })

  it("adds an anchor a reader can click, inside the heading", () => {
    const html = anchored("<h2>Events</h2>")
    expect(html).toContain('<a class="heading-anchor" href="#events"')
    expect(html).toContain('aria-label="Link to this section"')
    // Inside, so it moves with the heading and is never orphaned by a reflow.
    expect(html.indexOf("heading-anchor")).toBeLessThan(html.indexOf("</h2>"))
  })

  it("leaves h1 and h4 alone: a page has one title, and h4 is below the level worth linking", () => {
    const html = "<h1>Documentation</h1><h4>UFO@home</h4>"
    expect(anchored(html)).toBe(html)
  })

  it("gives up rather than emit an empty id for a heading with no words in it", () => {
    const html = '<h2><img src="x.png"></h2>'
    expect(anchored(html)).toBe(html)
  })
  // How the documentation hub's three cards came apart: each was one <a> around a heading, a
  // description and a "Read →", and putting a second <a> inside the heading made the parser close
  // the outer one there — leaving two thirds of every card outside the link it was meant to be.
  describe("a heading inside a link", () => {
    const card = '<a class="use" href="/docs/create/"><h3>Create an observation</h3><p>Blurb.</p></a>'

    it("gets no anchor of its own", () => {
      expect(new Headings().withAnchors(card, "Link")).not.toContain("heading-anchor")
    })

    it("keeps its id, which costs nothing and stays linkable", () => {
      expect(new Headings().withAnchors(card, "Link")).toContain('id="create-an-observation"')
    })

    it("does not make the headings after it lose theirs", () => {
      const html = `${card}<h2>What a recording needs</h2>`
      const out = new Headings().withAnchors(html, "Link")
      expect(out).toContain('href="#what-a-recording-needs"')
      expect(out.match(/heading-anchor/g)).toHaveLength(1)
    })

    it("is told from a heading that merely follows one", () => {
      const out = new Headings().withAnchors('<a href="/docs/">Docs</a><h2>After the link</h2>', "Link")
      expect(out).toContain('href="#after-the-link"')
    })
  })
})
