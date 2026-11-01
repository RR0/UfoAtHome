import { DataTexture, DataUtils, HalfFloatType, LinearFilter, RGBAFormat } from "three"

/** Something so bright that the image it makes bleaches the retina where it falls: where it is on the picture, and its light at the eye. */
export interface BleachingSource {
  /** Where it is on the picture, -1 to 1 across and up (see SceneRenderer.screenPointOf). */
  readonly ndcX: number
  readonly ndcY: number
  /** The illuminance it gives the eye, lux, through the air and the cloud. */
  readonly lux: number
}

/**
 * The afterimage a light too bright to look at leaves in an eye: the dark spot that follows the gaze for tens of seconds once the light is
 * gone, where its image bleached the cones' pigment. What the witnesses of Chelyabinsk describe, and what no camera records.
 *
 * Kept on the retina, so on the picture (the picture is what the eye's axis takes in): turning the head carries the spot along, over
 * whatever is now there. A grid of the share of pigment left at each place, 1 for none bleached, which the finish multiplies the light by
 * (see FINISH_GLSL): a bleached place catches less of the light that falls on it, and the picture there looks darker.
 *
 * The kinetics are Rushton's, as Pattanaik, Tumblin, Yee and Greenberg put them for cones in "Time-dependent visual adaptation for fast
 * realistic image display" (SIGGRAPH 2000, eq. 7b, after Hunt): the pigment is bleached at a rate of its share left times the luminance over
 * 2.2·10⁸ cd/m²·s, and regenerates as what is bleached over 110 s. A bolide brighter than the Sun bleaches the spot its image falls on in a
 * tenth of a second; the spot then takes minutes to go, two thirds of it gone in two (psychophysically, recovering from flash blindness takes
 * twenty seconds to two minutes, in the military's studies).
 *
 * Before it is dark it is bright: for the first seconds the bleached place goes on signalling light, a glow where the light was, which turns
 * dark as it fades (the positive afterimage). About a second as a rule, still measurable five seconds after very intense brief flashes
 * (Positive afterimage following brief high-intensity flashes, JOSA, 1966); its own grid here, fed by what is being bleached and fading over
 * POSITIVE_FADE_S, added to the light where the dark one multiplies it. And it is coloured as it fades, the "flight of colours" that a white
 * light leaves: the order reported varies with the light and the observer, and the one taken here is a white source's as the Society of
 * Motion Picture Engineers gave it (1921): blue-green, indigo, violet-pink, dark orange (see FLIGHT). The colour a negative one takes is not
 * drawn.
 *
 * Only for the far emitters (a bolide, a re-entry), not the Sun: the direction a recording states is where the observer faced, not a gaze
 * held on the Sun, which nobody stares at; a bolide, which nobody expected, was watched.
 */
export class RetinalBleaching {
  /** The grid, across and up: 0.7° a cell over an eye's 107 by 60. */
  static readonly WIDTH = 160
  static readonly HEIGHT = 90
  /** cd/m²·s: the luminance-time that bleaches the cones' pigment by a factor e (Pattanaik et al. 2000, eq. 7b). */
  static readonly BLEACHING_CD_M2_S = 2.2e8
  /** The cones' pigment regeneration time constant, s (Pattanaik et al. 2000, after Hunt). */
  static readonly REGENERATION_S = 110
  /**
   * How far a point's image spreads on the retina, degrees (standard deviation): the eye's own scatter and its fixational movements, the
   * drift and the microsaccades that keep a watched light moving over a few tenths of a degree (ASSUMED half a degree). A point source's
   * light is spread over it, which sets the luminance that bleaches.
   */
  static readonly SPREAD_DEG = 0.5
  /** Past this much of the recording between two instants, or back in it, the instant is another's (a seek): the retina is a fresh one. */
  static readonly JUMP_MS = 2000
  /**
   * How fast the positive afterimage fades, s (time constant): about a second to see, a few hundredths left at five (ASSUMED from the
   * figures above: a second as a rule, measurable at five after the most intense flashes).
   */
  static readonly POSITIVE_FADE_S = 1.5
  /**
   * How bright the positive afterimage is, in the scene's relative light (1 is what the eye is adapted to), for a place wholly bleached at
   * once: the light's own image as the eye last answered it, a white near the top of its response (twenty times its adaptation), fading
   * from there. It then outshines a daylight sky for a few seconds and is gone into the dark one by five, as reported (ASSUMED: no
   * matching of its brightness against a scene's was found). A third of that, at three, was never brighter than the sky round it.
   */
  static readonly POSITIVE_GAIN = 20
  /**
   * The colours the positive afterimage of a white light takes as it fades, by its age, s, as linear RGB of a luminance of one: white at
   * first, then blue-green, indigo, violet-pink and dark orange (SMPE, 1921). The ages are ASSUMED, spread over its few seconds.
   */
  static readonly FLIGHT: readonly { ageS: number, rgb: readonly [number, number, number] }[] = [
    { ageS: 0, rgb: [1, 1, 1] },
    { ageS: 0.6, rgb: [0.35, 1.05, 0.95] },
    { ageS: 1.4, rgb: [0.55, 0.6, 3.6] },
    { ageS: 2.4, rgb: [1.7, 0.6, 1.5] },
    { ageS: 3.5, rgb: [1.9, 0.75, 0.25] }
  ]

