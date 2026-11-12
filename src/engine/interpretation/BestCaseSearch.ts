import { Euler, Quaternion, Vector3 } from "three"
import { computeBodyPosition } from "../astronomy/CelestialPositions.js"
import { Instruments } from "../instrument/Instrument.js"
import { LensGhosts } from "../instrument/LensGhost.js"
import { parseEdtfTime } from "../model/Sighting.js"
import { TimeSpan } from "../model/TimeSpan.js"
import { Provenance } from "../persistence/Provenance.js"
import type { SightingLighting, SightingRecordingJson } from "../persistence/sightingJson.js"
import type { BodyJson, BodyKeyframe, FindingGround, ReadingFinding, ReadingMechanism } from "./Interpretation.js"
import type { ReadingCheckTexts } from "./messages/ReadingCheckTexts.js"

const DEG = Math.PI / 180

/** A point of the picture, as the tangent of its angle off the lens's axis each way: +x right, +y up. Where a ghost's factor is linear. */
interface Tangent { x: number, y: number }

/** The camera at an instant: its rotation, camera frame to world, and its field, degrees from the top of the picture to its bottom. */
interface Frame { rotation: Quaternion, inverse: Quaternion, fovDeg: number }

/** The phenomenon where the account shows it at an instant, in the camera's frame then. */
interface Sample { t: number, at: Tangent, frame: Frame }

/** How far a mechanism at its best stays from the phenomenon, degrees, over all the instants the account shows it. */
interface Miss { medianDeg: number, maxDeg: number }

/** A pose of the camera's track. */
interface PoseKeyframe { t: number, pose: { headingDeg?: number, pitchDeg?: number, rollDeg?: number, fovDeg?: number } }

/** A Sun, by where it is from the way the instrument looked at the start and how high. */
interface SunAt { bearing: number, altitudeDeg: number }

/** What the search needs of the account: the phenomenon, the camera, the bounds of the Sun. */
interface Setting {
  samples: Sample[]
  /** The camera's track, as the account states it. */
  keyframes: readonly PoseKeyframe[]
  sizeDeg: number
  travelDeg: number
  aspect: number
  headingDeg: number
  lighting?: SightingLighting
  lightingGround: FindingGround
  /** How high the Sun can be over the days the account allows, and how low and still seen from where the instrument stood. */
  altitudes: { minDeg: number, maxDeg: number }
}

/**
 * The best case of a reading that says the phenomenon is something its instrument added to the picture (see ReadingMechanism), searched
 * for within what is known of the observation and measured against the picture: the findings it comes to, computed rather than written.
 *
 * Everything is worked out in the camera's own frame, from the phenomenon where the account shows it (its shapes' aims under the camera's
 * pose at each instant: what the picture shows, measured on it). What a mechanism leaves free is set to what keeps it nearest the
 * phenomenon all along: the one place in the frame of a speck; the Sun of a ghost, within the heights the days the account allows give it
 * and, when the account says how the picture is lit (see SightingLighting), on the side that light comes from; the factor and offset of the
 * ghost of an optic no catalogue holds; the way something driven across the glass goes. The heading is taken as free, the Sun's bearing with
 * it: a camera aboard an aircraft recorded no compass. How far it then stays from the phenomenon is the finding: it holds within the
 * phenomenon's own size.
 */
export class BestCaseSearch {

  /** How finely the Sun is searched, degrees: a first pass over the whole sky, then about its best. */
  private static readonly COARSE_DEG = 2
  private static readonly FINE_DEG = 0.25

  constructor(private readonly words: ReadingCheckTexts) {}

