import { Sighting } from "../model/Sighting.js"
import type { SightingLocation, SightingTime } from "../model/Sighting.js"
import { Timeline } from "../model/Timeline.js"
import type { TimelineJson } from "../model/Timeline.js"

/**
 * Standalone "one JSON file per case" format (e.g. a future sighting.json
 * sitting next to the existing case.json/people.json), not merged into
 * case.json's own schema.
 */
export interface SightingRecordingJson {
  version: 1
  time?: SightingTime
  /** See SightingEvent.endTime. */
  endTime?: SightingTime
  /** See SightingEvent.durationSeconds. */
  durationSeconds?: number
  place?: SightingLocation[]
  witnessId?: string
  /** See Sighting.witnessName. */
  witnessName?: string
  /** See Sighting.caseId — shared by every witness's own sighting.json for the same case, so
   * a page (e.g. WitnessSelectorElement) can group and label them without a separate manifest
   * duplicating names that could drift out of sync with the actual files. */
  caseId?: string
  timeline: TimelineJson
}

export function toSightingJson(sighting: Sighting): SightingRecordingJson {
  return {
    version: 1,
    time: sighting.event.time,
    endTime: sighting.event.endTime,
    durationSeconds: sighting.event.durationSeconds,
    place: sighting.event.place,
    witnessId: sighting.witnessId,
    witnessName: sighting.witnessName,
    caseId: sighting.caseId,
    timeline: sighting.timeline.toJSON()
  }
}

export function fromSightingJson(json: SightingRecordingJson): Sighting {
  return new Sighting(
    {
      eventType: "sighting",
      time: json.time,
      endTime: json.endTime,
      durationSeconds: json.durationSeconds,
      place: json.place
    },
    Timeline.fromJSON(json.timeline),
    json.witnessId,
    json.witnessName,
    json.caseId
  )
}
