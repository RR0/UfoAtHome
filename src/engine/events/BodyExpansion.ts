import type { BodyJson, BodyKeyframe } from "../interpretation/Interpretation.js"
import type { BlinkParams, LightParams, MotionParams, RecordingEventJson, RideParams, RiseParams, SpinParams, TurnParams } from "./RecordingEvent.js"

/** Where a body is, in the frame its keyframes place it in: metres east and north, and how high its bottom is above the ground. */
interface Place {
  eastM: number
  northM: number
  aboveGroundM: number
}

/**
 * A body's keyframes worked out from its events (see MotionParams, SpinParams, RiseParams, and `vanish`: it is no longer there), added to the ones
 * it states itself (where it is to begin with, its size, how it looks). A movement of its model gets a keyframe at each end; a rise one every
 * SAMPLE_MS, along its line. A light of its model, or a group of them (see BodyJson.groups), is switched by `light` and `blink` (see
 * LightParams, BlinkParams): a keyframe where it switches, and another a millisecond before, which holds it, since a light is blended
 * between two keyframes that name it.
 */
export class BodyExpansion {
  private static readonly SAMPLE_MS = 250

  /**
   * @param endMs When an event that states no end ends: the end of the recording.
   * @param sampleMs How often a rise is sampled, when the recording says (see Sighting.sampleMs): SAMPLE_MS otherwise.
   */
  constructor(private readonly body: BodyJson, private readonly events: RecordingEventJson[], private readonly endMs?: number, private readonly sampleMs?: number) {
  }

  /** The body's track with its events' keyframes in it, in order. */
  track(): BodyKeyframe[] {
    const keys = new Map<number, BodyKeyframe>()
    const put = (key: BodyKeyframe) => {
      const at = keys.get(key.t)
      keys.set(key.t, at ? {
        ...at, ...key, motions: { ...at.motions, ...key.motions },
        ...(at.turns || key.turns ? { turns: { ...at.turns, ...key.turns } } : {}),
        ...(at.lights || key.lights ? { lights: { ...at.lights, ...key.lights } } : {})
      } : key)
    }
    for (const key of this.body.track) put({ ...key })
    const ordered = [...this.events].sort((a, b) => a.t - b.t)
    // Where each movement and the heading stand before the events, as the body states them (a being crouched to begin with).
    const motions = new Map<string, number>()
    const turns = new Map<string, number>()
    const lights = new Map<string, number>()
    let headingDeg = 0
    for (const key of this.body.track) {
      for (const [name, value] of Object.entries(key.motions ?? {})) motions.set(name, value)
      for (const [name, value] of Object.entries(key.turns ?? {})) turns.set(name, value)
      for (const [name, value] of Object.entries(key.lights ?? {})) lights.set(name, value)
      if (key.attitude?.headingDeg !== undefined) headingDeg = key.attitude.headingDeg
    }
    let place = this.startPlace()
    for (const event of ordered) {
      const part = BodyExpansion.partOf(event.who, this.body.id)
      if (part !== undefined && (event.eventType === "light" || event.eventType === "blink")) {
        // Lights of it: each of the part's, or of the group's (see BodyJson.groups).
        for (const light of this.leavesOf(part)) this.switchLight(light, event, lights, put, at => keys.get(at)?.lights?.[light])
        continue
      }
      if (part !== undefined) {
        // A part of it: turned about its own upright axis, the rest of the body as it is.
        if (event.eventType !== "spin" && event.eventType !== "turn") continue
        const from = turns.get(part) ?? 0
        const until = event.until ?? event.t
        const to = event.eventType === "spin"
          ? from + 360 * (event.params as unknown as SpinParams).turnsPerS * (until - event.t) / 1000
          : (event.params as unknown as TurnParams).headingDeg
        put({ t: event.t, turns: { [part]: from } })
        put({ t: until, turns: { [part]: to } })
        turns.set(part, to)
        continue
      }
      if ((event.eventType === "motion" || event.eventType === "spin") && (event.params as { motion?: string } | undefined)?.motion) {
        const params = event.params as unknown as MotionParams & SpinParams
        const motion = params.motion!
        const from = motions.get(motion) ?? 0
        const until = event.until ?? event.t
        const to = event.eventType === "motion" ? params.to : from + params.turnsPerS * (until - event.t) / 1000
        put({ t: event.t, motions: { [motion]: from } })
        put({ t: until, motions: { [motion]: to } })
        motions.set(motion, to)
      } else if (event.eventType === "rise" && place) {
        const params = event.params as unknown as RiseParams
        const until = event.until ?? event.t
        const angle = params.angleDeg * Math.PI / 180, heading = (params.headingDeg ?? 0) * Math.PI / 180
        const start = place
        const at = (f: number): Place => {
          // From still: slowing down into its stop (the minimum-jerk curve), or speeding up all the way (constant acceleration).
          const share = params.stops === false ? f * f : f * f * f * (10 - 15 * f + 6 * f * f)
          const along = params.distanceM * share
          return {
            eastM: start.eastM + along * Math.sin(angle) * Math.sin(heading),
            northM: start.northM + along * Math.sin(angle) * Math.cos(heading),
            aboveGroundM: start.aboveGroundM + along * Math.cos(angle)
          }
        }
        for (let t = event.t; t < until; t += this.sampleMs ?? BodyExpansion.SAMPLE_MS) put(BodyExpansion.key(t, at((t - event.t) / (until - event.t))))
        place = at(1)
        put(BodyExpansion.key(until, place))
      } else if (event.eventType === "turn") {
        const params = event.params as unknown as TurnParams
        put({ t: event.t, attitude: { headingDeg } })
        put({ t: event.until ?? event.t, attitude: { headingDeg: params.headingDeg } })
        headingDeg = params.headingDeg
      } else if (event.eventType === "vanish") {
        put({ t: event.t, present: false })
      }
    }
    return [...keys.values()].sort((a, b) => a.t - b.t)
  }

