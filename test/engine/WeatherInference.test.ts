import { describe, expect, it, vi } from "vitest"
import { WeatherInference } from "../../src/engine/weather/WeatherInference.js"
import type { WeatherObservation, WeatherProvider, WeatherQuery } from "../../src/engine/weather/WeatherProvider.js"
import { Sighting } from "../../src/engine/model/Sighting.js"
import { DEFAULT_WEATHER } from "../../src/engine/model/Weather.js"
import type { Weather } from "../../src/engine/model/Weather.js"

const SOURCE = { id: "test", name: "Test record", url: "https://example.org/record" }

/** Answers every requested instant with a cloud cover equal to its own UTC hour / 100, so a test
 * can tell which hour each keyframe describes just by reading its value back. */
class HourStampingProvider implements WeatherProvider {
  lastQuery?: WeatherQuery

  getWeather(query: WeatherQuery): Promise<WeatherObservation | undefined> {
    this.lastQuery = query
    return Promise.resolve({
      source: SOURCE,
      samples: query.points.map(point => ({
        time: point.time,
        weather: { ...DEFAULT_WEATHER, cloudCover: point.time.getUTCHours() / 100 }
      }))
    })
  }
}

function sightingAt(options: { lat?: number; lng?: number; year?: number; recordedMs?: number; durationSeconds?: number } = {}): Sighting {
  const { lat = 43.837, lng = 5.983, year = 1965, recordedMs = 10_000, durationSeconds } = options
  const sighting = Sighting.create({ year, month: 7, day: 1, hour: 5, minute: 0 }, [{ lat, lng }])
  sighting.event.utcOffsetHours = 1
  sighting.event.durationSeconds = durationSeconds
  // Gives the recording its own clock, the unit weather keyframes are timed on.
  if (recordedMs > 0) {
    sighting.timeline.addKeyframe(0, [])
    sighting.timeline.addKeyframe(recordedMs, [])
  }
  return sighting
}

