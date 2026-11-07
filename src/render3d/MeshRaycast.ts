import { BufferAttribute, BufferGeometry, Mesh, Raycaster, Sphere } from "three"
import type { Intersection } from "three"
import { MeshBVH } from "three-mesh-bvh"

/** What was built for a geometry: its tree, and the versions of the buffers it was built from; no tree for one that changes. */
interface BuiltTree {
  bvh?: MeshBVH
  position?: BufferAttribute
  positionVersion: number
  index: BufferAttribute | null
  indexVersion: number
}

/**
 * Every mesh of the scene raycast through a tree of boxes over its triangles (a BVH, three-mesh-bvh) instead of triangle by triangle.
 *
 * WHY. Whether a light, a phenomenon or the Sun is hidden from the eye is asked of the decor along lines of sight at every frame
 * (BodySystem.clearShare, SceneRenderer.decorDistancesAt, hideVeilsBehindDecor, isOccludedToward). three tests each triangle of every
 * mesh whose bounding sphere the line meets, and an observer seated in a van is inside every sphere of it: at Silly-le-Long the
 * 38 000 triangles of the Peugeot Expert were tested along each of those lines, a third of the time of a frame, in the player as in
 * the editor. Through a tree, a line visits a few dozen boxes and the triangles inside them.
 *
 * HOW, and why so carefully. Built the first time a mesh is asked, not when the decor is built: models arrive after their primitive,
 * and nothing has to say which meshes are worth one. Built `indirect`, so the geometry itself (its index, its groups) is never
 * reordered. Only for what the tree describes faithfully: a geometry that is static, drawn whole (its drawRange is what the tree was
 * built over), neither skinned, nor instanced, nor morphed. A geometry whose positions or index change after its tree was built (a
 * wire sagging, a plume) gets no tree again and is raycast as three does it; so does one too small for a tree to save anything.
 */
export class MeshRaycast {
  /** Under this many triangles a tree costs more to build than it saves: three's own test is a short loop. */
  static readonly MIN_TRIANGLES = 512

  private static installed = false
  private static readonly trees = new WeakMap<BufferGeometry, BuiltTree>()
  private static readonly sphere = new Sphere()

  /** Puts the tree under every Mesh's raycast, once per page. */
  static install(): void {
    if (MeshRaycast.installed) return
    MeshRaycast.installed = true
    const plain = Mesh.prototype.raycast
    Mesh.prototype.raycast = function (this: Mesh, raycaster: Raycaster, intersects: Intersection[]): void {
      const bvh = MeshRaycast.treeOf(this, raycaster)
      if (bvh === null) return
      if (bvh) bvh.raycastObject3D(this, raycaster, intersects)
      else plain.call(this, raycaster, intersects)
    }
  }

  /**
   * The tree to raycast `mesh` through; undefined where three's own test is to be used; null where the line misses the mesh's
   * bounding sphere, which three tests first too and which keeps a tree from being built for what no line comes near.
   */
  private static treeOf(mesh: Mesh, raycaster: Raycaster): MeshBVH | undefined | null {
    const geometry = mesh.geometry
    const position = geometry?.attributes.position
    // An interleaved one is a model's packed vertices: left to three, as a tree over it is not what this was measured with.
    if (!(position instanceof BufferAttribute) || mesh.material === undefined) return undefined
    if ((mesh as { isSkinnedMesh?: boolean }).isSkinnedMesh || (mesh as { isInstancedMesh?: boolean }).isInstancedMesh
      || (mesh as { isBatchedMesh?: boolean }).isBatchedMesh || geometry.morphAttributes.position) return undefined
    const index = geometry.index
    if ((index ? index.count : position.count) / 3 < MeshRaycast.MIN_TRIANGLES) return undefined
    if (geometry.drawRange.start !== 0 || geometry.drawRange.count !== Infinity) return undefined
    if (geometry.boundingSphere === null) geometry.computeBoundingSphere()
    const sphere = MeshRaycast.sphere.copy(geometry.boundingSphere!).applyMatrix4(mesh.matrixWorld)
    if (!raycaster.ray.intersectsSphere(sphere)) return null
    const built = MeshRaycast.trees.get(geometry)
    if (built) {
      if (!built.bvh) return undefined
      const same = built.position === position && built.positionVersion === position.version
        && built.index === index && built.indexVersion === (index?.version ?? 0)
      if (same) return built.bvh
      // It changed since its tree was built: it is one that changes, and a tree would be out of date again by the next frame.
      MeshRaycast.trees.set(geometry, { positionVersion: -1, index: null, indexVersion: -1 })
      return undefined
    }
    const bvh = new MeshBVH(geometry, { indirect: true })
    MeshRaycast.trees.set(geometry, { bvh, position, positionVersion: position.version, index, indexVersion: index?.version ?? 0 })
    return bvh
  }
}
