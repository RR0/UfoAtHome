import { describe, expect, it, vi } from "vitest"
import { BoxGeometry, BufferGeometry, DirectionalLight, Float32BufferAttribute, Group, Mesh, MeshBasicMaterial, MeshLambertMaterial, Object3D, PerspectiveCamera, Raycaster, Sprite, Vector3 } from "three"
import { SceneRenderer } from "../../src/render3d/SceneRenderer.js"
import { DecorSystem } from "../../src/render3d/DecorSystem.js"
import { RoadSystem } from "../../src/render3d/RoadSystem.js"
import { AerialPerspective } from "../../src/engine/atmosphere/AerialPerspective.js"

// Exercise the CPU scene updates without constructing a WebGL context.
function renderer() {
  return Object.assign(Object.create(SceneRenderer.prototype), {
    cloudRendering: "surface", weather: { cloudCover: 0.3, cloudDarkness: 0.2, highCloudCover: 0.1 },
    observerElevationM: 0, cloudFieldOffset: new Vector3(), celestialGroup: new Group(),
    camera: new PerspectiveCamera(), scene: new Group(), decorGroups: new Map(), decorPresence: new Map(), decorSunlight: new Map(), sceneSunBeam: [0, 0, 0], groundRadius: 1000,
    compassHovered: false, compassForced: false,
    gaitOffset: { eastM: 0, northM: 0, upM: 0 }, poseCameraY: 1.6,
    // What the real constructor builds from the card — see AdaptiveResolution; nothing here has a card.
    resolution: { beginDrawing(): void {}, endDrawing(): void {}, update(): undefined { return undefined }, reset(): void {} },
    // Also built by the constructor: the roads ride with the patch, so anchoring the decor moves
    // them too (see SceneRenderer.updateDecorAnchoring).
    roadSystem: new RoadSystem(),
    // The air a star's light crosses (see SceneRenderer.arrivingIlluminance).
    air: new AerialPerspective(), siteElevationM: 0,
    // The interpretation's bodies, which the map must not cover either.
    bodySystem: { reflectors: [] },
    // The Sun's light and the scratch its shadow frustum is placed with (see placeShadowFrustum).
    celestialLight: new DirectionalLight(), celestialLightTarget: new Object3D(), lightDirection: new Vector3(0, 1, 0),
    shadowUp: new Vector3(0, 1, 0), shadowAxisX: new Vector3(), shadowAxisY: new Vector3(), shadowWorld: new Vector3()
  })
}

