import { ReentrySighting } from "./Reentry.js"
import type { ReentryFragment, ReentryJson, ReentryKeyframe, ReentrySeen } from "./Reentry.js"
import type { ParameterHolder, ParameterSet, ParameterSpec } from "../../../engine/interpretation/Parameters.js"
import { ReentryTypes } from "./types/ReentryTypes.js"

/**
 * What a fireball or a re-entry lets its author set (see ReentryJson): its name and the object that came down, the points of its path,
 * its pieces, and how the light of each ran through its flight. The whole of what the editor knows of it: the forms are built from these
 * sets (see ParameterForm). The smaller pieces a burning one sheds (ReentryFragment.sheds) are not offered: their rates and means are
 * stated in the file, and absent, every piece sheds as a burning one does.
 */
export class ReentryParameters {
  private static readonly NAME = "name"
  private static readonly OBJECT = "object"
  private static readonly LIGHT = "light"
  private static readonly WHEN = "when"
  private static readonly SEEN = "seenByTheWitness"

  /** The Earth's mean radius, km: a sphere is close enough for a path a witness gave to the degree. */
  private static readonly EARTH_KM = 6371

  /**
   * Where a line of sight from `observer`, towards an azimuth and an altitude above the horizon (degrees), meets the height `heightKm`
   * above the Earth: the place under that point.
   */
  static placeSeen(observer: { lat: number, lng: number }, azimuthDeg: number, altitudeDeg: number, heightKm: number): { lat: number, lng: number } {
    const rad = Math.PI / 180
    const r = ReentryParameters.EARTH_KM
    const a = altitudeDeg * rad
    // Along the line of sight, from the eye at r, to the sphere of radius r + h.
    const s = -r * Math.sin(a) + Math.sqrt((r * Math.sin(a)) ** 2 + (r + heightKm) ** 2 - r ** 2)
    // The angle at the Earth's centre between the eye and the point, and the place that far along the azimuth's great circle.
    const theta = Math.atan2(s * Math.cos(a), r + s * Math.sin(a))
    const lat1 = observer.lat * rad
    const bearing = azimuthDeg * rad
    const lat2 = Math.asin(Math.sin(lat1) * Math.cos(theta) + Math.cos(lat1) * Math.sin(theta) * Math.cos(bearing))
    const lng2 = observer.lng * rad + Math.atan2(Math.sin(bearing) * Math.sin(theta) * Math.cos(lat1), Math.cos(theta) - Math.sin(lat1) * Math.sin(lat2))
    return { lat: lat2 / rad, lng: ((lng2 / rad + 540) % 360) - 180 }
  }

  /**
   * The path of a re-entry worked out from where the witness saw it (see ReentrySeen): from where it appeared, at the height its path
   * starts at, to where it went out, at the height its path ends at, over the time it was seen from the path's first instant. Undefined
   * while what was seen is not all said.
   */
  static trackFromSeen(reentry: ReentryJson, observer: { lat: number, lng: number }): ReentryKeyframe[] | undefined {
    const seen: ReentrySeen | undefined = reentry.seen
    const { fromAzimuthDeg, fromAltitudeDeg, toAzimuthDeg, toAltitudeDeg, durationS } = seen ?? {}
    if (fromAzimuthDeg === undefined || fromAltitudeDeg === undefined || toAzimuthDeg === undefined || toAltitudeDeg === undefined || !durationS) return undefined
    const first = reentry.track[0]
    const last = reentry.track[reentry.track.length - 1]
    const start = first?.t ?? 0
    const fromKm = first?.altitudeKm ?? 100
    const toKm = last?.altitudeKm ?? fromKm
    return [
      { t: start, ...ReentryParameters.placeSeen(observer, fromAzimuthDeg, fromAltitudeDeg, fromKm), altitudeKm: fromKm },
      { t: start + Math.round(durationS * 1000), ...ReentryParameters.placeSeen(observer, toAzimuthDeg, toAltitudeDeg, toKm), altitudeKm: toKm }
    ]
  }

