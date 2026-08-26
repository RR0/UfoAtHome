import { describe, expect, it } from "vitest"
import { MeteorSystem } from "../../src/render3d/MeteorSystem.js"
import type { Meteor } from "../../src/engine/astronomy/MeteorFall.js"
import { horizontalToCartesian } from "../../src/render3d/skyColors.js"

const RADIANT_ALTITUDE_DEG = 60
const RADIANT_AZIMUTH_DEG = 120

function meteorOf(brightness: number): Meteor {
  return { t: 0, durationMs: 1000, fromRadiantDeg: 30, bearingDeg: 40, lengthDeg: 12, brightness }
}

/** How far off the streak's own great circle the drawn geometry reaches, in degrees: the ribbon's
 * half-width, measured the way an observer would see it rather than in world units. */
function halfWidthDeg(system: MeteorSystem): number {
  const positions = system.object.geometry.getAttribute("position")
  const count = system.object.geometry.drawRange.count
  const radiant = horizontalToCartesian(RADIANT_ALTITUDE_DEG, RADIANT_AZIMUTH_DEG, 1)
  // The plane the streak runs in: through the radiant and the direction its bearing points.
  const bearing = (40 * Math.PI) / 180
  const seed = { x: 0, y: 1, z: 0 }
  const cross = (a: any, b: any) => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x })
  const unit = (v: any) => {
    const length = Math.hypot(v.x, v.y, v.z) || 1
    return { x: v.x / length, y: v.y / length, z: v.z / length }
  }
  const right = unit(cross(radiant, seed))
  const up = unit(cross(radiant, right))
  const along = {
    x: right.x * Math.cos(bearing) + up.x * Math.sin(bearing),
    y: right.y * Math.cos(bearing) + up.y * Math.sin(bearing),
    z: right.z * Math.cos(bearing) + up.z * Math.sin(bearing)
  }
  const normal = unit(cross(radiant, along))
  let widest = 0
  for (let i = 0; i < count; i++) {
    const v = unit({ x: positions.getX(i), y: positions.getY(i), z: positions.getZ(i) })
    const off = Math.abs(v.x * normal.x + v.y * normal.y + v.z * normal.z)
    widest = Math.max(widest, (Math.asin(Math.min(1, off)) * 180) / Math.PI)
  }
  return widest
}

describe("MeteorSystem", () => {
  it("draws a meteor wide enough to be seen at all", () => {
    // The bug this exists for: WebGL ignores a line's requested width on every desktop driver, so
    // drawing meteors as LineSegments gave every one of them a hairline ONE DEVICE PIXEL across —
    // a quarter of a CSS pixel on a retina display, lit for half a second. The measurement said the
    // meteor was there; nobody watching the sky could see it. Only geometry with real width fixes
    // that, so the geometry must stay a surface and never go back to lines.
    const system = new MeteorSystem()
    system.setShower([meteorOf(0.8)], RADIANT_ALTITUDE_DEG, RADIANT_AZIMUTH_DEG)
    system.update(450)
    expect(system.object.type).toBe("Mesh")
    expect(system.object.geometry.drawRange.count).toBeGreaterThan(0)
    // A tenth of a degree is a couple of pixels across a 60-degree field: below that it is a hair
    // again. Half a degree is the Moon's own width, which even a fireball's glare should not pass.
    const width = halfWidthDeg(system)
    expect(width).toBeGreaterThan(0.05)
    expect(width).toBeLessThan(0.5)
  })

  it("glares wider for a brighter meteor, which is the only reason it has any width", () => {
    // The width is the spreading of a point source, not the streak drawn fatter so it can be found:
    // a meteor is metres across at a hundred kilometres, a few arcseconds. Tying it to brightness is
    // what keeps it a rendering of glare rather than an illustration.
    const faint = new MeteorSystem()
    faint.setShower([meteorOf(0.05)], RADIANT_ALTITUDE_DEG, RADIANT_AZIMUTH_DEG)
    faint.update(450)
    const fireball = new MeteorSystem()
    fireball.setShower([meteorOf(0.95)], RADIANT_ALTITUDE_DEG, RADIANT_AZIMUTH_DEG)
    fireball.update(450)
    expect(halfWidthDeg(fireball)).toBeGreaterThan(halfWidthDeg(faint) * 2)
  })

  it("draws nothing when the radiant has not risen", () => {
    const system = new MeteorSystem()
    system.setShower([meteorOf(0.8)], -5, RADIANT_AZIMUTH_DEG)
    system.update(450)
    expect(system.object.geometry.drawRange.count).toBe(0)
  })
})
