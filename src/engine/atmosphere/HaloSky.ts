import { IceCrystal, IceRefraction, type EmergentRay } from "./IceCrystal.js"
import { VisibleSpectrum } from "./Spectrum.js"

/**
 * The whole ice display, built by shooting light at crystals and seeing where it lands.
 *
 * What comes back is a map of the sky in the source's own frame: how bright the sky is at every
 * altitude and every angle round from the Sun's bearing. That frame is the reason one map serves a
 * whole scene — the display depends on how high the source stands and on nothing else, so the
 * witness turning round, or the Sun crossing the sky, only turns the map rather than needing a new
 * one.
 *
 * NOTHING IN THIS FILE NAMES A HALO. It draws crystal orientations, traces rays (IceCrystal) and
 * adds up where the light went. The twenty-two degree ring, the forty-six degree ring, the sundogs,
 * the arc riding tangent on top of the ring, the coloured arc near the zenith, the white circle
 * running right round the sky at the source's own height, the shaft above a setting Sun and the
 * mock sun beneath it all appear in the answer without being asked for, each at whatever brightness
 * the physics gives it relative to the others. That relative brightness is the part worth having:
 * it is why the big ring comes out faint and the sundogs come out fierce, and it is exactly what a
 * display assembled from six hand-placed formulae cannot get right.
 *
 * WHAT IS STILL NOT KNOWN is what the crystals were doing — see `alignment`. No record of any
 * sighting holds it, and this project does not pretend otherwise.
 */
export interface HaloSkyMap {
  /** Bins across half a turn of azimuth measured from the source's bearing; the display is
   * mirror-symmetric about the source's own vertical plane, so half a turn is all of it. */
  readonly width: number
  /** Bins from pole to pole in altitude. */
  readonly height: number
  /** Radiance, RGB per bin. */
  readonly data: Float32Array
  readonly sourceAltitudeDeg: number
  readonly alignment: number
  /** How many rays went into it — a partly-traced map is a usable map, only noisier. */
  readonly rays: number
}

/**
 * One kind of crystal, present in some proportion, falling in some way.
 *
 * The four that matter, and they are not a taxonomy invented here: they are the four orientation
 * behaviours ice actually shows, and each is responsible for a family of forms. Crystals that
 * tumble give the rings. Flat plates lying level give everything that sits at the source's own
 * height. Columns rolling with their long axis level give the arcs riding on the rings. Columns
 * that also keep a pair of faces level — Parry's orientation, named for the 1820 arctic voyage
 * whose record first showed the arcs — give the rarest of them.
 */
interface CrystalPopulation {
  readonly orientation: "tumbling" | "plate" | "column" | "parry"
  /** Across the main axis and along it, microns. Real cirrus dimensions: what decides how much
   * light each habit gathers, and so which forms win. */
  readonly widthMicrons: number
  readonly lengthMicrons: number
  /** What fraction of the crystals fall this way. */
  readonly share: number
}

export class HaloSky {
  /** Half a turn of azimuth and a whole turn of altitude, at just over a third of a degree — fine
   * enough to keep the red inner edge of a ring distinct from its blue outer one, which are two
   * thirds of a degree apart. */
  static readonly AZIMUTH_BINS = 512
  static readonly ALTITUDE_BINS = 512

  /**
   * The mixture of crystals assumed present.
   *
   * THESE ARE THE ONLY CHOSEN NUMBERS IN THE WHOLE ICE FAMILY, and they are chosen because no
   * observation can supply them: what a cirrus deck contained is not in any weather record,
   * historical or current, and could only be known by having been up there with a collecting slide.
   * They are set to the ordinary cirrus mixture — mostly small tumbling crystals, a good share of
   * wide flat plates, fewer columns, and Parry's orientation as the rarity it is — which is what
   * makes the ring the form everybody has seen, the sundogs the form many have, and Parry's arcs
   * the form almost nobody has. Everything else in this family is derived; this is the one place a
   * reader is being told "assume the sky was ordinary".
   */
  private static readonly POPULATIONS: readonly CrystalPopulation[] = [
    { orientation: "tumbling", widthMicrons: 50, lengthMicrons: 50, share: 0.52 },
    { orientation: "plate", widthMicrons: 100, lengthMicrons: 15, share: 0.27 },
    { orientation: "column", widthMicrons: 40, lengthMicrons: 120, share: 0.19 },
    { orientation: "parry", widthMicrons: 40, lengthMicrons: 120, share: 0.02 }
  ]

