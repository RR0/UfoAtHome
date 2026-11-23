import { describe, expect, it } from "vitest"
import { Vector3 } from "three"
import type { Material } from "three"
import { AerialPerspective } from "../../../src/engine/atmosphere/AerialPerspective.js"
import { SearchlightSystem } from "../../../src/modules/sky-events/searchlights/SearchlightSystem.js"
import type { SearchlightJson } from "../../../src/modules/sky-events/searchlights/Searchlight.js"
import type { SkyEventClouds, SkyEventCloudLight, SkyEventFrame } from "../../../src/modules/sky-events/SkyEventKind.js"

/** A skytracker 3 km north-west of the eye, as in the demo. */
const SKYTRACKER: SearchlightJson = { id: "club", lat: 45.7491, lng: 4.9527, heightM: 6, beams: 4, tiltDeg: 30, periodS: 12 }

/** A flat deck from 900 to 1400 m, as opaque as `extinction` a metre, or none. */
const deck = (extinction: number, dimmed: Material[]): SkyEventClouds => ({
  bottomY: 900,
  topY: 1400,
  extinctionAt: (_x, y) => (y >= 900 && y <= 1400 ? extinction : 0),
  dim: material => { dimmed.push(material) }
})

const frame = (clouds: SkyEventClouds | undefined, lit: SkyEventCloudLight[][]): SkyEventFrame => ({
  reference: { lat: 45.73, lng: 4.98 },
  origin: { x: 0, z: 0 },
  eastScale: 1,
  siteElevationM: 200,
  eye: new Vector3(0, 1.6, 0),
  pixelRad: 0.0005,
  relativeScale: 10,
  air: new AerialPerspective(),
  transmittanceTo: () => [1, 1, 1],
  groundYAt: () => 0,
  observer: { lat: 45.73, lng: 4.98, heightM: 201.6 },
  magnitudeLimit: 5,
  cloudTransmission: () => 1,
  arrivingIlluminance: () => [0, 0, 0],
  transmittanceFromSpace: () => [1, 1, 1],
  lightFrom: () => undefined,
  glareFrom: () => undefined,
  lightClouds: lights => { lit.push([...lights]) },
  clouds
})

describe("SearchlightSystem", () => {
  it("lights the clouds with each of its beams, from its lamp, at a skytracker's intensity through the air", () => {
    const dimmed: Material[] = []
    const lit: SkyEventCloudLight[][] = []
    const system = new SearchlightSystem()
    system.update([SKYTRACKER], 0, frame(deck(0.01, dimmed), lit))
    expect(lit).toHaveLength(1)
    const lights = lit[0]
    expect(lights).toHaveLength(4)
    for (const light of lights) {
      // 3 km north-west, 6 m up, its axis rising.
      expect(Math.hypot(light.x, light.z)).toBeCloseTo(3000, -2)
      expect(light.x).toBeLessThan(0)
      expect(light.z).toBeLessThan(0)
      expect(light.y).toBeCloseTo(6, 6)
      expect(light.axis.y).toBeGreaterThan(Math.cos((31 * Math.PI) / 180))
      expect(light.fwhmRad).toBeCloseTo(Math.PI / 180, 9)
      // 3 × 10⁸ cd × the scene's scale, a little less for the air under the deck, white.
      const luminance = 0.2126 * light.rgb[0] + 0.7152 * light.rgb[1] + 0.0722 * light.rgb[2]
      expect(luminance).toBeGreaterThan(0.7 * 3e9)
      expect(luminance).toBeLessThan(3e9)
      // Nothing under the deck to take any of it; past its base, what the deck took.
      expect(light.throughCloudsBelow!(900)).toBe(1)
      expect(light.throughCloudsBelow!(1000)).toBeLessThan(0.1)
    }
    // The beams in the air dimmed by the clouds between the eye and them.
    expect(dimmed).toHaveLength(1)
    expect(system.drawnCount).toBeGreaterThan(0)
    system.dispose()
  })

  it("stops a beam in an overcast's base, and follows one through a clear sky far up", () => {
    const longest = (clouds: SkyEventClouds | undefined) => {
      const system = new SearchlightSystem()
      system.update([{ ...SKYTRACKER, beams: 1, motion: "fixed", tiltDeg: 0 }], 0, frame(clouds, []))
      const count = system.drawnCount
      system.dispose()
      return count
    }
    const clear = longest(undefined)
    const overcast = longest(deck(0.05, []))
    expect(overcast).toBeGreaterThan(0)
    expect(overcast).toBeLessThan(clear)
  })

  it("tells which of its beams is under the pointer", () => {
    const system = new SearchlightSystem()
    const lights: SkyEventCloudLight[][] = []
    system.update([{ ...SKYTRACKER, motion: "fixed" }], 0, frame(deck(0, []), lights))
    // Looking from the eye at a point 500 m up the third beam.
    const lamp = lights[0][2]
    const axis = lamp.axis
    const target = new Vector3(lamp.x + axis.x * 500, lamp.y + axis.y * 500, lamp.z + axis.z * 500)
    const eye = new Vector3(0, 1.6, 0)
    const hit = system.pick(eye, target.clone().sub(eye).normalize(), { toleranceRad: 0.002, nearestCos: 1, skyLightTowards: () => 0 })
    expect(hit?.id).toBe("club")
    expect(hit?.detail.beam).toBe(3)
    system.dispose()
  })

  it("draws nothing and lights no cloud while off", () => {
    const lit: SkyEventCloudLight[][] = []
    const system = new SearchlightSystem()
    system.update([{ ...SKYTRACKER, fromT: 10_000 }], 0, frame(deck(0.01, []), lit))
    expect(system.drawnCount).toBe(0)
    expect(lit).toEqual([[]])
    system.dispose()
  })
})
