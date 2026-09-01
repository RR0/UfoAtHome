import { VisibleSpectrum } from "./Spectrum.js"
import { WaterDrop, WaterRefraction, type DropRay } from "./WaterDrop.js"

/**
 * The whole water display, built by shooting light at drops and seeing where it lands.
 *
 * What comes back is one curve: how bright the sky is at every angle from the Sun. That is all a
 * shower needs, and the reason is worth stating, because it is what separates this from the ice
 * family. A raindrop is a sphere. It has no orientation, so there is nothing about the weather that
 * can change what it does with light — no equivalent of the crystal alignment that decides which
 * halo forms stand, nothing left to state or assume. Every shower that has ever fallen has scattered
 * sunlight into the same angles, and a rainbow is therefore the one thing in this project's sky that
 * is the same in every reconstruction: only where it stands moves, with the Sun.
 *
 * NOTHING IN THIS FILE NAMES A BOW. It sweeps the impact parameter across a drop (WaterDrop) and
 * adds up where the light went. The bright bow at forty-two degrees, its reversed and fainter twin
 * at fifty-one, the dark band between them and the glow filling the sky inside the first one all
 * appear in the answer, each at whatever brightness the physics gives it relative to the others. So
 * do the two bows that stand round the Sun instead, and those are then deliberately left out of what
 * is drawn — see FULL_UNTIL_DEG for the one thing here that is a decision rather than a consequence.
 *
 * SWEPT RATHER THAN SAMPLED AT RANDOM, unlike HaloSky, and that is not a stylistic difference. The
 * halo has a whole population of orientations to integrate over, so it is traced by Monte Carlo and
 * comes out grainy until millions of rays have gone in. This has ONE variable, so it is integrated
 * by marching along it, every step depositing its light across the whole angular interval it covers.
 * That handles the piling-up correctly where an interval collapses to nothing — which IS the bow —
 * and it means the answer arrives complete in a few tens of milliseconds with no noise in it at all,
 * with no batching, no background loop and nothing to wait for.
 */
export interface RainbowProfile {
  /** Bins from straight toward the source to straight away from it. */
  readonly bins: number
  /** Radiance, RGB per bin: how much of the light falling on a drop leaves per unit of sky at that
   * angle. Dimensionless, and independent of how big the drops were — see WaterDrop. */
  readonly data: Float32Array
  /** How many degrees of scattering angle one bin spans. */
  readonly binDeg: number
}

export class RainbowSky {
  /** A tenth of a degree, which is finer than anything in the answer: the source's own half-degree
   * disc is the sharpest edge a bow can have. */
  static readonly BINS = 1800

  /** The source's own angular radius. The Sun's and the Moon's are within a few per cent of each
   * other, which is why a moonbow is the same size as a rainbow and why they are equally soft. */
  static readonly SOURCE_RADIUS_DEG = 0.265

  /**
   * How far round from the source this display is drawn at all, and where it fades out.
   *
   * A drop sends light BACKWARD, into the bows, and it sends far more of it FORWARD, into the glare
   * round the Sun that makes a shower painful to look toward. Only the first is drawn here, and the
   * boundary is a statement rather than a taste. What goes forward is not a display: it is the
   * source's own light spread by the water in front of it, which this scene already draws as rain,
   * as cloud and as the Sun's own veiling glare — adding a second helping of it whitens half the sky
   * and takes the bows down with it (measured in a live scene: with the whole curve drawn, looking
   * toward the Sun, more than half the sky's pixels were driven past what the screen can show). It
   * is also the half where geometric optics is least trustworthy, since what a drop sends nearly
   * straight on is mostly DIFFRACTION, which is not modelled here at all — the corona that really
   * does ring a low Sun seen through a water cloud lives in there, and this draws none of it rather
   * than drawing something else in its place.
   *
   * The two bows nobody sees are the honest cost. The third and the fourth stand 40 and 45 degrees
   * from the Sun rather than opposite it, and they are cut. That is very nearly why they go unseen
   * in life as well — they are lost in exactly the glare this refuses to draw — and putting them on
   * a screen that has none of that glare would show a reader something no witness could report.
   */
  private static readonly FULL_UNTIL_DEG = 60
  private static readonly FADED_BY_DEG = 90

