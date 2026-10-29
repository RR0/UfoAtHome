import { geoToLocalMeters, localMetersToGeo } from "../../render3d/terrain/GeoProjection.js"

/**
 * How a position was said, beside the position it comes to.
 *
 * An author does not always give a place the way the recording keeps it. A decor object is kept as metres east and north of the
 * observer, an observer as a latitude and a longitude; but "the car was 20 m north of the house" says the car from the house, and
 * "I stood at 44.12, 5.73" says the observer as a map does. What the recording keeps stays what the scene reads (`eastM`/`northM`,
 * `lat`/`lng`): this says only how it was put, so that the editor shows it again the way it was said, and a reader of the file knows
 * the car was placed from the house.
 *
 * - relative: `eastM` and `northM` from the element whose id is `relativeTo`, or from the observer where at t=0 the recording sets
 *   off when `relativeTo` is absent;
 * - absolute: a `lat` and a `lng`.
 *
 * The position kept is the one that counts. The house moved afterwards, the car stays where it was put, and what is said of it is
 * said again from where the house now is (see SaidPositions.restated): a position said from another never moves with it, which is
 * what lets the observer be said from a house that is itself said from the observer, without either chasing the other.
 */
export type SaidPosition = RelativePosition | AbsolutePosition

export interface RelativePosition {
  /** The id of the element it is said from; absent, the observer. */
  relativeTo?: string
  eastM: number
  northM: number
  lat?: undefined
  lng?: undefined
}

export interface AbsolutePosition {
  lat: number
  lng: number
  relativeTo?: undefined
  eastM?: undefined
  northM?: undefined
}

/** A point of the recording's own frame: metres east and north of the observer where the recording sets off. */
export interface LocalPoint {
  eastM: number
  northM: number
}

export interface GeoPoint {
  lat: number
  lng: number
}

/** What a position can be said from: an element of the recording, where it stands in the recording's frame. */
export interface PositionReference extends LocalPoint {
  /** Absent for the observer, as `relativeTo` is. */
  id?: string
  label: string
}

/**
 * The frame a position is said in: where the recording's own frame is on the Earth (the observer where it sets off, when the
 * recording has a place), and what else in it a position can be said from — the observer first.
 */
export interface PositionFrame {
  origin?: GeoPoint
  references: ReadonlyArray<PositionReference>
}

export class SaidPositions {

  /** Whether it is said from another element (or the observer) rather than as a latitude and a longitude. */
  static isRelative(said: SaidPosition | undefined): said is RelativePosition {
    return said !== undefined && typeof said.eastM === "number" && typeof said.northM === "number"
  }

  static isAbsolute(said: SaidPosition | undefined): said is AbsolutePosition {
    return said !== undefined && typeof said.lat === "number" && typeof said.lng === "number"
  }

  /** The reference a relative position is said from, in `frame`; the observer when it says none, and none when it names one that is gone. */
  static referenceOf(said: RelativePosition, frame: PositionFrame): PositionReference | undefined {
    return frame.references.find(reference => (reference.id ?? undefined) === (said.relativeTo ?? undefined))
  }

  /** Where a position said in `frame` is, in the recording's frame; undefined when what it needs is missing (a reference gone, no place to put a latitude). */
  static resolve(said: SaidPosition, frame: PositionFrame): LocalPoint | undefined {
    if (SaidPositions.isRelative(said)) {
      const reference = SaidPositions.referenceOf(said, frame)
      return reference ? { eastM: reference.eastM + said.eastM, northM: reference.northM + said.northM } : undefined
    }
    return SaidPositions.isAbsolute(said) && frame.origin ? SaidPositions.toLocal(said, frame.origin) : undefined
  }

  /**
   * The same way of saying it, with the numbers of `point`: said from the same reference, or as a latitude and a longitude. What a
   * position comes to is what counts (see SaidPosition): this is how it is said once it, or what it was said from, has moved.
   */
  static restated(said: SaidPosition, point: LocalPoint, frame: PositionFrame): SaidPosition | undefined {
    if (SaidPositions.isRelative(said)) {
      const reference = SaidPositions.referenceOf(said, frame)
      if (!reference) return undefined
      return SaidPositions.relative(point.eastM - reference.eastM, point.northM - reference.northM, said.relativeTo)
    }
    if (!frame.origin) return said
    const geo = SaidPositions.toGeo(point, frame.origin)
    return { lat: SaidPositions.degrees(geo.lat), lng: SaidPositions.degrees(geo.lng) }
  }

  /** A relative position, rounded as a field shows it, with no `relativeTo` for the observer. */
  static relative(eastM: number, northM: number, relativeTo?: string): RelativePosition {
    const said: RelativePosition = { eastM: SaidPositions.metres(eastM), northM: SaidPositions.metres(northM) }
    if (relativeTo !== undefined) said.relativeTo = relativeTo
    return said
  }

  static toLocal(geo: GeoPoint, origin: GeoPoint): LocalPoint {
    const local = geoToLocalMeters(geo.lat, geo.lng, origin.lat, origin.lng)
    return { eastM: local.x, northM: -local.z }
  }

  static toGeo(point: LocalPoint, origin: GeoPoint): GeoPoint {
    return localMetersToGeo(point.eastM, -point.northM, origin.lat, origin.lng)
  }

  /** A centimetre: no one paces out less. */
  static metres(value: number): number {
    return Math.round(value * 100) / 100
  }

  /** A ten-millionth of a degree, a centimetre on the ground. */
  static degrees(value: number): number {
    return Math.round(value * 1e7) / 1e7
  }
}
