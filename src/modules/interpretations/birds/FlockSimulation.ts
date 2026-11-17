import { BirdFlock, FlightPath } from "./BirdFlock.js"
import type { BirdSample, BirdTrack, PathPoint } from "./BirdFlock.js"
import type { BirdSpecies } from "./BirdSpecies.js"
import type { Obstacles } from "../Obstacles.js"

/** What a flock that flies itself needs: where it is led, how many birds of what, how far apart they keep, and its draws. */
export interface FlockSimulationInput {
  path: PathPoint[]
  count: number
  species: BirdSpecies
  /** The distance birds keep from their nearest neighbours, in wingspans. */
  spacing: number
  /** The share of the birds that know where the flock is going (see FlockSimulation.INFORMED_SHARE). */
  informedShare?: number
  /** The solid decor it goes round or over (see Obstacles). */
  obstacles?: Obstacles
  random: () => number
  sampleMs: number
}

/**
 * A flock that flies itself: every bird steered only by what it sees of a few neighbours, a few of them by where the flock is going, and the
 * shape of the whole, its bunching, its stringing out, the waves that cross it as it wheels, coming out of that rather than being drawn.
 *
 * The rules are the classic three of self-organised flocking (Reynolds 1987, "Flocks, herds and schools", SIGGRAPH): keep away from those
 * too close, fly the way the others fly, keep with them. What real flocks were measured to do sets how they apply here:
 *
 * - A bird heeds a fixed NUMBER of neighbours, its seven nearest, however near or far they are (Ballerini et al. 2008, PNAS 105: 1232,
 *   starlings filmed over Rome), which keeps a flock whole when it thins out; seven is also what balances cohesion against the cost of
 *   watching, in a flock a few birds thick (Young, Scardovi, Cavagna, Giardina & Leonard 2013, PLoS Comput. Biol. 9: e1002894).
 * - It does not see behind it: those of its neighbours in a blind sector at its back are not heeded (a blind angle is part of StarDisplay,
 *   Hildenbrandt, Carere & Hemelrijk 2010, Behavioral Ecology 21: 1349; its width here, 60°, is this project's).
 * - A bird at the edge of the flock is drawn in harder than one inside it, by how much of its neighbours lie to one side of it (Hemelrijk &
 *   Hildenbrandt 2011, PLoS ONE 6: e22479): which makes the border denser than the inside, as Ballerini measured it, and keeps the flock
 *   whole without a leader.
 * - No bird leads: a few know where the flock is going better than the others, and steer it through their neighbours (Couzin, Krause,
 *   Franks & Levin 2005, Nature 433: 513: a few informed individuals steer a group they are not distinguished in). Each bird weighs, as
 *   Couzin's do, the way it wants to go against the way its neighbours say: a share of the birds drawn from the seed weighs where the path
 *   is going twice as much as the others, which all feel it faintly, as StarDisplay's birds all feel their roost. With nothing but the
 *   informed, a flock whose path turns sharply splits, the informed turning off without the others; with the faint pull, it turns whole,
 *   the informed first.
 * - A turn spreads as a wave that keeps its strength, because a bird follows how its neighbours TURN and not only where they head: turning
 *   has an inertia (Attanasi et al. 2014, Nature Physics 10: 691, "Information transfer and behavioural inertia in starling flocks",
 *   turns crossing flocks at 20 to 40 m/s). Here, a bird's turn eases towards what it is steered to (in TURN_LAG_S) and towards its
 *   neighbours' turns.
 * - A bird turns by banking, its lift tilted into the turn, so it turns no tighter than its speed and a bank of 60° allow (the premise of
 *   StarDisplay). How fast it flies is set apart from where it heads: the speed of its neighbours, a little towards its own (a few per cent
 *   off the others'), a little faster when they are ahead of it: speed is a matter of the whole flock (Bialek et al. 2014, PNAS 111: 7212,
 *   "Social interactions dominate speed control in poising natural flocks near criticality"), and what keeps it from stringing out.
 *
 * Its neighbours are found in a grid of cells about a spacing wide, searched outwards from the bird's own: a flock of thousands is computed
 * in a time that grows as its number, not its square. Each bird has a little noise of its own (a gust, an inattention), drawn from the
 * flock's seed, so that the same statement always flies the same.
 *
 * The weights are this project's, not measured: chosen so that a flock of 40 to 1,000 holds together through a right-angle turn of its path
 * without splitting, and has about the proportions Ballerini measured (1 : 2.8 : 5.6; here some 1 : 2.5 : 4.5 for 300 to 1,000 birds), its
 * thinnest across the vertical. Integrated every 50 ms, all the birds at once.
 */
