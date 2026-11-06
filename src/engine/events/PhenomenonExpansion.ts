import type { Sighting } from "../model/Sighting.js"
import type { Keyframe, ShapeState } from "../model/Keyframe.js"
import type { TimelineJson } from "../model/Timeline.js"
import { DriveExpansion } from "./DriveExpansion.js"
import type { BlinkParams, EventPlace, AppearanceParams, LookPart, RecordingEventJson, StandParams } from "./RecordingEvent.js"
import { SkyPath } from "./SkyPath.js"

/** A look and when it lasts. */
interface Look {
  t: number
  until: number
  parts: LookPart[]
}

/**
 * The account's shapes worked out from what the phenomenon did (see StandParams, AppearanceParams, BlinkParams, and `vanish`: it is no longer seen
 * from then on): its parts where its place is in the observer's sky at each instant, at the size its metres make at that distance, as each
 * look draws them, blinking as they blinked.
 *
 * Or, going across the sky with no place (see TravelParams, SkyTurnParams), its parts laid along the way it goes on the observer's picture: the
 * shares that put a part along the horizontal axis of one that stands put it along its motion there, ahead or behind, and across it, to its
 * left; each turned with that motion.
 *
 * Written as keyframes every SAMPLE_MS (TRAVEL_SAMPLE_MS going across the sky, which turns fast) while it is seen, where its looks change (the part that goes, a millisecond before the next look, so
 * that nothing fades from one into the other), and on either side of every switch of a blinking part, which the interpolation between
 * keyframes then holds.
 */
export class PhenomenonExpansion {
  private static readonly SAMPLE_MS = 2000
  private static readonly TRAVEL_SAMPLE_MS = 25
  /** Either side of an instant, the way it goes there is read from where it is, ms. */
  private static readonly MOTION_MS = 40
  private static readonly R = 6371008.8

  private readonly looks: Look[]
  private readonly blinks: { t: number, until: number, parts: string[], params: BlinkParams }[]
  private readonly vanishAt: number | undefined
  /** Its way across the sky, when it has no place (see TravelParams). */
  private readonly path: SkyPath | undefined

  constructor(private readonly sighting: Sighting, private readonly stand: RecordingEventJson, events: RecordingEventJson[], end: number) {
    const looks = events.filter(event => event.eventType === "appearance").sort((a, b) => a.t - b.t)
    this.vanishAt = events.find(event => event.eventType === "vanish")?.t
    const last = this.vanishAt ?? end
    this.path = stand.eventType === "travel" ? new SkyPath(stand, events.filter(event => event.eventType === "turn"), end) : undefined
    this.looks = looks.map((event, k) => ({ t: event.t, until: event.until ?? looks[k + 1]?.t ?? last, parts: (event.params as unknown as AppearanceParams).parts }))
    this.blinks = events.filter(event => event.eventType === "blink")
      .map(event => ({ t: event.t, until: event.until ?? last, parts: event.who === undefined ? [] : sighting.timeline.leavesOf(event.who), params: event.params as unknown as BlinkParams }))
  }

  /** The account's timeline, as a file writes it. */
  timeline(): TimelineJson {
    const frames = new Map<number, Map<string, ShapeState>>()
    const put = (t: number, sourceId: string) => {
      const state = this.state(sourceId, t)
      if (!state) return
      if (!frames.has(t)) frames.set(t, new Map())
      frames.get(t)!.set(sourceId, state)
    }
    const order = [...new Set(this.looks.flatMap(look => look.parts.map(part => part.sourceId)))]
    this.looks.forEach((look, k) => {
      const next = this.looks[k + 1]
      for (const sourceId of order) {
        const shown = look.parts.some(part => part.sourceId === sourceId)
        if (!shown) {
          // Not seen in this look: hidden from its start, and still a millisecond before a look that shows it, or it would fade in all along.
          put(look.t, sourceId)
          if (next?.parts.some(part => part.sourceId === sourceId)) put(next.t - 1, sourceId)
          continue
        }
        const sample = this.sighting.sampleMs ?? (this.path ? PhenomenonExpansion.TRAVEL_SAMPLE_MS : PhenomenonExpansion.SAMPLE_MS)
        for (let t = look.t; t < look.until; t += sample) put(t, sourceId)
        put(look.until - 1, sourceId)
      }
    })
    for (const blink of this.blinks) {
      for (const [from, to] of this.phases(blink)) {
        for (const sourceId of blink.parts) {
          put(from, sourceId)
          put(to - 1, sourceId)
        }
      }
    }
    if (this.vanishAt !== undefined) for (const sourceId of order) put(this.vanishAt, sourceId)
    const keyframes: Keyframe[] = [...frames.keys()].sort((a, b) => a - b).map(t => ({ t, shapes: [...frames.get(t)!.values()] }))
    // A shape turned with its motion goes the short way from one keyframe to the next: the player blends its angle as a number.
    const previous = new Map<string, number>()
    for (const keyframe of keyframes) {
      for (const state of keyframe.shapes) {
        const angle = state.shape.angle
        const before = previous.get(state.sourceId)
        if (angle === undefined) continue
        const unwrapped = before === undefined ? angle : angle + 2 * Math.PI * Math.round((before - angle) / (2 * Math.PI))
        state.shape.angle = Math.round(unwrapped * 1e4) / 1e4
        previous.set(state.sourceId, unwrapped)
      }
    }
    return { keyframes, order, groups: [] }
  }

