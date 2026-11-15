import type { SaidText } from "../../../engine/model/SaidText.js"
import type { BodyJson, BodyKeyframe } from "../../../engine/interpretation/Interpretation.js"
import { BirdSpecies } from "./BirdSpecies.js"
import type { BirdColourKey, BirdFlightStyle } from "./BirdSpecies.js"
import { FlockSimulation } from "./FlockSimulation.js"

/**
 * Birds an interpretation claims were what the observer saw: a gull close to a camera that its shutter smeared into a saucer, a skein of
 * geese whose white bellies the street lamps of a town lit from below, pelicans far off flashing in the sun as they flapped and glided.
 *
 * Stated as an analyst would: what birds, how many, in what arrangement, and where the flock went when (its `path`). Each bird is COMPUTED
 * from that into a body of its own (see BirdFlock.bodiesOf), drawn as a model whose wings beat at its species' rate, banked in its turns,
 * pitched as it climbs: so that what the flock looks like from the observer, its outline, how it shimmers as the wings of thirty birds beat
 * out of step, how it turns and stretches, what a light from below shows of it, is what follows from the claim and not what was drawn.
 *
 * The arrangements are those the literature measures (see BirdFormation): lines (V, J, echelon, column) where each bird rides the upwash of
 * the one ahead, a wingspan to its side; clusters and fronts; one bird alone; and a flock that FLIES ITSELF (see FlockSimulation), every bird
 * reacting to its nearest neighbours, for the whole of a flock's movement: how it bunches, strings out and wheels round the way it is led.
 */
export interface BirdFlockJson {
  id: string
  title?: SaidText
  /** What they are: one of BirdSpecies.ALL. */
  species: string
  /** How many. 1 when absent. */
  count?: number
  formation?: BirdFormation
  /**
   * Where the flock goes, through these points at these instants: its leader for a line, its middle otherwise. Smoothed between them (a
   * flock does not turn at a corner), and held at the first before it and at the last after it. Two points at least make a flock fly.
   */
  path: BirdWaypoint[]
  /** Their wingbeat frequency, Hz, measured, instead of the one their species predicts (see BirdSpecies.wingbeatHz). */
  wingbeatHz?: number
  /** How they fly, instead of how their species does (see BirdSpecies.flight). */
  flight?: BirdFlightStyle
  /** Their colours, instead of their species'. */
  colours?: Partial<Record<BirdColourKey, string>>
  /**
   * The light that comes up at them from below, at the height they fly: the lamps of a town lit on the ground under them, as an illuminance
   * on a surface facing down, lux, and its colour. What lights a night flock's white bellies when nothing else does. Unlit from below when
   * absent: the scene's own light is all there is (see BodyJson.lightFromBelow).
   */
  lightFromBelow?: { lux: number, color?: string }
  /** The height above sea level of the ground at the recording's origin, m: what sets how thin the air they beat their wings in is. */
  originElevationM?: number
  /** The phenomena of the account the flock claims to be, together (see BodyJson.ensemble): a whole flock taken for one craft. */
  explains?: string[]
  /**
   * The phenomenon of the account each bird claims to be, in the order of the flock (the leader first): a chain of nine birds taken for a
   * chain of nine craft, each measured against its own. Instead of `explains`; a bird past the list explains nothing.
   */
  explainsEach?: string[]
  /** What the draws start from: where each bird is in the arrangement, how it wanders, when its wings start. 1 when absent. */
  seed?: number
}

/**
 * A point of the flock's path: where it is at `t`, ms of the recording, in the recording's own frame (see BodyKeyframe), or as a direction
 * and a distance from the recording's origin (an observer's eye at `eyeHeightM`), and how high.
 */
export type BirdWaypoint = { t: number } & (
  | { eastM: number, northM: number, altitudeM: number }
  | { azimuthDeg: number, altitudeDeg: number, distanceM: number, eyeHeightM?: number }
)

