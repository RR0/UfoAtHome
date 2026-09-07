import { describe, expect, it, afterEach, beforeAll, vi } from "vitest"
import { register, ELEMENT_NAME } from "../../src/component/SightingEditorElement.js"
import type { SightingEditorElement } from "../../src/component/SightingEditorElement.js"
import type { NarrativeDraft, NarrativeRequest } from "../../src/engine/narrative/NarrativeProvider.js"
import { NarrativeError } from "../../src/engine/narrative/NarrativeError.js"
import { sightingEditorMessages_en } from "../../src/component/messages/SightingEditorMessages_en.js"

register()

/**
 * Its own file rather than another describe in SightingEditorElement.test.ts, for the same reason
 * the ground-elevation one is: it mocks a source registry, and a vi.mock is module-scoped.
 *
 * What it guards is the rule that makes drafting safe to leave on direct application — a
 * correction restates the whole recording, including everything it was not asked about, and only
 * what actually moved may be written. See DraftPatch, and NarrativeProvider on why a draft carries
 * its quotes with it.
 */
let asked: NarrativeRequest[] = []
let answer: (request: NarrativeRequest) => Promise<NarrativeDraft> = () =>
  Promise.reject(new NarrativeError("malformed"))

vi.mock("../../src/engine/narrative/narrativeSources.js", () => ({
  NARRATIVE_SOURCES: [
    {
      id: "test-narrative",
      name: "Test reader",
      credit: "test",
      creditUrl: "https://example.org",
      create: () => ({
        needsCredential: true,
        draft: (request: NarrativeRequest) => {
          asked.push(request)
          return answer(request)
        }
      })
    }
  ]
}))

vi.mock("../../src/render3d/SceneRenderer.js", () => ({
  SceneRenderer: class {
    resize(): void {}
    setObserverPose(): void {}
    setTerrainOrigin(): void {}
    get currentTerrainAttribution(): undefined {
      return undefined
    }
    setDecorModelProvider(): void {}
    get currentDecorModelCredits(): never[] {
      return []
    }
    setAstronomy(): void {}
    setShowCompass(): void {}
    setCompassHovered(): void {}
    setCompassForced(): void {}
    setIndoorLook(): void {}
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
    setInstrumentGain(): void {}
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

beforeAll(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(function (this: HTMLCanvasElement) {
    // mockImplementation, not mockReturnValue: a renderer that sizes itself from its own canvas
    // (see WitnessMapRenderer) reads ctx.canvas, and one shared object makes every canvas claim to
    // be the same one.
    return {
      canvas: this,
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
      fillRect: vi.fn(),
      arc: vi.fn(),
      fillText: vi.fn(),
      strokeText: vi.fn(),
      drawImage: vi.fn(),
      createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
      measureText: vi.fn((text: string) => ({ width: text.length * 5 })),
    } as unknown as CanvasRenderingContext2D
  })
  globalThis.fetch = vi.fn().mockResolvedValue({ arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)) }) as typeof fetch
  globalThis.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  } as unknown as typeof ResizeObserver
})
function mount(): SightingEditorElement {
  const element = document.createElement(ELEMENT_NAME) as SightingEditorElement
  document.body.appendChild(element)
  asked = []
  return element
}

function field<T extends HTMLElement>(element: SightingEditorElement, id: string): T {
  return element.shadowRoot!.getElementById(id) as T
}

function type(element: SightingEditorElement, id: string, value: string): void {
  const input = field<HTMLInputElement | HTMLTextAreaElement>(element, id)
  input.value = value
  // Dispatched, not just assigned: the button enables itself off these events (see
  // syncNarrativeEnabled), and a disabled button ignores click(), so a test that only assigned
  // would press nothing and prove nothing.
  input.dispatchEvent(new Event("input"))
}

/** Types an account and a key, then presses the button — the whole gesture, since none of it works
 * without the other parts. */
