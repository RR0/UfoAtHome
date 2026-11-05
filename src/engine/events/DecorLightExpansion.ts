import type { DecorLight, DecorLightKeyframe, DecorObject, LightPattern } from "../model/Decor.js"
import type { RecordingEventJson } from "./RecordingEvent.js"

/** A lamp of a decor object switched on, off, or brighter, from the event's start (see DecorLightExpansion). */
export interface DecorLightParams {
  /** As DecorLight.intensity says it: a ratio to an ordinary navigation light's; 0, off. */
  intensity: number
}

/** A lamp of a decor object blinks from the event's start to its end (see DecorLightExpansion). */
export interface DecorBlinkParams {
  onS: number
  offS: number
  /** How bright while on, as DecorLight.intensity; what it was before when absent. */
  intensity?: number
}

/**
 * The lamps of a decor object switched by the events about them (`who` "f-hobs/landing-nose", or a group of its lamps, "f-hobs/strobes", see
 * DecorObject.groups), as keyframes of each (see DecorLight.keyframes):
 * - `light` (see DecorLightParams): at `intensity` from the event's start, blinking as it did, and, at its end when it states one, back to what it
 *   was before it;
 * - `blink` (see DecorBlinkParams): on for `onS`, off for `offS`, from the event's start, which it starts on, to its end (the end of the
 *   recording when it states none), then back to what it was before it.
 * A lamp is switched at once: a blink is never a fade.
 */
export class DecorLightExpansion {
  constructor(private readonly object: DecorObject, private readonly events: RecordingEventJson[], private readonly endMs?: number) {
  }

  /** Its lamps, each with the keyframes the events give it; those no event is about, as they are. */
  lights(): DecorLight[] {
    const keys = new Map<string, DecorLightKeyframe[]>()
    const ordered = [...this.events].sort((a, b) => a.t - b.t)
    for (const event of ordered) {
      const part = DecorLightExpansion.partOf(event.who, this.object.id)
      if (part === undefined || (event.eventType !== "light" && event.eventType !== "blink")) continue
      for (const id of this.leavesOf(part)) {
        const light = this.object.lights?.find(candidate => candidate.id === id)
        if (light) keys.set(id, this.switched(light, keys.get(id) ?? [], event))
      }
    }
    return (this.object.lights ?? []).map(light => keys.has(light.id) ? { ...light, keyframes: keys.get(light.id) } : light)
  }

  /** `keys`, and the ones `event` adds to `light`'s. */
  private switched(light: DecorLight, keys: DecorLightKeyframe[], event: RecordingEventJson): DecorLightKeyframe[] {
    const before = DecorLightExpansion.stateAt(light, keys, event.t)
    const until = event.eventType === "light" ? event.until : event.until ?? this.endMs
    const added: DecorLightKeyframe[] = []
    if (event.eventType === "light") {
      added.push({ t: event.t, intensity: (event.params as unknown as DecorLightParams).intensity, pattern: before.pattern })
    } else {
      const params = event.params as unknown as DecorBlinkParams
      const cycleS = params.onS + params.offS
      if (until === undefined || cycleS <= 0) return keys
      const periodMs = cycleS * 1000
      // Lit while frac(t / period + phase) < duty: on as it starts.
      const phase = ((-event.t / periodMs) % 1 + 1) % 1
      const pattern: LightPattern = { kind: "flash", perMinute: 60 / cycleS, dutyCycle: params.onS / cycleS, ...(phase ? { phase } : {}) }
      const lit = params.intensity ?? (before.intensity > 0 ? before.intensity : light.intensity ?? 1)
      added.push({ t: event.t, intensity: lit, pattern })
    }
    if (until !== undefined) added.push({ t: until, intensity: before.intensity, pattern: before.pattern })
    // A later keyframe at the same instant wins: the event's.
    const times = new Set(added.map(key => key.t))
    return [...keys.filter(key => !times.has(key.t)), ...added].sort((a, b) => a.t - b.t)
  }

  /** How `light` is switched at `t`, by `keys`, then by its own fields. */
  private static stateAt(light: DecorLight, keys: DecorLightKeyframe[], t: number): { intensity: number, pattern: LightPattern } {
    const key = keys.filter(candidate => candidate.t <= t).at(-1)
    return { intensity: key?.intensity ?? light.intensity ?? 1, pattern: key?.pattern ?? light.pattern }
  }

  /** The lamps `part` names: those of the object's group of that id, and of the groups in it, or itself. */
  private leavesOf(part: string, seen = new Set<string>()): string[] {
    const group = this.object.groups?.find(candidate => candidate.id === part)
    if (!group || seen.has(part)) return [part]
    seen.add(part)
    return group.members.flatMap(member => this.leavesOf(member, seen))
  }

  /** The part of object `id` an event is about (`who` "f-hobs/strobes": "strobes"). */
  static partOf(who: string | undefined, id: string): string | undefined {
    return who !== undefined && who.startsWith(`${id}/`) && who.length > id.length + 1 ? who.slice(id.length + 1) : undefined
  }
}
