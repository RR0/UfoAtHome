import { describe, expect, it } from "vitest"
import { GeoJsonImport } from "../../../src/engine/interop/GeoJsonImport.js"

/** What a GIS exports: a layer of an investigator's own lines, named and coloured as simplestyle says. */
const LAYER = JSON.stringify({
  type: "FeatureCollection",
  name: "Enquête PARIS 2024",
  features: [
    { type: "Feature", properties: { name: "Visée T1", stroke: "#F00" }, geometry: { type: "LineString", coordinates: [[2.3, 48.86], [2.31, 48.87, 120]] } },
    { type: "Feature", properties: { nom: "Chantier" }, geometry: { type: "Point", coordinates: [2.305, 48.865] } },
    { type: "Feature", properties: { name: "Emprise" }, geometry: { type: "Polygon", coordinates: [[[2.3, 48.86], [2.31, 48.86], [2.31, 48.87], [2.3, 48.86]]] } },
    { type: "Feature", properties: { name: "Trop court" }, geometry: { type: "LineString", coordinates: [[2.3, 48.86]] } },
    { type: "Feature", properties: { name: "Sans forme" }, geometry: null }
  ]
})

describe("GeoJsonImport", () => {
  it("reads the points, lines and outlines of a layer with their names and colours", () => {
    const { traces, documentName, skipped } = GeoJsonImport.fromText(LAYER)
    expect(documentName).toBe("Enquête PARIS 2024")
    expect(traces.map(trace => [trace.kind, trace.title])).toEqual([["line", "Visée T1"], ["point", "Chantier"], ["polygon", "Emprise"]])
    // A height is metres above sea level, which is what GeoJSON's third ordinate means.
    expect(traces[0]).toMatchObject({ color: "#ff0000", altitude: "absolute", points: [{ lat: 48.86, lng: 2.3 }, { lat: 48.87, lng: 2.31, altM: 120 }] })
    expect(traces[1].altitude).toBeUndefined()
    // A ring written closed is not kept closed: a polygon is closed by being one.
    expect(traces[2].points).toHaveLength(3)
    // A line of one point is no line, and a feature with no geometry is nothing to draw: both said.
    expect(skipped).toEqual(["Feature without geometry"])
  })

  it("reads a lone feature, a bare geometry and a collection of them", () => {
    expect(GeoJsonImport.fromText('{"type":"Point","coordinates":[2.3,48.86]}').traces).toHaveLength(1)
    expect(GeoJsonImport.fromText('{"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[2.3,48.86]}}').traces).toHaveLength(1)
    const several = GeoJsonImport.fromText(JSON.stringify({
      type: "GeometryCollection",
      geometries: [{ type: "MultiPoint", coordinates: [[2.3, 48.86], [2.4, 48.9]] }, { type: "Tetrahedron", coordinates: [] }]
    }))
    expect(several.traces.map(trace => trace.kind)).toEqual(["point", "point"])
    expect(several.skipped).toEqual(["Tetrahedron"])
  })

  it("says it when a polygon's holes are dropped: a trace holds one outline", () => {
    const holed = GeoJsonImport.fromText(JSON.stringify({
      type: "Polygon",
      coordinates: [[[2.3, 48.86], [2.4, 48.86], [2.4, 48.9], [2.3, 48.86]], [[2.32, 48.87], [2.33, 48.87], [2.33, 48.88], [2.32, 48.87]]]
    }))
    expect(holed.traces).toHaveLength(1)
    expect(holed.skipped).toEqual(["Polygon holes"])
  })

  it("refuses a file in another coordinate system rather than reading an easting as a longitude", () => {
    const lambert = JSON.stringify({
      type: "FeatureCollection",
      crs: { type: "name", properties: { name: "urn:ogc:def:crs:EPSG::2154" } },
      features: [{ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [652000, 6862000] } }]
    })
    expect(() => GeoJsonImport.fromText(lambert)).toThrow(/EPSG::2154/)
    // The one it is meant to be in passes, however it is named.
    const wgs = JSON.stringify({
      type: "FeatureCollection",
      crs: { type: "name", properties: { name: "urn:ogc:def:crs:OGC:1.3:CRS84" } },
      features: [{ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [2.3, 48.86] } }]
    })
    expect(GeoJsonImport.fromText(wgs).traces).toHaveLength(1)
  })

  it("refuses what is not GeoJSON at all", () => {
    expect(() => GeoJsonImport.fromText("{ not json")).toThrow()
    expect(() => GeoJsonImport.fromText('{"hello":"world"}')).toThrow()
  })
})
