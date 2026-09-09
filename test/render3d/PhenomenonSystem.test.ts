import { beforeAll, describe, expect, it, vi } from "vitest"
import { PerspectiveCamera, Scene, Vector3 } from "three"
import { PhenomenonSystem } from "../../src/render3d/PhenomenonSystem.js"
import type { PhenomenonFrame, PlacedPhenomenon } from "../../src/render3d/PhenomenonSystem.js"
import { ImageProjection } from "../../src/engine/instrument/ImageProjection.js"
import { CanvasRenderer } from "../../src/render/CanvasRenderer.js"
import type { Shape } from "../../src/engine/shape/Shape.js"

function oval(overrides: Partial<Shape["bounds"]> = {}, extra: Partial<Shape> = {}): Shape {
  return {
    kind: "oval",
    bounds: { x: 310, y: 170, width: 20, height: 20, ...overrides },
    color: "#ff0000",
    angle: 0,
    transparency: 0,
    haloScale: 0,
    selected: false,
    ...extra
  } as Shape
}

function frame(): PhenomenonFrame {
  return {
    projection: new ImageProjection("equidistant", 360, 60),
    canvasWidthPx: 640,
    canvasHeightPx: 360,
    scale: 1,
    starPoints: 0,
    rollRad: 0
  }
}

/** A camera looking down -Z from the origin, and a pinhole direction for its pixels. */
function camera(): PerspectiveCamera {
  const cam = new PerspectiveCamera(60, 640 / 360, 0.1, 1000)
  cam.position.set(0, 1.6, 0)
  cam.updateMatrixWorld()
  return cam
}

function pinhole(cam: PerspectiveCamera) {
  return (ndcX: number, ndcY: number, into: Vector3): Vector3 =>
    into.set(ndcX, ndcY, 0.5).unproject(cam).sub(cam.position).normalize()
}

/** The pinhole's inverse: where a world direction lands on the picture, or nowhere behind it. */
function screenPoint(cam: PerspectiveCamera) {
  return (direction: Vector3): { ndcX: number; ndcY: number } | undefined => {
    const local = direction.clone().applyQuaternion(cam.quaternion.clone().invert())
    if (local.z >= 0) return undefined
    const p = cam.position.clone().add(direction).project(cam)
    return { ndcX: p.x, ndcY: p.y }
  }
}

/** The patch's vertex at the middle of its middle row — the shape's centre. */
function centreOf(mesh: ReturnType<typeof meshes>[number]): Vector3 {
  const positions = (mesh as unknown as { geometry: { attributes: { position: { getX(i: number): number; getY(i: number): number; getZ(i: number): number; count: number } } } }).geometry.attributes.position
  const side = Math.round(Math.sqrt(positions.count))
  const index = Math.floor(side / 2) * side + Math.floor(side / 2)
  return new Vector3(positions.getX(index), positions.getY(index), positions.getZ(index))
}

function verticesOf(mesh: ReturnType<typeof meshes>[number]): Vector3[] {
  const positions = (mesh as unknown as { geometry: { attributes: { position: { getX(i: number): number; getY(i: number): number; getZ(i: number): number; count: number } } } }).geometry.attributes.position
  const out: Vector3[] = []
  for (let i = 0; i < positions.count; i++) out.push(new Vector3(positions.getX(i), positions.getY(i), positions.getZ(i)))
  return out
}

function meshes(scene: Scene) {
  return scene.children.filter(child => child.type === "Mesh")
}

// jsdom's <canvas> has no 2D context, and a texture is painted through one — the same stub the
// component tests use, so the painter runs and the plane gets its map.
beforeAll(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(function (this: HTMLCanvasElement) {
    const noop = (): void => {}
    return {
      save: noop, restore: noop, scale: noop, translate: noop, rotate: noop, clearRect: noop, beginPath: noop,
      closePath: noop, ellipse: noop, moveTo: noop, lineTo: noop, fill: noop, stroke: noop, arc: noop, fillRect: noop,
      createRadialGradient: () => ({ addColorStop: noop }),
      createLinearGradient: () => ({ addColorStop: noop }),
      canvas: this
    } as unknown as CanvasRenderingContext2D
  })
})