  /** Steps of the sweep across a drop, by equal shares of the light falling on it rather than equal
   * distances: a ring near the rim catches far more sunlight than one near the middle, and it is the
   * rim that makes the bows. */
  private static readonly IMPACT_STEPS = 4096

  private readonly drop = new WaterDrop()
  private readonly previous: DropRay[] = RainbowSky.emergences()
  private readonly current: DropRay[] = RainbowSky.emergences()
  private readonly tally = new Float32Array(RainbowSky.BINS * 3)
  private readonly radiance = new Float32Array(RainbowSky.BINS * 3)
  private readonly scratch = new Float32Array(RainbowSky.BINS * 3)

  private static emergences(): DropRay[] {
    return Array.from({ length: WaterDrop.MAX_CHORDS + 1 }, () => ({ chords: 0, scatteringAngle: 0, weight: 0 }))
  }

  /**
   * The display, in full.
   *
   * One call: there is no source height in it, no weather in it and nothing to refine, so a scene
   * asks for this once and keeps it for as long as it lives.
   */
  compute(): RainbowProfile {
    this.tally.fill(0)
    for (const sample of VisibleSpectrum.SAMPLES) {
      this.sweep(sample)
    }
    this.toRadiance()
    this.blurBySourceDisc()
    return { bins: RainbowSky.BINS, data: this.radiance, binDeg: 180 / RainbowSky.BINS }
  }

  /**
   * Marches one colour across a drop, from the ray through its centre to the one that grazes its
   * edge, depositing what leaves.
   *
   * Each step covers a range of impact parameters, and the light entering there leaves spread over
   * the whole range of angles between the step's two ends. Depositing it that way — across the
   * interval rather than at a point — is what makes the bows come out right without being asked for:
   * where the emergent angle turns round, that interval collapses to almost nothing and the same
   * light lands in a single bin. A caustic is not a special case here; it is a step whose two ends
   * arrived at the same place.
   */
  private sweep(sample: { wavelengthNm: number; r: number; g: number; b: number }): void {
    this.drop.refractiveIndex = WaterRefraction.indexAt(sample.wavelengthNm)
    const steps = RainbowSky.IMPACT_STEPS
    // Equal shares of the incident beam: the light striking between two radii goes as the
    // difference of their squares, so stepping the SQUARE evenly gives every step the same flux.
    let previousCount = this.drop.trace(0, this.previous)
    const share = 1 / steps
    for (let step = 1; step <= steps; step++) {
      const count = this.drop.trace(Math.sqrt(step / steps), this.current)
      for (let index = 0; index < Math.min(count, previousCount); index++) {
        const from = this.previous[index]
        const to = this.current[index]
        // Only ever compared like with like: the two ends of a step have to have gone the same way
        // through the drop, or the interval between them would be an angle no ray ever took.
        if (from.chords !== to.chords) continue
        // Their weights differ only by how the surface treated each; the mean is what that slice of
        // the beam carried.
        this.deposit(from.scatteringAngle, to.scatteringAngle, ((from.weight + to.weight) / 2) * share, sample)
      }
      previousCount = count
      this.copyInto(this.current, this.previous)
    }
  }

  private copyInto(from: DropRay[], to: DropRay[]): void {
    for (let index = 0; index < from.length; index++) {
      to[index].chords = from[index].chords
      to[index].scatteringAngle = from[index].scatteringAngle
      to[index].weight = from[index].weight
    }
  }

  /** Spreads one step's light evenly across the angles it emerged into, which is what "evenly" has
   * to mean here: the light is uniform in the impact parameter, and the interval is exactly the set
   * of angles that impact parameter reached. */
  private deposit(
    fromAngle: number,
    toAngle: number,
    flux: number,
    sample: { r: number; g: number; b: number }
  ): void {
    if (flux <= 0) return
    const bins = RainbowSky.BINS
    const perBin = Math.PI / bins
    const low = Math.min(fromAngle, toAngle)
    const high = Math.max(fromAngle, toAngle)
    const span = high - low
    const firstBin = Math.min(bins - 1, Math.max(0, Math.floor(low / perBin)))
    const lastBin = Math.min(bins - 1, Math.max(0, Math.floor(high / perBin)))
    if (span <= 0 || firstBin === lastBin) {
      this.add(firstBin, flux, sample)
      return
    }
    for (let bin = firstBin; bin <= lastBin; bin++) {
      const overlap = Math.min(high, (bin + 1) * perBin) - Math.max(low, bin * perBin)
      if (overlap > 0) this.add(bin, (flux * overlap) / span, sample)
    }
  }

