// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { CandidatesView } from "../../src/component/CandidatesView.js"
import { witnessErrorMessages_en } from "../../src/component/messages/WitnessErrorMessages_en.js"
import { WitnessError } from "../../src/engine/witness/WitnessError.js"
import { computeBodyPosition, equatorialToHorizontal } from "../../src/engine/astronomy/CelestialPositions.js"
import { Timeline } from "../../src/engine/model/Timeline.js"
import { Provenance } from "../../src/engine/persistence/Provenance.js"
import { createOval } from "../../src/engine/shape/Shape.js"
import { PoherMatrix } from "../../src/engine/witness/PoherMatrix.js"

const matrix = new PoherMatrix([
  { question: "Hour.Night", knownPhenomenaProbabilities: { Planets: 1, Moon: 1, Helicopters: 0.5, Sun: 0 } },
  { question: "Hour.Day", knownPhenomenaProbabilities: { Planets: 0, Moon: 0.1, Helicopters: 1, Sun: 1 } }
])
const labels = { Hour: "Hour", "Hour.Night": "Night", Planets: "planets", Moon: "Moon", Helicopters: "helicopters", Sun: "Sun" }

// An evening of 2020-04-03 over Paris, when Venus was bright in the west.
const date = new Date(Date.UTC(2020, 3, 3, 19, 30))
const observer = { lat: 48.85, lng: 2.35, elevationM: 0 }
const venus = computeBodyPosition("Venus", date, observer)

function make(aim: { azimuthDeg: number, altitudeDeg: number }, extra: Record<string, unknown> = {}) {
  const timeline = new Timeline()
  timeline.addKeyframe(0, [{ sourceId: "ufo-1", shape: { ...createOval({ x: 0, y: 0, width: 10, height: 10 }), aim, angular: { widthDeg: 0.1, heightDeg: 0.1 } } }])
  const sighting = { timeline, provenance: Provenance.empty(), event: {} } as never
  const card = document.createElement("div")
  const section = document.createElement("div")
  const heading = document.createElement("label")
  const kept: unknown[] = []
  document.body.append(card, section, heading)
  const view = new CandidatesView({
    sighting,
    messages: () => witnessErrorMessages_en,
    model: () => WitnessError.byId("consolidated"),
    conditions: () => undefined,
    start: () => ({ date, observer }),
    limitAt: () => 6,
    fieldLabels: () => ({ heading }),
    sceneCard: () => card,
    poher: () => Promise.resolve({ matrix, labels }),
    facts: () => ({ sunAltitudeDeg: -15 }),
    satellites: () => undefined,
    burning: () => ({ reentries: [], fireballs: [] }),
    traffic: () => undefined,
    interpretations: () => [],
    starName: (name: string) => name,
    projectionAt: () => undefined,
    variants: () => kept,
    keep: (variant: unknown) => kept.push(variant as never),
    remove: (index: number) => kept.splice(index, 1),
    ...extra
  } as never, section)
  return { view, card, section, heading }
}

describe("CandidatesView", () => {
  it("finds Venus compatible with consolidated biases when the account puts the light a little higher and turned, and shows that variant", () => {
    const { view, card, section, heading } = make({ azimuthDeg: venus.azimuthDeg - 20, altitudeDeg: venus.altitudeDeg * 1.5 })
    view.refresh()
    // Aldebaran stood beside Venus that evening, and comes as close: Venus is found compatible, not necessarily first.
    const first = [...section.querySelectorAll(".candidate")].find(row => row.querySelector(".candidate-head")!.textContent!.includes("Venus"))!
    expect(first.querySelector(".verdict")!.getAttribute("data-verdict")).toBe("consolidated")
    first.querySelector<HTMLButtonElement>(".candidate-head")!.click()
    const see = [...first.querySelectorAll<HTMLButtonElement>("button")].find(button => button.textContent === "See this variant")!
    see.click()
    expect(card.querySelector(".variant-badge")!.textContent).toContain("Variant: Venus")
    expect(heading.querySelector(".variant-value s")).not.toBeNull()
    card.querySelector<HTMLButtonElement>(".variant-badge button")!.click()
    expect(card.querySelector(".variant-badge")).toBeNull()
    expect(heading.querySelector(".variant-value")).toBeNull()
  })

  it("says there is nothing to confront when the account places nothing in the sky", () => {
    const { view, section } = make({ azimuthDeg: 0, altitudeDeg: 0 })
    ;(view as unknown as { statement: () => undefined }).statement = () => undefined
    view.refresh()
    expect(section.textContent).toContain("does not place the phenomenon in the sky")
  })
})