/**
 * How the birds of a flock are arranged round its path (see the kinds). Spacing is in wingspans of the species, the measure the literature
 * gives it in: in a line, a follower sits about a wingspan to the side of the bird ahead, in its upwash (Lissaman & Shollenberger 1970,
 * Science 168: 1003; Portugal et al. 2014, Nature 505: 399, ibis wing tips overlapping by some 10 cm).
 *
 * - "single": one bird, on the path.
 * - "v", "j", "echelon": lines from a leader, two arms (V), two arms unequal (J, `asymmetry`), one arm (echelon). The angle between the two
 *   arms of a goose V is 34 ± 6° in photographs (Gould & Heppner 1974, Auk 91: 494) and 71.5 ± 23° by radar (Williams et al. 1976, Auk 93:
 *   554); 70 when absent.
 * - "column": one behind the other.
 * - "front": abreast, a ragged line across the way they go, as gulls and waders fly.
 * - "cluster": a loose crowd, thinner up and down than across and along: starling flocks measure 1 : 2.8 : 5.6 whatever their size
 *   (Ballerini et al. 2008, Animal Behaviour 76: 201).
 * - "flock": a crowd that flies itself (see FlockSimulation), led along the path; its shape is what each bird's reactions make of it.
 */
export interface BirdFormation {
  kind: "single" | "v" | "j" | "echelon" | "column" | "front" | "cluster" | "flock"
  /** The angle between the two arms of a V or a J, degrees. 70 when absent. */
  angleDeg?: number
  /** The share of the birds on the right arm of a J (0.5 a V, 1 an echelon to the right). 0.7 for a J when absent. */
  asymmetry?: number
  /** Between neighbours, in wingspans: to the side in a line, to the nearest in a crowd. 1 in a line, 1.5 in a crowd when absent. */
  spacing?: number
  /** How much each bird strays from its place, in wingspans, over a few seconds. 0.15 in a line, 0.4 in a crowd when absent. */
  wander?: number
}

/** A bird's place in its flock: metres ahead (negative: behind) of the path's point, to its right and above it. */
interface Slot {
  forwardM: number
  rightM: number
  upM: number
}

/** Where a bird is and how it is turned at one instant. */
export interface BirdSample {
  t: number
  eastM: number
  northM: number
  upM: number
  headingDeg: number
  pitchDeg: number
  rollDeg: number
}

export class BirdFlock {
  /** How often a bird's track is sampled, ms, unless the flock is large (see sampleMs). */
  static readonly SAMPLE_MS = 100
  /** The most keyframes all the birds of one flock are given: past that they are sampled more sparsely. */
  static readonly MAX_KEYFRAMES = 60_000
  private static readonly computed = new Map<string, BodyJson[]>()

  /** The bodies of one flock, one per bird; computed once for the same statement. */
  static bodiesOf(flock: BirdFlockJson): BodyJson[] {
    const key = JSON.stringify(flock)
    let bodies = BirdFlock.computed.get(key)
    if (!bodies) {
      bodies = BirdFlock.compute(flock)
      BirdFlock.computed.set(key, bodies)
      if (BirdFlock.computed.size > 16) BirdFlock.computed.delete(BirdFlock.computed.keys().next().value!)
    }
    return bodies
  }

  static speciesOf(flock: BirdFlockJson): BirdSpecies {
    return BirdSpecies.byId(flock.species) ?? BirdSpecies.ALL[0]
  }

