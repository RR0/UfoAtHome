import { describe, expect, it } from "vitest"
import { OsmRailwayNames } from "../../../../src/render3d/terrain/providers/OsmRailwayNames.js"
import type { OverpassResponse } from "../../../../src/render3d/terrain/providers/OverpassClient.js"
import type { RailwayLine } from "../../../../src/render3d/terrain/RailwayProvider.js"

const BOUNDS = { south: 49.1, north: 49.11, west: 2.74, east: 2.76 }
const LAT = 49.105
/** A point `east` metres east of the box's west edge on its middle latitude, `north` metres north of it. */
const at = (east: number, north = 0) => ({ lat: LAT + north / 111320, lng: 2.74 + east / (111320 * Math.cos(LAT * Math.PI / 180)) })

/** The line under the RN2 at Silly-le-Long as the IGN draws it: one centre line for its two tracks, named nothing. */
const IGN: RailwayLine = { id: "ign", kind: "rail", gaugeMm: 1435, tracks: 2, electrification: "overhead", level: 0, points: [at(100), at(1300)] }

/** What OpenStreetMap answers there: its two tracks, a way each, 2 m either side of the IGN's line, and the routes that run on them. */
const ANSWER: OverpassResponse = {
  elements: [
    { type: "way", id: 1, tags: { railway: "rail", name: "Ligne de La Plaine à Hirson et Anor (frontière)", voltage: "25000" }, geometry: [at(0, 2), at(1400, 2)].map(p => ({ lat: p.lat, lon: p.lng })) },
    { type: "way", id: 2, tags: { railway: "rail", name: "Ligne de La Plaine à Hirson et Anor (frontière)", voltage: "25000" }, geometry: [at(0, -2), at(1400, -2)].map(p => ({ lat: p.lat, lon: p.lng })) },
    // A siding across it, which is not it.
    { type: "way", id: 3, tags: { railway: "rail", name: "Embranchement", service: "siding" }, geometry: [at(700, -300), at(700, 300)].map(p => ({ lat: p.lat, lon: p.lng })) },
    { type: "relation", id: 10, tags: { type: "route", route: "train", name: "Transilien K (AEKY) : Crépy-en-Valois → Gare du Nord", network: "Transilien", ref: "K" }, members: [{ type: "way", ref: 1 }, { type: "way", ref: 2 }] },
    { type: "relation", id: 11, tags: { type: "route", route: "train", name: "Transilien K (KEPY) : Gare du Nord → Crépy-en-Valois", network: "Transilien", ref: "K" }, members: [{ type: "way", ref: 2 }] },
    { type: "relation", id: 12, tags: { type: "route", route: "train", name: "TER K15 : Laon → Crépy-en-Valois → Paris Gare du Nord", network: "TER Hauts-de-France", ref: "K15" }, members: [{ type: "way", ref: 1 }] },
    { type: "relation", id: 13, tags: { type: "route", route: "train", network: "Fret" , ref: "F1" }, members: [{ type: "way", ref: 3 }] }
  ]
}

describe("OsmRailwayNames", () => {
  it("gives a line of the map the name, the voltage and the services of the OpenStreetMap tracks along it, and not those of one across it", () => {
    const [line] = OsmRailwayNames.apply([IGN], ANSWER, BOUNDS)
    expect(line.name).toBe("Ligne de La Plaine à Hirson et Anor (frontière)")
    expect(line.voltageV).toBe(25000)
    // Alphabetical where they run as far: the Transilien K on both tracks, the TER K15 on one.
    expect(line.services).toEqual(["TER K15", "Transilien K"])
    expect(line.points).toEqual(IGN.points)
  })

  it("gives a siding beside the main line neither its name, nor its trains, nor its voltage", () => {
    const siding: RailwayLine = { ...IGN, id: "siding", service: true, tracks: 1, electrification: "none", points: [at(100, 6), at(1300, 6)] }
    expect(OsmRailwayNames.apply([siding], ANSWER, BOUNDS)[0]).toEqual(siding)
  })

  it("leaves a line no track of OpenStreetMap runs along as it was, and keeps a name it had", () => {
    const far: RailwayLine = { ...IGN, id: "far", points: [at(100, 400), at(1300, 400)] }
    expect(OsmRailwayNames.apply([far], ANSWER, BOUNDS)[0]).toEqual(far)
    const named: RailwayLine = { ...IGN, name: "Its own name" }
    expect(OsmRailwayNames.apply([named], ANSWER, BOUNDS)[0].name).toBe("Its own name")
  })

  it("says a service as a reader says it: its name before its stops, without its code, else its network and its reference", () => {
    expect(OsmRailwayNames.serviceOf({ name: "Transilien K (AEKY) : Crépy-en-Valois → Gare du Nord" })).toBe("Transilien K")
    expect(OsmRailwayNames.serviceOf({ name: "RER B" })).toBe("RER B")
    expect(OsmRailwayNames.serviceOf({ network: "TER Hauts-de-France", ref: "K15" })).toBe("TER Hauts-de-France K15")
    expect(OsmRailwayNames.serviceOf({})).toBeUndefined()
  })
})
