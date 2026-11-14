import { beforeAll, describe, expect, it, afterEach, vi } from "vitest"

import { register, CASE_ELEMENT_NAME } from "../../src/component/CaseElement.js"
import type { CaseElement } from "../../src/component/CaseElement.js"

// The case reader wraps the player, which mounts a scene: the renderer, the 2D context and the
// observers jsdom lacks are stubbed exactly as the player's own tests stub them.
vi.mock("../../src/render3d/SceneRenderer.js", () => ({
  SceneRenderer: class {
    resize(): void {}
    setObserverPose(): void {}
    setCloudRendering(): void {}
    setCloudOffset(): void {}
    setGait(): void {}
    setTerrainOrigin(): void {}
    setObserverRoute(): void {}
    setObserverHeadlights(): void {}
    setStatedRoads(): void {}
    setTraces(): void {}
    setTracesShown(): void {}
    get currentTerrainAttribution(): undefined {
      return undefined
    }
    setDecorModelProvider(): void {}
    get currentDecorModelCredits(): never[] {
      return []
    }
    setAstronomy(): void {}
    setShowCompass(): void {}
    setCompassPoints(): void {}
    setCompassHovered(): void {}
    setCompassForced(): void {}
    setWeather(): void {}
    setDecor(): void {}
    groundAltitudeM = 0
    setDecorPresence(): void {}
    setDecorSunlight(): void {}
    setContrails(): void {}
    setContrailSunlight(): void {}
    setReferences(): void {}
    setReferencesShown(): void {}
    setReferencesTime(): void {}
    setReferenceView(): void {}
    referenceFailure(): undefined {
      return undefined
    }
    referenceAspect(): undefined {
      return undefined
    }
    directionAt(): { x: number; y: number; z: number } {
      return { x: 0, y: 0, z: -1 }
    }
    setPhenomena(): void {}
    screenPointOf(): undefined {
      return undefined
    }
    updateDecorAnchoring(): void {}
    setBodies(): void {}
    get bodyGround() { return { heightAt: () => 0 } }
    updateDecorLitState(): void {}
    pickBodyAt(): undefined {
      return undefined
    }
    pickDecorAt(): undefined {
      return undefined
    }
    setLightning(): void {}
    updateLightning(): void {}
    setSatellites(): void {}
    setSkyEvents(): void {}
    pickTrafficAt(): undefined {
      return undefined
    }
    pickOpticsAt(): undefined {
      return undefined
    }
    pickRailwayAt(): undefined {
      return undefined
    }
    pickSatelliteAt(): undefined {
      return undefined
    }
    pickStarAt(): undefined {
      return undefined
    }
    decorDistancesAt(): { behindM?: number; inFrontM?: number } {
      return {}
    }
    setInstrument(): void {}
    setInstrumentGain(): void {}
    setLightPollution(): void {}
    setRecordingTime(): void {}
    setRetinaHistory(): void {}
    setMedium(): void {}
    setLensGhosts(): void {}
    pickGhostAt(): undefined { return undefined }
    pickAfterimageAt(): boolean { return false }
    pickDropAt(): boolean { return false }
    setPerception(): void {}
    setSkyUnknown(): void {}
    setLensOptics(): void {}
    setExposure(): void {}
    setMeteorShower(): void {}
    get meteorSchedule(): unknown[] {
      return []
    }
    groundHidesDirection(altitudeDeg: number): boolean {
      return altitudeDeg < 0
    }
    get groundKey(): string {
      return ""
    }
    meteorMidpoint(): undefined {
      return undefined
    }
    updateMeteors(): void {}
    render(): void {}
    dispose(): void {}
    startTwinkle(): void {}
    frame(): void {}
    compileNextFrameOffThread(): void {}
    holdForNewScene(): void {}
    releaseContext(): void {}
    restoreContext(): void {}
    stopTwinkle(): void {}
    setAnimationsRunning(): void {}
  }
}))

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement) {
    // A fresh object per canvas, not one shared: a renderer that sizes itself from its own canvas
    // (see ObserverMapRenderer) reads ctx.canvas, and one shared object makes every canvas claim to
    // be the same one.
    // Plain no-ops, not vi.fn(): vitest keeps every mock it ever made, and the `this` each was called on
    // (here the context, so its canvas and the element around it), for the life of the worker.
    const noop = (): void => {}
    return {
      canvas: this,
      save: noop,
      restore: noop,
      beginPath: noop,
      closePath: noop,
      fill: noop,
      ellipse: noop,
      moveTo: noop,
      lineTo: noop,
      translate: noop,
      rotate: noop,
      clearRect: noop,
      strokeRect: noop,
      stroke: noop,
      fillRect: noop,
      arc: noop,
      fillText: noop,
      strokeText: noop,
      drawImage: noop,
      createRadialGradient: () => ({ addColorStop: noop }),
      measureText: (text: string) => ({ width: text.length * 5 }),
    } as unknown as CanvasRenderingContext2D
  } as unknown as typeof HTMLCanvasElement.prototype.getContext
  // The nested <rr0-scene> lazily fetches the star catalog on connect — a safe default so that
  // fire-and-forget fetch resolves instead of rejecting whenever a test's own stubFetch() (below)
  // isn't active yet/covers other URLs. Plain assignment, not vi.stubGlobal, so per-test
  // vi.stubGlobal("fetch", ...) calls (via stubFetch) restore back to *this* on their own
  // afterEach's vi.unstubAllGlobals(), same reasoning as SightingEditorElement.test.ts's identical stub.
  globalThis.fetch = vi.fn().mockResolvedValue({ arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)) }) as typeof fetch
  // jsdom has no ResizeObserver — SceneElement.connectedCallback() (also nested now) uses one to
  // track its canvas size.
  globalThis.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  } as unknown as typeof ResizeObserver
})


