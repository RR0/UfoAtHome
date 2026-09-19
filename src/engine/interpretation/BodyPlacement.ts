import type { BodyAppearance, BodyAttitude, BodyFlame, BodyJson, BodyKeyframe, BodySize } from "./Interpretation.js"
import type { DecorModelRef } from "../model/Decor.js"
import type { Sighting } from "../model/Sighting.js"
import { resolveObserverPoseAt } from "../model/Sighting.js"
import { geoToLocalMeters } from "../../render3d/terrain/GeoProjection.js"

const DEG_TO_RAD = Math.PI / 180

/**
 * The height of the ground, metres, in the frame bodies are placed in: east and north from where the
 * witness stood at the start of the recording, up from the ground THERE. Supplied by whoever holds
 * the relief — the renderer, which already stands the decor on it.
 */
export interface Ground {
  heightAt(eastM: number, northM: number): number
}

/** A point of that same frame. */
export interface LocalPoint {
  eastM: number
  northM: number
  upM: number
}

/** A body at one instant, resolved: where its CENTRE stands, and everything it looks like. */
export interface BodyState {
  id: string
  model: DecorModelRef
  explains: string[]
  /** See BodyJson.outlineNode. */
  outlineNode?: string
  eastM: number
  northM: number
  upM: number
  sizeM: BodySize
  attitude: Required<BodyAttitude>
  appearance: Required<BodyAppearance>
  /** The flame it is throwing at this instant, if any is lit. */
  flame?: BodyFlame
  /** Whether it throws one at any instant at all — what lets a renderer ready the light once rather
   * than add and remove it as the flame comes and goes (see FlameEffect). */
  throwsFlame: boolean
}

/** Where a keyframe's vertical position comes from: the ground under it, or a fixed height. */
type Vertical = { aboveGroundM: number } | { upM: number }

/** A keyframe, once its position has been put in the world. */
interface PlacedKey {
  t: number
  eastM: number
  northM: number
  vertical: Vertical
  sizeM: BodySize
  attitude: Required<BodyAttitude>
  appearance: BodyState["appearance"]
  flame?: BodyFlame
  present: boolean
}

/**
 * Where a body stands at any instant — the one place its keyframes become metres in the world.
 *
 * A keyframe stated FROM THE WITNESS is fixed in the world with their pose at its own instant, and
 * only then blended with its neighbours: a craft the witness walked around does not walk with them.
 *
 * A body on the ground is SUBJECT TO THE RELIEF. It stands on the highest of five readings under its
 * footprint (its centre and four corners — at its centre alone, the uphill half of a wide thing is
 * underground, see DecorSystem.groundUnderFootprint), and between two keyframes that both put it on
 * the ground it follows the ground rather than cutting through a rise. A direction with no distance
 * finds the distance where that line meets the relief (see lineOfSightMeetsGround).
 *
 * What the relief is, this class does not know: it is handed a Ground. So the same body stands on a
 * flat plane in a test and on the patch of real terrain in the renderer, and its arithmetic is
 * checkable on the first.
 */
export class BodyPlacement {
  /** Where a witness's eye is above the ground they stand on — the renderer's own figure. */
  static readonly EYE_HEIGHT_M = 1.6
  /** No line of sight is followed further than this looking for the ground, metres. */
  static readonly MAX_RANGE_M = 30000
  /** What a body that never states a size is drawn at: one metre, a size nobody could take for a
   * claim. */
  static readonly DEFAULT_SIZE: BodySize = { widthM: 1, lengthM: 1, heightM: 1 }
  static readonly DEFAULT_APPEARANCE: BodyState["appearance"] = { color: "#c8c8c8", albedo: 0.5 }

  private readonly keys: PlacedKey[]

  /**
   * @param eyeAt Where the witness's eye is at an instant, in the same frame — see eyeOf.
   */
  constructor(private readonly body: BodyJson, private readonly ground: Ground, eyeAt: (t: number) => (LocalPoint & { headingDeg?: number }) | undefined) {
    this.keys = this.place([...body.track].sort((a, b) => a.t - b.t), eyeAt)
  }

