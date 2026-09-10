import { beforeAll, afterAll, describe, expect, it } from "vitest"
import { Group, Vector3 } from "three"
import { CLOUD_EARTH_RADIUS_M as R, cloudRayInterval, cloudSeed, createCloudNoise, VolumetricCloudLayer } from "../../src/render3d/VolumetricClouds.js"
import { LayeredCloudSystem } from "../../src/render3d/LayeredCloudSystem.js"
import { DEFAULT_WEATHER } from "../../src/engine/model/Weather.js"
import type { CloudLayer } from "../../src/engine/model/CloudLayer.js"
const layer: CloudLayer = { id: "test", type: "stratus", baseM: 1500, thicknessM: 800, coverage: 1, sizeM: 1500, density: 1 }
let texture: ReturnType<typeof createCloudNoise>
beforeAll(() => { texture = createCloudNoise() })
afterAll(() => texture.dispose())

describe("curved cloud shell", () => {
  it("intersects the base and top vertically", () => {
    const [near, far] = cloudRayInterval(1, 2, 1500, 800)!
    expect(near).toBeCloseTo(1498)
    expect(far).toBeCloseTo(2298)
  })
  it("reaches high layers at the geometric horizon without a clamped vertical wall", () => {
    for (const base of [1000, 8000]) {
      const [near, far] = cloudRayInterval(0, 2, base, 800)!
      expect(near).toBeCloseTo(Math.sqrt((base - 2) * (2 * R + base + 2)))
      expect(far).toBeGreaterThan(near)
    }
    expect(cloudRayInterval(0, 2, 8000, 800)![0]).toBeGreaterThan(300000)
  })
  it("supports looking down from above and starting inside, but never sees through Earth", () => {
    expect(cloudRayInterval(-1, 3000, 1500, 800)![0]).toBeCloseTo(700)
    expect(cloudRayInterval(1, 1800, 1500, 800)![0]).toBe(0)
    expect(cloudRayInterval(-1, 2, 1500, 800)).toBeUndefined()
  })
  it("uses stable identities and keeps existing GPU resources during interpolation", () => {
    expect(cloudSeed({ ...layer })).toBe(cloudSeed(layer))
    const group = new Group()
    const clouds = new LayeredCloudSystem(group, 700, "volume")
    clouds.update({ ...DEFAULT_WEATHER, cloudLayers: [layer] }, 2)
    const mesh = group.children[0]
    clouds.update({ ...DEFAULT_WEATHER, cloudLayers: [{ ...layer, baseM: 1600 }] }, 2)
    expect(group.children[0]).toBe(mesh)
    clouds.update({ ...DEFAULT_WEATHER, cloudLayers: [] }, 2)
    expect(group.children).toHaveLength(0)
    clouds.dispose()
  })
  it("attenuates only the volume before the object, progressively inside the layer", () => {
    const cloud = new VolumetricCloudLayer(texture, 700)
    cloud.update(layer, 2)
    const up = new Vector3(0, 1, 0)
    expect(cloud.transmissionAt(up, 1000)).toBe(1)
    const inside = cloud.transmissionAt(up, 1800)
    const behind = cloud.transmissionAt(up, 3000)
    expect(inside).toBeLessThan(1)
    expect(behind).toBeLessThan(inside)
    expect(behind).toBeLessThan(0.15)
    cloud.update({ ...layer, coverage: 0 }, 2)
    expect(cloud.transmissionAt(up, 3000)).toBe(1)
    cloud.dispose()
  })
})

describe("coverage", () => {
  it("covers about the fraction of sky the coverage states", () => {
    // Directions spread over the sky above 17°, like the surface deck's own test: what is checked is
    // how much of the sky a ray finds less than half transparent, not any one ray.
    const cloud = new VolumetricCloudLayer(texture, 700)
    const fraction = (coverage: number) => {
      cloud.update({ ...layer, type: "cumulus", coverage }, 2)
      let covered = 0
      const count = 2000
      for (let i = 0; i < count; i++) {
        const altitude = Math.asin(0.3 + 0.7 * ((i * 0.618033988749895) % 1))
        const azimuth = (i / count) * Math.PI * 2
        const direction = { x: Math.sin(azimuth) * Math.cos(altitude), y: Math.sin(altitude), z: -Math.cos(azimuth) * Math.cos(altitude) }
        if (cloud.transmissionAt(direction) < 0.5) covered++
      }
      return covered / count
    }
    expect(fraction(0.12)).toBeGreaterThan(0.05)
    expect(fraction(0.12)).toBeLessThan(0.2)
    expect(fraction(0.55)).toBeGreaterThan(0.45)
    expect(fraction(0.55)).toBeLessThan(0.65)
    expect(fraction(0.8)).toBeGreaterThan(0.7)
    cloud.dispose()
  })
})