describe("scene playback resource reuse", () => {
  it("reports projected aircraft bounds but excludes background scenery", () => {
    const r = renderer()
    const aircraft = new Group()
    aircraft.add(new Mesh(new BoxGeometry(2, 2, 2)))
    aircraft.position.set(6, 2, -10)
    r.decorGroups.set("plane", aircraft)
    r.decorObjects = [{ id: "plane", kind: "aircraft" }, { id: "crop", kind: "crop" }]
    r.decorGroups.set("crop", new Group())
    r.screenPointOf = (direction: Vector3) => direction.z < 0
      ? { ndcX: direction.x / -direction.z, ndcY: direction.y / -direction.z } : undefined
    const right = r.mapSubjectBounds()
    expect(right).toHaveLength(1)
    expect(right[0].x).toBeGreaterThan(0.5)
    expect(right[0].width).toBeGreaterThan(0)
    aircraft.position.x = -6
    expect(r.mapSubjectBounds()[0].x).toBeLessThan(0.5)
    aircraft.position.z = 10
    expect(r.mapSubjectBounds()).toEqual([])
    DecorSystem.dispose(aircraft)
  })
  it("counts the interpretation's bodies as subjects the map must not cover", () => {
    const r = renderer()
    const craft = new Group()
    craft.add(new Mesh(new BoxGeometry(2, 2, 2)))
    craft.position.set(-6, 2, -10)
    r.decorObjects = []
    r.bodySystem = { reflectors: [{ id: "craft", holder: craft, shiny: false }] }
    r.screenPointOf = (direction: Vector3) => direction.z < 0
      ? { ndcX: direction.x / -direction.z, ndcY: direction.y / -direction.z } : undefined
    const bounds = r.mapSubjectBounds()
    expect(bounds).toHaveLength(1)
    expect(bounds[0].x + bounds[0].width).toBeLessThan(0.5)
  })
  it("does not count what is behind the eye or beside the picture as covering it", () => {
    const r = renderer()
    const tractor = new Group()
    tractor.add(new Mesh(new BoxGeometry(3.4, 2.4, 3.2)))
    r.decorObjects = [{ id: "tractor", kind: "vehicle" }]
    r.decorGroups.set("tractor", tractor)
    r.bodySystem = { reflectors: [] }
    // An eye's projection: every direction lands somewhere, the angle from the axis as the radius —
    // what puts a thing behind the observer far outside the picture on every side at once.
    r.screenPointOf = (direction: Vector3) => {
      const angle = Math.acos(Math.max(-1, Math.min(1, -direction.z)))
      const around = Math.atan2(direction.y, direction.x)
      const radius = angle / (Math.PI / 6)
      return { ndcX: radius * Math.cos(around), ndcY: radius * Math.sin(around) }
    }
    tractor.position.set(0, 0, 90)
    expect(r.mapSubjectBounds()).toEqual([])
    tractor.position.set(-40, 0, -10)
    expect(r.mapSubjectBounds()).toEqual([])
    tractor.position.set(0, 0, -30)
    expect(r.mapSubjectBounds()).toHaveLength(1)
  })
  it("keeps compass captions out of the accumulated exposure samples", () => {
    const r = renderer()
    const sprite = new Sprite()
    r.compassSprites = [sprite]
    r.exposureInstants = 1
    r.exposureInstantsDone = 0
    r.exposureInstantAt = vi.fn()
    r.exposureAccumulation = { instantTarget: { scene: { width: 1, height: 1 } }, add: vi.fn() }
    r.renderOnce = vi.fn(() => expect(sprite.visible).toBe(false))
    r.presentExposure = vi.fn()
    r.developExposure()
    expect(r.renderOnce).toHaveBeenCalledOnce()
    expect(sprite.visible).toBe(true)
    expect(r.presentExposure).toHaveBeenCalledOnce()
  })
  it("does not redraw on hover when no compass exists or another control keeps it visible", () => {
    const r = renderer()
    r.compassSprites = []
    r.render = vi.fn()
    r.setCompassHovered(true)
    r.setCompassHovered(false)
    expect(r.render).not.toHaveBeenCalled()
    r.compassSprites = [new Sprite()]
    r.compassForced = true
    r.setCompassHovered(true)
    r.setCompassHovered(false)
    expect(r.render).not.toHaveBeenCalled()
  })

  it("redisplays the same exposure on compass hover without restarting or resampling it", () => {
    const r = renderer()
    const sprite = new Sprite()
    sprite.visible = false
    r.compassSprites = [sprite]
    r.exposureInstants = 100
    r.exposureInstantsDone = 40
    r.exposureInstantAt = vi.fn()
    r.exposureFrameId = 123
    r.render = vi.fn()
    const develop = vi.fn()
    r.exposureAccumulation = { develop }
    r.renderer = { autoClear: true, render: vi.fn() }
    r.screenPointOf = () => ({ ndcX: 0, ndcY: 0 })
    r.setCompassHovered(true)
    expect(sprite.visible).toBe(true)
    expect(develop).toHaveBeenLastCalledWith(r.renderer, 2.5)
    expect(r.renderer.render).toHaveBeenCalledOnce()
    r.setCompassHovered(false)
    expect(sprite.visible).toBe(false)
    expect(develop).toHaveBeenCalledTimes(2)
    expect(r.render).not.toHaveBeenCalled()
    expect(r.exposureInstantAt).not.toHaveBeenCalled()
    expect(r.exposureInstantsDone).toBe(40)
    expect(r.exposureFrameId).toBe(123)
    expect(r.renderer.autoClear).toBe(true)
  })
  it("retains star shaders while updating their positions between exposure instants", () => {
    const r = renderer()
    r.starTiers = []
    r.startTwinkle = vi.fn()
    r.syncAnimationLoop = vi.fn()
    const stars = {
      catalog: { count: 1, ra: new Float32Array([6]), dec: new Float32Array([80]), mag: new Float32Array([1]) },
      date: new Date("1990-11-05T18:00:00Z"), observer: { lat: 49, lng: 2, elevationM: 0 }
    }
    r.buildStars(stars, 5)
    const points = r.starTiers.map((tier: { points: Mesh }) => tier.points)
    const materials = points.map((point: Mesh) => point.material)
    const positions = r.starTiers.flatMap((tier: { points: Mesh }) => Array.from(tier.points.geometry.getAttribute("position").array))
    r.buildStars({ ...stars, date: new Date("1990-11-05T18:00:20Z") }, 5)
    expect(r.starTiers.map((tier: { points: Mesh }) => tier.points)).toEqual(points)
    expect(r.starTiers.map((tier: { points: Mesh }) => tier.points.material)).toEqual(materials)
    expect(r.starTiers.flatMap((tier: { points: Mesh }) => Array.from(tier.points.geometry.getAttribute("position").array))).not.toEqual(positions)
    r.buildStars(undefined, 5)
    expect(r.starTiers).toHaveLength(0)
  })
  it("reuses the sky and ground across exposure instants while updating the sky colours", () => {
    const r = renderer()
    r.buildSky({ altitudeDeg: -15, azimuthDeg: 90 })
    r.buildGround()
    const sky = r.skyMesh, ground = r.groundMesh
    const colors = sky.geometry.getAttribute("color")
    const before = Array.from(colors.array)
    const disposeSky = vi.spyOn(sky.material, "dispose")
    const disposeGround = vi.spyOn(ground.material, "dispose")
    for (let i = 0; i < 60; i++) {
      r.buildSky({ altitudeDeg: i / 2, azimuthDeg: 90 + i })
      r.buildGround()
    }
    expect(r.skyMesh).toBe(sky)
    expect(r.skyMesh.geometry.getAttribute("color")).toBe(colors)
    expect(Array.from(colors.array)).not.toEqual(before)
    expect(r.groundMesh).toBe(ground)
    expect(disposeSky).not.toHaveBeenCalled()
    expect(disposeGround).not.toHaveBeenCalled()
    r.observerElevationM = 1000
    r.buildGround()
    expect(r.groundMesh).not.toBe(ground)
    expect(disposeGround).toHaveBeenCalledOnce()
    r.disposeMesh(sky)
    r.disposeMesh(r.groundMesh)
  })
  it("updates interpolated surface weather without replacing geometry or materials", () => {
    const r = renderer()
    r.buildClouds()
    r.buildCirrus()
    const cloud = r.cloudMesh, cirrus = r.cirrusMesh
    const dispose = vi.spyOn(cloud.material, "dispose")
    for (let i = 0; i < 60; i++) {
      r.weather = { cloudCover: 0.3 + i / 1000, cloudDarkness: 0.2 + i / 1000, highCloudCover: 0.1 + i / 1000 }
      r.buildClouds()
      r.buildCirrus()
    }
    expect(r.cloudMesh).toBe(cloud)
    expect(r.cirrusMesh).toBe(cirrus)
    expect(dispose).not.toHaveBeenCalled()
    expect(r.cloudUniforms.coverage.value).toBeCloseTo(0.359)
    expect(r.cirrusUniforms.coverage.value).toBeCloseTo(0.159)
    r.weather.cloudCover = 0
    r.weather.highCloudCover = 0
    r.buildClouds()
    r.buildCirrus()
    expect(dispose).toHaveBeenCalledOnce()
    expect(r.cloudMesh).toBeUndefined()
    expect(r.cirrusMesh).toBeUndefined()
  })

  it("keeps crops fixed to the terrain during gait but refits after a real placement change", () => {
    const r = renderer()
    const geometry = new BufferGeometry()
    geometry.setAttribute("position", new Float32BufferAttribute([-100, 0, -100, 100, 20, -100, -100, 0, 100, 100, 20, 100], 3))
    r.terrainMesh = new Mesh(geometry)
    r.terrainOrigin = { lat: 43, lng: 6 }
    const object = { id: "crop", kind: "crop" as const, eastM: 10, northM: 20 }
    r.decorObjects = [object]
    const group = DecorSystem.build(object, false)
    r.decorGroups.set(object.id, group)
    const pose = { lat: 43, lng: 6 }
    const fit = vi.spyOn(DecorSystem, "fitCropToGround")
    r.updateDecorAnchoring(pose, pose)
    const local = group.position.clone().sub(r.terrainMesh.position)
    for (let i = 0; i < 60; i++) {
      r.gaitOffset = { eastM: Math.sin(i) * 0.03, northM: Math.cos(i) * 0.03, upM: 0 }
      r.updateDecorAnchoring(pose, pose, i * 16)
      expect(group.position.clone().sub(r.terrainMesh.position).distanceTo(local)).toBeLessThan(1e-8)
    }
    expect(fit).toHaveBeenCalledOnce()
    object.eastM += 10
    r.updateDecorAnchoring(pose, pose, 1000)
    expect(fit).toHaveBeenCalledTimes(2)
    expect(group.position.y).toBeGreaterThan(local.y)
    fit.mockRestore()
    DecorSystem.dispose(group)
    geometry.dispose()
  })
})

