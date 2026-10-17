import { IceHalos } from "./IceHalos.js"

/** The optical features a reader can point at in an ice display. */
export type OpticsFeatureId =
  | "halo22"
  | "halo46"
  | "oddRadius"
  | "parhelion"
  | "parhelion120"
  | "upperTangentArc"
  | "lowerTangentArc"
  | "circumzenithal"
  | "circumhorizontal"
  | "parhelicCircle"
  | "pillar"
  | "subsun"

/** What a pointer found: which feature, and the angle that goes with it where it has one (the
 * radius of a ring, in degrees). */
export interface OpticsFeature {
  id: OpticsFeatureId
  angleDeg?: number
}

/**
 * Names the optical feature at a point of the sky, by where it is — and only if the display really
 * has light there.
 *
 * Two questions, kept apart on purpose. WHERE a feature stands is geometry, and every number here
 * comes from the same formulas the display is built from (IceHalos), not from a table of places.
 * WHETHER it is there is not geometry at all: it depends on how steadily the crystals fell, how
 * many of the rare kinds there were, how high the source stands. That one is answered by the traced
 * display itself, through `radiance`, so a tooltip never names an arc the picture does not show and
 * never stays silent over one it does.
 *
 * The first candidate whose place fits AND whose light stands out is the answer, most specific
 * first: a sundog sits on the parhelic circle and on the sky near the ring, and is a sundog.
 */
export class HaloFeatures {
  /** The wedge angles of a pyramid-ended crystal whose minimum deviations are well clear of the 22
   * and 46 degree rings, and which the trace shows: 28 degrees gives 9, 56 gives 20, 80 gives 35. */
  private static readonly ODD_RADIUS_WEDGES_DEG = [28, 56, 80]

  /** How much brighter than its surroundings a spot has to be to count as part of the display. */
  private static readonly STANDS_OUT = 1.5
  /** How far round a spot its surroundings are taken, degrees. */
  private static readonly NEIGHBOURHOOD_DEG = 2.5

  /** The radii of the odd-radius rings, derived from the wedge angles and the index of ice. */
  static oddRadiiDeg(): number[] {
    const index = (IceHalos.ICE_INDEX_RED + IceHalos.ICE_INDEX_BLUE) / 2
    return HaloFeatures.ODD_RADIUS_WEDGES_DEG.map(wedge => IceHalos.minimumDeviationDeg(wedge, index)).filter(
      radius => Number.isFinite(radius)
    )
  }

