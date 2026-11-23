import { describe, expect, it } from "vitest"
import { OpenMeteoWindProfiles, Winds, type OpenMeteoHourly } from "../../../src/engine/scenario/WindProfiles.js"

/** An answer of the archive for one day: the wind from the west at 2 m/s at the ground at 02:00, 4 m/s at 03:00, and at 850 hPa. */
const day = (date: string): OpenMeteoHourly => {
  const time = Array.from({ length: 24 }, (_, h) => `${date}T${String(h).padStart(2, "0")}:00`)
  const at = (v: number) => time.map((_, h) => h === 2 ? v : h === 3 ? 2 * v : v)
  return {
    latitude: 36.56, longitude: -115.41, elevation: 1084,
    hourly: {
      time, wind_speed_10m: at(2), wind_direction_10m: time.map(() => 270),
      wind_speed_850hPa: at(5), wind_direction_850hPa: time.map(() => 180), geopotential_height_850hPa: time.map(() => 1500),
      wind_speed_700hPa: at(9), wind_direction_700hPa: time.map(() => 0), geopotential_height_700hPa: time.map(() => 3100)
    }
  }
}

describe("The wind of a place and an hour", () => {
  it("reads the levels of an hour, as where they blow towards, metres above the ground", () => {
    const profile = OpenMeteoWindProfiles.profileOf(day("2023-10-15"), "2023-10-15T02:00")
    expect(profile.levels.map(l => Math.round(l.aboveGroundM))).toEqual([10, 416, 2016])
    expect(profile.levels[0].wind).toEqual({ towardDeg: 90, speedMS: 2 })
    expect(profile.levels[1].wind.towardDeg).toBe(0)
  })

  it("interpolates between levels as vectors, and holds beyond them", () => {
    const profile = OpenMeteoWindProfiles.profileOf(day("2023-10-15"), "2023-10-15T02:00")
    expect(Winds.at(profile, 0)).toEqual({ towardDeg: 90, speedMS: 2 })
    const between = Winds.at(profile, 213)
    expect(between.towardDeg).toBeGreaterThan(0)
    expect(between.towardDeg).toBeLessThan(90)
    expect(Winds.at(profile, 9000).speedMS).toBe(9)
  })

  it("asks a day of a place once, again later when it is refused, and keeps it", async () => {
    const asked: string[] = []
    const waits: number[] = []
    let refusals = 2
    const fetchImpl = (async (url: string) => {
      asked.push(url)
      if (refusals-- > 0) return new Response("Too many", { status: 429 })
      return new Response(JSON.stringify(day("2023-10-15")))
    }) as typeof fetch
    const kept = new Map<string, string>()
    const winds = new OpenMeteoWindProfiles({ fetchImpl, wait: async ms => { waits.push(ms) }, cache: { get: async k => kept.get(k), set: async (k, v) => { kept.set(k, v) } } })
    const at = await winds.profile(36.55, -115.4, new Date("2023-10-15T02:00:00Z"))
    expect(at.levels[0].wind.speedMS).toBe(2)
    await winds.profile(36.55, -115.4, new Date("2023-10-15T03:00:00Z"))
    expect(asked).toHaveLength(3)
    expect(waits).toEqual([OpenMeteoWindProfiles.RETRY_MS, 2 * OpenMeteoWindProfiles.RETRY_MS])
    expect(asked[0]).toContain("wind_speed_unit=ms")
    // Another sweep, with the same cache: nothing asked.
    const again = new OpenMeteoWindProfiles({ fetchImpl: (async () => { throw new Error("asked") }) as typeof fetch, cache: { get: async k => kept.get(k), set: async () => undefined } })
    expect((await again.profile(36.55, -115.4, new Date("2023-10-15T02:00:00Z"))).levels[0].wind.speedMS).toBe(2)
  })

  it("interpolates between the two hours around an instant", async () => {
    const winds = new OpenMeteoWindProfiles({ fetchImpl: (async () => new Response(JSON.stringify(day("2023-10-15")))) as typeof fetch })
    const half = await winds.profile(36.55, -115.4, new Date("2023-10-15T02:30:00Z"))
    expect(half.levels[0].wind.speedMS).toBeCloseTo(3, 6)
    expect(half.hour).toBe("2023-10-15T02:30")
  })

  it("gives up after its retries, saying what the archive answered", async () => {
    const winds = new OpenMeteoWindProfiles({ fetchImpl: (async () => new Response("", { status: 400 })) as typeof fetch, wait: async () => undefined })
    await expect(winds.profile(0, 0, new Date("2023-10-15T02:00:00Z"))).rejects.toThrow(/400/)
  })
})