describe("decor that exists only for a while", () => {
  /** A renderer with one moving aircraft whose track starts at 10 s and ends at 20 s. */
  function withAircraft() {
    const r = renderer()
    const object = {
      id: "traffic-1-0", kind: "aircraft" as const, eastM: 0, northM: 50_000,
      track: [{ t: 10_000, eastM: 0, northM: 50_000, altitudeM: 8000 }, { t: 20_000, eastM: 0, northM: 51_000, altitudeM: 8000 }]
    }
    const group = new Group()
    r.decorObjects = [object]
    r.decorGroups.set(object.id, group)
    r.setDecorPresence(new Map([[object.id, { fromMs: 10_000, untilMs: 20_000 }]]))
    return { r, group }
  }
  const pose = { lat: 43, lng: 6 }

  it("is drawn from its first position to its last, and not before or after", () => {
    const { r, group } = withAircraft()
    for (const [t, visible] of [[0, false], [9_999, false], [10_000, true], [15_000, true], [20_000, true], [20_001, false], [60_000, false]] as const) {
      r.updateDecorAnchoring(pose, pose, t)
      expect(group.visible, `at ${t} ms`).toBe(visible)
    }
  })

  it("does not push the far plane out for an aircraft that is not there", () => {
    const { r } = withAircraft()
    r.updateDecorAnchoring(pose, pose, 0)
    const farWhileAbsent = r.camera.far
    r.updateDecorAnchoring(pose, pose, 15_000)
    expect(r.camera.far).toBeGreaterThan(farWhileAbsent)
    expect(r.camera.far).toBeGreaterThan(50_000)
  })

  it("leaves alone an object with no presence, which is always there", () => {
    const { r } = withAircraft()
    const still = new Group()
    r.decorObjects = [...r.decorObjects, { id: "shack", kind: "building", eastM: 5, northM: 5 }]
    r.decorGroups.set("shack", still)
    for (const t of [0, 15_000, 60_000]) {
      r.updateDecorAnchoring(pose, pose, t)
      expect(still.visible).toBe(true)
    }
  })
})

