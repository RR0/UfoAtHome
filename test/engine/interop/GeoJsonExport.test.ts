import { describe, expect, it } from "vitest"
import { GeoJsonExport } from "../../../src/engine/interop/GeoJsonExport.js"
import { GeoJsonImport } from "../../../src/engine/interop/GeoJsonImport.js"
import { geoExportTexts_en } from "../../../src/engine/interop/messages/GeoExportTexts_en.js"
import { fromSightingJson } from "../../../src/engine/persistence/sightingJson.js"
import { SaidTexts } from "../../../src/engine/model/SaidText.js"

const said = new SaidTexts(["en"])

/** The same observer as the KML export's: looking due east at what a reading calls a crane, with one
 * of an investigator's own lines beside it. */
const sighting = () => fromSightingJson({
  version: 4,
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
  traces: [{ id: "trace-1", kind: "polygon", title: "Site", source: "GEIPAN", color: "#ff0000", points: [{ lat: 49.08, lng: 2.3 }, { lat: 49.081, lng: 2.3 }, { lat: 49.081, lng: 2.301 }] }]
} as never)

const written = () => JSON.parse(GeoJsonExport.of(sighting(), "case-maffliers", geoExportTexts_en, said)) as {
  type: string, name: string, description: string, crs?: unknown,
  features: { properties: Record<string, unknown>, geometry: { type: string, coordinates: unknown } }[]
}

const feature = (name: string) => {
  const found = written().features.filter(candidate => String(candidate.properties.name).includes(name))
  expect(found).toHaveLength(1)
  return found[0]
}

describe("GeoJsonExport", () => {
  it("writes a WGS 84 FeatureCollection with no crs member, as RFC 7946 requires", () => {
    const collection = written()
    expect(collection.type).toBe("FeatureCollection")
    expect(collection.crs).toBeUndefined()
    expect(collection.name).toBe("case-maffliers — UFO@home")
    expect(collection.description).toContain("Heights are counted from the ground where the observer set off.")
  })

  it("says of each feature which group it is in, so an account's own data is never read as a reading's", () => {
    expect(written().features.map(one => one.properties.group)).toEqual(["observer", "sight-line", "body", "trace"])
    expect(feature("Spierings crane").properties.description).toContain("Somebody's interpretation")
  })

  it("says what a height is counted from, which GeoJSON has no word for", () => {
    expect(feature("Observer").properties.heights).toBe("observer-ground")
    // A trace that came in on the ground keeps what it came in with.
    expect(feature("Site").properties.heights).toBe("ground")
  })

  it("draws the line of sight east, and closes a polygon's ring as the standard wants", () => {
    const sight = feature("Line of sight — the light").geometry.coordinates as number[][]
    expect(sight[1][0]).toBeGreaterThan(sight[0][0])
    expect(sight[1][1]).toBeCloseTo(49.08, 3)
    const ring = (feature("Site").geometry.coordinates as number[][][])[0]
    expect(ring).toHaveLength(4)
    expect(ring[3]).toEqual(ring[0])
  })

  it("comes back through this project's own reader as what went out", () => {
    const text = GeoJsonExport.of(sighting(), "case", geoExportTexts_en, said)
    const read = GeoJsonImport.fromText(text)
    expect(read.documentName).toBe("case — UFO@home")
    expect(read.skipped).toEqual([])
    const site = read.traces.find(trace => trace.title === "Site")!
    expect(site.kind).toBe("polygon")
    // Closed on the way out, open again on the way in; colour and heights as they left.
    expect(site.points).toHaveLength(3)
    expect(site.color).toBe("#ff0000")
    expect(site.altitude).toBeUndefined()
    // A height over the ground where the observer set off reads back as a height over the ground.
    expect(read.traces.find(trace => trace.title?.toString().includes("Observer"))?.altitude).toBe("relative")
  })
})
