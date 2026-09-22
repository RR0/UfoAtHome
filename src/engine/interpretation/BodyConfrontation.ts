import type { BodyState, LocalPoint } from "./BodyPlacement.js"
import { BODY_PRIMITIVES } from "./Interpretation.js"
import type { AngularExtent } from "../shape/ApparentSize.js"
import type { ShapeAim } from "../shape/Shape.js"
import type { Timeline } from "../model/Timeline.js"
import type { SaidText } from "../model/SaidText.js"

const DEG_TO_RAD = Math.PI / 180
const RAD_TO_DEG = 180 / Math.PI

/** What a body looks like from the observer's eye: the direction of its centre and how much of the
 * sky it takes up. */
export interface Projection {
  aim: ShapeAim
  angular: AngularExtent
}

/** Which part of the account an interpretation fails to reproduce. */
export type Disagreement = "direction" | "width" | "height"

/** One phenomenon of the account, set beside the body that claims to be it, at one instant. */
export interface ConfrontationReading {
  sourceId: string
  /** What the account calls that phenomenon, when it names it. */
  title?: SaidText
  bodyId: string
  /** What the observer said: their own direction and angles, when the recording states them. */
  stated: { aim?: ShapeAim, angular?: AngularExtent }
  /** What the body, standing where the interpretation puts it, would have looked like. */
  predicted: Projection
  /** Degrees between the two directions — undefined when the recording states none. */
  separationDeg?: number
  /** Predicted over stated. */
  widthRatio?: number
  heightRatio?: number
  disagreements: Disagreement[]
}

/**
 * Sets an interpretation against the account it interprets, one instant at a time.
 *
 * The account is angles, and a body in metres standing in the world IMPLIES angles: stand it
 * where the interpreter says, look at it from where the observer stood, and it has a direction and
 * an apparent size. When those are not what the observer said, the interpretation is contradicted
 * — not the account, which is the one thing here nobody gets to correct. Where it holds, it is
 * only consistent: many bodies at many distances project the same way, which is exactly why a
 * reading that agrees proves little and one that disagrees proves something.
 *
 * The outline is taken from the body's bounding ellipsoid (or box, for a box), turned by its
 * attitude, and measured across and up in the observer's own view of it — the same two axes the
 * recording's `angular` states. A model is measured by its box: close enough to test a claim, and
 * no closer than the claim itself.
 */
export class BodyConfrontation {
  /** A direction is contradicted beyond this many degrees, or half the thing's own width, whichever
   * is larger: pointing at a disc a degree across from half a degree off is still pointing at it. */
  static readonly DIRECTION_TOLERANCE_DEG = 1
  /** An apparent size is contradicted beyond this factor either way — a observer who said "the size
   * of a coin at arm's length" is not wrong about a thing a third larger. */
  static readonly SIZE_TOLERANCE = 1.5

  /** How many points around the outline are measured. */
  private static readonly RINGS = 12
  private static readonly SEGMENTS = 24

  constructor(private readonly timeline: Timeline) {
  }

  /**
   * Every phenomenon a body explains that the account draws at `t`, set against that body.
   *
   * @param outlineOf Points of a body's actual surface, where whoever draws it has them — the
   *   node of a model its `outlineNode` names, which a box round the whole model (legs spread wider
   *   than the hull) would overstate. The ellipsoid or the box when it has none.
   */
  at(t: number, bodies: BodyState[], eye: LocalPoint, outlineOf?: (body: BodyState) => LocalPoint[] | undefined): ConfrontationReading[] {
    const readings: ConfrontationReading[] = []
    for (const body of bodies) {
      const predicted = BodyConfrontation.projectionOf(body, eye, outlineOf?.(body))
      if (!predicted) continue
      for (const sourceId of body.explains) {
        const shape = this.timeline.getInterpolatedShapeAt(t, sourceId)
        // A phenomenon the observer did not see at this instant (fully transparent) states nothing
        // to measure a body against.
        if (!shape || shape.transparency >= 1) continue
        readings.push({
          ...BodyConfrontation.compare(sourceId, body.id, { aim: shape.aim, angular: shape.angular }, predicted),
          title: shape.title
        })
      }
    }
    return readings
  }