describe("the Sun on an aircraft", () => {
  const pose = { lat: 43, lng: 6 }
  const SUN_MAGNITUDE = -26.74

  /** One aircraft: a white body and a lamp, in a scene whose own light is the Sun at `groundSun` degrees (a beam of what the ground gives it, or none under the horizon). */
  function aircraftUnder(groundSunDeg: number, sunlight: { heightM: number; sunElevationDeg: number }, cloudTransmission = 1) {
    const r = renderer()
    r.lastAstronomy = { sun: { altitudeDeg: groundSunDeg, azimuthDeg: 250, magnitude: SUN_MAGNITUDE } }
    r.cloudTransmission = () => cloudTransmission
    // What the scene's own light is: the beam the ground sees, the way updateCelestialLight works it out, or none.
    const illuminance = 1.3e5 * 1e-4 * 0 + (r.relativeScale as number) * 1.3e5
    const ground = groundSunDeg >= 0 ? r.air.transmittanceFromSpace(0, groundSunDeg).map((t: number) => illuminance * t * cloudTransmission) : [0, 0, 0]
    r.sceneSunBeam = ground
    const group = new Group()
    const body = new Mesh(new BoxGeometry(1, 1, 1), new MeshLambertMaterial({ color: 0xffffff }))
    const lamp = new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial({ color: 0xff0000 }))
    lamp.userData = { emissive: true }
    group.add(body, lamp)
    const object = { id: "traffic-1-0", kind: "aircraft" as const, eastM: 0, northM: 0 }
    r.decorObjects = [object]
    r.decorGroups.set(object.id, group)
    r.setDecorSunlight(new Map([[object.id, sunlight]]))
    r.updateDecorAnchoring(pose, pose, 0)
    const emissive = (body.material as MeshLambertMaterial).emissive
    return { r, emissive: [emissive.r, emissive.g, emissive.b], lamp, body }
  }

  it("lights an airliner at cruising height orange against a dusk that has already gone dark on the ground", () => {
    const { emissive } = aircraftUnder(-2, { heightM: 10668, sunElevationDeg: -2 })
    expect(emissive[0]).toBeGreaterThan(0)
    // Reddened by the air the light crosses at a grazing angle, over the thin air above it.
    expect(emissive[0] / emissive[2]).toBeGreaterThan(1.5)
    expect(emissive[0]).toBeGreaterThan(emissive[1])
  })

  it("leaves it dark once the Sun is under its own horizon, and in the night", () => {
    expect(aircraftUnder(-6, { heightM: 10668, sunElevationDeg: -6 }).emissive).toEqual([0, 0, 0])
    expect(aircraftUnder(-30, { heightM: 10668, sunElevationDeg: -30 }).emissive).toEqual([0, 0, 0])
  })

  it("does not light a low aircraft in the dusk that has put the ground in the dark: its horizon is the ground's", () => {
    expect(aircraftUnder(-2, { heightM: 300, sunElevationDeg: -2 }).emissive).toEqual([0, 0, 0])
  })

  it("adds almost nothing at noon, when the scene's own light is already the Sun", () => {
    const dusk = aircraftUnder(-2, { heightM: 10668, sunElevationDeg: -2 }).emissive
    const noon = aircraftUnder(45, { heightM: 10668, sunElevationDeg: 45 }).emissive
    // At altitude the beam is only slightly whiter than at the ground: a fraction of what the dusk adds to an unlit body.
    expect(noon[1]).toBeLessThan(dusk[1] * 0.5)
  })

  it("keeps the Sun off an aircraft under the observer's overcast, but not one above every deck", () => {
    const under = aircraftUnder(-0.2, { heightM: 5000, sunElevationDeg: -0.2 }, 0.0)
    const above = aircraftUnder(-0.2, { heightM: 10668, sunElevationDeg: -0.2 }, 0.0)
    expect(under.emissive).toEqual([0, 0, 0])
    expect(above.emissive[0]).toBeGreaterThan(0)
  })

  it("never touches the lamps, which are lights and not surfaces", () => {
    const { lamp } = aircraftUnder(-2, { heightM: 10668, sunElevationDeg: -2 })
    expect((lamp.material as MeshBasicMaterial).color.getHex()).toBe(0xff0000)
    expect("emissive" in (lamp.material as object)).toBe(false)
  })

  it("is the same body again once the Sun has left it", () => {
    const { r, body, emissive } = aircraftUnder(-2, { heightM: 10668, sunElevationDeg: -2 })
    expect(emissive[0]).toBeGreaterThan(0)
    r.setDecorSunlight(new Map([["traffic-1-0", { heightM: 10668, sunElevationDeg: -9 }]]))
    r.updateDecorAnchoring(pose, pose, 0)
    expect((body.material as MeshLambertMaterial).emissive.r).toBe(0)
  })

  it("leaves a still object alone: only what the scene was told flies is lit from above", () => {
    const r = renderer()
    r.lastAstronomy = { sun: { altitudeDeg: -2, azimuthDeg: 250, magnitude: SUN_MAGNITUDE } }
    const group = new Group()
    const body = new Mesh(new BoxGeometry(1, 1, 1), new MeshLambertMaterial({ color: 0xffffff }))
    group.add(body)
    r.decorObjects = [{ id: "shack", kind: "building", eastM: 5, northM: 5 }]
    r.decorGroups.set("shack", group)
    r.updateDecorAnchoring(pose, pose, 0)
    expect((body.material as MeshLambertMaterial).emissive.r).toBe(0)
  })
})

