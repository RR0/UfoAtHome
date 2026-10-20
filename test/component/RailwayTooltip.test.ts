import { describe, expect, it } from "vitest"
import { RailwayTooltip } from "../../src/component/RailwayTooltip.js"
import { sceneNames_fr } from "../../src/component/messages/SceneNames_fr.js"
import type { RailwayLine } from "../../src/render3d/terrain/RailwayProvider.js"

const LINE: RailwayLine = { id: "l", kind: "rail", gaugeMm: 1435, tracks: 2, electrification: "overhead", level: 0, points: [] }
const metres = (value: number) => `${Math.round(value)} m`

describe("RailwayTooltip", () => {
  it("names a line by its name, else by what it is", () => {
    expect(RailwayTooltip.name(LINE, RailwayTooltip.ENGLISH)).toBe("Railway")
    expect(RailwayTooltip.name({ ...LINE, highSpeed: true }, RailwayTooltip.ENGLISH)).toBe("High-speed line")
    expect(RailwayTooltip.name({ ...LINE, service: true }, RailwayTooltip.ENGLISH)).toBe("Siding")
    expect(RailwayTooltip.name({ ...LINE, name: "Ligne de La Plaine à Hirson" }, RailwayTooltip.ENGLISH)).toBe("Ligne de La Plaine à Hirson")
  })

  it("says with Alt its tracks, its wire and how high, and how far", () => {
    expect(RailwayTooltip.detail({ line: LINE, distanceM: 340, contactM: 5.5 }, RailwayTooltip.ENGLISH, metres, "en"))
      .toBe("Railway — 2 tracks, overhead wire 5.50 m above the rail, 340 m away")
    expect(RailwayTooltip.detail({ line: { ...LINE, name: "Ligne K" }, distanceM: 340, contactM: 5.5 }, sceneNames_fr.railwayTooltip, metres, "fr"))
      .toBe("Ligne K — voie ferrée, 2 voies, caténaire, fil de contact à 5,50 m au-dessus du rail, à 340 m")
  })

  it("says a line is not electrified only where the survey says so, and a gauge only where it is not the standard one", () => {
    const single = { ...LINE, tracks: 1, service: true }
    expect(RailwayTooltip.detail({ line: { ...single, electrification: "none" }, distanceM: 80 }, RailwayTooltip.ENGLISH, metres, "en"))
      .toBe("Siding — single track, not electrified, 80 m away")
    expect(RailwayTooltip.detail({ line: { ...single, electrification: undefined, gaugeMm: 1000 }, distanceM: 80 }, RailwayTooltip.ENGLISH, metres, "en"))
      .toBe("Siding — single track, metre gauge, 80 m away")
  })

  it("says which line it is and which trains run on it, and with Alt its voltage", () => {
    const silly: RailwayLine = { ...LINE, name: "Ligne de La Plaine à Hirson et Anor (frontière)", services: ["TER K15", "Transilien K"], voltageV: 25000 }
    expect(RailwayTooltip.name(silly, sceneNames_fr.railwayTooltip)).toBe("Ligne de La Plaine à Hirson et Anor (frontière) — TER K15, Transilien K")
    expect(RailwayTooltip.detail({ line: silly, distanceM: 196, contactM: 5.5 }, sceneNames_fr.railwayTooltip, metres, "fr"))
      .toBe("Ligne de La Plaine à Hirson et Anor (frontière) — TER K15, Transilien K; voie ferrée, 2 voies, caténaire en 25 kV, fil de contact à 5,50 m au-dessus du rail, à 196 m")
    expect(RailwayTooltip.voltage(1500, "fr")).toBe("1,5 kV")
    expect(RailwayTooltip.voltage(750, "en")).toBe("750 V")
  })
})