  private static compute(flock: BirdFlockJson): BodyJson[] {
    const path = BirdFlock.pathOf(flock)
    if (path.length === 0) return []
    const species = BirdFlock.speciesOf(flock)
    const count = Math.max(1, Math.floor(flock.count ?? 1))
    const random = BirdFlock.randomFrom(flock.seed ?? 1)
    const hz = flock.wingbeatHz ?? BirdSpecies.wingbeatHz(species, BirdSpecies.airDensityAt((flock.originElevationM ?? 0) + path[0].upM))
    const flight = flock.flight ?? species.flight
    const startT = path[0].t
    const endT = path[path.length - 1].t
    const sampleMs = BirdFlock.sampleMs(count, endT - startT)
    const tracks = flock.formation?.kind === "flock"
      ? FlockSimulation.run({ path, count, species, spacing: flock.formation.spacing ?? 1.5, random, sampleMs })
      : BirdFlock.arranged(flock, path, species, count, random, sampleMs)
    const size = BirdSpecies.sizeOf(species)
    const colours = { ...species.colours, ...flock.colours }
    return tracks.map((track, index) => {
      // Each bird beats at its own rate, a few per cent off the others', and starts at its own point of the beat: thirty birds' wings out of
      // step are what makes a flock shimmer.
      const ownHz = hz * (1 + (random() - 0.5) * 0.06)
      const phase = random()
      const delayS = track.delayS
      const keys: BodyKeyframe[] = track.samples.map((sample, k) => ({
        t: Math.round(sample.t),
        eastM: BirdFlock.round(sample.eastM),
        northM: BirdFlock.round(sample.northM),
        altitudeM: BirdFlock.round(sample.upM - size.heightM / 2),
        ...(k === 0 ? { sizeM: size, appearance: { color: species.plumage.color, albedo: species.plumage.albedo } } : {}),
        attitude: { headingDeg: BirdFlock.round(sample.headingDeg), pitchDeg: BirdFlock.round(sample.pitchDeg), rollDeg: BirdFlock.round(sample.rollDeg) },
        motions: { flap: BirdFlock.round(BirdFlock.beatsAt((sample.t - startT) / 1000 - delayS, ownHz, flight, phase), 1000) }
      }))
      const body: BodyJson = {
        id: count > 1 ? `${flock.id}-${index + 1}` : flock.id,
        ...(flock.title ? { title: flock.title } : {}),
        ...(flock.explainsEach
          ? (flock.explainsEach[index] !== undefined ? { explains: [flock.explainsEach[index]] } : {})
          : { ...(flock.explains ? { explains: flock.explains } : {}), ...(count > 1 ? { ensemble: flock.id } : {}) }),
        model: { id: `ufoathome-bird-${species.build}` },
        shadow: false,
        ...(Object.keys(colours).length > 0 ? { modelParameters: colours } : {}),
        ...(flock.lightFromBelow ? { lightFromBelow: flock.lightFromBelow } : {}),
        track: keys
      }
      return body
    })
  }

  /**
   * How many wingbeats a bird has made `s` seconds into its flight, from its own `phase` of the beat: `hz` beats a second all along, or in
   * bursts with a glide between them, during which the count stays at a whole number (the gliding pose, see scripts/build-birds.ts).
   */
  static beatsAt(s: number, hz: number, flight: BirdFlightStyle, phase: number): number {
    if (flight.kind === "flapping") return Math.max(0, s * hz + phase)
    const flapS = flight.beats / hz
    const cycleS = flapS + flight.glideS
    // Where in its cycle it starts is its own, so that a crowd of pelicans does not all glide at once.
    const t = Math.max(0, s + phase * cycleS)
    const cycles = Math.floor(t / cycleS)
    const into = t - cycles * cycleS
    return cycles * flight.beats + Math.min(flight.beats, into * hz)
  }

  /** Every 100 ms, or more sparsely for a flock that would otherwise have more than MAX_KEYFRAMES. */
  static sampleMs(count: number, spanMs: number): number {
    const keys = count * (spanMs / BirdFlock.SAMPLE_MS + 1)
    return keys <= BirdFlock.MAX_KEYFRAMES ? BirdFlock.SAMPLE_MS : Math.ceil(BirdFlock.SAMPLE_MS * keys / BirdFlock.MAX_KEYFRAMES / 50) * 50
  }

  /** The path's points in the recording's frame, in time order. */
  static pathOf(flock: BirdFlockJson): PathPoint[] {
    return [...flock.path].sort((a, b) => a.t - b.t).map(point => {
      if ("eastM" in point) return { t: point.t, eastM: point.eastM, northM: point.northM, upM: point.altitudeM }
      const az = point.azimuthDeg * Math.PI / 180, alt = point.altitudeDeg * Math.PI / 180
      const level = point.distanceM * Math.cos(alt)
      return { t: point.t, eastM: level * Math.sin(az), northM: level * Math.cos(az), upM: (point.eyeHeightM ?? 1.6) + point.distanceM * Math.sin(alt) }
    })
  }

