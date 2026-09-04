import { SurfaceBrightness, type SkyBrightnessMap } from "./SurfaceBrightness.js"

/**
 * The Galaxy, seen from inside it.
 *
 * NOT A PAINTED BAND, and not a photograph either — there is no picture in this project and nothing
 * to license or host. What is here is a Galaxy: a disc of stars, a bulge at its centre, and a
 * thinner disc of dust in the same plane. A line of sight is walked outward from the Sun's own place
 * in that disc, the starlight it passes through is added up, and the dust it passes through takes
 * light back out again. The band across the sky, its bulge in Sagittarius, its thinning toward
 * Auriga and the dark rift splitting it lengthwise are not four things drawn here. They are what
 * that one walk returns, and no line below knows the name of any of them.
 *
 * THE RIFT IS THE TEST OF THE MODEL, and it is why the dust is a separate disc rather than a
 * fudge on the starlight. Dust settles into a layer barely half as thick as the stars do, so a line
 * of sight within a degree or so of the plane is looking down the whole length of it and loses ten
 * magnitudes before it reaches the far side of the Galaxy, while a line of sight three degrees up
 * has climbed out of the dust within a couple of kiloparsecs and keeps most of what it collects.
 * That difference IS the Great Rift — a black lane down the middle of the brightest part of the
 * band — and it falls out of two scale heights, not out of a drawn shape.
 *
 * What is deliberately absent: spiral arms, the bar, and the clumpiness of real dust. This is a
 * smooth axisymmetric Galaxy, so it gives the Scutum and Sagittarius clouds as one broad
 * brightening rather than as separate clouds, and the Coalsack not at all. For a witness's account
 * of "a strange glowing band" that is the right amount of Galaxy: the question such an account
 * raises is whether the band was there and how bright, never which star cloud it was.
 */
export class MilkyWay {
  /** Longitude columns, uniform over the full turn, wrapping. 1.4 degrees a column — the finest
   * structure this smooth a model has is the bulge, which subtends about seven. */
  static readonly LONGITUDE_STEPS = 256
  /** Latitude rows, warped toward the plane (see SurfaceBrightness.latitudeOfRowCoord) because the
   * rift's edges are the one sharp thing in the map and they are within two degrees of it. */
  static readonly LATITUDE_STEPS = 128

  /**
   * How far the Sun stands from the centre of the Galaxy, and how far above its plane.
   *
   * Both measured, and the second one matters more than its size suggests: twenty parsecs is a
   * seventh of the dust layer's own thickness, and it is why the band is not quite symmetric about
   * the galactic equator — the southern half of it is seen through slightly more dust than the
   * northern. Leaving it out costs nothing visually and would have been a lie for free.
   */
  private static readonly SUN_RADIUS_KPC = 8.2
  private static readonly SUN_HEIGHT_KPC = 0.02

  /** The thin disc the naked-eye Milky Way is made of: exponential in both radius and height,
   * with the scale lengths star counts give. */
  private static readonly DISK_SCALE_LENGTH_KPC = 2.6
  private static readonly DISK_SCALE_HEIGHT_KPC = 0.3

  /**
   * The central bulge: a flattened exponential spheroid, the naked-eye "bulge" of the band in
   * Sagittarius and Ophiuchus.
   *
   * Its amplitude is BOUNDED rather than fitted, and the difference matters. The quantity it moves
   * is how much brighter the sky is toward the centre than toward the anticentre, ten degrees off
   * the plane where the dust no longer decides it — observed at something like three to four times.
   * The exponential disc ALONE already supplies 3.4 of that, because the density a line of sight
   * toward the centre integrates through keeps rising all the way in. So there is no amplitude that
   * hits three, and pretending to fit one would be pretending; what is left for the bulge is the
   * room between 3.4 and the top of the observed range, and this amplitude uses it (3.8). A real
   * structure, kept small because the ratio has no more room than that. See the test.
   */
  private static readonly BULGE_SCALE_KPC = 0.5
  private static readonly BULGE_FLATTENING = 0.6
  private static readonly BULGE_TO_LOCAL_DISK = 20

