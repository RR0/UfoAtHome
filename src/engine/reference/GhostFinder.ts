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
   * How sure the finding is. "high": three ghosts or more agree on one centre, which chance hardly does. "low": one or two, which chance can
   * do — taken only when the centre they give is near the picture's own (a tenth of its diagonal for two, three hundredths for one), where a
   * lens's axis is unless the picture was cropped. "none": nothing that lines up.
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
  /** How many spots are considered at most, the ones that stand out most. */
  private static readonly MAX_SPOTS = 2000

  static find(pixels: PicturePixels): GhostSearch {
    const { width, height } = pixels
    const diagonal = Math.hypot(width, height)
    const spots = GhostFinder.spotsOf(pixels)
    const brightest = spots.reduce((max, spot) => Math.max(max, spot.peak), 0)
    // A light is a small bright spot that stands out: a lamp, not the glare of a lit facade or a detail of a white dome.
    const lights = spots.filter(spot => spot.peak >= Math.min(235, 0.9 * brightest) && spot.contrast >= 40 && spot.radius <= 0.025 * diagonal)
    // A ghost that shows is a faint spot on something dark: on a lit facade it would be lost, and the facade's own details (its windows,
    // its lamps' glare) are the spots chance lines up with lights.
    const candidates = spots.filter(spot => !lights.includes(spot) && spot.background < GhostFinder.DARK && spot.peak >= 2 * spot.background)
    const none: GhostSearch = { width, height, lights, spots, pairs: [], confidence: "none" }
    if (lights.length === 0 || candidates.length === 0) return none
    const tolerance = 0.006 * diagonal
    type Fit = { pairs: GhostPair[], centre: { x: number, y: number }, scale: number, error: number, score: number }
    // Each pair counts for how exactly it lines up: lights in a regular row (a street's lamps, a front's) also pair each ghost with the next
    // lamp from a centre half a spacing off, roughly — it is the exactness that tells the true centre.
    const scoreOf = (pairs: GhostPair[]) => pairs.reduce((sum, pair) => sum + Math.max(0, 1 - pair.residualPx / tolerance) ** 2, 0)
    const bestAt = (scale: number): Fit | undefined => {
      let best: Fit | undefined
      for (const centre of GhostFinder.voted(candidates, lights, scale, width, height)) {
        const fit = GhostFinder.fit(candidates, lights, centre, scale, tolerance)
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
    if (!best || best.pairs.length === 0) return none
    const offCentre = Math.hypot(best.centre.x - width / 2, best.centre.y - height / 2) / diagonal
    // Chance pairs a faint spot with some light at a centre anywhere; that the centre should then be where a lens's axis is, the picture's
    // own, is what makes one or two pairs worth anything — and one alone has to be all the nearer to it.
    const confidence = best.pairs.length >= 3 ? "high" : offCentre < (best.pairs.length === 2 ? 0.1 : 0.03) ? "low" : "none"
    if (confidence === "none") return none
    return { width, height, lights, spots, pairs: best.pairs, centre: best.centre, scale: best.scale, cropped: offCentre > 0.04, confidence }
  }

  /** The centres the most pairs of a faint spot and a brighter light vote for at this scale, best first. */
  private static voted(candidates: PictureSpot[], lights: PictureSpot[], scale: number, width: number, height: number): { x: number, y: number }[] {
    const cell = 0.01 * Math.hypot(width, height)
    const votes = new Map<string, { count: number, x: number, y: number }>()
    for (const ghost of candidates) {
      for (const light of lights) {
        if (ghost.peak >= light.peak && light.peak < 250) continue
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
    // Wide at first: a voted centre is only within a cell or two of the true one, and a light's place from it is off by (1 - 1/k) times that.
    for (const reach of [3, 2, 1, 1]) {
      const found: GhostPair[] = []
      for (const ghost of candidates) {
        // Where its light would be: ghost = c + k (light - c).
        const x = centre.x + (ghost.x - centre.x) / scale, y = centre.y + (ghost.y - centre.y) / scale
        let nearest: PictureSpot | undefined, distance = Infinity
        for (const light of lights) {
          if (ghost.peak >= light.peak && light.peak < 250) continue
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
