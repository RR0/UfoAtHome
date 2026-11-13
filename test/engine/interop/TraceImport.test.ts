import { describe, expect, it } from "vitest"
import { zipSync, strToU8 } from "fflate"
import { TraceImport } from "../../../src/engine/interop/TraceImport.js"

const KML = `<?xml version="1.0"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>Earth</name>
  <Placemark><name>Ferme</name><Point><coordinates>2.3,49.0,0</coordinates></Point></Placemark>
</Document></kml>`

const GEOJSON = '{"type":"Feature","properties":{"name":"Chantier"},"geometry":{"type":"Point","coordinates":[2.3,48.86]}}'

describe("TraceImport", () => {
  it("reads which format a file is in off the file, not off its name", async () => {
    expect((await TraceImport.fromText(KML)).traces[0].title).toBe("Ferme")
    expect((await TraceImport.fromText(GEOJSON)).traces[0].title).toBe("Chantier")
    // Leading blanks and a document that starts with an array are GeoJSON all the same.
    expect((await TraceImport.fromText(`\n  ${GEOJSON}`)).traces).toHaveLength(1)
  })

  it("unzips a KMZ, which is the one of the three that is not text", async () => {
    const kmz = zipSync({ "doc.kml": strToU8(KML) })
    const result = await TraceImport.fromBytes(new Uint8Array(kmz))
    expect(result.documentName).toBe("Earth")
    expect(result.traces[0].title).toBe("Ferme")
  })

  it("reads bytes of either text format", async () => {
    const bytes = (text: string) => new TextEncoder().encode(text)
    expect((await TraceImport.fromBytes(bytes(GEOJSON))).traces[0].kind).toBe("point")
    expect((await TraceImport.fromBytes(bytes(KML))).traces[0].kind).toBe("point")
  })
})
