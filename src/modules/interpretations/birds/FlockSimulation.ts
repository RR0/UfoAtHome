import { BirdFlock, FlightPath } from "./BirdFlock.js"
import type { BirdSample, BirdTrack, PathPoint } from "./BirdFlock.js"
import type { BirdSpecies } from "./BirdSpecies.js"

/** What a flock that flies itself needs: where it is led, how many birds of what, how far apart they keep, and its draws. */
export interface FlockSimulationInput {
  path: PathPoint[]
  count: number
  species: BirdSpecies
  /** The distance birds keep from their nearest neighbours, in wingspans. */
  spacing: number
  random: () => number
  sampleMs: number
}

/**
 * A flock that flies itself: every bird steered only by what it sees of a few neighbours and by where the flock is going, and the shape of
 * the whole, its bunching, its stringing out in a turn, its wheeling, coming out of that rather than being drawn.
 *
 * The rules are the classic three of self-organised flocking (Reynolds 1987, "Flocks, herds and schools", SIGGRAPH): keep away from those
 * too close, fly the way the others fly, keep with them. Two measurements of real flocks set how they apply here:
 *
 * - A bird heeds a fixed NUMBER of neighbours, its six or seven nearest, however near or far they are (Ballerini et al. 2008, PNAS 105:
 *   1232, starlings): which is what keeps a flock whole when it thins out. Here, its seven nearest.
 * - A bird turns by banking, as an aircraft does, its lift tilted into the turn, and so can only turn as tightly as its speed and its bank
 *   allow (the premise of Hildenbrandt, Carere & Hemelrijk 2010, Behavioral Ecology 21: 1349, "StarDisplay"); and it holds its cruising
 *   speed. Here, a bank of 60° at most.
 *
 * What leads it is the path: each bird is drawn towards where the path is at that instant, as a flock is towards its roost or along its way,
 * by a pull that grows with how far off it is and saturates, so that the flock follows its path in the large and is free in the small. Each
 * bird has a little noise of its own (a gust, an inattention), drawn from the flock's seed, so that the same statement always flies the same.
 *
 * The weights are this project's, chosen so that a flock at a wingspan and a half holds together through a turn of the path and keeps its
 * spacing: they are not measured. Integrated every 50 ms, all the birds at once.
 */
export class FlockSimulation {
  static readonly STEP_S = 0.05
  static readonly NEIGHBOURS = 7
  static readonly MAX_BANK_DEG = 60
  /** How hard each rule steers, m/s² at full strength. */
  private static readonly SEPARATION = 12
  private static readonly ALIGNMENT = 2.5
  private static readonly COHESION = 1.2
  private static readonly LEAD = 3
  private static readonly NOISE = 1.5
  /** How quickly a bird gets back to its cruising speed, and to the height of the path, per second. */
  private static readonly SPEED_RATE = 1.5
  private static readonly HEIGHT_RATE = 0.4