describe("pointing at an aircraft of the record of air traffic", () => {
  /** Aircraft ten kilometres off, none of them a pixel across: a ray never meets them, so they are picked by angle. */
  function sky() {
    const r = renderer()
    r.raycaster = new Raycaster()
    r.camera.position.set(0, 0, 0)
    r.camera.fov = 60
    r.camera.updateProjectionMatrix()
    r.camera.updateMatrixWorld(true)
    const place = (id: string, x: number, y: number, z: number, visible = true) => {
      const group = new Group()
      group.position.set(x, y, z)
      group.visible = visible
      r.decorGroups.set(id, group)
    }
    place("traffic-aaaaaa-0", 0, 1000, -10000)
    place("traffic-bbbbbb-0", 5000, 1000, -10000)
    place("traffic-cccccc-0", 0, 1000, -10000, false)
    place("shack", 0, 0, -50)
    return r
  }

  it("picks the aircraft nearest the pointer, though it is under a pixel across", () => {
    const r = sky()
    // The first stands 5.7 degrees up, dead ahead; the second 26.6 degrees to the right.
    const ahead = new Vector3(0, 1000, -10000).project(r.camera)
    expect(r.pickTrafficAt(ahead.x, ahead.y)).toBe("traffic-aaaaaa-0")
    const right = new Vector3(5000, 1000, -10000).project(r.camera)
    expect(r.pickTrafficAt(right.x, right.y)).toBe("traffic-bbbbbb-0")
  })

  it("picks nothing when the pointer is far from every aircraft", () => {
    const r = sky()
    expect(r.pickTrafficAt(-0.9, -0.9)).toBeUndefined()
  })

  it("does not pick an aircraft that is not there, nor anything the recording stands in the decor", () => {
    const r = sky()
    r.decorGroups.get("traffic-aaaaaa-0")!.visible = false
    const hidden = new Vector3(0, 1000, -10000).project(r.camera)
    // The hidden ones are not picked; what is near the pointer is the next, or none.
    expect(r.pickTrafficAt(hidden.x, hidden.y)).not.toBe("traffic-aaaaaa-0")
    expect(r.pickTrafficAt(hidden.x, hidden.y)).not.toBe("traffic-cccccc-0")
    const shack = new Vector3(0, 0, -50).project(r.camera)
    expect(r.pickTrafficAt(shack.x, shack.y)).not.toBe("shack")
  })
})