  /**
   * How far a crystal's fall wanders from level when nothing holds it steady, and when everything
   * does.
   *
   * A plate large enough to fall face-down through still air holds to within a fraction of a
   * degree; stir the air and the same plate tumbles through every angle there is. The two ends are
   * therefore more than two orders of magnitude apart, and the alignment control runs between them
   * GEOMETRICALLY rather than in a straight line — spread a hundredfold apart is a ratio, not a
   * difference, and interpolating it linearly would spend nine tenths of the control's travel in
   * skies too stirred to show anything but a ring.
   */
  private static readonly WORST_TILT_DEG = 180
  private static readonly BEST_TILT_DEG = 0.5

  /** The source's own angular radius — the Sun's and the Moon's are within a few per cent of each
   * other, which is why eclipses happen at all. No feature of a display is sharper than this,
   * because every point of one is an image of the source. */
  private static readonly SOURCE_RADIUS_DEG = 0.265

  /** Light leaving within this of the direction it came in never interacted: it is the beam going
   * straight through a pair of parallel faces, and it belongs to the source, not to the display.
   * Counting it would put a false blaze round every source seen through cirrus, on top of the
   * forward glow the veil itself is already drawn with. */
  private static readonly UNDEVIATED_DEG = 0.6

  private readonly crystal = new IceCrystal()
  private readonly emergent: EmergentRay[] = Array.from({ length: IceCrystal.MAX_BOUNCES + 2 }, () => ({
    x: 0,
    y: 0,
    z: 0,
    weight: 0
  }))
  private readonly tally = new Float32Array(HaloSky.AZIMUTH_BINS * HaloSky.ALTITUDE_BINS * 3)
  private readonly radiance = new Float32Array(HaloSky.AZIMUTH_BINS * HaloSky.ALTITUDE_BINS * 3)
  /** Held rather than allocated per harvest: three megabytes handed to the collector every time a
   * display finished would be a stutter of its own. */
  private readonly scratch = new Float32Array(HaloSky.AZIMUTH_BINS * HaloSky.ALTITUDE_BINS * 3)
  private seed = 1
  private spare = 0
  private hasSpare = false
  private altitude = 0
  private tilt = 0
  private alignment = 0
  private traced = 0

  /**
   * Starts a fresh display for a source at that altitude, with the crystals falling that steadily.
   *
   * `alignment` runs from 0, where every crystal tumbles as it falls and only the rings survive, to
   * 1, where plates and columns fall as steadily as ice ever does and the full display stands. It
   * is the one input here no record supplies: how well crystals align depends on their size and on
   * the turbulence nine kilometres up, and neither is in any archive this project can reach. It is
   * therefore a stated condition of the reconstruction rather than a deduction — which is also,
   * honestly, why the same sky shows a bare ring one hour and a display of half a dozen forms the
   * next, and why a photograph almost never shows all of them at once.
   */
  begin(sourceAltitudeDeg: number, alignment: number, seed = 0x9e3779b9): void {
    this.seed = seed >>> 0 || 1
    this.hasSpare = false
    this.tally.fill(0)
    this.traced = 0
    this.altitude = (sourceAltitudeDeg * Math.PI) / 180
    this.alignment = Math.min(1, Math.max(0, alignment))
    const tiltDeg = HaloSky.WORST_TILT_DEG * (HaloSky.BEST_TILT_DEG / HaloSky.WORST_TILT_DEG) ** this.alignment
    this.tilt = (tiltDeg * Math.PI) / 180
  }

