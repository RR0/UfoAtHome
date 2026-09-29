import { describe, expect, it } from "vitest"
import { CubeCamera, Euler, Quaternion, Vector3, WebGLCoordinateSystem, WebGLCubeRenderTarget, type PerspectiveCamera } from "three"
import { EquidistantProjectionPass } from "../../src/render3d/EquidistantProjectionPass.js"

/** directionFor as a pure function of the pass's own aspect, for the round trip below. */
function directionFor(ndcX: number, ndcY: number, fovDeg: number, aspect: number) {
  const halfFovRad = ((fovDeg / 2) * Math.PI) / 180
  const ax = ndcX * aspect * halfFovRad
  const ay = ndcY * halfFovRad
  const theta = Math.hypot(ax, ay)
  if (theta < 1e-6) return { x: 0, y: 0, z: -1 }
  const sin = Math.sin(theta)
  return { x: (ax / theta) * sin, y: (ay / theta) * sin, z: -Math.cos(theta) }
}

describe("EquidistantProjectionPass.ndcFor", () => {
  it("is the inverse of directionFor across the frame", () => {
    for (const [ndcX, ndcY] of [[0, 0], [0.5, 0], [0, -0.7], [0.9, 0.9], [-1, 0.3]]) {
      const back = EquidistantProjectionPass.ndcFor(directionFor(ndcX, ndcY, 60, 16 / 9), 60, 16 / 9)
      expect(back).toBeDefined()
      expect(back!.ndcX).toBeCloseTo(ndcX, 9)
      expect(back!.ndcY).toBeCloseTo(ndcY, 9)
    }
  })

  it("puts a direction beyond the frame beyond ±1, and one behind the camera nowhere", () => {
    // 60° up through a 60° field: twice the half-field, so twice the frame's own edge.
    const up = EquidistantProjectionPass.ndcFor({ x: 0, y: Math.sin(Math.PI / 3), z: -Math.cos(Math.PI / 3) }, 60, 16 / 9)
    expect(up!.ndcY).toBeCloseTo(2, 9)
    expect(EquidistantProjectionPass.ndcFor({ x: 0, y: 0, z: 1 }, 60, 16 / 9)).toBeUndefined()
  })
})

describe("EquidistantProjectionPass.faceRegions", () => {
  /** A cube camera turned like the eye, as renderThroughCube turns it — three's own face cameras. */
  function faceCameras(rotation: Quaternion): PerspectiveCamera[] {
    const cube = new CubeCamera(0.1, 1000, new WebGLCubeRenderTarget(16))
    // Its faces are only turned their ways once told the coordinate system, as the pass does.
    cube.coordinateSystem = WebGLCoordinateSystem
    cube.updateCoordinateSystem()
    cube.quaternion.copy(rotation)
    cube.updateMatrixWorld()
    return cube.children as PerspectiveCamera[]
  }

  it("draws of an 85° field only the front face whole, the two sides in bands, and nothing behind", () => {
    const rotation = new Quaternion().setFromEuler(new Euler(0.66, -0.6, 0, "YXZ"))
    const regions = EquidistantProjectionPass.faceRegions(faceCameras(rotation), rotation, 85, 16 / 9, 1000)
    const [px, nx, , , pz, nz] = regions
    expect(nz).toEqual({ x: 0, y: 0, width: 1000, height: 1000 })
    expect(pz).toBeUndefined()
    // Each side needed from the seam out to the picture's edge, some half of the face: not whole.
    for (const side of [px!, nx!]) expect(side.width).toBeLessThan(600)
  })

  /*
   * three gives its cube cameras a NEGATIVE field, which turns each face's picture over: a region
   * found through an assumed +90° lands on the far side of its face, and the picture shows a band
   * of stale sky where the side it needed should be.
   */
  it("finds each band on the side of its face that meets the front one", () => {
    const rotation = new Quaternion()
    const cameras = faceCameras(rotation)
    const [px, nx] = EquidistantProjectionPass.faceRegions(cameras, rotation, 85, 16 / 9, 1000)
    cameras.forEach(camera => camera.updateMatrixWorld())
    for (const [face, region] of [[0, px!], [1, nx!]] as const) {
      // 50° from the axis towards this face: in the picture (whose side is 75° out) and on this face.
      const axis = new Vector3(0, 0, -1).transformDirection(cameras[face].matrixWorld)
      const seen = axis.clone().multiplyScalar(Math.sin((50 * Math.PI) / 180)).add(new Vector3(0, 0, -Math.cos((50 * Math.PI) / 180)))
      // And its mirror across the face's centre, 130° from the axis: behind the observer.
      const unseen = axis.clone().multiplyScalar(Math.sin((50 * Math.PI) / 180)).add(new Vector3(0, 0, Math.cos((50 * Math.PI) / 180)))
      const pixelX = (direction: Vector3) => ((direction.add(cameras[face].position).project(cameras[face]).x + 1) / 2) * 1000
      const inside = (x: number) => x >= region.x && x <= region.x + region.width
      expect(inside(pixelX(seen))).toBe(true)
      expect(inside(pixelX(unseen))).toBe(false)
    }
  })
})