  static compare(sourceId: string, bodyId: string, stated: ConfrontationReading["stated"], predicted: Projection): ConfrontationReading {
    const disagreements: Disagreement[] = []
    const separationDeg = stated.aim ? BodyConfrontation.separationDeg(stated.aim, predicted.aim) : undefined
    if (separationDeg !== undefined) {
      const halfWidth = Math.max(stated.angular?.widthDeg ?? 0, predicted.angular.widthDeg) / 2
      if (separationDeg > Math.max(BodyConfrontation.DIRECTION_TOLERANCE_DEG, halfWidth)) disagreements.push("direction")
    }
    const widthRatio = stated.angular && stated.angular.widthDeg > 0 ? predicted.angular.widthDeg / stated.angular.widthDeg : undefined
    const heightRatio = stated.angular && stated.angular.heightDeg > 0 ? predicted.angular.heightDeg / stated.angular.heightDeg : undefined
    if (widthRatio !== undefined && !BodyConfrontation.withinSize(widthRatio)) disagreements.push("width")
    if (heightRatio !== undefined && !BodyConfrontation.withinSize(heightRatio)) disagreements.push("height")
    return { sourceId, bodyId, stated, predicted, separationDeg, widthRatio, heightRatio, disagreements }
  }

  /**
   * What a body looks like from `eye`: its centre's direction, and the angles its outline spans
   * across and up, measured about that direction. Undefined when the eye is inside it.
   */
  static projectionOf(body: BodyState, eye: LocalPoint, outline?: LocalPoint[]): Projection | undefined {
    const points = outline && outline.length > 0 ? outline : BodyConfrontation.outlineOf(body)
    const centre = outline && outline.length > 0 ? BodyConfrontation.centreOf(outline) : body
    const forward = BodyConfrontation.normalized({ eastM: centre.eastM - eye.eastM, northM: centre.northM - eye.northM, upM: centre.upM - eye.upM })
    if (!forward) return undefined
    // Across is horizontal and to the right of the line of sight; up completes the frame. Looking
    // straight up or down there is no "right", and any horizontal will do.
    const right = BodyConfrontation.normalized({ eastM: forward.northM, northM: -forward.eastM, upM: 0 }) ?? { eastM: 1, northM: 0, upM: 0 }
    const up = BodyConfrontation.cross(right, forward)
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
    for (const point of points) {
      const ray = { eastM: point.eastM - eye.eastM, northM: point.northM - eye.northM, upM: point.upM - eye.upM }
      const depth = BodyConfrontation.dot(ray, forward)
      if (depth <= 0) return undefined
      const x = Math.atan2(BodyConfrontation.dot(ray, right), depth)
      const y = Math.atan2(BodyConfrontation.dot(ray, up), depth)
      minX = Math.min(minX, x)
      maxX = Math.max(maxX, x)
      minY = Math.min(minY, y)
      maxY = Math.max(maxY, y)
    }
    return {
      aim: {
        azimuthDeg: ((Math.atan2(forward.eastM, forward.northM) * RAD_TO_DEG) + 360) % 360,
        altitudeDeg: Math.asin(Math.max(-1, Math.min(1, forward.upM))) * RAD_TO_DEG
      },
      angular: { widthDeg: (maxX - minX) * RAD_TO_DEG, heightDeg: (maxY - minY) * RAD_TO_DEG }
    }
  }

  /** The middle of a cloud of points: the midpoint of its extent on each axis. */
  private static centreOf(points: LocalPoint[]): LocalPoint {
    const middle = (axis: keyof LocalPoint) => (Math.min(...points.map(p => p[axis])) + Math.max(...points.map(p => p[axis]))) / 2
    return { eastM: middle("eastM"), northM: middle("northM"), upM: middle("upM") }
  }