  /**
   * Where the witness's eye is at `t`, in the frame bodies are placed in — the recording's own
   * track, from where it started, at eye height above the ground there. Undefined for a recording
   * with no position at all: without one there is no world to stand a body in.
   */
  static eyeOf(sighting: Sighting, t: number, ground: Ground): (LocalPoint & { headingDeg?: number }) | undefined {
    const origin = resolveObserverPoseAt(sighting, 0)
    const pose = resolveObserverPoseAt(sighting, t)
    if (origin?.lat === undefined || origin.lng === undefined || pose?.lat === undefined || pose.lng === undefined) {
      return undefined
    }
    const local = geoToLocalMeters(pose.lat, pose.lng, origin.lat, origin.lng)
    const eastM = local.x
    const northM = -local.z
    return {
      eastM,
      northM,
      upM: ground.heightAt(eastM, northM) + BodyPlacement.EYE_HEIGHT_M + pose.elevationM,
      headingDeg: pose.headingDeg
    }
  }

  /**
   * How far along a line of sight from `eye` it first meets the ground, metres — or undefined when
   * it never does within MAX_RANGE_M (a direction above the horizon, over a plain).
   *
   * Marched in steps that lengthen with distance (a hundredth of the way so far, never under half a
   * metre), then narrowed down by halving between the last step above ground and the first below.
   */
  static lineOfSightMeetsGround(eye: LocalPoint, azimuthDeg: number, altitudeDeg: number, ground: Ground): number | undefined {
    const direction = BodyPlacement.directionOf(azimuthDeg, altitudeDeg)
    const clearance = (d: number): number =>
      eye.upM + direction.upM * d - ground.heightAt(eye.eastM + direction.eastM * d, eye.northM + direction.northM * d)
    let near = 0
    let far = 0
    while (far < BodyPlacement.MAX_RANGE_M) {
      far = near + Math.max(0.5, near * 0.01)
      if (clearance(far) <= 0) {
        for (let i = 0; i < 30; i++) {
          const middle = (near + far) / 2
          if (clearance(middle) <= 0) far = middle
          else near = middle
        }
        return far
      }
      near = far
    }
    return undefined
  }

  /** A unit vector of the local frame, from an azimuth clockwise from north and an altitude. */
  static directionOf(azimuthDeg: number, altitudeDeg: number): LocalPoint {
    const azimuth = azimuthDeg * DEG_TO_RAD
    const altitude = altitudeDeg * DEG_TO_RAD
    return {
      eastM: Math.sin(azimuth) * Math.cos(altitude),
      northM: Math.cos(azimuth) * Math.cos(altitude),
      upM: Math.sin(altitude)
    }
  }

