import type { DecorRoof } from "../../engine/model/Decor.js"
import { BuildingMaterials } from "./BuildingMaterials.js"
import type { SurveyedBuilding } from "./SurroundingsProvider.js"

/** What the laser measured round a place: heights above the ground, and which pixels are plants. Row after row from the north-west. */
export interface RoofHeights {
  size: number
  metresPerPixel: number
  heights: Float32Array
  /** Non-zero where the pixel is a plant: a crown over a roof says nothing of the roof. */
  vegetation: Uint8Array
}

/** An aerial photograph of the same square: `samples` values a pixel (red, green, blue, perhaps more), row after row from the north-west. */
export interface RoofPhoto {
  size: number
  metresPerPixel: number
  samples: number
  values: ArrayLike<number>
}

/**
 * The shape and the colour of a roof, read off what surveys say of the building under it.
 *
 * A survey outlines a building and gives it a height, which draws a box. The laser saw the roof itself: along a line across a house with a
 * pitched roof the heights climb from the eaves to a ridge and come down again, a flat roof (a shop, a block of flats) stays at one level.
 * So the roof is read from how the heights are spread inside the outline:
 *
 * - the eaves are the low end and the ridge the high end of the heights (not the extremes, which are chimneys, antennas and a crown that
 *   overhangs), and the difference is how far the roof rises;
 * - a roof that rises by less than a storey's tenth is flat, and the box stays;
 * - across the building, from one long side to the other, a gable roof is higher in the middle than at the sides while along its ridge it
 *   stays level; a hip roof also falls away at both ends. Anything else (a roof sloping one way, a complicated one) stays a box: a wrong
 *   ridge is worse than none.
 *
 * The colour is the median of the photograph under the outline, without its greens: a roof under a tree is not green. The photograph is
 * taken in sunlight, so its tiles are as bright as the sun made them; the median is lifted a little so that the sun and the sky of the
 * scene, which light it again, do not darken it twice.
 *
 * Both are measured, neither is invented: where the laser or the photograph does not reach (or says too little), the roof is left unsaid.
 */
export class RoofShapes {
  /** A roof that rises less than this is flat: noise, a parapet, a lift shaft. */
  private static readonly MIN_RISE_M = 1.2
  /** The lowest the eaves of a building are: a storey, less than which the outline holds ground. */
  private static readonly MIN_EAVES_M = 2.5
  /** At least this part of the footprint must be seen by the laser, without a plant over it. */
  private static readonly MIN_SEEN = 0.35
  /** No data: what the height model says where the laser has not flown. */
  private static readonly NO_DATA = -9999
  /** Rows of samples across and along the building: enough to see a ridge, few enough to be quick for hundreds of buildings. */
  private static readonly BANDS = 7
  /** The edge of a building is walls, shadow and gutters: this much of it, in metres, is left out. */
  private static readonly INSET_M = 0.9
  /** What a roof is lifted by, see the class comment. */
  private static readonly LIFT = 1.18
  /** A band the middle of the roof must stand above the side ones by, as a part of the rise, to be a ridge: and one below which it is level. */
  private static readonly PEAK = 0.3
  private static readonly LEVEL = 0.45

  /** The buildings as they are, each with the roof the surveys say, where they say one. */
  static fit(buildings: SurveyedBuilding[], laser: RoofHeights | undefined, photo: RoofPhoto | undefined): SurveyedBuilding[] {
    if (!laser && !photo && !buildings.some(building => building.roofMaterial)) return buildings
    return buildings.map(building => {
      const shape = laser ? RoofShapes.shapeOf(building, laser) : undefined
      // The photograph where there is one, else the material the map states.
      const color = (photo ? RoofShapes.colorOf(building, photo) : undefined) ?? BuildingMaterials.roofColor(building.roofMaterial)
      if (!shape && !color) return building
      const roof: DecorRoof = { shape: shape?.shape ?? "flat", ...(shape?.ridge === "depth" ? { ridge: "depth" as const } : {}), riseM: shape?.riseM ?? 0, ...(color ? { color } : {}) }
      // The height to the ridge: what the laser saw, where the roof is pitched, since the outline's own height is for a box.
      const heightM = shape && shape.shape !== "flat" ? shape.topM : building.heightM
      return { ...building, heightM, roof }
    })
  }