  /**
   * The dust, and the two numbers the rift lives on.
   *
   * A scale height of a hundred parsecs against the stars' three hundred — dust is heavy and it
   * settles — and eight tenths of a magnitude of visual extinction per kiloparsec where the Sun
   * stands. The radial scale length is LONGER than the stars': the dust disc is more spread out than
   * the light it hides, so extinction falls off outward more slowly than brightness does.
   *
   * WHAT ACTUALLY DECIDES THE PICTURE IS THE PRODUCT of those first two, not either alone, because
   * the column of dust an exponential layer puts above the Sun is exactly the density times the
   * scale height. That is worth knowing because it is where this model was wrong: it began at 140
   * parsecs and a full magnitude per kiloparsec, a column of 0.14 magnitudes, and the consequence
   * was visible — the brightest ridge of the band sat six and a quarter degrees off the plane, where
   * the sky's own brightest clouds sit at two to five.
   *
   * Three measurements bound it, and NONE of them can be met exactly by a smooth disc — which is
   * the honest part, and why the calibration is a bracket rather than a fit:
   *
   * - **The galactic poles**, where the measured column is about 0.05 magnitudes. A smooth disc must
   *   come out ABOVE that, because the Sun sits inside the Local Bubble, a cavity swept nearly clear
   *   of dust that no axisymmetric model has. This one gives 0.080 — over by half again, which is
   *   the right side and about the right amount.
   * - **Baade's Window**, the famous clear line of sight to the bulge at four degrees below the
   *   plane, where the extinction is about 1.5 magnitudes. A smooth disc must come out ABOVE that
   *   too, for the same kind of reason turned round: a window is by definition the emptiest hole in
   *   a clumpy layer, and an average cannot be as clear as the clearest. This one gives 2.9, inside
   *   the range quoted for bulge sightlines generally.
   * - **Where the band is brightest**, which is the one the eye checks: the sky's own brightest
   *   clouds toward the inner Galaxy stand two to five degrees off the plane. This one puts its
   *   ridge at 4.5.
   *
   * And within that bracket, the pair is chosen so that BOTH factors stay inside their own published
   * ranges rather than trading one off against the other: a hundred parsecs is the scale height
   * Galactic extinction models use, and eight tenths of a magnitude per kiloparsec is inside the
   * seven-tenths-to-one quoted for the plane. Pinning the column on the poles alone would have
   * forced the density down to a third of a magnitude per kiloparsec, outside its own range, and
   * left the anticentre band fourteen times fainter than Sagittarius instead of six.
   */
  private static readonly DUST_SCALE_LENGTH_KPC = 3.5
  private static readonly DUST_SCALE_HEIGHT_KPC = 0.1
  private static readonly EXTINCTION_MAG_PER_KPC = 0.8

  /** Where the walk starts and stops, and in how many steps. Logarithmic, because both the dust
   * that matters and the emissivity that matters are near, while the far end is either extinguished
   * or empty: the first step is ten parsecs and the last several kiloparsecs. */
  private static readonly NEAR_LIMIT_KPC = 0.01
  private static readonly FAR_LIMIT_KPC = 40
  private static readonly STEPS = 192

  /** Past this much extinction there is nothing left to collect — a millionth of what set out — and
   * every remaining step of a line of sight down the plane would only be paying for it. */
  private static readonly OPAQUE_MAG = 15

  /**
   * What the brightest part of the band is worth, in magnitudes per square arcsecond.
   *
   * The whole map is scaled so its own maximum lands here, which makes this the single measured
   * anchor of an otherwise dimensionless model. Twenty-one is the figure the brightest Milky Way
   * clouds are quoted at, and stating it next to the dark-sky background it competes with is the
   * more useful way to read it: a natural moonless sky is 22.0, so the brightest of the Milky Way
   * is ONE magnitude above the sky it stands on. Two and a half times, no more. That is why it
   * disappears from a town, and why a witness who has only ever seen it from one is entitled to
   * find it strange.
   */
  static readonly PEAK_MAG_PER_ARCSEC2 = 21