  /** Degrees between two directions of the sky. */
  static separationDeg(a: ShapeAim, b: ShapeAim): number {
    const altA = a.altitudeDeg * DEG_TO_RAD
    const altB = b.altitudeDeg * DEG_TO_RAD
    const cos = Math.sin(altA) * Math.sin(altB) + Math.cos(altA) * Math.cos(altB) * Math.cos((a.azimuthDeg - b.azimuthDeg) * DEG_TO_RAD)
    return Math.acos(Math.max(-1, Math.min(1, cos))) * RAD_TO_DEG
  }

  private static withinSize(ratio: number): boolean {
    return ratio <= BodyConfrontation.SIZE_TOLERANCE && ratio >= 1 / BodyConfrontation.SIZE_TOLERANCE
  }

  /** Points of the body's surface in the world: its ellipsoid, or its eight corners for a box or a
   * model. */
  private static outlineOf(body: BodyState): LocalPoint[] {
    const a = body.sizeM.widthM / 2
    const b = body.sizeM.lengthM / 2
    const c = body.sizeM.heightM / 2
    const local: [number, number, number][] = []
    const id = body.model.url === undefined ? body.model.id : undefined
    const rounded = id !== undefined && id !== "box" && (BODY_PRIMITIVES as readonly string[]).includes(id)
    if (rounded) {
      for (let ring = 0; ring <= BodyConfrontation.RINGS; ring++) {
        const polar = (ring / BodyConfrontation.RINGS) * Math.PI
        for (let segment = 0; segment < BodyConfrontation.SEGMENTS; segment++) {
          const around = (segment / BodyConfrontation.SEGMENTS) * 2 * Math.PI
          local.push([a * Math.sin(polar) * Math.cos(around), b * Math.sin(polar) * Math.sin(around), c * Math.cos(polar)])
        }
      }
    } else {
      for (const x of [-a, a]) for (const y of [-b, b]) for (const z of [-c, c]) local.push([x, y, z])
    }
    const heading = body.attitude.headingDeg * DEG_TO_RAD
    const pitch = body.attitude.pitchDeg * DEG_TO_RAD
    const roll = body.attitude.rollDeg * DEG_TO_RAD
    return local.map(([across, along, vertical]) => {
      // Roll about the fore-and-aft axis (right side down), then pitch about the across axis (nose
      // up), then heading about the vertical (clockwise from north).
      const x1 = across * Math.cos(roll) + vertical * Math.sin(roll)
      const z1 = -across * Math.sin(roll) + vertical * Math.cos(roll)
      const y2 = along * Math.cos(pitch) - z1 * Math.sin(pitch)
      const z2 = along * Math.sin(pitch) + z1 * Math.cos(pitch)
      return {
        eastM: body.eastM + x1 * Math.cos(heading) + y2 * Math.sin(heading),
        northM: body.northM - x1 * Math.sin(heading) + y2 * Math.cos(heading),
        upM: body.upM + z2
      }
    })
  }

  private static dot(a: LocalPoint, b: LocalPoint): number {
    return a.eastM * b.eastM + a.northM * b.northM + a.upM * b.upM
  }

  private static cross(a: LocalPoint, b: LocalPoint): LocalPoint {
    return {
      eastM: a.northM * b.upM - a.upM * b.northM,
      northM: a.upM * b.eastM - a.eastM * b.upM,
      upM: a.eastM * b.northM - a.northM * b.eastM
    }
  }

  private static normalized(v: LocalPoint): LocalPoint | undefined {
    const length = Math.hypot(v.eastM, v.northM, v.upM)
    return length > 1e-9 ? { eastM: v.eastM / length, northM: v.northM / length, upM: v.upM / length } : undefined
  }
}
