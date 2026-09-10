import { describe, expect, it } from "vitest"
import { Color } from "three"
import { DEFAULT_WEATHER } from "../../src/engine/model/Weather.js"
import { WeatherTrack } from "../../src/engine/model/WeatherTrack.js"
import { cloudOffsetAt } from "../../src/render3d/CloudMotion.js"
import { buildCloudMaterial, CloudField } from "../../src/render3d/CloudSystem.js"

describe("cloud motion", () => {
  it("anchors calm clouds to the world as the observer moves east", () => {
    const offset = cloudOffsetAt(60_000, new WeatherTrack(), DEFAULT_WEATHER, { lat: 0, lng: 0 }, { lat: 0, lng: 300 / 111320 })
    expect(offset.x).toBeCloseTo(300)
    expect(offset.z).toBe(0)
  })

  it.each([[0, 0, 600], [90, -600, 0], [180, 0, -600], [270, 600, 0]])(
    "advects toward bearing %s degrees at metres per second", (windDirectionDeg, x, z) => {
      const offset = cloudOffsetAt(60_000, new WeatherTrack(), { ...DEFAULT_WEATHER, windSpeed: 10, windDirectionDeg })
      expect(offset.x).toBeCloseTo(x)
      expect(offset.z).toBeCloseTo(z)
    }
  )

  it("cancels relative motion when observer and clouds travel together", () => {
    const offset = cloudOffsetAt(30_000, new WeatherTrack(), { ...DEFAULT_WEATHER, windSpeed: 10, windDirectionDeg: 90 },
      { lat: 0, lng: 0 }, { lat: 0, lng: 300 / 111320 })
    expect(offset.x).toBeCloseTo(0)
    expect(offset.z).toBeCloseTo(0)
  })

  it("integrates a changing wind and repeats the same state after seeking backwards", () => {
    const track = new WeatherTrack()
    track.addKeyframe(0, { ...DEFAULT_WEATHER, windDirectionDeg: 90, windSpeed: 0 })
    track.addKeyframe(60_000, { ...DEFAULT_WEATHER, windDirectionDeg: 90, windSpeed: 20 })
    const first = cloudOffsetAt(30_000, track, DEFAULT_WEATHER)
    expect(cloudOffsetAt(90_000, track, DEFAULT_WEATHER).x).toBeCloseTo(-1200)
    expect(cloudOffsetAt(30_000, track, DEFAULT_WEATHER)).toEqual(first)
    expect(first.x).toBeCloseTo(-150)
    expect(cloudOffsetAt(0, track, DEFAULT_WEATHER)).toEqual({ x: 0, z: 0 })
  })

  it("integrates a turn through north along the short arc", () => {
    const track = new WeatherTrack()
    track.addKeyframe(0, { ...DEFAULT_WEATHER, windDirectionDeg: 350, windSpeed: 10 })
    track.addKeyframe(60_000, { ...DEFAULT_WEATHER, windDirectionDeg: 10, windSpeed: 10 })
    const offset = cloudOffsetAt(60_000, track, DEFAULT_WEATHER)
    expect(offset.x).toBeCloseTo(0)
    expect(offset.z).toBeCloseTo(600 * Math.sin(Math.PI / 18) / (Math.PI / 18), 3)
  })

  it("samples the translated field for celestial transmission and both cloud materials", () => {
    const direction = { x: 0, y: 1, z: 0 }
    const original = CloudField.alphaAt(direction, 250, 0.5)
    const moved = Array.from({ length: 20 }, (_, i) => CloudField.alphaAt(direction, 250, 0.5, { x: i * 75, z: i * 20 }))
    expect(moved.some(alpha => Math.abs(alpha - original) > 0.1)).toBe(true)
    for (const fibrous of [0, 1]) {
      const { material, uniforms } = buildCloudMaterial(new Color(), 0.5, 250, fibrous)
      expect(uniforms.fieldOffset.value.toArray()).toEqual([0, 0, 0])
      expect(material.fragmentShader).toContain("dir * t + fieldOffset")
      material.dispose()
    }
  })
})
