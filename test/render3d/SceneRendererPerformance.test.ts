import { describe, expect, it, vi } from "vitest"
import { BoxGeometry, BufferGeometry, DirectionalLight, Float32BufferAttribute, Group, Mesh, Object3D, PerspectiveCamera, Sprite, Vector3 } from "three"
import { SceneRenderer } from "../../src/render3d/SceneRenderer.js"
import { DecorSystem } from "../../src/render3d/DecorSystem.js"
import { RoadSystem } from "../../src/render3d/RoadSystem.js"
import { AerialPerspective } from "../../src/engine/atmosphere/AerialPerspective.js"

// Exercise the CPU scene updates without constructing a WebGL context.
function renderer() {
  return Object.assign(Object.create(SceneRenderer.prototype), {
    cloudRendering: "surface", weather: { cloudCover: 0.3, cloudDarkness: 0.2, highCloudCover: 0.1 },
    observerElevationM: 0, cloudFieldOffset: new Vector3(), celestialGroup: new Group(),
    camera: new PerspectiveCamera(), scene: new Group(), decorGroups: new Map(), groundRadius: 1000,
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

describe("the Sun's shadow as the witness walks", () => {
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
