import { DataTexture, LinearFilter, RedFormat, UnsignedByteType } from "three"

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
 * twenty seconds to two minutes, in the military's studies). The positive afterimage of the first seconds, bright and coloured, is not drawn, nor the colour a
 * negative one takes.
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

  readonly texture: DataTexture
  /** The share of pigment left at each cell, 1 for none bleached. */
  private readonly left = new Float32Array(RetinalBleaching.WIDTH * RetinalBleaching.HEIGHT).fill(1)
  private readonly bytes = new Uint8Array(RetinalBleaching.WIDTH * RetinalBleaching.HEIGHT).fill(255)
  private lastMs?: number
  private bleached = false

  constructor() {
    this.texture = new DataTexture(this.bytes, RetinalBleaching.WIDTH, RetinalBleaching.HEIGHT, RedFormat, UnsignedByteType)
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
        if (luminance === 0 && before >= 0.9995) continue
        // dB/dt = (1 − B)/τ − B·L/Q, solved exactly over the step: it settles towards its balance at the rate of both together.
        const rate = regeneration + luminance / RetinalBleaching.BLEACHING_CD_M2_S
        const balance = regeneration / rate
        const after = balance + (before - balance) * Math.exp(-rate * dt)
        this.left[index] = after
        this.bytes[index] = Math.round(after * 255)
        if (after < 0.995) bleached = true
      }
    }
    this.bleached = bleached
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
    this.bytes.fill(255)
    this.bleached = false
    this.texture.needsUpdate = true
    return true
  }

  dispose(): void {
    this.texture.dispose()
  }
}
