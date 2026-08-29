/**
 * Halos, sundogs and pillars — the light that ice crystals put in the sky beside the Sun.
 *
 * This family is not one more candidate among the others. It is the one that produces, routinely,
 * exactly what a report describes: TWO BRIGHT OBJECTS FLANKING THE SUN, at the same height, keeping
 * station with the observer however far they drive. Parhelia are visible somewhere on Earth on a
 * large fraction of days, most people have never knowingly seen one, and nothing else in the sky
 * behaves like that. A sun pillar does the same job for "a vertical shaft of light"; a 22-degree
 * halo for "a ring around the sun".
 *
 * EVERYTHING HERE IS DERIVED, and that is what makes it worth having rather than a picture of a
 * halo pasted at 22 degrees. Twenty-two is not a constant of this file: it is what falls out of the
 * refractive index of ice and the sixty-degree angle between alternate faces of a hexagonal prism.
 * Change the index and every number below moves together, which is the test that it is physics and
 * not decoration:
 *
 *   minimum deviation of a prism:  d = 2·asin(n·sin(A/2)) − A
 *
 * With A = 60° and ice's n, that is 21.7° in red light and 22.4° in blue — which is why a real halo
 * has a sharp RED inner edge and a diffuse blue outside, and why it is dimmer outside than in. With
 * A = 90°, the same formula gives the fainter 46-degree halo.
 *
 * The parhelia come from the same prism with the crystal lying FLAT — plate crystals falling with
 * their faces horizontal, which is what large plates do in still air. The Sun's light then crosses
 * the prism as a skew ray, and the standard treatment replaces n with an effective index that
 * depends on how high the Sun is. Two things fall straight out of that, both checkable against what
 * observers see: the dogs sit at 22° only when the Sun is on the horizon and slide outward as it
 * climbs, and they VANISH once the Sun passes about 61 degrees, where the skew ray can no longer
 * get through the prism at all.
 *
 * WHAT IS NOT MODELLED: how bright any of it actually is. Halo brightness depends on crystal
 * habit, size and orientation quality — a Monte-Carlo problem, and one no reanalysis dataset holds
 * the inputs for. What this offers instead is whether the ingredients were there (ice cloud, and a
 * light source high enough to shine through it) and where each form would have stood. Whether the
 * witness saw one is, as ever, the reader's conclusion.
 */
export interface HaloForm {
  id: "halo22" | "halo46" | "parhelia" | "pillar"
  /** Angular radius from the light source, degrees — for the ring forms, and for the parhelia the
   * distance out to either side. Absent for the pillar, which is not at a fixed distance. */
  angleDeg?: number
  /** How far the red and blue edges of that feature sit, degrees. The separation IS the colour: a
   * halo is a spectrum smeared across two thirds of a degree. */
  redAngleDeg?: number
  blueAngleDeg?: number
}

export class IceHalos {
  /**
   * The refractive index of ice at the red and blue ends of what an eye responds to.
   *
   * The two numbers this whole file is built from. Their difference — one part in a hundred and
   * thirty — is the entire reason a halo is coloured, and it puts the red edge two thirds of a
   * degree inside the blue one.
   */
  static readonly ICE_INDEX_RED = 1.3067
  static readonly ICE_INDEX_BLUE = 1.317

  /** The angle between alternate side faces of a hexagonal prism, which is what makes the common
   * halo, and between a side face and an end face, which makes the rare large one. */
  static readonly SIDE_PRISM_ANGLE_DEG = 60
  static readonly END_PRISM_ANGLE_DEG = 90

  /**
   * Above this solar elevation the parhelia cannot form at all.
   *
   * Not a threshold anybody chose: it is where the effective index of the skew ray reaches 2, so
   * that `n·sin(30°)` reaches 1 and the light can no longer leave the far face. Observers put the
   * disappearance of sundogs at about sixty degrees, which is this number.
   */
  static get PARHELIA_MAX_SUN_ALTITUDE_DEG(): number {
    // n_eff = sqrt(n² − sin²h)/cos h = 2  =>  n² − sin²h = 4(1 − sin²h)
    const n = IceHalos.ICE_INDEX_RED
    const sine = Math.sqrt((4 - n * n) / 3)
    return (Math.asin(Math.min(1, sine)) * 180) / Math.PI
  }

  /**
   * The minimum deviation of a ray through a prism — the angle a halo appears at.
   *
   * Light entering a prism at any angle leaves deviated by at least this much, and piles up there:
   * the deviation is stationary at the minimum, so rays from every orientation of a tumbling
   * crystal concentrate at one angle. That concentration IS the halo, and its sharp inner edge is
   * the fact that no ray is deviated less.
   */
  static minimumDeviationDeg(prismAngleDeg: number, refractiveIndex: number): number {
    const apex = (prismAngleDeg * Math.PI) / 180
    const sine = refractiveIndex * Math.sin(apex / 2)
    // Beyond this the ray is trapped by total internal reflection and the form does not appear.
    if (sine > 1) return Number.NaN
    return ((2 * Math.asin(sine) - apex) * 180) / Math.PI
  }

