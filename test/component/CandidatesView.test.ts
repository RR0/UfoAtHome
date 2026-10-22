// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { CandidatesView } from "../../src/component/CandidatesView.js"
import { witnessErrorMessages_en } from "../../src/component/messages/WitnessErrorMessages_en.js"
import { WitnessError } from "../../src/engine/witness/WitnessError.js"
import { computeBodyPosition } from "../../src/engine/astronomy/CelestialPositions.js"
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

function make(aim: { azimuthDeg: number, altitudeDeg: number }) {
  const timeline = new Timeline()
  timeline.addKeyframe(0, [{ sourceId: "ufo-1", shape: { ...createOval({ x: 0, y: 0, width: 10, height: 10 }), aim, angular: { widthDeg: 0.1, heightDeg: 0.1 } } }])
  const sighting = { timeline, provenance: Provenance.empty(), event: {} } as never
  const card = document.createElement("div")
  const section = document.createElement("div")
  const heading = document.createElement("label")
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
    satellites: () => undefined
  }, section)
  return { view, card, section, heading }
}

describe("CandidatesView", () => {
  it("finds Venus compatible with consolidated biases when the account puts the light a little higher and turned, and shows that variant", () => {
    const { view, card, section, heading } = make({ azimuthDeg: venus.azimuthDeg - 20, altitudeDeg: venus.altitudeDeg * 1.5 })
    view.refresh()
    const first = section.querySelector(".candidate")!
    expect(first.querySelector(".candidate-head")!.textContent).toContain("Venus")
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
