import { Vector3 } from "three"
import { describe, expect, it } from "vitest"
import type { ContrailPoint, ContrailTrail } from "../../src/engine/traffic/AircraftContrails.js"
import { ContrailGrowth } from "../../src/engine/traffic/ContrailGrowth.js"
import { ContrailSystem } from "../../src/render3d/ContrailSystem.js"

const SPEED_MS = 250
const frame = { origin: { x: 0, z: 0 }, eye: new Vector3(0, 0, 0), pixelRad: 0 }
const white = () => [1, 1, 1] as const

function point(s: number, over: Partial<ContrailPoint> = {}): ContrailPoint {
  return {
    tMs: s * 1000, eastM: 20_000 + SPEED_MS * s, northM: 30_000, upM: 11_000,
    forms: true, persistent: true, lifetimeS: 60, driftEastMs: 0, driftNorthMs: 0, shearPerS: 0.003, iceRelativeHumidity: 1.1, ...over
  }
}

function trail(seconds: number, over: Partial<ContrailPoint> | ((s: number) => Partial<ContrailPoint>) = {}, spanM = 35): ContrailTrail {
  const points: ContrailPoint[] = []
  for (let s = 0; s <= seconds; s += 5) points.push(point(s, typeof over === "function" ? over(s) : over))
  return { id: "traffic-000001-0", spanM, points }
}

function vertices(system: ContrailSystem) {
  const geometry = system.object.geometry
  const positions = geometry.getAttribute("position")
  const colors = geometry.getAttribute("color")
  const out: { x: number; y: number; z: number; alpha: number }[] = []
  for (let i = 0; i < geometry.drawRange.count; i++) out.push({ x: positions.getX(i), y: positions.getY(i), z: positions.getZ(i), alpha: colors.getW(i) })
  return out
}

/** How wide the ribbon is across the path near a point along it, m: the largest distance between its vertices in the plane that path is perpendicular to. */
function widthAt(system: ContrailSystem, x: number): number {
  const near = vertices(system).filter(v => Math.abs(v.x - x) < 150)
  let widest = 0
  for (const a of near) for (const b of near) widest = Math.max(widest, Math.hypot(a.y - b.y, a.z - b.z))
  return widest
}

function made(trails: ContrailTrail[]): ContrailSystem {
  const system = new ContrailSystem()
  system.set(trails)
  return system
}