  /**
   * @param sourceAltitudeDeg how high the Sun or Moon stands
   * @param altitudeDeg       how high the pointed spot is
   * @param aroundDeg         how far round from the source's bearing, 0 to 180
   * @param radiance          the display's light at an altitude and a bearing offset (same frame)
   */
  static at(
    sourceAltitudeDeg: number,
    altitudeDeg: number,
    aroundDeg: number,
    radiance: (altitudeDeg: number, aroundDeg: number) => number
  ): OpticsFeature | undefined {
    const rad = Math.PI / 180
    const h = sourceAltitudeDeg
    const around = Math.abs(aroundDeg)
    const cosSep =
      Math.sin(h * rad) * Math.sin(altitudeDeg * rad) +
      Math.cos(h * rad) * Math.cos(altitudeDeg * rad) * Math.cos(around * rad)
    const separation = Math.acos(Math.max(-1, Math.min(1, cosSep))) / rad
    // Where the spot lies round the source, from straight up: 0 above it, 180 below it.
    const positionAngle =
      Math.atan2(
        Math.sin(around * rad) * Math.cos(altitudeDeg * rad),
        Math.cos(h * rad) * Math.sin(altitudeDeg * rad) - Math.sin(h * rad) * Math.cos(altitudeDeg * rad) * Math.cos(around * rad)
      ) / rad
    const level = Math.abs(altitudeDeg - h)

    const standsOut = () => {
      const centre = radiance(altitudeDeg, around)
      if (!(centre > 0)) return false
      const step = HaloFeatures.NEIGHBOURHOOD_DEG
      const widen = 1 / Math.max(0.2, Math.cos(altitudeDeg * rad))
      const around4 = [
        radiance(altitudeDeg + step, around),
        radiance(altitudeDeg - step, around),
        radiance(altitudeDeg, around + step * widen),
        radiance(altitudeDeg, Math.max(0, around - step * widen))
      ].sort((a, b) => a - b)
      // The second darkest of the four, not their middle: a ring has two neighbours ON it and two
      // across it, a sundog or an arc has four off it, and only "not as bright across the ring as
      // on it" says there is a feature there at all. The darkest alone would be fooled by one stray
      // grain of the trace.
      return centre > around4[1] * HaloFeatures.STANDS_OUT
    }
    // The light of the 22 degree ring's own body at this separation, away from the spot: what a
    // sundog or an arc riding on the ring has to out-shine to be called one and not part of it.
    const ringBody = () => {
      const place = (rollDeg: number) => {
        const s = separation * rad
        const r = rollDeg * rad
        const x = Math.cos(s) * Math.cos(h * rad) - Math.sin(s) * Math.cos(r) * Math.sin(h * rad)
        const y = Math.sin(s) * Math.sin(r)
        const z = Math.cos(s) * Math.sin(h * rad) + Math.sin(s) * Math.cos(r) * Math.cos(h * rad)
        return radiance(Math.asin(Math.max(-1, Math.min(1, z))) / rad, Math.abs(Math.atan2(y, x) / rad))
      }
      return (place(70) + place(110) + place(250) + place(290)) / 4
    }
    const claim = (feature: OpticsFeature, overRing = 0): OpticsFeature | undefined => {
      if (!standsOut()) return undefined
      return overRing > 0 && !(radiance(altitudeDeg, around) > ringBody() * overRing) ? undefined : feature
    }

    // The sundogs: at the source's own height, a little beyond the ring's distance, with a tail
    // streaming away from the source.
    if (h > 0 && h < IceHalos.PARHELIA_MAX_SUN_ALTITUDE_DEG && level < 2.5) {
      const swing = IceHalos.parheliaAzimuthDeg(h)
      if (swing !== undefined && around >= swing - 1.2 && around <= swing + 7) {
        const found = claim({ id: "parhelion", angleDeg: IceHalos.parheliaDistanceDeg(h) }, 2.5)
        if (found) return found
      }
    }
    // The white spots 120 degrees round, on the same circle.
    if (h > 0 && level < 2.5 && Math.abs(around - 120) < 4) {
      const found = claim({ id: "parhelion120", angleDeg: 120 }, 0)
      if (found) return found
    }
    // The arc near the zenith, and its mirror when the source is high.
    const zenithal = IceHalos.circumzenithalAltitudeDeg(h)
    if (zenithal !== undefined && altitudeDeg > zenithal - 2 && altitudeDeg < zenithal + 4) {
      const found = claim({ id: "circumzenithal", angleDeg: zenithal })
      if (found) return found
    }
    if (h > IceHalos.PLATE_END_FACE_LIMIT_DEG) {
      const mirrored = IceHalos.circumzenithalAltitudeDeg(90 - h)
      if (mirrored !== undefined) {
        const altitude = 90 - mirrored
        if (altitudeDeg > altitude - 4 && altitudeDeg < altitude + 2) {
          const found = claim({ id: "circumhorizontal", angleDeg: altitude })
          if (found) return found
        }
      }
    }
    // The shaft of light above (and the mock sun below) on the source's own bearing.
    if (around < 3 && h > 0) {
      if (altitudeDeg > h + 3 && altitudeDeg < h + 25 && h < IceHalos.PILLAR_MAX_SOURCE_ALTITUDE_DEG) {
        const found = claim({ id: "pillar" })
        if (found) return found
      }
      if (Math.abs(altitudeDeg + h) < 3) {
        const found = claim({ id: "subsun" })
        if (found) return found
      }
    }
    // The arcs riding on the ring's top and bottom.
    const ring = IceHalos.halo22()
    if (separation > ring.redAngleDeg! - 0.6 && separation < ring.blueAngleDeg! + 2.5) {
      const upper = Math.abs(positionAngle) < 50
      const lower = Math.abs(positionAngle) > 130
      if (upper || lower) {
        const found = claim({ id: upper ? "upperTangentArc" : "lowerTangentArc", angleDeg: ring.angleDeg }, 1.5)
        if (found) return found
      }
    }
    // The rarer rings, from crystals with pyramid ends.
    for (const radius of HaloFeatures.oddRadiiDeg()) {
      if (separation > radius - 0.6 && separation < radius + 1.8) {
        const found = claim({ id: "oddRadius", angleDeg: radius })
        if (found) return found
      }
    }
    if (separation > ring.redAngleDeg! - 0.6 && separation < ring.blueAngleDeg! + 2.5) {
      const found = claim({ id: "halo22", angleDeg: ring.angleDeg })
      if (found) return found
    }
    const big = IceHalos.halo46()
    if (separation > big.redAngleDeg! - 0.6 && separation < big.blueAngleDeg! + 3) {
      const found = claim({ id: "halo46", angleDeg: big.angleDeg })
      if (found) return found
    }
    // The white circle at the source's height, wherever nothing more specific stands on it.
    if (h > 0 && level < 1.2) {
      // A circle is a ridge across the altitude and nothing along the bearing, so it is the two
      // sides ABOVE and BELOW that have to be dark: both of them, well clear.
      const centre = radiance(altitudeDeg, around)
      const ridge = Math.max(radiance(altitudeDeg + 3, around), radiance(altitudeDeg - 3, around))
      if (centre > 0 && centre > ridge * 2) return { id: "parhelicCircle", angleDeg: h }
    }
    return undefined
  }
}