  /**
   * A point of the path at `t`, where the leading piece is then: on the path between two of its points, or past either end going on as
   * the nearest two were going (the height never below the ground).
   */
  static placeAt(reentry: ReentryJson, t: number): ReentryKeyframe {
    const lead = ReentrySighting.leadAt(reentry, t)
    if (lead) return { t, lat: lead.lat, lng: lead.lng, altitudeKm: lead.heightM / 1000 }
    const track = reentry.track
    const [a, b] = t < (track[0]?.t ?? 0) ? [track[0], track[1]] : [track[track.length - 2], track[track.length - 1]]
    if (!a || !b || b.t === a.t) {
      const only = a ?? b ?? { lat: 0, lng: 0, altitudeKm: 80 }
      return { t, lat: only.lat, lng: only.lng, altitudeKm: only.altitudeKm }
    }
    const f = (t - a.t) / (b.t - a.t)
    return { t, lat: a.lat + (b.lat - a.lat) * f, lng: a.lng + (b.lng - a.lng) * f, altitudeKm: Math.max(0, a.altitudeKm + (b.altitudeKm - a.altitudeKm) * f) }
  }

  /** A point of a piece's light curve at `t`, as bright as the piece is then: putting it changes nothing until it is edited. */
  static curvePointAt(fragment: ReentryFragment, t: number): { t: number, absoluteMagnitude: number } {
    return { t, absoluteMagnitude: Math.round(ReentrySighting.absoluteMagnitudeAt(fragment, t) * 10) / 10 }
  }

  /** The instants every point of `reentry` stands at: its path, its pieces' lives and their light curves. */
  static instantsOf(reentry: ReentryJson): number[] {
    return [
      ...reentry.track.map(place => place.t),
      ...reentry.fragments.flatMap(fragment => [
        ...(fragment.fromT === undefined ? [] : [fragment.fromT]), ...(fragment.untilT === undefined ? [] : [fragment.untilT]),
        ...(fragment.lightCurve ?? []).map(point => point.t)
      ])
    ]
  }

  /** An instant of the recording: stored in milliseconds, typed in seconds. */
  private static instant(key: string, label: ParameterSpec["label"], hint: ParameterSpec["label"], extra: Partial<ParameterSpec> = {}): ParameterSpec {
    return { type: "number", key, min: -3600, max: 36000, step: 0.1, unit: "s", scale: 0.001, label, hint, ...extra } as ParameterSpec
  }

  /** Only what was put in orbit is in the satellite catalogue: a meteor or a fireball names no object. Unknown, it may. */
  private static mayBeCatalogued(element: ParameterHolder): boolean {
    return ReentryTypes.of((element as unknown as ReentryJson).type)?.nature !== "natural"
  }

  static readonly SET: ParameterSet = {
    kind: "reentry",
    title: "fireballOrReEntry",
    parameters: ([
      { type: "said", key: "title", label: ReentryParameters.NAME },
      {
        // The registry's types, a module's among them, named in the language last loaded (see ReentryTypes.load); one the registry no longer
        // has is still listed by its key, since dropping it would be an edit nobody made.
        type: "choice", key: "type", label: "type", hint: "whatCameInNaturalOrPut", empty: "notKnown", choices: [],
        optionsOf: element => {
          const stated = (element as unknown as ReentryJson).type
          const types = ReentryTypes.all().map(type => ({ value: type.key, label: ReentryTypes.nameOf(type.key) }))
          return stated === undefined || types.some(type => type.value === stated) ? types : [...types, { value: stated, label: stated }]
        }
      },
      {
        type: "text", key: "object.name", group: ReentryParameters.OBJECT, visibleWhen: ReentryParameters.mayBeCatalogued,
        label: "catalogueName",
        hint: "forAReEntryThePiece"
      },
      { type: "text", key: "object.cosparId", group: ReentryParameters.OBJECT, visibleWhen: ReentryParameters.mayBeCatalogued, label: "cosparId",
        placeholder: "t1968013c" },
      { type: "number", key: "object.norad", min: 1, max: 999999, step: 1, group: ReentryParameters.OBJECT, visibleWhen: ReentryParameters.mayBeCatalogued, label: "noradNumber" },
      // Where the witness saw it, which its path is worked out from once all is said (see trackFromSeen).
      { type: "number", key: "seen.fromAzimuthDeg", min: 0, max: 360, step: 1, unit: "°", group: ReentryParameters.SEEN, label: "appearedAzimuth", hint: "fromTheNorthTowardsTheEast" },
      { type: "number", key: "seen.fromAltitudeDeg", min: -5, max: 90, step: 1, unit: "°", group: ReentryParameters.SEEN, label: "appearedHeight", hint: "aboveTheHorizon" },
      { type: "number", key: "seen.toAzimuthDeg", min: 0, max: 360, step: 1, unit: "°", group: ReentryParameters.SEEN, label: "wentOutAzimuth", hint: "fromTheNorthTowardsTheEast" },
      { type: "number", key: "seen.toAltitudeDeg", min: -5, max: 90, step: 1, unit: "°", group: ReentryParameters.SEEN, label: "wentOutHeight", hint: "aboveTheHorizon" },
      { type: "number", key: "seen.durationS", min: 0.1, max: 3600, step: 0.1, unit: "s", group: ReentryParameters.SEEN, label: "seenFor", hint: "allSaidThePathIsWorkedOut" }
    ] satisfies ParameterSpec[])
  }

