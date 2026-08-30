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
 * WHAT THIS FILE IS FOR, now that the scene no longer draws from it. The display a reader sees is
 * traced ray by ray through actual crystals (HaloSky), which is the only way to get the forms that
 * have no closed form at all — the arc riding on the ring, the coloured arc near the zenith, the
 * white circle at the source's own height. This file keeps the closed forms, and its job is to
 * DISAGREE. Every angle here is derived from the refractive index alone; every angle there falls
 * out of Snell's law applied a few million times; and where the two parted company it was this file
 * that was wrong — the sundog separation was reported as the prism's deviation, which is a swing in
 * bearing and a degree and a half larger than the angle anybody measures. Two independent
 * derivations of one piece of physics agreeing is evidence; one number shared between the sentence
 * and the picture would only have been a habit.
 *
 * The other job is to say, in a sentence, what the sky ALLOWED — which forms could have stood at
 * that source height, and at what angles. That is not the same as what was seen: whether the
 * oriented-crystal forms actually appeared depends on how steadily the crystals were falling, which
 * no record of any sighting holds (see Weather.iceCrystalAlignment). Whether the witness saw one
 * is, as ever, the reader's conclusion.
 */
export interface HaloForm {
  id:
    | "halo22"
    | "halo46"
    | "parhelia"
    | "tangentArc"
    | "parhelicCircle"
    | "circumzenithal"
    | "circumhorizontal"
    | "pillar"
  /**
   * The one angle that says where the form is, degrees — and which angle that is depends on the
   * form, because the forms are not all the same kind of thing. For the rings and the parhelia it
   * is how far from the source they stand. For the circle at the source's own height and the arc
   * near the zenith it is an ALTITUDE above the horizon, since neither is at a fixed distance from
   * anything. Absent for the pillar, which is not at a distance at all — it is the source's own
   * image drawn out.
   */
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

  /**
   * How far round the sky, in azimuth, a parhelion stands from its source — the deviation itself.
   *
   * The prism turns the ray about the crystal's VERTICAL edge, so what it changes is the ray's
   * bearing and not its height: a sundog is always at exactly the source's own altitude, and what
   * grows as the source climbs is how far round from it the sundog has been swung.
   */
  static parheliaAzimuthDeg(sunAltitudeDeg: number, refractiveIndex = IceHalos.ICE_INDEX_RED): number | undefined {
    const deviation = IceHalos.minimumDeviationDeg(IceHalos.SIDE_PRISM_ANGLE_DEG, IceHalos.effectiveIndex(refractiveIndex, sunAltitudeDeg))
    return Number.isFinite(deviation) ? deviation : undefined
  }

  /**
   * How far from the source a parhelion actually stands — the angle an observer would measure
   * between them — or undefined once the Sun is too high for one to form at all.
   *
   * NOT the same as the deviation above, and the difference is a correction. Both are 22 degrees
   * with the source on the horizon, and they part company as it climbs: two points at the same
   * altitude that are 25 degrees apart in BEARING are less than 25 degrees apart in the sky, by as
   * much as the altitude circle they both sit on is shorter than a great circle. At 20 degrees'
   * elevation the deviation is 24.9 and the separation 23.2, and it is the separation an observer
   * with a protractor writes down.
   */
  static parheliaDistanceDeg(sunAltitudeDeg: number, refractiveIndex = IceHalos.ICE_INDEX_RED): number | undefined {
    const swing = IceHalos.parheliaAzimuthDeg(sunAltitudeDeg, refractiveIndex)
    if (swing === undefined) return undefined
    const altitude = (sunAltitudeDeg * Math.PI) / 180
    const height = Math.sin(altitude) ** 2
    const across = Math.cos(altitude) ** 2 * Math.cos((swing * Math.PI) / 180)
    return (Math.acos(Math.max(-1, Math.min(1, height + across))) * 180) / Math.PI
  }

