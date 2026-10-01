import { describe, expect, it } from "vitest"
import { Vector2 } from "three"
import { TraceSystem } from "../../src/render3d/TraceSystem.js"
import type { InvestigatorTrace } from "../../src/engine/model/Trace.js"

/** Ground rising a metre per ten metres east, so that a line following it is told from one that
 * does not. */
const SLOPE = (x: number) => x / 10

describe("TraceSystem", () => {
  const origin = { lat: 49, lng: 2.3 }
  const east = (metres: number) => origin.lng + metres / (111_320 * Math.cos(origin.lat * Math.PI / 180))

  function heights(trace: InvestigatorTrace, siteElevationM = 100): number[] {
    const system = new TraceSystem(5)
    system.set([trace], origin.lat, origin.lng, siteElevationM, SLOPE)
    const line = system.group.children[0] as unknown as { geometry: { attributes: { instanceStart: { data: { array: Float32Array } } } } }
    const array = line.geometry.attributes.instanceStart.data.array
    const ys: number[] = []
    // One segment per six numbers (start then end): the starts, then the very last end.
    for (let i = 1; i < array.length; i += 6) ys.push(array[i])
    ys.push(array[array.length - 2])
    return ys
  }

  it("lays a line on the ground, vertex by vertex, a little above it", () => {
    const [first, ...rest] = heights({ id: "t", kind: "line", points: [{ lat: origin.lat, lng: origin.lng }, { lat: origin.lat, lng: east(100) }] })
    expect(first).toBeCloseTo(TraceSystem.LIFT_M, 1)
    expect(rest[rest.length - 1]).toBeCloseTo(10 + TraceSystem.LIFT_M, 0)
    expect(rest.length).toBeGreaterThan(1) // subdivided to follow the slope
  })

  it("reads relative altitude from the ground under each point", () => {
    const ys = heights({ id: "t", kind: "line", altitude: "relative", points: [{ lat: origin.lat, lng: origin.lng, altM: 50 }, { lat: origin.lat, lng: east(100), altM: 50 }] })
    expect(ys[0]).toBeCloseTo(50 + TraceSystem.LIFT_M, 1)
    expect(ys[ys.length - 1]).toBeCloseTo(60 + TraceSystem.LIFT_M, 0)
  })

  it("reads absolute altitude from the elevation the patch reads zero at", () => {
    const ys = heights({ id: "t", kind: "line", altitude: "absolute", points: [{ lat: origin.lat, lng: origin.lng, altM: 400 }, { lat: origin.lat, lng: east(100), altM: 400 }] }, 150)
    expect(ys).toEqual([250, 250])
  })

  it("draws a place as a marker, an outline closed, and keeps its width in pixels", () => {
    const system = new TraceSystem(5)
    system.set([
      { id: "a", kind: "point", points: [{ lat: origin.lat, lng: origin.lng }] },
      { id: "b", kind: "polygon", points: [{ lat: origin.lat, lng: origin.lng }, { lat: origin.lat, lng: east(50) }, { lat: origin.lat + 0.0005, lng: east(50) }] }
    ], origin.lat, origin.lng, 0, () => 0)
    expect(system.group.children.map(child => child.name)).toEqual(["trace point", "trace polygon"])
    expect(system.any).toBe(true)
    system.setResolution(new Vector2(1280, 720))
    system.dispose()
    expect(system.any).toBe(false)
  })
})