describe("CandidatesView with the stars", () => {
  it("tries the bright stars nearest where the account puts the light, under their name, as Poher's stars", async () => {
    // Sirius, low in the south-west that evening: the account puts the light a few degrees from it.
    const sirius = equatorialToHorizontal(6.7525, -16.7161, date, observer)
    const { view, section } = make({ azimuthDeg: sirius.azimuthDeg + 4, altitudeDeg: sirius.altitudeDeg + 2 }, {
      starName: (name: string) => name === "Sirius" ? "Sirius (fr)" : name,
      poher: () => Promise.resolve({ matrix: new PoherMatrix([{ question: "Hour.Night", knownPhenomenaProbabilities: { Stars: 1, Planets: 1 } }]), labels: {} })
    })
    view.refresh()
    await new Promise(resolve => setTimeout(resolve, 0))
    const first = section.querySelector(".candidate")!
    expect(first.querySelector(".candidate-head")!.textContent).toContain("Star Sirius (fr)")
    expect(first.querySelector(".verdict")!.getAttribute("data-verdict")).toBe("consolidated")
    expect(first.querySelector(".poher-tag")!.textContent).toBe("Poher: possible, score 1")
  })
})

describe("CandidatesView with the Poher matrix", () => {
  it("says what the matrix makes of each computed candidate, lists its other phenomena, and what the recording answered", async () => {
    const { view, section } = make({ azimuthDeg: venus.azimuthDeg - 20, altitudeDeg: venus.altitudeDeg * 1.5 })
    view.refresh()
    await new Promise(resolve => setTimeout(resolve, 0))
    const venusRow = [...section.querySelectorAll(".candidate")].find(row => row.textContent!.includes("Venus"))!
    expect(venusRow.querySelector(".poher-tag")!.textContent).toBe("Poher: possible, score 1")
    expect(section.querySelector(".poher-answers")!.textContent).toContain("Hour : Night")
    const others = section.querySelector(".poher-block")!
    expect(others.textContent).toContain("helicopters")
    expect(others.querySelector("details")!.textContent).toContain("Sun")
    expect(others.textContent).not.toContain("planets")
  })
})

describe("CandidatesView with a version of the matrix", () => {
  it("reads RR0's version unless the reader chooses Poher's own, and says what RR0 adds and why it rules a phenomenon out", async () => {
    localStorage.clear()
    const extended = new PoherMatrix([
      { question: "Hour.Night", knownPhenomenaProbabilities: { Planets: 1, Helicopters: 0.5, SkyLantern: 1, Sun: 0 } },
      { question: "Hour.Day", knownPhenomenaProbabilities: { Planets: 0, Helicopters: 1, SkyLantern: 0.1, Sun: 1 } }
    ], {
      version: "2026-10-25", author: "RR0", sources: {},
      phenomena: { SkyLantern: { analogue: "WeatherBalloonsOrMongolfieres", summary: "", sources: [] } },
      cells: { SkyLantern: { "Hour.Night": { why: "Lit by its flame.", sources: [] } } }
    })
    const read: string[] = []
    const { view, section } = make({ azimuthDeg: venus.azimuthDeg - 20, altitudeDeg: venus.altitudeDeg * 1.5 }, {
      poher: (version: string) => {
        read.push(version)
        return Promise.resolve({ matrix: version === "rr0-2026" ? extended : matrix, labels: { ...labels, SkyLantern: "sky lantern" } })
      }
    })
    view.refresh()
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(read).toEqual(["rr0-2026"])
    const block = () => section.querySelector(".poher-block")!
    expect(block().querySelector("h4")!.textContent).toBe("From the matrix of Poher extended by RR0 (2026)")
    const lantern = [...block().querySelectorAll("li")].find(li => li.textContent!.includes("sky lantern"))!
    expect(lantern.textContent).toContain("added by RR0")
    const select = section.querySelector<HTMLSelectElement>(".poher-version select")!
    select.value = "poher-1977"
    select.dispatchEvent(new Event("change"))
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(read).toEqual(["rr0-2026", "poher-1977"])
    expect(block().querySelector("h4")!.textContent).toBe("From the matrix of Poher (1977)")
    expect(block().textContent).not.toContain("sky lantern")
    expect(localStorage.getItem("ufoathome.poherMatrixVersion")).toBe("poher-1977")
    localStorage.clear()
  })
})

