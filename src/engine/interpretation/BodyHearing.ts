import type { BodyJson } from "./Interpretation.js"
import type { LocalPoint } from "./BodyPlacement.js"
import { AircraftHearing } from "../traffic/AircraftHearing.js"
import type { AircraftNoise } from "../traffic/AircraftHearing.js"
import type { AircraftKind } from "../traffic/AircraftModels.js"
import type { AircraftDescription, AircraftTrack } from "../traffic/AircraftProvider.js"
import { TrafficSound } from "../traffic/TrafficSound.js"
import type { AircraftVoice, TrafficSoundOptions } from "../traffic/TrafficSound.js"
import { localMetersToGeo } from "../../render3d/terrain/GeoProjection.js"

/**
 * The noise of the bodies an interpretation claims were there, heard as the aircraft of a record of air traffic are (see TrafficSound.voices):
 * from where the observer stands, late by the time sound takes to come, shifted in pitch as it comes and goes, and masked by the noise of the
 * place. What a reading says made no sound, or says nothing of, is silent (see BodyJson.sound).
 *
 * That is what lets a reading be HEARD against an account: a fighter dispensing flares a kilometre away roars where the observer recalls no
 * sound at all, and a reading that wants it silent has to say by how much quieter than a fighter it was (see BodySound.quieterDb).
 *
 * A body is turned into the track of an aircraft — its place over the recording, in geographic coordinates — and nothing here knows how a
 * sound is made of one.
 */
export class BodyHearing {
  /** Four positions a second: a body can be a fighter crossing a kilometre of sky in a few seconds. */
  private static readonly STEP_MS = 250
  private static readonly FT_PER_M = 1 / 0.3048
  private static readonly ID_PREFIX = "body:"

  private readonly tracks = new Map<string, { body: BodyJson, origin: string, track: AircraftTrack }>()

  /** The noise of a body's sound: its class's, lowered by what the reading claims. */
  static noiseOf(sound: NonNullable<BodyJson["sound"]>): AircraftNoise {
    const noise = AircraftHearing.noiseOfKind(sound.kind)
    const quieter = sound.quieterDb ?? 0
    return quieter === 0 ? noise : { ...noise, id: `${noise.id}-${quieter}dB`, soundPowerA: noise.soundPowerA.map(level => level - quieter) }
  }

  /**
   * The voices of the bodies that make a sound, at `t` (ms from the start of the recording), the loudest first. `positionAt` is where a body
   * stands at an instant in the scene's frame (see BodyPlacement), undefined when it is not there; `eye` is where the observer's ear is now in
   * the same frame; `origin` is the place that frame is centred on, and `spanMs` how long the recording runs.
   */
  voices(bodies: readonly BodyJson[], positionAt: (body: BodyJson, t: number) => LocalPoint | undefined, eye: LocalPoint,
    origin: { lat: number, lng: number }, t: number, spanMs: number, options: TrafficSoundOptions = {}): AircraftVoice[] {
    const flights = new Map<string, AircraftTrack>()
    const kinds = new Map<string, AircraftKind>()
    const noises = new Map<string, AircraftNoise>()
    for (const body of bodies) {
      if (!body.sound) continue
      const id = `${BodyHearing.ID_PREFIX}${body.id}`
      const track = this.trackOf(body, id, positionAt, origin, spanMs)
      if (!track) continue
      flights.set(id, track)
      kinds.set(id, body.sound.kind)
      noises.set(id, BodyHearing.noiseOf(body.sound))
    }
    for (const id of this.tracks.keys()) if (!flights.has(id)) this.tracks.delete(id)
    if (flights.size === 0) return []
    const ear = localMetersToGeo(eye.eastM, -eye.northM, origin.lat, origin.lng)
    return TrafficSound.voices(new Set(flights.keys()), flights, new Map<string, AircraftDescription>(), track => String(track.icao),
      { lat: ear.lat, lng: ear.lng, heightM: eye.upM }, t, { ...options, kindOf: id => kinds.get(id), noiseOf: id => noises.get(id) })
  }

  /**
   * The body's journey as an aircraft's, wherever it is there over the recording and the two minutes before it (a sound heard at its start
   * left it then). Worked out once per body and place: the body object is the reading's, and a new reading is a new object.
   */
  private trackOf(body: BodyJson, id: string, positionAt: (body: BodyJson, t: number) => LocalPoint | undefined,
    origin: { lat: number, lng: number }, spanMs: number): AircraftTrack | undefined {
    const originKey = `${origin.lat},${origin.lng},${spanMs}`
    const known = this.tracks.get(id)
    if (known && known.body === body && known.origin === originKey) return known.track
    const points: AircraftTrack["points"] = []
    for (let t = -120000; t <= spanMs; t += BodyHearing.STEP_MS) {
      const at = positionAt(body, t)
      if (!at) continue
      const geo = localMetersToGeo(at.eastM, -at.northM, origin.lat, origin.lng)
      points.push({ t, lat: geo.lat, lng: geo.lng, altitudeFt: at.upM * BodyHearing.FT_PER_M })
    }
    if (points.length < 2) return undefined
    const track = { icao: BodyHearing.hash(id), nonIcao: true, points }
    this.tracks.set(id, { body, origin: originKey, track })
    return track
  }

  private static hash(text: string): number {
    let hash = 0
    for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) >>> 0
    return hash
  }
}
