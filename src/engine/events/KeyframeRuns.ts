import type { ObserverTrack } from "../model/ObserverTrack.js"
import type { Timeline } from "../model/Timeline.js"

/**
 * What the events are worked out into, at the recording's pace (see Sighting.sampleMs), without the keyframes that say nothing: in a run of
 * keyframes that say the same thing, the ones between its first and its last. Between the two kept, the player draws what it drew between
 * every two of the run, the same value, so nothing drawn changes; a look held for a minute at 25 ms is two keyframes, not 2400.
 */
export class KeyframeRuns {
  /** The observer's poses. */
  static observer(track: ObserverTrack): void {
    const keys = track.allKeyframes
    const said = keys.map(key => KeyframeRuns.said(key.pose))
    const dropped = keys.filter((_key, index) => index > 0 && index < keys.length - 1 && said[index] === said[index - 1] && said[index] === said[index + 1])
    for (const key of dropped) track.removeKeyframeAt(key.t)
  }

  /**
   * What a keyframe says, to be compared: its numbers to the tenth of a billionth, so that a place interpolated between two that are the same
   * (49.104890000000005 for 49.10489) is the same.
   */
  private static said(value: unknown): string {
    return JSON.stringify(value, (_key, field) => typeof field === "number" ? Math.round(field * 1e10) / 1e10 : field)
  }

  /** The account's shapes: each on its own, since one may hold still while another moves. */
  static timeline(timeline: Timeline): void {
    const bySource = new Map<string, { t: number, said: string }[]>()
    for (const keyframe of timeline.allKeyframes) {
      for (const state of keyframe.shapes) {
        const runs = bySource.get(state.sourceId) ?? []
        runs.push({ t: keyframe.t, said: KeyframeRuns.said(state.shape) })
        bySource.set(state.sourceId, runs)
      }
    }
    for (const [sourceId, states] of bySource) {
      const dropped = states.filter((state, index) => index > 0 && index < states.length - 1 && state.said === states[index - 1].said && state.said === states[index + 1].said)
      for (const state of dropped) timeline.removeShapeAt(state.t, sourceId)
    }
  }
}
