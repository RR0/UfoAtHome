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
    setCloudRendering(): void {}
    setCloudOffset(): void {}
    setGait(): void {}
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
    setReferences(): void {}
    setReferencesShown(): void {}
    setReferenceView(): void {}
    referenceFailedToLoad(): boolean {
      return false
    }
    referenceAspect(): undefined {
      return undefined
    }
    screenPointOf(): undefined {
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
    frame(): void {}
    compileNextFrameOffThread(): void {}
    releaseContext(): void {}
    restoreContext(): void {}
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
  type(element, "description", ask)
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
      claims: [{ path: "time.year", basis: "stated" as const, rationale: "le 1er juillet 1965" }],
      gaps: ["the account gives no heading"]
    })

    await draft(element, "Maurice Masse, 1er juillet 1965, 4 minutes 30.")

    expect(element.sightingData.caseId).toBe("valensole")
    expect(element.sightingData.durationSeconds).toBe(270)
    // Wrapped, because the claim gave that value a rationale — the file says where it came from.
    expect(element.sightingData.time).toMatchObject({
      year: { value: 1965, rationale: "le 1er juillet 1965" }, month: 7, day: 1
    })
  })

  it("never writes the account back over itself", async () => {
    // The field the reader typed into is the one field a draft may not touch: it is what the witness
    // said, and it does not change because somebody read it. Stripped rather than trusted absent.
    const element = mount()
    answer = () => Promise.resolve({
      recording: { caseId: "valensole", description: "A summary of the reconstruction." },
      claims: [],
      gaps: []
    })

    await draft(element, "Maurice Masse, 1er juillet 1965.")

    expect(field<HTMLTextAreaElement>(element, "description").value).toBe("Maurice Masse, 1er juillet 1965.")
    expect(element.sightingData.description).toBe("Maurice Masse, 1er juillet 1965.")
    expect(element.sightingData.caseId).toBe("valensole")
  })

  it("leaves alone what the account is silent about", async () => {
    // A place geocoded by hand is not in a testimony, so no reading of one may take it away.
    const element = mount()
    type(element, "lat", "43.837")
    type(element, "lng", "5.993")
    answer = () => Promise.resolve({ recording: { caseId: "valensole" }, claims: [], gaps: [] })

    await draft(element, "The account.")

    expect(element.sightingData.place?.[0]).toMatchObject({ lat: 43.837, lng: 5.993 })
    expect(element.sightingData.caseId).toBe("valensole")
  })

  it("reads the account whole every time, with no conversation behind it", async () => {
    const element = mount()
    answer = () => Promise.resolve({ recording: { caseId: "a" }, claims: [], gaps: [] })
    await draft(element, "The account.")
    answer = () => Promise.resolve({ recording: { caseId: "b" }, claims: [], gaps: [] })
    await draft(element, "The account, reworded.")

    expect(asked.map(request => request.ask)).toEqual(["The account.", "The account, reworded."])
    // What is already settled goes along, so a draft does not overrule a geocoded place or a
    // chosen instrument — see NarrativeRequest.current.
    expect(asked[1].current?.caseId).toBe("a")
  })

  it("groups the report by basis, guesses first, and marks what nothing could settle", async () => {
    // What was guessed is what an author has to go and check; burying it among forty quoted values
    // is how it stops being checked.
    const element = mount()
    answer = () => Promise.resolve({
      recording: { time: { year: 1974 }, durationSeconds: 120, utcOffsetHours: 1 },
      claims: [
        { path: "time.year", basis: "stated" as const, rationale: "lundi 20 mai 1974" },
        { path: "durationSeconds", basis: "assumed" as const, rationale: "\"quelques mn\" gives no number" },
        { path: "utcOffsetHours", basis: "derived" as const, rationale: "France had no summer time in 1974" }
      ],
      gaps: ["nothing bears on the phenomenon's colour"]
    })

    await draft(element, "The account.")
    const report = field(element, "narrative-report")

    expect(report.hidden).toBe(false)
    expect([...report.querySelectorAll("h4")].map(h => h.textContent)).toEqual([
      sightingEditorMessages_en.narrativeAssumed,
      sightingEditorMessages_en.narrativeDerived,
      sightingEditorMessages_en.narrativeStated,
      sightingEditorMessages_en.narrativeGaps
    ])
    expect([...report.querySelectorAll(".claim code")].map(c => c.textContent))
      .toEqual(["durationSeconds", "utcOffsetHours", "time.year"])
    // A quotation for a quotation, plain text for a piece of reasoning.
    expect(report.querySelector(".claim.stated q")?.textContent).toBe("lundi 20 mai 1974")
    expect(report.querySelector(".claim.assumed q")).toBeNull()
    expect(report.querySelector(".gaps li")?.textContent).toBe("nothing bears on the phenomenon's colour")
  })

  it("writes each basis into the recording, so the file says which values were guessed", async () => {
    const element = mount()
    answer = () => Promise.resolve({
      recording: { durationSeconds: 120, utcOffsetHours: 1, caseId: "landevennec" },
      claims: [
        { path: "durationSeconds", basis: "assumed" as const, rationale: "\"quelques mn\" gives no number" },
        { path: "utcOffsetHours", basis: "derived" as const, rationale: "France had no summer time in 1974" },
        { path: "caseId", basis: "stated" as const, rationale: "boulanger à Landévennec" }
      ],
      gaps: []
    })

    await draft(element, "The account.")
    const written = element.sightingData as unknown as Record<string, unknown>

    expect(written.durationSeconds).toEqual({
      value: 120, basis: "assumed", rationale: "\"quelques mn\" gives no number"
    })
    expect(written.utcOffsetHours).toEqual({
      value: 1, basis: "derived", rationale: "France had no summer time in 1974"
    })
    // A stated value keeps its rationale, which is the account's own words, but not a "basis" that
    // is already the default.
    expect(written.caseId).toEqual({ value: "landevennec", rationale: "boulanger à Landévennec" })
  })

  it("lets a guess expire the moment the author types over it", async () => {
    const element = mount()
    answer = () => Promise.resolve({
      recording: { durationSeconds: 120 },
      claims: [{ path: "durationSeconds", basis: "assumed" as const, rationale: "no number given" }],
      gaps: []
    })
    await draft(element, "The account.")

    type(element, "durationSeconds", "300")

    // Theirs now: crediting an author's own duration to a machine that guessed a different one is
    // the confusion this whole mechanism exists to prevent.
    expect(element.sightingData.durationSeconds).toBe(300)
  })

  it("lets the time zone decide the offset, ignoring one a draft states", async () => {
    // Not testimony and not a reading of one: it is what that zone's own rules give at that date,
    // and the editor reads them out of the platform's IANA database. France ran no summer time
    // between 1945 and 1976, so May 1974 in Brittany is +1 however confidently a draft says +2.
    const element = mount()
    answer = () => Promise.resolve({
      recording: {
        time: { year: 1974, month: 5, day: 20, hour: 19, minute: 0 },
        timeZone: "Europe/Paris",
        utcOffsetHours: 2
      },
      claims: [{ path: "timeZone", basis: "derived" as const, rationale: "Bretagne, France" }],
      gaps: []
    })

    await draft(element, "The account.")

    // Wrapped, because the claim gave the zone a rationale — see Provenance.
    expect(element.sightingData.timeZone).toMatchObject({ value: "Europe/Paris" })
    // The offset is bare: the software worked it out, so there is nobody to credit it to.
    expect(element.sightingData.utcOffsetHours).toBe(1)
  })

  it("keeps an offset a draft states when it named no zone to derive one from", async () => {
    const element = mount()
    answer = () => Promise.resolve({
      recording: { time: { year: 1974 }, utcOffsetHours: 2 },
      claims: [],
      gaps: []
    })

    await draft(element, "The account.")

    expect(element.sightingData.utcOffsetHours).toBe(2)
  })

  it("says when the account yielded nothing, rather than leaving the reader guessing", async () => {
    const element = mount()
    answer = () => Promise.resolve({ recording: {}, claims: [], gaps: ["nothing datable here"] })

    await draft(element, "Something went past.")

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

    type(element, "description", "The account.")
    expect(button.disabled).toBe(false)
    expect(button.title).toBe("")
  })

  it("names the source the key is for, rather than leaving the reader to guess whose", async () => {
    const element = mount()

    expect(field(element, "label-narrative-key").textContent).toBe("Test reader API key")
  })

  it("stays available after a draft, since the account is still there to be reworded", async () => {
    const element = mount()
    answer = () => Promise.resolve({ recording: { caseId: "a" }, claims: [], gaps: [] })

    await draft(element, "The account.")

    expect(field<HTMLButtonElement>(element, "narrative-draft").disabled).toBe(false)
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
