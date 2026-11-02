import { Color, DoubleSide, Material, Mesh, MeshBasicMaterial, Object3D, PerspectiveCamera, Scene, Vector3, WebGLRenderTarget, WebGLRenderer } from "three"
import { GlassMaterial } from "./GlassMaterial.js"

/**
 * Which directions the cabin the eye is in (a van, a flight deck) hides, as seen from the eye: its silhouette, photographed once.
 *
 * A source behind the roof of the van the observer drives has no veil in the eye (see SceneRenderer.hideVeilsBehindDecor), and a ray cast
 * through the van to ask asks each of its two hundred thousand triangles: twenty rays a frame for the Moon and three planets were 110 ms.
 * But the eye does not move in its seat, so what the cabin hides, in the cabin's own frame, does not change: it is drawn once, in six views
 * of SIZE pixels a side from the eye (white where the cabin is, its glass left out: it is looked through), read back, and asked by
 * direction from then on. It is drawn again only when the eye moves in the cabin (MOVE_M) or the cabin changes (another model, another
 * object).
 */
export class CabinMask {
  /** Pixels on a side of each of the six views: 1.4 degrees each, finer than the Moon's half degree is not needed of a pillar's edge. */
  static readonly SIZE = 64
  /** How far the eye moves in the cabin before the silhouette is drawn again, metres. */
  static readonly MOVE_M = 0.01

  /** Six cameras, children of the cabin at the eye, looking along its axes. */
  private readonly holder = new Object3D()
  private readonly cameras: PerspectiveCamera[] = []
  private readonly faces: Uint8Array[] = []
  private readonly target = new WebGLRenderTarget(CabinMask.SIZE, CabinMask.SIZE)
  private readonly white = new MeshBasicMaterial({ color: new Color(1, 1, 1), side: DoubleSide })
  private readonly scene = new Scene()
  private cabin?: Object3D
  private meshes = 0
  private readonly eye = new Vector3()
  private readonly scratch = new Vector3()

  constructor() {
    const axes: [Vector3, Vector3][] = [
      [new Vector3(1, 0, 0), new Vector3(0, 1, 0)], [new Vector3(-1, 0, 0), new Vector3(0, 1, 0)],
      [new Vector3(0, 1, 0), new Vector3(0, 0, 1)], [new Vector3(0, -1, 0), new Vector3(0, 0, -1)],
      [new Vector3(0, 0, 1), new Vector3(0, 1, 0)], [new Vector3(0, 0, -1), new Vector3(0, 1, 0)]
    ]
    for (const [look, up] of axes) {
      const camera = new PerspectiveCamera(90, 1, 0.02, 20)
      camera.up.copy(up)
      camera.lookAt(look)
      this.holder.add(camera)
      this.cameras.push(camera)
      this.faces.push(new Uint8Array(CabinMask.SIZE * CabinMask.SIZE * 4))
    }
    this.scene.background = new Color(0, 0, 0)
  }

  /** Whether a silhouette is held. */
  get any(): boolean {
    return this.cabin !== undefined
  }

  /**
   * Holds the silhouette of `cabin` from `eyeWorld`, drawing it if the cabin, its parts or the eye's place in it changed; forgets it with
   * no cabin.
   */
  update(renderer: WebGLRenderer, cabin: Object3D | undefined, eyeWorld: Vector3): void {
    if (!cabin) {
      this.forget()
      return
    }
    cabin.updateWorldMatrix(true, true)
    const eye = this.scratch.copy(eyeWorld)
    cabin.worldToLocal(eye)
    let meshes = 0
    cabin.traverse(child => {
      if ((child as Mesh).isMesh) meshes++
    })
    if (cabin === this.cabin && meshes === this.meshes && eye.distanceTo(this.eye) < CabinMask.MOVE_M) return
    this.cabin = cabin
    this.meshes = meshes
    this.eye.copy(eye)
    this.draw(renderer, cabin)
  }

  /** Whether the cabin stands in `direction` (world, from the eye). */
  hides(direction: Vector3): boolean {
    if (!this.cabin) return false
    this.holder.updateWorldMatrix(true, true)
    for (let face = 0; face < 6; face++) {
      const camera = this.cameras[face]
      const local = this.scratch.copy(direction).transformDirection(camera.matrixWorldInverse)
      if (local.z >= 0) continue
      const x = local.x / -local.z
      const y = local.y / -local.z
      if (Math.abs(x) > 1 || Math.abs(y) > 1) continue
      const column = Math.min(CabinMask.SIZE - 1, Math.floor(((x + 1) / 2) * CabinMask.SIZE))
      const row = Math.min(CabinMask.SIZE - 1, Math.floor(((y + 1) / 2) * CabinMask.SIZE))
      return this.faces[face][(row * CabinMask.SIZE + column) * 4] > 127
    }
    return false
  }

  forget(): void {
    this.holder.removeFromParent()
    this.cabin = undefined
    this.meshes = 0
  }

  dispose(): void {
    this.forget()
    this.target.dispose()
    this.white.dispose()
  }

  /** Draws the six views of the cabin alone, white on black, its glass left out, and reads them back. */
  private draw(renderer: WebGLRenderer, cabin: Object3D): void {
    cabin.add(this.holder)
    this.holder.position.copy(this.eye)
    this.holder.updateWorldMatrix(true, true)
    // A copy of what is opaque in the cabin, as it stands in the world, in a scene of its own: the scene's own state (its layers, its
    // passes, its overrides) is left as it is.
    const parts: Mesh[] = []
    cabin.traverse(child => {
      const mesh = child as Mesh
      if (!mesh.isMesh || !mesh.visible) return
      const materials: Material[] = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      if (materials.every(material => material instanceof GlassMaterial)) return
      const part = new Mesh(mesh.geometry, this.white)
      part.matrixAutoUpdate = false
      part.matrix.copy(mesh.matrixWorld)
      part.matrixWorld.copy(mesh.matrixWorld)
      parts.push(part)
    })
    for (const part of parts) this.scene.add(part)
    const previous = renderer.getRenderTarget()
    const shadows = renderer.shadowMap.autoUpdate
    renderer.shadowMap.autoUpdate = false
    for (let face = 0; face < 6; face++) {
      const camera = this.cameras[face]
      camera.updateMatrixWorld(true)
      renderer.setRenderTarget(this.target)
      renderer.clear()
      renderer.render(this.scene, camera)
      renderer.readRenderTargetPixels(this.target, 0, 0, CabinMask.SIZE, CabinMask.SIZE, this.faces[face])
    }
    renderer.setRenderTarget(previous)
    renderer.shadowMap.autoUpdate = shadows
    for (const part of parts) part.removeFromParent()
  }
}