  /** Traces another batch of rays into the display being built. Split into batches so a scene can
   * pay for a display over several frames instead of stopping dead for a second. */
  trace(rayCount: number): void {
    const width = HaloSky.AZIMUTH_BINS
    const height = HaloSky.ALTITUDE_BINS
    const data = this.tally
    const sourceRadius = (HaloSky.SOURCE_RADIUS_DEG * Math.PI) / 180
    const undeviated = Math.cos((HaloSky.UNDEVIATED_DEG * Math.PI) / 180)
    const altitude = this.altitude
    for (let index = 0; index < rayCount; index++) {
      const population = this.pickPopulation()
      this.orient(population, this.tilt)
      // The ray comes FROM the source, so it travels away from it and downward: the source stands
      // at +x, and the sky an observer sees is the reverse of wherever the light ends up going.
      const jitterAngle = this.random() * 2 * Math.PI
      const jitterRadius = sourceRadius * Math.sqrt(this.random())
      const rayAltitude = altitude + jitterRadius * Math.sin(jitterAngle)
      const rayAzimuth = (jitterRadius * Math.cos(jitterAngle)) / Math.max(0.05, Math.cos(altitude))
      const dirX = -Math.cos(rayAltitude) * Math.cos(rayAzimuth)
      const dirY = -Math.cos(rayAltitude) * Math.sin(rayAzimuth)
      const dirZ = -Math.sin(rayAltitude)
      const radius = this.crystal.aimRadius
      const offsetA = (this.random() * 2 - 1) * radius
      const offsetB = (this.random() * 2 - 1) * radius
      // Every ray of this population carries the light falling on the square it was aimed through,
      // so a wide plate gathers more than a narrow column exactly as it does in the sky.
      const flux = 4 * radius * radius
      const sample = VisibleSpectrum.SAMPLES[(this.random() * VisibleSpectrum.SAMPLES.length) | 0]
      const count = this.crystal.trace(
        dirX,
        dirY,
        dirZ,
        offsetA,
        offsetB,
        IceRefraction.indexAt(sample.wavelengthNm),
        this.emergent
      )
      for (let emerged = 0; emerged < count; emerged++) {
        const ray = this.emergent[emerged]
        const length = Math.hypot(ray.x, ray.y, ray.z)
        if (length < 1e-9 || ray.weight <= 0) continue
        const ex = ray.x / length
        const ey = ray.y / length
        const ez = ray.z / length
        if (ex * dirX + ey * dirY + ez * dirZ > undeviated) continue
        // The sky an observer looks at is the reverse of the direction the light travelled.
        const skyAltitude = Math.asin(Math.max(-1, Math.min(1, -ez)))
        const relativeAzimuth = Math.abs(Math.atan2(-ey, -ex))
        const azimuthBin = Math.min(width - 1, ((relativeAzimuth / Math.PI) * width) | 0)
        const altitudeBin = Math.min(height - 1, (((skyAltitude + Math.PI / 2) / Math.PI) * height) | 0)
        const at = (altitudeBin * width + azimuthBin) * 3
        const weight = ray.weight * flux * VisibleSpectrum.SAMPLES.length
        data[at] += weight * sample.r
        data[at + 1] += weight * sample.g
        data[at + 2] += weight * sample.b
      }
    }
    this.traced += rayCount
  }

  get tracedRays(): number {
    return this.traced
  }

  /** The display as it stands: the running tally turned into a radiance and smoothed. Safe to ask
   * for at any point — a half-traced display is the same display, grainier. */
  harvest(): HaloSkyMap {
    const width = HaloSky.AZIMUTH_BINS
    const height = HaloSky.ALTITUDE_BINS
    this.toRadiance(width, height)
    this.smooth(width, height)
    return {
      width,
      height,
      data: this.radiance,
      sourceAltitudeDeg: (this.altitude * 180) / Math.PI,
      alignment: this.alignment,
      rays: this.traced
    }
  }