async function draft(element: SightingEditorElement, ask: string, key = "sk-test"): Promise<void> {
  type(element, "narrative", ask)
  type(element, "narrativeKey", key)
  field<HTMLButtonElement>(element, "narrative-draft").click()
  await new Promise(resolve => setTimeout(resolve, 0))
}

afterEach(() => {
  document.body.replaceChildren()
  localStorage.clear()
  answer = () => Promise.reject(new NarrativeError("malformed"))
})

describe("SightingEditorElement drafting from an account", () => {
  it("writes what a first draft states into the editor", async () => {
    const element = mount()
    answer = () => Promise.resolve({
      recording: { caseId: "valensole", durationSeconds: 270, time: { year: 1965, month: 7, day: 1 } },
      claims: [{ path: "time.year", quote: "le 1er juillet 1965" }],
      gaps: ["the account gives no heading"]
    })

    await draft(element, "Maurice Masse, 1er juillet 1965, 4 minutes 30.")

    expect(element.sightingData.caseId).toBe("valensole")
    expect(element.sightingData.durationSeconds).toBe(270)
    expect(element.sightingData.time).toMatchObject({ year: 1965, month: 7, day: 1 })
  })

  it("keeps a hand edit a correction merely restates", async () => {
    // The reason direct application is safe at all. The first draft misspells the witness; the
    // author fixes it; the correction is about the duration and restates the misspelling along with
    // everything else, exactly as corrections do.
    const element = mount()
    answer = () => Promise.resolve({
      recording: { durationSeconds: 270, witness: { title: "Maurice Mass" } },
      claims: [],
      gaps: []
    })
    await draft(element, "The account.")

    field<HTMLInputElement>(element, "witnessTitle").value = "Maurice Masse"
    field<HTMLInputElement>(element, "witnessTitle").dispatchEvent(new Event("input"))

    answer = () => Promise.resolve({
      recording: { durationSeconds: 240, witness: { title: "Maurice Mass" } },
      claims: [],
      gaps: []
    })
    await draft(element, "It lasted four minutes, not four and a half.")

    expect(element.sightingData.durationSeconds).toBe(240)
    expect(element.sightingData.witness?.title).toBe("Maurice Masse")
  })

  it("sends the account, then the correction with the earlier round behind it", async () => {
    const element = mount()
    answer = () => Promise.resolve({ recording: { caseId: "a" }, claims: [], gaps: [] })
    await draft(element, "The account.")
    answer = () => Promise.resolve({ recording: { caseId: "b" }, claims: [], gaps: [] })
    await draft(element, "Not a, b.")

    expect(asked[0].history).toEqual([])
    expect(asked[1].history).toEqual([{ request: "The account.", draft: { caseId: "a" } }])
    // And what the editor holds now, so the correction lands on that rather than on a superseded
    // draft — see NarrativeRequest.current.
    expect(asked[1].current?.caseId).toBe("a")
  })

  it("shows the quotes behind the draft, and what the account never said", async () => {
    const element = mount()
    answer = () => Promise.resolve({
      recording: { time: { year: 1965 } },
      claims: [{ path: "time.year", quote: "le 1er juillet 1965" }],
      gaps: ["the direction the witness faced is never stated"]
    })

    await draft(element, "The account.")
    const report = field(element, "narrative-report")

    expect(report.hidden).toBe(false)
    expect(report.querySelector("code")?.textContent).toBe("time.year")
    expect(report.querySelector("q")?.textContent).toBe("le 1er juillet 1965")
    expect(report.querySelector(".gaps li")?.textContent).toBe("the direction the witness faced is never stated")
  })

  it("turns the button into a correction after the first draft", async () => {
    const element = mount()
    answer = () => Promise.resolve({ recording: { caseId: "a" }, claims: [], gaps: [] })

    expect(field(element, "narrative-draft").textContent).toBe(sightingEditorMessages_en.narrativeDraft)
    await draft(element, "The account.")

    expect(field(element, "narrative-draft").textContent).toBe(sightingEditorMessages_en.narrativeCorrect)
    expect(field<HTMLTextAreaElement>(element, "narrative").value).toBe("")
    expect(field<HTMLTextAreaElement>(element, "narrative").placeholder)
      .toBe(sightingEditorMessages_en.narrativeCorrection)
  })

  it("says a correction changed nothing, rather than leaving the reader guessing", async () => {
    const element = mount()
    answer = () => Promise.resolve({ recording: { caseId: "a" }, claims: [], gaps: [] })
    await draft(element, "The account.")
    await draft(element, "Same again.")

    expect(field(element, "narrative-status").textContent).toBe(sightingEditorMessages_en.narrativeUnchanged)
  })

  it("says which of the failures happened, since their remedies differ", async () => {
    const element = mount()
    answer = () => Promise.reject(new NarrativeError("credential"))
    await draft(element, "The account.")
    expect(field(element, "narrative-status").textContent)
      .toBe(sightingEditorMessages_en.narrativeErrorCredential)

    answer = () => Promise.reject(new NarrativeError("rate-limited"))
    await draft(element, "The account.")
    expect(field(element, "narrative-status").textContent)
      .toBe(sightingEditorMessages_en.narrativeErrorRateLimited)
  })

  it("says nothing when the reader stopped it themselves", async () => {
    const element = mount()
    answer = () => Promise.reject(new NarrativeError("cancelled"))

    await draft(element, "The account.")

    expect(field(element, "narrative-status").textContent).toBe("")
  })

  it("does nothing at all on an empty account", async () => {
    const element = mount()

    await draft(element, "   ")

    expect(asked).toEqual([])
  })

  it("offers the button only when pressing it would do something, and says what is missing", async () => {
    // A button that silently does nothing is worse than a disabled one: a reader who forgot the key
    // cannot tell a missing field from a broken feature.
    const element = mount()
    const button = field<HTMLButtonElement>(element, "narrative-draft")

    expect(button.disabled).toBe(true)
    expect(button.title).toBe(
      sightingEditorMessages_en.narrativeNeedsKey.replace("{source}", "Test reader"))

    type(element, "narrativeKey", "sk-test")
    expect(button.disabled).toBe(true)
    expect(button.title).toBe(sightingEditorMessages_en.narrativeNeedsAsk)

    type(element, "narrative", "The account.")
    expect(button.disabled).toBe(false)
    expect(button.title).toBe("")
  })

  it("names the source the key is for, rather than leaving the reader to guess whose", async () => {
    const element = mount()

    expect(field(element, "label-narrative-key").textContent).toBe("Test reader API key")
  })

  it("becomes unavailable again once the box has been emptied by a draft", async () => {
    const element = mount()
    answer = () => Promise.resolve({ recording: { caseId: "a" }, claims: [], gaps: [] })

    await draft(element, "The account.")

    expect(field<HTMLButtonElement>(element, "narrative-draft").disabled).toBe(true)
    expect(field<HTMLButtonElement>(element, "narrative-draft").title)
      .toBe(sightingEditorMessages_en.narrativeNeedsAsk)
  })

  it("keeps the key only when asked to, and forgets it the moment that is unticked", async () => {
    // Storing somebody's credential is their decision, not a convenience to help them to.
    const element = mount()
    const key = field<HTMLInputElement>(element, "narrativeKey")
    key.value = "sk-test"
    key.dispatchEvent(new Event("input"))

    expect(localStorage.getItem("rr0-sighting-editor.narrative-key")).toBeNull()

    const remember = field<HTMLInputElement>(element, "narrativeRemember")
    remember.checked = true
    remember.dispatchEvent(new Event("change"))
    expect(localStorage.getItem("rr0-sighting-editor.narrative-key")).toBe("sk-test")

    remember.checked = false
    remember.dispatchEvent(new Event("change"))
    expect(localStorage.getItem("rr0-sighting-editor.narrative-key")).toBeNull()
  })

  it("credits the source it reads with, on the control that names it", async () => {
    const element = mount()
    const credit = field<HTMLAnchorElement>(element, "narrative-credit")

    expect(credit.textContent).toContain("Test reader")
    expect(credit.href).toBe("https://example.org/")
  })
})
