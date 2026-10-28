import { MirrorVote } from "./MirrorVote.js"

/** The pixels of a picture, RGBA, as a canvas gives them. */
export interface PicturePixels {
  width: number
  height: number
  data: Uint8ClampedArray | Uint8Array
}

/** A small bright spot of a picture: a light, or what may be the ghost of one. */
export interface PictureSpot {
  /** Its centre, pixels from the picture's top-left corner. */
  x: number
  y: number
  /** Its brightest luminance, 0 to 255, how far it stands out from what is round it, and what is round it. */
  peak: number
  contrast: number
  background: number
  /** How wide it is, pixels: the radius of what is brighter than half its contrast. */
  radius: number
  /** Its colour, the mean of what it covers, 0 to 255 per channel. */
  color: [number, number, number]
}

/** A ghost found, and the light it is the ghost of. */
export interface GhostPair {
  ghost: PictureSpot
  light: PictureSpot
  /** How far the ghost is from where the centre and the scale found put the ghost of that light, pixels. */
  residualPx: number
}

/**
 * What a picture says of the ghosts of the lens it was taken with (see LensGhost): the lights in it, the spots that are their ghosts and
 * whose, and the point of the picture they lie across — the lens's axis.
 */
export interface GhostSearch {
  width: number
  height: number
  /** The bright lights of the picture: what can have ghosts. */
  lights: PictureSpot[]
  /** Every small spot that stands out: what can be a ghost. */
  spots: PictureSpot[]
  pairs: GhostPair[]
  /** The lens's axis in the picture, when ghosts were found. */
  centre?: { x: number, y: number }
  /** Where a ghost lies as a multiple of its light's offset from the centre: -1 mirrored through it, as most are. */
  scale?: number
  /** Whether the centre is far enough from the picture's own for the picture to have been cropped, or framed off its lens's axis. */
  cropped?: boolean
  /**
   * How sure the finding is. "high": three ghosts or more agree on one centre, clearly better than the same search does on the picture's
   * spots turned over, which is what chance does there. "low": two that do so, or the ghost of one of the picture's great lights alone, near
   * enough to where it mirrors through the picture's centre that chance would hardly put a spot as bright there. "none": nothing better
   * than chance.
   */
  confidence: "high" | "low" | "none"
}

/**
 * Finds the ghosts of the lens in a picture: the faint spots that lie across one point of it from its lights, each at the same multiple of
 * its light's offset from that point — which is what tells a ghost from a light (see LensGhost). Most are mirrored through it, the ghosts a
 * phone's sensor or a filter sends back; so that is looked for first, and any other scale has to show more of them.
 *
 * The spots are found as local maxima that stand out from the ring round them; the brightest are the lights. Every faint spot and every
 * light it is fainter than vote for the centre they would imply, the votes are counted on a grid, and the best few centres are tried: each
 * spot that lands on a light from there is a ghost, the centre and the scale are refitted on those, and the one that explains most ghosts
 * (and best) is kept.
 */
