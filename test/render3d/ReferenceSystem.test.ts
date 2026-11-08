import { describe, expect, it } from "vitest"
import { PerspectiveCamera, Scene, Texture, Vector3 } from "three"
import type { Mesh } from "three"
import { ReferenceSystem, REFERENCE_LAYER } from "../../src/render3d/ReferenceSystem.js"
import type { SceneReference } from "../../src/engine/model/Reference.js"
import { PhenomenonSystem } from "../../src/render3d/PhenomenonSystem.js"
import { ReferenceTimeline } from "../../src/engine/reference/ReferenceTimeline.js"
import { PictureFetchError } from "../../src/engine/reference/PictureFetch.js"

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
  it("fades a picture out as the observer walks away from where it was taken", async () => {
    const scene = new Scene()
    const system = new ReferenceSystem(scene, () => {}, loaded())
    const from = { lat: 49.078927, lng: 2.327339 }
    const reference = photo({}, { from })
    system.set([reference], undefined, from)
    await settled()
    system.set([reference], undefined, from)
    const material = () => (meshOf(scene, "vue-1968")!.material as { opacity: number }).opacity
    expect(material()).toBeCloseTo(0.5, 6)
    // About 11 m north: halfway through the fade.
    system.set([reference], undefined, { lat: from.lat + 0.0001, lng: from.lng })
    expect(material()).toBeGreaterThan(0.1)
    expect(material()).toBeLessThan(0.4)
    // 55 m north: gone, and not drawn at all.
    system.set([reference], undefined, { lat: from.lat + 0.0005, lng: from.lng })
    expect(meshOf(scene, "vue-1968")!.visible).toBe(false)
  })

  it("never fades a picture that does not say where it was taken", () => {
    expect(ReferenceSystem.presenceAt(photo(), { lat: 10, lng: 10 })).toBe(1)
    expect(ReferenceSystem.presenceAt(photo({}, { from: { lat: 0, lng: 0 } }), undefined)).toBe(1)
  })

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
    expect(system.failureOf(photo().src)).toBeDefined()
    expect(system.any).toBe(false)
  })

  it("stops showing a picture whose address was changed for one that cannot be read, and says why", async () => {
    const scene = new Scene()
    const unreadable = "https://elsewhere.example/photo.jpg"
    const system = new ReferenceSystem(scene, () => {}, src => src === unreadable
      ? Promise.reject(new PictureFetchError(src, { kind: "notShared" }))
      : loaded()())
    system.set([photo()])
    await settled()
    expect(meshOf(scene, "vue-1968")).toBeDefined()
    system.set([photo({}, { src: unreadable })])
    await settled()
    expect(meshOf(scene, "vue-1968")).toBeUndefined()
    expect(system.failureOf(unreadable)).toEqual({ kind: "notShared" })
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
  describe("a video", () => {
    function element(duration = 10) {
      return {
        currentTime: 0, duration, paused: true, playbackRate: 1, seeking: false,
        pause() { this.paused = true },
        play() { this.paused = false; return Promise.resolve() }
      }
    }

    function film(extra: Partial<SceneReference> = {}): SceneReference {
      return { ...photo(), id: "film", kind: "video", src: "film.mp4", ...extra }
    }

    async function standing(reference: SceneReference, video = element()) {
      const scene = new Scene()
      const system = new ReferenceSystem(scene, () => undefined, loaded(), () => Promise.resolve({ texture: new Texture(), width: 640, height: 480, video }))
      system.set([reference])
      await settled()
      return { scene, system, video }
    }

    it("shows the frame of the instant while the timeline is paused", async () => {
      const { system, video } = await standing(film({ video: { fromS: 1 } }))
      system.setTime({ t: 2000, playing: false, timeScale: 1 })
      expect(video.currentTime).toBeCloseTo(3)
      expect(video.paused).toBe(true)
    })

    it("plays with the timeline and stops with it", async () => {
      const { system, video } = await standing(film())
      system.setTime({ t: 0, playing: true, timeScale: 1 })
      expect(video.paused).toBe(false)
      system.setTime({ t: 0, playing: false, timeScale: 1 })
      expect(video.paused).toBe(true)
    })

    it("does not ask for a jump while one is under way", async () => {
      const { system, video } = await standing(film())
      video.seeking = true
      system.setTime({ t: 2000, playing: false, timeScale: 1 })
      expect(video.currentTime).toBe(0)
    })

    it("is there only during its own stretch", async () => {
      const { scene, system, video } = await standing(film({ t: 1000, video: { toS: 2 } }))
      system.setTime({ t: 0, playing: true, timeScale: 1 })
      expect(meshOf(scene, "film")!.visible).toBe(false)
      expect(video.paused).toBe(true)
      system.setTime({ t: 1500, playing: true, timeScale: 1 })
      expect(meshOf(scene, "film")!.visible).toBe(true)
      system.setTime({ t: 3500, playing: true, timeScale: 1 })
      expect(meshOf(scene, "film")!.visible).toBe(false)
      expect(video.paused).toBe(true)
    })

    it("turns with its camera", async () => {
      const reference = film({ registrationTrack: [{ t: 0, headingDeg: 0, pitchDeg: 0 }, { t: 1000, headingDeg: 90, pitchDeg: 0 }] })
      const { system } = await standing(reference)
      const direction = new Vector3()
      system.setTime({ t: 0, playing: false, timeScale: 1 })
      expect(aimOf(system.directionOfPixel(reference, 0.5, 0.5, direction)).azimuthDeg).toBeCloseTo(0)
      system.setTime({ t: 1000, playing: false, timeScale: 1 })
      expect(aimOf(system.directionOfPixel(reference, 0.5, 0.5, direction)).azimuthDeg).toBeCloseTo(90)
    })

    it("widens with a key's field, about its own axis", async () => {
      const reference = film({ registration: { headingDeg: 0, pitchDeg: 0, fovDeg: 20 }, registrationTrack: [{ t: 0, headingDeg: 0, pitchDeg: 0, fovDeg: 40 }] })
      const { scene, system } = await standing(reference)
      system.setTime({ t: 0, playing: false, timeScale: 1 })
      const expected = Math.tan((40 / 2) * Math.PI / 180) / Math.tan((20 / 2) * Math.PI / 180)
      expect(meshOf(scene, "film")!.scale.x).toBeCloseTo(expected)
      expect(meshOf(scene, "film")!.scale.z).toBe(1)
    })

    it("takes another path than a photo's when its address cannot be read", async () => {
      const scene = new Scene()
      const system = new ReferenceSystem(scene, () => undefined, loaded(), () => Promise.reject(new PictureFetchError("film.mp4", { kind: "notVideo" })))
      system.set([film()])
      await settled()
      expect(system.failureOf("film.mp4")).toEqual({ kind: "notVideo" })
    })
  })

  it("stands a picture square in the frame of the camera it was taken with, roll included", async () => {
    const pose = { headingDeg: 30, pitchDeg: -29, rollDeg: -2.5 }
    const reference = photo({ headingDeg: pose.headingDeg, pitchDeg: pose.pitchDeg, rollDeg: ReferenceTimeline.rollOfPicture(pose.rollDeg), fovDeg: 20 })
    const system = new ReferenceSystem(new Scene(), () => undefined, loaded(640, 480))
    system.set([reference])
    await settled()
    // As SceneRenderer.setObserverPose aims the camera.
    const camera = new PerspectiveCamera()
    const DEG = Math.PI / 180
    camera.rotation.set(pose.pitchDeg * DEG, -pose.headingDeg * DEG, pose.rollDeg * DEG, "YXZ")
    const up = system.directionOfPixel(reference, 0.5, 0, new Vector3()).sub(system.directionOfPixel(reference, 0.5, 1, new Vector3())).normalize()
    const cameraUp = new Vector3(0, 1, 0).applyQuaternion(camera.quaternion)
    expect(up.distanceTo(cameraUp)).toBeLessThan(1e-6)
  })
})
