import type { GhostPair, PicturePixels, PictureSpot } from "./GhostFinder.js"

/** What the vote found: the axis, the ghosts it explains with their lights, and how far above chance. */
export interface MirrorFinding {
  centre: { x: number, y: number }
  pairs: GhostPair[]
  /** How sharply the votes peak there: the peak over the most they reach a little way off it. */
  sharpness: number
  /** How many pixels of the ghosts shown fall, mirrored, on their lights, at the vote's own size (see SIZE): a shape matched, not a point. */
  matched: number
}

/** A pixel that votes, where it is in the vote's own grid, and how much. */
interface Voter {
  x: number
  y: number
  weight: number
}

/**
 * Finds the axis a picture's ghosts are mirrored through (see LensGhost: most ghosts lie across it from their light, as far) from its pixels
 * rather than its spots: every pixel of a bright light and every pixel that stands out of a dark ground vote for the point halfway between
 * them, and the ghosts of a light make that point's votes pile up whatever their shape — a lamp's ghost a large pale disc of the aperture, a
 * lit pier's ghost the whole pier upside down, as bright as the pier. GhostFinder's spots miss both.
 *
 * Chance votes too, everywhere: the lit ground round a lamp pairs with the lamp, a field of stars with every light. But it votes for a broad
 * hump; a mirror votes for one point. So the peak counts only by how far it stands above the votes a little way off it.
 */
export class MirrorVote {
  /** The size the vote is held at, pixels on the longer side: a ghost's place, not its detail. */
  private static readonly SIZE = 360
  /** What is a light, luminance 0 to 255: near saturation. */
  private static readonly LIGHT = 230
  /** What a faint thing must stand out of, and be darker than itself, to vote: a dark ground. */
  private static readonly DARK = 80
  private static readonly STANDS_OUT = 12
  /** How wide the window a pixel's ground is taken over, as a share of the diagonal (each way): to vote, and to show a ghost whole (a pale
   * disc of the aperture stands out of a window wider than itself whole, not by its rim; but over such a window less else stands out). */
  private static readonly GROUND = 0.025
  private static readonly WHOLE_GROUND = 0.08
  /** How far a ghost grown to its whole may have its centre move off the patch it grew from, past that patch's own size, as a share of
   * the diagonal. */
  private static readonly GROWN_DRIFT = 0.02
  /** How much the inside of a pale disc votes, a pixel: as one that stands out a little. */
  private static readonly INSIDE_WEIGHT = 0.4
  /** A thin line, not a ghost (see withoutLines): at least that many pixels, filling less than that share of the box round them. */
  private static readonly LINE_LENGTH = 12
  private static readonly LINE_FILL = 0.2
  /** How far a pixel stands out of its ground to vote fully, luminance 0 to 255. */
  private static readonly STANDING_FULLY = 60
  /** How near its light a pixel is its glare, not a ghost, as a share of the diagonal. */
  private static readonly NEAREST = 0.08
  /** How far the axis may be from the picture's centre, as a share of its diagonal: a crop moves it, not that far. */
  private static readonly REACH = 0.08
  /** The ring round the peak its sharpness is measured against, as shares of the diagonal. */
  private static readonly RING = [0.04, 0.08]
  /** How much of the strongest ghost's vote another must bring to be shown with it. */
  private static readonly SHARE_OF_PEAK = 0.15
  /** How many pairs of voters are counted at most: beyond, voters are sampled. */
  private static readonly MAX_PAIRS = 6_000_000