  /** Where the body stands and what it looks like at `t`, or undefined before its first keyframe:
   * a body exists from the first instant its interpreter put it somewhere. After its last keyframe
   * it stays as that one left it. */
  at(t: number): BodyState | undefined {
    const keys = this.keys
    if (keys.length === 0 || t < keys[0].t) return undefined
    let index = keys.length - 1
    while (index > 0 && keys[index].t > t) index--
    const from = keys[index]
    if (!from.present) return undefined
    const to = keys[Math.min(index + 1, keys.length - 1)]
    const fraction = to === from || to.t === from.t ? 0 : Math.min(1, (t - from.t) / (to.t - from.t))
    const eastM = BodyPlacement.lerp(from.eastM, to.eastM, fraction)
    const northM = BodyPlacement.lerp(from.northM, to.northM, fraction)
    const sizeM: BodySize = {
      widthM: BodyPlacement.lerp(from.sizeM.widthM, to.sizeM.widthM, fraction),
      lengthM: BodyPlacement.lerp(from.sizeM.lengthM, to.sizeM.lengthM, fraction),
      heightM: BodyPlacement.lerp(from.sizeM.heightM, to.sizeM.heightM, fraction)
    }
    const attitude = {
      headingDeg: BodyPlacement.lerpAngle(from.attitude.headingDeg, to.attitude.headingDeg, fraction),
      pitchDeg: BodyPlacement.lerp(from.attitude.pitchDeg, to.attitude.pitchDeg, fraction),
      rollDeg: BodyPlacement.lerp(from.attitude.rollDeg, to.attitude.rollDeg, fraction)
    }
    let upM: number
    if ("aboveGroundM" in from.vertical && "aboveGroundM" in to.vertical) {
      // Both on (or a set height over) the ground: the ground is followed, not cut through.
      const aboveM = BodyPlacement.lerp(from.vertical.aboveGroundM, to.vertical.aboveGroundM, fraction)
      upM = this.groundUnderFootprint(eastM, northM, sizeM, attitude.headingDeg) + aboveM + sizeM.heightM / 2
    } else {
      upM = BodyPlacement.lerp(this.centreUpOf(from), this.centreUpOf(to), fraction)
    }
    return {
      id: this.body.id,
      model: this.body.model,
      explains: this.body.explains ?? [],
      outlineNode: this.body.outlineNode,
      eastM,
      northM,
      upM,
      sizeM,
      attitude,
      appearance: {
        color: (fraction < 1 ? from : to).appearance.color,
        albedo: BodyPlacement.lerp(from.appearance.albedo, to.appearance.albedo, fraction)
      },
      flame: BodyPlacement.flameBetween(from.flame, to.flame, fraction),
      throwsFlame: this.body.track.some(key => key.flame !== undefined && key.flame.luminanceCdM2 > 0)
    }
  }

  /** A flame between two keyframes: its sizes and brightness blended, its colours and node those of
   * the nearer end. A flame is lit AT the keyframe that first states it, not faded in over the
   * interval before — an exhaust catches, it does not dawn; one is put out by stating
   * `luminanceCdM2: 0`, and dies down over the interval that leads to that. */
  private static flameBetween(from: BodyFlame | undefined, to: BodyFlame | undefined, fraction: number): BodyFlame | undefined {
    // A flame already out is no flame: one lit again later catches at its keyframe, as the first did.
    if (!from || from.luminanceCdM2 <= 0) return fraction >= 1 && to && to.luminanceCdM2 > 0 ? to : undefined
    const start = from
    const end = to ?? from
    const flame = {
      ...(fraction < 1 ? start : end),
      lengthM: BodyPlacement.lerp(start.lengthM, end.lengthM, fraction),
      widthM: BodyPlacement.lerp(start.widthM, end.widthM, fraction),
      luminanceCdM2: BodyPlacement.lerp(start.luminanceCdM2, end.luminanceCdM2, fraction)
    }
    return flame.luminanceCdM2 > 0 ? flame : undefined
  }

  /** The height of a key's centre, whichever way its vertical was stated. */
  private centreUpOf(key: PlacedKey): number {
    return "upM" in key.vertical
      ? key.vertical.upM
      : this.groundUnderFootprint(key.eastM, key.northM, key.sizeM, key.attitude.headingDeg) + key.vertical.aboveGroundM + key.sizeM.heightM / 2
  }