  /** The findings of a reading's best case, none for a reading that says no mechanism, or an account with no phenomenon to measure it on. */
  findingsOf(accountJson: SightingRecordingJson, readingJson: SightingRecordingJson): ReadingFinding[] {
    const reading = Provenance.strip(readingJson).recording
    const mechanism = (reading.interpretation as { mechanism?: ReadingMechanism } | undefined)?.mechanism
    if (!mechanism) return []
    const setting = BestCaseSearch.settingOf(accountJson, mechanism.explains)
    if (!setting) return []
    const path = "interpretation.mechanism"
    switch (mechanism.kind) {
      case "fixed-in-frame": {
        const miss = BestCaseSearch.missOf(setting.samples, BestCaseSearch.fixedPoint(setting.samples))
        return [this.finding(this.words.bestFixed, miss, setting, {}, "established", path)]
      }
      case "driven-one-way": {
        const { miss, directionDeg } = BestCaseSearch.oneWay(setting.samples)
        return [this.finding(this.words.bestOneWay, miss, setting, { direction: Math.round(directionDeg) }, "established", path)]
      }
      case "lens-ghost":
        return this.lensGhostFindings(setting, reading, path)
      case "stated-ghost":
        return this.statedGhostFindings(setting, reading, path)
    }
  }

  /** Whether the best case of a mechanism is one this search can lay in the reading's scene (see bestSceneOf). */
  static lays(mechanism: ReadingMechanism | undefined): boolean {
    return mechanism?.kind === "fixed-in-frame" || mechanism?.kind === "driven-one-way"
  }

  /**
   * The reading with its best case laid in its scene, as its findings measure it: what stands still in the frame, a body carried with the
   * camera at the one point of the picture nearest the phenomenon all along; what is driven across the glass, one drop placed on it along
   * the track that never goes back nearest the phenomenon. The rest of the reading is left as it is, and what it said of that body or drop
   * (how far, how big, how bright) kept; what it did not, the phenomenon's own size, at a kilometre. Undefined for a mechanism whose best
   * case is not the reading's to lay (a ghost: its Sun is the account's, with all that hangs on its heading), or an account with no
   * phenomenon to measure it on.
   */
  bestSceneOf(accountJson: SightingRecordingJson, readingJson: SightingRecordingJson): SightingRecordingJson | undefined {
    const reading = Provenance.strip(readingJson).recording
    const mechanism = (reading.interpretation as { mechanism?: ReadingMechanism } | undefined)?.mechanism
    if (!BestCaseSearch.lays(mechanism)) return undefined
    const setting = BestCaseSearch.settingOf(accountJson, mechanism!.explains)
    if (!setting) return undefined
    const scene = structuredClone(readingJson)
    if (mechanism!.kind === "fixed-in-frame") {
      const interpretation = scene.interpretation ?? { bodies: [] }
      const bodies = interpretation.bodies ?? []
      const index = bodies.findIndex(body => body.explains?.includes(mechanism!.explains))
      const body = BestCaseSearch.stillBody(setting, mechanism!.explains, index >= 0 ? bodies[index] : undefined)
      scene.interpretation = { ...interpretation, bodies: index >= 0 ? bodies.map((other, i) => i === index ? body : other) : [...bodies, body] }
    } else {
      const { track } = BestCaseSearch.oneWay(setting.samples)
      const said = scene.lens?.placedDrops?.[0]
      const first = setting.samples[0]
      const radius = said?.radius ?? BestCaseSearch.round(setting.sizeDeg / first.frame.fovDeg, 4)
      const placed = setting.samples.map((sample, i) => {
        const halfHeight = Math.tan(sample.frame.fovDeg / 2 * DEG)
        return {
          t: sample.t,
          x: BestCaseSearch.round(0.5 + track[i].x / (2 * halfHeight * setting.aspect), 4),
          y: BestCaseSearch.round(0.5 - track[i].y / (2 * halfHeight), 4)
        }
      })
      scene.lens = { ...scene.lens, placedDrops: [{ radius, track: placed }] }
    }
    return scene
  }

