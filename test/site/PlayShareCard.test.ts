import { afterEach, describe, expect, it, vi } from "vitest"
import { PlayShareCard } from "../../netlify/edge-functions/play-share-card.js"
import { ShareCard } from "../../site/ShareCard.js"

const PAGE = `<!doctype html><html><head>
  <title>Play any reconstruction — UFO@home</title>
  <meta name="description" content="General description.">
  <link rel="canonical" href="https://ufoathome.org/play/">
  <meta property="og:title" content="Play any reconstruction — UFO@home">
  <meta property="og:description" content="General description.">
  <meta property="og:url" content="https://ufoathome.org/play/">
  ${ShareCard.META}
</head><body></body></html>`

const reply = (body: unknown, type = "application/json") =>
  new Response(typeof body === "string" ? body : JSON.stringify(body), { headers: { "content-type": type } })

const page = () => reply(PAGE, "text/html; charset=utf-8")

describe("PlayShareCard", () => {
  afterEach(() => vi.unstubAllGlobals())

  it("resolves a bare name where the Player looks for it, and a path from the site", () => {
    expect(PlayShareCard.candidates("Cussac", "https://ufoathome.org").slice(0, 2))
      .toEqual(["https://ufoathome.org/demo-data/observer-cussac.json", "https://ufoathome.org/demo-data/sky-test-cussac.json"])
    expect(PlayShareCard.candidates("/demo-data/case-cussac.json", "https://ufoathome.org"))
      .toEqual(["https://ufoathome.org/demo-data/case-cussac.json"])
    expect(PlayShareCard.candidates("javascript:alert(1)//x", "https://ufoathome.org")).toEqual([])
  })

  it("makes the card of an account from its observer, its first paragraph and its picture", () => {
    const card = PlayShareCard.cardOf({
      observer: { firstNames: ["Lonnie"], lastName: "Zamora" },
      description: { en: "A police officer saw it.\n\nSecond paragraph.", fr: "Un policier l'a vu." },
      image: "photos/zamora.jpg"
    }, "https://ufoathome.org/demo-data/observer-zamora.json", "fr")
    expect(card).toEqual({
      title: "Lonnie Zamora",
      description: "Un policier l'a vu.",
      image: "https://ufoathome.org/demo-data/photos/zamora.jpg"
    })
  })

  it("names a case by its title and takes an RR0 image path from the root of its site", () => {
    const card = PlayShareCard.cardOf({ title: "Socorro", events: [], image: "/ufo/Socorro/portrait.jpg" },
      "https://rr0.org/ufo/Socorro/case.json", "en")
    expect(card).toMatchObject({ title: "Socorro", image: "https://rr0.org/ufo/Socorro/portrait.jpg" })
  })

  it("refuses a picture that is not a web address, and cuts a long description at a word", () => {
    const card = PlayShareCard.cardOf({ id: "x", description: "word ".repeat(100), image: "javascript:alert(1)" }, "https://a.org/x.json", "en")
    expect(card.image).toBeUndefined()
    expect(card.description!.length).toBeLessThanOrEqual(PlayShareCard.MAX_DESCRIPTION + 1)
    expect(card.description!.endsWith("word…")).toBe(true)
  })

  it("rewrites the card, escaping what the file says, and gives the link its own address", () => {
    const html = PlayShareCard.apply(PAGE, { title: 'A "quoted" <b>', description: "Said.", image: "https://x.org/a.jpg" },
      "https://ufoathome.org/play/?file=a")
    expect(html).toContain('<meta property="og:title" content="A &quot;quoted&quot; &lt;b&gt; — UFO@home">')
    expect(html).toContain('<meta property="og:image" content="https://x.org/a.jpg">')
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image">')
    expect(html).toContain('<meta property="og:url" content="https://ufoathome.org/play/?file=a">')
    expect(html).toContain('<link rel="canonical" href="https://ufoathome.org/play/?file=a">')
    expect(html).not.toContain("og:image:width")
    expect(html).not.toContain("logo.png")
  })

  it("keeps the logo, and its size, when the recording has no picture", () => {
    const html = PlayShareCard.apply(PAGE, { title: "Cussac" }, "https://ufoathome.org/play/?file=cussac")
    expect(html).toContain("https://ufoathome.org/logo.png")
    expect(html).toContain('property="og:image:width" content="512"')
    expect(html).toContain('<meta name="twitter:card" content="summary">')
  })

  it("serves the page rewritten for a link to an observation", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => reply({ id: "x", observer: { title: "Cussac" }, timeline: {}, image: "c.jpg" })))
    const result = await PlayShareCard.handle(new Request("https://ufoathome.org/play/?file=/demo-data/x.json"), { next: async () => page() })
    const html = await result.text()
    expect(html).toContain('content="Cussac — UFO@home"')
    expect(html).toContain('<meta property="og:image" content="https://ufoathome.org/demo-data/c.jpg">')
  })

  it("serves the page untouched when there is nothing to read", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 404 })))
    const untouched = async (url: string) => (await PlayShareCard.handle(new Request(url), { next: async () => page() })).text()
    expect(await untouched("https://ufoathome.org/play/")).toBe(PAGE)
    expect(await untouched("https://ufoathome.org/play/?file=/missing.json")).toBe(PAGE)
  })

  it("serves the page untouched when the file is not JSON, or the request is not a page", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => reply("<html>", "text/html")))
    expect(await (await PlayShareCard.handle(new Request("https://ufoathome.org/play/?file=/a.json"), { next: async () => page() })).text()).toBe(PAGE)
    const css = await PlayShareCard.handle(new Request("https://ufoathome.org/play/?file=/a.json"), { next: async () => reply("a{}", "text/css") })
    expect(await css.text()).toBe("a{}")
  })
})
