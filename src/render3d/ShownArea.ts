import { Matrix3, Vector3 } from "three"
import type { BufferGeometry, Mesh } from "three"

/**
 * The area a part of a model shows the eye, as it is turned and stretched: what the light of a lit surface reaches the eye through.
 *
 * A closed surface seen from a direction d shows half the sum, over its faces, of each face's area times the cosine between its normal and
 * d, in absolute value: ½ Σ |aᵢ · d|, aᵢ a face's area vector (its area along its normal). So it is kept as those vectors, the faces that face
 * the same way summed into one (which changes nothing of the sum), in the mesh's own frame; turned and stretched as the mesh is by the
 * cofactor of its matrix, which is how an area vector transforms. A ball of radius r shows π r² from anywhere, a panel its face from in front
 * and its edge from the side, an airship's envelope its length times its width from the side and its circle from ahead.
 *
 * A lit part used to be taken as a disc as wide as its largest side: right for an LED, and three to four times too much light for the
 * 28 m by 6.5 m sign along a blimp's flank, or the envelope of a lightship.
 */
export class ShownArea {
  /** How finely faces are told apart by the way they face: their normals rounded to this. */
  private static readonly QUANTUM = 0.02
  private static readonly vectors = new WeakMap<BufferGeometry, Float32Array>()
  private static readonly matrix = new Matrix3()
  private static readonly cofactor = new Matrix3()
  private static readonly scratch = new Vector3()

  /** The area vectors of a geometry, in its own frame, those facing alike summed: x, y, z for each. */
  static vectorsOf(geometry: BufferGeometry): Float32Array {
    let vectors = ShownArea.vectors.get(geometry)
    if (vectors) return vectors
    const position = geometry.getAttribute("position")
    const index = geometry.index
    const count = index ? index.count : position.count
    const sums = new Map<string, [number, number, number]>()
    const a = new Vector3(), b = new Vector3(), c = new Vector3(), n = new Vector3()
    for (let i = 0; i + 2 < count; i += 3) {
      const [ia, ib, ic] = [0, 1, 2].map(k => index ? index.getX(i + k) : i + k)
      a.fromBufferAttribute(position, ia)
      b.fromBufferAttribute(position, ib)
      c.fromBufferAttribute(position, ic)
      // Twice the triangle's area along its normal.
      n.subVectors(b, a).cross(c.sub(a))
      const length = n.length()
      if (length === 0) continue
      const q = ShownArea.QUANTUM
      const key = `${Math.round(n.x / length / q)},${Math.round(n.y / length / q)},${Math.round(n.z / length / q)}`
      const sum = sums.get(key)
      if (sum) {
        sum[0] += n.x / 2
        sum[1] += n.y / 2
        sum[2] += n.z / 2
      } else sums.set(key, [n.x / 2, n.y / 2, n.z / 2])
    }
    vectors = new Float32Array(sums.size * 3)
    let k = 0
    for (const sum of sums.values()) {
      vectors[k++] = sum[0]
      vectors[k++] = sum[1]
      vectors[k++] = sum[2]
    }
    ShownArea.vectors.set(geometry, vectors)
    return vectors
  }

  /**
   * The area, m², the meshes show from `toEye`, a unit vector in the world's frame pointing from them to the eye, as their world matrices
   * place them (call updateMatrixWorld first). With no direction, a quarter of their whole surface: what a convex body shows on average
   * from all round (Cauchy), the area its light is spread over for what is round it.
   */
  static of(meshes: readonly Mesh[], toEye?: Vector3): number {
    let area = 0
    for (const mesh of meshes) {
      const vectors = ShownArea.vectorsOf(mesh.geometry)
      const matrix = ShownArea.matrix.setFromMatrix4(mesh.matrixWorld)
      // The cofactor: the determinant times the inverse transpose, which turns an area vector as the mesh's matrix turns and stretches it.
      const cofactor = ShownArea.cofactor.copy(matrix).invert().transpose().multiplyScalar(matrix.determinant())
      const v = ShownArea.scratch
      for (let i = 0; i < vectors.length; i += 3) {
        v.set(vectors[i], vectors[i + 1], vectors[i + 2]).applyMatrix3(cofactor)
        area += toEye ? Math.abs(v.dot(toEye)) / 2 : v.length() / 4
      }
    }
    return area
  }
}
