import type { Sighting } from "../model/Sighting.js"
import { resolveObserverPoseAt, sightingDurationMs } from "../model/Sighting.js"
import { sightingTimeToDate } from "../astronomy/CelestialPositions.js"
import type { WeatherSource } from "../model/Weather.js"
import type { WeatherKeyframe } from "../model/WeatherTrack.js"
import type { WeatherPoint, WeatherProvider } from "./WeatherProvider.js"

const HOUR_MS = 3_600_000

/** A day of hourly samples — past that an observation is long enough that its weather is a story
 * of its own, and a keyframe every hour stops being a description of one sighting. */
const MAX_SAMPLES = 25

/**
 * - `inferred`: a real record was found and `keyframes` describe the whole observation.
 * - `incomplete`: the sighting doesn't yet say enough (no place, or no full calendar date) to ask.
 * - `unavailable`: asked, and the record genuinely doesn't cover that place/date (pre-1940).
 * - `failed`: the lookup itself couldn't be made (offline, HTTP error) — says nothing about the
 *   sighting, and the difference matters to a witness reading the answer.
 */
export type WeatherInferenceStatus = "inferred" | "incomplete" | "unavailable" | "failed"

export interface WeatherInferenceResult {
  status: WeatherInferenceStatus
  /** The observation's own start instant (UTC), stated back so the witness can check the lookup
   * used the time they meant — a wrong utcOffsetHours shows up here first. */
  at?: Date
  source?: WeatherSource
  /** Timeline-clock keyframes, ready for a WeatherTrack — only on `inferred`. */
  keyframes?: WeatherKeyframe[]
}

/**
 * Turns a sighting's own date/time and place into its weather, by asking a WeatherProvider for the
 * real record instead of leaving a witness (or an author reconstructing a case decades later) to
 * set a cloud-cover slider from memory. The reasoning behind the whole feature: unlike the shape,
 * the movement or the direction of gaze, weather is not testimony — it is a measurable fact about
 * a place at an instant, and the recording already states both.
 *
 * An observation spanning more than an hour gets one keyframe per hour of record, not a single
 * average: WeatherTrack exists precisely because circumstances change mid-sighting, and an hourly
 * reanalysis is exactly the granularity it interpolates between.
 */
export class WeatherInference {
  constructor(private readonly provider: WeatherProvider) {
  }

  /** Throws nothing on a failed lookup — a provider error is reported as `failed`, since every
   * caller of this needs to tell those apart from "no such record" anyway. */
  async infer(sighting: Sighting): Promise<WeatherInferenceResult> {
    const question = this.questionOf(sighting)
    if (!question) return { status: "incomplete" }
    const { origin, start } = question

    const durationMs = sightingDurationMs(sighting.event) ?? 0
    const timings = this.sampleTimings(sighting, start, durationMs)
    let observation
    try {
      observation = await this.provider.getWeather({
        points: timings.map(timing => this.pointAt(sighting, timing, origin))
      })
    } catch {
      return { status: "failed", at: start }
    }
    if (!observation) return { status: "unavailable", at: start }
    return {
      status: "inferred",
      at: start,
      source: observation.source,
      keyframes: observation.samples.map((sample, index) => ({ t: timings[index].t, weather: sample.weather }))
    }
  }

  /** Replaces the sighting's whole weather track with the inferred one and records what produced
   * it. Deliberately destructive: this only ever runs on a sighting whose weather is inferred (the
   * recorder's own gate — a track the witness declared has no `weatherSource` and is never handed
   * here), so what it discards is a previous lookup's answer, not testimony. */
  applyTo(sighting: Sighting, result: WeatherInferenceResult): void {
    if (result.status !== "inferred" || !result.keyframes || !result.source) return
    sighting.weatherTrack.clear()
    for (const keyframe of result.keyframes) {
      sighting.weatherTrack.addKeyframe(keyframe.t, keyframe.weather)
    }
    sighting.weatherSource = result.source
  }

  /** The observation's start, every whole hour it runs through, and its end — the hours because
   * that is the record's own resolution and nothing between two of them is new information, the
   * two ends because they are the instants the sighting actually happened at. Both ends matter
   * even for a short observation: the provider reads BETWEEN the hourly rows (see
   * OpenMeteoWeatherProvider.recordAt), so a 20-minute sighting still gets a track that moves
   * rather than one value repeated. */
  private sampleTimes(start: Date, durationMs: number): Date[] {
    const times = [start]
    const endMs = start.getTime() + durationMs
    let hourMs = Math.floor(start.getTime() / HOUR_MS) * HOUR_MS + HOUR_MS
    while (hourMs <= endMs && times.length < MAX_SAMPLES) {
      times.push(new Date(hourMs))
      hourMs += HOUR_MS
    }
    if (durationMs > 0 && times[times.length - 1].getTime() !== endMs && times.length < MAX_SAMPLES) {
      times.push(new Date(endMs))
    }
    return times
  }