  /** A point of the path: where the leading piece was at an instant, joined to the next along the great circle. */
  static readonly PLACE: ParameterSet = {
    kind: "reentry-place",
    title: "pointOfThePath",
    parameters: ([
      ReentryParameters.instant("t", "time",
        "secondsOfTheRecordingNegativeBefore", { required: true }),
      // As degrees, or from the observer or a decor object: see PositionInputElement.
      { type: "position", key: "lat", secondKey: "lng", saidKey: "saidPosition", native: "geo", step: 1, rangeM: 2000000, label: "position" },
      {
        type: "number", key: "altitudeKm", min: 0, max: 300, step: 0.1, unit: "km", required: true,
        label: "altitude",
        hint: "aboveTheEllipsoidAMeteorBegins"
      }
    ] satisfies ParameterSpec[])
  }

  /** Where the track starts and ends, for what a piece's life is when it does not say. */
  private static trackEnd(context: unknown, end: "first" | "last"): number | undefined {
    const track = (context as ReentryJson | undefined)?.track
    if (!track?.length) return undefined
    return end === "first" ? track[0].t : track[track.length - 1].t
  }

  /** One burning piece: when it is seen, how far behind the leading point, how bright and of what colour. */
  static readonly FRAGMENT: ParameterSet = {
    kind: "reentry-fragment",
    title: "piece",
    parameters: ([
      {
        type: "text", key: "id", label: "id",
        validate: (value, element, context) => !(context as ReentryJson | undefined)?.fragments.some(other => other !== (element as unknown) && other.id === value)
      },
      {
        type: "number", key: "absoluteMagnitude", min: -40, max: 10, step: 0.1, required: true, group: ReentryParameters.LIGHT,
        label: "absoluteMagnitude",
        hint: "itsBrightnessSeenFrom100Km"
      },
      { type: "colour", key: "color", group: ReentryParameters.LIGHT, fallback: ReentrySighting.DEFAULT_COLOR, label: "colour" },
      {
        type: "number", key: "trainS", min: 0, max: 600, step: 0.1, unit: "s", group: ReentryParameters.LIGHT, effective: () => ReentrySighting.DEFAULT_TRAIN_S,
        label: "train",
        hint: "howLongAStretchOfIts"
      },
      {
        type: "number", key: "lagS", min: 0, max: 600, step: 0.1, unit: "s", group: ReentryParameters.WHEN, effective: () => 0,
        label: "behindTheLead",
        hint: "secondsBehindTheLeadingPointAlong"
      },
      ReentryParameters.instant("fromT", "seenFrom",
        "whenItBreaksOffOrBegins",
        { group: ReentryParameters.WHEN, effective: (_: ParameterHolder, context?: unknown) => ReentryParameters.trackEnd(context, "first") }),
      ReentryParameters.instant("untilT", "outAt",
        "whenItHasBurnedUpOr",
        { group: ReentryParameters.WHEN, effective: (_: ParameterHolder, context?: unknown) => ReentryParameters.trackEnd(context, "last") })
    ] satisfies ParameterSpec[])
  }

  /** A point of a piece's light curve: how bright it was at an instant, joined linearly in magnitude to the next. */
  static readonly CURVE_POINT: ParameterSet = {
    kind: "reentry-curve-point",
    title: "pointOfTheLightCurve",
    parameters: ([
      ReentryParameters.instant("t", "time",
        "secondsOfTheRecording", { required: true }),
      { type: "number", key: "absoluteMagnitude", min: -40, max: 10, step: 0.1, required: true, label: "absoluteMagnitude" }
    ] satisfies ParameterSpec[])
  }
}
