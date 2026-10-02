import { describe, expect, it, vi } from "vitest"
import { OpenMeteoUpperAirProvider } from "../../../src/engine/traffic/providers/OpenMeteoUpperAirProvider.js"

const LEVELS = [500, 400, 300, 250, 200, 150]

/** What the API answers: hourly series by level, the way it names them. */
function response(hours: number, fill: (level: number, field: string, hour: number) => number | null) {
  const hourly: Record<string, unknown> = {
    time: Array.from({ length: hours }, (_, h) => `2025-12-30T${String(h).padStart(2, "0")}:00`)
  }
  for (const level of LEVELS) {
    for (const field of ["temperature", "relative_humidity", "wind_speed", "wind_direction"]) {
      hourly[`${field}_${level}hPa`] = Array.from({ length: hours }, (_, h) => fill(level, field, h))
    }
  }
  return { hourly }
}

const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body }) as Response
const fill = (level: number, field: string) =>
  ({ temperature: -50 - (level - 250) / 10, relative_humidity: 40, wind_speed: 25, wind_direction: 270 })[field]!

describe("OpenMeteoUpperAirProvider", () => {
  it("asks the historical forecast API, the one that holds the levels, for each level's own series", async () => {
    const fetchImpl = vi.fn(async () => ok(response(24, fill)))
    const provider = new OpenMeteoUpperAirProvider({ fetchImpl })
    await provider.between({ lat: 48.99, lng: 2.45 }, Date.UTC(2025, 11, 30, 16), Date.UTC(2025, 11, 30, 17))
    const url = new URL((fetchImpl.mock.calls[0] as unknown as [string])[0])
    expect(url.host).toBe("historical-forecast-api.open-meteo.com")
    expect(url.searchParams.get("start_date")).toBe("2025-12-30")
    expect(url.searchParams.get("end_date")).toBe("2025-12-30")
    expect(url.searchParams.get("wind_speed_unit")).toBe("ms")
    expect(url.searchParams.get("timezone")).toBe("UTC")
    for (const level of LEVELS) expect(url.searchParams.get("hourly")).toContain(`temperature_${level}hPa`)
  })

  it("asks for every day the window touches", async () => {
    const fetchImpl = vi.fn(async () => ok(response(48, fill)))
    await new OpenMeteoUpperAirProvider({ fetchImpl }).between({ lat: 48, lng: 2 }, Date.UTC(2025, 11, 30, 23, 50), Date.UTC(2025, 11, 31, 0, 10))
    const url = new URL((fetchImpl.mock.calls[0] as unknown as [string])[0])
    expect(url.searchParams.get("start_date")).toBe("2025-12-30")
    expect(url.searchParams.get("end_date")).toBe("2025-12-31")
  })

  it("answers with the levels of each hour, humidity as a fraction, in the order of the pressure", async () => {
    const fetchImpl = vi.fn(async () => ok(response(24, fill)))
    const air = await new OpenMeteoUpperAirProvider({ fetchImpl }).between({ lat: 48, lng: 2 }, Date.UTC(2025, 11, 30, 16), Date.UTC(2025, 11, 30, 17))
    expect(air.status).toBe("found")
    if (air.status !== "found") return
    expect(air.samples).toHaveLength(24)
    expect(air.samples[16].t).toBe(Date.UTC(2025, 11, 30, 16))
    const levels = air.samples[16].levels
    expect(levels.map(l => l.pressureHpa)).toEqual([500, 400, 300, 250, 200, 150])
    expect(levels[3].relativeHumidity).toBeCloseTo(0.4, 6)
    expect(levels[3].windSpeedMs).toBe(25)
    expect(air.source.url).toContain("historical-forecast-api.open-meteo.com")
  })

  it("says the record does not hold a window before its first day, without asking", async () => {
    const fetchImpl = vi.fn(async () => ok(response(24, fill)))
    const air = await new OpenMeteoUpperAirProvider({ fetchImpl }).between({ lat: 48, lng: 2 }, Date.UTC(2021, 5, 1), Date.UTC(2021, 5, 1, 1))
    expect(air.status).toBe("outside")
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it("says the record does not hold it when the levels are empty for the hours asked", async () => {
    const fetchImpl = vi.fn(async () => ok(response(24, () => null)))
    const air = await new OpenMeteoUpperAirProvider({ fetchImpl }).between({ lat: 48, lng: 2 }, Date.UTC(2025, 11, 30, 16), Date.UTC(2025, 11, 30, 17))
    expect(air.status).toBe("outside")
  })

  it("says it could not read it on a server error or a network failure, which is another thing", async () => {
    const failing = new OpenMeteoUpperAirProvider({ fetchImpl: vi.fn(async () => ({ ok: false, status: 500 }) as Response) })
    expect((await failing.between({ lat: 48, lng: 2 }, Date.UTC(2025, 11, 30, 16), Date.UTC(2025, 11, 30, 17))).status).toBe("failed")
    const offline = new OpenMeteoUpperAirProvider({ fetchImpl: vi.fn(async () => { throw new Error("offline") }) })
    expect((await offline.between({ lat: 48, lng: 2 }, Date.UTC(2025, 11, 30, 16), Date.UTC(2025, 11, 30, 17))).status).toBe("failed")
  })

  it("asks once for the same place, window and day", async () => {
    const fetchImpl = vi.fn(async () => ok(response(24, fill)))
    const provider = new OpenMeteoUpperAirProvider({ fetchImpl })
    await provider.between({ lat: 48.001, lng: 2.001 }, Date.UTC(2025, 11, 30, 16), Date.UTC(2025, 11, 30, 17))
    await provider.between({ lat: 48.002, lng: 2.002 }, Date.UTC(2025, 11, 30, 16, 30), Date.UTC(2025, 11, 30, 17))
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })
})
