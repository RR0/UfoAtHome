import type { BodyState, LocalPoint } from "./BodyPlacement.js"
import { DECOR_LAMP_CANDELA, isLightOnAt, lightStateAt } from "../model/Decor.js"
import type { Sighting } from "../model/Sighting.js"
import { computeBodyPosition, sightingTimeToDate } from "../astronomy/CelestialPositions.js"
import type { LightSeeing } from "./BodyConfrontation.js"

const DEG = Math.PI / 180

/**
 * The light a body sends an eye, as what the eye makes of it: the illuminance its lamps (see BodyJson.lamps) give at the eye, and the size of
 * the light that illuminance is seen as.
 *
 * At night what a witness sees of a lit aircraft a few kilometres off is not its airframe, which they cannot make out, but its lights: and a
 * bright light is seen larger than it is, by the light the eye's own media scatter round it (see Veil). An account that says "like the full
 * Moon" of an airliner's landing lights head-on is then measured against the light, not against the airframe.
 */
export class BodyGlare {
  /**
   * The luminous intensity the body's lamps send towards `eye` at `t`, candela: each as bright as it is switched then (see DecorLight.keyframes)
   * and lit by its pattern, and, for a lamp that throws a beam (see DecorLight.beamDeg), the share of it the eye is in. A lamp's beam points
   * where the body's nose does, level.
   */
  static candelaToward(state: BodyState, eye: LocalPoint, t: number): number {
    const lamps = state.lamps
    if (!lamps || lamps.length === 0) return 0
    const heading = state.attitude.headingDeg * DEG
    const front = { east: Math.sin(heading), north: Math.cos(heading) }
    const right = { east: Math.cos(heading), north: -Math.sin(heading) }
    let candela = 0
    for (const lamp of lamps) {
      const { intensity } = lightStateAt(lamp, t)
      if (!(intensity > 0) || !isLightOnAt(lamp, t)) continue
      const at = {
        eastM: state.eastM + right.east * lamp.offsetM.x + front.east * lamp.offsetM.z,
        northM: state.northM + right.north * lamp.offsetM.x + front.north * lamp.offsetM.z,
        upM: state.upM + lamp.offsetM.y
      }
      const share = lamp.beamDeg === undefined ? 1 : BodyGlare.beamShare(lamp.beamDeg, front, at, eye)
      candela += DECOR_LAMP_CANDELA * intensity * share
    }
    return candela
  }

  /** The magnitude of a point giving `lux` at the eye, as a star's is (the zero point of SceneRenderer.arrivingIlluminance). */
  static magnitudeOf(lux: number): number {
    return -14.18 - 2.5 * Math.log10(lux)
  }

  /**
   * How large a point of light looks to the naked eye at night, by how bright it is: Tycho Brahe's sizes of the stars, which Graney reads as the
   * visible part of the eye's blur growing with brightness (C. M. Graney, "The accuracy of Tycho Brahe's instruments, and his star sizes",
   * The Physics Teacher 47:362, 2009, arXiv:0808.3411; arXiv:1112.1988): two and a half minutes of arc at the first magnitude, eighteen
   * seconds at the sixth. Through those two, the size grows by a factor 1.53 a magnitude.
   *
   * CONTESTED, and said so wherever it is used (see ConfrontationReading.lightSized): no study measures how large a bright light at night is
   * seen (a search of the literature found none), the series is Graney's account of Tycho's, and what is brighter than the first magnitude is
   * carried on past it: an airliner's landing lights head-on at twenty kilometres are some six magnitudes brighter, where nothing says the
   * growth goes on rather than levels off. A detection threshold laid on the eye's scattered light (CIE 146:2002, Blackwell 1946) would give
   * Venus a degree and a half, which nobody sees: that is where its glow can be made out, not the light a witness sizes.
   */
  static readonly TYCHO: LightSeeing = {
    diameterDeg(lux: number): number {
      if (!(lux > 0)) return 0
      const magnitude = BodyGlare.magnitudeOf(lux)
      return BodyGlare.TYCHO_FIRST_ARCSEC * Math.pow(10, BodyGlare.TYCHO_PER_MAGNITUDE * (1 - magnitude)) / 3600
    }
  }
  private static readonly TYCHO_FIRST_ARCSEC = 150
  private static readonly TYCHO_PER_MAGNITUDE = Math.log10(150 / 18) / 5

  /**
   * How lights are seen in `sighting`: by Tycho's sizes at night (the Sun six degrees under the horizon or more at its start), which is where
   * they were taken; undefined by day, or when the recording says neither when nor where, and its lights are then measured by their outline.
   */
  static seeingOf(sighting: Pick<Sighting, "event">): LightSeeing | undefined {
    const place = sighting.event.place?.[0]
    const time = sighting.event.time
    // Asked at every frame of a scene: worked out again only when what it rests on has changed, which the editor does in place.
    const key = JSON.stringify([time, place?.lat, place?.lng, sighting.event.utcOffsetHours])
    const known = BodyGlare.seeings.get(sighting.event)
    if (known?.key === key) return known.seeing
    const seeing = BodyGlare.seeingFrom(sighting, place, time)
    BodyGlare.seeings.set(sighting.event, { key, seeing })
    return seeing
  }
  private static readonly seeings = new WeakMap<object, { key: string, seeing: LightSeeing | undefined }>()

  private static seeingFrom(sighting: Pick<Sighting, "event">, place: { lat?: number, lng?: number } | undefined, time: Sighting["event"]["time"]): LightSeeing | undefined {
    if (!place || typeof place.lat !== "number" || typeof place.lng !== "number" || time?.hour === undefined) return undefined
    const date = sightingTimeToDate(time, place.lng, sighting.event.utcOffsetHours)
    if (!date) return undefined
    const sun = computeBodyPosition("Sun", date, { lat: place.lat, lng: place.lng, elevationM: 0 })
    return sun.altitudeDeg <= BodyGlare.NIGHT_SUN_DEG ? BodyGlare.TYCHO : undefined
  }
  private static readonly NIGHT_SUN_DEG = -6

  /** The illuminance at the eye of `candela` from `distanceM` away, lux: the inverse square, before the air takes its share. */
  static luxAt(candela: number, distanceM: number): number {
    return distanceM > 0 ? candela / (distanceM * distanceM) : 0
  }

  /**
   * The share of a lamp's light on its axis that reaches an eye off it: a cosine law raised to the power that halves it at the beam's angle, and
   * nothing behind it (as DecorSystem.beamShare draws it).
   */
  private static beamShare(beamDeg: number, front: { east: number, north: number }, lamp: LocalPoint, eye: LocalPoint): number {
    const dx = eye.eastM - lamp.eastM
    const dy = eye.northM - lamp.northM
    const dz = eye.upM - lamp.upM
    const length = Math.hypot(dx, dy, dz)
    if (length === 0) return 1
    const cosine = (dx * front.east + dy * front.north) / length
    if (cosine <= 0) return 0
    const exponent = Math.log(0.5) / Math.log(Math.cos(beamDeg * DEG))
    return Math.pow(cosine, exponent)
  }
}
