import { describe, expect, it } from "vitest"
import { zipSync, strToU8 } from "fflate"
import { KmlImport } from "../../../src/engine/interop/KmlImport.js"

const KML = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:gx="http://www.google.com/kml/ext/2.2">
<Document><name>Enquête Maffliers</name>
  <Style id="red"><LineStyle><color>ff0000ff</color></LineStyle></Style>
  <StyleMap id="m"><Pair><key>normal</key><styleUrl>#red</styleUrl></Pair><Pair><key>highlight</key><styleUrl>#red</styleUrl></Pair></StyleMap>
  <Folder><name>Lignes</name>
    <Placemark><name>Visée P024</name><styleUrl>#m</styleUrl>
      <LineString><altitudeMode>relativeToGround</altitudeMode><coordinates>2.3,49.0,2 2.31,49.01,300</coordinates></LineString>
    </Placemark>
    <Placemark><name>Ferme</name><Point><coordinates>2.30,49.00,0</coordinates></Point></Placemark>
    <Placemark><name>Zone</name><Polygon><outerBoundaryIs><LinearRing><coordinates>
      2.3,49.0 2.4,49.0 2.4,49.1 2.3,49.0</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark>
    <Placemark><name>Trace GPS</name><gx:Track><gx:coord>2.3 49.0 10</gx:coord></gx:Track></Placemark>
    <Placemark><name>Mauvaise</name><LineString><coordinates>2.3,49.0</coordinates></LineString></Placemark>
  </Folder>
  <GroundOverlay><name>carte</name></GroundOverlay>
</Document></kml>`

describe("KmlImport", () => {
  it("reads lines, places and outlines with their names, colours and altitude modes", () => {
    const { traces, documentName } = KmlImport.fromText(KML)
    expect(documentName).toBe("Enquête Maffliers")
    expect(traces.map(trace => [trace.kind, trace.title])).toEqual([["line", "Visée P024"], ["point", "Ferme"], ["polygon", "Zone"]])
    expect(traces[0]).toMatchObject({ altitude: "relative", color: "#ff0000", points: [{ lat: 49, lng: 2.3, altM: 2 }, { lat: 49.01, lng: 2.31, altM: 300 }] })
    expect(traces[1].points).toEqual([{ lat: 49, lng: 2.3 }])
    expect(traces[1].altitude).toBeUndefined()
  })

  it("drops the point that closes a ring, and says what it left out", () => {
    const { traces, skipped } = KmlImport.fromText(KML)
    expect(traces[2].points).toHaveLength(3)
    expect(skipped.sort()).toEqual(["GroundOverlay", "Track"])
  })

  it("refuses what is not XML", () => {
    expect(() => KmlImport.fromText("not xml <<")).toThrow()
  })

  it("reads a KMZ as the KML it zips", async () => {
    const zipped = zipSync({ "doc.kml": strToU8(KML) })
    const { traces } = await KmlImport.fromBytes(zipped)
    expect(traces).toHaveLength(3)
  })
})
