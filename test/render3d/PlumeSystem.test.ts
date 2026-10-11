import { describe, expect, test } from "vitest"
import type { BufferAttribute, Mesh } from "three"
import type { PlumePuffView } from "../../src/engine/interpretation/LaunchPlume.js"
import { PlumeSystem } from "../../src/render3d/PlumeSystem.js"

const puff = (overrides: Partial<PlumePuffView> = {}): PlumePuffView => ({
  launchId: "test",
  centre: { altitudeDeg: 10, azimuthDeg: 180, distanceKm: 800 },
  radiusDeg: 1,
  luminanceCdM2: 2,
  sunTransmittance: [0.5, 0.8, 1],
  lit: 1,
  ageS: 20,
  ...overrides
})

const clear = () => [1, 1, 1] as const

describe("PlumeSystem", () => {
  test("draws a puff, and nothing when there are none", () => {
    const system = new PlumeSystem()
    system.set([puff(), puff({ launchId: "other" })], 1, clear, () => 1)
    expect(system.count).toBe(2)
    system.set([], 1, clear, () => 1)
    expect(system.count).toBe(0)
  })

  test("a puff behind a cloud that lets nothing past is not drawn", () => {
    const system = new PlumeSystem()
    system.set([puff()], 1, clear, () => 0)
    expect(system.count).toBe(0)
  })

  test("a puff is brightest at its middle and gone at its rim, in the colour the light has left it", () => {
    const system = new PlumeSystem()
    system.set([puff()], 1, clear, () => 1)
    const mesh = system.object.children[0] as Mesh
    const colours = mesh.geometry.getAttribute("color") as BufferAttribute
    // The first vertex of the first sector is the centre of the fan; the rim is the last of the outer band.
    const centre = [colours.getX(0), colours.getY(0), colours.getZ(0)]
    expect(centre[0]).toBeCloseTo(1, 6)
    expect(centre[1]).toBeCloseTo(1.6, 6)
    expect(centre[2]).toBeCloseTo(2, 6)
    let rim = Infinity
    for (let i = 0; i < mesh.geometry.drawRange.count; i++) rim = Math.min(rim, colours.getX(i))
    expect(rim).toBe(0)
    system.dispose()
  })

  test("the air above the eye dims it, per channel", () => {
    const system = new PlumeSystem()
    system.set([puff()], 1, () => [0.5, 0.5, 0.5], () => 1)
    const colours = (system.object.children[0] as Mesh).geometry.getAttribute("color") as BufferAttribute
    expect(colours.getX(0)).toBeCloseTo(0.5, 6)
    system.dispose()
  })
})
