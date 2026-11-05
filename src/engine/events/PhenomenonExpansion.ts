import type { Sighting } from "../model/Sighting.js"
import type { Keyframe, ShapeState } from "../model/Keyframe.js"
import type { TimelineJson } from "../model/Timeline.js"
import { DriveExpansion } from "./DriveExpansion.js"
import type { BlinkParams, EventPlace, AppearanceParams, LookPart, RecordingEventJson, StandParams } from "./RecordingEvent.js"

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
 * Written as keyframes every SAMPLE_MS while it is seen, where its looks change (the part that goes, a millisecond before the next look, so
 * that nothing fades from one into the other), and on either side of every switch of a blinking part, which the interpolation between
 * keyframes then holds.
 */
export class PhenomenonExpansion {
  private static readonly SAMPLE_MS = 2000
  private static readonly R = 6371008.8

  private readonly looks: Look[]
  private readonly blinks: { t: number, until: number, parts: string[], params: BlinkParams }[]
  private readonly vanishAt: number | undefined

  constructor(private readonly sighting: Sighting, private readonly stand: RecordingEventJson, events: RecordingEventJson[], end: number) {
    const looks = events.filter(event => event.eventType === "appearance").sort((a, b) => a.t - b.t)
    this.vanishAt = events.find(event => event.eventType === "vanish")?.t
    const last = this.vanishAt ?? end
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
        for (let t = look.t; t < look.until; t += PhenomenonExpansion.SAMPLE_MS) put(t, sourceId)
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
    return { sourceId, shape: PhenomenonExpansion.shape(part, this.geometry(t), hidden ? undefined : this.off(sourceId, t), hidden) }
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
  private static shape(part: LookPart, at: { azimuthDeg: number, altitudeDeg: number, sizeDeg: number }, off: BlinkParams["off"] | undefined, hidden: boolean): ShapeState["shape"] {
    const size = at.sizeDeg
    const width = Math.max(part.minWidthDeg ?? 0, size * part.widthShare)
    const height = part.kind === "oval" ? width : Math.max(part.minHeightDeg ?? 0, size * (part.heightShare ?? part.widthShare))
    const altitude = at.altitudeDeg + size * (part.upShare ?? 0)
    // Along the phenomenon's horizontal axis, an angle across the sky: wider in azimuth the higher it is.
    const azimuth = at.azimuthDeg + size * (part.alongShare ?? 0) / Math.cos(altitude * Math.PI / 180)
    const round = (value: number, digits: number) => Math.round(value * 10 ** digits) / 10 ** digits
    const shape: Record<string, unknown> = part.kind === "polygon"
      ? {
          kind: "polygon", bounds: { x: 300, y: 170, width: 100, height: 100 * height / width },
          points: (part.points ?? []).map(point => ({ x: round(point.x * 100, 2), y: round(point.y * 100 * height / width, 2) }))
        }
      : { kind: "oval", bounds: { x: 320, y: 180, width: 2, height: 2 } }
    Object.assign(shape, {
      color: off?.color ?? part.color, angle: 0, transparency: hidden ? 1 : off?.transparency ?? 0, haloScale: part.halo ?? 0, selected: false,
      ...(part.title === undefined ? {} : { title: part.title }),
      angular: { widthDeg: round(width, 4), heightDeg: round(height, 4) },
      aim: { azimuthDeg: round(((azimuth % 360) + 360) % 360, 3), altitudeDeg: round(altitude, 3) }
    })
    const brightness = off && "brightness" in off ? off.brightness : part.brightness
    if (brightness !== undefined && brightness !== null) shape.brightness = hidden ? 0 : brightness
    return shape as unknown as ShapeState["shape"]
  }
}