register()

const account = { version: 4, id: "qb", observer: { title: "Q. B." }, timeline: { keyframes: [] } }
const caseJson = {
  id: "Case", title: "Saint-Lô", summary: { en: "A night in Normandy." },
  events: [
    { type: "event", eventType: "sighting", id: "qb", time: "2026-08-11 02:30", title: "Q. B.", url: "observer.json" },
    { type: "event", eventType: "sighting", id: "reading", interpretationOf: "qb", time: "2026-09-01", title: { en: "A balloon" },
      by: [{ people: "CousynAntoine" }, { org: "GEIPAN" }], url: "reading.json" },
    { type: "event", eventType: "interview", id: "i1", interviewOf: "qb", time: "2026-10-13", title: { en: "Interview of Q. B." }, url: "interview.json" }
  ]
}

const files: Record<string, unknown> = {}
const mount = async (src = "case.json"): Promise<CaseElement> => {
  files[new URL("case.json", location.href).href] = caseJson
  files[new URL("observer.json", location.href).href] = account
  files[new URL("reading.json", location.href).href] = { ...account, id: "reading", tags: ["interpretation"], interpretation: { title: { en: "A balloon" }, bodies: [] } }
  files[new URL("interview.json", location.href).href] = {
    version: 1, id: "i1", language: "en", interviewOf: "qb", speakers: { witness: { role: "witness", title: "Q. B." } },
    segments: [
      { speaker: "witness", start: 0, end: 5, text: "It came from the north.", refs: [{ at: 1 }] },
      { speaker: "witness", start: 6, end: 9, text: "And it spiralled down." }
    ]
  }
  vi.stubGlobal("fetch", vi.fn(async (url: string) => ({
    ok: true, status: 200, json: () => Promise.resolve(files[url]), arrayBuffer: () => Promise.resolve(new ArrayBuffer(0))
  })))
  const element = document.createElement(CASE_ELEMENT_NAME) as CaseElement
  element.setAttribute("src", src)
  document.body.appendChild(element)
  // Waited for, not timed: the words are a chunk of their own, and a cold runner takes its time over the first import.
  for (let left = 400; left > 0 && element.shadowRoot!.getElementById("case-title")!.textContent === ""; left--) {
    await new Promise(resolve => setTimeout(resolve, 5))
  }
  return element
}