  /** A body standing still in the frame at its best, carried with the camera at every pose of its track while the phenomenon is shown. */
  private static stillBody(setting: Setting, explains: string, said: BodyJson | undefined): BodyJson {
    const point = BestCaseSearch.fixedPoint(setting.samples)
    const from = setting.samples[0].t, to = setting.samples[setting.samples.length - 1].t
    const times = [...new Set([...setting.samples.map(sample => sample.t), ...setting.keyframes.map(keyframe => keyframe.t).filter(t => t > from && t < to)])].sort((a, b) => a - b)
    const saidFirst = said?.track[0]
    const distanceM = saidFirst?.distanceM ?? 1000
    const sizeM = saidFirst?.sizeM ?? (() => {
      const m = BestCaseSearch.round(distanceM * setting.sizeDeg * DEG, 4)
      return { widthM: m, lengthM: m, heightM: m }
    })()
    const appearance = saidFirst?.appearance ?? { color: "#f4f6f5" }
    const along: BodyKeyframe[] = times.map((t, i) => {
      const world = new Vector3(point.x, point.y, -1).normalize().applyQuaternion(BestCaseSearch.frameAt(setting.keyframes, t).rotation)
      return {
        t, ...(i === 0 ? { present: true, sizeM, appearance } : {}),
        azimuthDeg: BestCaseSearch.round(((Math.atan2(world.x, -world.z) / DEG) + 360) % 360, 3),
        altitudeDeg: BestCaseSearch.round(Math.asin(Math.min(1, Math.max(-1, world.y))) / DEG, 3),
        distanceM
      }
    })
    const step = times.length > 1 ? times[times.length - 1] - times[times.length - 2] : 40
    return {
      ...(said ?? { id: explains, explains: [explains], model: { id: "sphere" } }),
      track: [...along, { t: to + step, present: false }]
    }
  }

  private static round(value: number, digits: number): number {
    return Math.round(value * 10 ** digits) / 10 ** digits
  }

  private lensGhostFindings(setting: Setting, reading: SightingRecordingJson, path: string): ReadingFinding[] {
    const factors = LensGhosts.of(Instruments.byId(reading.instrument)).filter(ghost => !LensGhosts.scatters(ghost)).map(ghost => ghost.scale)
    const reach = reading.lens?.reachDeg ?? LensGhosts.OFF_FRAME_REACH_DEG
    const score = (sun: SunAt) => {
      const suns = BestCaseSearch.sunTrack(setting, sun, reach)
      if (!suns) return undefined
      let best: { miss: Miss, k: number } | undefined
      for (const k of factors) {
        const miss = BestCaseSearch.missOfTrack(setting.samples, suns.map(s => ({ x: k * s.x, y: k * s.y })))
        if (!best || miss.medianDeg < best.miss.medianDeg) best = { miss, k }
      }
      return best
    }
    const within = BestCaseSearch.bestSun(setting, true, score)
    const findings: ReadingFinding[] = []
    if (!within) findings.push({ text: this.words.bestNoGhost, outcome: "fails", against: setting.lightingGround, path })
    else findings.push(this.finding(this.words.bestGhost, within.result.miss, setting, { ...this.sunWords(within.sun), k: this.number(within.result.k) }, setting.lightingGround, path))
    if (setting.lighting && (!within || within.result.miss.medianDeg > setting.sizeDeg)) {
      const anywhere = BestCaseSearch.bestSun(setting, false, score)
      if (anywhere && (!within || anywhere.result.miss.medianDeg < within.result.miss.medianDeg - 1e-6)) {
        findings.push({
          text: this.fill(this.words.bestGhostNeeds, anywhere.result.miss, setting, { ...this.sunWords(anywhere.sun), k: this.number(anywhere.result.k) }),
          outcome: "fails", against: setting.lightingGround, path: "lighting"
        })
      }
    }
    return findings
  }