describe("ContrailSystem", () => {
  it("draws nothing before the aircraft is there, and something once it has flown", () => {
    const system = made([trail(60)])
    system.update(-5000, frame, white)
    expect(system.segmentCount).toBe(0)
    system.update(30_000, frame, white)
    expect(system.segmentCount).toBeGreaterThan(0)
  })

  it("stops short of the aircraft, where the exhaust has not yet cooled", () => {
    const system = made([trail(60)])
    system.update(30_000, frame, white)
    const aircraftX = 20_000 + SPEED_MS * 30
    const furthest = Math.max(...vertices(system).map(v => v.x))
    expect(furthest).toBeLessThan(aircraftX)
    expect(furthest).toBeGreaterThan(aircraftX - SPEED_MS * (ContrailGrowth.FORMATION_S + 1))
  })

  it("lays it along the path the aircraft flew, in the scene's frame: x east, z minus north, y up", () => {
    const system = made([trail(60)])
    system.update(30_000, frame, white)
    const middle = vertices(system).filter(v => v.x > 22_000 && v.x < 26_000)
    expect(middle.length).toBeGreaterThan(0)
    expect(middle.every(v => Math.abs(v.y - 11_000) < 1000)).toBe(true)
    expect(middle.every(v => Math.abs(v.z + 30_000) < 1000)).toBe(true)
  })

  it("carries what was left by the air that moves it, further the older it is", () => {
    const still = made([trail(60)])
    const blown = made([trail(60, { driftNorthMs: 10 })])
    still.update(30_000, frame, white)
    blown.update(30_000, frame, white)
    const zOf = (system: ContrailSystem, x: number) => {
      const near = vertices(system).filter(v => Math.abs(v.x - x) < 300)
      return near.reduce((sum, v) => sum + v.z, 0) / near.length
    }
    // Emitted at x = 20 000 (30 s ago): 300 m north, which is minus z. Emitted at x = 26 250 (5 s ago): 50 m.
    expect(zOf(blown, 20_000) - zOf(still, 20_000)).toBeLessThan(-250)
    expect(Math.abs(zOf(blown, 26_250) - zOf(still, 26_250))).toBeLessThan(60)
  })

  it("lets a trail that does not last fade away once its life is over", () => {
    const system = made([trail(30, { persistent: false, lifetimeS: 20 })])
    system.update(25_000, frame, white)
    expect(system.segmentCount).toBeGreaterThan(0)
    system.update(30_000 + 25_000, frame, white)
    expect(system.segmentCount).toBe(0)
  })

  it("keeps a trail that lasts long after the aircraft has left the record", () => {
    const system = made([trail(30)])
    system.update(30_000 + 600_000, frame, white)
    expect(system.segmentCount).toBeGreaterThan(0)
  })

  it("breaks the trail where the air did not form one", () => {
    const system = made([trail(60, s => (s >= 20 && s <= 30 ? { forms: false } : {}))])
    system.update(60_000, frame, white)
    const along = vertices(system).map(v => v.x)
    const gapStart = 20_000 + SPEED_MS * 20
    const gapEnd = 20_000 + SPEED_MS * 30
    expect(along.some(x => x > gapStart + 100 && x < gapEnd - 100)).toBe(false)
    expect(along.some(x => x < gapStart - 100)).toBe(true)
    expect(along.some(x => x > gapEnd + 100)).toBe(true)
  })

  it("is widest where it is oldest", () => {
    const system = made([trail(60)])
    system.update(60_000, frame, white)
    expect(widthAt(system, 20_000)).toBeGreaterThan(widthAt(system, 33_750))
  })

  it("never draws it thinner than two pixels, and says as much less of it when it does", () => {
    const pixelRad = 0.0005
    const thin = made([trail(60)])
    thin.update(30_000, { ...frame, pixelRad }, white)
    const wide = made([trail(60)])
    wide.update(30_000, frame, white)
    const distance = Math.hypot(23_750, 30_000, 11_000)
    expect(widthAt(thin, 23_750)).toBeGreaterThanOrEqual(distance * pixelRad * 2 * 0.95)
    const peakAlpha = (system: ContrailSystem) => Math.max(...vertices(system).filter(v => Math.abs(v.x - 23_750) < 150).map(v => v.alpha))
    expect(peakAlpha(thin)).toBeLessThanOrEqual(peakAlpha(wide))
  })

  it("is wider where the wind shears it more", () => {
    const calm = made([trail(60, { shearPerS: 0 })])
    const sheared = made([trail(60, { shearPerS: 0.01 })])
    calm.update(600_000, frame, white)
    sheared.update(600_000, frame, white)
    expect(widthAt(sheared, 20_000)).toBeGreaterThan(widthAt(calm, 20_000) * 1.5)
  })

  it("is lit as it is told, per aircraft", () => {
    const system = made([trail(60)])
    system.update(30_000, frame, () => [1, 0.5, 0.25])
    const colors = system.object.geometry.getAttribute("color")
    expect(colors.getX(0)).toBeCloseTo(1, 6)
    expect(colors.getY(0)).toBeCloseTo(0.5, 6)
    expect(colors.getZ(0)).toBeCloseTo(0.25, 6)
  })

  it("is drawn from nothing when it has been given nothing", () => {
    const system = made([])
    system.update(30_000, frame, white)
    expect(system.segmentCount).toBe(0)
    expect(vertices(system)).toEqual([])
  })
})
