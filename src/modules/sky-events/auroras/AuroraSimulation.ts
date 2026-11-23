import type { Mesh, Vector3 } from "three"
import { computeBodyPosition } from "../../../engine/astronomy/CelestialPositions.js"
import { horizontalToCartesian } from "../../../render3d/skyColors.js"
import type { SkyEventFrame, SkyEventHit, SkyEventPickContext, SkyEventSimulation } from "../SkyEventKind.js"
import { AuroraRadiance, AuroralLines, AuroraSighting } from "./Aurora.js"
import type { AuroraJson, AuroraView } from "./Aurora.js"
import { AuroraSystem } from "./AuroraSystem.js"

/**
 * The aurorae of a recording, drawn over the observer's sky as it was at the real instant (see AuroraSystem): nothing without a date, since
 * where the oval stands is a matter of where the Sun is. The brightest light the ground, as the Moon does: a class IV aurora is as bright.
 */
export class AuroraSimulation implements SkyEventSimulation<AuroraJson> {
  readonly inSky = true
  /** The Sun's height above which nothing of an aurora is drawn, degrees. */
  static readonly DAYLIGHT_DEG = -4
  private readonly system = new AuroraSystem()
  /** What the ground was last lit with, and for which state of the aurora: the sky is walked again only when that changes. */
  private lit?: { key: string, sources: { position: { altitudeDeg: number, azimuthDeg: number }, magnitude: number }[] }

  get object(): Mesh {
    return this.system.object
  }

  get drawnCount(): number {
    return this.system.count
  }

  /** What was last drawn, and what a cd/m² was in the scene's light then: what the pointer is looked for in. */
  private drawn?: { view: AuroraView, relativeScale: number }

  update(auroras: readonly AuroraJson[], t: number, frame: SkyEventFrame): void {
    const view = frame.date ? this.viewOf(auroras, t, frame) : undefined
    this.system.set(view, frame.relativeScale, position => frame.transmittanceFromSpace(position))
    this.drawn = view && { view, relativeScale: frame.relativeScale }
    this.lightGround(view, frame)
  }

  /**
   * The aurora, when the pointer is on a part of it that stands out from the sky behind by the eye's threshold for a glow with no edge (a
   * tenth, as a launch's plume): the walk of AuroraRadiance, without the rays, which only move the light about.
   */
  pick(_origin: Vector3, direction: Vector3, context: SkyEventPickContext): SkyEventHit | undefined {
    if (!this.drawn) return undefined
    const { view, relativeScale } = this.drawn
    const [green, red, blue] = AuroraRadiance.along(view, [direction.x, direction.y, direction.z])
    const luminance = (green * AuroralLines.GREEN.cdM2PerKR + red * AuroralLines.RED.cdM2PerKR + blue * AuroralLines.BLUE.cdM2PerKR) * relativeScale
    if (luminance < 0.1 * context.skyLightTowards(direction)) return undefined
    return { id: view.id, detail: { kp: view.kp, green, red } }
  }

  /** The first of the recording's aurorae that is on at `t`: two at once would be one oval stated twice. */
  private viewOf(auroras: readonly AuroraJson[], t: number, frame: SkyEventFrame): AuroraView | undefined {
    const date = new Date(frame.date!.getTime())
    const sunPosition = computeBodyPosition("Sun", date, { lat: frame.observer.lat, lng: frame.observer.lng, elevationM: frame.observer.heightM })
    // In daylight and early twilight the sky outshines the brightest aurora: not drawn at all, for nothing (a walk of the whole sky per pixel).
    if (sunPosition.altitudeDeg > AuroraSimulation.DAYLIGHT_DEG) return undefined
    const sun = horizontalToCartesian(sunPosition.altitudeDeg, sunPosition.azimuthDeg, 1)
    for (const aurora of auroras) {
      const view = AuroraSighting.viewAt(aurora, t, frame.observer, date, [sun.x, sun.y, sun.z])
      if (view) return view
    }
    return undefined
  }

  /**
   * Lights the ground with what the aurora sends down, as one far source where it is brightest, of the magnitude its whole sky gives:
   * walked over a coarse sky (see AuroraRadiance), again only when the aurora has changed by a tenth of a Kp step or ten seconds have gone.
   */
  private lightGround(view: AuroraView | undefined, frame: SkyEventFrame): void {
    if (!view) {
      if (this.lit) frame.lightFrom([])
      this.lit = undefined
      return
    }
    const key = `${view.kp.toFixed(1)}:${view.fade.toFixed(2)}:${Math.floor(view.timeS / 10)}:${frame.observer.lat.toFixed(2)}:${frame.observer.lng.toFixed(2)}`
    if (this.lit?.key === key) return
    let lux = 0, brightest = 0
    let at = { altitudeDeg: 90, azimuthDeg: 0 }
    // Coarse, for a light on the ground (a few ms, once every ten seconds of the recording): a walk ten times finer moves its magnitude
    // by some 0.15.
    const altitudes = [3, 10, 22, 40, 62, 82]
    const azimuths = 12
    for (let i = 0; i < altitudes.length; i++) {
      const low = i === 0 ? 0 : (altitudes[i - 1] + altitudes[i]) / 2
      const high = i === altitudes.length - 1 ? 90 : (altitudes[i] + altitudes[i + 1]) / 2
      // The solid angle of the ring, and the cosine its light falls on the ground with.
      const ring = 2 * Math.PI * (Math.sin((high * Math.PI) / 180) - Math.sin((low * Math.PI) / 180)) / azimuths
      const cos = Math.sin((altitudes[i] * Math.PI) / 180)
      for (let k = 0; k < azimuths; k++) {
        const position = { altitudeDeg: altitudes[i], azimuthDeg: (360 * k) / azimuths }
        const d = horizontalToCartesian(position.altitudeDeg, position.azimuthDeg, 1)
        const [green, red, blue] = AuroraRadiance.along(view, [d.x, d.y, d.z], 48)
        const through = frame.transmittanceFromSpace(position)[1] * frame.cloudTransmission(position)
        const luminance = (green * AuroralLines.GREEN.cdM2PerKR + red * AuroralLines.RED.cdM2PerKR + blue * AuroralLines.BLUE.cdM2PerKR) * through
        lux += luminance * ring * cos
        if (luminance > brightest) {
          brightest = luminance
          at = position
        }
      }
    }
    // Under a ten-thousandth of a lux it is a tenth of a starlit sky's light on the ground: not worth a light of its own.
    const sources = lux < 1e-4 ? [] : [{ position: at, magnitude: -14.18 - 2.5 * Math.log10(lux) }]
    this.lit = { key, sources }
    frame.lightFrom(sources)
  }

  dispose(): void {
    this.system.dispose()
  }
}