  /**
   * The effective refractive index for a ray crossing a plate crystal at `sunAltitudeDeg` above its
   * horizontal faces.
   *
   * The one piece of the standard skew-ray treatment worth writing down here, because everything
   * the parhelia do follows from it: `sqrt(n² − sin²h) / cos h`. It equals n when the Sun is on the
   * horizon, grows as the Sun climbs, and runs away to infinity as the Sun nears the zenith — which
   * is the parhelia sliding outward and then disappearing.
   */
  static effectiveIndex(refractiveIndex: number, sunAltitudeDeg: number): number {
    const altitude = (sunAltitudeDeg * Math.PI) / 180
    const cosine = Math.cos(altitude)
    if (cosine <= 0) return Number.POSITIVE_INFINITY
    return Math.sqrt(refractiveIndex * refractiveIndex - Math.sin(altitude) ** 2) / cosine
  }

  /** How far to either side of the light source the parhelia stand, degrees, or undefined once the
   * Sun is too high for them to form. */
  static parheliaDistanceDeg(sunAltitudeDeg: number, refractiveIndex = IceHalos.ICE_INDEX_RED): number | undefined {
    const deviation = IceHalos.minimumDeviationDeg(IceHalos.SIDE_PRISM_ANGLE_DEG, IceHalos.effectiveIndex(refractiveIndex, sunAltitudeDeg))
    return Number.isFinite(deviation) ? deviation : undefined
  }

  /** The common halo, with its red inner and blue outer edge. */
  static halo22(): HaloForm {
    return {
      id: "halo22",
      angleDeg: IceHalos.minimumDeviationDeg(IceHalos.SIDE_PRISM_ANGLE_DEG, IceHalos.ICE_INDEX_RED),
      redAngleDeg: IceHalos.minimumDeviationDeg(IceHalos.SIDE_PRISM_ANGLE_DEG, IceHalos.ICE_INDEX_RED),
      blueAngleDeg: IceHalos.minimumDeviationDeg(IceHalos.SIDE_PRISM_ANGLE_DEG, IceHalos.ICE_INDEX_BLUE)
    }
  }

  /** The rarer, larger and much fainter ring, from the ninety-degree faces. */
  static halo46(): HaloForm {
    return {
      id: "halo46",
      angleDeg: IceHalos.minimumDeviationDeg(IceHalos.END_PRISM_ANGLE_DEG, IceHalos.ICE_INDEX_RED),
      redAngleDeg: IceHalos.minimumDeviationDeg(IceHalos.END_PRISM_ANGLE_DEG, IceHalos.ICE_INDEX_RED),
      blueAngleDeg: IceHalos.minimumDeviationDeg(IceHalos.END_PRISM_ANGLE_DEG, IceHalos.ICE_INDEX_BLUE)
    }
  }

  /**
   * How strongly the ice forms could have shown, 0 to 1, given the sky that was over the witness.
   *
   * MONOTONIC in the ice cover, and that is a correction. The first version peaked at half cover
   * and fell back to nothing at full, on the reasoning that a solidly covered sky has ground the
   * light out — which confuses two different quantities. How much of the sky a deck COVERS is not
   * how much light it ABSORBS, and a cirrostratus veil covering the whole sky is the classic
   * halo-maker: the best displays anybody photographs come from exactly that. The old curve handed
   * back nothing at the setting a reader would most naturally reach for.
   *
   * What the record does not hold is the veil's OPTICAL DEPTH, which is what would actually dim a
   * display, and no reanalysis product this project can reach carries it. So a thin veil and a thick
   * one are indistinguishable here, and the strength returned is a statement about ingredients
   * rather than about brightness — as the class comment says, this says the display could have
   * stood, not how vivid it was.
   *
   * The lower decks are the one thing that genuinely removes it: cirrus lives above six kilometres,
   * and a layer of stratocumulus under it hides the whole display whatever the crystals are doing.
   */
  static strength(highCloudCover: number, lowerCloudCover: number): number {
    const ice = Math.max(0, Math.min(1, highCloudCover))
    const throughLowerDecks = Math.max(0, 1 - Math.max(0, Math.min(1, lowerCloudCover)))
    return ice * throughLowerDecks
  }

  /** Which forms could have stood in that sky, and where. Empty when the light source has set: a
   * halo is the source's own light bent, so it goes when the source does. */
  static formsAt(sourceAltitudeDeg: number): HaloForm[] {
    if (sourceAltitudeDeg <= 0) return []
    const forms: HaloForm[] = [IceHalos.halo22(), IceHalos.halo46()]
    const parhelia = IceHalos.parheliaDistanceDeg(sourceAltitudeDeg)
    if (parhelia !== undefined) {
      forms.push({
        id: "parhelia",
        angleDeg: parhelia,
        redAngleDeg: parhelia,
        blueAngleDeg: IceHalos.parheliaDistanceDeg(sourceAltitudeDeg, IceHalos.ICE_INDEX_BLUE)
      })
    }
    // A pillar is a REFLECTION off the flat faces, not a refraction through them, so no index and no
    // colour enters it — and it is strongest when the source is near the horizon, where the tilted
    // faces of falling plates can throw its light up toward the eye.
    if (sourceAltitudeDeg < IceHalos.PILLAR_MAX_SOURCE_ALTITUDE_DEG) forms.push({ id: "pillar" })
    return forms
  }

  /** Pillars are a low-Sun phenomenon: much above this the geometry stops sending reflected light
   * to a ground observer, which is why they are a sunrise and sunset sight. */
  static readonly PILLAR_MAX_SOURCE_ALTITUDE_DEG = 20
}
