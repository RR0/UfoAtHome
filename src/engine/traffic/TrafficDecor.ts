import type { DecorObject, DecorPlacementKeyframe } from "../model/Decor.js"
import type { GeoPoint } from "../interpretation/Reentry.js"
import { ReentrySighting } from "../interpretation/Reentry.js"
import type { AircraftPoint, AircraftTrack } from "./AircraftProvider.js"
import type { AircraftModel } from "./AircraftModels.js"
import { AircraftModels } from "./AircraftModels.js"
import { AircraftSighting } from "./AircraftSighting.js"
import { TrafficIds } from "./TrafficIds.js"
import { TrafficLights } from "./TrafficLights.js"

/** When one piece of traffic is there: it exists only between its first and last position, ms from the recording's start. */
export interface TrafficPresence {
  fromMs: number
  untilMs: number
}

/** The traffic of a recording, as the scene's own decor. */
export interface TrafficDecorSet {
  objects: DecorObject[]
  /** By object id. Not part of DecorObject: a recording never states it, it is the record's. */
  presence: Map<string, TrafficPresence>
  /** By object id, the flight each object draws, with its real positions: what the aircraft is lit by depends on where it really is. */
  flights: Map<string, AircraftTrack>
  /** How many aircraft the record gave and how many are drawn, for a readout: the rest are not hidden
   * for being dull but for being too many to draw. */
  total: number
  shown: number
}

/**
 * Turns the aircraft a record gave into what the scene already knows how to draw: a decor object of
 * kind "aircraft" that follows its own track, with the lamps of an airliner — the beacon, the
 * navigation lights and the wingtip strobes whose RATE is what tells an aircraft from something that
 * does not blink (see LIGHT_RIGS).
 *
 * Placed where it really was seen from: east, north and up from the observer on the WGS84 ellipsoid (so
 * an aircraft 100 km off stands as low in the sky as the Earth's curvature puts it, not as a flat
 * reckoning would), at the instant of each position.
 *
 * An aircraft whose record has a gap longer than AircraftSighting.MAX_GAP_S is two aircraft here: the
 * line drawn across the gap would be a flight nobody recorded. One that never rises above the observer's
 * horizon is not drawn. The lamps of every one are those of an airliner whatever it was: the record
 * gives positions, not a type (see AircraftProvider.describe), so a light aircraft is drawn with the
 * wrong body and the wrong lamps, and what is drawn is a candidate, not an identification.
 */
export interface TrafficDecorOptions {
  /** What each aircraft is, by TrafficDecor.keyOf: its size, its lamps and its colour follow it. A generic airliner when absent. */
  models?: ReadonlyMap<string, AircraftModel>
  /** The Sun's elevation over the horizon of the place of an aircraft at one of its positions, degrees: what lights its lamps (see TrafficLights). Day when absent. */
  sunElevationAt?: (point: AircraftPoint) => number
}

export class TrafficDecor {
  /** What every id of an aircraft drawn from a record begins with: see TrafficIds, which the scene has without this module. */
  static readonly ID_PREFIX = TrafficIds.ID_PREFIX

  /** The most that are drawn: the nearest at their closest, which are the ones taken for something else. */
  static readonly MAX_OBJECTS = 40
  private static readonly FT_TO_M = 0.3048
  private static readonly DEG = Math.PI / 180

  static from(tracks: readonly AircraftTrack[], observer: GeoPoint, startMs: number, maxObjects = TrafficDecor.MAX_OBJECTS, options: TrafficDecorOptions = {}): TrafficDecorSet {
    return new TrafficDecorSetBuilder(tracks, observer, startMs, maxObjects, options).build()
  }

  /** What identifies an aircraft among the rest: its address, and whether that address is its own. */
  static idOf(track: { icao: number; nonIcao: boolean }, segment: number): string {
    return TrafficIds.idOf(track, segment)
  }

  static keyOf(track: { icao: number; nonIcao: boolean }): string {
    return TrafficIds.keyOf(track)
  }

  /** The height of an aircraft over its span, which the primitive keeps its own proportions of until it is told: a tenth of the length for the fuselage, the fin on top. */
  private static readonly HEIGHT_OVER_LENGTH = 0.29

  static sizeOf(model: AircraftModel): { widthM: number; lengthM: number; heightM: number } {
    return { widthM: model.spanM, lengthM: model.lengthM, heightM: model.lengthM * TrafficDecor.HEIGHT_OVER_LENGTH }
  }