  /** The whole thing in one call, for a caller that can afford to wait — tests, mostly. */
  compute(sourceAltitudeDeg: number, alignment: number, rayCount: number, seed?: number): HaloSkyMap {
    this.begin(sourceAltitudeDeg, alignment, seed)
    this.trace(rayCount)
    return this.harvest()
  }

  /**
   * Turns the tally of arriving light into a radiance: how much per unit of sky.
   *
   * Without this the map would call a bin near the pole bright merely for being small, and every
   * ring would pinch together overhead. Each bin covers two azimuth wedges — the map is folded
   * about the source's own vertical plane — so its share of sky is twice a wedge's.
   */
  private toRadiance(width: number, height: number): void {
    const azimuthSpan = (2 * Math.PI) / width
    const rays = Math.max(1, this.traced)
    // A crystal of the reference size, so that the numbers a renderer sees do not move when the
    // assumed crystal dimensions do.
    const reference = 4 * HaloSky.REFERENCE_MICRONS * HaloSky.REFERENCE_MICRONS
    for (let row = 0; row < height; row++) {
      const lower = Math.sin((row / height) * Math.PI - Math.PI / 2)
      const upper = Math.sin(((row + 1) / height) * Math.PI - Math.PI / 2)
      const scale = 1 / (azimuthSpan * (upper - lower) * rays * reference)
      for (let column = 0; column < width; column++) {
        const at = (row * width + column) * 3
        this.radiance[at] = this.tally[at] * scale
        this.radiance[at + 1] = this.tally[at + 1] * scale
        this.radiance[at + 2] = this.tally[at + 2] * scale
      }
    }
  }

  private static readonly REFERENCE_MICRONS = 50

  /**
   * The mildest blur there is, to take the graininess off a finite number of rays without moving an
   * edge: a ring's inner edge is two bins wide and has to stay that way.
   *
   * Run as two passes of three taps rather than one of nine, which is the same blur for a third of
   * the arithmetic — and the arithmetic is worth caring about, because this runs over a quarter of a
   * million bins at the moment a finished display is handed to the screen, and a scene that stalls
   * to show a halo is a scene that has spent its budget on the wrong thing. The edges are folds, not
   * wraps: one bin past either end of the azimuth is its own mirror, and past either end of the
   * altitude there is no sky at all.
   */
  private smooth(width: number, height: number): void {
    const source = this.scratch
    const target = this.radiance
    source.set(target)
    for (let row = 0; row < height; row++) {
      const start = row * width * 3
      for (let channel = 0; channel < 3; channel++) {
        let previous = source[start + channel]
        for (let column = 0; column < width; column++) {
          const at = start + column * 3 + channel
          const next = column + 1 < width ? source[at + 3] : source[at]
          target[at] = (previous + 2 * source[at] + next) / 4
          previous = source[at]
        }
      }
    }
    source.set(target)
    const stride = width * 3
    for (let row = 0; row < height; row++) {
      const above = row > 0 ? -stride : 0
      const below = row + 1 < height ? stride : 0
      const start = row * stride
      for (let at = start; at < start + stride; at++) {
        target[at] = (source[at + above] + 2 * source[at] + source[at + below]) / 4
      }
    }
  }

  private pickPopulation(): CrystalPopulation {
    const draw = this.random()
    let cumulative = 0
    for (const population of HaloSky.POPULATIONS) {
      cumulative += population.share
      if (draw <= cumulative) return population
    }
    return HaloSky.POPULATIONS[HaloSky.POPULATIONS.length - 1]
  }

