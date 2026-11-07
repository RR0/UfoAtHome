import { ReentrySighting } from "./Reentry.js"
import type { ReentryFragment, ReentryJson, ReentryKeyframe } from "./Reentry.js"
import type { ParameterHolder, ParameterSet, ParameterSpec } from "../../../engine/interpretation/Parameters.js"

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

  static readonly SET: ParameterSet = {
    kind: "reentry",
    title: "fireballOrReEntry",
    parameters: ([
      { type: "said", key: "title", label: ReentryParameters.NAME },
      {
        type: "text", key: "object.name", group: ReentryParameters.OBJECT,
        label: "catalogueName",
        hint: "forAReEntryThePiece"
      },
      { type: "text", key: "object.cosparId", group: ReentryParameters.OBJECT, label: "cosparId",
        placeholder: "t1968013c" },
      { type: "number", key: "object.norad", min: 1, max: 999999, step: 1, group: ReentryParameters.OBJECT, label: "noradNumber" }
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