export class FlockSimulation {
  static readonly STEP_S = 0.05
  static readonly NEIGHBOURS = 7
  static readonly MAX_BANK_DEG = 60
  /** The share of the birds that know best where the flock is going, when the flock does not say (see Couzin et al. above). */
  static readonly INFORMED_SHARE = 0.2
  /** Half the blind sector behind a bird, degrees: what is within this of straight behind it is not seen. */
  static readonly BLIND_HALF_DEG = 30
  /** How long a bird's turn takes to become what it is steered to, s: its inertia. */
  static readonly TURN_LAG_S = 0.25
  /** How much each rule weighs in the way a bird wants to go (see run). */
  private static readonly SEPARATION = 4
  private static readonly ALIGNMENT = 1
  /** How much of the difference between its neighbours' turn and its own a bird takes on: what carries a turn across the flock. */
  private static readonly TURN_FOLLOWING = 0.8
  private static readonly COHESION = 0.6
  /** How much more a bird at the very edge is drawn in than one in the middle (see centrality). */
  private static readonly EDGE_COHESION = 1
  /** How much less those too close and the middle of its neighbours move a bird up or down than across: what keeps the flock a few birds
   * thick. The way they fly, and where the flock is going, count as much up and down as across. */
  private static readonly VERTICAL_COHESION = 0.1
  /** How much where the flock is going weighs for a bird that knows it, against what its neighbours say (Couzin's ω). */
  private static readonly LEAD = 0.6
  /** How much where the flock is going weighs for the others: the faint pull of where they all know they are going (a roost, a way they
   * take every day), which StarDisplay gives every bird (Hildenbrandt et al. 2010); what keeps the flock whole through a turn its
   * informed take first. */
  private static readonly FOLLOWER_LEAD = 0.3
  /** How far ahead on the path an informed bird makes for, s. */
  private static readonly LOOK_AHEAD_S = 3
  /** How quickly a bird's speed becomes the one it wants, per second. */
  private static readonly SPEED_RATE = 1.5
  /** How much a bird speeds up per metre its neighbours are ahead of it, per second. */
  private static readonly SPEED_COHESION = 0.5
  /** How quickly a bird turns to the way it wants, per second. */
  private static readonly STEERING = 2
  private static readonly NOISE = 1.5
  /** How much a bird's own cruising speed counts against its neighbours' speed. */
  private static readonly OWN_SPEED = 0.5
  /** How much what it is about to fly into weighs in the way a bird wants to go, how far ahead it looks for it, s, and how near the top
   * of it, metres, it goes over rather than round. */
  private static readonly AVOIDANCE = 6
  private static readonly AVOID_AHEAD_S = 1
  private static readonly OVER_WITHIN_M = 6
  /** How many cells outwards a bird looks for its neighbours before it settles for those it found: a bird strayed that far rejoins the path. */
  private static readonly MAX_RINGS = 6