  /** Draws one crystal from a population: which way its main axis points, and how it is turned
   * about that axis. Every form in the sky is a consequence of these few lines. */
  private orient(population: CrystalPopulation, tilt: number): void {
    const azimuth = this.random() * 2 * Math.PI
    let roll = this.random() * 2 * Math.PI
    let cx = 0
    let cy = 0
    let cz = 1
    switch (population.orientation) {
      case "tumbling": {
        // Uniform over the sphere, which is what "no preferred direction" means and what a small
        // crystal in stirred air actually does.
        cz = this.random() * 2 - 1
        const ring = Math.sqrt(Math.max(0, 1 - cz * cz))
        cx = ring * Math.cos(azimuth)
        cy = ring * Math.sin(azimuth)
        break
      }
      case "plate": {
        // Falling face-down, wandering from level by a fall-stability angle nobody recorded. The
        // wander is a wobble in TWO directions, not one, so its distribution about the vertical is
        // the one a spread on a sphere actually has — and the same formula turns into an even
        // scatter over the whole sphere as the spread grows, which is what "not aligned at all"
        // has to mean. Writing it as a plain angle instead piles crystals back up round the
        // vertical however wide the spread is set, and the sundogs never quite go away.
        cz = this.spreadAboutAnAxis(tilt)
        const ring = Math.sqrt(Math.max(0, 1 - cz * cz))
        cx = ring * Math.cos(azimuth)
        cy = ring * Math.sin(azimuth)
        break
      }
      case "column":
      case "parry": {
        // Long axis level, pointing anywhere on the compass, rolling freely about itself — except
        // in Parry's orientation, where a pair of faces stays level too. Here the wander is in one
        // direction only, out of the level plane, and it is the SINE of it that has to end up even
        // when nothing is holding the crystal: a column lying at any angle is a column pointing
        // anywhere on the sphere.
        cz = this.spreadAboutAPlane(tilt)
        const ring = Math.sqrt(Math.max(0, 1 - cz * cz))
        cx = ring * Math.cos(azimuth)
        cy = ring * Math.sin(azimuth)
        if (population.orientation === "parry") roll = Math.PI / 2 + this.gaussian() * tilt
        break
      }
    }
    this.crystal.set(cx, cy, cz, roll, population.widthMicrons, population.lengthMicrons)
  }

  /** A deterministic generator, so the same sky is the same sky: a display that shimmered when a
   * reader scrubbed back to a moment they had already watched would be an artefact of the method
   * rather than a sight. */
  private random(): number {
    this.seed = (this.seed + 0x6d2b79f5) >>> 0
    let value = this.seed
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }

  /**
   * How far a crystal's axis lies from the direction it is trying to hold, as the cosine of that
   * angle — a spread about a POINT on the sphere.
   *
   * Tight about the axis for a small spread, and an even scatter over the whole sphere as the
   * spread grows past a radian, with no seam between the two. Both ends have to be right: one is a
   * plate falling face-down through still air, the other is the same plate in stirred air, and the
   * control that runs between them is the only say a reader has over which forms stand.
   */
  private spreadAboutAnAxis(spread: number): number {
    const concentration = 1 / Math.max(1e-6, spread * spread)
    const draw = Math.max(1e-12, this.random())
    const cosine = 1 + Math.log(draw + (1 - draw) * Math.exp(-2 * concentration)) / concentration
    return Math.max(-1, Math.min(1, cosine))
  }

  /**
   * The same, for an axis trying to lie in a PLANE rather than point along a direction — a column
   * holding level while pointing anywhere on the compass. Returns the sine of how far out of that
   * plane it ended up, which is the quantity that has to come out even when nothing holds it.
   */
  private spreadAboutAPlane(spread: number): number {
    for (let attempt = 0; attempt < 8; attempt++) {
      const out = this.gaussian() * spread
      if (out >= -1 && out <= 1) return out
    }
    return this.random() * 2 - 1
  }

  private gaussian(): number {
    if (this.hasSpare) {
      this.hasSpare = false
      return this.spare
    }
    const radius = Math.sqrt(-2 * Math.log(Math.max(1e-12, this.random())))
    const angle = 2 * Math.PI * this.random()
    this.spare = radius * Math.sin(angle)
    this.hasSpare = true
    return radius * Math.cos(angle)
  }
}