  /**
   * Each sample instant paired with where it lands on the clock a WeatherTrack keyframe is actually
   * read back on — the PLAYER's, which is nearly never the same length as the observation (a 2-hour
   * sighting can be a 12-second recording).
   *
   * That clock is `timeline.duration` once anything has been recorded, and the observation's own
   * real length before that: with no keyframes yet the timeline is 0 long, while the player still
   * seeks across the whole declared duration (Player.durationOverrideMs, set by UfoElement to
   * exactly that). Reading `timeline.duration` alone therefore collapsed a sighting with nothing
   * drawn yet onto ONE keyframe at t=0 — which is how a fifteen-hour observation came to report the
   * same rain from dawn to midnight.
   */
  private sampleTimings(sighting: Sighting, start: Date, durationMs: number): SampleTiming[] {
    const playbackSpan = sighting.timeline.duration > 0 ? sighting.timeline.duration : durationMs
    if (durationMs <= 0 || playbackSpan <= 0) return [{ time: start, t: 0 }]
    return this.sampleTimes(start, durationMs).map(time => {
      const elapsed = (time.getTime() - start.getTime()) / durationMs
      return { time, t: Math.round(playbackSpan * Math.max(0, Math.min(1, elapsed))) }
    })
  }

  /**
   * Where the observation started, from the witnessTrack if it says, otherwise from the sighting's
   * own `place`. resolveObserverPoseAt prefers the track and only falls back to `place` when the
   * track is entirely EMPTY — but a pose may perfectly well state a heading and no coordinates
   * (UfoRecorderElement.updateObserver writes one deliberately, so that setting a heading before
   * entering a location isn't silently discarded), and reading only the track then reported a
   * sighting with a perfectly good `place` as having nowhere to look up.
   */
  /** Whether this sighting states enough for the record to be asked at all — the same requirement
   * infer() enforces, exposed so an editor can say so BEFORE asking rather than only reporting
   * "incomplete" afterwards (see UfoRecorderElement, which disables its own "from weather records"
   * control on this). One rule, one place: a UI deciding for itself what a lookup needs would
   * drift from what a lookup actually needs. */
  canInfer(sighting: Sighting): boolean {
    return this.questionOf(sighting) !== undefined
  }

  /** The place and instant a lookup would be about, or undefined when the sighting doesn't state
   * enough for there to be a question at all.
   *
   * A full calendar date is the hard requirement: weather is hourly, and sightingTimeToDate's own
   * reference-equinox fallback for a year-less time (fine for showing *a* plausible sky) would
   * have this report the conditions of a day the sighting never happened on. A missing HOUR is
   * allowed through, on the same midday fallback astronomy already renders — a case known to the
   * day but not the hour still gets that day's real conditions. */
  private questionOf(sighting: Sighting): { origin: { lat: number; lng: number }; start: Date } | undefined {
    const origin = this.originOf(sighting)
    if (!origin) return undefined
    const time = sighting.event.time
    if (time?.year === undefined || time.month === undefined || time.day === undefined) return undefined
    const start = sightingTimeToDate(time, origin.lng, sighting.event.utcOffsetHours)
    return start ? { origin, start } : undefined
  }

  private originOf(sighting: Sighting): { lat: number; lng: number } | undefined {
    const pose = resolveObserverPoseAt(sighting, 0)
    const place = sighting.event.place?.[0]
    const lat = pose?.lat ?? place?.lat
    const lng = pose?.lng ?? place?.lng
    return lat === undefined || lng === undefined ? undefined : { lat, lng }
  }

  /** Where the witness was at that instant, read off their own witnessTrack — so an aircraft under
   * observation for an hour is asked about the air it is in *now*, not the airfield it left. Falls
   * back to where the observation started for a pose that states no coordinates (heading-only
   * keyframes, which is how a witness turning to follow an object is usually recorded). */
  private pointAt(sighting: Sighting, timing: SampleTiming, origin: { lat: number; lng: number }): WeatherPoint {
    const pose = resolveObserverPoseAt(sighting, timing.t)
    return { lat: pose?.lat ?? origin.lat, lng: pose?.lng ?? origin.lng, time: timing.time }
  }
}

/** One instant to describe, and where it falls on the recording's own clock. */
interface SampleTiming {
  time: Date
  t: number
}