  static run(input: FlockSimulationInput): BirdTrack[] {
    const { path, count, species, random, sampleMs } = input
    const obstacles = input.obstacles?.empty === false ? input.obstacles : undefined
    const curve = new FlightPath(path)
    const startT = path[0].t
    const endT = path[path.length - 1].t
    // A flock flies at the path's speed there, every bird about the same, a few per cent off (see ownCruise); one held over a spot (a
    // roost), or led slower than a bird can fly, at 10 m/s. How fast a flock goes is a matter of the whole flock, not of those who know
    // where (Bialek et al. 2014, PNAS 111: 7212, speed control in starling flocks).
    const cruiseAt = (t: number) => {
      const v = curve.velocityAt(t)
      return Math.max(Math.hypot(v.east, v.north, v.up), 10)
    }
    const spacingM = input.spacing * species.wingspanM
    const start = BirdFlock.slotsOf({ kind: "cluster", spacing: input.spacing }, count, species.wingspanM, random)
    const v0 = curve.velocityAt(startT)
    const heading = Math.atan2(v0.east, v0.north)
    const origin = curve.at(startT)
    const n = count
    const px = new Float64Array(n), py = new Float64Array(n), pz = new Float64Array(n)
    const vx = new Float64Array(n), vy = new Float64Array(n), vz = new Float64Array(n)
    // Each bird's turn now, m/s² across its way (see TURN_LAG_S), and what it is steered to.
    const tx = new Float64Array(n), ty = new Float64Array(n), tz = new Float64Array(n)
    const wx = new Float64Array(n), wy = new Float64Array(n), wz = new Float64Array(n)
    /** Each bird's own cruising speed, as a share of the flock's. */
    const ownCruise = new Float64Array(n)
    // What each bird gains or loses of its speed at this step.
    const forwardOf = new Float64Array(n)
    const informed = new Uint8Array(n)
    start.forEach((slot, i) => {
      px[i] = origin.eastM + Math.sin(heading) * slot.forwardM + Math.cos(heading) * slot.rightM
      py[i] = origin.northM + Math.cos(heading) * slot.forwardM - Math.sin(heading) * slot.rightM
      pz[i] = origin.upM + slot.upM
      ownCruise[i] = 1 + (random() - 0.5) * 0.08
      vx[i] = Math.sin(heading) * cruiseAt(startT) * ownCruise[i]
      vy[i] = Math.cos(heading) * cruiseAt(startT) * ownCruise[i]
    })
    // The informed: a share drawn at random, two at least (one alone would be a leader).
    const share = Math.max(0, Math.min(1, input.informedShare ?? FlockSimulation.INFORMED_SHARE))
    const wanted = n === 1 ? 1 : Math.min(n, Math.max(2, Math.round(n * share)))
    for (let chosen = 0; chosen < wanted;) {
      const i = Math.floor(random() * n)
      if (!informed[i]) { informed[i] = 1; chosen++ }
    }
    const tracks: BirdSample[][] = start.map(() => [])
    const noise = start.map(() => ({ x: 0, y: 0, z: 0 }))
    const grid = new NeighbourGrid(n, Math.max(spacingM * 1.5, 0.1))
    const k = Math.min(FlockSimulation.NEIGHBOURS, n - 1)
    const nearest = new Int32Array(Math.max(k, 1))
    const maxLateral = 9.81 * Math.tan(FlockSimulation.MAX_BANK_DEG * Math.PI / 180)
    const blindCos = -Math.cos(FlockSimulation.BLIND_HALF_DEG * Math.PI / 180)
    const step = FlockSimulation.STEP_S
    const lag = Math.min(1, step / FlockSimulation.TURN_LAG_S)
    let nextSample = startT
    for (let t = startT; t <= endT + 1e-6; t += step * 1000) {
      if (t >= nextSample - 1e-6) {
        for (let i = 0; i < n; i++) tracks[i].push({ t: nextSample, eastM: px[i], northM: py[i], upM: pz[i], headingDeg: 0, pitchDeg: 0, rollDeg: 0 })
        nextSample += sampleMs
      }
      const goal = curve.at(t)
      const goalVelocity = curve.velocityAt(t)
      const cruise = cruiseAt(t)
      grid.fill(px, py, pz)
      for (let i = 0; i < n; i++) {
        const speed = Math.max(Math.hypot(vx[i], vy[i], vz[i]), 1e-3)
        const ux = vx[i] / speed, uy = vy[i] / speed, uz = vz[i] / speed
        const found = k > 0 ? grid.nearest(i, px, py, pz, k, FlockSimulation.MAX_RINGS, nearest, (dx, dy, dz, d) => (dx * ux + dy * uy + dz * uz) / d > blindCos) : 0
        let sx = 0, sy = 0, sz = 0, cx = 0, cy = 0, cz = 0, mx = 0, my = 0, mz = 0, rx = 0, ry = 0, rz = 0, ex = 0, ey = 0, ez = 0
        for (let a = 0; a < found; a++) {
          const j = nearest[a]
          const dx = px[j] - px[i], dy = py[j] - py[i], dz = pz[j] - pz[i]
          const d = Math.max(Math.hypot(dx, dy, dz), 1e-3)
          if (d < spacingM) {
            const push = (1 - d / spacingM) / d
            sx -= dx * push; sy -= dy * push; sz -= dz * push
          }
          cx += px[j]; cy += py[j]; cz += pz[j]
          mx += vx[j]; my += vy[j]; mz += vz[j]
          rx += tx[j]; ry += ty[j]; rz += tz[j]
          ex += dx / d; ey += dy / d; ez += dz / d
        }
        // Where it wants to go, as a direction (Couzin et al. 2005): away from those too close, the way its neighbours fly, towards them
        // (the more at the edge of the flock), and, if it knows, where the flock is going: each a unit, weighed against the others.
        let dx = 0, dy = 0, dz = 0
        let wantedSpeed = ownCruise[i] * cruise
        const crowd = Math.hypot(sx, sy, sz)
        if (crowd > 0) {
          const near = Math.min(1, crowd * spacingM)
          dx += sx / crowd * FlockSimulation.SEPARATION * near; dy += sy / crowd * FlockSimulation.SEPARATION * near; dz += sz / crowd * FlockSimulation.SEPARATION * near
        }
        if (found > 0) {
          const toX = cx / found - px[i], toY = cy / found - py[i], toZ = cz / found - pz[i]
          const toLength = Math.max(Math.hypot(toX, toY, toZ), 1e-3)
          // How much of its neighbours lie to one side of it: 0 in the middle of the flock, near 1 at its edge.
          const centrality = Math.hypot(ex, ey, ez) / found
          const keep = (Math.min(1, toLength / (2 * spacingM)) + FlockSimulation.EDGE_COHESION * centrality) * FlockSimulation.COHESION
          dx += toX / toLength * keep; dy += toY / toLength * keep; dz += toZ / toLength * keep
          const meanSpeed = Math.max(Math.hypot(mx, my, mz) / found, 1e-3)
          // Up and down, those too close and the middle of its neighbours count for less than across: what keeps the flock a few birds thick.
          dz *= FlockSimulation.VERTICAL_COHESION
          dx += mx / found / meanSpeed * FlockSimulation.ALIGNMENT; dy += my / found / meanSpeed * FlockSimulation.ALIGNMENT; dz += mz / found / meanSpeed * FlockSimulation.ALIGNMENT
          // As fast as its neighbours fly, a little towards its own cruise.
          wantedSpeed = meanSpeed + (wantedSpeed - meanSpeed) * FlockSimulation.OWN_SPEED
          // Faster when its neighbours are ahead of it, slower when they are behind: what keeps the flock from stringing out along its way,
          // which a turn towards them cannot do.
          wantedSpeed += (toX * ux + toY * uy + toZ * uz) * FlockSimulation.SPEED_COHESION
        }
        // What it is about to fly into, a second ahead: it turns away from the side it would meet, and climbs if the top is near, as a bird
        // does round a tree or a roof. Asked only where there is decor, one cell of it.
        if (obstacles) {
          const meets = obstacles.inside(px[i] + vx[i] * FlockSimulation.AVOID_AHEAD_S, py[i] + vy[i] * FlockSimulation.AVOID_AHEAD_S, pz[i] + vz[i] * FlockSimulation.AVOID_AHEAD_S, spacingM)
            ?? obstacles.inside(px[i], py[i], pz[i], spacingM)
          if (meets) {
            dx += meets.nx * FlockSimulation.AVOIDANCE; dy += meets.ny * FlockSimulation.AVOIDANCE
            if (meets.belowTopM < FlockSimulation.OVER_WITHIN_M) dz += FlockSimulation.AVOIDANCE
          }
        }
        // Where the flock is going, which every bird feels and the informed most (and a bird that found nobody near, strayed past the grid's
        // reach): where the path will be in a moment, up and down as much as across, so that a flock whose path climbs climbs.
        {
          const ahead = FlockSimulation.LOOK_AHEAD_S
          const gx = goal.eastM + goalVelocity.east * ahead - px[i], gy = goal.northM + goalVelocity.north * ahead - py[i]
          const gz = goal.upM + goalVelocity.up * ahead - pz[i]
          const gLength = Math.max(Math.hypot(gx, gy, gz), 1e-3)
          const lead = informed[i] || found === 0 ? FlockSimulation.LEAD : FlockSimulation.FOLLOWER_LEAD
          dx += gx / gLength * lead; dy += gy / gLength * lead; dz += gz / gLength * lead
        }
        const dLength = Math.hypot(dx, dy, dz)
        wantedSpeed = Math.max(0.7 * cruise, Math.min(1.4 * cruise, wantedSpeed))
        // It turns towards that way, as fast as it flies; how fast it flies is set apart (see forwardOf), so that a way wanted off its own
        // does not slow it down.
        const gain = FlockSimulation.STEERING * speed
        let fx = dLength > 1e-6 ? (dx / dLength - ux) * gain : 0
        let fy = dLength > 1e-6 ? (dy / dLength - uy) * gain : 0
        let fz = dLength > 1e-6 ? (dz / dLength - uz) * gain : 0
        if (found > 0) {
          // Turning as its neighbours turn (see the class): what makes a turn a wave.
          fx += (rx / found - tx[i]) * FlockSimulation.TURN_FOLLOWING
          fy += (ry / found - ty[i]) * FlockSimulation.TURN_FOLLOWING
          fz += (rz / found - tz[i]) * FlockSimulation.TURN_FOLLOWING
        }
        // Its own noise, wandering slowly (a new draw every so often, blended in).
        const drift = noise[i]
        drift.x += ((random() - 0.5) * 2 * FlockSimulation.NOISE - drift.x) * step
        drift.y += ((random() - 0.5) * 2 * FlockSimulation.NOISE - drift.y) * step
        drift.z += ((random() - 0.5) * FlockSimulation.NOISE - drift.z) * step
        fx += drift.x; fy += drift.y; fz += drift.z
        // What is across its way is a turn, which it can only make by banking: no more than its lift tilted at the greatest bank.
        const along = fx * ux + fy * uy + fz * uz
        let lx = fx - along * ux, ly = fy - along * uy, lz = fz - along * uz
        const lateral = Math.hypot(lx, ly, lz)
        if (lateral > maxLateral) {
          lx *= maxLateral / lateral; ly *= maxLateral / lateral; lz *= maxLateral / lateral
        }
        wx[i] = lx; wy[i] = ly; wz[i] = lz
        forwardOf[i] = Math.max(-3, Math.min(3, (wantedSpeed - speed) * FlockSimulation.SPEED_RATE))
      }
      for (let i = 0; i < n; i++) {
        // The turn eases towards what the bird is steered to (its inertia), and stays across its way.
        tx[i] += (wx[i] - tx[i]) * lag; ty[i] += (wy[i] - ty[i]) * lag; tz[i] += (wz[i] - tz[i]) * lag
        const speed = Math.max(Math.hypot(vx[i], vy[i], vz[i]), 1e-3)
        const ux = vx[i] / speed, uy = vy[i] / speed, uz = vz[i] / speed
        const off = tx[i] * ux + ty[i] * uy + tz[i] * uz
        tx[i] -= off * ux; ty[i] -= off * uy; tz[i] -= off * uz
        const forward = forwardOf[i]
        vx[i] += (tx[i] + ux * forward) * step; vy[i] += (ty[i] + uy * forward) * step; vz[i] += (tz[i] + uz * forward) * step
        px[i] += vx[i] * step; py[i] += vy[i] * step; pz[i] += vz[i] * step
        // Never inside: one that got in anyway (a wall it could not turn from in time) is put back out by the nearest side, or on top.
        if (obstacles) {
          const inside = obstacles.inside(px[i], py[i], pz[i])
          if (inside) {
            if (inside.belowTopM < inside.depthM) pz[i] += inside.belowTopM
            else { px[i] += inside.nx * inside.depthM; py[i] += inside.ny * inside.depthM }
          }
        }
      }
    }
    return tracks.map(samples => {
      BirdFlock.attitudes(samples)
      return { samples, delayS: 0 }
    })
  }
}

