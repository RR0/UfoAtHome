import { Sighting } from "../model/Sighting.js"
import type { SightingLocation, SightingTime } from "../model/Sighting.js"
import { Timeline } from "../model/Timeline.js"
import type { TimelineJson } from "../model/Timeline.js"
import { ObserverTrack } from "../model/ObserverTrack.js"
import type { ObserverTrackJson } from "../model/ObserverTrack.js"
import { WeatherTrack } from "../model/WeatherTrack.js"
import type { WeatherTrackJson } from "../model/WeatherTrack.js"
import { SoundTrack } from "../model/SoundTrack.js"
import type { SoundTrackJson } from "../model/SoundTrack.js"
import type { Weather, WeatherSource } from "../model/Weather.js"
import type { People } from "../model/People.js"
import type { DecorObject } from "../model/Decor.js"
import { SightingShapes } from "./SightingShapes.js"

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
  /** See SightingEvent.utcOffsetHours — the legal time zone `time`/`endTime` are expressed in. */
  utcOffsetHours?: number
  /** See SightingEvent.timeZone — the IANA rule `utcOffsetHours` was derived from, when it was. */
  timeZone?: string
  place?: SightingLocation[]
  /** See Sighting.witness. */
  witness?: People
  /** See Sighting.caseId — shared by every witness's own sighting.json for the same case, so
   * a page (e.g. EyewitnessElement) can group and label them without a separate manifest
   * duplicating names that could drift out of sync with the actual files. */
  caseId?: string
  /** See SightingEvent.description. */
  description?: string
  /** See SightingEvent.tags. */
  tags?: string[]
  timeline: TimelineJson
  /** The witness's position/elevation/orientation over time — absent for older recordings, which
   * fall back to the legacy static place[0] (see Sighting.ts's resolveObserverPoseAt). */
  witnessTrack?: ObserverTrackJson
  /** Weather over time — absent for older recordings, which fall back to the legacy static
   * `weather` field below (see Sighting.ts's resolveWeatherAt). */
  weatherTrack?: WeatherTrackJson
  /** Legacy static weather condition, kept only as weatherTrack's own fallback for recordings
   * made before it existed — absent means "unknown/not recorded", not "clear skies" (renderers
   * default to DEFAULT_WEATHER, see Weather.ts). New recordings write weatherTrack instead. */
  weather?: Weather
  /** What the sighting sounded like over time — see SoundTrack. Absent means the recording says
   * nothing about sound at all, which replays as silence; a track holding a kind "none" keyframe
   * is the stronger, deliberate statement that the witness heard nothing (see Sound.ts). */
  soundTrack?: SoundTrackJson
  /** See Sighting.decor. Absent/omitted means no decor — older recordings default to []. */
  decor?: DecorObject[]
  /** Which meteorological record `weatherTrack` was looked up from, when it wasn't the witness who
   * stated the conditions — see Sighting.weatherSource. Absent means they ARE the witness's (or
   * predate this field), and a reader must not treat them as measurements. */
  weatherSource?: WeatherSource
  /** Which INSTRUMENTS entry this was observed through — see Sighting.instrumentId. Absent means
   * the naked eye, and every recording made before this field existed is one. */
  instrument?: string
}

export function toSightingJson(sighting: Sighting): SightingRecordingJson {
  // What gets written is the perception, not the pixels: every shape's stated angular extent is
  // refreshed from the box it is currently drawn as, since between load and save `bounds` is what
  // every editing gesture moved. Mutates the live sighting on purpose — it only ADDS the angle the
  // drawing already implies, so memory and file agree from here on.
  SightingShapes.toAngular(sighting)
  return {
    version: 1,
    time: sighting.event.time,
    endTime: sighting.event.endTime,
    durationSeconds: sighting.event.durationSeconds,
    utcOffsetHours: sighting.event.utcOffsetHours,
    timeZone: sighting.event.timeZone,
    place: sighting.event.place,
    witness: sighting.witness,
    caseId: sighting.caseId,
    description: sighting.event.description,
    tags: sighting.event.tags,
    timeline: sighting.timeline.toJSON(),
    witnessTrack: sighting.witnessTrack.toJSON(),
    weatherTrack: sighting.weatherTrack.toJSON(),
    soundTrack: sighting.soundTrack.toJSON(),
    weather: sighting.weather,
    decor: sighting.decor,
    weatherSource: sighting.weatherSource,
    instrument: sighting.instrumentId
  }
}

export function fromSightingJson(json: SightingRecordingJson): Sighting {
  const sighting = new Sighting(
    {
      eventType: "sighting",
      time: json.time,
      endTime: json.endTime,
      durationSeconds: json.durationSeconds,
      utcOffsetHours: json.utcOffsetHours,
      timeZone: json.timeZone,
      place: json.place,
      description: json.description,
      tags: json.tags
    },
    Timeline.fromJSON(json.timeline),
    json.witnessTrack ? ObserverTrack.fromJSON(json.witnessTrack) : new ObserverTrack(),
    json.weatherTrack ? WeatherTrack.fromJSON(json.weatherTrack) : new WeatherTrack(),
    json.soundTrack ? SoundTrack.fromJSON(json.soundTrack) : new SoundTrack(),
    json.witness,
    json.caseId,
    json.weather,
    json.decor ?? [],
    json.weatherSource,
    json.instrument
  )
  // The file states an angle; the drawing has to follow it. Done here rather than in
  // Timeline.fromJSON because the projection needs the pose's own field of view, which lives on
  // the sighting, not on the timeline.
  SightingShapes.toBounds(sighting)
  return sighting
}