describe("PhenomenonSystem", () => {
  it("stands one plane per phenomenon and drops the ones that left", () => {
    const scene = new Scene()
    const system = new PhenomenonSystem(scene)
    const placed: PlacedPhenomenon[] = [
      { sourceId: "a", shape: oval(), distanceM: 5, renderOrder: 0, hidden: false },
      { sourceId: "b", shape: oval({ x: 100 }), distanceM: 5, renderOrder: 1, hidden: false }
    ]
    system.set(placed, frame())
    expect(meshes(scene)).toHaveLength(2)
    system.set([placed[1]], frame())
    expect(meshes(scene)).toHaveLength(1)
    system.clear()
    expect(meshes(scene)).toHaveLength(0)
  })

  it("places a plane along the ray through the shape's centre, at its distance, facing the camera", () => {
    const scene = new Scene()
    const system = new PhenomenonSystem(scene)
    const cam = camera()
    // Dead centre of the frame: the ray is the camera's own axis, -Z.
    system.set([{ sourceId: "a", shape: oval({ x: 310, y: 170 }), distanceM: 42, renderOrder: 0, hidden: false }], frame())
    system.place(cam, pinhole(cam), screenPoint(cam))
    const centre = centreOf(meshes(scene)[0])
    expect(centre.x).toBeCloseTo(0, 5)
    expect(centre.y).toBeCloseTo(1.6, 5)
    expect(centre.z).toBeCloseTo(-42, 5)
  })

  it("curves the patch onto the sphere of its distance, so it is square to every ray it carries", () => {
    const scene = new Scene()
    const system = new PhenomenonSystem(scene)
    const cam = camera()
    system.set(
      [{ sourceId: "a", shape: oval({ x: 100, width: 300, height: 200 }), distanceM: 50, renderOrder: 0, hidden: false, aim: { azimuthDeg: 40, altitudeDeg: 0 } }],
      frame()
    )
    system.place(cam, pinhole(cam), screenPoint(cam))
    for (const vertex of verticesOf(meshes(scene)[0])) {
      expect(vertex.distanceTo(cam.position)).toBeCloseTo(50, 4)
    }
  })

  it("puts each vertex on the ray of the pixel it carries, so a wide picture lands on its own pixels", () => {
    const scene = new Scene()
    const system = new PhenomenonSystem(scene)
    const cam = camera()
    // Ninety degrees wide and centred: a flat plane would spread this evenly in metres and miss the
    // picture's own pixels by a dozen either side.
    const shape = oval({ x: 40, y: 120, width: 560, height: 90 })
    const f = frame()
    system.set([{ sourceId: "a", shape, distanceM: 5, renderOrder: 0, hidden: false }], f)
    system.place(cam, pinhole(cam), screenPoint(cam))
    const extent = CanvasRenderer.paintExtent(shape)
    const vertices = verticesOf(meshes(scene)[0])
    const side = Math.round(Math.sqrt(vertices.length))
    // The middle of the left edge carries the extent's left-middle pixel.
    const leftMiddle = vertices[Math.floor(side / 2) * side]
    const px = extent.x
    const py = extent.y + extent.height / 2
    const expected = pinhole(cam)((px / f.canvasWidthPx) * 2 - 1, -((py / f.canvasHeightPx) * 2 - 1), new Vector3())
    const actual = leftMiddle.clone().sub(cam.position).normalize()
    expect(actual.dot(expected)).toBeCloseTo(1, 9)
  })

  it("stands a shape that states its direction along that direction, whatever pixel it was left at", () => {
    const scene = new Scene()
    const system = new PhenomenonSystem(scene)
    const cam = camera()
    // A pixel a hundred thousand wide off the canvas — where the overlay clamps a shape once the
    // witness turns their back on it — and a stated direction due east, ten degrees up.
    system.set(
      [{ sourceId: "a", shape: oval({ x: -99697 }), distanceM: 100, renderOrder: 0, hidden: false, aim: { azimuthDeg: 90, altitudeDeg: 10 } }],
      frame()
    )
    system.place(cam, pinhole(cam), screenPoint(cam))
    const centre = centreOf(meshes(scene)[0])
    expect(centre.x).toBeCloseTo(100 * Math.cos((10 * Math.PI) / 180), 5)
    expect(centre.y).toBeCloseTo(1.6 + 100 * Math.sin((10 * Math.PI) / 180), 5)
    expect(centre.z).toBeCloseTo(0, 5)
  })

  it("scales the plane so its texture's box subtends what the overlay drew, whatever the distance", () => {
    const scene = new Scene()
    const system = new PhenomenonSystem(scene)
    const cam = camera()
    const shape = oval()
    const extent = CanvasRenderer.paintExtent(shape)
    const f = frame()
    for (const distanceM of [2, 50, 3000]) {
      system.set([{ sourceId: "a", shape, distanceM, renderOrder: 0, hidden: false }], f)
      system.place(cam, pinhole(cam), screenPoint(cam))
      const mesh = meshes(scene)[0]
      // Through an eye at 60° over 360px, one degree is 6px: the box's width in degrees, as the
      // overlay itself converts, at this distance.
      const widthDeg = f.projection.pxToDeg(extent.width)
      const expectedM = 2 * distanceM * Math.tan((widthDeg * Math.PI) / 360)
      expect(mesh.scale.x).toBeCloseTo(expectedM, 6)
      // And the angle it subtends from the camera is the same at every distance.
      expect((2 * Math.atan(mesh.scale.x / 2 / distanceM) * 180) / Math.PI).toBeCloseTo(widthDeg, 6)
    }
  })

  it("keeps the timeline's paint order and hides what the witness put behind cloud", () => {
    const scene = new Scene()
    const system = new PhenomenonSystem(scene)
    system.set(
      [
        { sourceId: "back", shape: oval(), distanceM: 5, renderOrder: 0, hidden: false },
        { sourceId: "front", shape: oval(), distanceM: 5, renderOrder: 1, hidden: false },
        { sourceId: "clouded", shape: oval(), distanceM: 5, renderOrder: 2, hidden: true }
      ],
      frame()
    )
    const [back, front, clouded] = meshes(scene)
    expect(front.renderOrder).toBeGreaterThan(back.renderOrder)
    expect(clouded.visible).toBe(false)
    expect(front.visible).toBe(true)
  })

  it("makes a fresh texture when the shape's picture changes size, and keeps it when it does not", () => {
    const scene = new Scene()
    const system = new PhenomenonSystem(scene)
    const f = frame()
    const small: PlacedPhenomenon = { sourceId: "a", shape: oval({ width: 10, height: 10 }), distanceM: 5, renderOrder: 0, hidden: false }
    system.set([small], f)
    const mesh = meshes(scene)[0] as unknown as { material: { map: { image: HTMLCanvasElement } } }
    const first = mesh.material.map
    const firstSize = [first.image.width, first.image.height]
    // Same size, another colour: the same texture, repainted.
    system.set([{ ...small, shape: oval({ width: 10, height: 10 }, { color: "#00ff00" }) }], f)
    expect(mesh.material.map).toBe(first)
    // An approaching object grows: the GPU storage of the first texture cannot take the bigger
    // picture, so it has to be a new texture on a bigger canvas (see PhenomenonSystem.paint).
    system.set([{ ...small, shape: oval({ width: 200, height: 100 }) }], f)
    expect(mesh.material.map).not.toBe(first)
    expect(mesh.material.map.image.width).toBeGreaterThan(firstSize[0])
    expect(mesh.material.map.image.height).toBeGreaterThan(firstSize[1])
  })

  it("reports the furthest plane for the camera's far plane", () => {
    const system = new PhenomenonSystem(new Scene())
    system.set(
      [
        { sourceId: "a", shape: oval(), distanceM: 5, renderOrder: 0, hidden: false },
        { sourceId: "b", shape: oval(), distanceM: 6700, renderOrder: 1, hidden: false }
      ],
      frame()
    )
    expect(system.furthestM).toBe(6700)
  })
})

