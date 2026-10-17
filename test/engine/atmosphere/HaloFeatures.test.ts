import { describe, expect, it } from "vitest"
import { HaloFeatures } from "../../../src/engine/atmosphere/HaloFeatures.js"
import { HaloSky, type CrystalPopulation, type HaloSkyMap } from "../../../src/engine/atmosphere/HaloSky.js"
import { IceHalos } from "../../../src/engine/atmosphere/IceHalos.js"

const RAYS = 800_000
const D = Math.PI / 180

/** The display's light at an altitude and a bearing offset, from the map the trace made. */
function radianceOf(map: HaloSkyMap) {
  return (altitudeDeg: number, aroundDeg: number): number => {
    if (altitudeDeg < -90 || altitudeDeg > 90) return 0
    const column = Math.min(map.width - 1, Math.max(0, Math.floor((Math.min(180, Math.abs(aroundDeg)) / 180) * map.width)))
    const row = Math.min(map.height - 1, Math.max(0, Math.floor(((altitudeDeg + 90) / 180) * map.height)))
    const at = (row * map.width + column) * 3
    return (map.data[at] + map.data[at + 1] + map.data[at + 2]) / 3
  }
}

/** The altitude and bearing offset of the point `separationDeg` from the source, `rollDeg` round from straight up. */
function pointAt(sourceAltitudeDeg: number, separationDeg: number, rollDeg: number): { altitude: number; around: number } {
  const h = sourceAltitudeDeg * D
  const s = separationDeg * D
  const r = rollDeg * D
  const x = Math.cos(s) * Math.cos(h) - Math.sin(s) * Math.cos(r) * Math.sin(h)
  const y = Math.sin(s) * Math.sin(r)
  const z = Math.cos(s) * Math.sin(h) + Math.sin(s) * Math.cos(r) * Math.cos(h)
  return { altitude: Math.asin(z) / D, around: Math.abs(Math.atan2(y, x) / D) }
}

const pyramids: CrystalPopulation[] = [{ orientation: "pyramidal", widthMicrons: 40, lengthMicrons: 120, share: 1, capFraction: 0.5 }]

describe("HaloFeatures, which names what a pointer is over and only where the display has light", () => {
  it("names a sundog where the trace puts one, and not on a sky whose crystals tumble", () => {
    const h = 20
    const swing = IceHalos.parheliaAzimuthDeg(h)!
    const aligned = radianceOf(new HaloSky().compute(h, 0.95, RAYS))
    expect(HaloFeatures.at(h, h, swing + 1.5, aligned)?.id).toBe("parhelion")
    const tumbling = radianceOf(new HaloSky().compute(h, 0, RAYS))
    expect(HaloFeatures.at(h, h, swing + 1.5, tumbling)?.id).not.toBe("parhelion")
  })

  it("names the common ring on its own radius, and nothing inside it", () => {
    const h = 20
    const ring = IceHalos.halo22()
    const map = radianceOf(new HaloSky().compute(h, 0, RAYS))
    const side = pointAt(h, ring.blueAngleDeg! + 0.3, 90)
    expect(HaloFeatures.at(h, side.altitude, side.around, map)?.id).toBe("halo22")
    const inside = pointAt(h, 14, 90)
    expect(HaloFeatures.at(h, inside.altitude, inside.around, map)).toBeUndefined()
  })

  it("names an odd-radius ring only where pyramid crystals made one, at the radius their wedge gives", () => {
    const h = 30
    const [nine] = HaloFeatures.oddRadiiDeg()
    expect(nine).toBeCloseTo(9, 0)
    const withPyramids = radianceOf(new HaloSky().compute(h, 0, RAYS * 3, 1, pyramids))
    const place = pointAt(h, nine + 0.4, 90)
    expect(HaloFeatures.at(h, place.altitude, place.around, withPyramids)).toMatchObject({ id: "oddRadius" })
    const plain = radianceOf(new HaloSky().compute(h, 0, RAYS * 3, 1, [{ orientation: "tumbling", widthMicrons: 40, lengthMicrons: 120, share: 1 }]))
    expect(HaloFeatures.at(h, place.altitude, place.around, plain)).toBeUndefined()
  })

  it("names the arc near the zenith at the altitude the top-face refraction gives", () => {
    const h = 15
    const zenithal = IceHalos.circumzenithalAltitudeDeg(h)!
    const map = radianceOf(new HaloSky().compute(h, 0.95, RAYS))
    expect(HaloFeatures.at(h, zenithal + 1.2, 0, map)?.id).toBe("circumzenithal")
  })
})

describe("what pointing at a feature says", () => {
  it("has, in every language, a short name before the dash and an explanation after it", async () => {
    const { OPTICS_TOOLTIPS_EN } = await import("../../../src/component/messages/OpticsTooltips.js")
    const { SceneNames_fr } = await import("../../../src/component/messages/SceneNames_fr.js").then(module => ({ SceneNames_fr: Object.values(module)[0] as { opticsTooltips: Record<string, string> } }))
    for (const texts of [OPTICS_TOOLTIPS_EN, SceneNames_fr.opticsTooltips]) {
      for (const text of Object.values(texts)) {
        const [name, explanation] = text.split(" — ")
        expect(name.length).toBeGreaterThan(0)
        expect(name.length).toBeLessThan(40)
        expect(explanation?.length ?? 0).toBeGreaterThan(name.length)
      }
    }
  })
})
