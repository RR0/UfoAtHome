import { describe, expect, it, afterEach, beforeAll, beforeEach, vi } from "vitest"
import { registerWitnessSelector, WITNESS_SELECTOR_ELEMENT_NAME } from "../../src/component/WitnessSelectorElement.js"
import type { WitnessSelectorElement } from "../../src/component/WitnessSelectorElement.js"

registerWitnessSelector()

// jsdom's <canvas> has no real 2D context — stub it, same as test/component/UfoElement.test.ts's mock (the
// nested <rr0-ufo> needs this to paint its initial frame without throwing).
beforeAll(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    ellipse: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    clearRect: vi.fn(),
    strokeRect: vi.fn(),
    stroke: vi.fn(),
    fillRect: vi.fn()
  } as unknown as CanvasRenderingContext2D)
})

function mount(): WitnessSelectorElement {
  const element = document.createElement(WITNESS_SELECTOR_ELEMENT_NAME) as WitnessSelectorElement
  document.body.appendChild(element)
  return element
}

async function waitFor(check: () => boolean, timeoutMs = 500): Promise<void> {
  const start = Date.now()
  while (!check()) {
    if (Date.now() - start > timeoutMs) throw new Error("waitFor timed out")
    await new Promise(resolve => setTimeout(resolve, 5))
  }
}

const johnSighting = {
  version: 1 as const,
  witnessId: "john",
  witnessName: "Clarence Chiles",
  caseId: "chiles-whitted",
  timeline: { keyframes: [{ t: 0, shapes: [] }] }
}
const janeSighting = {
  version: 1 as const,
  witnessId: "jane",
  witnessName: "John Whitted",
  caseId: "chiles-whitted",
  timeline: { keyframes: [{ t: 100, shapes: [] }] }
}

function stubFetch(bySrc: Record<string, unknown>): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn().mockImplementation((url: string) => Promise.resolve({ json: () => Promise.resolve(bySrc[url]) }))
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