  private add(bin: number, flux: number, sample: { r: number; g: number; b: number }): void {
    const at = bin * 3
    // Every colour carries the same share of the beam, so the sum of them all is white light.
    const weight = flux * VisibleSpectrum.SAMPLES.length
    this.tally[at] += weight * sample.r
    this.tally[at + 1] += weight * sample.g
    this.tally[at + 2] += weight * sample.b
  }

  /**
   * Turns the tally of scattered light into a radiance: how much per unit of sky.
   *
   * Without it every bin near the antisolar point would be called bright merely for being small —
   * the sky at 1 degree from a point is a hundredth of the sky at 90 degrees from it — and the bows,
   * which live at large angles, would come out weaker than the glow around the point they are
   * centred on.
   */
  private toRadiance(): void {
    const bins = RainbowSky.BINS
    const perBin = Math.PI / bins
    for (let bin = 0; bin < bins; bin++) {
      const solidAngle = 2 * Math.PI * (Math.cos(bin * perBin) - Math.cos((bin + 1) * perBin))
      const scale = solidAngle > 0 ? this.backwardShare((bin + 0.5) * (180 / bins)) / solidAngle : 0
      const at = bin * 3
      this.radiance[at] = this.tally[at] * scale
      this.radiance[at + 1] = this.tally[at + 1] * scale
      this.radiance[at + 2] = this.tally[at + 2] * scale
    }
  }

  /**
   * How much of what leaves a drop at that scattering angle belongs to this display — see
   * FULL_UNTIL_DEG.
   *
   * Faded rather than cut, across thirty degrees of sky where there is nothing to see either way, so
   * that no edge stands anywhere a reader could take for a form.
   */
  private backwardShare(scatteringDeg: number): number {
    const fromAntisolar = 180 - scatteringDeg
    if (fromAntisolar <= RainbowSky.FULL_UNTIL_DEG) return 1
    if (fromAntisolar >= RainbowSky.FADED_BY_DEG) return 0
    const across =
      (fromAntisolar - RainbowSky.FULL_UNTIL_DEG) / (RainbowSky.FADED_BY_DEG - RainbowSky.FULL_UNTIL_DEG)
    return Math.cos((across * Math.PI) / 2) ** 2
  }

  /**
   * Softens the answer by the width of the source itself.
   *
   * Not a cosmetic blur: a rainbow is an image of the SUN, repeated all round a circle, so no part
   * of it can be sharper than the half-degree disc the Sun subtends. Geometric optics makes the
   * bright edge of the primary infinitely sharp; the sky does not, and this is the larger of the two
   * reasons why (the other is the wave, which is not modelled — see WaterDrop). The kernel is the
   * disc's own chord, which is what a straight edge is smeared by when it is dragged across a round
   * source.
   */
  private blurBySourceDisc(): void {
    const bins = RainbowSky.BINS
    const radiusBins = (RainbowSky.SOURCE_RADIUS_DEG * bins) / 180
    const reach = Math.max(1, Math.ceil(radiusBins))
    const kernel: number[] = []
    let total = 0
    for (let offset = -reach; offset <= reach; offset++) {
      const across = Math.max(0, radiusBins * radiusBins - offset * offset)
      const weight = Math.sqrt(across)
      kernel.push(weight)
      total += weight
    }
    if (total <= 0) return
    this.scratch.set(this.radiance)
    for (let bin = 0; bin < bins; bin++) {
      let r = 0
      let g = 0
      let b = 0
      for (let offset = -reach; offset <= reach; offset++) {
        const from = Math.min(bins - 1, Math.max(0, bin + offset)) * 3
        const weight = kernel[offset + reach]
        r += this.scratch[from] * weight
        g += this.scratch[from + 1] * weight
        b += this.scratch[from + 2] * weight
      }
      const at = bin * 3
      this.radiance[at] = r / total
      this.radiance[at + 1] = g / total
      this.radiance[at + 2] = b / total
    }
  }
}