  private statedGhostFindings(setting: Setting, reading: SightingRecordingJson, path: string): ReadingFinding[] {
    const reach = reading.lens?.reachDeg ?? LensGhosts.OFF_FRAME_REACH_DEG
    const score = (sun: SunAt) => {
      const suns = BestCaseSearch.sunTrack(setting, sun, reach)
      if (!suns) return undefined
      const fit = BestCaseSearch.linearFit(suns, setting.samples.map(sample => sample.at))
      const ghosts = suns.map(s => ({ x: fit.k * s.x + fit.offset.x, y: fit.k * s.y + fit.offset.y }))
      return { miss: BestCaseSearch.missOfTrack(setting.samples, ghosts), ...fit }
    }
    const within = BestCaseSearch.bestSun(setting, true, score)
    if (!within) return [{ text: this.words.bestNoGhost, outcome: "fails", against: setting.lightingGround, path }]
    const offsetDeg = Math.atan(Math.hypot(within.result.offset.x, within.result.offset.y)) / DEG
    return [this.finding(this.words.bestStatedGhost, within.result.miss, setting,
      { ...this.sunWords(within.sun), k: this.number(within.result.k), offset: this.number(offsetDeg) }, setting.lightingGround, path)]
  }

  private finding(template: string, miss: Miss, setting: Setting, values: Record<string, string | number>, against: FindingGround, path: string): ReadingFinding {
    return { text: this.fill(template, miss, setting, values), outcome: miss.medianDeg <= setting.sizeDeg ? "holds" : "fails", against, path }
  }

  private fill(template: string, miss: Miss, setting: Setting, values: Record<string, string | number>): string {
    const all: Record<string, string | number> = {
      median: this.number(miss.medianDeg), max: this.number(miss.maxDeg), size: this.number(setting.sizeDeg), travel: this.number(setting.travelDeg), ...values
    }
    return template.replace(/\{(\w+)\}/g, (whole, key: string) => key in all ? String(all[key]) : whole)
  }

  private sunWords(sun: SunAt): Record<string, string | number> {
    return { bearing: Math.round(sun.bearing), altitude: this.number(sun.altitudeDeg) }
  }

  /** A value of the findings, to a tenth (to the hundredth under one), with the decimal mark of the reader's language. */
  private number(value: number): string {
    const digits = Math.abs(value) < 1 ? 2 : 1
    return value.toFixed(digits).replace(".", this.words.decimal)
  }

  /** The account as the search needs it, or undefined when it does not show the phenomenon in a picture it says the camera of. */
  private static settingOf(accountJson: SightingRecordingJson, explains: string): Setting | undefined {
    const { recording: account, provenance } = Provenance.strip(accountJson)
    const keyframes = account.observerTrack?.keyframes ?? []
    if (keyframes.length === 0) return undefined
    const aspect = Instruments.aspectOf(Instruments.byId(account.instrument))
    const samples: Sample[] = []
    const sizes: number[] = []
    for (const keyframe of account.timeline?.keyframes ?? []) {
      for (const entry of keyframe.shapes ?? []) {
        const shape = entry.shape as { aim?: { azimuthDeg: number, altitudeDeg: number }, angular?: { widthDeg?: number } }
        if (entry.sourceId !== explains || !shape.aim) continue
        const frame = BestCaseSearch.frameAt(keyframes, keyframe.t)
        const local = BestCaseSearch.direction(shape.aim.azimuthDeg, shape.aim.altitudeDeg).applyQuaternion(frame.inverse)
        if (local.z >= 0) continue
        samples.push({ t: keyframe.t, at: { x: local.x / -local.z, y: local.y / -local.z }, frame })
        if (shape.angular?.widthDeg) sizes.push(shape.angular.widthDeg)
      }
    }
    if (samples.length === 0) return undefined
    sizes.sort((a, b) => a - b)
    let travelDeg = 0
    for (const a of samples) for (const b of samples) travelDeg = Math.max(travelDeg, BestCaseSearch.angleDeg(a.at, b.at))
    const start = keyframes[0].pose
    const lat = start.lat ?? 0
    return {
      samples, keyframes, sizeDeg: sizes.length > 0 ? sizes[Math.floor(sizes.length / 2)] : 0.5, travelDeg, aspect, headingDeg: start.headingDeg ?? 0,
      lighting: account.lighting, lightingGround: provenance.at("lighting")?.basis === "assumed" ? "supposed" : "established",
      altitudes: {
        minDeg: -Math.acos(6371000 / (6371000 + Math.max(start.elevationM ?? 0, 0))) / DEG,
        maxDeg: BestCaseSearch.highestSun(account.time, provenance.at("time")?.range, lat, start.lng ?? 0)
      }
    }
  }

