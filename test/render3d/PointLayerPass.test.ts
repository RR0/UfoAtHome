import { describe, expect, it } from "vitest"
import { AdditiveBlending, BoxGeometry, BufferAttribute, BufferGeometry, Group, Mesh, MeshBasicMaterial, Object3D, Points, Scene } from "three"
import { PointLayerPass, type PointLayerHost } from "../../src/render3d/PointLayerPass.js"
import { PointSources } from "../../src/render3d/PointSources.js"

const stars = (count = 3, parent?: Object3D) => {
  const geometry = new BufferGeometry()
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(count * 3), 3))
  const points = new Points(geometry, PointSources.material(2))
  parent?.add(points)
  return points
}

describe("PointLayerPass", () => {
  const hostOf = (...found: Points[]): PointLayerHost => ({ points: () => found, clouds: () => [], sky: new Group() })

  it("takes the point sources that are showing out of the render, and gives them back", () => {
    const layer = new PointLayerPass(64, 36)
    const shown = stars()
    expect(layer.take(hostOf(shown))).toBe(true)
    expect(shown.visible).toBe(false)
    layer.restore()
    expect(shown.visible).toBe(true)
  })

  it("leaves alone what is not drawn anyway: hidden, under a hidden group, or holding no points", () => {
    const layer = new PointLayerPass(64, 36)
    const group = new Group()
    const hidden = stars()
    hidden.visible = false
    const under = stars(3, group)
    group.visible = false
    const empty = stars(0)
    expect(layer.take(hostOf(hidden, under, empty))).toBe(false)
    layer.restore()
    expect([hidden.visible, under.visible, empty.visible]).toEqual([false, true, true])
  })

  it("says there is nothing to draw when the scene has no point source", () => {
    expect(new PointLayerPass(64, 36).take(hostOf())).toBe(false)
  })

  it("keeps each point source where its own sky puts it, scaled and raised, once the layer's scene works its matrices out", () => {
    // An observer at fifteen hundred metres under a sky scaled to thirty thousand: three recomputes a
    // child's world matrix from its local one, so the stand-in has to carry the real placement there.
    const sky = new Group()
    sky.scale.setScalar(100 / 3)
    sky.position.y = 1499.5
    const source = stars(3, sky)
    sky.updateMatrixWorld(true)
    const layer = new PointLayerPass(64, 36)
    layer.take(hostOf(source))
    const inside = layer as unknown as { placeProxies(): void; scene: Group; proxies: Map<Points, Points> }
    inside.placeProxies()
    inside.scene.updateMatrixWorld(true)
    const proxy = inside.proxies.get(source)!
    expect(proxy.matrixWorld.elements[0]).toBeCloseTo(100 / 3, 6)
    expect(proxy.matrixWorld.elements[13]).toBeCloseTo(1499.5, 6)
  })

  it("hides the stars behind the ground, which is transparent at the edge of its patch, and not behind what is mostly see-through or added light", () => {
    const markForeground = (PointLayerPass as unknown as { markForeground(object: Scene, sky: Group): void }).markForeground.bind(PointLayerPass)
    const scene = new Scene()
    const sky = new Group()
    const ground = new Mesh(new BoxGeometry(), new MeshBasicMaterial({ transparent: true }))
    const haze = new Mesh(new BoxGeometry(), new MeshBasicMaterial({ transparent: true, opacity: 0.2 }))
    const glow = new Mesh(new BoxGeometry(), new MeshBasicMaterial({ blending: AdditiveBlending }))
    const veil = new Mesh(new BoxGeometry(), new MeshBasicMaterial({ transparent: true, depthWrite: false }))
    const star = new Mesh(new BoxGeometry(), new MeshBasicMaterial())
    sky.add(star)
    scene.add(ground, haze, glow, veil, sky)
    markForeground(scene, sky)
    expect(ground.layers.isEnabled(PointLayerPass.OCCLUDER_LAYER)).toBe(true)
    expect(haze.layers.isEnabled(PointLayerPass.OCCLUDER_LAYER)).toBe(false)
    expect(glow.layers.isEnabled(PointLayerPass.OCCLUDER_LAYER)).toBe(false)
    expect(veil.layers.isEnabled(PointLayerPass.OCCLUDER_LAYER)).toBe(false)
    expect(star.layers.isEnabled(PointLayerPass.OCCLUDER_LAYER)).toBe(false)
  })
})
