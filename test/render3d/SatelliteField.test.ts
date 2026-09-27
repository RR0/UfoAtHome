import { describe, expect, it, vi } from "vitest"
import { SatelliteField } from "../../src/render3d/SatelliteField.js"
import type { SceneSatellite } from "../../src/render3d/SatelliteField.js"

const at = (norad: number, magnitude: number): SceneSatellite => ({
  norad, name: `SAT ${norad}`, magnitude, heightKm: 550, position: { altitudeDeg: 40, azimuthDeg: 120 + norad }
})
const light = () => [1, 1, 1] as const

describe("SatelliteField", () => {
  it("never walks the cloud for a satellite too faint to be seen even through none", () => {
    // Cloud only dims. On a stormy night this was six hundred walks of the cloud field a frame, for
    // satellites no clear sky would have shown either — the whole of the frame rate.
    const field = new SatelliteField(1000)
    const transmission = vi.fn(() => 1)
    field.set([at(1, 3), at(2, 7.5), at(3, 9)], 6, transmission, light)
    expect(transmission).toHaveBeenCalledTimes(1)
    expect(field.count).toBe(1)
  })

  it("still hides a bright one behind thick cloud, and dims one behind thin cloud", () => {
    const field = new SatelliteField(1000)
    field.set([at(1, 2), at(2, 4)], 6, position => (position.azimuthDeg === 121 ? 0 : 0.5), light)
    expect(field.count).toBe(1)
  })
})