  /** How high the Sun gets over the days a time allows (its range when it says one), at that place: what a reading's Sun cannot pass. */
  private static highestSun(time: string | undefined, range: unknown, lat: number, lng: number): number {
    const [start, end] = (typeof range === "string" ? range : time ?? "").split("/")
    const first = start ? parseEdtfTime(start) : undefined
    const last = end ? parseEdtfTime(end) : first
    if (!first || !last) return 90
    const from = TimeSpan.earliestOf(first), to = TimeSpan.latestOf(last)
    const DAY = 86400000
    let highest = -90
    for (let day = Math.floor(from / DAY) * DAY; day <= to; day += DAY) {
      // About local noon, every ten minutes: the Sun's highest that day, to a fraction of a degree.
      const noon = day + (12 - lng / 15) * 3600000
      for (let minutes = -60; minutes <= 60; minutes += 10) {
        highest = Math.max(highest, computeBodyPosition("Sun", new Date(noon + minutes * 60000), { lat, lng, elevationM: 0 }).altitudeDeg)
      }
    }
    return highest
  }

  /** The camera at `t`, between the two poses of the track about it (headings the short way round), at the nearer end outside them. */
  private static frameAt(keyframes: readonly PoseKeyframe[], t: number): Frame {
    const after = keyframes.findIndex(keyframe => keyframe.t > t)
    const a = keyframes[after <= 0 ? (after === 0 ? 0 : keyframes.length - 1) : after - 1]
    const b = after <= 0 ? a : keyframes[after]
    const s = b.t > a.t ? (t - a.t) / (b.t - a.t) : 0
    const mix = (x: number | undefined, y: number | undefined, fallback: number) => (x ?? fallback) + ((y ?? x ?? fallback) - (x ?? fallback)) * s
    const turn = ((((b.pose.headingDeg ?? 0) - (a.pose.headingDeg ?? 0)) % 360) + 540) % 360 - 180
    const heading = (a.pose.headingDeg ?? 0) + turn * s
    // The renderer's own camera: heading about the vertical, then pitch, then roll about the picture's axis (see SceneRenderer).
    const rotation = new Quaternion().setFromEuler(new Euler(mix(a.pose.pitchDeg, b.pose.pitchDeg, 0) * DEG, -heading * DEG, mix(a.pose.rollDeg, b.pose.rollDeg, 0) * DEG, "YXZ"))
    return { rotation, inverse: rotation.clone().invert(), fovDeg: mix(a.pose.fovDeg, b.pose.fovDeg, 50) }
  }

  /** A direction from the observer: east +x, up +y, north −z. */
  private static direction(azimuthDeg: number, altitudeDeg: number): Vector3 {
    const azimuth = azimuthDeg * DEG, altitude = altitudeDeg * DEG
    return new Vector3(Math.sin(azimuth) * Math.cos(altitude), Math.sin(altitude), -Math.cos(azimuth) * Math.cos(altitude))
  }

  /** The angle between two points of the picture, degrees. */
  static angleDeg(a: Tangent, b: Tangent): number {
    const dot = (a.x * b.x + a.y * b.y + 1) / Math.sqrt((a.x * a.x + a.y * a.y + 1) * (b.x * b.x + b.y * b.y + 1))
    return Math.acos(Math.min(1, Math.max(-1, dot))) / DEG
  }

  private static missOf(samples: readonly Sample[], point: Tangent): Miss {
    return BestCaseSearch.missOfTrack(samples, samples.map(() => point))
  }