  /** The blink's phases, [from, to) each, on first. */
  private phases(blink: { t: number, until: number, parts: string[], params: BlinkParams }): [number, number][] {
    const phases: [number, number][] = []
    let on = true
    for (let t = blink.t; t < blink.until;) {
      const next = Math.min(t + (on ? blink.params.onS : blink.params.offS) * 1000, blink.until)
      phases.push([t, next])
      t = next
      on = !on
    }
    return phases
  }

  /** Whether a blinking part is off at `t`. */
  private off(sourceId: string, t: number): BlinkParams["off"] | undefined {
    for (const blink of this.blinks) {
      if (t < blink.t || t >= blink.until || !blink.parts.includes(sourceId)) continue
      const phase = this.phases(blink).findIndex(([from, to]) => t >= from && t < to)
      if (phase % 2 === 1) return blink.params.off
    }
    return undefined
  }

  /** The part `sourceId` at `t`: drawn by the look of that instant, hidden when that look has it not (drawn by the nearest look that does). */
  private state(sourceId: string, t: number): ShapeState | undefined {
    const current = [...this.looks].reverse().find(look => look.t <= t) ?? this.looks[0]
    const own = current?.parts.find(part => part.sourceId === sourceId)
    const definer = own ? current : this.looks.find(look => look.t > t && look.parts.some(part => part.sourceId === sourceId))
      ?? [...this.looks].reverse().find(look => look.parts.some(part => part.sourceId === sourceId))
    const part = definer?.parts.find(candidate => candidate.sourceId === sourceId)
    if (!part) return undefined
    const hidden = !own || (this.vanishAt !== undefined && t >= this.vanishAt)
    const off = hidden ? undefined : this.off(sourceId, t)
    if (this.path) return { sourceId, shape: this.onPath(part, t, off, hidden) }
    return { sourceId, shape: PhenomenonExpansion.shape(part, this.geometry(t), off, hidden) }
  }

  /**
   * A part of a phenomenon going across the sky (see TravelParams), at `t`: placed and turned on the observer's picture as it goes, ahead of
   * or behind where it is by its `alongShare` of its size, to its left by its `upShare`.
   */
  private onPath(part: LookPart, t: number, off: BlinkParams["off"] | undefined, hidden: boolean): ShapeState["shape"] {
    const path = this.path!
    const pose = this.sighting.observerTrack.getInterpolatedPoseAt(t) ?? this.sighting.observerTrack.getLatestPoseAt(t)
    const heading = pose?.headingDeg ?? 0, pitch = pose?.pitchDeg ?? 0
    const here = SkyPath.toScreen(path.at(t), heading, pitch)
    const a = SkyPath.toScreen(path.at(t - PhenomenonExpansion.MOTION_MS), heading, pitch)
    const b = SkyPath.toScreen(path.at(t + PhenomenonExpansion.MOTION_MS), heading, pitch)
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
    const mx = (b[0] - a[0]) / length, my = (b[1] - a[1]) / length
    const size = path.sizeAt(t)
    const along = Math.tan(size * (part.alongShare ?? 0) * Math.PI / 180)
    const left = Math.tan(size * (part.upShare ?? 0) * Math.PI / 180)
    const aim = SkyPath.fromScreen(here[0] + along * mx - left * my, here[1] + along * my + left * mx, heading, pitch)
    const shape = PhenomenonExpansion.shape(part, { ...aim, sizeDeg: size }, off, hidden, true) as unknown as Record<string, unknown>
    shape.angle = Math.atan2(-my, mx)
    return shape as unknown as ShapeState["shape"]
  }