export class GhostFinder {
  /** Scales tried after -1: the other ghosts of a lens, on either side of the centre. */
  private static readonly OTHER_SCALES = [-2, -1.8, -1.6, -1.4, -1.3, -1.2, -1.1, -0.9, -0.8, -0.7, -0.6, -0.5, -0.4, -0.3, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8]
  /** What a ghost's surroundings must be darker than to be looked at, luminance 0 to 255. */
  private static readonly DARK = 80
  /** How far a light larger than a lamp must stand out from what is round it, and a ghost as bright as a light, luminance 0 to 255. */
  private static readonly LARGE_LIGHT_CONTRAST = 80
  /** How much smaller than the largest light a spot as bright as a light must be to be taken for a ghost of it. */
  private static readonly DOMINATED = 0.4
  /** The grid of centres tried round the picture's own at the scale of -1: its step, in tolerances (a fit started within it finds the
   * centre, see fit), and how far it reaches, as a share of the diagonal. */
  private static readonly GRID_STEP = 2
  private static readonly GRID_REACH = 0.12
  /** How much better than the same search on the spots turned over (their mean) a finding of two ghosts or more must do. */
  private static readonly ABOVE_CHANCE = 1.5
  /** How many of the picture's greatest lights a lone ghost is looked for, and how far from their mirror image, as a share of the diagonal. */
  private static readonly GREAT_LIGHTS = 3
  private static readonly LONE_REACH = 0.15
  /** How many spots chance may be expected to put as near for a lone ghost to be taken. */
  private static readonly CHANCE_ALONE = 0.5
  /** How far the axis is from the picture's centre, as a share of the diagonal, for the picture to be said cropped. */
  private static readonly CROPPED = 0.04
  /** How sharply the pixels' votes must peak for their axis to be taken (see MirrorVote). */
  private static readonly SHARP_MIRROR = 1.5
  /** How many of a ghost's pixels must match its light's, mirrored, for its shape to be taken as matched (see MirrorVote.matched). */
  private static readonly SHAPE_MATCHED = 25
  /** How many spots are considered at most, the ones that stand out most. */
  private static readonly MAX_SPOTS = 2000

  static find(pixels: PicturePixels): GhostSearch {
    const { width, height } = pixels
    const diagonal = Math.hypot(width, height)
    const spots = GhostFinder.spotsOf(pixels)
    const brightest = spots.reduce((max, spot) => Math.max(max, spot.peak), 0)
    // A light is a small bright spot that stands out: a lamp, not the glare of a lit facade or a detail of a white dome. A large one has to
    // stand out all the more: the sun low in the picture does, a lit facade does not.
    const lights = spots.filter(spot => spot.peak >= Math.min(235, 0.9 * brightest)
      && (spot.radius <= 0.025 * diagonal ? spot.contrast >= 40 : spot.contrast >= GhostFinder.LARGE_LIGHT_CONTRAST))
    const largest = lights.reduce((max, light) => Math.max(max, light.radius), 0)
    // A ghost that shows is a faint spot on something dark: on a lit facade it would be lost, and the facade's own details (its windows,
    // its lamps' glare) are the spots chance lines up with lights. Or, of a light as bright as the sun, a spot as bright as a lamp itself
    // that stands out of the sky round it: one far smaller than that light.
    const candidates = spots.filter(spot => lights.includes(spot)
      ? spot.radius <= GhostFinder.DOMINATED * largest && spot.contrast >= GhostFinder.LARGE_LIGHT_CONTRAST
      : spot.background < GhostFinder.DARK && spot.peak >= 2 * spot.background)
    const none: GhostSearch = { width, height, lights, spots, pairs: [], confidence: "none" }
    // Ghosts that are no spot (a lamp's ghost as a large pale disc, a lit pier's as the pier upside down) are found from the pixels.
    const mirrored = () => GhostFinder.mirrored(pixels, lights, spots)
    if (lights.length === 0 || candidates.length === 0) return mirrored() ?? none
    const tolerance = 0.006 * diagonal
    type Fit = { pairs: GhostPair[], centre: { x: number, y: number }, scale: number, error: number, score: number }
    // Each pair counts for how exactly it lines up: lights in a regular row (a street's lamps, a front's) also pair each ghost with the next
    // lamp from a centre half a spacing off, roughly — it is the exactness that tells the true centre.
    const scoreOf = (pairs: GhostPair[]) => pairs.reduce((sum, pair) => sum + Math.max(0, 1 - pair.residualPx / tolerance) ** 2, 0)
    // Near the picture's centre, where most axes are, every point of a grid is tried as well as the voted ones: a regular row of lamps
    // pulls the votes to an axis half a spacing off, and the true one may then be no voted cell, as the Capitol's was at some sizes.
    const step = GhostFinder.GRID_STEP * tolerance, reach = GhostFinder.GRID_REACH * diagonal
    const grid: { x: number, y: number }[] = []
    for (let y = height / 2 - reach; y <= height / 2 + reach; y += step) {
      for (let x = width / 2 - reach; x <= width / 2 + reach; x += step) grid.push({ x, y })
    }
    const bestAt = (scale: number, among = candidates): Fit | undefined => {
      let best: Fit | undefined
      for (const centre of [...GhostFinder.voted(among, lights, scale, width, height), ...(scale === -1 ? grid : [])]) {
        const fit = GhostFinder.fit(among, lights, centre, scale, tolerance)
        if (!fit) continue
        const score = scoreOf(fit.pairs)
        if (!best || score > best.score) best = { ...fit, scale, score }
      }
      return best
    }
    let best = bestAt(-1)
    // Another scale has to explain clearly more: chance lines spots up at some scale of the twenty tried far more easily than at the one
    // most ghosts have.
    for (const scale of GhostFinder.OTHER_SCALES) {
      const fit = bestAt(scale)
      const beaten = best?.pairs.length ?? 0
      if (fit && fit.pairs.length >= Math.max(3, 1.5 * beaten, beaten + 2) && fit.score > (best?.score ?? 0)) best = fit
    }
    // What chance does in this very picture: the same search with the spots turned over, which keeps how many there are and where they
    // crowd but undoes any line through an axis. A busy picture (a building's windows under a lit sky) lines a few up anywhere; only
    // what does clearly better than that is a finding.
    let some: GhostSearch | undefined
    if (best && best.pairs.length >= 2) {
      const scale = best.scale
      // Their mean: the best of a few such searches swings with the picture's least pixel (its colours as one canvas or another reads
      // them), and took the Capitol's eight ghosts for chance.
      const turned = [[-1, 1], [1, -1], [-1, -1]].map(([fx, fy]) => bestAt(scale, candidates.map(spot => ({
        ...spot,
        x: fx < 0 ? width - spot.x : spot.x,
        y: fy < 0 ? height - spot.y : spot.y
      })))?.score ?? 0)
      const chance = turned.reduce((sum, score) => sum + score, 0) / turned.length
      if (best.score > GhostFinder.ABOVE_CHANCE * chance) {
        const offCentre = Math.hypot(best.centre.x - width / 2, best.centre.y - height / 2) / diagonal
        some = {
          width, height, lights, spots, pairs: best.pairs, centre: best.centre, scale: best.scale, cropped: offCentre > GhostFinder.CROPPED,
          confidence: best.pairs.length >= 3 ? "high" : "low"
        }
        if (some.confidence === "high") return some
      }
    }
    return mirrored() ?? some ?? GhostFinder.loneGhost(spots, lights, candidates, width, height, tolerance) ?? none
  }