  static run(input: FlockSimulationInput): BirdTrack[] {
    const { path, count, species, random, sampleMs } = input
    const curve = new FlightPath(path)
    const startT = path[0].t
    const endT = path[path.length - 1].t
    // A flock led along a path flies at the path's speed; one held over a spot (a roost) at a cruising speed of its own, 10 m/s.
    const cruise = Math.max(curve.meanSpeedMS(), 10)
    const spacingM = input.spacing * species.wingspanM
    const start = BirdFlock.slotsOf({ kind: "cluster", spacing: input.spacing }, count, species.wingspanM, random)
    const v0 = curve.velocityAt(startT)
    const heading = Math.atan2(v0.east, v0.north)
    const origin = curve.at(startT)
    const n = count
    const px = new Float64Array(n), py = new Float64Array(n), pz = new Float64Array(n)
    const vx = new Float64Array(n), vy = new Float64Array(n), vz = new Float64Array(n)
    start.forEach((slot, i) => {
      px[i] = origin.eastM + Math.sin(heading) * slot.forwardM + Math.cos(heading) * slot.rightM
      py[i] = origin.northM + Math.cos(heading) * slot.forwardM - Math.sin(heading) * slot.rightM
      pz[i] = origin.upM + slot.upM
      vx[i] = Math.sin(heading) * cruise
      vy[i] = Math.cos(heading) * cruise
    })
    const tracks: BirdSample[][] = start.map(() => [])
    const noise = start.map(() => ({ x: 0, y: 0, z: 0 }))
    const ax = new Float64Array(n), ay = new Float64Array(n), az = new Float64Array(n)
    const distances = new Float64Array(n)
    const order = new Int32Array(n)
    const maxLateral = 9.81 * Math.tan(FlockSimulation.MAX_BANK_DEG * Math.PI / 180)
    const step = FlockSimulation.STEP_S
    let nextSample = startT
    for (let t = startT; t <= endT + 1e-6; t += step * 1000) {
      if (t >= nextSample - 1e-6) {
        for (let i = 0; i < n; i++) tracks[i].push({ t: nextSample, eastM: px[i], northM: py[i], upM: pz[i], headingDeg: 0, pitchDeg: 0, rollDeg: 0 })
        nextSample += sampleMs
      }
      const goal = curve.at(t)
      for (let i = 0; i < n; i++) {
        // Its seven nearest, by a partial selection of the distances.
        for (let j = 0; j < n; j++) {
          distances[j] = j === i ? Infinity : (px[j] - px[i]) ** 2 + (py[j] - py[i]) ** 2 + (pz[j] - pz[i]) ** 2
          order[j] = j
        }
        const k = Math.min(FlockSimulation.NEIGHBOURS, n - 1)
        for (let a = 0; a < k; a++) {
          let best = a
          for (let b = a + 1; b < n; b++) if (distances[order[b]] < distances[order[best]]) best = b
          const swap = order[a]; order[a] = order[best]; order[best] = swap
        }
        let sx = 0, sy = 0, sz = 0, cx = 0, cy = 0, cz = 0, mx = 0, my = 0, mz = 0
        for (let a = 0; a < k; a++) {
          const j = order[a]
          const d = Math.sqrt(distances[j])
          if (d < spacingM) {
            const push = (1 - d / spacingM) / Math.max(d, 1e-3)
            sx -= (px[j] - px[i]) * push; sy -= (py[j] - py[i]) * push; sz -= (pz[j] - pz[i]) * push
          }
          cx += px[j]; cy += py[j]; cz += pz[j]
          mx += vx[j]; my += vy[j]; mz += vz[j]
        }
        let fx = sx * FlockSimulation.SEPARATION, fy = sy * FlockSimulation.SEPARATION, fz = sz * FlockSimulation.SEPARATION
        if (k > 0) {
          const toX = cx / k - px[i], toY = cy / k - py[i], toZ = cz / k - pz[i]
          const toLength = Math.max(Math.hypot(toX, toY, toZ), 1e-3)
          // Towards the middle of its neighbours, the more the farther they are past its spacing.
          const keep = Math.min(1, Math.max(0, toLength - spacingM) / (3 * spacingM))
          fx += toX / toLength * keep * FlockSimulation.COHESION * cruise
          fy += toY / toLength * keep * FlockSimulation.COHESION * cruise
          fz += toZ / toLength * keep * FlockSimulation.COHESION * cruise
          fx += (mx / k - vx[i]) * FlockSimulation.ALIGNMENT * 0.4
          fy += (my / k - vy[i]) * FlockSimulation.ALIGNMENT * 0.4
          fz += (mz / k - vz[i]) * FlockSimulation.ALIGNMENT * 0.4
        }
        // Where the flock is going: a pull towards the path's point, saturating some ten spacings off.
        const gx = goal.eastM - px[i], gy = goal.northM - py[i]
        const gLength = Math.max(Math.hypot(gx, gy), 1e-3)
        const pull = Math.min(1, gLength / (10 * spacingM)) * FlockSimulation.LEAD
        fx += gx / gLength * pull
        fy += gy / gLength * pull
        fz += (goal.upM - pz[i]) * FlockSimulation.HEIGHT_RATE - vz[i] * 0.8
        // Its own noise, wandering slowly (a new draw every so often, blended in).
        const drift = noise[i]
        drift.x += ((random() - 0.5) * 2 * FlockSimulation.NOISE - drift.x) * step
        drift.y += ((random() - 0.5) * 2 * FlockSimulation.NOISE - drift.y) * step
        drift.z += ((random() - 0.5) * FlockSimulation.NOISE - drift.z) * step
        fx += drift.x; fy += drift.y; fz += drift.z
        // Its speed back to its cruise, along the way it flies.
        const speed = Math.max(Math.hypot(vx[i], vy[i], vz[i]), 1e-3)
        const toward = (cruise - speed) * FlockSimulation.SPEED_RATE
        const ux = vx[i] / speed, uy = vy[i] / speed, uz = vz[i] / speed
        // What is across its way is a turn, and a turn it can only make by banking: no more than its lift tilted at the greatest bank.
        const along = fx * ux + fy * uy + fz * uz
        let lx = fx - along * ux, ly = fy - along * uy, lz = fz - along * uz
        const lateral = Math.hypot(lx, ly, lz)
        if (lateral > maxLateral) {
          lx *= maxLateral / lateral; ly *= maxLateral / lateral; lz *= maxLateral / lateral
        }
        const forward = Math.max(-3, Math.min(3, toward + along * 0.2))
        ax[i] = lx + ux * forward
        ay[i] = ly + uy * forward
        az[i] = lz + uz * forward
      }
      for (let i = 0; i < n; i++) {
        vx[i] += ax[i] * step; vy[i] += ay[i] * step; vz[i] += az[i] * step
        px[i] += vx[i] * step; py[i] += vy[i] * step; pz[i] += vz[i] * step
      }
    }
    return tracks.map(samples => {
      BirdFlock.attitudes(samples)
      return { samples, delayS: 0 }
    })
  }
}