  /** Where the phenomenon is in the observer's sky at `t`, and how wide it appears, degrees. */
  private geometry(t: number): { azimuthDeg: number, altitudeDeg: number, sizeDeg: number } {
    const params = this.stand.params as unknown as StandParams
    const pose = this.sighting.observerTrack.getInterpolatedPoseAt(t) ?? this.sighting.observerTrack.getLatestPoseAt(t)
    const here = pose?.lat !== undefined && pose.lng !== undefined ? { lat: pose.lat, lng: pose.lng } : this.sighting.event.place?.[0] ?? params.place
    return PhenomenonExpansion.seenFrom(params, here, t)
  }

  /** Where a phenomenon standing as `params` says is in the sky of an observer at `here` at `t`, and how wide it appears, degrees. */
  static seenFrom(params: StandParams, here: EventPlace, t: number): { azimuthDeg: number, altitudeDeg: number, sizeDeg: number } {
    const east = (params.place.lng - here.lng) * Math.PI / 180 * PhenomenonExpansion.R * Math.cos(here.lat * Math.PI / 180)
    const north = (params.place.lat - here.lat) * Math.PI / 180 * PhenomenonExpansion.R
    const distance = Math.hypot(east, north)
    const widthM = DriveExpansion.linear(params.metres.map(({ t, widthM }) => ({ t, value: widthM })), t)
    const heightM = DriveExpansion.linear(params.metres.map(({ t, heightM }) => ({ t, value: heightM })), t)
    return {
      azimuthDeg: ((Math.atan2(east, north) * 180 / Math.PI) % 360 + 360) % 360,
      altitudeDeg: Math.atan2(heightM, distance) * 180 / Math.PI,
      sizeDeg: 2 * Math.atan(widthM / (2 * distance)) * 180 / Math.PI
    }
  }

  /** A part as a shape of the account, at the phenomenon's place and size; switched off as `off` says, or hidden. */
  /** `placed`: `at` is the part's own direction already (see onPath), not the phenomenon's. */
  private static shape(part: LookPart, at: { azimuthDeg: number, altitudeDeg: number, sizeDeg: number }, off: BlinkParams["off"] | undefined, hidden: boolean,
                       placed = false): ShapeState["shape"] {
    const size = at.sizeDeg
    const width = Math.max(part.minWidthDeg ?? 0, size * part.widthShare)
    const height = part.kind === "oval" && part.heightShare === undefined ? width : Math.max(part.minHeightDeg ?? 0, size * (part.heightShare ?? part.widthShare))
    const altitude = placed ? at.altitudeDeg : at.altitudeDeg + size * (part.upShare ?? 0)
    // Along the phenomenon's horizontal axis, an angle across the sky: wider in azimuth the higher it is.
    const azimuth = placed ? at.azimuthDeg : at.azimuthDeg + size * (part.alongShare ?? 0) / Math.cos(altitude * Math.PI / 180)
    const round = (value: number, digits: number) => Math.round(value * 10 ** digits) / 10 ** digits
    const shape: Record<string, unknown> = part.kind === "polygon"
      ? {
          kind: "polygon", bounds: { x: 300, y: 170, width: 100, height: 100 * height / width },
          points: (part.points ?? []).map(point => ({ x: round(point.x * 100, 2), y: round(point.y * 100 * height / width, 2) }))
        }
      : { kind: "oval", bounds: { x: 320, y: 180, width: 2, height: 2 } }
    Object.assign(shape, {
      color: off?.color ?? part.color, angle: 0, transparency: hidden ? 1 : off?.transparency ?? part.transparency ?? 0, haloScale: part.halo ?? 0, selected: false,
      ...(part.blur === undefined ? {} : { blur: part.blur }),
      ...(part.title === undefined ? {} : { title: part.title }),
      angular: { widthDeg: round(width, 4), heightDeg: round(height, 4) },
      aim: { azimuthDeg: round(((azimuth % 360) + 360) % 360, 3), altitudeDeg: round(altitude, 3) }
    })
    const brightness = off && "brightness" in off ? off.brightness : part.brightness
    if (brightness !== undefined && brightness !== null) shape.brightness = hidden ? 0 : brightness
    return shape as unknown as ShapeState["shape"]
  }
}