  /**
   * Each bird of a flock with a set arrangement: its place round the path (see slotsOf), plus a slow wander of its own. A bird behind the
   * leader follows the path as the leader flew it that many seconds before, not as it is now: it rides the air the bird ahead stirred, so a
   * line snakes after its leader and keeps its shape through a turn, rather than swinging round like a rigid board.
   */
  private static arranged(flock: BirdFlockJson, path: PathPoint[], species: BirdSpecies, count: number, random: () => number, sampleMs: number): BirdTrack[] {
    const formation = flock.formation ?? { kind: count > 1 ? "cluster" : "single" }
    const slots = BirdFlock.slotsOf(formation, count, species.wingspanM, random)
    const line = formation.kind === "v" || formation.kind === "j" || formation.kind === "echelon" || formation.kind === "column"
    const wanderM = (formation.wander ?? (line ? 0.15 : 0.4)) * species.wingspanM
    const curve = new FlightPath(path)
    const speed = Math.max(curve.meanSpeedMS(), 1)
    return slots.map(slot => {
      const delayS = line ? Math.max(0, -slot.forwardM) / speed : 0
      const sway = BirdFlock.swayFrom(random, wanderM)
      const samples: BirdSample[] = []
      for (let t = path[0].t; t <= path[path.length - 1].t + 1e-6; t += sampleMs) {
        const s = (t - path[0].t) / 1000
        const at = t - delayS * 1000
        const point = curve.at(at)
        const tangent = curve.velocityAt(at)
        const heading = Math.atan2(tangent.east, tangent.north)
        const [dForward, dRight, dUp] = sway(s)
        // The leader's track as it was, and the bird's offset across it: in a line, its distance behind is the delay.
        const forward = line ? dForward : slot.forwardM + dForward
        const right = slot.rightM + dRight
        const east = point.eastM + Math.sin(heading) * forward + Math.cos(heading) * right
        const north = point.northM + Math.cos(heading) * forward - Math.sin(heading) * right
        samples.push({ t, eastM: east, northM: north, upM: point.upM + slot.upM + dUp, headingDeg: 0, pitchDeg: 0, rollDeg: 0 })
      }
      BirdFlock.attitudes(samples)
      return { samples, delayS }
    })
  }

  /** Where each bird of `formation` sits round the path's point, metres; the first is the leader of a line. */
  static slotsOf(formation: BirdFormation, count: number, wingspanM: number, random: () => number): Slot[] {
    const slots: Slot[] = []
    const kind = formation.kind
    if (kind === "single" || count === 1) return [{ forwardM: 0, rightM: 0, upM: 0 }]
    if (kind === "v" || kind === "j" || kind === "echelon" || kind === "column") {
      const lateral = (formation.spacing ?? 1) * wingspanM * (kind === "column" ? 0 : 1)
      const half = (formation.angleDeg ?? 70) / 2 * Math.PI / 180
      const behind = kind === "column" ? (formation.spacing ?? 1) * wingspanM : lateral / Math.tan(half)
      const rightShare = kind === "v" ? 0.5 : kind === "echelon" || kind === "column" ? 1 : formation.asymmetry ?? 0.7
      slots.push({ forwardM: 0, rightM: 0, upM: 0 })
      // The followers shared between the two arms as `rightShare` says, and taken in turn from the front: the arm that is behind its share
      // gets the next one, so that a V alternates and a J fills both arms from the front.
      const rightCount = Math.round(rightShare * (count - 1))
      let right = 0, left = 0
      for (let i = 1; i < count; i++) {
        const onRight = left >= count - 1 - rightCount || (right < rightCount && right / Math.max(rightCount, 1) <= left / Math.max(count - 1 - rightCount, 1))
        const rank = onRight ? ++right : ++left
        // Followers fly level with the bird ahead or a little under it (Perinot et al. 2024, ibis).
        slots.push({ forwardM: -behind * rank, rightM: (onRight ? 1 : -1) * lateral * rank, upM: -0.05 * wingspanM * rank * random() })
      }
      return slots
    }
    const spacingM = (formation.spacing ?? 1.5) * wingspanM
    if (kind === "front") {
      for (let i = 0; i < count; i++) {
        slots.push({ forwardM: (random() - 0.5) * spacingM * 1.2, rightM: (i - (count - 1) / 2) * spacingM, upM: (random() - 0.5) * spacingM * 0.4 })
      }
      return slots
    }
    // A crowd: an ellipsoid of 1 : 2.8 : 5.6 (up : across : along, Ballerini et al. 2008) that holds `count` birds at about `spacingM`
    // from each other, filled at random but never two birds closer than half that.
    const volume = count * spacingM ** 3
    const unit = Math.cbrt(volume / (4 / 3 * Math.PI * 1 * 2.8 * 5.6))
    const radii = { up: unit, across: 2.8 * unit, along: 5.6 * unit }
    let tries = 0
    while (slots.length < count && tries < count * 200) {
      tries++
      const x = 2 * random() - 1, y = 2 * random() - 1, z = 2 * random() - 1
      if (x * x + y * y + z * z > 1) continue
      const slot = { forwardM: x * radii.along, rightM: y * radii.across, upM: z * radii.up }
      if (slots.some(other => (other.forwardM - slot.forwardM) ** 2 + (other.rightM - slot.rightM) ** 2 + (other.upM - slot.upM) ** 2 < (spacingM / 2) ** 2)) continue
      slots.push(slot)
    }
    while (slots.length < count) slots.push({ forwardM: (random() - 0.5) * radii.along, rightM: (random() - 0.5) * radii.across, upM: 0 })
    return slots
  }

