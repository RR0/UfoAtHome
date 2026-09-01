/**
 * How much of a beam a surface turns back, and how much it lets through.
 *
 * One law, wanted by both families this project traces: light meeting the face of an ice crystal
 * and light meeting the surface of a raindrop obey the same arithmetic, and the places it decides
 * the outcome are the same in both. It is why the outer edge of a halo fades rather than ending;
 * why a grazing ray gives almost all of itself to the mirror image instead of the refracted one;
 * why the secondary rainbow is several times fainter than the primary, having had to survive two
 * internal reflections that each let most of the light out.
 *
 * Unpolarised, which is to say the mean of the two polarisations rather than either. Real bows are
 * strongly polarised — a raindrop reflects internally near Brewster's angle, so the primary is
 * almost completely polarised tangentially — and nothing here or downstream carries that, since
 * neither an eye nor this project's screen does anything with it.
 */
export class Fresnel {
  /**
   * The share of a beam reflected at a face, from the cosine of the angle it makes with the normal
   * on the side it arrives from.
   *
   * Returns 1 exactly when the beam cannot leave at all — total internal reflection, which is what
   * traps light inside a crystal for the halo forms that need a bounce, and what makes a drop's
   * higher-order bows keep so much of their light.
   */
  static reflectance(cosIncident: number, fromIndex: number, toIndex: number): number {
    const ratio = fromIndex / toIndex
    const sineOut = ratio * Math.sqrt(Math.max(0, 1 - cosIncident * cosIncident))
    if (sineOut >= 1) return 1
    const cosOut = Math.sqrt(Math.max(0, 1 - sineOut * sineOut))
    const parallel = (toIndex * cosIncident - fromIndex * cosOut) / (toIndex * cosIncident + fromIndex * cosOut)
    const perpendicular = (fromIndex * cosIncident - toIndex * cosOut) / (fromIndex * cosIncident + toIndex * cosOut)
    return (parallel * parallel + perpendicular * perpendicular) / 2
  }
}
