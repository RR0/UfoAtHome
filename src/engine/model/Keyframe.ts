import type { Shape } from "../shape/Shape.js"

/**
 * A shape snapshot for one recorded source (a UFO, a landmark...) at a given instant.
 */
export interface ShapeState {
  sourceId: string
  shape: Shape
}

/**
 * All shape states recorded at a single instant, t milliseconds after the recording started.
 */
export interface Keyframe {
  t: number
  shapes: ShapeState[]
}