  /** A slow, smooth wander about a place, metres forward, right and up at `s` seconds: two sines on each axis, of its own phases. */
  private static swayFrom(random: () => number, amplitudeM: number): (s: number) => [number, number, number] {
    const terms = [0, 1, 2].map(axis => [0, 1].map(() => ({
      period: 3 + random() * 7, phase: random() * 2 * Math.PI, share: (axis === 2 ? 0.4 : axis === 1 ? 0.7 : 1) * (0.4 + 0.6 * random())
    })))
    return s => terms.map(axis => axis.reduce((sum, term) => sum + amplitudeM * term.share * 0.5 * Math.sin(2 * Math.PI * s / term.period + term.phase), 0)) as [number, number, number]
  }

  /**
   * Each sample's heading, pitch and bank from the track itself: it points where it goes, noses up as it climbs, and banks into a turn as a
   * bird does to turn, by the angle whose tangent is its sideways acceleration over gravity.
   */
  static attitudes(samples: BirdSample[]): void {
    const n = samples.length
    if (n < 2) return
    for (let k = 0; k < n; k++) {
      const a = samples[Math.max(0, k - 1)], b = samples[Math.min(n - 1, k + 1)]
      const dt = (b.t - a.t) / 1000
      const ve = (b.eastM - a.eastM) / dt, vn = (b.northM - a.northM) / dt, vu = (b.upM - a.upM) / dt
      const level = Math.hypot(ve, vn)
      const sample = samples[k]
      sample.headingDeg = level > 0.05 ? ((Math.atan2(ve, vn) * 180 / Math.PI) + 360) % 360 : k > 0 ? samples[k - 1].headingDeg : 0
      sample.pitchDeg = Math.atan2(vu, Math.max(level, 0.5)) * 180 / Math.PI
    }
    for (let k = 0; k < n; k++) {
      const a = samples[Math.max(0, k - 2)], b = samples[Math.min(n - 1, k + 2)]
      const dt = (b.t - a.t) / 1000
      let turn = b.headingDeg - a.headingDeg
      turn = ((turn + 540) % 360) - 180
      const sample = samples[k]
      const prev = samples[Math.max(0, k - 1)], next = samples[Math.min(n - 1, k + 1)]
      const speed = Math.hypot(next.eastM - prev.eastM, next.northM - prev.northM) / Math.max((next.t - prev.t) / 1000, 1e-3)
      const rate = dt > 0 ? turn * Math.PI / 180 / dt : 0
      const bank = Math.atan(speed * rate / BirdSpecies.G) * 180 / Math.PI
      sample.rollDeg = Math.max(-70, Math.min(70, bank))
    }
  }