  /** The keyframes of a body carried by `carrier` (see RideParams): at each of the carrier's keyframes that places it, there too, higher. */
  static ride(body: BodyJson, event: RecordingEventJson, carrier: BodyJson): BodyKeyframe[] {
    const params = event.params as unknown as RideParams
    const until = event.until ?? Infinity
    const keys = new Map<number, BodyKeyframe>(body.track.map(key => [key.t, { ...key }]))
    for (const key of carrier.track) {
      if (key.t < event.t || key.t > until) continue
      if (key.present === false) keys.set(key.t, { ...keys.get(key.t), t: key.t, present: false })
      if (key.eastM === undefined || key.northM === undefined) continue
      const aboveGroundM = (key.onGround ? 0 : key.altitudeAboveGroundM ?? 0) + params.aboveM
      keys.set(key.t, { ...keys.get(key.t), t: key.t, eastM: key.eastM, northM: key.northM, altitudeAboveGroundM: aboveGroundM })
    }
    return [...keys.values()].sort((a, b) => a.t - b.t)
  }

  /**
   * Switches `light` as `event` says (see LightParams, BlinkParams), from the level it is lit at before (`levels`, which says the level it is
   * left at).
   */
  private switchLight(light: string, event: RecordingEventJson, levels: Map<string, number>, put: (key: BodyKeyframe) => void,
                      stated: (t: number) => number | undefined): void {
    const before = levels.get(light) ?? 0
    // A light switched stays so; a blink goes on until the end of the recording.
    const until = event.eventType === "light" ? event.until : event.until ?? this.endMs
    const at = (t: number, level: number) => put({ t, lights: { [light]: level } })
    // Held as it was until it switches: unless an event before says what it was then (a blink that ends as this one starts).
    if (event.t > 0 && stated(event.t - 1) === undefined) at(event.t - 1, before)
    if (event.eventType === "light") {
      const level = (event.params as unknown as LightParams).cdM2
      at(event.t, level)
      if (until === undefined) {
        levels.set(light, level)
        return
      }
      at(until - 1, level)
    } else {
      const params = event.params as unknown as BlinkParams
      if (until === undefined) return
      const lit = params.cdM2 ?? before
      let t = event.t
      let on = true
      while (t < until) {
        const next = Math.min(Math.round(t + 1000 * (on ? params.onS : params.offS)), until)
        if (next <= t) break
        at(t, on ? lit : 0)
        at(next - 1, on ? lit : 0)
        t = next
        on = !on
      }
    }
    // Lit again as it was before it.
    at(until, before)
    levels.set(light, before)
  }

  /** The parts `part` names: those of the group of that id, and of the groups in it, or itself. */
  private leavesOf(part: string, seen = new Set<string>()): string[] {
    const group = this.body.groups?.find(candidate => candidate.id === part)
    if (!group || seen.has(part)) return [part]
    seen.add(part)
    return group.members.flatMap(member => this.leavesOf(member, seen))
  }

  /** The part of body `bodyId` an event is about (`who` "craft/legs": "legs"), when it is about a part of it. */
  static partOf(who: string | undefined, bodyId: string): string | undefined {
    return who !== undefined && who.startsWith(`${bodyId}/`) && who.length > bodyId.length + 1 ? who.slice(bodyId.length + 1) : undefined
  }

  /** Where the body stands before its events: its first keyframe that places it in metres. */
  private startPlace(): Place | undefined {
    const key = this.body.track.find(candidate => candidate.eastM !== undefined && candidate.northM !== undefined)
    return key && { eastM: key.eastM!, northM: key.northM!, aboveGroundM: key.onGround ? 0 : key.altitudeAboveGroundM ?? 0 }
  }

  private static key(t: number, place: Place): BodyKeyframe {
    return place.aboveGroundM <= 0
      ? { t, eastM: place.eastM, northM: place.northM, onGround: true }
      : { t, eastM: place.eastM, northM: place.northM, altitudeAboveGroundM: place.aboveGroundM }
  }
}
