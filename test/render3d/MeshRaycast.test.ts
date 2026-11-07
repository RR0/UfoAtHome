import { describe, expect, it } from "vitest"
import { BoxGeometry, Group, Mesh, MeshBasicMaterial, Raycaster, SphereGeometry, Vector3, DoubleSide } from "three"
import type { Intersection } from "three"
import { MeshRaycast } from "../../src/render3d/MeshRaycast.js"

const plain = Mesh.prototype.raycast
MeshRaycast.install()

/** What three's own test finds, for the same mesh and line. */
const plainHits = (mesh: Mesh, raycaster: Raycaster): Intersection[] => {
  const hits: Intersection[] = []
  plain.call(mesh, raycaster, hits)
  return hits.sort((a, b) => a.distance - b.distance)
}

/** Lines from inside a shell outwards and from outside through it, as the eye seated in a van looks out at a light. */
const lines = (): Raycaster[] => {
  const out: Raycaster[] = []
  let seed = 7
  const random = () => (seed = (Math.imul(seed, 1103515245) + 12345) >>> 0) / 4294967296
  for (let i = 0; i < 60; i++) {
    const origin = i % 2 === 0 ? new Vector3(0.1, 0.2, -0.3) : new Vector3(random() * 20 - 10, random() * 20 - 10, 15)
    const direction = new Vector3(random() - 0.5, random() - 0.5, random() - 0.5).normalize()
    if (i % 2 === 1) direction.subVectors(new Vector3(random() - 0.5, random() - 0.5, 0), origin).normalize()
    out.push(new Raycaster(origin, direction, 0, 40))
  }
  return out
}

describe("raycasting a mesh through a tree of its triangles", () => {
  it("finds what three finds, at the same distances, from inside a shell as from outside it", () => {
    const group = new Group()
    const shell = new Mesh(new SphereGeometry(2, 64, 48), new MeshBasicMaterial({ side: DoubleSide }))
    shell.position.set(0.5, 0, 0)
    shell.scale.set(2, 1, 1.5)
    shell.rotation.set(0.3, 0.7, 0)
    group.add(shell)
    group.updateMatrixWorld(true)
    let compared = 0
    for (const raycaster of lines()) {
      const hits: Intersection[] = []
      shell.raycast(raycaster, hits)
      hits.sort((a, b) => a.distance - b.distance)
      const expected = plainHits(shell, raycaster)
      expect(hits.map(hit => hit.distance)).toEqual(expected.map(hit => expect.closeTo(hit.distance, 6)))
      expect(hits.every(hit => hit.object === shell)).toBe(true)
      compared += expected.length
    }
    expect(compared).toBeGreaterThan(40)
  })

  it("follows a geometry whose vertices move, as three does, rather than a tree of where they were", () => {
    const mesh = new Mesh(new SphereGeometry(1, 48, 32), new MeshBasicMaterial())
    mesh.updateMatrixWorld(true)
    const raycaster = new Raycaster(new Vector3(0, 0, 10), new Vector3(0, 0, -1))
    const first: Intersection[] = []
    mesh.raycast(raycaster, first)
    expect(first[0].distance).toBeCloseTo(9, 2)
    // Pushed back by two metres in place, as a sagging wire's are rewritten.
    const position = mesh.geometry.attributes.position
    for (let i = 0; i < position.count; i++) position.setZ(i, position.getZ(i) - 2)
    position.needsUpdate = true
    mesh.geometry.computeBoundingSphere()
    const second: Intersection[] = []
    mesh.raycast(raycaster, second)
    expect(second[0].distance).toBeCloseTo(11, 2)
  })

  it("leaves a small mesh, and one the line does not come near, to three", () => {
    const box = new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial())
    box.updateMatrixWorld(true)
    const hits: Intersection[] = []
    box.raycast(new Raycaster(new Vector3(0, 0, 5), new Vector3(0, 0, -1)), hits)
    expect(hits.map(hit => hit.distance)).toEqual(plainHits(box, new Raycaster(new Vector3(0, 0, 5), new Vector3(0, 0, -1))).map(hit => hit.distance))
    const far = new Mesh(new SphereGeometry(1, 48, 32), new MeshBasicMaterial())
    far.position.set(100, 0, 0)
    far.updateMatrixWorld(true)
    const none: Intersection[] = []
    far.raycast(new Raycaster(new Vector3(0, 0, 5), new Vector3(0, 0, -1)), none)
    expect(none).toEqual([])
  })
})