  /**
   * The value radianceTowards returns at the brightest direction there is, which is a hair off the
   * galactic centre and six and a half degrees above the plane — out of the rift.
   *
   * Written down rather than searched for, because searching for it means walking a fine grid over
   * the whole sky and this is a property of a model that never changes. It also has to be
   * grid-independent: taken as the largest value a 256-column map happened to sample, the
   * brightness of everything in the sky would shift slightly whenever that map was made finer.
   * The test that goes with it walks the sky and checks the model still peaks here.
   */
  static readonly PEAK_RADIANCE = 6.278
  static readonly PEAK_LONGITUDE_DEG = 0
  static readonly PEAK_LATITUDE_DEG = 4.5

  /** What one direction of the sky is worth in S10, anchored on the one measured number this model
   * has (see PEAK_MAG_PER_ARCSEC2) — the whole brightness, including the floor that the sky it
   * would be drawn on already carries. */
  surfaceBrightnessS10(lDeg: number, bDeg: number): number {
    return this.radianceTowards(lDeg, bDeg) * MilkyWay.anchor()
  }

  private static anchor(): number {
    return SurfaceBrightness.fromMagPerArcsec2(MilkyWay.PEAK_MAG_PER_ARCSEC2) / MilkyWay.PEAK_RADIANCE
  }

  /**
   * Adds up the starlight along one line of sight, in units of the local emissivity times a
   * kiloparsec — a relative number, made absolute by surfaceBrightnessS10's single anchor.
   *
   * `lDeg` is galactic longitude, zero toward the centre and rising toward Cygnus; `bDeg` is
   * galactic latitude.
   */
  radianceTowards(lDeg: number, bDeg: number): number {
    return this.trace(lDeg, bDeg).light
  }

  /**
   * How many magnitudes the dust takes out of everything behind it, along that same line of sight.
   *
   * Public because it is what the three calibration measurements are OF (see the dust constants) —
   * the column over the galactic poles, and the extinction toward the bulge. A model whose only
   * observable was its own picture could not be checked against a measurement at all.
   *
   * Saturates at OPAQUE_MAG rather than running to the far side of the Galaxy: a line of sight down
   * the plane really does reach thirty magnitudes and more, and nothing this returns past fifteen
   * would mean anything except "nothing gets through".
   */
  extinctionTowards(lDeg: number, bDeg: number): number {
    return this.trace(lDeg, bDeg).extinctionMag
  }

  private trace(lDeg: number, bDeg: number): { light: number; extinctionMag: number } {
    const l = (lDeg * Math.PI) / 180
    const b = (bDeg * Math.PI) / 180
    // Galactocentric axes with the Sun on the positive x side: a line of sight toward the centre
    // (l = 0) walks in -x, and l = 90 walks in +y, the direction the Galaxy turns.
    const towardX = -Math.cos(b) * Math.cos(l)
    const towardY = Math.cos(b) * Math.sin(l)
    const towardZ = Math.sin(b)

    let collected = 0
    let extinctionMag = 0
    let previous = 0
    const logNear = Math.log(MilkyWay.NEAR_LIMIT_KPC)
    const logSpan = Math.log(MilkyWay.FAR_LIMIT_KPC) - logNear
    for (let step = 0; step < MilkyWay.STEPS; step++) {
      const distance = Math.exp(logNear + (logSpan * step) / (MilkyWay.STEPS - 1))
      const walked = distance - previous
      previous = distance
      // Midpoint of the step, so a logarithmic grid does not systematically over-weight the far end
      // of each interval where the density is falling.
      const at = distance - walked / 2
      const x = MilkyWay.SUN_RADIUS_KPC + at * towardX
      const y = at * towardY
      const z = MilkyWay.SUN_HEIGHT_KPC + at * towardZ
      const radius = Math.hypot(x, y)

      const disk = Math.exp(
        -(radius - MilkyWay.SUN_RADIUS_KPC) / MilkyWay.DISK_SCALE_LENGTH_KPC -
          Math.abs(z) / MilkyWay.DISK_SCALE_HEIGHT_KPC
      )
      const bulgeRadius = Math.hypot(radius, z / MilkyWay.BULGE_FLATTENING)
      const bulge = MilkyWay.BULGE_TO_LOCAL_DISK * Math.exp(-bulgeRadius / MilkyWay.BULGE_SCALE_KPC)
      // The light that set out from this step, less what the dust between here and the Sun already
      // took: the extinction below is the total accumulated BEFORE this step, which is what applies
      // to it.
      collected += (disk + bulge) * walked * 10 ** (-0.4 * extinctionMag)

      extinctionMag +=
        MilkyWay.EXTINCTION_MAG_PER_KPC *
        Math.exp(
          -(radius - MilkyWay.SUN_RADIUS_KPC) / MilkyWay.DUST_SCALE_LENGTH_KPC -
            (Math.abs(z) - MilkyWay.SUN_HEIGHT_KPC) / MilkyWay.DUST_SCALE_HEIGHT_KPC
        ) *
        walked
      if (extinctionMag > MilkyWay.OPAQUE_MAG) break
    }
    return { light: collected, extinctionMag }
  }

