import { describe, expect, it } from "vitest"
import { PanoramaxPictures } from "../../src/engine/reference/PanoramaxPictures.js"

/** What Panoramax answered for a box around Cussac on 2026-09-12, cut down to two pictures. */
const ANSWER = {
  features: [
    {
      id: "far",
      geometry: { coordinates: [2.9263635, 44.9613073] },
      properties: { datetime: "2026-05-17T10:12:00Z", "view:azimuth": 168, "pers:interior_orientation": { field_of_view: 360 }, license: "CC-BY-SA-4.0", providers: [{ name: "Someone" }] },
      assets: { hd: { href: "https://panoramax.openstreetmap.fr/images/far-hd.jpg" }, sd: { href: "https://panoramax.openstreetmap.fr/images/far-sd.jpg" }, thumb: { href: "https://panoramax.openstreetmap.fr/images/far-thumb.jpg" } }
    },
    {
      id: "near",
      geometry: { coordinates: [2.9181, 44.98135] },
      properties: { datetime: "2025-08-01T08:00:00Z", "view:azimuth": 260, "pers:interior_orientation": { field_of_view: 70 }, license: "CC-BY-SA-4.0" },
      assets: { sd: { href: "https://panoramax.openstreetmap.fr/images/near-sd.jpg" } }
    },
    {
      id: "no-picture",
      geometry: { coordinates: [2.9174, 44.9813] },
      properties: {},
      assets: {}
    }
  ]
}

describe("PanoramaxPictures", () => {
  it("asks for a box around the spot and answers with the pictures inside the radius, nearest first", async () => {
    const asked: string[] = []
    const pictures = new PanoramaxPictures(url => {
      asked.push(url)
      return Promise.resolve(ANSWER)
    })
    const found = await pictures.nearby(44.981270, 2.917384, 300)
    expect(asked).toHaveLength(1)
    expect(asked[0]).toContain("https://api.panoramax.xyz/api/search?bbox=")
    expect(found.map(picture => picture.id)).toEqual(["near"])
    const near = found[0]!
    // 8.9 m north and 56.3 m east of the witness, by the flat approximation.
    expect(near.distanceM).toBeCloseTo(57.0, 0)
    expect(near.bearingDeg).toBeCloseTo(81.0, 0)
    expect(near.azimuthDeg).toBe(260)
    expect(near.panorama).toBe(false)
    expect(near.src).toBe("https://panoramax.openstreetmap.fr/images/near-sd.jpg")
    expect(near.credit).toBe("Panoramax (CC-BY-SA-4.0)")
    expect(near.creditUrl).toContain("pic=near")
  })

  it("keeps the full-turn pictures apart, credits who took them, and prefers the size a scene can carry", async () => {
    const pictures = new PanoramaxPictures(() => Promise.resolve(ANSWER))
    const found = await pictures.nearby(44.9613, 2.9264, 100)
    expect(found.map(picture => picture.id)).toEqual(["far"])
    const far = found[0]!
    expect(far.panorama).toBe(true)
    expect(far.src).toBe("https://panoramax.openstreetmap.fr/images/far-sd.jpg")
    expect(far.srcFull).toBe("https://panoramax.openstreetmap.fr/images/far-hd.jpg")
    expect(far.credit).toBe("Panoramax — Someone (CC-BY-SA-4.0)")
  })

  it("measures an offset the way the map does", () => {
    const north = PanoramaxPictures.offset(44.98, 2.92, 44.99, 2.92)
    expect(north.distanceM).toBeCloseTo(1111.9, 0)
    expect(north.bearingDeg).toBeCloseTo(0, 6)
    const east = PanoramaxPictures.offset(44.98, 2.92, 44.98, 2.93)
    expect(east.bearingDeg).toBeCloseTo(90, 6)
    expect(east.distanceM).toBeCloseTo(786.7, 0)
  })
})