describe("CanvasRenderer.paintExtent", () => {
  it("is the body itself plus a margin when nothing reaches past it", () => {
    const extent = CanvasRenderer.paintExtent(oval())
    expect(extent.width).toBeGreaterThan(20)
    expect(extent.width).toBeLessThan(30)
    expect(extent.x + extent.width / 2).toBeCloseTo(320, 6)
    expect(extent.y + extent.height / 2).toBeCloseTo(180, 6)
  })

  it("reaches as far as a dazzling light's veil and spikes", () => {
    const plain = CanvasRenderer.paintExtent(oval())
    const dazzling = CanvasRenderer.paintExtent(oval({}, { brightness: 1 }))
    // The veil of a fully dazzling light reaches ten radii out (see DAZZLE_VEIL_RADIUS_SCALE).
    expect(dazzling.width).toBeGreaterThanOrEqual(200)
    expect(dazzling.width).toBeGreaterThan(plain.width)
    expect(dazzling.x + dazzling.width / 2).toBeCloseTo(plain.x + plain.width / 2, 6)
  })

  it("grows with a halo and with a stated blur", () => {
    const plain = CanvasRenderer.paintExtent(oval())
    expect(CanvasRenderer.paintExtent(oval({}, { haloScale: 2 })).width).toBeGreaterThan(plain.width)
    expect(CanvasRenderer.paintExtent(oval({}, { blur: 1 })).width).toBeGreaterThan(plain.width)
  })

  it("covers a rotated body's corners", () => {
    const flat = CanvasRenderer.paintExtent(oval({ width: 40, height: 10 }))
    const turned = CanvasRenderer.paintExtent(oval({ width: 40, height: 10 }, { angle: Math.PI / 4 }))
    expect(turned.height).toBeGreaterThan(flat.height)
    expect(turned.height).toBeGreaterThanOrEqual(Math.hypot(40, 10))
  })
})
