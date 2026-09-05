import { describe, expect, it, afterEach, beforeAll, beforeEach, vi } from "vitest"
import { registerSighting, SIGHTING_ELEMENT_NAME, LEGACY_ELEMENT_NAME } from "../../src/component/SightingElement.js"
import type { SightingElement } from "../../src/component/SightingElement.js"

registerSighting()

// SightingElement nests a <rr0-scene> (see its own class doc comment), so mounting it also
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
    setDecor(): void {}
    updateDecorAnchoring(): void {}
    updateDecorLitState(): void {}
    pickBodyAt(): undefined {
      return undefined
    }
    pickDecorAt(): undefined {
      return undefined
    }
    pickStarAt(): undefined {
      return undefined
    }
    isScreenPointOccluded(): boolean {
      return false
    }
    decorDistancesAt(): { behindM?: number; inFrontM?: number } {
      return {}
    }
    setInstrument(): void {}
    setLensOptics(): void {}
    setExposure(): void {}
    setMeteorShower(): void {}
    get meteorSchedule(): unknown[] {
      return []
    }
    meteorMidpoint(): undefined {
      return undefined
    }
    updateMeteors(): void {}
    render(): void {}
    dispose(): void {}
    startTwinkle(): void {}
    stopTwinkle(): void {}
    setAnimationsRunning(): void {}
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

describe("the name this element had before 0.41.0", () => {
  afterEach(() => {
    document.body.innerHTML = ""
  })

  // Pages were loading it as <rr0-eyewitness> before <rr0-sighting> existed — rr0.org's own case
  // files among them — and a rename that breaks them punishes whoever used the thing early.
  it("still upgrades, and to the same element", () => {
    const legacy = document.createElement(LEGACY_ELEMENT_NAME)
    document.body.appendChild(legacy)
    expect(legacy.shadowRoot).not.toBeNull()
    expect(customElements.get(LEGACY_ELEMENT_NAME)!.prototype)
      .toBeInstanceOf(customElements.get(SIGHTING_ELEMENT_NAME)!)
  })

  it("reads a recording the same way the new name does", () => {
    const legacy = document.createElement(LEGACY_ELEMENT_NAME) as SightingElement
    document.body.appendChild(legacy)
    expect(legacy.shadowRoot!.querySelector("rr0-scene")).not.toBeNull()
  })
})

function mount(): SightingElement {
  const element = document.createElement(SIGHTING_ELEMENT_NAME) as SightingElement
  document.body.appendChild(element)
  return element
}

/** The nested <rr0-ufo> lives inside the element's own nested <rr0-scene> (see SightingElement's
 * class doc comment) — SceneElement exposes it via its own public `ufoElement` field, no need to
 * query the shadow DOM a second level down. */
function nestedScene(element: SightingElement): { ufoElement: { canvasElement: unknown }; sightingData: unknown } {
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
  witness: { id: "john", title: "Clarence Chiles" },
  caseId: "chiles-whitted",
  timeline: { keyframes: [{ t: 0, shapes: [] }] }
}
const janeSighting = {
  version: 1 as const,
  witness: { id: "jane", title: "John Whitted" },
  caseId: "chiles-whitted",
  timeline: { keyframes: [{ t: 100, shapes: [] }] }
}

function stubFetch(bySrc: Record<string, unknown>): ReturnType<typeof vi.fn> {
  // arrayBuffer() too, not just json() — the nested <rr0-scene>'s own star-catalog fetch (an
  // unrelated URL not present in bySrc) calls response.arrayBuffer(), not .json(); a real fetch
  // handled via this same mock still needs a well-formed response to resolve instead of throwing.
  // `ok`/`status` are part of what a Response IS, and a double that omitted them stopped standing
  // in for one the moment the loader started reading them — see SightingFetch, which distinguishes
  // a server that answered "no" from one that did not answer.
  const fetchMock = vi.fn().mockImplementation((url: string) =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(bySrc[url]),
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0))
    })
  )
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