  /**
   * The steepest a ray can be and still cross a crystal's flat end AND one of its side faces —
   * `asin(sqrt(n² − 1))`, 57.8 degrees for ice, and the hinge two whole forms turn on.
   *
   * Below its complement (32.2 degrees) the light can enter a flat-lying plate's top face and leave
   * through a side face, which throws the brilliantly coloured arc that stands near the zenith. Only
   * ABOVE 57.8 can it do the reverse — in a side face and out through the bottom — which is the arc
   * that lies flat along the sky far beneath the Sun, and the reason that one is a summer-noon sight
   * of low latitudes and simply cannot happen in a British winter.
   */
  static get PLATE_END_FACE_LIMIT_DEG(): number {
    const n = IceHalos.ICE_INDEX_RED
    return (Math.asin(Math.min(1, Math.sqrt(n * n - 1))) * 180) / Math.PI
  }

  /**
   * How high the circumzenithal arc stands, or undefined when the source is too high for it.
   *
   * Light comes down through the flat top of a level plate and out of a vertical side face, and the
   * emergent ray's angle to the horizontal is `asin(sqrt(n² − cos²h))` — which is the arc's own
   * altitude, since the crystal turns the ray in a vertical plane. It puts the arc 46 degrees above
   * a source at 22 degrees, tangent to the big ring, and further and further above the big ring as
   * the source sinks. Nothing here is placed at 46: that is where the arithmetic lands.
   */
  static circumzenithalAltitudeDeg(sunAltitudeDeg: number, refractiveIndex = IceHalos.ICE_INDEX_RED): number | undefined {
    if (sunAltitudeDeg < 0 || sunAltitudeDeg > 90 - IceHalos.PLATE_END_FACE_LIMIT_DEG) return undefined
    const cosine = Math.cos((sunAltitudeDeg * Math.PI) / 180)
    const sine = Math.sqrt(refractiveIndex * refractiveIndex - cosine * cosine)
    if (sine >= 1) return undefined
    return (Math.asin(sine) * 180) / Math.PI
  }

  /**
   * How far below the observer's own horizon the source may sink with the ice deck still in
   * sunlight — the deck's height turned into an angle, `acos(R / (R + h))`.
   *
   * Nearly three degrees for cirrus at eight kilometres, which is a quarter of an hour of a
   * mid-latitude evening. It is exactly the interval that puts a shaft of light over a Sun that has
   * already set for the witness, and it is why pillars are a sunset sight rather than a daylight
   * one. Ending the display at the witness's own horizon would lose the sight the form is known for.
   */
  /**
   * How high the ice deck really is, in metres.
   *
   * Cirrus lives between six and twelve kilometres; eight is the middle of that and the same figure
   * the weather lookup gives the high deck a base of. Stated here rather than in the renderer
   * because it is a fact about the atmosphere, not about the scene — and because the renderer's own
   * layer height is in scene units, which is not a number any angle may be computed from.
   */
  static readonly DECK_HEIGHT_M = 8000

  static deckLitUntilDeg(deckHeightM: number): number {
    const earthRadiusM = 6371000
    return (Math.acos(earthRadiusM / (earthRadiusM + Math.max(0, deckHeightM))) * 180) / Math.PI
  }

  /** The common halo, with its red inner and blue outer edge. */
  static halo22(): HaloForm {
    return IceHalos.ringOf("halo22", IceHalos.SIDE_PRISM_ANGLE_DEG)
  }

  /** The rarer, larger and much fainter ring, from the ninety-degree faces. */
  static halo46(): HaloForm {
    return IceHalos.ringOf("halo46", IceHalos.END_PRISM_ANGLE_DEG)
  }