  /**
   * The ghosts the pixels vote for (see MirrorVote), as a search: sure of them when two or more stand across one sharp peak of the votes, or
   * one whose whole shape matches its light's (a lit pier upside down), not a point that chance can put anywhere.
   */
  private static mirrored(pixels: PicturePixels, lights: PictureSpot[], spots: PictureSpot[]): GhostSearch | undefined {
    const found = MirrorVote.find(pixels, GhostFinder.SHARP_MIRROR)
    if (!found) return undefined
    const { width, height } = pixels
    const offCentre = Math.hypot(found.centre.x - width / 2, found.centre.y - height / 2) / Math.hypot(width, height)
    return {
      width, height, lights, spots, pairs: found.pairs, centre: found.centre, scale: -1, cropped: offCentre > GhostFinder.CROPPED,
      confidence: found.pairs.length >= 2 || found.matched >= GhostFinder.SHAPE_MATCHED ? "high" : "low"
    }
  }

  /**
   * The ghost of one of the picture's great lights alone (the sun low over a town, a street lamp at night): the spot that stands out most
   * near where that light mirrors through the picture's centre — a lens's axis, unless the picture was cropped. Taken as a possible ghost
   * ("low") when chance would hardly put a spot standing out as much that near: fewer than CHANCE_ALONE of them expected there, given how many
   * the picture has.
   */
  private static loneGhost(spots: PictureSpot[], lights: PictureSpot[], candidates: PictureSpot[], width: number, height: number, tolerance: number):
    GhostSearch | undefined {
    const diagonal = Math.hypot(width, height)
    const greatest = [...lights].sort((a, b) => b.contrast * b.radius ** 2 - a.contrast * a.radius ** 2).slice(0, GhostFinder.GREAT_LIGHTS)
    let best: { pair: GhostPair, chance: number } | undefined
    for (const light of greatest) {
      const mirror = { x: width - light.x, y: height - light.y }
      const near = candidates.filter(spot => GhostFinder.canBeGhostOf(spot, light)
        && Math.hypot(spot.x - mirror.x, spot.y - mirror.y) <= GhostFinder.LONE_REACH * diagonal
        && Math.hypot(spot.x - light.x, spot.y - light.y) >= 4 * Math.max(spot.radius, light.radius))
      if (near.length === 0) continue
      const ghost = near.reduce((most, spot) => spot.contrast > most.contrast ? spot : most)
      const asStrong = candidates.filter(spot => spot.contrast >= ghost.contrast && GhostFinder.canBeGhostOf(spot, light)).length
      const distance = Math.hypot(ghost.x - mirror.x, ghost.y - mirror.y) + tolerance
      const chance = asStrong * Math.PI * distance ** 2 / (width * height)
      if (!best || chance < best.chance) best = { pair: { ghost, light, residualPx: 0 }, chance }
    }
    if (!best || best.chance >= GhostFinder.CHANCE_ALONE) return undefined
    const { ghost, light } = best.pair
    const centre = { x: (ghost.x + light.x) / 2, y: (ghost.y + light.y) / 2 }
    const offCentre = Math.hypot(centre.x - width / 2, centre.y - height / 2) / diagonal
    return { width, height, lights, spots, pairs: [best.pair], centre, scale: -1, cropped: offCentre > GhostFinder.CROPPED, confidence: "low" }
  }