  readonly texture: DataTexture
  /** The share of pigment left at each cell, 1 for none bleached. */
  private readonly left = new Float32Array(RetinalBleaching.WIDTH * RetinalBleaching.HEIGHT).fill(1)
  /** The positive afterimage at each cell, relative light, and how long ago, s, what feeds it was bleached (weighted by what was). */
  private readonly glow = new Float32Array(RetinalBleaching.WIDTH * RetinalBleaching.HEIGHT)
  private readonly age = new Float32Array(RetinalBleaching.WIDTH * RetinalBleaching.HEIGHT)
  /** What the finish reads, as half floats: the pigment left in red, the glow's light in green, blue and alpha. */
  private readonly bytes = RetinalBleaching.freshBytes()
  private lastMs?: number
  private bleached = false

  constructor() {
    this.texture = new DataTexture(this.bytes, RetinalBleaching.WIDTH, RetinalBleaching.HEIGHT, RGBAFormat, HalfFloatType)
    this.texture.minFilter = LinearFilter
    this.texture.magFilter = LinearFilter
    this.texture.needsUpdate = true
  }

  /** Whether any of the retina is bleached enough to show: the finish skips it otherwise. */
  get any(): boolean {
    return this.bleached
  }

  /**
   * Brings the retina to the recording's instant `atMs`, its sources having stood where they are since the last instant.
   *
   * @param fieldDeg The picture's field, degrees, across and up: an eye's picture is equidistant, so a degree is the same share of it
   *   everywhere (see Instruments.UNAIDED_FIELD_DEG).
   * @returns Whether the retina changed.
   */
  advance(atMs: number, sources: readonly BleachingSource[], fieldDeg: { width: number, height: number }): boolean {
    const elapsedMs = this.lastMs === undefined ? Infinity : atMs - this.lastMs
    this.lastMs = atMs
    if (elapsedMs === 0) return false
    const sigmaRad = (RetinalBleaching.SPREAD_DEG * Math.PI) / 180
    // A point's illuminance spread as a Gaussian of that width: its luminance at the middle, cd/m².
    const spots = sources.map(source => ({
      x: source.ndcX * fieldDeg.width / 2, y: source.ndcY * fieldDeg.height / 2, peak: source.lux / (2 * Math.PI * sigmaRad * sigmaRad)
    }))
    // A jump has no past: a fresh retina, from where the sources are now.
    if (elapsedMs < 0 || elapsedMs > RetinalBleaching.JUMP_MS) {
      this.previous = spots
      return this.reset()
    }
    if (!this.bleached && sources.length === 0) {
      this.previous = undefined
      return false
    }
    // Its image swept the retina between the two instants, not jumped: a picture drawn a second apart (a pane in the background) left a
    // row of dots for a trail. Followed in steps of a third of its spread, from where it was to where it is.
    const previous = this.previous?.length === spots.length ? this.previous : undefined
    const moved = previous ? Math.max(0, ...spots.map((spot, i) => Math.hypot(spot.x - previous[i].x, spot.y - previous[i].y))) : 0
    const steps = Math.min(RetinalBleaching.MAX_STEPS, Math.max(1, Math.ceil(moved / (RetinalBleaching.SPREAD_DEG / 3))))
    const dt = elapsedMs / 1000 / steps
    for (let step = 1; step <= steps; step++) {
      const f = step / steps
      this.bleach(previous ? spots.map((spot, i) => ({ ...spot, x: previous[i].x + (spot.x - previous[i].x) * f, y: previous[i].y + (spot.y - previous[i].y) * f })) : spots,
        dt, fieldDeg)
    }
    this.previous = spots
    this.texture.needsUpdate = true
    return true
  }

  /** The most steps a sweep is followed in between two instants: past it, the trail is dotted again, which is a jump in all but name. */
  private static readonly MAX_STEPS = 64
  /** Where the sources stood at the last instant, degrees on the picture. */
  private previous?: { x: number, y: number }[]