  /**
   * A ring from one prism angle: where its red edge is, where its blue one is, and the radius
   * anybody would give if asked how big it was.
   *
   * That last is the MIDDLE of the band and not its red edge, and the two rings show why it has to
   * be. The common one is two thirds of a degree wide, so its edge and its middle both round to 22
   * and nobody notices. The big one is over two degrees wide — 45.0 red, 47.3 blue — so quoting its
   * red edge gives "a 45-degree halo", which is not what it is called, not what anyone measures,
   * and not where its brightness lies. The name everybody uses is the middle of the spectrum.
   */
  private static ringOf(id: "halo22" | "halo46", prismAngleDeg: number): HaloForm {
    const red = IceHalos.minimumDeviationDeg(prismAngleDeg, IceHalos.ICE_INDEX_RED)
    const blue = IceHalos.minimumDeviationDeg(prismAngleDeg, IceHalos.ICE_INDEX_BLUE)
    return { id, angleDeg: (red + blue) / 2, redAngleDeg: red, blueAngleDeg: blue }
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
  static strength(
    highCloudCover: number,
    lowerCloudCover: number,
    sourceAltitudeDeg = 90,
    deckLitUntilDeg = 0
  ): number {
    const ice = Math.max(0, Math.min(1, highCloudCover))
    const throughLowerDecks = Math.max(0, 1 - Math.max(0, Math.min(1, lowerCloudCover)))
    // Once the source has set for the WITNESS the deck is still lit, and then the Earth's shadow
    // climbs through it: the display does not switch off at the horizon, it goes out from below
    // over the few minutes the shadow takes to reach eight kilometres.
    const lit =
      sourceAltitudeDeg >= 0
        ? 1
        : deckLitUntilDeg <= 0
          ? 0
          : Math.max(0, 1 + sourceAltitudeDeg / deckLitUntilDeg)
    return ice * throughLowerDecks * lit
  }

  /**
   * Which forms could have stood in that sky, and where.
   *
   * A list of what the GEOMETRY allows, which is not the same as what was seen — whether the
   * oriented-crystal forms actually stood depends on how steadily the crystals were falling, and
   * nothing records that (see Weather.iceCrystalAlignment). Every entry's angle is derived here and
   * the scene traces the same physics independently (HaloSky), so the two agreeing is a real check
   * rather than a shared assumption.
   */
  static formsAt(sourceAltitudeDeg: number, deckLitUntilDeg = 0): HaloForm[] {
    // Not "has the source set", but "is the ice still in sunlight" — the same question the scene
    // asks (see IceHalos.deckLitUntilDeg). A line that went quiet at the witness's own sunset while
    // the sky still had a pillar standing in it would be the text and the picture disagreeing,
    // which is the one failure a line like this exists to prevent.
    if (sourceAltitudeDeg <= -deckLitUntilDeg) return []
    const forms: HaloForm[] = [IceHalos.halo22(), IceHalos.halo46()]
    // Everything that stands at the source's OWN height goes under the horizon with it, while the
    // rings and the arcs above them keep their tops in the sky.
    const parhelia = sourceAltitudeDeg > 0 ? IceHalos.parheliaDistanceDeg(sourceAltitudeDeg) : undefined
    if (parhelia !== undefined) {
      forms.push({
        id: "parhelia",
        angleDeg: parhelia,
        redAngleDeg: parhelia,
        blueAngleDeg: IceHalos.parheliaDistanceDeg(sourceAltitudeDeg, IceHalos.ICE_INDEX_BLUE)
      })
    }
    // The arc tangent to the top of the common ring, thrown by columns rolling with their long axis
    // level. It touches the ring wherever the ring is, so it has the ring's own angle; what changes
    // with the source's height is its shape, from a pair of wings at sunrise to a closed loop about
    // the Sun by mid-morning.
    forms.push({ id: "tangentArc", angleDeg: IceHalos.halo22().angleDeg })
    // The white circle that runs right round the sky at the source's own height, off the vertical
    // faces of level plates. No refraction, so no colour and no angle of its own: it is everywhere
    // at that altitude, and it is what makes a witness say the light "followed" them.
    if (sourceAltitudeDeg > 0) forms.push({ id: "parhelicCircle", angleDeg: sourceAltitudeDeg })
    const circumzenithal = IceHalos.circumzenithalAltitudeDeg(sourceAltitudeDeg)
    if (circumzenithal !== undefined) forms.push({ id: "circumzenithal", angleDeg: circumzenithal })
    // Its mirror image, and the reason both are listed by their own condition rather than together:
    // one is impossible above 32 degrees and the other impossible below 58, so no sky ever shows
    // both, and any code that offered both would be describing a sky that cannot exist.
    if (sourceAltitudeDeg > IceHalos.PLATE_END_FACE_LIMIT_DEG) forms.push({ id: "circumhorizontal" })
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