describe("CandidatesView with re-entries and aircraft", () => {
  it("follows a re-entry and an aircraft of the record as candidates, each as the phenomenon of the matrix it is", async () => {
    // A re-entry crossing high over Paris from west to east during the first minute, and an airliner 20 km east at 3,000 ft.
    const reentry = {
      id: "test", object: { name: "TEST R/B" },
      track: [{ t: -60_000, lat: 48.85, lng: 1.5, altitudeKm: 80 }, { t: 60_000, lat: 48.85, lng: 3.2, altitudeKm: 70 }],
      fragments: [{ absoluteMagnitude: -6 }]
    }
    const startMs = date.getTime()
    const airliner = { icao: 0x3c6444, nonIcao: false, points: [{ t: startMs - 600_000, lat: 48.85, lng: 2.62, altitudeFt: 3000 }, { t: startMs + 600_000, lat: 48.85, lng: 2.62, altitudeFt: 3000 }] }
    const { view, section } = make({ azimuthDeg: 90, altitudeDeg: 3 }, {
      burning: () => ({ reentries: [reentry], fireballs: [] }),
      traffic: () => ({ tracks: [airliner], startMs, describe: () => ({ type: "A320", registration: "D-AIPX" }) })
    })
    view.refresh()
    await new Promise(resolve => setTimeout(resolve, 0))
    const heads = [...section.querySelectorAll(".candidate-head")].map(head => head.textContent!)
    expect(heads.some(head => head.startsWith("Re-entry TEST R/B"))).toBe(true)
    const aircraft = heads.find(head => head.startsWith("Aircraft A320 D-AIPX"))!
    expect(aircraft).toBeDefined()
    // East, low: where the account puts the light, within consolidated biases.
    expect(aircraft).toContain("Compatible with consolidated biases")
  })
})

describe("CandidatesView variants kept and interpretations", () => {
  it("keeps a variant in the recording as an interpretation, lists it, and removes it", async () => {
    const { view, section } = make({ azimuthDeg: venus.azimuthDeg - 20, altitudeDeg: venus.altitudeDeg * 1.5 })
    view.refresh()
    await new Promise(resolve => setTimeout(resolve, 0))
    const venusRow = [...section.querySelectorAll(".candidate")].find(row => row.textContent!.includes("Venus"))!
    ;[...venusRow.querySelectorAll<HTMLButtonElement>("button")].find(button => button.textContent === "Keep this variant")!.click()
    const kept = section.querySelector(".kept-variants")!
    expect(kept.textContent).toContain("Variants kept (1)")
    expect(kept.textContent).toContain("model: Consolidated readings (UFO@home)")
    ;[...kept.querySelectorAll<HTMLButtonElement>("button")].find(button => button.textContent === "Remove")!.click()
    expect(section.querySelector(".kept-variants")).toBeNull()
  })

  it("follows an interpretation of the account as a candidate, by the body that claims to be its phenomenon", async () => {
    const interpretation = { title: "Balloon", bodies: [{ id: "balloon", explains: ["ufo-1"], model: { id: "sphere" }, track: [{ t: 0 }] }] }
    const { view, section } = make({ azimuthDeg: 100, altitudeDeg: 20 }, {
      interpretations: () => [{ id: "reading-1", label: "Balloon", interpretation }],
      projectionAt: () => ({ aim: { azimuthDeg: 110, altitudeDeg: 15 }, angular: { widthDeg: 0.1 } })
    } as never)
    view.refresh()
    await new Promise(resolve => setTimeout(resolve, 0))
    const row = [...section.querySelectorAll(".candidate-head")].find(head => head.textContent!.startsWith("Interpretation: Balloon"))!
    expect(row.textContent).toContain("Compatible with consolidated biases")
  })
})