/**
 * The birds of a flock by the cell of space they are in, cells `cellM` wide: a bird's nearest are looked for in its own cell, then the shell
 * of cells round it, and so on until the ones found are surely the nearest (none in a farther shell can be nearer than the shell's inner
 * distance). The cells are hashed into a table twice the size of the flock, so a far flung flock costs no more memory; two cells sharing a
 * slot only add birds to look at, never lose one.
 */
class NeighbourGrid {
  private readonly size: number
  private readonly start: Int32Array
  private readonly counts: Int32Array
  private readonly members: Int32Array
  private readonly slotOf: Int32Array
  /** For each slot, the last search that looked into it: a slot reached by two cells of a search is looked into once. */
  private readonly seen: Int32Array
  private search = 0
  private readonly distances: Float64Array

  constructor(private readonly n: number, private readonly cellM: number) {
    let size = 16
    while (size < n * 2) size *= 2
    this.size = size
    this.start = new Int32Array(size + 1)
    this.counts = new Int32Array(size)
    this.members = new Int32Array(n)
    this.slotOf = new Int32Array(n)
    this.seen = new Int32Array(size)
    this.distances = new Float64Array(n)
  }

  private cell(value: number): number {
    return Math.floor(value / this.cellM)
  }

  private slot(cx: number, cy: number, cz: number): number {
    return (Math.imul(cx, 73856093) ^ Math.imul(cy, 19349663) ^ Math.imul(cz, 83492791)) & (this.size - 1)
  }

