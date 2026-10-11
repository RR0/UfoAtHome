import type { Sighting } from "../model/Sighting.js"
import { resolveDecorPlacementAt } from "../model/Decor.js"
import type { DecorObject } from "../model/Decor.js"
import type { AircraftKind } from "../traffic/AircraftModels.js"
import type { AircraftDescription, AircraftTrack } from "../traffic/AircraftProvider.js"
import { TrafficSound } from "../traffic/TrafficSound.js"
import type { AircraftVoice, TrafficSoundOptions } from "../traffic/TrafficSound.js"
import { localMetersToGeo } from "../../render3d/terrain/GeoProjection.js"

/**
 * The noise of the aircraft a recording places in its decor, heard as the aircraft of a record of air traffic are: from where the
 * observer stands, from the distance it is at, late by the time sound takes to come, shifted in pitch as it comes and goes, and masked by the noise of the place.
 * A machine that flies is not silent unless its author says so (see DecorObject.aircraftSound), as a decor vehicle with an engine is not.
 *
 * It is the same working-out as the traffic's (see TrafficSound.voices): a decor aircraft is turned into the track of one — its
 * place over the recording, in geographic coordinates — and nothing here knows how a sound is made of one.
 */
export class DecorAircraftHearing {
  /** The sound of a machine nobody said anything of: an airliner's, which is most of what flies. */
  static readonly DEFAULT_KIND: AircraftKind = "airliner-narrow"
  /** One position a second is plenty for an object a track interpolates between. */
  private static readonly STEP_MS = 1000
  /** How long before the recording the aircraft is taken to have flown on the same course: what is heard at its start left it up to this long before. */
  private static readonly LEAD_MS = 120000
  private static readonly FT_PER_M = 1 / 0.3048
  private static readonly ID_PREFIX = "decor:"

  private readonly tracks = new Map<string, { key: string, track: AircraftTrack }>()

  /**
   * What an aircraft sounds like in flight: what it says itself, else what its model says, else an airliner's. Undefined when it is
   * silent, or not an aircraft, or does not fly (nothing is heard from a parked one, or from a craft sitting on the ground).
   */
  static kindOf(decor: DecorObject, modelSays?: AircraftKind | "silent"): AircraftKind | undefined {
    if (decor.kind !== "aircraft" || !DecorAircraftHearing.flies(decor)) return undefined
    const says = decor.aircraftSound ?? modelSays ?? DecorAircraftHearing.DEFAULT_KIND
    return says === "silent" ? undefined : says
  }

  /** Whether the aircraft is ever off the ground: a trajectory, one keyframe long if it only sits up there, that leaves it. */
  static flies(decor: Pick<DecorObject, "track">): boolean {
    return (decor.track ?? []).some(keyframe => (keyframe.altitudeM ?? 0) > 0)
  }

  /**
   * The voices of the decor aircraft at `t` (ms from the start of the recording), the loudest first. `modelSound` is what the catalogue says of
   * a model by its id, when it is known.
   */
  voices(sighting: Sighting, t: number, observer: { lat: number, lng: number, heightM: number }, options: TrafficSoundOptions = {},
    modelSound: (decor: DecorObject) => AircraftKind | "silent" | undefined = () => undefined): AircraftVoice[] {
    const origin = sighting.event.place?.[0]
    if (!origin) return []
    const flights = new Map<string, AircraftTrack>()
    const kinds = new Map<string, AircraftKind>()
    const span = Math.max(sighting.observerTrack.duration, (sighting.event.durationSeconds ?? 0) * 1000)
    for (const decor of sighting.decor) {
      const kind = DecorAircraftHearing.kindOf(decor, modelSound(decor))
      if (!kind) continue
      const id = `${DecorAircraftHearing.ID_PREFIX}${decor.id}`
      flights.set(id, this.trackOf(decor, id, origin, span))
      kinds.set(id, kind)
    }
    for (const id of this.tracks.keys()) if (!flights.has(id)) this.tracks.delete(id)
    if (flights.size === 0) return []
    return TrafficSound.voices(new Set(flights.keys()), flights, new Map<string, AircraftDescription>(), track => String(track.icao), observer, t,
      { ...options, kindOf: id => kinds.get(id) })
  }

  /** The decor aircraft's journey as an aircraft's, over the recording and a little beyond it, where `t` is milliseconds from its start. */
  private trackOf(decor: DecorObject, id: string, origin: { lat: number, lng: number }, spanMs: number): AircraftTrack {
    const key = JSON.stringify([decor.track, decor.eastM, decor.northM, decor.headingDeg, origin.lat, origin.lng, spanMs])
    const known = this.tracks.get(id)
    if (known?.key === key) return known.track
    const points: AircraftTrack["points"] = []
    for (let t = 0; t <= spanMs; t += DecorAircraftHearing.STEP_MS) points.push(DecorAircraftHearing.pointAt(decor, t, origin))
    if (points.length === 0 || points[points.length - 1].t < spanMs) points.push(DecorAircraftHearing.pointAt(decor, spanMs, origin))
    // It was flying before the recording began, and the sound of it that arrives at the start left it then: the course is carried back along its first heading.
    const first = points[0]
    const next = points[1] ?? first
    const rate = (key: "lat" | "lng" | "altitudeFt") => (next[key] - first[key]) / ((next.t - first.t) || 1)
    // Sampled often enough that the record has no gap, which is what an aircraft's track is not allowed to have.
    for (let back = DecorAircraftHearing.STEP_MS * 10; back <= DecorAircraftHearing.LEAD_MS; back += DecorAircraftHearing.STEP_MS * 10) {
      points.unshift({ t: -back, lat: first.lat - rate("lat") * back, lng: first.lng - rate("lng") * back, altitudeFt: Math.max(0, first.altitudeFt - rate("altitudeFt") * back) })
    }
    const track = { icao: DecorAircraftHearing.hash(id), nonIcao: true, points }
    this.tracks.set(id, { key, track })
    return track
  }

  private static pointAt(decor: DecorObject, t: number, origin: { lat: number, lng: number }): AircraftTrack["points"][number] {
    const placed = resolveDecorPlacementAt(decor, t)
    const geo = localMetersToGeo(placed.eastM, -placed.northM, origin.lat, origin.lng)
    return { t, lat: geo.lat, lng: geo.lng, altitudeFt: placed.altitudeM * DecorAircraftHearing.FT_PER_M }
  }

  private static hash(text: string): number {
    let hash = 0
    for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) >>> 0
    return hash
  }
}