describe("WeatherInference", () => {
  it("asks the record for the observation's own instant, in UTC", async () => {
    const provider = new HourStampingProvider()
    const result = await new WeatherInference(provider).infer(sightingAt())

    expect(result.status).toBe("inferred")
    expect(provider.lastQuery?.points[0].lat).toBe(43.837)
    expect(provider.lastQuery?.points[0].lng).toBe(5.983)
    // 05:00 on a UTC+1 clock is 04:00 UTC — the offset the sighting declares, not the longitude's
    // guess (see SightingEvent.utcOffsetHours).
    expect(provider.lastQuery?.points[0].time.toISOString()).toBe("1965-07-01T04:00:00.000Z")
    expect(result.at?.getUTCHours()).toBe(4)
  })

  it("can't ask without a place", async () => {
    const sighting = sightingAt()
    sighting.event.place = undefined
    sighting.witnessTrack.clear()

    await expect(new WeatherInference(new HourStampingProvider()).infer(sighting)).resolves.toMatchObject({ status: "incomplete" })
  })

  it("can't ask without a full calendar date — a remembered hour isn't a day", async () => {
    const sighting = sightingAt()
    sighting.event.time = { hour: 5, minute: 0 }

    await expect(new WeatherInference(new HourStampingProvider()).infer(sighting)).resolves.toMatchObject({ status: "incomplete" })
  })

  it("reports a record that doesn't cover the sighting as unavailable, not as a failure", async () => {
    const provider: WeatherProvider = { getWeather: () => Promise.resolve(undefined) }

    await expect(new WeatherInference(provider).infer(sightingAt())).resolves.toMatchObject({ status: "unavailable" })
  })

  it("reports a lookup that couldn't be made as failed, and doesn't throw", async () => {
    const provider: WeatherProvider = { getWeather: () => Promise.reject(new Error("offline")) }

    await expect(new WeatherInference(provider).infer(sightingAt())).resolves.toMatchObject({ status: "failed" })
  })

  it("brackets even a short observation, start and end — the record is read between the hours", async () => {
    const provider = new HourStampingProvider()
    const result = await new WeatherInference(provider).infer(sightingAt({ durationSeconds: 90 }))

    expect(provider.lastQuery?.points.map(point => point.time.toISOString())).toEqual([
      "1965-07-01T04:00:00.000Z",
      "1965-07-01T04:01:30.000Z"
    ])
    expect(result.keyframes?.map(keyframe => keyframe.t)).toEqual([0, 10_000])
  })

  it("states one condition when the observation has no length to spread over", async () => {
    const sighting = sightingAt()
    sighting.event.durationSeconds = undefined

    const result = await new WeatherInference(new HourStampingProvider()).infer(sighting)

    expect(result.keyframes).toHaveLength(1)
    expect(result.keyframes?.[0].t).toBe(0)
  })

  it("gives an observation spanning several hours a keyframe per hour of record", async () => {
    const provider = new HourStampingProvider()
    // 05:00 to 08:00 local — 04:00, 05:00, 06:00 and 07:00 UTC.
    const result = await new WeatherInference(provider).infer(sightingAt({ durationSeconds: 3 * 3600, recordedMs: 12_000 }))

    // 04:00 through 07:00 — the whole hours it runs through, its end being one of them already.
    expect(provider.lastQuery?.points.map(point => point.time.getUTCHours())).toEqual([4, 5, 6, 7])
    // Placed on the RECORDING's own clock (12 s here), not on the 3 hours it stands for.
    expect(result.keyframes?.map(keyframe => keyframe.t)).toEqual([0, 4000, 8000, 12000])
    expect(result.keyframes?.map(keyframe => keyframe.weather.cloudCover)).toEqual([0.04, 0.05, 0.06, 0.07])
  })

  it("spreads across the observation's own length when nothing is recorded yet", async () => {
    // The timeline is 0 long, but the player still seeks the whole declared duration
    // (Player.durationOverrideMs) — reading timeline.duration alone flattened a long observation
    // onto one keyframe, which is how fifteen hours came to report the same rain throughout.
    const result = await new WeatherInference(new HourStampingProvider()).infer(
      sightingAt({ durationSeconds: 3 * 3600, recordedMs: 0 })
    )

    expect(result.keyframes?.map(keyframe => keyframe.t)).toEqual([0, 3_600_000, 7_200_000, 10_800_000])
    expect(result.keyframes?.map(keyframe => keyframe.weather.cloudCover)).toEqual([0.04, 0.05, 0.06, 0.07])
  })

  it("follows a witness who moves, asking about the air they are in at each instant", async () => {
    // A DC-3 under observation for two hours: Montgomery at the start, Atlanta at the end.
    const sighting = sightingAt({ durationSeconds: 2 * 3600, recordedMs: 8000 })
    sighting.witnessTrack.clear()
    sighting.witnessTrack.addKeyframe(0, { lat: 32.379, lng: -86.308, elevationM: 1500, pitchDeg: 0, fovDeg: 60 })
    sighting.witnessTrack.addKeyframe(8000, { lat: 33.749, lng: -84.388, elevationM: 1500, pitchDeg: 0, fovDeg: 60 })
    const provider = new HourStampingProvider()

    await new WeatherInference(provider).infer(sighting)

    const points = provider.lastQuery!.points
    expect(points[0].lat).toBeCloseTo(32.379)
    expect(points[points.length - 1].lat).toBeCloseTo(33.749)
    // Interpolated along the track in between, not held at the departure point.
    expect(points[1].lat).toBeGreaterThan(32.379)
    expect(points[1].lat).toBeLessThan(33.749)
  })

  it("holds the opening position for a track that only ever states a heading", async () => {
    // How a witness turning to follow an object is normally recorded — Chiles-Whitted's own file
    // is nine keyframes of changing heading at one fixed pair of coordinates.
    const sighting = sightingAt({ durationSeconds: 600 })
    sighting.witnessTrack.clear()
    sighting.witnessTrack.addKeyframe(0, { lat: undefined, lng: undefined, elevationM: 1500, headingDeg: 40, pitchDeg: 0, fovDeg: 60 })
    const provider = new HourStampingProvider()

    await new WeatherInference(provider).infer(sighting)

    expect(provider.lastQuery?.points.every(point => point.lat === 43.837 && point.lng === 5.983)).toBe(true)
  })

  it("writes the whole track and names what produced it", async () => {
    const sighting = sightingAt({ durationSeconds: 3 * 3600 })
    const inference = new WeatherInference(new HourStampingProvider())
    const result = await inference.infer(sighting)
    inference.applyTo(sighting, result)

    expect(sighting.weatherTrack.allKeyframes).toHaveLength(4)
    expect(sighting.weatherSource).toEqual(SOURCE)
  })

  it("replaces a previous lookup's answer rather than stacking keyframes onto it", async () => {
    const sighting = sightingAt({ durationSeconds: 3 * 3600 })
    const inference = new WeatherInference(new HourStampingProvider())
    const stale: Weather = { ...DEFAULT_WEATHER, cloudCover: 0.99 }
    sighting.weatherTrack.addKeyframe(7777, stale)

    inference.applyTo(sighting, await inference.infer(sighting))

    expect(sighting.weatherTrack.allKeyframes.map(keyframe => keyframe.t)).not.toContain(7777)
  })

  it("changes nothing when there was no record to apply", async () => {
    const sighting = sightingAt()
    const witnessSaid: Weather = { ...DEFAULT_WEATHER, cloudCover: 0.5 }
    sighting.weatherTrack.addKeyframe(0, witnessSaid)
    const inference = new WeatherInference({ getWeather: vi.fn().mockResolvedValue(undefined) })

    inference.applyTo(sighting, await inference.infer(sighting))

    expect(sighting.weatherTrack.getLatestWeatherAt(0)).toEqual(witnessSaid)
    expect(sighting.weatherSource).toBeUndefined()
  })
})