describe("<rr0-case>, a case read", () => {
  afterEach(() => {
    document.body.innerHTML = ""
    vi.unstubAllGlobals()
  })

  it("says what the case is and lists what it holds, in the order of time", async () => {
    const element = await mount()
    const root = element.shadowRoot!
    expect(root.getElementById("case-title")!.textContent).toBe("Saint-Lô")
    expect(root.getElementById("case-summary")!.textContent).toBe("A night in Normandy.")
    const cards = [...root.querySelectorAll<HTMLElement>(".event")]
    expect(cards.map(card => card.dataset.kind)).toEqual(["observation", "reading", "interview"])
    expect(cards.map(card => card.querySelector(".event-open")!.textContent)).toEqual(["Q. B.", "A balloon", "Interview of Q. B."])
    // Nothing of the editor's: no removal, no padlock, no clone.
    expect(root.querySelector(".event-delete")).toBeNull()
    expect(root.querySelector(".event-freeze")).toBeNull()
  })

  it("says what reads what, and whose a reading is", async () => {
    const element = await mount()
    const links = [...element.shadowRoot!.querySelectorAll<HTMLElement>(".event")][1].querySelector(".event-links")!
    expect(links.textContent).toContain("Interpretation of Q. B.")
    expect(links.textContent).toContain("by CousynAntoine and GEIPAN")
    // The observation says where it was told.
    const told = [...element.shadowRoot!.querySelectorAll<HTMLElement>(".event")][0].querySelector(".event-links")!
    expect(told.textContent).toContain("Told in Interview of Q. B.")
  })

  it("opens an event, shuts it again, and keeps several open in the order of time", async () => {
    const element = await mount()
    const root = element.shadowRoot!
    const cards = () => [...root.querySelectorAll<HTMLElement>(".event")]
    const open = () => [...root.querySelectorAll<HTMLElement>(".open-event")].map(block => block.dataset.at)
    const waitFor = async (check: () => boolean) => {
      for (let left = 200; left > 0 && !check(); left--) await new Promise(resolve => setTimeout(resolve, 5))
      expect(check()).toBe(true)
    }
    // It opens on the first observation, and its card says so.
    expect(open()).toEqual(["0"])
    expect(cards()[0].dataset.open).toBe("")
    expect(element.player!.getAttribute("observer")).toBe("qb")
    // The interview opens beside it, under it, since it comes later in time.
    cards()[2].querySelector<HTMLButtonElement>(".event-open")!.click()
    await waitFor(() => root.querySelector(".open-event rr0-interview") !== null)
    expect(open()).toEqual(["0", "2"])
    expect(root.querySelector(".open-event rr0-interview")!.getAttribute("src")).toBe(new URL("interview.json", location.href).href)
    // The reading, opened last, takes its own place in time: between the observation and the interview.
    cards()[1].querySelector<HTMLButtonElement>(".event-open")!.click()
    await waitFor(() => open().length === 3)
    expect(open()).toEqual(["0", "1", "2"])
    // Choosing an open event again shuts it.
    cards()[0].querySelector<HTMLButtonElement>(".event-open")!.click()
    expect(open()).toEqual(["1", "2"])
    expect(cards()[0].dataset.open).toBeUndefined()
  })

  it("follows a replay in the dialogues open beside it, passage by passage", async () => {
    const element = await mount()
    const root = element.shadowRoot!
    const cards = [...root.querySelectorAll<HTMLElement>(".event")]
    cards[2].querySelector<HTMLButtonElement>(".event-open")!.click()
    for (let left = 200; left > 0 && root.querySelector(".open-event rr0-interview") === null; left--) {
      await new Promise(resolve => setTimeout(resolve, 5))
    }
    const reader = root.querySelector(".open-event rr0-interview") as HTMLElement & { revealAt?: unknown }
    await new Promise(resolve => setTimeout(resolve, 40))
    const shown: unknown[] = []
    ;(reader as unknown as { revealAt: (s: number, of?: string) => undefined }).revealAt = (seconds, of) => {
      shown.push([seconds, of])
      return undefined
    }
    // What the replay says as it moves: the case passes it on to every dialogue open beside it.
    const player = element.player!
    root.querySelector(".open-event")!.dispatchEvent(new CustomEvent("timechange", { bubbles: true, composed: true, detail: { at: 1.2 } }))
    // Where the replay stands, and which observation it is of: the dialogue needs both to find the passage.
    expect(shown).toEqual([[player.playedSeconds, "qb"]])
  })

  it("takes its options from the page: what to show from the start, and passes them on to its players", async () => {
    files[new URL("case.json", location.href).href] = caseJson
    files[new URL("observer.json", location.href).href] = account
    files[new URL("reading.json", location.href).href] = account
    files[new URL("interview.json", location.href).href] = { version: 1, id: "i1", language: "en", speakers: {}, segments: [] }
    vi.stubGlobal("fetch", vi.fn(async (url: string) => ({
      ok: true, status: 200, json: () => Promise.resolve(files[url]), arrayBuffer: () => Promise.resolve(new ArrayBuffer(0))
    })))
    const element = document.createElement(CASE_ELEMENT_NAME) as CaseElement
    element.setAttribute("src", "case.json")
    element.setAttribute("show-info", "")
    element.setAttribute("show-labels", "")
    element.setAttribute("show-timeline", "false")
    document.body.appendChild(element)
    for (let left = 400; left > 0 && element.shadowRoot!.getElementById("case-title")!.textContent === ""; left--) {
      await new Promise(resolve => setTimeout(resolve, 5))
    }
    const root = element.shadowRoot!
    // What the case says of itself is open, its chronology is not, and what is open is still open.
    expect(root.getElementById("case-summary")!.hidden).toBe(false)
    expect(root.querySelector(".case-timeline")!.hasAttribute("hidden")).toBe(true)
    expect(root.getElementById("timeline-button")!.getAttribute("aria-pressed")).toBe("false")
    expect([...root.querySelectorAll(".open-event")].length).toBe(1)
    // The player opened wears the options the case was given.
    expect(element.player!.hasAttribute("show-labels")).toBe(true)
    expect(element.player!.hasAttribute("show-info")).toBe(true)
    // And the button gives the chronology back.
    root.getElementById("timeline-button")!.click()
    expect(root.querySelector(".case-timeline")!.hasAttribute("hidden")).toBe(false)
  })

  it("says of itself only what the i asks for, and leads to the editor on what is open", async () => {
    const element = await mount()
    const root = element.shadowRoot!
    const summary = root.getElementById("case-summary")!
    expect(summary.hidden).toBe(true)
    root.getElementById("info")!.click()
    expect(summary.hidden).toBe(false)
    expect(summary.textContent).toBe("A night in Normandy.")
    root.getElementById("info")!.click()
    expect(summary.hidden).toBe(true)
  })
})
