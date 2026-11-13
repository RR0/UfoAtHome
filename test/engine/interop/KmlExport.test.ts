import { describe, expect, it } from "vitest"
import { KmlExport } from "../../../src/engine/interop/KmlExport.js"
import { GeographicFigures } from "../../../src/engine/interop/GeographicFigures.js"
import { geoExportTexts_en } from "../../../src/engine/interop/messages/GeoExportTexts_en.js"
import { fromSightingJson } from "../../../src/engine/persistence/sightingJson.js"
import { SaidTexts } from "../../../src/engine/model/SaidText.js"

const said = new SaidTexts(["en"])

/** A observer at Maffliers who looks due east at something a reading calls a crane, with one of an
 * investigator's own lines brought in beside it. */
const sighting = () => fromSightingJson({
  version: 4,
  time: "2012-06-29T06:06:00",
  place: { name: "Maffliers", locations: [{ lat: 49.08, lng: 2.3 }] },
  observerTrack: { keyframes: [{ t: 0, pose: { lat: 49.08, lng: 2.3, elevationM: 0, headingDeg: 90 } }] },
  timeline: {
    keyframes: [{
      t: 0,
      shapes: [{ sourceId: "ufo", shape: { kind: "oval", title: "the light", bounds: { x: 0, y: 0, width: 10, height: 10 }, aim: { azimuthDeg: 90, altitudeDeg: 0 } } }]
    }]
  },
  interpretation: {
    bodies: [{ id: "crane", title: "Spierings crane", model: { id: "ellipsoid" }, track: [{ t: 0, eastM: 500, northM: 0, altitudeAboveGroundM: 40 }] }]
  },
  traces: [{ id: "trace-1", kind: "line", title: "Line of sight T1", source: "GEIPAN", color: "#ff0000", altitude: "relative", points: [{ lat: 49.08, lng: 2.3, altM: 2 }, { lat: 49.081, lng: 2.31, altM: 50 }] }]
} as never)

/** The coordinates of the placemark whose name holds `what`, as [lng, lat, alt] triples. */
const coordinatesOf = (kml: string, what: string): number[][] => {
  const marks = kml.split("<Placemark>").filter(mark => mark.includes(what))
  expect(marks).toHaveLength(1)
  const coordinates = /<coordinates>([^<]*)<\/coordinates>/.exec(marks[0])![1]
  return coordinates.trim().split(/\s+/).map(tuple => tuple.split(",").map(Number))
}

describe("KmlExport", () => {
  it("writes where the observer stood, the directions stated, what a reading places, and the traces brought in", () => {
    const kml = KmlExport.of(sighting(), "case-maffliers", geoExportTexts_en, said)
    expect(kml).toContain("<name>case-maffliers — UFO@home</name>")
    for (const folder of ["Observer", "Lines of sight", "What a reading places", "Investigator's traces"]) {
      expect(kml).toContain(`<name>${folder}</name>`)
    }
    // What heights are counted from is in the document itself, not left to be guessed.
    expect(kml).toContain("Heights are counted from the ground where the observer set off.")
  })

  it("draws a line of sight along the azimuth the account states, at a length it calls conventional", () => {
    const kml = KmlExport.of(sighting(), "case", geoExportTexts_en, said)
    const [start, end] = coordinatesOf(kml, "Line of sight — the light")
    expect(start[0]).toBeCloseTo(2.3, 6)
    expect(start[1]).toBeCloseTo(49.08, 6)
    // Due east, 5 km: the latitude holds and the longitude grows.
    expect(end[1]).toBeCloseTo(49.08, 3)
    expect(end[0]).toBeGreaterThan(2.3)
    expect(end[0] - 2.3).toBeCloseTo(GeographicFigures.SIGHT_LINE_M / (111320 * Math.cos(49.08 * Math.PI / 180)), 2)
    expect(kml).toContain("is conventional")
  })

  it("puts a body where its own track puts it, 500 m east of the observer", () => {
    const kml = KmlExport.of(sighting(), "case", geoExportTexts_en, said)
    const [point] = coordinatesOf(kml, "Spierings crane")
    expect(point[1]).toBeCloseTo(49.08, 4)
    expect(point[0] - 2.3).toBeCloseTo(500 / (111320 * Math.cos(49.08 * Math.PI / 180)), 3)
    // Its CENTRE, as a placed body is (see BodyState): 40 m of ground clearance plus half of its metre.
    expect(point[2]).toBeCloseTo(40.5, 1)
    // Somebody's reading, and said to be.
    expect(kml).toContain("Somebody's interpretation, not the account.")
  })

  it("gives a trace back as it came in: same coordinates, same colour, same altitude mode", () => {
    const kml = KmlExport.of(sighting(), "case", geoExportTexts_en, said)
    expect(coordinatesOf(kml, "Line of sight T1")).toEqual([[2.3, 49.08, 2], [2.31, 49.081, 50]])
    const mark = kml.split("<Placemark>").find(part => part.includes("Line of sight T1"))!
    // KML writes a colour as aabbggrr, opaque.
    expect(mark).toContain("<color>ff0000ff</color>")
    expect(mark).toContain("<altitudeMode>relativeToGround</altitudeMode>")
  })

  it("writes a path for an observer who moved, and none for one who stood still", () => {
    const still = KmlExport.of(sighting(), "case", geoExportTexts_en, said)
    expect(still).not.toContain("Observer's path")
    const walked = fromSightingJson({
      version: 4,
      place: { name: "Maffliers", locations: [{ lat: 49.08, lng: 2.3 }] },
      observerTrack: { keyframes: [{ t: 0, pose: { lat: 49.08, lng: 2.3 } }, { t: 10000, pose: { lat: 49.081, lng: 2.302 } }] },
      timeline: { keyframes: [] }
    } as never)
    const moving = KmlExport.of(walked, "case", geoExportTexts_en, said)
    expect(coordinatesOf(moving, "Observer's path")).toHaveLength(2)
  })

  it("writes nothing geographic for a recording with no place: no folder rather than a guess", () => {
    const nowhere = fromSightingJson({ version: 4, timeline: { keyframes: [] } } as never)
    const kml = KmlExport.of(nowhere, "draft", geoExportTexts_en, said)
    expect(kml).not.toContain("<Folder>")
    expect(kml).toContain("<name>draft — UFO@home</name>")
  })
})
