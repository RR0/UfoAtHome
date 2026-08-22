import { describe, expect, it, vi } from "vitest"
import { NominatimPlaceProvider } from "../../src/engine/place/providers/NominatimPlaceProvider.js"

/** Nominatim's real jsonv2 shape (verified against a live "Valensole" query). */
const VALENSOLE = {
  display_name: "Valensole, Forcalquier, Alpes-de-Haute-Provence, Provence-Alpes-Côte d'Azur, 04210, France",
  name: "Valensole",
  lat: "43.8379283",
  lon: "5.9839867"
}

function providerReturning(results: unknown): {
  provider: NominatimPlaceProvider
  fetchMock: ReturnType<typeof vi.fn>
} {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(results) })
  return { provider: new NominatimPlaceProvider({ fetchImpl: fetchMock as unknown as typeof fetch }), fetchMock }
}

describe("NominatimPlaceProvider", () => {
  it("asks for the typed name and returns coordinates for it", async () => {
    const { provider, fetchMock } = providerReturning([VALENSOLE])
    const matches = await provider.search("Valensole")

    expect((fetchMock.mock.calls[0][0] as string)).toContain("q=Valensole")
    expect(matches).toEqual([{ name: VALENSOLE.display_name, lat: 43.8379283, lng: 5.9839867 }])
  })

  it("keeps the fully qualified name, not the bare one — that is the point of it", async () => {
    const { provider } = providerReturning([VALENSOLE])
    const matches = await provider.search("Valensole")

    expect(matches[0].name).toContain("France")
  })

  it("passes the reader's language through, so a place is named in it", async () => {
    const { provider, fetchMock } = providerReturning([VALENSOLE])
    await provider.search("London", { language: "fr" })

    expect(fetchMock.mock.calls[0][0] as string).toContain("accept-language=fr")
  })

  it("offers every candidate a name matched, in the source's own order", async () => {
    const { provider } = providerReturning([
      { display_name: "Springfield, Illinois, United States", lat: "39.8", lon: "-89.6" },
      { display_name: "Springfield, Massachusetts, United States", lat: "42.1", lon: "-72.6" }
    ])
    const matches = await provider.search("Springfield")

    expect(matches.map(match => match.name)).toEqual([
      "Springfield, Illinois, United States",
      "Springfield, Massachusetts, United States"
    ])
  })

  it("finds nothing without asking when the name is blank", async () => {
    const { provider, fetchMock } = providerReturning([VALENSOLE])

    await expect(provider.search("   ")).resolves.toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("returns an empty list for a name nothing matches", async () => {
    const { provider } = providerReturning([])

    await expect(provider.search("Zzzzz")).resolves.toEqual([])
  })

  it("throws on an HTTP failure — 'we couldn't ask' is not 'there is no such place'", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 429 })
    const provider = new NominatimPlaceProvider({ fetchImpl: fetchMock as unknown as typeof fetch })

    await expect(provider.search("Valensole")).rejects.toThrow("429")
  })

  it("drops a result with no usable coordinates rather than offering NaN", async () => {
    const { provider } = providerReturning([{ display_name: "Nowhere", lat: "", lon: "" }, VALENSOLE])
    const matches = await provider.search("Valensole")

    expect(matches).toHaveLength(1)
    expect(matches[0].lat).toBe(43.8379283)
  })

  it("asks once per distinct query — the service asks to be spared", async () => {
    const { provider, fetchMock } = providerReturning([VALENSOLE])
    await provider.search("Valensole")
    await provider.search("Valensole")

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("credits the data, which its licence requires", () => {
    const { provider } = providerReturning([VALENSOLE])

    expect(provider.attribution.text).toContain("OpenStreetMap")
    expect(provider.attribution.url).toContain("osm.org/copyright")
  })
})
