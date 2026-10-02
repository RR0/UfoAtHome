import type { GeoPoint } from "../interpretation/Reentry.js"
import { ReentrySighting } from "../interpretation/Reentry.js"
import { AircraftModels } from "./AircraftModels.js"
import type { AircraftKind } from "./AircraftModels.js"
import { AircraftHearing } from "./AircraftHearing.js"
import type { AircraftHearingOptions, AircraftSoundCharacter } from "./AircraftHearing.js"
import type { AircraftDescription, AircraftTrack } from "./AircraftProvider.js"
import { SoundInAir } from "./SoundInAir.js"

/** One aircraft to be heard at an instant: what a sound that is played needs, worked out by AircraftHearing. */
export interface AircraftVoice {
  id: string
  kind: AircraftKind
  /** How strong each octave band is to play, against a sound that is just heard (see TrafficSound.bandAmplitudes): 0 for a band the ambient noise masks. */
  bandAmplitudes: number[]
  /** The whole sound's level, dB(A). */
  levelDbA: number
  /** How far away it was when it made the sound, km: the farther, the more it is a rumble and the less it is placed. */
  distanceKm: number
  /** Pitch heard over pitch made. */
  dopplerRatio: number
  /** Where the sound comes from — where the aircraft WAS — as a bearing from true north, degrees. */
  azimuthDeg: number
  /** Where it comes from in height, degrees above the horizon. */
  elevationDeg: number
  character?: AircraftSoundCharacter
}

export interface TrafficSoundOptions extends AircraftHearingOptions {
  /** The most aircraft played at once, the loudest first: the ear hears four at once as a roar, and each costs a voice. */
  maxVoices?: number
  /**
   * Which candidates are worth working out at all. Every one by default, and that is right: the sound of an aircraft keeps arriving
   * after it has left the record, since it left the aircraft long before.
   */
  only?: (id: string) => boolean
  /** The amplitude a sound at the ambient noise's own level is played at: see AmbientNoise.referenceAmplitude. */
  referenceAmplitude?: number
}

/**
 * Which aircraft of a record are heard at an instant, and how they are to be played: the working-out behind the sound the scene plays
 * (see AircraftAudio), apart from the playing, so that it can be tested and so that it loads with the aircraft and not before.
 *
 * Costly to ask of every aircraft at every frame — the instant a sound left is found by iteration — and unnecessary: nearly all of a
 * record's aircraft are too far to be heard whatever they do. They are sorted out once, from the nearest each comes (`candidates`), and only
 * the few that remain are worked out at every instant (`voices`).
 */
export class TrafficSound {
  /** What amplitude a band that stands exactly at the ambient noise's own is played at when nothing says what that is: quiet, as it is just heard. */
  static readonly REFERENCE_AMPLITUDE = 0.02
  /**
   * The decibels either side of the margin over which a band comes in: a band is not played until it is that far under what can be noticed, and
   * is played whole from that far over it.
   */
  static readonly MASKING_RANGE_DB = 6
  /**
   * The level over the ambient noise at which a sound is played as loud as it is, the pivot of its playing. Above it a sound is played compressed:
   * the real range of an aircraft over a calm night is fifty decibels, a hundred and fifty times in amplitude, and nobody listens at that. Each
   * further COMPRESSION_RATIO decibels of level are played as one, as any mix is, so that the loud is loud and the quiet is heard in the same room.
   * Under it a sound is played expanded: each decibel less is EXPANSION_RATIO less, so that an aircraft far off, at a few decibels over the noise, is
   * the faint thing it is and not nearly as present as one that is overhead.
   */
  static readonly KNEE_DB = 20
  static readonly COMPRESSION_RATIO = 1.5
  static readonly EXPANSION_RATIO = 1.8
  static readonly DEFAULT_MAX_VOICES = 4

