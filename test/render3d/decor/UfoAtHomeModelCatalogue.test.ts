import { describe, expect, it, vi } from "vitest"
import { UfoAtHomeModelCatalogue, UFOATHOME_MODEL_INDEX_URL } from "../../../src/render3d/decor/providers/UfoAtHomeModelCatalogue.js"

const CATALOGUE = {
  version: 1,
  models: [
    {
      id: "patrol-sedan-1964",
      kind: "vehicle",
      name: "American sedan, 1960s",
      file: "patrol-sedan-1964.glb",
      credit: { title: "American sedan", author: "Someone", license: "CC0 1.0" },
      sizeM: { widthM: 2.02, lengthM: 5.44, heightM: 1.42 }
    },
    {
      id: "powder-magazine",
      kind: "building",
      name: "Powder magazine",
      file: "sheds/powder-magazine.glb",
      credit: { title: "Powder magazine", license: "CC0 1.0" }
    }
  ]
}

function respondingWith(bodyByUrl: Record<string, unknown>): typeof fetch {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    const body = bodyByUrl[url]
    return body === undefined
      ? ({ ok: false, status: 404, json: async () => ({}) } as Response)
      : ({ ok: true, status: 200, json: async () => body } as Response)
  }) as unknown as typeof fetch
}

describe("UfoAtHomeModelCatalogue", () => {
  it("turns each entry's index-relative file into a full address, so the whole directory can be copied elsewhere", async () => {
    const catalogue = new UfoAtHomeModelCatalogue({
      indexUrls: ["https://example.test/models/index.json"],
      fetchImpl: respondingWith({ "https://example.test/models/index.json": CATALOGUE })
    })
    const [sedan, magazine] = await catalogue.entries()
    expect(sedan.url).toBe("https://example.test/models/patrol-sedan-1964.glb")
    expect(magazine.url).toBe("https://example.test/models/sheds/powder-magazine.glb")
  })

  it("prefers a catalogue served beside the page over this project's own", async () => {
    const fetchImpl = respondingWith({
      "https://mirror.test/models/index.json": CATALOGUE,
      [UFOATHOME_MODEL_INDEX_URL]: { version: 1, models: [] }
    })
    const catalogue = new UfoAtHomeModelCatalogue({
      indexUrls: ["https://mirror.test/models/index.json", UFOATHOME_MODEL_INDEX_URL],
      fetchImpl
    })
    expect(await catalogue.entries()).toHaveLength(2)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it("falls through to this project's own when the page hosts none — the ordinary case everywhere but this site", async () => {
    const catalogue = new UfoAtHomeModelCatalogue({
      indexUrls: ["https://rr0.test/models/index.json", UFOATHOME_MODEL_INDEX_URL],
      fetchImpl: respondingWith({ [UFOATHOME_MODEL_INDEX_URL]: CATALOGUE })
    })
    expect((await catalogue.entries()).map(entry => entry.id)).toEqual(["patrol-sedan-1964", "powder-magazine"])
  })

  it("offers a kind only the models that can stand for it", async () => {
    const catalogue = new UfoAtHomeModelCatalogue({
      indexUrls: ["https://example.test/models/index.json"],
      fetchImpl: respondingWith({ "https://example.test/models/index.json": CATALOGUE })
    })
    expect((await catalogue.entries("vehicle")).map(entry => entry.id)).toEqual(["patrol-sedan-1964"])
    expect(await catalogue.entries("streetlight")).toEqual([])
  })

  it("answers an id it doesn't hold with nothing, which is not an error — the recording then draws its built-in shape", async () => {
    const catalogue = new UfoAtHomeModelCatalogue({
      indexUrls: ["https://example.test/models/index.json"],
      fetchImpl: respondingWith({ "https://example.test/models/index.json": CATALOGUE })
    })
    expect(await catalogue.entry("no-such-model")).toBeUndefined()
    expect((await catalogue.entry("powder-magazine"))?.credit.license).toBe("CC0 1.0")
  })

  it("comes back empty rather than throwing when no catalogue answers at all", async () => {
    // Offline, or a host that mirrors nothing and cannot reach this site. Every recording then
    // draws its primitives, exactly as it did before models existed — nothing is broken, so
    // nothing is thrown.
    const catalogue = new UfoAtHomeModelCatalogue({
      indexUrls: ["https://nowhere.test/models/index.json"],
      fetchImpl: (() => {
        throw new TypeError("Failed to fetch")
      }) as unknown as typeof fetch
    })
    expect(await catalogue.entries()).toEqual([])
  })

  it("fetches the catalogue once however often it is asked — the editor asks on every decor selection", async () => {
    const fetchImpl = respondingWith({ "https://example.test/models/index.json": CATALOGUE })
    const catalogue = new UfoAtHomeModelCatalogue({ indexUrls: ["https://example.test/models/index.json"], fetchImpl })
    await Promise.all([catalogue.entries(), catalogue.entries("vehicle"), catalogue.entry("powder-magazine")])
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })
})