  /** The axis, when the votes peak at least `minimum` times above what they reach round it; with the ghosts (as spots) and their lights. */
  static find(pixels: PicturePixels, minimum: number): MirrorFinding | undefined {
    const scale = Math.min(1, MirrorVote.SIZE / Math.max(pixels.width, pixels.height))
    const width = Math.max(1, Math.round(pixels.width * scale)), height = Math.max(1, Math.round(pixels.height * scale))
    const luminance = MirrorVote.luminanceOf(pixels, width, height)
    const background = MirrorVote.blurred(luminance, width, height, Math.max(4, Math.round(Math.hypot(width, height) * MirrorVote.GROUND)))
    const lights: Voter[] = [], faint: Voter[] = []
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x, l = luminance[i]
        if (l >= MirrorVote.LIGHT) lights.push({ x, y, weight: (l - MirrorVote.LIGHT + 5) / 30 })
        // A ghost on a dark ground, fainter than a light: the lights' own pixels are lights, not ghosts of each other.
        else if (background[i] < MirrorVote.DARK && l - background[i] > MirrorVote.STANDS_OUT) {
          faint.push({ x, y, weight: Math.min(1, (l - background[i]) / MirrorVote.STANDING_FULLY) })
        }
      }
    }
    faint.splice(0, faint.length, ...MirrorVote.withoutLines(faint, width, height))
    faint.push(...MirrorVote.insides(faint, lights, width, height))
    if (lights.length === 0 || faint.length === 0) return undefined
    const nearest = MirrorVote.NEAREST * Math.hypot(width, height)
    const found = MirrorVote.peak(MirrorVote.vote(lights, faint, width, height, nearest), width, height)
    if (found.value <= 0 || found.sharpness < minimum) return undefined
    const centre = { x: found.x / 2, y: found.y / 2 }
    const { pairs, matched } = MirrorVote.pairsAt(centre, lights, faint, luminance, background, width, height, nearest)
    if (pairs.length === 0) return undefined
    const back = 1 / scale
    const toPicture = (spot: PictureSpot): PictureSpot => ({ ...spot, x: (spot.x + 0.5) * back - 0.5, y: (spot.y + 0.5) * back - 0.5, radius: spot.radius * back })
    return {
      centre: { x: (centre.x + 0.5) * back - 0.5, y: (centre.y + 0.5) * back - 0.5 },
      pairs: pairs.map(pair => ({ ghost: toPicture(pair.ghost), light: toPicture(pair.light), residualPx: pair.residualPx * back })),
      sharpness: found.sharpness,
      matched
    }
  }

  /** The votes, on a grid of twice the picture's resolution: the sum of a ghost's and its light's places, which is twice the centre. */
  private static vote(lights: Voter[], faint: Voter[], width: number, height: number, nearest: number): Float32Array {
    const votes = new Float32Array(2 * width * 2 * height)
    const stride = Math.max(1, Math.ceil(Math.sqrt(lights.length * faint.length / MirrorVote.MAX_PAIRS)))
    const nearest2 = nearest * nearest
    for (let a = 0; a < lights.length; a += stride) {
      const light = lights[a]
      for (let b = 0; b < faint.length; b += stride) {
        const ghost = faint[b]
        const dx = ghost.x - light.x, dy = ghost.y - light.y
        if (dx * dx + dy * dy < nearest2) continue
        votes[(light.y + ghost.y) * 2 * width + light.x + ghost.x] += light.weight * ghost.weight
      }
    }
    return votes
  }

  /** The best centre of the votes (twice its place), the votes summed round each cell over a few pixels, a centre being never exact. */
  private static peak(votes: Float32Array, width: number, height: number): { x: number, y: number, value: number, sharpness: number } {
    const w = 2 * width, h = 2 * height
    const summed = MirrorVote.blurred(votes, w, h, 3)
    let best = { x: 0, y: 0, value: 0, sharpness: 0 }
    // The centre of a picture's lens is at its own, or not far off for a crop.
    const reach = MirrorVote.REACH * Math.hypot(w, h)
    for (let y = Math.max(0, Math.round(h / 2 - reach)); y < Math.min(h, Math.round(h / 2 + reach)); y++) {
      for (let x = Math.max(0, Math.round(w / 2 - reach)); x < Math.min(w, Math.round(w / 2 + reach)); x++) {
        if (Math.hypot(x - w / 2, y - h / 2) > reach) continue
        const value = summed[y * w + x]
        if (value > best.value) best = { x, y, value, sharpness: 0 }
      }
    }
    // What the votes reach a little way off, in a ring: a hump of chance reaches as much, or more; a mirror's peak stands alone.
    const diagonal = Math.hypot(w, h)
    const inner = MirrorVote.RING[0] * diagonal, outer = MirrorVote.RING[1] * diagonal
    let around = 0
    for (let y = Math.max(0, Math.floor(best.y - outer)); y < Math.min(h, Math.ceil(best.y + outer)); y++) {
      for (let x = Math.max(0, Math.floor(best.x - outer)); x < Math.min(w, Math.ceil(best.x + outer)); x++) {
        const d = Math.hypot(x - best.x, y - best.y)
        if (d > inner && d < outer) around = Math.max(around, summed[y * w + x])
      }
    }
    best.sharpness = around > 0 ? best.value / around : Infinity
    return best
  }

  /**
   * The ghosts at that centre, as spots: the patches of faint pixels whose mirror falls on a light, each with the light it mirrors, the
   * brighter and larger patches first.
   */
  private static pairsAt(centre: { x: number, y: number }, lights: Voter[], faint: Voter[], luminance: Float32Array, background: Float32Array,
                         width: number, height: number, nearest: number): { pairs: GhostPair[], matched: number } {
    const lightWeight = new Float32Array(width * height)
    for (const light of lights) lightWeight[light.y * width + light.x] = light.weight
    // How much a faint pixel votes for this centre: its weight times that of the light its mirror falls on.
    const voteOf = (voter: Voter) => {
      const x = Math.round(2 * centre.x - voter.x), y = Math.round(2 * centre.y - voter.y)
      let lit = 0
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const mx = x + dx, my = y + dy
        if (mx >= 0 && my >= 0 && mx < width && my < height) lit += lightWeight[my * width + mx]
      }
      return voter.weight * lit
    }
    const ghostVote = new Float32Array(width * height)
    const isGhost = new Uint8Array(width * height)
    for (const voter of faint) {
      if (Math.hypot(voter.x - (2 * centre.x - voter.x), voter.y - (2 * centre.y - voter.y)) < nearest) continue
      const vote = voteOf(voter)
      if (vote <= 0) continue
      isGhost[voter.y * width + voter.x] = 1
      ghostVote[voter.y * width + voter.x] = vote
    }
    let wideGround: Float32Array | undefined
    const wide = () => wideGround ??= MirrorVote.blurred(luminance, width, height, Math.max(4, Math.round(Math.hypot(width, height) * MirrorVote.WHOLE_GROUND)))
    // The ghost pixels grouped into patches (8-connected, bridging a pixel's gap), each a ghost.
    const seen = new Uint8Array(width * height)
    const found: { pair: GhostPair, vote: number, size: number }[] = []
    for (let start = 0; start < isGhost.length; start++) {
      if (!isGhost[start] || seen[start]) continue
      const patch: number[] = []
      const stack = [start]
      seen[start] = 1
      while (stack.length > 0) {
        const i = stack.pop()!
        patch.push(i)
        const x = i % width, y = (i - x) / width
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
          const nx = x + dx, ny = y + dy
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
          const j = ny * width + nx
          if (isGhost[j] && !seen[j]) {
            seen[j] = 1
            stack.push(j)
          }
        }
      }
      if (patch.length < 3) continue
      const vote = patch.reduce((sum, i) => sum + ghostVote[i], 0)
      const ghost = MirrorVote.spotOf(MirrorVote.whole(patch, luminance, wide(), width, height), luminance, wide(), width)
      // Its light: the light pixels its mirror falls on.
      const lit = lights.filter(light => Math.hypot(light.x - (2 * centre.x - ghost.x), light.y - (2 * centre.y - ghost.y)) <= ghost.radius + 2)
      if (lit.length === 0) continue
      const light = MirrorVote.spotOf(lit.map(voter => voter.y * width + voter.x), luminance, background, width)
      found.push({ pair: { ghost, light, residualPx: Math.hypot(ghost.x + light.x - 2 * centre.x, ghost.y + light.y - 2 * centre.y) }, vote, size: patch.length })
    }
    // The ghosts that make the peak: chance also puts a lit thing or two across from some small light, for a few votes.
    const most = found.reduce((max, entry) => Math.max(max, entry.vote), 0)
    const kept: GhostPair[] = []
    let matched = 0
    for (const { pair, size } of found.filter(entry => entry.vote >= MirrorVote.SHARE_OF_PEAK * most).sort((a, b) => b.vote - a.vote)) {
      matched += size
      // Pieces of one ghost (a row of lit windows upside down) grow into the same: shown once.
      if (kept.some(other => Math.hypot(other.ghost.x - pair.ghost.x, other.ghost.y - pair.ghost.y) < Math.max(other.ghost.radius, pair.ghost.radius))) continue
      kept.push(pair)
    }
    return { pairs: kept.slice(0, 12), matched }
  }

  /**
   * The faint pixels but those that make a thin line: a wire, a branch, a contrail, a circle drawn round something on the picture. A ghost
   * is a patch, round or a row of lights; a line across from a wide glare (the sun's) would find a light for each of its pixels.
   */
  private static withoutLines(faint: Voter[], width: number, height: number): Voter[] {
    const at = new Int32Array(width * height).fill(-1)
    faint.forEach((voter, n) => at[voter.y * width + voter.x] = n)
    const seen = new Uint8Array(faint.length)
    const kept: Voter[] = []
    for (let start = 0; start < faint.length; start++) {
      if (seen[start]) continue
      const group = [start]
      seen[start] = 1
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity
      for (let k = 0; k < group.length; k++) {
        const { x, y } = faint[group[k]]
        x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y)
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
          const n = at[ny * width + nx]
          if (n >= 0 && !seen[n]) {
            seen[n] = 1
            group.push(n)
          }
        }
      }
      const fill = group.length / ((x1 - x0 + 1) * (y1 - y0 + 1))
      if (group.length >= MirrorVote.LINE_LENGTH && fill < MirrorVote.LINE_FILL) continue
      for (const n of group) kept.push(faint[n])
    }
    return kept
  }

  /**
   * What a pale flat disc's rim encloses: its inside stands out of nothing near it (it is its own ground), and the rim alone would vote for a
   * ring round the centre, not for the centre. Whatever the picture's edge cannot be reached from without crossing a faint pixel or a light.
   */
  private static insides(faint: Voter[], lights: Voter[], width: number, height: number): Voter[] {
    const wall = new Uint8Array(width * height)
    for (const voter of faint) wall[voter.y * width + voter.x] = 1
    for (const light of lights) wall[light.y * width + light.x] = 2
    const outside = new Uint8Array(width * height)
    const stack: number[] = []
    const reach = (i: number) => {
      if (wall[i] || outside[i]) return
      outside[i] = 1
      stack.push(i)
    }
    for (let x = 0; x < width; x++) {
      reach(x)
      reach((height - 1) * width + x)
    }
    for (let y = 0; y < height; y++) {
      reach(y * width)
      reach(y * width + width - 1)
    }
    while (stack.length > 0) {
      const i = stack.pop()!
      const x = i % width, y = (i - x) / width
      if (x > 0) reach(i - 1)
      if (x < width - 1) reach(i + 1)
      if (y > 0) reach(i - width)
      if (y < height - 1) reach(i + width)
    }
    const inside: Voter[] = []
    // A hole near a light (inside its glare's ring) votes too, but too near the light to count (see NEAREST).
    for (let i = 0; i < wall.length; i++) if (!wall[i] && !outside[i]) inside.push({ x: i % width, y: Math.floor(i / width), weight: MirrorVote.INSIDE_WEIGHT })
    return inside
  }

  /** A ghost's patch grown to all of it that stands out of a wide ground round it, no further than a few times its own size. */
  private static whole(patch: number[], luminance: Float32Array, ground: Float32Array, width: number, height: number): number[] {
    const limit = 4 * Math.sqrt(patch.length / Math.PI) + 0.06 * Math.hypot(width, height)
    let cx = 0, cy = 0
    for (const i of patch) {
      cx += i % width
      cy += Math.floor(i / width)
    }
    cx /= patch.length
    cy /= patch.length
    const stands = (i: number) => luminance[i] < MirrorVote.LIGHT && luminance[i] - ground[i] > MirrorVote.STANDS_OUT / 2
    const inside = new Uint8Array(width * height)
    const stack = patch.filter(stands)
    for (const i of stack) inside[i] = 1
    const grown = [...stack]
    while (stack.length > 0) {
      const i = stack.pop()!
      const x = i % width, y = (i - x) / width
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
        const j = ny * width + nx
        if (inside[j] || !stands(j) || Math.hypot(nx - cx, ny - cy) > limit) continue
        inside[j] = 1
        grown.push(j)
        stack.push(j)
      }
    }
    if (grown.length < patch.length) return patch
    // Grown, it is still that ghost, around where it was found: one that spread off into a swell of the sky is the sky, not more of it.
    let gx = 0, gy = 0
    for (const i of grown) {
      gx += i % width
      gy += Math.floor(i / width)
    }
    const drift = Math.hypot(gx / grown.length - cx, gy / grown.length - cy)
    return drift <= Math.sqrt(patch.length / Math.PI) + MirrorVote.GROWN_DRIFT * Math.hypot(width, height) ? grown : patch
  }

  /** A patch of pixels as a spot: its centre weighted by how much each stands out, its size, its brightest. */
  private static spotOf(patch: number[], luminance: Float32Array, background: Float32Array, width: number): PictureSpot {
    let weight = 0, x = 0, y = 0, peak = 0, ground = 0
    for (const i of patch) {
      const w = Math.max(1, luminance[i] - background[i])
      weight += w
      x += w * (i % width)
      y += w * Math.floor(i / width)
      peak = Math.max(peak, luminance[i])
      ground += background[i]
    }
    const back = ground / patch.length
    return { x: x / weight, y: y / weight, peak, contrast: peak - back, background: back, radius: Math.sqrt(patch.length / Math.PI), color: [peak, peak, peak] }
  }

  private static luminanceOf(pixels: PicturePixels, width: number, height: number): Float32Array {
    const out = new Float32Array(width * height), count = new Float32Array(width * height)
    const sx = width / pixels.width, sy = height / pixels.height
    for (let y = 0; y < pixels.height; y++) {
      const ty = Math.min(height - 1, Math.floor(y * sy))
      for (let x = 0; x < pixels.width; x++) {
        const i = (y * pixels.width + x) * 4, t = ty * width + Math.min(width - 1, Math.floor(x * sx))
        out[t] += 0.2126 * pixels.data[i] + 0.7152 * pixels.data[i + 1] + 0.0722 * pixels.data[i + 2]
        count[t]++
      }
    }
    for (let i = 0; i < out.length; i++) out[i] /= Math.max(1, count[i])
    return out
  }

  /** A box blur of the given radius, by summed areas. */
  private static blurred(values: Float32Array, width: number, height: number, radius: number): Float32Array {
    const sums = new Float64Array((width + 1) * (height + 1))
    for (let y = 0; y < height; y++) {
      let row = 0
      for (let x = 0; x < width; x++) {
        row += values[y * width + x]
        sums[(y + 1) * (width + 1) + x + 1] = sums[y * (width + 1) + x + 1] + row
      }
    }
    const out = new Float32Array(width * height)
    for (let y = 0; y < height; y++) {
      const y0 = Math.max(0, y - radius), y1 = Math.min(height, y + radius + 1)
      for (let x = 0; x < width; x++) {
        const x0 = Math.max(0, x - radius), x1 = Math.min(width, x + radius + 1)
        const sum = sums[y1 * (width + 1) + x1] - sums[y0 * (width + 1) + x1] - sums[y1 * (width + 1) + x0] + sums[y0 * (width + 1) + x0]
        out[y * width + x] = sum / ((x1 - x0) * (y1 - y0))
      }
    }
    return out
  }
}
