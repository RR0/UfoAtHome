import type { SightingRecordingJson } from "./sightingJson.js"
import { KeyframeCompletion } from "../model/KeyframeCompletion.js"
import type { Keyframe } from "../model/Keyframe.js"

/** A recording as the text of its file, its keyframes written thin or whole. */
export class RecordingText {
  /**
   * `keyframes`: "thin" writes each keyframe as stating only what changed since the one before (see KeyframeCompletion.thin), which is
   * how a recording is written by hand and how it is read; "whole" writes every keyframe as it is held in memory, every field of every
   * shape, which says it all at each instant at the price of its size. `boxDrawnAgain`, thin, leaves out the boxes and outlines
   * loading draws again by itself (see SightingShapes.derivable).
   */
  static of(json: SightingRecordingJson, keyframes: "thin" | "whole" = "whole", boxDrawnAgain?: (keyframe: number, sourceId: string) => boolean): string {
    if (keyframes === "whole" || !json.timeline?.keyframes?.length) return JSON.stringify(json, null, 2)
    const thin = KeyframeCompletion.thin(json.timeline.keyframes as Keyframe[], boxDrawnAgain)
    return JSON.stringify({ ...json, timeline: { ...json.timeline, keyframes: thin } }, null, 2)
  }
}
