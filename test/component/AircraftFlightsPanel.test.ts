import { describe, expect, it, vi } from "vitest"
import { AircraftFlightsPanel } from "../../src/component/AircraftFlightsPanel.js"
import type { AircraftFlightView } from "../../src/component/SceneElement.js"

const TEXTS = {
  aircraftFlightsColumns: { flight: "Flight", distance: "Distance", direction: "Direction", height: "Height", altitude: "Altitude" },
  aircraftFlightsIntro: "Candidates",
  aircraftFlightAim: "Look",
  aircraftFlightLater: "Later",
  aircraftFlightAbsent: "Absent",
  aircraftFlightNotDrawn: "Not drawn",
  aircraftFlightUnknown: "Unknown type"
}
const inSky: AircraftFlightView = { key: "a", type: "Airbus A320", registration: "F-TEST", sky: { distanceKm: 17, azimuthDeg: 79, altitudeDeg: 38.9 }, altitudeFt: 35000, drawn: true, firstMs: 0 }
const later: AircraftFlightView = { key: "b", drawn: true, firstMs: 90_000 }
const outside: AircraftFlightView = { key: "c", drawn: false }

function panel(flights: AircraftFlightView[]) {
  const container = document.createElement("div")
  const aim = vi.fn()
  const shown = new AircraftFlightsPanel(container, aim, azimuthDeg => `E${azimuthDeg}`)
  shown.show(flights, TEXTS)
  const row = (key: string) => container.querySelector<HTMLTableRowElement>(`[data-flight="${key}"]`)!
  return { container, aim, shown, row }
}

describe("AircraftFlightsPanel", () => {
  it("says who a flight is and where to look", () => {
    const { row } = panel([inSky])
    const cells = [...row("a").cells].map(cell => cell.textContent)
    expect(cells[0]).toBe("Airbus A320 · F-TEST")
    expect(cells[1]).toBe("17 km")
    expect(cells[2]).toContain("E79")
    expect(cells[3]).toMatch(/^38[.,]9°$/)
    expect(cells[4]).toMatch(/^35.000 ft$/)
    expect(row("a").title).toBe("Look")
  })

  it("names what the record does not", () => {
    expect(panel([later]).row("b").cells[0].textContent).toBe("Unknown type")
  })

  it("says what a flight is once the record has said it, after the flight was found", () => {
    const { row, shown } = panel([{ ...inSky, type: undefined, registration: undefined }])
    expect(row("a").cells[0].textContent).toBe("Unknown type")
    shown.show([inSky], TEXTS)
    expect(row("a").cells[0].textContent).toBe("Airbus A320 · F-TEST")
  })

  it("marks a flight that is not in the sky now, and says whether it can be gone to", () => {
    const { row } = panel([later, outside])
    expect(row("b").classList.contains("absent")).toBe(true)
    expect(row("b").getAttribute("aria-disabled")).toBe("false")
    expect(row("b").title).toBe("Later")
    expect(row("c").getAttribute("aria-disabled")).toBe("true")
    expect(row("c").title).toBe("Absent. Not drawn")
  })

  it("keeps its rows as the time goes, so that a click on one is not lost, and aims at the flight as it stands now", () => {
    const { aim, row, shown } = panel([inSky])
    const before = row("a")
    const moved = { ...inSky, sky: { distanceKm: 20, azimuthDeg: 90, altitudeDeg: 30 } }
    shown.show([moved], TEXTS)
    expect(row("a")).toBe(before)
    expect(before.cells[1].textContent).toBe("20 km")
    before.click()
    expect(aim).toHaveBeenCalledWith(moved)
  })

  it("makes its rows again for other flights, and marks the one looked at", () => {
    const { row, shown, container } = panel([inSky])
    shown.select("a")
    expect(row("a").getAttribute("aria-selected")).toBe("true")
    shown.show([inSky, later], TEXTS)
    expect(row("a").getAttribute("aria-selected")).toBe("true")
    expect(row("b").getAttribute("aria-selected")).toBe("false")
    shown.show([], TEXTS)
    expect(container.children).toHaveLength(0)
  })
})