  /** A generator of numbers from 0 to 1 that gives the same ones for the same seed (mulberry32). */
  static randomFrom(seed: number): () => number {
    let state = seed >>> 0
    return () => {
      state = (state + 0x6d2b79f5) >>> 0
      let z = state
      z = Math.imul(z ^ (z >>> 15), z | 1)
      z ^= z + Math.imul(z ^ (z >>> 7), z | 61)
      return ((z ^ (z >>> 14)) >>> 0) / 4294967296
    }
  }

  private static round(value: number, per = 100): number {
    return Math.round(value * per) / per
  }
}

/** A point the flock passes, in the recording's frame: ms, metres east, north, and up from the ground at the origin. */
export interface PathPoint {
  t: number
  eastM: number
  northM: number
  upM: number
}

/** One bird's track, and how far behind the head of its line it is in time (which delays its wingbeats too). */
export interface BirdTrack {
  samples: BirdSample[]
  delayS: number
}

/**
 * The flock's path, smooth through its points: a Catmull-Rom curve in time (centripetal would follow distance, but a flock's path is stated
 * as where it was WHEN, so the time is the parameter), held still before the first point and after the last.
 */
export class FlightPath {
  constructor(private readonly points: PathPoint[]) {}

  at(t: number): PathPoint {
    const p = this.points
    if (p.length === 1 || t <= p[0].t) return this.extrapolated(t, 0)
    if (t >= p[p.length - 1].t) return this.extrapolated(t, p.length - 1)
    let i = 0
    while (i < p.length - 2 && t > p[i + 1].t) i++
    const p0 = p[Math.max(0, i - 1)], p1 = p[i], p2 = p[i + 1], p3 = p[Math.min(p.length - 1, i + 2)]
    const u = (t - p1.t) / (p2.t - p1.t)
    // Tangents by the times of the neighbours, so that unevenly timed points do not overshoot.
    const tangent = (a: PathPoint, b: PathPoint, key: "eastM" | "northM" | "upM") => (b[key] - a[key]) / Math.max(b.t - a.t, 1) * (p2.t - p1.t)
    const value = (key: "eastM" | "northM" | "upM") => {
      const m1 = tangent(p0, p2, key), m2 = tangent(p1, p3, key)
      const u2 = u * u, u3 = u2 * u
      return (2 * u3 - 3 * u2 + 1) * p1[key] + (u3 - 2 * u2 + u) * m1 + (-2 * u3 + 3 * u2) * p2[key] + (u3 - u2) * m2
    }
    return { t, eastM: value("eastM"), northM: value("northM"), upM: value("upM") }
  }

  /** Before the first point and after the last, the flock keeps flying as it was, rather than stopping in the air. */
  private extrapolated(t: number, index: number): PathPoint {
    const p = this.points
    const from = p[index]
    if (p.length < 2) return { ...from, t }
    const a = index === 0 ? p[0] : p[p.length - 2], b = index === 0 ? p[1] : p[p.length - 1]
    const dt = (t - from.t) / Math.max(b.t - a.t, 1)
    return { t, eastM: from.eastM + (b.eastM - a.eastM) * dt, northM: from.northM + (b.northM - a.northM) * dt, upM: from.upM + (b.upM - a.upM) * dt }
  }

  velocityAt(t: number): { east: number, north: number, up: number } {
    const a = this.at(t - 50), b = this.at(t + 50)
    return { east: (b.eastM - a.eastM) / 0.1, north: (b.northM - a.northM) / 0.1, up: (b.upM - a.upM) / 0.1 }
  }

  meanSpeedMS(): number {
    const p = this.points
    if (p.length < 2) return 0
    let distance = 0
    for (let i = 1; i < p.length; i++) distance += Math.hypot(p[i].eastM - p[i - 1].eastM, p[i].northM - p[i - 1].northM, p[i].upM - p[i - 1].upM)
    return distance / Math.max((p[p.length - 1].t - p[0].t) / 1000, 1e-3)
  }
}