  fill(px: Float64Array, py: Float64Array, pz: Float64Array): void {
    this.counts.fill(0)
    for (let i = 0; i < this.n; i++) {
      const s = this.slot(this.cell(px[i]), this.cell(py[i]), this.cell(pz[i]))
      this.slotOf[i] = s
      this.counts[s]++
    }
    this.start[0] = 0
    for (let s = 0; s < this.size; s++) this.start[s + 1] = this.start[s] + this.counts[s]
    const at = this.start.slice(0, this.size)
    for (let i = 0; i < this.n; i++) this.members[at[this.slotOf[i]]++] = i
  }

  /**
   * Puts into `out` the `k` nearest of bird `i` that `sees` lets it see, nearest first, and says how many it found: fewer when, `maxRings`
   * shells out, it had not found them all.
   */
  nearest(i: number, px: Float64Array, py: Float64Array, pz: Float64Array, k: number, maxRings: number, out: Int32Array,
          sees: (dx: number, dy: number, dz: number, d: number) => boolean): number {
    const search = ++this.search
    const cx = this.cell(px[i]), cy = this.cell(py[i]), cz = this.cell(pz[i])
    let found = 0
    const d2 = this.distances
    for (let ring = 0; ring <= maxRings; ring++) {
      for (let x = cx - ring; x <= cx + ring; x++) for (let y = cy - ring; y <= cy + ring; y++) for (let z = cz - ring; z <= cz + ring; z++) {
        // The shell only: the inside was searched at the rings before.
        if (Math.max(Math.abs(x - cx), Math.abs(y - cy), Math.abs(z - cz)) !== ring) continue
        const s = this.slot(x, y, z)
        if (this.seen[s] === search) continue
        this.seen[s] = search
        for (let m = this.start[s]; m < this.start[s + 1]; m++) {
          const j = this.members[m]
          if (j === i) continue
          const dx = px[j] - px[i], dy = py[j] - py[i], dz = pz[j] - pz[i]
          const dd = dx * dx + dy * dy + dz * dz
          if (found === k && dd >= d2[k - 1]) continue
          const d = Math.sqrt(dd)
          if (d > 0 && !sees(dx, dy, dz, d)) continue
          // Insertion into the sorted list of the nearest so far.
          let a = Math.min(found, k - 1)
          while (a > 0 && d2[a - 1] > dd) {
            d2[a] = d2[a - 1]
            out[a] = out[a - 1]
            a--
          }
          d2[a] = dd
          out[a] = j
          if (found < k) found++
        }
      }
      // Anything in a farther shell is at least `ring` cells off.
      if (found === k && d2[k - 1] <= (ring * this.cellM) ** 2) break
    }
    return found
  }
}