  /**
   * The ids of the flights that could be heard at all: those that, at the nearest they ever come, are above the ambient noise in some band.
   * By what they are: a helicopter and an airliner at the same distance are not the same noise.
   */
  static candidates(flights: ReadonlyMap<string, AircraftTrack>, descriptions: ReadonlyMap<string, AircraftDescription>, key: (track: AircraftTrack) => string, observer: GeoPoint, options: TrafficSoundOptions = {}): Set<string> {
    const heard = new Set<string>()
    for (const [id, flight] of flights) {
      const noise = AircraftHearing.noiseOfKind(AircraftModels.of(descriptions.get(key(flight))).kind)
      let nearestKm = Infinity
      for (const point of flight.points) {
        nearestKm = Math.min(nearestKm, ReentrySighting.seenFrom(observer, { lat: point.lat, lng: point.lng, heightM: point.altitudeFt * 0.3048 }).distanceKm)
      }
      if (AircraftHearing.couldBeHeard(noise, nearestKm, options.ambientDbA, options.air)) heard.add(id)
    }
    return heard
  }

  /**
   * Every candidate that is heard at `t` (ms UTC), the loudest first, up to `maxVoices`: each with what it takes to play it.
   */
  static voices(
    candidates: ReadonlySet<string>, flights: ReadonlyMap<string, AircraftTrack>, descriptions: ReadonlyMap<string, AircraftDescription>,
    key: (track: AircraftTrack) => string, observer: GeoPoint, t: number, options: TrafficSoundOptions = {}
  ): AircraftVoice[] {
    const voices: AircraftVoice[] = []
    for (const id of candidates) {
      const flight = flights.get(id)
      if (!flight || options.only?.(id) === false) continue
      const kind = AircraftModels.of(descriptions.get(key(flight))).kind
      const noise = AircraftHearing.noiseOfKind(kind)
      const heard = AircraftHearing.heardAt(flight, observer, t, { ...options, noise })
      if (!heard?.audible) continue
      voices.push({
        id,
        kind,
        bandAmplitudes: TrafficSound.bandAmplitudes(heard.bandsDbA, heard.ambientDbA, options.referenceAmplitude),
        levelDbA: heard.levelDbA,
        distanceKm: heard.sound.distanceKm,
        dopplerRatio: heard.dopplerRatio,
        azimuthDeg: heard.sound.azimuthDeg,
        elevationDeg: heard.sound.altitudeDeg,
        character: noise.character
      })
    }
    return voices.sort((a, b) => b.levelDbA - a.levelDbA).slice(0, options.maxVoices ?? TrafficSound.DEFAULT_MAX_VOICES)
  }

  /**
   * How strong to play each band. The WHOLE sound is played as loud as its level over the ambient noise says: the amplitude of a sound exactly at
   * the ambient's own level is `reference` (see AmbientNoise.referenceAmplitude), and it follows the level from there, twice the amplitude for 6 dB,
   * ten times for 20, compressed beyond the knee. That whole is shared out between the bands in the proportions of the SOUND'S OWN spectrum — the
   * strong ones strong and the weak ones weak, as the air carried them — and not in those of its excess over the ambient's band by band, which
   * flattens it into a hiss, a wind tunnel. The ambient noise only decides what is MASKED: a band is silent until it is MASKING_RANGE_DB under the
   * level at which it is noticed (see AircraftHearing.DETECTION_MARGIN_DB), comes in smoothly, and is whole from that far over it.
   */
  static bandAmplitudes(bandsDbA: readonly number[], ambientDbA: number, reference = TrafficSound.REFERENCE_AMPLITUDE): number[] {
    const ambient = AircraftHearing.ambientBands(ambientDbA)
    const noticed = AircraftHearing.DETECTION_MARGIN_DB
    const total = SoundInAir.sumDb(bandsDbA)
    const over = total - ambientDbA
    const played = over >= TrafficSound.KNEE_DB
      ? TrafficSound.KNEE_DB + (over - TrafficSound.KNEE_DB) / TrafficSound.COMPRESSION_RATIO
      : TrafficSound.KNEE_DB - (TrafficSound.KNEE_DB - over) * TrafficSound.EXPANSION_RATIO
    const whole = reference * 10 ** (played / 20)
    return bandsDbA.map((level, i) => {
      const x = Math.min(1, Math.max(0, (level - ambient[i] - noticed + TrafficSound.MASKING_RANGE_DB) / (2 * TrafficSound.MASKING_RANGE_DB)))
      const heard = x * x * (3 - 2 * x)
      return heard * whole * 10 ** ((level - total) / 20)
    })
  }

  /** The octave bands a voice's amplitudes are given in. */
  static readonly BANDS_HZ = SoundInAir.OCTAVES
}
