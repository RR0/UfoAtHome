import { describe, expect, it, afterEach, beforeAll, beforeEach, vi } from "vitest"
import { registerEyewitness, EYEWITNESS_ELEMENT_NAME } from "../../src/component/EyewitnessElement.js"
import type { EyewitnessElement } from "../../src/component/EyewitnessElement.js"

registerEyewitness()

// EyewitnessElement nests a <rr0-scene> (see its own class doc comment), so mounting it also
// constructs a SceneRenderer — which jsdom's <canvas> can't back with a real WebGL context (no
// native `canvas` package here, same reason as the 2D mock below). Stubbed out entirely, same as
// test/component/UfoRecorderElement.test.ts's identical mock.
vi.mock("../../src/render3d/SceneRenderer.js", () => ({
  SceneRenderer: class {
    resize(): void {}
    setObserverPose(): void {}
    setTerrainOrigin(): void {}
    get currentTerrainAttribution(): undefined {
      return undefined
    }
    setAstronomy(): void {}
    setShowCompass(): void {}
    setCompassHovered(): void {}
    setCompassForced(): void {}
    setWeather(): void {}
    pickBodyAt(): undefined {
      return undefined
    }
    render(): void {}
    dispose(): void {}
    startTwinkle(): void {}
    stopTwinkle(): void {}
  }
}))

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
  // The nested <rr0-scene> lazily fetches the star catalog on connect — a safe default so that
  // fire-and-forget fetch resolves instead of rejecting whenever a test's own stubFetch() (below)
  // isn't active yet/covers other URLs. Plain assignment, not vi.stubGlobal, so per-test
  // vi.stubGlobal("fetch", ...) calls (via stubFetch) restore back to *this* on their own
  // afterEach's vi.unstubAllGlobals(), same reasoning as UfoRecorderElement.test.ts's identical stub.
  globalThis.fetch = vi.fn().mockResolvedValue({ arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)) }) as typeof fetch
  // jsdom has no ResizeObserver — SceneElement.connectedCallback() (also nested now) uses one to
  // track its canvas size.
  globalThis.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  } as unknown as typeof ResizeObserver
})

function mount(): EyewitnessElement {
  const element = document.createElement(EYEWITNESS_ELEMENT_NAME) as EyewitnessElement
  document.body.appendChild(element)
  return element
}

/** The nested <rr0-ufo> lives inside the element's own nested <rr0-scene> (see EyewitnessElement's
 * class doc comment) — SceneElement exposes it via its own public `ufoElement` field, no need to
 * query the shadow DOM a second level down. */
function nestedScene(element: EyewitnessElement): { ufoElement: { canvasElement: unknown }; sightingData: unknown } {
  return element.shadowRoot!.querySelector("rr0-scene") as unknown as {
    ufoElement: { canvasElement: unknown }
    sightingData: unknown
  }
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
  // arrayBuffer() too, not just json() — the nested <rr0-scene>'s own star-catalog fetch (an
  // unrelated URL not present in bySrc) calls response.arrayBuffer(), not .json(); a real fetch
  // handled via this same mock still needs a well-formed response to resolve instead of throwing.
  const fetchMock = vi.fn().mockImplementation((url: string) =>
    Promise.resolve({
      json: () => Promise.resolve(bySrc[url]),
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0))
    })
  )
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