  /** How far a track stays from the phenomenon, instant by instant: an instant it says nothing of is as far as can be. */
  private static missOfTrack(samples: readonly Sample[], track: readonly (Tangent | undefined)[]): Miss {
    const misses = samples.map((sample, i) => track[i] ? BestCaseSearch.angleDeg(sample.at, track[i]!) : 180).sort((a, b) => a - b)
    return { medianDeg: misses[Math.floor(misses.length / 2)], maxDeg: misses[misses.length - 1] }
  }

  /** The one point of the frame nearest the phenomenon all along: the geometric median of where it was (Weiszfeld). */
  static fixedPoint(samples: readonly Sample[]): Tangent {
    let point = { x: samples.reduce((sum, s) => sum + s.at.x, 0) / samples.length, y: samples.reduce((sum, s) => sum + s.at.y, 0) / samples.length }
    for (let iteration = 0; iteration < 100; iteration++) {
      let x = 0, y = 0, weights = 0
      for (const sample of samples) {
        const weight = 1 / Math.max(Math.hypot(sample.at.x - point.x, sample.at.y - point.y), 1e-9)
        x += sample.at.x * weight; y += sample.at.y * weight; weights += weight
      }
      point = { x: x / weights, y: y / weights }
    }
    return point
  }

  /**
   * Something driven across the frame one way at its best: along a straight line, never back, as near the phenomenon as that lets it be.
   * The way that keeps it nearest, every five degrees; along it, the track that never goes back that is nearest (pool adjacent violators),
   * across it, the one line nearest.
   */
  static oneWay(samples: readonly Sample[]): { miss: Miss, directionDeg: number, track: Tangent[] } {
    let best: { miss: Miss, directionDeg: number, track: Tangent[] } | undefined
    for (let directionDeg = 0; directionDeg < 360; directionDeg += 5) {
      const along = { x: Math.sin(directionDeg * DEG), y: Math.cos(directionDeg * DEG) }
      const across = { x: along.y, y: -along.x }
      const forward = samples.map(sample => sample.at.x * along.x + sample.at.y * along.y)
      const side = samples.map(sample => sample.at.x * across.x + sample.at.y * across.y).sort((a, b) => a - b)
      const line = side[Math.floor(side.length / 2)]
      const fitted = BestCaseSearch.neverBack(forward)
      const track = fitted.map(a => ({ x: a * along.x + line * across.x, y: a * along.y + line * across.y }))
      const miss = BestCaseSearch.missOfTrack(samples, track)
      if (!best || miss.medianDeg < best.miss.medianDeg || (miss.medianDeg === best.miss.medianDeg && miss.maxDeg < best.miss.maxDeg)) best = { miss, directionDeg, track }
    }
    return best!
  }

  /** The values nearest these that never decrease, least squares: pool adjacent violators. */
  static neverBack(values: readonly number[]): number[] {
    const blocks: { sum: number, count: number }[] = []
    for (const value of values) {
      blocks.push({ sum: value, count: 1 })
      while (blocks.length > 1 && blocks[blocks.length - 2].sum / blocks[blocks.length - 2].count > blocks[blocks.length - 1].sum / blocks[blocks.length - 1].count) {
        const last = blocks.pop()!
        blocks[blocks.length - 1].sum += last.sum
        blocks[blocks.length - 1].count += last.count
      }
    }
    return blocks.flatMap(block => new Array<number>(block.count).fill(block.sum / block.count))
  }

  /**
   * Where a Sun is in the picture at each instant the phenomenon is, or undefined when at one of them it is out of the lens's reach (behind
   * it, or further off the frame's corner than `reachDeg`): a ghost the lens did not throw then cannot be the phenomenon then.
   */
  private static sunTrack(setting: Setting, sun: SunAt, reachDeg: number): Tangent[] | undefined {
    const world = BestCaseSearch.direction(setting.headingDeg + sun.bearing, sun.altitudeDeg)
    const track: Tangent[] = []
    for (const sample of setting.samples) {
      const local = world.clone().applyQuaternion(sample.frame.inverse)
      const offAxisDeg = Math.acos(Math.min(1, Math.max(-1, -local.z))) / DEG
      const halfHeight = Math.tan(sample.frame.fovDeg / 2 * DEG)
      const cornerDeg = Math.atan(halfHeight * Math.hypot(1, setting.aspect)) / DEG
      if (local.z >= 0 || offAxisDeg >= cornerDeg + reachDeg) return undefined
      track.push({ x: local.x / -local.z, y: local.y / -local.z })
    }
    return track
  }