describe("local cloud masses", () => {
  it("is a piece of its layer's field, and the layer leaves room for it", () => {
    const group = new Group(), clouds = new LayeredCloudSystem(group, 700, "volume")
    const instance = { id: "mass", eastM: 0, northM: 0, baseM: 1500, thicknessM: 800, widthM: 1000, depthM: 1000, rotationDeg: 0, density: 1 }
    const field = { ...layer, id: "low", type: "cumulus" as const, coverage: 0.6, sizeM: 1400, seed: undefined, instances: [instance] }
    clouds.update({ ...DEFAULT_WEATHER, cloudLayers: [field] }, 2)
    const [deckOfField, deckOfMass] = [...clouds.volumes].sort((a, b) => a.uniforms.localSize.value.x - b.uniforms.localSize.value.x)
    // Same noise: the layer's scale and seed, not a scale of the mass's own size.
    expect(deckOfMass.uniforms.sizeM.value).toBe(1400)
    expect(deckOfMass.uniforms.seedOffset.value).toEqual(deckOfField.uniforms.seedOffset.value)
    expect(deckOfMass.uniforms.coverage.value).toBe(0.6)
    // The layer's field is nought where the mass stands, and back to itself well past its rim.
    expect(deckOfField.uniforms.holeCount.value).toBe(1)
    expect(deckOfField.densityAt({ x: 0, y: 1800, z: 0 })).toBe(0)
    expect(deckOfMass.densityAt({ x: 0, y: 1800, z: 0 })).toBeGreaterThan(0)
    const samples = Array.from({ length: 40 }, (_, i) => ({ x: 3000 + i * 250, y: 1800, z: (i % 5) * 700 }))
    expect(samples.some(p => deckOfField.densityAt(p) > 0)).toBe(true)
    expect(samples.every(p => deckOfMass.densityAt(p) === 0)).toBe(true)
    clouds.dispose()
  })
  it("makes a layer that holds one a volume, whichever rendering was asked for", () => {
    const group = new Group(), clouds = new LayeredCloudSystem(group, 700, "surface")
    const instance = { id: "mass", eastM: 0, northM: 0, baseM: 1500, thicknessM: 800, widthM: 1000, depthM: 1000, rotationDeg: 0, density: 1 }
    clouds.update({ ...DEFAULT_WEATHER, cloudLayers: [{ ...layer, type: "cumulus", coverage: 0.6 }] }, 2)
    expect(clouds.volumes).toHaveLength(0)
    clouds.update({ ...DEFAULT_WEATHER, cloudLayers: [{ ...layer, type: "cumulus", coverage: 0.6, instances: [instance] }] }, 2)
    expect(clouds.volumes).toHaveLength(2)
    clouds.dispose()
  })
  it("does not repeat the same density at the old texture tile interval", () => {
    const cloud = new VolumetricCloudLayer(texture, 700)
    cloud.update({ ...layer, type: "cumulus", coverage: 0.6 }, 2)
    const samples = Array.from({ length: 30 }, (_, i) => ({ x: i * 173, y: 1750, z: i * 91 }))
    expect(samples.some(p => Math.abs(cloud.densityAt(p) - cloud.densityAt({ ...p, x: p.x + layer.sizeM * 4 })) > 0.05)).toBe(true)
    cloud.dispose()
  })
  it("adds a bounded mass to an otherwise clear layer and follows translation and resize", () => {
    const group = new Group(), clouds = new LayeredCloudSystem(group, 700, "volume")
    const instance = { id: "mass", eastM: 0, northM: 0, baseM: 1500, thicknessM: 800, widthM: 1000, depthM: 1000, rotationDeg: 0, density: 1 }
    clouds.update({ ...DEFAULT_WEATHER, cloudLayers: [{ ...layer, coverage: 0, instances: [instance] }] }, 2)
    expect(clouds.volumes).toHaveLength(1)
    expect(clouds.pickInstance(new Vector3(0, 1, 0))?.instanceId).toBe("mass")
    expect(clouds.pickInstance(new Vector3(1, 0, 0))).toBeUndefined()
    const cloud = clouds.volumes[0]
    expect(cloud.densityAt({ x: 0, y: 1800, z: 0 })).toBeGreaterThan(0)
    expect(cloud.densityAt({ x: 2000, y: 1800, z: 0 })).toBe(0)
    clouds.update({ ...DEFAULT_WEATHER, cloudLayers: [{ ...layer, coverage: 0, instances: [{ ...instance, eastM: 2000 }] }] }, 2)
    expect(cloud.densityAt({ x: 0, y: 1800, z: 0 })).toBe(0)
    expect(cloud.densityAt({ x: 2000, y: 1800, z: 0 })).toBeGreaterThan(0)
    expect(clouds.pickInstance(new Vector3(0, 1, 0))).toBeUndefined()
    clouds.setOffsets({ x: 2000, z: 0 }, {})
    expect(clouds.pickInstance(new Vector3(0, 1, 0))?.instanceId).toBe("mass")
    clouds.update({ ...DEFAULT_WEATHER, cloudLayers: [{ ...layer, coverage: 0, instances: [] }] }, 2)
    expect(clouds.volumes).toHaveLength(0)
    clouds.dispose()
  })
})