  /** The lights by cells of the widest reach a fit looks in (see fit), kept for each set of lights and reach: a fit is tried at many centres. */
  private static readonly lightCells = new WeakMap<PictureSpot[], { cell: number, cells: Map<number, PictureSpot[]> }>()

  /** The lights within a cell of a point, a cell being the reach: the only ones a fit can take for a ghost's there. */
  private static lightsNear(lights: PictureSpot[], cell: number): (x: number, y: number) => PictureSpot[] {
    let index = GhostFinder.lightCells.get(lights)
    if (!index || index.cell !== cell) {
      const cells = new Map<number, PictureSpot[]>()
      for (const light of lights) {
        const key = GhostFinder.cellKey(Math.floor(light.x / cell), Math.floor(light.y / cell))
        const list = cells.get(key)
        if (list) list.push(light)
        else cells.set(key, [light])
      }
      index = { cell, cells }
      GhostFinder.lightCells.set(lights, index)
    }
    const { cells } = index
    return (x, y) => {
      const i = Math.floor(x / cell), j = Math.floor(y / cell)
      const found: PictureSpot[] = []
      for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
        const list = cells.get(GhostFinder.cellKey(i + di, j + dj))
        if (list) found.push(...list)
      }
      return found
    }
  }

  /** One number for a cell, its column and row (a picture's few thousand pixels away from the origin either way at most). */
  private static cellKey(i: number, j: number): number {
    return (i + 50_000) * 100_000 + j + 50_000
  }

  /** Whether a spot can be the ghost of a light: another spot, fainter than it, or as bright (both saturated) but far smaller. */
  private static canBeGhostOf(ghost: PictureSpot, light: PictureSpot): boolean {
    return ghost !== light && (ghost.peak < light.peak - 5 || ghost.radius <= GhostFinder.DOMINATED * light.radius)
  }

  /** The centres the most pairs of a faint spot and a brighter light vote for at this scale, best first. */
  private static voted(candidates: PictureSpot[], lights: PictureSpot[], scale: number, width: number, height: number): { x: number, y: number }[] {
    const cell = 0.01 * Math.hypot(width, height)
    const votes = new Map<string, { count: number, x: number, y: number }>()
    for (const ghost of candidates) {
      for (const light of lights) {
        if (!GhostFinder.canBeGhostOf(ghost, light)) continue
        // ghost = c + k (light - c), so c = (ghost - k light) / (1 - k).
        const x = (ghost.x - scale * light.x) / (1 - scale), y = (ghost.y - scale * light.y) / (1 - scale)
        // A lens's axis is in the picture, or not far off it for a crop.
        if (x < -0.25 * width || x > 1.25 * width || y < -0.25 * height || y > 1.25 * height) continue
        if (Math.hypot(ghost.x - light.x, ghost.y - light.y) < 4 * Math.max(ghost.radius, light.radius)) continue
        const key = `${Math.floor(x / cell)},${Math.floor(y / cell)}`
        const vote = votes.get(key) ?? { count: 0, x: 0, y: 0 }
        vote.count++
        vote.x += x
        vote.y += y
        votes.set(key, vote)
      }
    }
    // Each cell with its neighbours', so that a centre on the edge of a cell is not split.
    const scored = [...votes.entries()].map(([key, vote]) => {
      const [i, j] = key.split(",").map(Number)
      let count = 0, x = 0, y = 0
      for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
        const near = votes.get(`${i + di},${j + dj}`)
        if (!near) continue
        count += near.count
        x += near.x
        y += near.y
      }
      return { count, centre: { x: x / count, y: y / count }, own: vote.count }
    })
    scored.sort((a, b) => b.count - a.count || b.own - a.own)
    return scored.filter(entry => entry.count >= 1).slice(0, 60).map(entry => entry.centre)
  }

  /**
   * The ghosts a centre and a scale explain: each spot whose light, from there, would be a light of the picture brighter than it, each light
   * taken once (by its nearest); then the centre refitted on them, the reach narrowed down to the tolerance. Undefined when it explains none.
   */
  private static fit(candidates: PictureSpot[], lights: PictureSpot[], start: { x: number, y: number }, scale: number, tolerance: number):
    { pairs: GhostPair[], centre: { x: number, y: number }, error: number } | undefined {
    let centre = start
    let pairs: GhostPair[] = []
    const near = GhostFinder.lightsNear(lights, 3 * tolerance)
    // Wide at first: a voted centre is only within a cell or two of the true one, and a light's place from it is off by (1 - 1/k) times that.
    for (const reach of [3, 2, 1, 1]) {
      const found: GhostPair[] = []
      for (const ghost of candidates) {
        // Where its light would be: ghost = c + k (light - c).
        const x = centre.x + (ghost.x - centre.x) / scale, y = centre.y + (ghost.y - centre.y) / scale
        let nearest: PictureSpot | undefined, distance = Infinity
        for (const light of near(x, y)) {
          if (!GhostFinder.canBeGhostOf(ghost, light)) continue
          const d = Math.hypot(light.x - x, light.y - y)
          if (d < distance) {
            distance = d
            nearest = light
          }
        }
        if (nearest && distance <= reach * tolerance && Math.hypot(ghost.x - nearest.x, ghost.y - nearest.y) >= 4 * Math.max(ghost.radius, nearest.radius)) {
          found.push({ ghost, light: nearest, residualPx: distance * Math.abs(scale) })
        }
      }
      // One ghost per light at one scale: the nearest.
      const byLight = new Map<PictureSpot, GhostPair>()
      for (const pair of found) {
        const kept = byLight.get(pair.light)
        if (!kept || pair.residualPx < kept.residualPx) byLight.set(pair.light, pair)
      }
      pairs = [...byLight.values()]
      if (pairs.length === 0) return undefined
      centre = {
        x: pairs.reduce((sum, pair) => sum + (pair.ghost.x - scale * pair.light.x) / (1 - scale), 0) / pairs.length,
        y: pairs.reduce((sum, pair) => sum + (pair.ghost.y - scale * pair.light.y) / (1 - scale), 0) / pairs.length
      }
    }
    for (const pair of pairs) {
      pair.residualPx = Math.hypot(pair.ghost.x - (centre.x + scale * (pair.light.x - centre.x)), pair.ghost.y - (centre.y + scale * (pair.light.y - centre.y)))
    }
    const error = Math.sqrt(pairs.reduce((sum, pair) => sum + pair.residualPx ** 2, 0) / pairs.length)
    return { pairs, centre, error }
  }

  /**
   * The small spots that stand out: local maxima of the luminance in a window a few pixels wide, brighter by some way than the median of a
   * ring round them, with how wide each is and its colour. The ones that stand out most first.
   */
  static spotsOf(pixels: PicturePixels): PictureSpot[] {
    const { width, height, data } = pixels
    const luminance = new Float32Array(width * height)
    for (let i = 0; i < width * height; i++) luminance[i] = 0.2126 * data[i * 4] + 0.7152 * data[i * 4 + 1] + 0.0722 * data[i * 4 + 2]
    const reach = Math.max(2, Math.round(Math.hypot(width, height) / 500))
    const ring = 3 * reach
    const spots: PictureSpot[] = []
    for (let y = ring; y < height - ring; y++) {
      for (let x = ring; x < width - ring; x++) {
        const peak = luminance[y * width + x]
        if (peak < 40) continue
        let isMax = true
        for (let dy = -reach; dy <= reach && isMax; dy++) {
          for (let dx = -reach; dx <= reach; dx++) {
            const other = luminance[(y + dy) * width + x + dx]
            // Ties broken by position, so that a flat top gives one spot.
            if (other > peak || (other === peak && (dy < 0 || (dy === 0 && dx < 0)))) {
              isMax = false
              break
            }
          }
        }
        if (!isMax) continue
        // How far it stands out, against a ring round it of the size that shows it best: a ring inside a large lamp's globe would see the
        // globe, and one far round a small spot would see the rest of the picture.
        let contrast = -Infinity, background = 0, ringRadius = ring
        for (const radius of [ring, 2 * ring, 4 * ring]) {
          if (x < radius || y < radius || x >= width - radius || y >= height - radius) break
          const around: number[] = []
          for (let a = 0; a < 32; a++) {
            const angle = a / 32 * 2 * Math.PI
            around.push(luminance[Math.round(y + radius * Math.sin(angle)) * width + Math.round(x + radius * Math.cos(angle))])
          }
          around.sort((p, q) => p - q)
          const median = around[16]
          if (peak - median > contrast + 5) {
            contrast = peak - median
            background = median
            ringRadius = radius
          }
        }
        if (contrast < 20) continue
        // What is brighter than half its contrast, within its ring: its size and its colour.
        const half = background + contrast / 2
        let area = 0, r = 0, g = 0, b = 0, weight = 0, cx = 0, cy = 0
        for (let dy = -ringRadius + 1; dy < ringRadius; dy++) {
          for (let dx = -ringRadius + 1; dx < ringRadius; dx++) {
            const i = (y + dy) * width + x + dx
            if (luminance[i] < half) continue
            area++
            r += data[i * 4]
            g += data[i * 4 + 1]
            b += data[i * 4 + 2]
            // Its centre: that of what stands out, not the corner of a flat (saturated) top the maximum was taken at.
            const w = luminance[i] - half + 1
            weight += w
            cx += w * dx
            cy += w * dy
          }
        }
        spots.push({ x: x + cx / weight, y: y + cy / weight, peak, contrast, background, radius: Math.sqrt(area / Math.PI), color: [r / area, g / area, b / area] })
      }
    }
    spots.sort((p, q) => q.contrast - p.contrast)
    // A large lamp, its globe flat with saturation and its glare round it, has maxima all over: they are that one spot.
    const kept: PictureSpot[] = []
    for (const spot of spots) {
      if (kept.length >= GhostFinder.MAX_SPOTS) break
      if (kept.some(other => other.peak >= spot.peak && Math.hypot(other.x - spot.x, other.y - spot.y) < Math.max(other.radius, reach))) continue
      kept.push(spot)
    }
    return kept
  }
}