  /**
   * The whole sky, in galactic coordinates, in S10 units — walked a few rows at a time.
   *
   * Resumable for the same reason the ice display's trace is (see IceHaloEffect.scheduleWork): a
   * third of a second of arithmetic dropped into one frame is a third of a second the scene has
   * stopped answering, and this is a background that can perfectly well arrive a moment after the
   * sky it belongs to. Rows rather than pixels, because a row is a latitude and the cost of one
   * barely varies along it.
   *
   * Fixed forever once finished: the Galaxy does not move, so this is walked once for the life of
   * the page and turned toward the witness's own horizon by a rotation — never rewalked for a new
   * date, a new place or a new sighting.
   */
  private readonly values = new Float32Array(MilkyWay.LONGITUDE_STEPS * MilkyWay.LATITUDE_STEPS)
  private walked = 0

  get done(): boolean {
    return this.walked >= MilkyWay.LATITUDE_STEPS
  }

  walk(rows: number): void {
    const width = MilkyWay.LONGITUDE_STEPS
    const last = Math.min(MilkyWay.LATITUDE_STEPS, this.walked + rows)
    for (; this.walked < last; this.walked++) {
      const latitudeDeg = SurfaceBrightness.latitudeOfRowCoord((this.walked + 0.5) / MilkyWay.LATITUDE_STEPS)
      for (let column = 0; column < width; column++) {
        this.values[this.walked * width + column] = this.radianceTowards((360 * (column + 0.5)) / width, latitudeDeg)
      }
    }
  }

  /**
   * The finished map, scaled to S10 and with its own faintest level taken out.
   *
   * THE SUBTRACTION IS NOT A TASTE DECISION, it is what keeps the light from being counted twice.
   * The "dark natural sky" this scene already paints — 22nd magnitude a square arcsecond — is not
   * empty sky: it is airglow PLUS the integrated starlight of the whole Galaxy PLUS the zodiacal
   * light, averaged. So the model's own value at the galactic poles, which is that same integrated
   * starlight seen where the disc is thinnest, is already in the sky the band would be added to.
   * What a band is, over and above the sky, is its EXCESS over that floor, and that is what gets
   * drawn. Anchoring stays on the total (see PEAK_MAG_PER_ARCSEC2), which is the quantity the
   * measurement is of.
   */
  harvest(): SkyBrightnessMap {
    let faintest = Number.POSITIVE_INFINITY
    for (const value of this.values) if (value < faintest) faintest = value
    const scale = MilkyWay.anchor()
    const data = new Float32Array(this.values.length)
    for (let at = 0; at < data.length; at++) data[at] = (this.values[at] - faintest) * scale
    return { width: MilkyWay.LONGITUDE_STEPS, height: MilkyWay.LATITUDE_STEPS, data }
  }
}