describe("the Sun's shadow as the observer walks", () => {
  it("keeps each shadow texel on the same ground while the world slides under the eye", () => {
    const light = new DirectionalLight()
    light.shadow.mapSize.set(1024, 1024)
    Object.assign(light.shadow.camera, { left: -120, right: 120, top: 120, bottom: -120 })
    const r = Object.assign(Object.create(SceneRenderer.prototype), {
      celestialLight: light, celestialLightTarget: new Object3D(), lightDirection: new Vector3(0.3, 0.12, -0.9).normalize(),
      shadowUp: new Vector3(0, 1, 0), shadowAxisX: new Vector3(), shadowAxisY: new Vector3(), shadowWorld: new Vector3(),
      bodyOrigin: { x: 0, z: 0 }, shadowLightDistanceM: 850
    })
    const texel = 240 / 1024
    // Where a fixed point of the world falls on the shadow map, in texels, for a world slid by (x, z).
    const texelOf = (x: number, z: number) => {
      r.bodyOrigin = { x, z }
      r.placeShadowFrustum()
      light.shadow.camera.position.copy(light.position)
      light.shadow.camera.lookAt(r.celestialLightTarget.position)
      light.shadow.camera.updateMatrixWorld()
      const point = new Vector3(5 + x, 0, -7 + z).applyMatrix4(light.shadow.camera.matrixWorldInverse)
      return [point.x / texel, point.y / texel]
    }
    const [x0, y0] = texelOf(0, 0)
    for (const [x, z] of [[0.013, 0.004], [0.37, -1.2], [11.1, 7.45]]) {
      const [x1, y1] = texelOf(x, z)
      // The same fraction of a texel: the world moved by whole texels as far as the map is concerned.
      expect(Math.abs(((x1 - x0) % 1 + 1.5) % 1 - 0.5)).toBeLessThan(1e-3)
      expect(Math.abs(((y1 - y0) % 1 + 1.5) % 1 - 0.5)).toBeLessThan(1e-3)
    }
  })
})

