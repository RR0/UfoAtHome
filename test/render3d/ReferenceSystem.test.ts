import { describe, expect, it } from "vitest"
import { PerspectiveCamera, Scene, Texture, Vector3 } from "three"
import type { Mesh } from "three"
import { ReferenceSystem, REFERENCE_LAYER } from "../../src/render3d/ReferenceSystem.js"
import type { SceneReference } from "../../src/engine/model/Reference.js"
import { PhenomenonSystem } from "../../src/render3d/PhenomenonSystem.js"

/** A picture whose bytes are already here: 4:3, the shape of a 1968 print. */
function loaded(width = 552, height = 385) {
  return () => Promise.resolve({ texture: new Texture(), width, height })
}

function photo(registration: Partial<SceneReference["registration"]> = {}, extra: Partial<SceneReference> = {}): SceneReference {
  return {
    id: "vue-1968",
    kind: "photo",
    src: "https://rr0.org/time/1/9/6/8/08/Cussac_hebdo.jpg",
    opacity: 0.5,
    registration: { headingDeg: 288, pitchDeg: 0, fovDeg: 30, ...registration },
    ...extra
  }
}

async function settled(): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 0))
}

function meshOf(scene: Scene, id: string): Mesh | undefined {
  return scene.children.find(child => child.userData.id === id) as Mesh | undefined
}

/** Azimuth/altitude of a world direction, the decor's own convention (east +x, up +y, north -z). */
function aimOf(direction: Vector3): { azimuthDeg: number; altitudeDeg: number } {
  const azimuthDeg = ((Math.atan2(direction.x, -direction.z) * 180) / Math.PI + 360) % 360
  const altitudeDeg = (Math.asin(direction.y) * 180) / Math.PI
  return { azimuthDeg, altitudeDeg }
}

