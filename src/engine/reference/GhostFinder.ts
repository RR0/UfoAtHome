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
  /** How uneven what is round it is, luminance 0 to 255 (the spread of the ring's middle half): a sky's little, leaves' much. */
  spread?: number
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
  /** How near two grounds are to be alike, luminance 0 to 255: the spots chance could have put where a lone ghost is are on such a ground. */
  private static readonly GROUND_ALIKE = 40
  /** How uneven two grounds may both be, at least, to be alike whatever their difference in that (see groundsAlike). */
  private static readonly EVEN_ALIKE = 20
  /** How many spots chance may be expected to put as near for a lone ghost to be taken. */
  private static readonly CHANCE_ALONE = 0.5
  /** How far the axis is from the picture's centre, as a share of the diagonal, for the picture to be said cropped. */
  private static readonly CROPPED = 0.04
  /** How much larger a light must be for a light in its glare to be part of it, and how far its glare reaches, in its radii. */
  private static readonly GLARE_SIZE = 2
  private static readonly GLARE_REACH = 2.5
  /** A light saturated (luminance 0 to 255), and one standing out of its nearer rings by less than this lost in its own glare (see spotsOf). */
  private static readonly SATURATED = 250
  private static readonly LOST_IN_GLARE = 40
  /** How far out of a light its glare reaches, in its radii (see apart). */
  private static readonly OUT_OF_GLARE = 2.5
  /** How far a spot must stand out to be told a ghost of a known axis's light (see atAxis), luminance 0 to 255: as a light does. */
  private static readonly SPOT_GHOST_CONTRAST = 40
  /** How sharply the pixels' votes must peak for their axis to be taken (see MirrorVote). */
  private static readonly SHARP_MIRROR = 1.5
  /** How many of a ghost's pixels must match its light's, mirrored, for its shape to be taken as matched (see MirrorVote.matched). */
  private static readonly SHAPE_MATCHED = 25
  /** How many spots are considered at most, the ones that stand out most. */
  private static readonly MAX_SPOTS = 2000

  static find(pixels: PicturePixels): GhostSearch {
    const search = GhostFinder.searched(pixels)
    return { ...search, pairs: search.pairs.map(pair => ({ ...pair, light: GhostFinder.glaringOver(pair.light, search.lights) })) }
  }

  private static searched(pixels: PicturePixels): GhostSearch {
    const { width, height } = pixels
    const diagonal = Math.hypot(width, height)
    const found = GhostFinder.spotsOf(pixels)
    const brightest = found.reduce((max, spot) => Math.max(max, spot.peak), 0)
    const lit = Math.min(235, 0.9 * brightest)
    // A thin line of light (a circle drawn round a ghost, a lit cable) is neither a lamp nor a ghost: none of its spots is either.
    const lines = GhostFinder.linesOfLight(pixels, lit)
    const spots = found.filter(spot => !lines[Math.round(spot.y) * width + Math.round(spot.x)])
    // A light is a small bright spot that stands out: a lamp, not the glare of a lit facade or a detail of a white dome. A large one has to
    // stand out all the more: the sun low in the picture does, a lit facade does not.
    const lights = spots.filter(spot => spot.peak >= lit
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
    // A lone ghost may also stand out well of a sky lit by a town or a sunset, where nothing is dark: taken only near where its light
    // mirrors, among the few as strong on a like ground (see loneGhost). Among many ghosts, a lit front's windows would be such spots too.
    // (Saturated is as bright as it can show: on a sky already pale, half again brighter cannot be.)
    const lone = spots.filter(spot => candidates.includes(spot)
      || (spot.contrast >= GhostFinder.LARGE_LIGHT_CONTRAST && spot.peak >= Math.min(GhostFinder.SATURATED, 1.5 * spot.background)))
    const byPixels = mirrored()
    // Its light, one of the greatest of the picture: saturated, however little it stands out of a hazy sky (a veiled sun does not, by
    // the measure of a lamp's).
    const great = [...lights, ...spots.filter(spot => spot.peak >= GhostFinder.SATURATED && !lights.includes(spot))]
    const alone = () => GhostFinder.loneGhost(spots, great, lone, width, height, tolerance, lights)
    if (byPixels && byPixels.pairs.length === 1) {
      // One ghost either way: what tells it is where its axis is, and a lens's is at the picture's centre unless the picture was cropped.
      // A pale patch of leaves across from the sun's wide glare votes for an axis well off it; a white speck in the sky, near it.
      const other = alone()
      const offCentre = (search: GhostSearch) => Math.hypot(search.centre!.x - width / 2, search.centre!.y - height / 2)
      return other && offCentre(other) < offCentre(byPixels) ? other : byPixels
    }
    return byPixels ?? some ?? alone() ?? none
  }

  /**
   * The ghosts the pixels vote for (see MirrorVote), as a search: sure of them when two or more stand across one sharp peak of the votes, or
   * one whose whole shape matches its light's (a lit pier upside down), not a point that chance can put anywhere.
   */
  private static mirrored(pixels: PicturePixels, lights: PictureSpot[], spots: PictureSpot[]): GhostSearch | undefined {
    const found = MirrorVote.find(pixels, GhostFinder.SHARP_MIRROR)
    if (!found) return undefined
    const { width, height } = pixels
    const diagonal = Math.hypot(width, height)
    // The axis known, a ghost made of spots (a lit front's windows upside down) is told spot by spot (see atAxis); what is no spot (a
    // lamp's pale disc) stays the patch the vote found.
    const bySpot = GhostFinder.atAxis(spots, lights, found.centre, 0.006 * diagonal)
    const pairs = bySpot.length >= 2 ? [
      ...bySpot,
      ...found.pairs.filter(patch => !bySpot.some(pair => Math.hypot(pair.ghost.x - patch.ghost.x, pair.ghost.y - patch.ghost.y) <= patch.ghost.radius))
    ] : found.pairs
    const centre = found.centre
    const offCentre = Math.hypot(centre.x - width / 2, centre.y - height / 2) / diagonal
    return {
      width, height, lights, spots, pairs, centre, scale: -1, cropped: offCentre > GhostFinder.CROPPED,
      confidence: pairs.length >= 2 || found.matched >= GhostFinder.SHAPE_MATCHED ? "high" : "low"
    }
  }

  /**
   * The light a light is part of: a bright spot in the glare of a far larger light (a ray of the sun's, a patch of its bloom) is that light
   * itself, and its ghost the larger light's.
   */
  private static glaringOver(light: PictureSpot, lights: PictureSpot[]): PictureSpot {
    let over = light
    for (const other of lights) {
      const larger = other.radius >= GhostFinder.GLARE_SIZE * light.radius && other.radius > over.radius
      if (larger && Math.hypot(other.x - light.x, other.y - light.y) <= GhostFinder.GLARE_REACH * other.radius) over = other
    }
    return over
  }

  /**
   * The ghosts of a known axis, spot by spot: each spot whose mirror through it falls within a light, which it can be the ghost of. A light
   * that is a lit front's many windows run together is one wide spot, its ghost the windows apart: each falls somewhere within it, and it
   * has as many ghosts as fall there.
   */
  private static atAxis(spots: PictureSpot[], lights: PictureSpot[], centre: { x: number, y: number }, tolerance: number): GhostPair[] {
    const pairs: GhostPair[] = []
    // Only spots that stand out as a light does: a wide light (the sun) takes in the mirror of a large share of the picture, where a
    // faint swell of the sky would be taken for a ghost of it.
    for (const ghost of spots.filter(spot => spot.contrast >= GhostFinder.SPOT_GHOST_CONTRAST)) {
      const mirror = { x: 2 * centre.x - ghost.x, y: 2 * centre.y - ghost.y }
      let best: { light: PictureSpot, beyond: number } | undefined
      for (const light of lights) {
        if (!GhostFinder.canBeGhostOf(ghost, light)) continue
        // How far past the light's own extent the mirror falls: 0 within it.
        const beyond = Math.max(0, Math.hypot(light.x - mirror.x, light.y - mirror.y) - light.radius)
        if (beyond <= tolerance && (!best || beyond < best.beyond)) best = { light, beyond }
      }
      if (!best || !GhostFinder.apart(ghost, best.light)) continue
      // Two maxima of one ghost are one ghost.
      if (pairs.some(pair => Math.hypot(pair.ghost.x - ghost.x, pair.ghost.y - ghost.y) < Math.max(2, pair.ghost.radius, ghost.radius))) continue
      // The light drawn where the ghost's mirror falls on it: the part of it this ghost is of.
      pairs.push({ ghost, light: { ...best.light, ...mirror }, residualPx: best.beyond })
    }
    // The glow round a few of them is a wider spot of its own: they are the ghosts, not it.
    return pairs.filter(pair => !pairs.some(other => other !== pair && other.ghost.radius < pair.ghost.radius
      && Math.hypot(other.ghost.x - pair.ghost.x, other.ghost.y - pair.ghost.y) < pair.ghost.radius))
  }

  /**
   * The ghost of one of the picture's great lights alone (the sun low over a town, a street lamp at night): the spot that stands out most
   * near where that light mirrors through the picture's centre — a lens's axis, unless the picture was cropped. Taken as a possible ghost
   * ("low") when chance would hardly put a spot standing out as much that near: fewer than CHANCE_ALONE of them expected there, given how many
   * the picture has on a like ground.
   */
  private static loneGhost(spots: PictureSpot[], great: PictureSpot[], candidates: PictureSpot[], width: number, height: number, tolerance: number,
                           lights: PictureSpot[]): GhostSearch | undefined {
    const diagonal = Math.hypot(width, height)
    const greatest = [...great].sort((a, b) => b.contrast * b.radius ** 2 - a.contrast * a.radius ** 2).slice(0, GhostFinder.GREAT_LIGHTS)
    let best: { pair: GhostPair, chance: number } | undefined
    for (const light of greatest) {
      const mirror = { x: width - light.x, y: height - light.y }
      const near = candidates.filter(spot => spot !== light && GhostFinder.canBeGhostOf(spot, light)
        && Math.hypot(spot.x - mirror.x, spot.y - mirror.y) <= GhostFinder.LONE_REACH * diagonal
        && GhostFinder.apart(spot, light))
      // The one chance would least put there: near where the light mirrors, and as strong as few on a like ground are. Neither the
      // strongest (a backlit leaf further off) nor the nearest (a speck) alone.
      for (const ghost of near) {
        // As strong and on a like ground: a busy foreground (lit windows, leaves against the light) is no sky a ghost could have lain in.
        const asStrong = candidates.filter(spot => spot.contrast >= ghost.contrast && GhostFinder.canBeGhostOf(spot, light)
          && GhostFinder.groundsAlike(spot, ghost)).length
        const distance = Math.hypot(ghost.x - mirror.x, ghost.y - mirror.y) + tolerance
        const chance = asStrong * Math.PI * distance ** 2 / (width * height)
        if (!best || chance < best.chance) best = { pair: { ghost, light, residualPx: 0 }, chance }
      }
    }
    if (!best || best.chance >= GhostFinder.CHANCE_ALONE) return undefined
    const { ghost, light } = best.pair
    const centre = { x: (ghost.x + light.x) / 2, y: (ghost.y + light.y) / 2 }
    const offCentre = Math.hypot(centre.x - width / 2, centre.y - height / 2) / diagonal
    return { width, height, lights, spots, pairs: [best.pair], centre, scale: -1, cropped: offCentre > GhostFinder.CROPPED, confidence: "low" }
  }

  /** Whether two spots stand on a like ground: as bright, and as even (a sky is even, leaves against the light are not). */
  private static groundsAlike(a: PictureSpot, b: PictureSpot): boolean {
    const evenness = Math.max(GhostFinder.EVEN_ALIKE, a.spread ?? 0, b.spread ?? 0)
    return Math.abs(a.background - b.background) <= GhostFinder.GROUND_ALIKE && Math.abs((a.spread ?? 0) - (b.spread ?? 0)) <= evenness / 2
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

  /** The pixels of the picture that are thin lines of light (see MirrorVote.withoutLines): no lamp, whatever their brightness. */
  private static linesOfLight(pixels: PicturePixels, lit: number): Uint8Array {
    const { width, height, data } = pixels
    const bright: { x: number, y: number }[] = []
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      if (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2] >= lit) bright.push({ x, y })
    }
    const lines = new Uint8Array(width * height)
    for (const pixel of bright) lines[pixel.y * width + pixel.x] = 1
    for (const pixel of MirrorVote.withoutLines(bright, width, height)) lines[pixel.y * width + pixel.x] = 0
    return lines
  }

  /**
   * Whether a spot is far enough from a light to be no part of it: a few of its own sizes, and out of the light's glare. Not a few of the
   * light's sizes: the sun, seventy pixels wide in a thumbnail, has its ghosts nearer than that.
   */
  private static apart(ghost: PictureSpot, light: PictureSpot): boolean {
    return Math.hypot(ghost.x - light.x, ghost.y - light.y) >= Math.max(4 * ghost.radius, GhostFinder.OUT_OF_GLARE * light.radius)
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
        if (!GhostFinder.apart(ghost, light)) continue
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
        if (nearest && distance <= reach * tolerance && GhostFinder.apart(ghost, nearest)) {
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
        let contrast = -Infinity, background = 0, ringRadius = ring, spread = 0
        for (const radius of [ring, 2 * ring, 4 * ring, 8 * ring, 16 * ring]) {
          if (x < radius || y < radius || x >= width - radius || y >= height - radius) break
          // Further only for a light that is lost in its own glare, the sun's: the nearer rings see nothing but it. A lamp that already
          // stands out is measured against what is near it, as a ghost is.
          if (radius > 4 * ring && (peak < GhostFinder.SATURATED || contrast >= GhostFinder.LOST_IN_GLARE)) break
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
            spread = around[24] - around[8]
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
        spots.push({ x: x + cx / weight, y: y + cy / weight, peak, contrast, background, radius: Math.sqrt(area / Math.PI), color: [r / area, g / area, b / area], spread })
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
