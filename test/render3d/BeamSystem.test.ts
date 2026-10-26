import { describe, expect, it } from "vitest"
import { Vector3 } from "three"
import type { BufferAttribute, Mesh } from "three"
import { AerialPerspective } from "../../src/engine/atmosphere/AerialPerspective.js"
import type { BeamJson } from "../../src/engine/interpretation/LaserBeam.js"
import { BeamSystem } from "../../src/render3d/BeamSystem.js"
import type { BeamFrame } from "../../src/render3d/BeamSystem.js"

/** The shot of 9 October 2026, from the Grande Coupole of Meudon to the Arago dome, watched from beside the emitter. */
const SHOT: BeamJson = {
  id: "shot",
  path: [{ lat: 48.805, lng: 2.23105, altitudeM: 172 }, { lat: 48.83632, lng: 2.33702, altitudeM: 88 }],
  wavelengthNm: 532,
  powerW: 10
}

const frame = (): BeamFrame => ({
  reference: { lat: 48.805, lng: 2.23105 },
  origin: { x: 0, z: 0 },
  eastScale: 1,
  siteElevationM: 150,
  eye: new Vector3(-200, 5, 300),
  pixelRad: 0.0005,
  relativeScale: 1,
  air: new AerialPerspective(),
  transmittanceTo: () => [1, 1, 1],
  groundYAt: () => -1000
})

describe("BeamSystem", () => {
  it("lights a beam along its length smoothly: two stretches that meet give the point they share the same light", () => {
    const system = new BeamSystem()
    system.update([SHOT], 0, frame())
    expect(system.segmentCount).toBeGreaterThan(10)
    const geometry = (system.group.children[0] as Mesh).geometry
    const positions = geometry.getAttribute("position") as BufferAttribute
    const colors = geometry.getAttribute("color") as BufferAttribute
    // The lights given to each place a vertex stands at. The middle of a stretch's end carries two, the line's and its halo's; where two
    // stretches meet, they give it the same two, not four.
    const lightsAt = new Map<string, { lights: number[][]; times: number }>()
    for (let i = 0; i < geometry.drawRange.count; i++) {
      const light = [colors.getX(i), colors.getY(i), colors.getZ(i)]
      if (Math.max(...light) <= 0) continue
      const key = [positions.getX(i), positions.getY(i), positions.getZ(i)].map(c => c.toFixed(2)).join(",")
      const entry = lightsAt.get(key) ?? { lights: [], times: 0 }
      entry.times++
      if (!entry.lights.some(seen => seen.every((value, c) => Math.abs(value - light[c]) <= 1e-6 * Math.max(1, Math.abs(value))))) entry.lights.push(light)
      lightsAt.set(key, entry)
    }
    const shared = [...lightsAt.values()].filter(entry => entry.times > 6)
    expect(shared.length).toBeGreaterThan(10)
    for (const entry of shared) expect(entry.lights.length).toBeLessThanOrEqual(2)
    system.dispose()
  })
})