  /** The highest of the ground at the centre and the four corners of the footprint. */
  private groundUnderFootprint(eastM: number, northM: number, size: BodySize, headingDeg: number): number {
    const heading = headingDeg * DEG_TO_RAD
    // Across the body is to its right, fore and aft along its heading.
    const across = { eastM: Math.cos(heading), northM: -Math.sin(heading) }
    const along = { eastM: Math.sin(heading), northM: Math.cos(heading) }
    let highest = this.ground.heightAt(eastM, northM)
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const dx = (sx * size.widthM) / 2
      const dy = (sy * size.lengthM) / 2
      highest = Math.max(highest, this.ground.heightAt(
        eastM + across.eastM * dx + along.eastM * dy,
        northM + across.northM * dx + along.northM * dy))
    }
    return highest
  }

  /** Every keyframe put in the world, with what it leaves unstated carried over from the one
   * before. A keyframe whose position cannot be worked out (a direction with neither a distance
   * nor the ground to meet) keeps the previous position; the first one, having none, is dropped. */
  private place(track: BodyKeyframe[], eyeAt: (t: number) => (LocalPoint & { headingDeg?: number }) | undefined): PlacedKey[] {
    const placed: PlacedKey[] = []
    let previous: PlacedKey | undefined
    for (const key of track) {
      const sizeM = key.sizeM ?? previous?.sizeM ?? BodyPlacement.DEFAULT_SIZE
      const attitude = {
        headingDeg: key.attitude?.headingDeg ?? previous?.attitude.headingDeg ?? 0,
        pitchDeg: key.attitude?.pitchDeg ?? previous?.attitude.pitchDeg ?? 0,
        rollDeg: key.attitude?.rollDeg ?? previous?.attitude.rollDeg ?? 0
      }
      const appearance = {
        color: key.appearance?.color ?? previous?.appearance.color ?? BodyPlacement.DEFAULT_APPEARANCE.color,
        albedo: key.appearance?.albedo ?? previous?.appearance.albedo ?? BodyPlacement.DEFAULT_APPEARANCE.albedo
      }
      const position = this.positionOf(key, eyeAt) ?? (previous && {
        eastM: previous.eastM,
        northM: previous.northM,
        vertical: this.verticalOf(key) ?? previous.vertical
      })
      if (!position) continue
      const flame = key.flame ?? previous?.flame
      const present = key.present ?? previous?.present ?? true
      previous = { t: key.t, ...position, sizeM, attitude, appearance, flame, present }
      placed.push(previous)
    }
    return placed
  }

  private verticalOf(key: BodyKeyframe): Vertical | undefined {
    if (key.onGround) return { aboveGroundM: 0 }
    if (key.altitudeAboveGroundM !== undefined) return { aboveGroundM: key.altitudeAboveGroundM }
    return undefined
  }

  private positionOf(key: BodyKeyframe, eyeAt: (t: number) => (LocalPoint & { headingDeg?: number }) | undefined):
    Pick<PlacedKey, "eastM" | "northM" | "vertical"> | undefined {
    if (key.eastM !== undefined && key.northM !== undefined) {
      return { eastM: key.eastM, northM: key.northM, vertical: this.verticalOf(key) ?? { aboveGroundM: 0 } }
    }
    if (key.azimuthDeg === undefined || key.altitudeDeg === undefined) return undefined
    const eye = eyeAt(key.t)
    if (!eye) return undefined
    const distanceM = key.distanceM ?? (key.onGround
      ? BodyPlacement.lineOfSightMeetsGround(eye, key.azimuthDeg, key.altitudeDeg, this.ground)
      : undefined)
    if (distanceM === undefined) return undefined
    const direction = BodyPlacement.directionOf(key.azimuthDeg, key.altitudeDeg)
    const eastM = eye.eastM + direction.eastM * distanceM
    const northM = eye.northM + direction.northM * distanceM
    // Where the witness said it was, the line of sight passes through its centre — unless it is
    // on the ground, which then decides its height whatever the line said.
    return {
      eastM,
      northM,
      vertical: this.verticalOf(key) ?? { upM: eye.upM + direction.upM * distanceM }
    }
  }

  private static lerp(from: number, to: number, fraction: number): number {
    return from + (to - from) * fraction
  }

  /** Blends two headings the short way round. */
  private static lerpAngle(from: number, to: number, fraction: number): number {
    const turn = ((((to - from) % 360) + 540) % 360) - 180
    return (((from + turn * fraction) % 360) + 360) % 360
  }
}
