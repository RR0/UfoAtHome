export interface CloudPoint { x: number; y: number; z: number }
export interface CloudPick { layerId: string; instanceId: string; center: CloudPoint }

/** Translate in the plane through the cloud centre, perpendicular to the initial viewing ray.
 * The centre need not be under the pointer: subtracting both intersections preserves the grab offset. */
export function cloudDragDelta(startRay: CloudPoint, ray: CloudPoint, center: CloudPoint): CloudPoint | undefined {
  const dot = (a: CloudPoint, b: CloudPoint) => a.x * b.x + a.y * b.y + a.z * b.z
  const depth = dot(center, startRay), denominator = dot(ray, startRay)
  if (depth <= 0 || denominator <= 0.05) return undefined
  const distance = depth / denominator
  return { x: ray.x * distance - startRay.x * depth,
    y: ray.y * distance - startRay.y * depth, z: ray.z * distance - startRay.z * depth }
}