describe("WitnessSelectorElement", () => {
  beforeEach(() => {
    // Default stub so tests that don't care about the resulting fetch (just about the
    // selector's own DOM state) don't leave an unhandled rejection from a real jsdom fetch
    // to a relative URL with no document base — tests that DO care override this themselves.
    stubFetch({ "john.json": johnSighting })
  })

  afterEach(() => {
    document.body.innerHTML = ""
    vi.unstubAllGlobals()
  })

  it("is ready (nests a real, upgraded rr0-ufo) immediately after construction", () => {
    const element = mount()
    const ufo = element.shadowRoot!.querySelector("rr0-ufo")
    expect(ufo).not.toBeNull()
    expect((ufo as unknown as { canvasElement: unknown }).canvasElement).toBeDefined()
  })

  it("hides the selector when there are 0 or 1 witnesses", async () => {
    const element = mount()
    const selector = element.shadowRoot!.getElementById("witness-selector") as HTMLElement
    expect(selector.hidden).toBe(true)

    element.witnessUrls = ["john.json"]
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(selector.hidden).toBe(true)
  })

  it("fetches every witness's own sighting.json and labels the selector from witnessName, not an external manifest", async () => {
    stubFetch({ "chiles.json": johnSighting, "whitted.json": janeSighting })
    const element = mount()

    element.witnessUrls = ["chiles.json", "whitted.json"]
    await new Promise(resolve => setTimeout(resolve, 0))

    const selector = element.shadowRoot!.getElementById("witness-selector") as HTMLElement
    const select = element.shadowRoot!.getElementById("witness") as HTMLSelectElement
    expect(selector.hidden).toBe(false)
    expect([...select.options].map(o => ({ value: o.value, label: o.textContent }))).toEqual([
      { value: "chiles.json", label: "Clarence Chiles" },
      { value: "whitted.json", label: "John Whitted" }
    ])
  })

  it("falls back to witnessId, then the URL itself, when witnessName is missing", async () => {
    const anonymousById = { version: 1 as const, witnessId: "w2", timeline: { keyframes: [] } }
    const anonymousNoId = { version: 1 as const, timeline: { keyframes: [] } }
    stubFetch({ "a.json": johnSighting, "b.json": anonymousById, "c.json": anonymousNoId })
    const element = mount()

    element.witnessUrls = ["a.json", "b.json", "c.json"]
    await new Promise(resolve => setTimeout(resolve, 0))

    const select = element.shadowRoot!.getElementById("witness") as HTMLSelectElement
    expect([...select.options].map(o => o.textContent)).toEqual(["Clarence Chiles", "w2", "c.json"])
  })

  it("loads the first witness's sighting automatically once the list is set", async () => {
    stubFetch({ "john.json": johnSighting, "jane.json": janeSighting })
    const element = mount()

    element.witnessUrls = ["john.json", "jane.json"]
    await new Promise(resolve => setTimeout(resolve, 0))

    const ufo = element.shadowRoot!.querySelector("rr0-ufo") as unknown as { sightingData: typeof johnSighting }
    expect(ufo.sightingData.witnessId).toBe("john")
  })

  it("switching the select loads the chosen witness's already-fetched sighting, without re-fetching", async () => {
    const fetchMock = stubFetch({ "john.json": johnSighting, "jane.json": janeSighting })
    const element = mount()
    element.witnessUrls = ["john.json", "jane.json"]
    await new Promise(resolve => setTimeout(resolve, 0))
    const callsAfterLoad = fetchMock.mock.calls.length

    const select = element.shadowRoot!.getElementById("witness") as HTMLSelectElement
    select.value = "jane.json"
    select.dispatchEvent(new Event("change"))

    const ufo = element.shadowRoot!.querySelector("rr0-ufo") as unknown as { sightingData: typeof janeSighting }
    expect(ufo.sightingData.witnessId).toBe("jane")
    expect(fetchMock.mock.calls.length).toBe(callsAfterLoad) // no new fetch on selection
  })

  it("preserves the current selection when the witness list is refreshed, instead of resetting to the first", async () => {
    stubFetch({ "john.json": johnSighting, "jane.json": janeSighting })
    const element = mount()
    element.witnessUrls = ["john.json", "jane.json"]
    await new Promise(resolve => setTimeout(resolve, 0))
    const select = element.shadowRoot!.getElementById("witness") as HTMLSelectElement
    select.value = "jane.json"
    select.dispatchEvent(new Event("change"))

    // Same two witnesses, re-set (e.g. a manifest refresh) — "jane.json" should stay selected.
    element.witnessUrls = ["john.json", "jane.json"]
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(select.value).toBe("jane.json")
  })

  it("warns (without blocking) when listed witnesses declare different case ids", async () => {
    const otherCase = { ...janeSighting, caseId: "some-other-case" }
    stubFetch({ "john.json": johnSighting, "jane.json": otherCase })
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    const element = mount()

    element.witnessUrls = ["john.json", "jane.json"]
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("chiles-whitted"))
    const select = element.shadowRoot!.getElementById("witness") as HTMLSelectElement
    expect(select.options.length).toBe(2) // still shown, just warned about
    warnSpy.mockRestore()
  })

  it("fetches the witness manifest (a plain array of URLs) from the src attribute on connect", async () => {
    const manifest = ["john.json"]
    stubFetch({ "witnesses.json": manifest, "john.json": johnSighting })

    const element = document.createElement(WITNESS_SELECTOR_ELEMENT_NAME) as WitnessSelectorElement
    element.setAttribute("src", "witnesses.json")
    document.body.appendChild(element)
    await new Promise(resolve => setTimeout(resolve, 0))
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(element.witnessUrls).toEqual(["john.json"])
  })
})

describe("WitnessSelectorElement i18n", () => {
  afterEach(() => {
    document.body.innerHTML = ""
    vi.unstubAllGlobals()
  })

  it("loads the French 'Témoin' label when navigator.languages prefers fr", async () => {
    const spy = vi.spyOn(navigator, "languages", "get").mockReturnValue(["fr-FR", "fr"])
    const element = mount()

    await waitFor(() => element.shadowRoot!.getElementById("label-witness")!.textContent === "Témoin")

    spy.mockRestore()
  })

  it("falls back to the English 'Witness' label when navigator.languages has no supported match", async () => {
    const spy = vi.spyOn(navigator, "languages", "get").mockReturnValue(["de-DE", "de"])
    const element = mount()
    await new Promise(resolve => setTimeout(resolve, 20))

    expect(element.shadowRoot!.getElementById("label-witness")!.textContent).toBe("Witness")
    spy.mockRestore()
  })
})
