import { describe, expect, test } from "vitest"
import type { BufferAttribute, Mesh } from "three"
import type { PlumePuffView } from "../../src/engine/interpretation/LaunchPlume.js"
import { PlumeSystem } from "../../src/render3d/PlumeSystem.js"
import { horizontalToCartesian } from "../../src/render3d/skyColors.js"

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

  test("finds the puff under a direction of sight, within its radius, and the small bright head before the wide cloud round it", () => {
    const system = new PlumePuffSetup()
    const head = puff({ launchId: "head", centre: { altitudeDeg: 10, azimuthDeg: 180, distanceKm: 800 }, radiusDeg: 0.2 })
    const cloud = puff({ launchId: "cloud", centre: { altitudeDeg: 10.5, azimuthDeg: 180, distanceKm: 800 }, radiusDeg: 3 })
    system.plumes.set([cloud, head], 1, clear, () => 1)
    expect(system.plumes.pickAt(system.towards(10, 180), 0)?.launchId).toBe("head")
    expect(system.plumes.pickAt(system.towards(12, 181), 0)?.launchId).toBe("cloud")
    expect(system.plumes.pickAt(system.towards(30, 90), 0.01)).toBeUndefined()
    system.plumes.dispose()
  })

  test("is found only where it stands out from the sky behind it: not at its faint edge, nor once it has faded", () => {
    const system = new PlumePuffSetup()
    // A puff whose middle adds 2 to a sky of 10: a fifth, well seen; its edge, a fortieth, is not.
    system.plumes.set([puff({ luminanceCdM2: 2, sunTransmittance: [1, 1, 1], radiusDeg: 2 })], 1, clear, () => 1)
    expect(system.plumes.pickAt(system.towards(10, 180), 0, 10)).toBeDefined()
    expect(system.plumes.pickAt(system.towards(10, 182.3), 0, 10)).toBeUndefined()
    // The same puff against a sky fifty times brighter: nothing to point at.
    expect(system.plumes.pickAt(system.towards(10, 180), 0, 500)).toBeUndefined()
    system.plumes.dispose()
  })
})

/** A plume system, and the direction of sight towards a point of the sky in the frame it draws in. */
class PlumePuffSetup {
  readonly plumes = new PlumeSystem()

  towards(altitudeDeg: number, azimuthDeg: number) {
    return horizontalToCartesian(altitudeDeg, azimuthDeg, 1)
  }
}