  /** Where a point of the building (metres across its width and along its depth from its middle) is, east and north of the centre of the grids. */
  private static world(building: SurveyedBuilding, across: number, along: number): { east: number, north: number } {
    const heading = building.headingDeg * Math.PI / 180
    // The width runs a quarter turn after the heading (the side a building faces is its depth, see SurveyedBuilding.headingDeg).
    return {
      east: building.eastM + across * Math.cos(heading) + along * Math.sin(heading),
      north: building.northM - across * Math.sin(heading) + along * Math.cos(heading)
    }
  }

  /** The heights the laser saw over the building, in bands across and along it: undefined where it saw too little of it. */
  private static shapeOf(building: SurveyedBuilding, laser: RoofHeights): { shape: DecorRoof["shape"], ridge?: DecorRoof["ridge"], riseM: number, topM: number } | undefined {
    const bands = RoofShapes.BANDS
    const step = Math.max(laser.metresPerPixel, 0.5)
    const halfWidth = building.widthM / 2 - RoofShapes.INSET_M
    const halfDepth = building.lengthM / 2 - RoofShapes.INSET_M
    if (halfWidth <= 0 || halfDepth <= 0) return undefined
    const all: number[] = []
    const across = Array.from({ length: bands }, () => ({ sum: 0, n: 0 }))
    const along = Array.from({ length: bands }, () => ({ sum: 0, n: 0 }))
    let tried = 0
    for (let a = -halfWidth; a <= halfWidth; a += step) {
      for (let d = -halfDepth; d <= halfDepth; d += step) {
        tried++
        const { east, north } = RoofShapes.world(building, a, d)
        const x = Math.floor(east / laser.metresPerPixel + laser.size / 2)
        const y = Math.floor(laser.size / 2 - north / laser.metresPerPixel)
        if (x < 0 || y < 0 || x >= laser.size || y >= laser.size) continue
        const at = y * laser.size + x
        const height = laser.heights[at]
        if (laser.vegetation[at] || height === RoofShapes.NO_DATA || !(height > 0)) continue
        all.push(height)
        const column = across[Math.min(bands - 1, Math.floor((a + halfWidth) / (2 * halfWidth) * bands))]
        const row = along[Math.min(bands - 1, Math.floor((d + halfDepth) / (2 * halfDepth) * bands))]
        column.sum += height; column.n++
        row.sum += height; row.n++
      }
    }
    if (tried === 0 || all.length / tried < RoofShapes.MIN_SEEN) return undefined
    all.sort((p, q) => p - q)
    const eaves = RoofShapes.percentile(all, 0.08)
    const top = RoofShapes.percentile(all, 0.92)
    const rise = top - eaves
    // Walls are at least a storey, and a roof no steeper than it is wide: lower or steeper is an outline bigger than the roof it holds (a yard).
    if (eaves < RoofShapes.MIN_EAVES_M || rise > Math.min(building.widthM, building.lengthM)) return undefined
    if (rise < RoofShapes.MIN_RISE_M) return { shape: "flat", riseM: 0, topM: top }
    // The profile of the roof across the building (from one long side to the other, a column of the width) and along it.
    const profileAlongWidth = RoofShapes.profile(across)
    const profileAlongDepth = RoofShapes.profile(along)
    if (!profileAlongWidth || !profileAlongDepth) return undefined
    // A ridge runs along one side of the building: across it the middle stands above the sides, and along it the roof stays level. Either
    // side can be the one, a roof of a town being as likely to run along the street as across it.
    const peakAcross = RoofShapes.peak(profileAlongDepth) / rise
    const peakAlong = RoofShapes.peak(profileAlongWidth) / rise
    const levelAlongWidth = RoofShapes.spread(profileAlongWidth) / rise
    const levelAlongDepth = RoofShapes.spread(profileAlongDepth) / rise
    const gableAlongWidth = peakAcross >= RoofShapes.PEAK && levelAlongWidth <= RoofShapes.LEVEL
    const gableAlongDepth = peakAlong >= RoofShapes.PEAK && levelAlongDepth <= RoofShapes.LEVEL
    if (gableAlongWidth && (!gableAlongDepth || peakAcross >= peakAlong)) return { shape: "gable", ridge: "width", riseM: rise, topM: top }
    if (gableAlongDepth) return { shape: "gable", ridge: "depth", riseM: rise, topM: top }
    if (peakAcross >= RoofShapes.PEAK && peakAlong >= RoofShapes.PEAK / 2) return { shape: "hip", ridge: "width", riseM: rise, topM: top }
    return undefined
  }