  /** `dt` seconds of the sources standing at `spots` (degrees on the picture, peak luminance cd/m²). */
  private bleach(spots: readonly { x: number, y: number, peak: number }[], dt: number, fieldDeg: { width: number, height: number }): void {
    const width = RetinalBleaching.WIDTH
    const height = RetinalBleaching.HEIGHT
    const sigma = RetinalBleaching.SPREAD_DEG
    const regeneration = 1 / RetinalBleaching.REGENERATION_S
    let bleached = false
    for (let row = 0; row < height; row++) {
      const y = ((row + 0.5) / height * 2 - 1) * fieldDeg.height / 2
      for (let column = 0; column < width; column++) {
        const x = ((column + 0.5) / width * 2 - 1) * fieldDeg.width / 2
        let luminance = 0
        for (const spot of spots) {
          const d2 = (x - spot.x) ** 2 + (y - spot.y) ** 2
          if (d2 < 25 * sigma * sigma) luminance += spot.peak * Math.exp(-d2 / (2 * sigma * sigma))
        }
        const index = row * width + column
        const before = this.left[index]
        const glowBefore = this.glow[index]
        if (luminance === 0 && before >= 0.9995 && glowBefore < RetinalBleaching.GLOW_SEEN) continue
        // dB/dt = (1 − B)/τ − B·L/Q, solved exactly over the step: it settles towards its balance at the rate of both together.
        const rate = regeneration + luminance / RetinalBleaching.BLEACHING_CD_M2_S
        const balance = regeneration / rate
        const after = balance + (before - balance) * Math.exp(-rate * dt)
        this.left[index] = after
        // What was bleached in this step feeds the glow, which fades; its age is the mean of what it holds, the new at none.
        const fed = Math.max(0, before - after) * RetinalBleaching.POSITIVE_GAIN
        const kept = glowBefore * Math.exp(-dt / RetinalBleaching.POSITIVE_FADE_S)
        const glow = kept + fed
        this.age[index] = glow > 0 ? (kept * (this.age[index] + dt)) / glow : 0
        this.glow[index] = glow
        const colour = RetinalBleaching.flightAt(this.age[index])
        const at = index * 4
        this.bytes[at] = DataUtils.toHalfFloat(after)
        for (let c = 0; c < 3; c++) this.bytes[at + 1 + c] = DataUtils.toHalfFloat(glow * colour[c])
        if (after < 0.995 || glow >= RetinalBleaching.GLOW_SEEN) bleached = true
      }
    }
    this.bleached = bleached
  }

  /** Under this much relative light the glow is gone. */
  private static readonly GLOW_SEEN = 0.002

  /** The colour of the glow at this age, s (see FLIGHT): linear between the stated ones, the last kept after. */
  static flightAt(ageS: number): readonly [number, number, number] {
    const flight = RetinalBleaching.FLIGHT
    for (let i = 1; i < flight.length; i++) {
      if (ageS > flight[i].ageS) continue
      const f = (ageS - flight[i - 1].ageS) / (flight[i].ageS - flight[i - 1].ageS)
      const a = flight[i - 1].rgb, b = flight[i].rgb
      return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]
    }
    return flight[flight.length - 1].rgb
  }

  /** The texture of a fresh retina: all its pigment, no glow. */
  private static freshBytes(): Uint16Array {
    const bytes = new Uint16Array(RetinalBleaching.WIDTH * RetinalBleaching.HEIGHT * 4)
    const one = DataUtils.toHalfFloat(1)
    for (let i = 0; i < bytes.length; i += 4) bytes[i] = one
    return bytes
  }

  /** The share of pigment left where a point of the picture falls (-1 to 1 across and up): 1 where nothing is bleached. */
  leftAt(ndcX: number, ndcY: number): number {
    const column = Math.min(RetinalBleaching.WIDTH - 1, Math.max(0, Math.floor((ndcX + 1) / 2 * RetinalBleaching.WIDTH)))
    const row = Math.min(RetinalBleaching.HEIGHT - 1, Math.max(0, Math.floor((ndcY + 1) / 2 * RetinalBleaching.HEIGHT)))
    return this.left[row * RetinalBleaching.WIDTH + column]
  }

  /** A fresh retina, nothing bleached: a jump in the recording has no past to remember. */
  private reset(): boolean {
    if (!this.bleached) return false
    this.left.fill(1)
    this.glow.fill(0)
    this.age.fill(0)
    this.bytes.set(RetinalBleaching.freshBytes())
    this.bleached = false
    this.texture.needsUpdate = true
    return true
  }

  dispose(): void {
    this.texture.dispose()
  }
}