  /** The east/north/up offsets of a point from the observer, metres. */
  static offsetOf(observer: GeoPoint, point: AircraftPoint): { eastM: number; northM: number; upM: number; altitudeDeg: number; distanceKm: number } {
    const sky = ReentrySighting.seenFrom(observer, { lat: point.lat, lng: point.lng, heightM: point.altitudeFt * TrafficDecor.FT_TO_M })
    const metres = sky.distanceKm * 1000
    const horizontal = metres * Math.cos(sky.altitudeDeg * TrafficDecor.DEG)
    return {
      eastM: horizontal * Math.sin(sky.azimuthDeg * TrafficDecor.DEG),
      northM: horizontal * Math.cos(sky.azimuthDeg * TrafficDecor.DEG),
      upM: metres * Math.sin(sky.altitudeDeg * TrafficDecor.DEG),
      altitudeDeg: sky.altitudeDeg,
      distanceKm: sky.distanceKm
    }
  }

  /** The runs of a track that follow each other closely enough to be one flight, two points at least. */
  static segments(track: AircraftTrack): AircraftPoint[][] {
    const runs: AircraftPoint[][] = []
    let run: AircraftPoint[] = []
    for (const point of track.points) {
      const last = run[run.length - 1]
      if (last && point.t - last.t > AircraftSighting.MAX_GAP_S * 1000) {
        runs.push(run)
        run = []
      }
      run.push(point)
    }
    runs.push(run)
    return runs.filter(points => points.length >= 2)
  }

  /** Degrees clockwise from north of the course between two points, when the record states no track. */
  static bearingDeg(from: { eastM: number; northM: number }, to: { eastM: number; northM: number }): number {
    return ((Math.atan2(to.eastM - from.eastM, to.northM - from.northM) / TrafficDecor.DEG) + 360) % 360
  }
}

/** The conversion proper; TrafficDecor.from is the way in. */
class TrafficDecorSetBuilder {
  constructor(
    private readonly tracks: readonly AircraftTrack[],
    private readonly observer: GeoPoint,
    private readonly startMs: number,
    private readonly maxObjects: number,
    private readonly options: TrafficDecorOptions
  ) {}

  build(): TrafficDecorSet {
    const candidates: { object: DecorObject; presence: TrafficPresence; flight: AircraftTrack; closestKm: number }[] = []
    for (const track of this.tracks) {
      const key = TrafficDecor.keyOf(track)
      const model = this.options.models?.get(key) ?? AircraftModels.of(undefined)
      TrafficDecor.segments(track).forEach((points, index) => {
        const placed = points.map(point => ({ point, at: TrafficDecor.offsetOf(this.observer, point) }))
        if (!placed.some(entry => entry.at.altitudeDeg >= 0)) return
        const keyframes: DecorPlacementKeyframe[] = placed.map((entry, i) => ({
          t: entry.point.t - this.startMs,
          eastM: entry.at.eastM,
          northM: entry.at.northM,
          altitudeM: entry.at.upM,
          headingDeg: entry.point.trackDeg ?? (i + 1 < placed.length ? TrafficDecor.bearingDeg(entry.at, placed[i + 1].at) : TrafficDecor.bearingDeg(placed[i - 1].at, entry.at))
        }))
        const id = TrafficDecor.idOf(track, index)
        // Lit by the Sun where it is, half-way through its flight: a flight is minutes, and the lamps of a light aircraft
        // do not change with them.
        const middle = placed[Math.floor(placed.length / 2)].point
        const sunElevationDeg = this.options.sunElevationAt?.(middle) ?? 90
        candidates.push({
          object: {
            id,
            kind: "aircraft",
            eastM: keyframes[0].eastM,
            northM: keyframes[0].northM,
            headingDeg: keyframes[0].headingDeg,
            sizeM: TrafficDecor.sizeOf(model),
            color: TrafficLights.bodyColor(model),
            lights: TrafficLights.lights(model, sunElevationDeg),
            track: keyframes
          },
          presence: { fromMs: keyframes[0].t, untilMs: keyframes[keyframes.length - 1].t },
          flight: { icao: track.icao, nonIcao: track.nonIcao, points },
          closestKm: Math.min(...placed.map(entry => entry.at.distanceKm))
        })
      })
    }
    candidates.sort((a, b) => a.closestKm - b.closestKm)
    const kept = candidates.slice(0, this.maxObjects)
    return {
      objects: kept.map(candidate => candidate.object),
      presence: new Map(kept.map(candidate => [candidate.object.id, candidate.presence])),
      flights: new Map(kept.map(candidate => [candidate.object.id, candidate.flight])),
      total: candidates.length,
      shown: kept.length
    }
  }
}