describe("EyewitnessElement", () => {
  beforeEach(() => {
    // Default stub so tests that don't care about the resulting fetch (just about the
    // element's own DOM state) don't leave an unhandled rejection from a real jsdom fetch
    // to a relative URL with no document base — tests that DO care override this themselves.
    stubFetch({ "john.json": johnSighting })
  })

  afterEach(() => {
    document.body.innerHTML = ""
    vi.unstubAllGlobals()
  })

  it("is ready (nests a real, upgraded rr0-scene) immediately after construction", () => {
    const element = mount()
    const scene = element.shadowRoot!.querySelector("rr0-scene")
    expect(scene).not.toBeNull()
    expect(nestedScene(element).ufoElement.canvasElement).toBeDefined()
  })

  it("hides the whole toolbar when nothing has loaded yet", () => {
    const element = mount()
    const toolbar = element.shadowRoot!.getElementById("toolbar") as HTMLElement
    expect(toolbar.hidden).toBe(true)
  })

  it("shows the toolbar with a plain-text witness name for a single witness, so the info button stays reachable", async () => {
    const element = mount()
    element.witnessUrls = ["john.json"]
    await new Promise(resolve => setTimeout(resolve, 0))

    const toolbar = element.shadowRoot!.getElementById("toolbar") as HTMLElement
    const witnessText = element.shadowRoot!.getElementById("witness-text") as HTMLElement
    const select = element.shadowRoot!.getElementById("witness") as HTMLSelectElement
    expect(toolbar.hidden).toBe(false)
    expect(witnessText.hidden).toBe(false)
    expect(witnessText.textContent).toBe("Clarence Chiles")
    expect(select.hidden).toBe(true)
  })

  it("shows the live select, not plain text, once there's more than one witness", async () => {
    stubFetch({ "chiles.json": johnSighting, "whitted.json": janeSighting })
    const element = mount()

    element.witnessUrls = ["chiles.json", "whitted.json"]
    await new Promise(resolve => setTimeout(resolve, 0))

    const toolbar = element.shadowRoot!.getElementById("toolbar") as HTMLElement
    const witnessText = element.shadowRoot!.getElementById("witness-text") as HTMLElement
    const select = element.shadowRoot!.getElementById("witness") as HTMLSelectElement
    expect(toolbar.hidden).toBe(false)
    expect(witnessText.hidden).toBe(true)
    expect(select.hidden).toBe(false)
    expect([...select.options].map(o => ({ value: o.value, label: o.textContent }))).toEqual([
      { value: "chiles.json", label: "Clarence Chiles" },
      { value: "whitted.json", label: "John Whitted" }
    ])
  })

  it("always shows the testimony sentence, even for a single witness — just the witness, no date/location duplicated from the info panel", async () => {
    const element = mount()
    element.witnessUrls = ["john.json"]
    await new Promise(resolve => setTimeout(resolve, 0))

    const testimony = element.shadowRoot!.getElementById("testimony") as HTMLElement
    expect(testimony.textContent).toContain("Testimony by")
    expect(testimony.textContent).toContain("Clarence Chiles")
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

    const scene = nestedScene(element) as unknown as { sightingData: typeof johnSighting }
    expect(scene.sightingData.witnessId).toBe("john")
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

    const scene = nestedScene(element) as unknown as { sightingData: typeof janeSighting }
    expect(scene.sightingData.witnessId).toBe("jane")
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

    const element = document.createElement(EYEWITNESS_ELEMENT_NAME) as EyewitnessElement
    element.setAttribute("src", "witnesses.json")
    document.body.appendChild(element)
    await new Promise(resolve => setTimeout(resolve, 0))
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(element.witnessUrls).toEqual(["john.json"])
  })

  it("accepts src pointing directly at a single sighting.json, with no manifest file needed", async () => {
    stubFetch({ "sighting.json": johnSighting })

    const element = document.createElement(EYEWITNESS_ELEMENT_NAME) as EyewitnessElement
    element.setAttribute("src", "sighting.json")
    document.body.appendChild(element)
    await new Promise(resolve => setTimeout(resolve, 0))
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(element.witnessUrls).toEqual(["sighting.json"])
    const scene = nestedScene(element) as unknown as { sightingData: typeof johnSighting }
    expect(scene.sightingData.witnessId).toBe("john")
    const toolbar = element.shadowRoot!.getElementById("toolbar") as HTMLElement
    const select = element.shadowRoot!.getElementById("witness") as HTMLSelectElement
    expect(toolbar.hidden).toBe(false) // info button still reachable
    expect(select.hidden).toBe(true) // nothing to pick between, plain text instead
  })

  it("opens the info panel on click, showing the app version link and the selected witness's observation metadata (date/location/case, not the witness name — already in the toolbar's testimony line)", async () => {
    stubFetch({ "john.json": { ...johnSighting, time: { year: 1948, month: 7, day: 24, hour: 2, minute: 45 }, place: [{ lat: 32.4, lng: -86.3 }] } })
    const element = mount()
    element.witnessUrls = ["john.json"]
    await new Promise(resolve => setTimeout(resolve, 0))

    const infoButton = element.shadowRoot!.getElementById("info-button") as HTMLButtonElement
    const infoPanel = element.shadowRoot!.getElementById("info-panel") as HTMLElement
    expect(infoPanel.hidden).toBe(true)

    infoButton.click()

    expect(infoPanel.hidden).toBe(false)
    const appLink = element.shadowRoot!.getElementById("info-app-link") as HTMLAnchorElement
    expect(appLink.href).toBe("https://ufoathome.org/")
    expect(appLink.textContent).toMatch(/^UFO@home v\d+\.\d+\.\d+$/)
    const observationList = element.shadowRoot!.getElementById("info-observation-list") as HTMLElement
    expect(observationList.textContent).toContain("32.4000, -86.3000")
    expect(observationList.textContent).toContain("chiles-whitted")
    expect(observationList.textContent).not.toContain("Clarence Chiles") // already in the testimony line, not repeated here

    infoButton.click()
    expect(infoPanel.hidden).toBe(true)
  })

  it("keeps the credits list collapsed until the credits link is clicked, and re-collapses when the panel closes", async () => {
    const element = mount()
    element.witnessUrls = ["john.json"]
    await new Promise(resolve => setTimeout(resolve, 0))

    const infoButton = element.shadowRoot!.getElementById("info-button") as HTMLButtonElement
    const creditsToggle = element.shadowRoot!.getElementById("info-credits-toggle") as HTMLButtonElement
    const creditsList = element.shadowRoot!.getElementById("info-credits-list") as HTMLElement
    infoButton.click()
    expect(creditsList.hidden).toBe(true)

    creditsToggle.click()
    expect(creditsList.hidden).toBe(false)

    infoButton.click() // close the panel
    infoButton.click() // reopen it
    expect(creditsList.hidden).toBe(true) // collapsed again, not left open from before
  })

  it("always lists the thunder sound credit, regardless of weather", async () => {
    const element = mount()
    element.witnessUrls = ["john.json"]
    await new Promise(resolve => setTimeout(resolve, 0))

    const infoButton = element.shadowRoot!.getElementById("info-button") as HTMLButtonElement
    infoButton.click()

    const creditsList = element.shadowRoot!.getElementById("info-credits-list") as HTMLElement
    expect(creditsList.textContent).toContain("Thunder")
  })
})

describe("EyewitnessElement i18n", () => {
  afterEach(() => {
    document.body.innerHTML = ""
    vi.unstubAllGlobals()
  })

  it("loads the French 'Témoignage de' prefix when navigator.languages prefers fr", async () => {
    const spy = vi.spyOn(navigator, "languages", "get").mockReturnValue(["fr-FR", "fr"])
    const element = mount()

    await waitFor(() => element.shadowRoot!.getElementById("testimony-prefix")!.textContent === "Témoignage de")

    spy.mockRestore()
  })

  it("falls back to the English 'Testimony by' prefix when navigator.languages has no supported match", async () => {
    const spy = vi.spyOn(navigator, "languages", "get").mockReturnValue(["de-DE", "de"])
    const element = mount()
    await new Promise(resolve => setTimeout(resolve, 20))

    expect(element.shadowRoot!.getElementById("testimony-prefix")!.textContent).toBe("Testimony by")
    spy.mockRestore()
  })
})