  /** The factor and offset that lay a track of the Sun nearest the phenomenon, least squares: what an optic's geometry would have to give. */
  private static linearFit(suns: readonly Tangent[], targets: readonly Tangent[]): { k: number, offset: Tangent } {
    const n = suns.length
    const mean = (points: readonly Tangent[]) => ({ x: points.reduce((s, p) => s + p.x, 0) / n, y: points.reduce((s, p) => s + p.y, 0) / n })
    const s = mean(suns), p = mean(targets)
    let num = 0, den = 0
    for (let i = 0; i < n; i++) {
      num += (suns[i].x - s.x) * (targets[i].x - p.x) + (suns[i].y - s.y) * (targets[i].y - p.y)
      den += (suns[i].x - s.x) ** 2 + (suns[i].y - s.y) ** 2
    }
    const k = den > 1e-12 ? num / den : 0
    return { k, offset: { x: p.x - k * s.x, y: p.y - k * s.y } }
  }

  /**
   * The Sun that scores best, over every bearing and every height the account allows (and, `lit`, only where the picture's light says it
   * was): a pass over the whole sky, then a finer one about its best.
   */
  private static bestSun<R extends { miss: Miss }>(setting: Setting, lit: boolean, score: (sun: SunAt) => R | undefined): { sun: SunAt, result: R } | undefined {
    const allowed = (sun: SunAt) => sun.altitudeDeg >= setting.altitudes.minDeg && sun.altitudeDeg <= setting.altitudes.maxDeg
      && (!lit || !setting.lighting || BestCaseSearch.lights(setting.lighting, sun))
    let best: { sun: SunAt, result: R } | undefined
    const consider = (sun: SunAt) => {
      if (!allowed(sun)) return
      const result = score(sun)
      if (result && (!best || result.miss.medianDeg < best.result.miss.medianDeg)) best = { sun, result }
    }
    const { minDeg, maxDeg } = setting.altitudes
    for (let bearing = 0; bearing < 360; bearing += BestCaseSearch.COARSE_DEG) {
      for (let altitudeDeg = minDeg; altitudeDeg <= maxDeg; altitudeDeg += BestCaseSearch.COARSE_DEG / 2) consider({ bearing, altitudeDeg })
      consider({ bearing, altitudeDeg: maxDeg })
    }
    if (!best) return undefined
    const around: SunAt = best.sun
    for (let db = -BestCaseSearch.COARSE_DEG; db <= BestCaseSearch.COARSE_DEG; db += BestCaseSearch.FINE_DEG) {
      for (let da = -BestCaseSearch.COARSE_DEG; da <= BestCaseSearch.COARSE_DEG; da += BestCaseSearch.FINE_DEG) {
        consider({ bearing: ((around.bearing + db) % 360 + 360) % 360, altitudeDeg: around.altitudeDeg + da })
      }
    }
    return best
  }

  /** Whether a Sun there lights the scene as `lighting` says the picture shows it (as ReadingCheck.lights, which this repeats so as not to import it back). */
  private static lights(lighting: SightingLighting, sun: SunAt): boolean {
    const arc = lighting.sunFromViewDeg
    const along = arc ? ((sun.bearing - arc.fromDeg) % 360 + 360) % 360 : 0
    const span = arc ? ((arc.toDeg - arc.fromDeg) % 360 + 360) % 360 : 360
    const inAltitude = !lighting.sunAltitudeDeg || (sun.altitudeDeg >= lighting.sunAltitudeDeg.minDeg && sun.altitudeDeg <= lighting.sunAltitudeDeg.maxDeg)
    return along <= span && inAltitude
  }
}