describe("ReferenceSystem", () => {
  it("stands a photo on its own layer, over everything, at the recording's opacity, once its bytes arrive", async () => {
    const scene = new Scene()
    let redraws = 0
    const system = new ReferenceSystem(scene, () => redraws++, loaded())
    system.set([photo()])
    expect(meshOf(scene, "vue-1968")).toBeUndefined()
    await settled()
    const mesh = meshOf(scene, "vue-1968")!
    expect(mesh).toBeDefined()
    expect(redraws).toBe(1)
    expect(mesh.layers.isEnabled(REFERENCE_LAYER)).toBe(true)
    expect(mesh.layers.isEnabled(0)).toBe(false)
    const material = mesh.material as { opacity: number; depthTest: boolean; depthWrite: boolean; transparent: boolean }
    expect(material.opacity).toBe(0.5)
    expect(material.depthTest).toBe(false)
    expect(material.depthWrite).toBe(false)
    expect(material.transparent).toBe(true)
  })

  it("puts the picture's centre where it was registered, and its corners where a pinhole lens of that field puts them", async () => {
    const scene = new Scene()
    const system = new ReferenceSystem(scene, () => {}, loaded(552, 385))
    const reference = photo({ headingDeg: 288, pitchDeg: 5, fovDeg: 30 })
    system.set([reference])
    await settled()
    const centre = aimOf(system.directionOfPixel(reference, 0.5, 0.5, new Vector3()))
    expect(centre.azimuthDeg).toBeCloseTo(288, 6)
    expect(centre.altitudeDeg).toBeCloseTo(5, 6)
    // Top edge, middle column: exactly half the vertical field above the centre.
    const top = aimOf(system.directionOfPixel(reference, 0.5, 0, new Vector3()))
    expect(top.azimuthDeg).toBeCloseTo(288, 6)
    expect(top.altitudeDeg).toBeCloseTo(20, 6)
    // Right edge, middle row: the horizontal half-field a 4:3 picture has at that vertical field,
    // atan(tan(15°) × 552/385) = 21.02° — to the right, i.e. clockwise of the heading.
    const right = aimOf(system.directionOfPixel(reference, 1, 0.5, new Vector3()))
    const halfWidthDeg = (Math.atan(Math.tan((15 * Math.PI) / 180) * (552 / 385)) * 180) / Math.PI
    // At 5° of pitch the right edge is turned about the picture's own axis, so its azimuth is a
    // little past the flat half-width and its altitude a little under the centre's.
    const flat = photo({ headingDeg: 288, pitchDeg: 0, fovDeg: 30 })
    const flatRight = aimOf(system.directionOfPixel(flat, 1, 0.5, new Vector3()))
    expect(flatRight.azimuthDeg).toBeCloseTo(288 + halfWidthDeg, 6)
    expect(flatRight.altitudeDeg).toBeCloseTo(0, 6)
    expect(right.azimuthDeg).toBeGreaterThan(288 + halfWidthDeg)
    expect(right.altitudeDeg).toBeLessThan(5)
  })

  it("agrees with the phenomenon's own direction convention", () => {
    const scene = new Scene()
    const system = new ReferenceSystem(scene, () => {}, loaded())
    const reference = photo({ headingDeg: 135, pitchDeg: 20, fovDeg: 40 })
    const centre = system.directionOfPixel(reference, 0.5, 0.5, new Vector3())
    const expected = PhenomenonSystem.directionOf({ azimuthDeg: 135, altitudeDeg: 20 }, new Vector3())
    expect(centre.distanceTo(expected)).toBeLessThan(1e-9)
  })

  it("rolls the picture about its own axis, clockwise as looked at", async () => {
    const scene = new Scene()
    const system = new ReferenceSystem(scene, () => {}, loaded(400, 400))
    const rolled = photo({ headingDeg: 0, pitchDeg: 0, rollDeg: 90, fovDeg: 40 })
    system.set([rolled])
    await settled()
    // The top-middle pixel of a picture rolled a quarter turn clockwise is on the right, level.
    const top = aimOf(system.directionOfPixel(rolled, 0.5, 0, new Vector3()))
    expect(top.azimuthDeg).toBeCloseTo(20, 6)
    expect(top.altitudeDeg).toBeCloseTo(0, 6)
  })

  it("follows the eye, and is sized to subtend its field at its distance", async () => {
    const scene = new Scene()
    const system = new ReferenceSystem(scene, () => {}, loaded(552, 385))
    const reference = photo({ fovDeg: 30 })
    system.set([reference])
    await settled()
    const camera = new PerspectiveCamera(60, 16 / 9, 0.1, 1000)
    camera.position.set(12, 1.6, -7)
    camera.updateMatrixWorld()
    system.place(camera)
    const mesh = meshOf(scene, "vue-1968")!
    expect(mesh.position.distanceTo(camera.position)).toBe(0)
    mesh.geometry.computeBoundingBox()
    const box = mesh.geometry.boundingBox!
    const height = box.max.y - box.min.y
    const width = box.max.x - box.min.x
    const distance = -box.max.z
    // Single-precision vertices: five decimals of a degree is all a float32 metre keeps.
    expect((2 * Math.atan(height / 2 / distance) * 180) / Math.PI).toBeCloseTo(30, 5)
    expect(width / height).toBeCloseTo(552 / 385, 5)
  })

  it("lets the reader's own opacity outrank the recording's, and hide the pictures altogether", async () => {
    const scene = new Scene()
    const system = new ReferenceSystem(scene, () => {}, loaded())
    system.set([photo()])
    await settled()
    const mesh = meshOf(scene, "vue-1968")!
    system.setView("vue-1968", { opacity: 0.2 })
    expect((mesh.material as { opacity: number }).opacity).toBe(0.2)
    expect(mesh.visible).toBe(true)
    system.setShown(false)
    expect(mesh.visible).toBe(false)
    expect(system.any).toBe(false)
    system.setShown(true)
    expect(mesh.visible).toBe(true)
    system.setView("vue-1968", { opacity: 0 })
    expect(mesh.visible).toBe(false)
  })

  it("rebuilds a picture whose registration changed, and drops one that left the recording", async () => {
    const scene = new Scene()
    const system = new ReferenceSystem(scene, () => {}, loaded())
    system.set([photo()])
    await settled()
    const before = meshOf(scene, "vue-1968")!
    system.set([photo({ headingDeg: 300 })])
    const after = meshOf(scene, "vue-1968")!
    expect(after).not.toBe(before)
    expect(aimOf(system.directionOfPixel(photo({ headingDeg: 300 }), 0.5, 0.5, new Vector3())).azimuthDeg).toBeCloseTo(300, 6)
    system.set([photo({ headingDeg: 300 })])
    expect(meshOf(scene, "vue-1968")).toBe(after)
    system.set([])
    expect(meshOf(scene, "vue-1968")).toBeUndefined()
  })

  it("asks for a picture's bytes once, and never again after they could not be had", async () => {
    const scene = new Scene()
    let asked = 0
    const system = new ReferenceSystem(scene, () => {}, () => {
      asked++
      return Promise.reject(new Error("403"))
    })
    system.set([photo()])
    system.set([photo()])
    await settled()
    system.set([photo()])
    await settled()
    expect(asked).toBe(1)
    expect(system.failedToLoad(photo().src)).toBe(true)
    expect(system.any).toBe(false)
  })

  it("lays a panorama on the inside of a sphere", async () => {
    const scene = new Scene()
    const system = new ReferenceSystem(scene, () => {}, loaded(4096, 2048))
    system.set([photo({}, { id: "tour", kind: "panorama" })])
    await settled()
    const mesh = meshOf(scene, "tour")!
    expect(mesh.geometry.type).toBe("SphereGeometry")
    expect((mesh.material as { side: number }).side).toBe(1)
  })
})