describe("SightingElement", () => {
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

  it("falls back to witness.id, and then to a place in the list — never to the URL", async () => {
    // The URL used to be the last resort, and it was a bad one: several recordings this component
    // is pointed at have no witness at all (a sky set up to show a halo is not testimony), and
    // "Testimony by /demo-data/sky-test-halos.json" read as a fault rather than as a name.
    const anonymousById = { version: 1 as const, witness: { id: "w2" }, timeline: { keyframes: [] } }
    const anonymousNoId = { version: 1 as const, timeline: { keyframes: [] } }
    stubFetch({ "a.json": johnSighting, "b.json": anonymousById, "c.json": anonymousNoId })
    const element = mount()

    element.witnessUrls = ["a.json", "b.json", "c.json"]
    await new Promise(resolve => setTimeout(resolve, 0))

    const select = element.shadowRoot!.getElementById("witness") as HTMLSelectElement
    expect([...select.options].map(o => o.textContent)).toEqual(["Clarence Chiles", "w2", "Witness 3"])
  })

  it("says nothing at all where a single recording names no witness", async () => {
    // A sky with no witness is not a testimony, so the whole "Testimony by …" line goes — the ?
    // button that carries the observation's own metadata stays either way.
    const noWitness = { version: 1 as const, caseId: "sky-test-halos", timeline: { keyframes: [] } }
    stubFetch({ "sky.json": noWitness, "john.json": johnSighting })
    const element = mount()

    element.setAttribute("src", "sky.json")
    await new Promise(resolve => setTimeout(resolve, 0))

    const testimony = element.shadowRoot!.getElementById("testimony")!
    expect(testimony.hidden).toBe(true)
    // And nothing stale left inside it for a screen reader to find.
    expect(element.shadowRoot!.getElementById("witness-text")!.textContent).toBe("")

    // A named one brings the line back.
    element.setAttribute("src", "john.json")
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(testimony.hidden).toBe(false)
    expect(element.shadowRoot!.getElementById("witness-text")!.textContent).toBe("Clarence Chiles")
  })

  it("loads the first witness's sighting automatically once the list is set", async () => {
    stubFetch({ "john.json": johnSighting, "jane.json": janeSighting })
    const element = mount()

    element.witnessUrls = ["john.json", "jane.json"]
    await new Promise(resolve => setTimeout(resolve, 0))

    const scene = nestedScene(element) as unknown as { sightingData: typeof johnSighting }
    expect(scene.sightingData.witness?.id).toBe("john")
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
    expect(scene.sightingData.witness?.id).toBe("jane")
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

    const element = document.createElement(SIGHTING_ELEMENT_NAME) as SightingElement
    element.setAttribute("src", "witnesses.json")
    document.body.appendChild(element)
    await new Promise(resolve => setTimeout(resolve, 0))
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(element.witnessUrls).toEqual(["john.json"])
  })

  it("accepts src pointing directly at a single sighting.json, with no manifest file needed", async () => {
    stubFetch({ "sighting.json": johnSighting })

    const element = document.createElement(SIGHTING_ELEMENT_NAME) as SightingElement
    element.setAttribute("src", "sighting.json")
    document.body.appendChild(element)
    await new Promise(resolve => setTimeout(resolve, 0))
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(element.witnessUrls).toEqual(["sighting.json"])
    const scene = nestedScene(element) as unknown as { sightingData: typeof johnSighting }
    expect(scene.sightingData.witness?.id).toBe("john")
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
    // The app link opens THIS observation in the editor, not the application's bare home page —
    // and it NAMES the recording rather than shortening a same-origin one to a bare path: that
    // shortening relied on ufoathome.org redirecting any unknown path into the editor, which
    // stopped being true once that domain became a site with files of its own.
    const appLink = element.shadowRoot!.getElementById("info-app-link") as HTMLAnchorElement
    expect(appLink.href).toBe(
      `https://ufoathome.org/editor/?sighting=${encodeURIComponent(new URL("john.json", location.href).href)}`)
    expect(appLink.textContent).toMatch(/^UFO@home v\d+\.\d+\.\d+$/)
    const observationList = element.shadowRoot!.getElementById("info-observation-list") as HTMLElement
    expect(observationList.textContent).toContain("32.4000, -86.3000")
    expect(observationList.textContent).toContain("chiles-whitted")
    expect(observationList.textContent).not.toContain("Clarence Chiles") // already in the testimony line, not repeated here

    infoButton.click()
    expect(infoPanel.hidden).toBe(true)
  })

  it("shows description and tags in the info panel when present, omits both when absent", async () => {
    stubFetch({ "john.json": { ...johnSighting, description: "Bright light hovering over the field.", tags: ["hovering", "night"] } })
    const element = mount()
    element.witnessUrls = ["john.json"]
    await new Promise(resolve => setTimeout(resolve, 0))

    const infoButton = element.shadowRoot!.getElementById("info-button") as HTMLButtonElement
    infoButton.click()

    const observationList = element.shadowRoot!.getElementById("info-observation-list") as HTMLElement
    expect(observationList.textContent).toContain("Bright light hovering over the field.")
    expect(observationList.textContent).toContain("hovering, night")
  })

  it("shows neither description nor tags rows when the sighting has none", async () => {
    const element = mount()
    element.witnessUrls = ["john.json"]
    await new Promise(resolve => setTimeout(resolve, 0))

    const infoButton = element.shadowRoot!.getElementById("info-button") as HTMLButtonElement
    infoButton.click()

    const observationList = element.shadowRoot!.getElementById("info-observation-list") as HTMLElement
    expect(observationList.textContent).not.toContain("Description")
    expect(observationList.textContent).not.toContain("Tags")
  })

  it("closes the info panel on a click outside it, but not on a click inside it", async () => {
    const element = mount()
    element.witnessUrls = ["john.json"]
    await new Promise(resolve => setTimeout(resolve, 0))

    const infoButton = element.shadowRoot!.getElementById("info-button") as HTMLButtonElement
    const infoPanel = element.shadowRoot!.getElementById("info-panel") as HTMLElement
    const observationList = element.shadowRoot!.getElementById("info-observation-list") as HTMLElement
    infoButton.click()
    expect(infoPanel.hidden).toBe(false)

    observationList.click() // inside the panel — stays open
    expect(infoPanel.hidden).toBe(false)

    document.body.click() // outside the component entirely — closes it
    expect(infoPanel.hidden).toBe(true)

    // Re-opens cleanly afterwards — the outside-click listener wasn't left in some stuck state.
    infoButton.click()
    expect(infoPanel.hidden).toBe(false)
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

describe("SightingElement i18n", () => {
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

/**
 * The info panel hands the reader the two lines it takes to put this very observation on their
 * own page — either as a replay or as the editor, both taking the same absolute `src`.
 */
describe("SightingElement embed markup", () => {
  beforeEach(() => {
    stubFetch({ "john.json": johnSighting })
  })

  afterEach(() => {
    document.body.innerHTML = ""
  })

  async function openInfoPanel(): Promise<HTMLElement> {
    const element = mount()
    element.witnessUrls = ["john.json"]
    await new Promise(resolve => setTimeout(resolve, 0))
    ;(element.shadowRoot!.getElementById("info-button") as HTMLButtonElement).click()
    // The snippet is folded away behind its own footer toggle, like the credits.
    ;(element.shadowRoot!.getElementById("info-embed-toggle") as HTMLButtonElement).click()
    return element.shadowRoot as unknown as HTMLElement
  }

  it("offers a self-contained replay snippet with an absolute src", async () => {
    const shadow = await openInfoPanel()
    const markup = (shadow.querySelector("#embed-markup") as HTMLTextAreaElement).value

    expect(markup).toContain("<rr0-sighting src=\"http://localhost:3000/john.json\"></rr0-sighting>")
    expect(markup).toContain("rr0-sighting.mjs")
    expect(markup).toContain("<script type=\"module\"")
  })

  it("switches to the editor element, keeping the same recording", async () => {
    const shadow = await openInfoPanel()
    const editRadio = shadow.querySelector("#embed-kind-edit") as HTMLInputElement
    editRadio.checked = true
    editRadio.dispatchEvent(new Event("change"))
    const markup = (shadow.querySelector("#embed-markup") as HTMLTextAreaElement).value

    expect(markup).toContain("<rr0-ufo-recorder src=\"http://localhost:3000/john.json\"></rr0-ufo-recorder>")
    expect(markup).toContain("rr0-ufo-recorder.mjs")
  })
})

/**
 * A testimony's time is what the witness's own clock said, never what the reader's clock would
 * say for the same instant: Chiles and Whitted saw their object at 02:45 over Montgomery, and
 * that stays 02:45 whoever opens the page from wherever.
 */
describe("SightingElement observation time", () => {
  afterEach(() => {
    document.body.innerHTML = ""
  })

  async function dateRowFor(time: object, extra: object = {}): Promise<string> {
    stubFetch({
      "x.json": { version: 1, time, place: [{ lat: 32.3792, lng: -86.3077 }], timeline: { keyframes: [] }, ...extra }
    })
    const element = mount()
    element.witnessUrls = ["x.json"]
    await new Promise(resolve => setTimeout(resolve, 0))
    ;(element.shadowRoot!.getElementById("info-button") as HTMLButtonElement).click()
    const list = element.shadowRoot!.getElementById("info-observation-list")!
    return list.querySelector("dd")?.textContent ?? ""
  }

  it("shows the witness's own wall-clock time, with an explicit time zone", async () => {
    const shown = await dateRowFor({ year: 1948, month: 7, day: 24, hour: 2, minute: 45 }, { utcOffsetHours: -6 })
    expect(shown).toContain("2:45") // "July 24, 1948 at 2:45 AM" — the witness's clock, not the reader's
  })

  it("shows it unchanged when the time zone is only approximated from the longitude", async () => {
    const shown = await dateRowFor({ year: 1948, month: 7, day: 24, hour: 2, minute: 45 })
    expect(shown).toContain("2:45") // "July 24, 1948 at 2:45 AM" — the witness's clock, not the reader's
  })
})

/**
 * Where the browser has the popover API, the info panel goes into the top layer — the one
 * placement a host page's own `overflow: hidden` wrapper cannot clip. rr0.org has exactly such a
 * wrapper (`div.wide`), which was cutting the panel's footer, and with it the link to the
 * observation's editor, clean off the page: nothing could scroll it back into view because an
 * absolutely-positioned panel adds nothing to the document's own height.
 */
describe("SightingElement info panel placement", () => {
  afterEach(() => {
    document.body.innerHTML = ""
    vi.unstubAllGlobals()
    delete (HTMLElement.prototype as { showPopover?: unknown }).showPopover
    delete (HTMLElement.prototype as { hidePopover?: unknown }).hidePopover
  })

  /** jsdom implements no popover at all, so the API is stubbed to exercise that path. */
  function withPopoverSupport(): { shown: string[] } {
    const shown: string[] = []
    ;(HTMLElement.prototype as { showPopover?: unknown }).showPopover = function (this: HTMLElement) {
      shown.push("show")
      this.dispatchEvent(Object.assign(new Event("toggle"), { newState: "open" }))
    }
    ;(HTMLElement.prototype as { hidePopover?: unknown }).hidePopover = function (this: HTMLElement) {
      shown.push("hide")
      this.dispatchEvent(Object.assign(new Event("toggle"), { newState: "closed" }))
    }
    return { shown }
  }

  it("declares the panel a popover and lets the browser's own invoker open it", () => {
    withPopoverSupport()
    const element = mount()
    const panel = element.shadowRoot!.getElementById("info-panel")!
    const button = element.shadowRoot!.getElementById("info-button")!

    expect(panel.getAttribute("popover")).toBe("auto")
    expect(panel.hasAttribute("hidden")).toBe(false) // the popover mechanism controls visibility
    expect(button.getAttribute("popovertarget")).toBe("info-panel")
  })

  it("follows the panel when the browser closes it on its own (Escape, click outside)", () => {
    withPopoverSupport()
    const element = mount()
    const panel = element.shadowRoot!.getElementById("info-panel")!
    const button = element.shadowRoot!.getElementById("info-button")!

    panel.dispatchEvent(Object.assign(new Event("toggle"), { newState: "open" }))
    expect(button.getAttribute("aria-expanded")).toBe("true")

    panel.dispatchEvent(Object.assign(new Event("toggle"), { newState: "closed" }))
    expect(button.getAttribute("aria-expanded")).toBe("false")
  })

  it("keeps the plain overlay, and its own outside-click close, without the API", () => {
    const element = mount()
    const panel = element.shadowRoot!.getElementById("info-panel")!
    const button = element.shadowRoot!.getElementById("info-button") as HTMLButtonElement

    expect(panel.hasAttribute("popover")).toBe(false)
    expect(button.hasAttribute("popovertarget")).toBe(false)

    button.click()
    expect(panel.hidden).toBe(false)
    document.body.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }))
    expect(panel.hidden).toBe(true)
  })
})

/**
 * Both fold-outs live above the panel's sticky footer. After it, they open UNDERNEATH it — which
 * is how clicking Credits came to reveal a list nobody could see once the panel had a height cap.
 */
describe("SightingElement parameter labels", () => {
  beforeEach(() => {
    stubFetch({ "john.json": johnSighting })
  })

  afterEach(() => {
    document.body.innerHTML = ""
  })

  async function mounted(showLabels = false): Promise<SightingElement> {
    const element = mount()
    if (showLabels) {
      element.setAttribute("show-labels", "")
    }
    element.witnessUrls = ["john.json"]
    await new Promise(resolve => setTimeout(resolve, 0))
    return element
  }

  function labels(element: SightingElement): string[] {
    return [...element.shadowRoot!.querySelectorAll(".param-label")].map(item => item.textContent!)
  }

  // A player dropped into an article is there to be watched, not to be a data sheet.
  it("shows no strip at all until a page or a reader asks for one", async () => {
    const element = await mounted()
    expect(element.shadowRoot!.getElementById("param-summary")!.hidden).toBe(true)
    expect(labels(element)).toEqual([])
  })

  it("states the recording when the page asks with show-labels", async () => {
    const element = await mounted(true)
    expect(element.shadowRoot!.getElementById("param-summary")!.hidden).toBe(false)
    expect(labels(element).some(text => text.includes("chiles-whitted"))).toBe(true)
  })

  it("takes the same instruction from a script as from the markup", async () => {
    const element = await mounted()
    expect(element.showLabels).toBe(false)

    element.showLabels = true
    expect(element.hasAttribute("show-labels")).toBe(true)
    expect(labels(element).length).toBeGreaterThan(0)

    element.showLabels = false
    expect(element.hasAttribute("show-labels")).toBe(false)
    expect(labels(element)).toEqual([])
  })

  /*
   * The attribute IS the state, the way <details open> works — not a one-time instruction a
   * reader's click then silently invalidates. Without that, a page that declared show-labels and
   * a reader who closed the strip left the property lying, and setting it back to true did
   * nothing at all: the attribute had never come off.
   */
  it("reports what the reader did, and can be reopened afterwards", async () => {
    const element = await mounted(true)
    ;(element.shadowRoot!.getElementById("info-labels-toggle") as HTMLButtonElement).click()
    expect(element.showLabels).toBe(false)
    expect(element.hasAttribute("show-labels")).toBe(false)

    element.showLabels = true
    expect(labels(element).length).toBeGreaterThan(0)
  })

  // Same switch as the attribute, so a reader can always close what a page opened.
  it("lets the reader turn it on and off from the info panel", async () => {
    const element = await mounted()
    const toggle = element.shadowRoot!.getElementById("info-labels-toggle") as HTMLButtonElement
    expect(toggle.getAttribute("aria-pressed")).toBe("false")

    toggle.click()
    expect(toggle.getAttribute("aria-pressed")).toBe("true")
    expect(labels(element).length).toBeGreaterThan(0)

    toggle.click()
    expect(labels(element)).toEqual([])
  })

  /*
   * With the strip showing, the panel's own date/place/case rows say again, in a worse form, what
   * is spelled out under the render. The description never goes: it is the one thing the strip
   * refuses to carry, because prose doesn't fit on a chip.
   */
  it("stops the info panel repeating what the strip already states, and leaves it the description", async () => {
    const element = await mounted()
    const shadow = element.shadowRoot!
    ;(shadow.getElementById("info-button") as HTMLButtonElement).click()
    const rows = (): string[] => [...shadow.querySelectorAll("#info-observation-list dt")].map(dt => dt.textContent!)
    expect(rows()).toContain("Case")

    ;(shadow.getElementById("info-labels-toggle") as HTMLButtonElement).click()
    expect(rows()).not.toContain("Case")
    expect(rows()).not.toContain("Date")
    // Nothing is left here at all only because this fixture states no description; a recording
    // that does keeps it, which is the whole point of leaving that one row alone.

    // And gives them back. The toggle lives inside the panel it re-cuts, so an earlier version
    // that only repopulated "while the panel is open" left these rows gone for good.
    ;(shadow.getElementById("info-labels-toggle") as HTMLButtonElement).click()
    expect(rows()).toContain("Case")
  })

  // Read-only: there is no form behind a player to send anyone back to.
  it("makes the labels statements, not controls", async () => {
    const element = await mounted(true)
    expect(element.shadowRoot!.querySelectorAll(".param-label button").length).toBe(0)
    expect([...element.shadowRoot!.querySelectorAll(".param-label")].every(item => item.tagName === "SPAN")).toBe(true)
  })
})

describe("SightingElement info panel fold-outs", () => {
  beforeEach(() => {
    stubFetch({ "john.json": johnSighting })
  })

  afterEach(() => {
    document.body.innerHTML = ""
  })

  async function openPanel(): Promise<ShadowRoot> {
    const element = mount()
    element.witnessUrls = ["john.json"]
    await new Promise(resolve => setTimeout(resolve, 0))
    ;(element.shadowRoot!.getElementById("info-button") as HTMLButtonElement).click()
    return element.shadowRoot!
  }

  it("keeps the embed snippet folded away until asked for, like the credits", async () => {
    const shadow = await openPanel()
    const embed = shadow.getElementById("info-embed")!
    const toggle = shadow.getElementById("info-embed-toggle") as HTMLButtonElement

    expect(embed.hidden).toBe(true)
    expect(toggle.getAttribute("aria-expanded")).toBe("false")

    toggle.click()
    expect(embed.hidden).toBe(false)
    expect(toggle.getAttribute("aria-expanded")).toBe("true")

    toggle.click()
    expect(embed.hidden).toBe(true)
  })

  it("puts both fold-outs before the footer, so neither opens underneath it", async () => {
    const shadow = await openPanel()
    const children = [...shadow.getElementById("info-panel")!.children]
    const footer = children.findIndex(el => el.classList.contains("info-footer"))

    expect(children.findIndex(el => el.id === "info-embed")).toBeLessThan(footer)
    expect(children.findIndex(el => el.id === "info-credits-list")).toBeLessThan(footer)
  })

  it("folds both back when the panel is closed, so it reopens on the metadata", async () => {
    const shadow = await openPanel()
    ;(shadow.getElementById("info-embed-toggle") as HTMLButtonElement).click()
    ;(shadow.getElementById("info-credits-toggle") as HTMLButtonElement).click()

    ;(shadow.getElementById("info-button") as HTMLButtonElement).click() // close the panel
    ;(shadow.getElementById("info-button") as HTMLButtonElement).click() // and reopen it

    expect(shadow.getElementById("info-embed")!.hidden).toBe(true)
    expect(shadow.getElementById("info-credits-list")!.hidden).toBe(true)
  })
})
