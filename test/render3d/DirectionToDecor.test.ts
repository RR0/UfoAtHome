import { describe, expect, test } from "vitest"
import { BoxGeometry, Group, Mesh, PerspectiveCamera } from "three"
import { SceneRenderer } from "../../src/render3d/SceneRenderer.js"

/** SceneRenderer.directionToDecor reads only the decor drawn and the camera: given those, without a WebGL context. */
describe("SceneRenderer.directionToDecor", () => {
  const sceneWith = (eyeY: number, decor: { id: string, x: number, y: number, z: number, visible?: boolean }[]) => {
    const camera = new PerspectiveCamera()
    camera.position.set(0, eyeY, 0)
    const decorGroups = new Map<string, Group>()
    for (const { id, x, y, z, visible } of decor) {
      const group = new Group()
      const mesh = new Mesh(new BoxGeometry(4, 2, 8))
      mesh.position.set(x, y + 1, z)
      group.add(mesh)
      group.visible = visible ?? true
      decorGroups.set(id, group)
    }
    return (id: string) => SceneRenderer.prototype.directionToDecor.call({ decorGroups, camera } as unknown as SceneRenderer, id)
  }

  test("looks down at a bridge 15 m north from an observer standing 120 m above the ground", () => {
    const direction = sceneWith(121.6, [{ id: "bridge", x: 0, y: 0, z: -15 }])("bridge")!
    expect(direction.azimuthDeg).toBeCloseTo(0, 5)
    // To its middle, a metre up: atan(120.6 / 15).
    expect(direction.altitudeDeg).toBeCloseTo(-Math.atan2(120.6, 15) * 180 / Math.PI, 5)
  })

  test("gives east as 90° and an object above the eye as above the horizon", () => {
    const direction = sceneWith(1.6, [{ id: "mound", x: 10, y: 10.6, z: 0 }])("mound")!
    expect(direction.azimuthDeg).toBeCloseTo(90, 5)
    expect(direction.altitudeDeg).toBeCloseTo(45, 5)
  })

  test("says nothing of an object that is not drawn", () => {
    const direction = sceneWith(1.6, [{ id: "gone", x: 10, y: 0, z: 0, visible: false }])
    expect(direction("gone")).toBeUndefined()
    expect(direction("unknown")).toBeUndefined()
  })
})
