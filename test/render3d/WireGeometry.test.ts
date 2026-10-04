import { describe, expect, it } from "vitest"
import { Box3 } from "three"
import { WireGeometry } from "../../src/render3d/WireGeometry.js"
import { DecorSystem } from "../../src/render3d/DecorSystem.js"
import type { DecorObject } from "../../src/engine/model/Decor.js"

const SIZE = { widthM: 1, lengthM: 15, heightM: 3.5 }

describe("WireGeometry", () => {
  it("hangs one strand at the object's height unless it is told several", () => {
    expect(new WireGeometry(SIZE).strands).toEqual([{ heightM: 3.5, acrossM: 0 }])
    expect(new WireGeometry(SIZE, { strands: [{ heightM: 3.5 }, { heightM: 3.64 }] }).strands.map(s => s.heightM)).toEqual([3.5, 3.64])
  })

  it("stands a pole at each end by default, at one end only where the other is anchored", () => {
    expect(new WireGeometry(SIZE).poleStations).toEqual([-7.5, 7.5])
    expect(new WireGeometry(SIZE, { poles: "end" }).poleStations).toEqual([-7.5])
    expect(new WireGeometry(SIZE, { poles: "start" }).poleStations).toEqual([7.5])
    expect(new WireGeometry(SIZE, { poles: "none" }).poleStations).toEqual([])
  })

  it("stands its poles half a metre over the highest strand", () => {
    const wire = new WireGeometry(SIZE, { strands: [{ heightM: 3.5 }, { heightM: 3.64 }] })
    expect(wire.poleHeightM).toBeCloseTo(4.14, 5)
  })

  it("puts the pole of its \"end\" where its heading points", () => {
    // Heading 90 faces east: the pole is east of the object's centre, in the scene's own axes (x east).
    const object: DecorObject = { id: "line", kind: "wire", eastM: 0, northM: 10, headingDeg: 90, sizeM: SIZE, wire: { poles: "end" } }
    const group = DecorSystem.build(object, false)
    group.updateMatrixWorld(true)
    const poleBox = new Box3().setFromObject(group.children[0].children[group.children[0].children.length - 1])
    expect((poleBox.min.x + poleBox.max.x) / 2).toBeCloseTo(7.5, 1)
  })

  it("is drawn at its own measurements and never stretched by the decor system", () => {
    const object: DecorObject = { id: "line", kind: "wire", eastM: 0, northM: 10, sizeM: SIZE, wire: { poles: "none" } }
    const box = new Box3().setFromObject(DecorSystem.build(object, false))
    expect(box.max.z - box.min.z).toBeCloseTo(15, 1)
    expect(box.max.y).toBeCloseTo(3.5 + 0.004, 2)
    expect(DecorSystem.sizeOf(object)).toEqual(SIZE)
  })
})