describe("the Sun's shadow box", () => {
  it("takes in a body standing past the decor's couple of hundred metres, and narrows back", () => {
    const light = new DirectionalLight()
    light.shadow.mapSize.set(1024, 1024)
    Object.assign(light.shadow.camera, { left: -120, right: 120, top: 120, bottom: -120 })
    let reach = 270
    const r = Object.assign(Object.create(SceneRenderer.prototype), {
      celestialLight: light, celestialLightTarget: new Object3D(), lightDirection: new Vector3(0.3, 0.12, -0.9).normalize(),
      shadowUp: new Vector3(0, 1, 0), shadowAxisX: new Vector3(), shadowAxisY: new Vector3(), shadowWorld: new Vector3(),
      bodyOrigin: { x: 0, z: 0 }, shadowLightDistanceM: 850, shadowHalfExtentM: 120,
      camera: { position: new Vector3() }, bodySystem: { reachFrom: () => reach }
    })
    r.fitShadowToBodies()
    const camera = light.shadow.camera
    expect(camera.right).toBeGreaterThanOrEqual(270)
    expect(light.shadow.mapSize.x).toBe(2048)
    // Deep enough for the box seen from the light, which stands beyond that depth.
    expect(camera.far - camera.near).toBeGreaterThanOrEqual(2 * camera.right)
    expect(camera.near).toBeGreaterThan(0)
    reach = 40
    r.fitShadowToBodies()
    expect(camera.right).toBe(120)
    expect(light.shadow.mapSize.x).toBe(1024)
  })
})