  /** The mean of each band, undefined when too few bands were seen to say anything. */
  private static profile(bands: { sum: number, n: number }[]): number[] | undefined {
    const means = bands.map(band => band.n > 0 ? band.sum / band.n : NaN)
    return means.filter(Number.isFinite).length >= bands.length - 1 ? means.map((mean, i) => Number.isFinite(mean) ? mean : RoofShapes.neighbour(means, i)) : undefined
  }

  private static neighbour(means: number[], i: number): number {
    return Number.isFinite(means[i - 1]) ? means[i - 1] : means[i + 1]
  }

  /** How far the middle of a profile stands above its two ends. */
  private static peak(profile: number[]): number {
    const third = Math.max(1, Math.floor(profile.length / 3))
    const mean = (values: number[]): number => values.reduce((sum, v) => sum + v, 0) / values.length
    const ends = [...profile.slice(0, third), ...profile.slice(profile.length - third)]
    return mean(profile.slice(third, profile.length - third)) - mean(ends)
  }

  /** How far a profile wanders from its own mean: the highest above the lowest. */
  private static spread(profile: number[]): number {
    return Math.max(...profile) - Math.min(...profile)
  }

  private static percentile(sorted: number[], fraction: number): number {
    return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))]
  }

  /** The colour of the roof in the photograph, "#rrggbb": the median of what is not green, lifted; undefined where it is not seen. */
  private static colorOf(building: SurveyedBuilding, photo: RoofPhoto): string | undefined {
    const step = Math.max(photo.metresPerPixel, 0.5)
    const halfWidth = Math.max(building.widthM / 2 - RoofShapes.INSET_M, step)
    const halfDepth = Math.max(building.lengthM / 2 - RoofShapes.INSET_M, step)
    const red: number[] = []
    const green: number[] = []
    const blue: number[] = []
    for (let a = -halfWidth; a <= halfWidth; a += step) {
      for (let d = -halfDepth; d <= halfDepth; d += step) {
        const { east, north } = RoofShapes.world(building, a, d)
        const x = Math.floor(east / photo.metresPerPixel + photo.size / 2)
        const y = Math.floor(photo.size / 2 - north / photo.metresPerPixel)
        if (x < 0 || y < 0 || x >= photo.size || y >= photo.size) continue
        const at = (y * photo.size + x) * photo.samples
        const r = photo.values[at]
        const g = photo.values[at + 1]
        const b = photo.values[at + 2]
        // A plant over the roof, or a lawn in a courtyard.
        if (g > r && g > b) continue
        red.push(r); green.push(g); blue.push(b)
      }
    }
    if (red.length === 0) return undefined
    const median = (values: number[]): number => values.sort((p, q) => p - q)[Math.floor(values.length / 2)]
    const hex = (value: number): string => Math.min(255, Math.round(value * RoofShapes.LIFT)).toString(16).padStart(2, "0")
    return `#${hex(median(red))}${hex(median(green))}${hex(median(blue))}`
  }
}
