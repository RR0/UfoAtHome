import { describe, expect, it, vi } from "vitest"
import { OpenMeteoWeatherProvider } from "../../src/engine/weather/providers/OpenMeteoWeatherProvider.js"

/** One hour of Open-Meteo's real archive shape (field names and units verified against a live
 * 1965-07-01 Valensole request), with every value overridable per test. */
function hourly(overrides: Record<string, number> = {}): Record<string, unknown> {
  const values = {
    cloud_cover: 0,
    cloud_cover_low: 0,
    cloud_cover_mid: 0,
    cloud_cover_high: 0,
    precipitation: 0,
    snowfall: 0,
    weather_code: 0,
    wind_speed_10m: 0,
    wind_direction_10m: 0,
    temperature_2m: 15,
    dew_point_2m: 10,
    ...overrides
  }
  return {
    time: ["1965-07-01T04:00", "1965-07-01T05:00"],
    ...Object.fromEntries(Object.entries(values).map(([field, value]) => [field, [value, value]]))
  }
}

function providerReturning(hourlyValues: Record<string, unknown>): {
  provider: OpenMeteoWeatherProvider
  fetchMock: ReturnType<typeof vi.fn>
} {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ hourly: hourlyValues }) })
  return { provider: new OpenMeteoWeatherProvider({ fetchImpl: fetchMock as unknown as typeof fetch }), fetchMock }
}

const AT_04 = new Date(Date.UTC(1965, 6, 1, 4, 0))

describe("OpenMeteoWeatherProvider", () => {
  it("asks the archive for the right place, day and units", async () => {
    const { provider, fetchMock } = providerReturning(hourly())
    await provider.getWeather({ points: [{ lat: 43.837, lng: 5.983, time: AT_04 }] })

    const url = fetchMock.mock.calls[0][0] as string
    expect(url).toContain("latitude=43.837")
    expect(url).toContain("longitude=5.983")
    expect(url).toContain("start_date=1965-07-01")
    expect(url).toContain("end_date=1965-07-01")
    // Weather.windSpeed is m/s — asking for the right unit beats converting km/h later.
    expect(url).toContain("wind_speed_unit=ms")
    expect(url).toContain("timezone=UTC")
  })

  it("reports the record it used as the source, request URL included", async () => {
    const { provider } = providerReturning(hourly())
    const observation = await provider.getWeather({ points: [{ lat: 43.8, lng: 6, time: AT_04 }] })

    expect(observation?.source.id).toBe("era5")
    expect(observation?.source.name).toContain("ERA5")
    // The exact request, so the claim stays checkable rather than merely asserted.
    expect(observation?.source.url).toContain("start_date=1965-07-01")
  })

  it("has no record before ERA5's own 1940 epoch, and doesn't even ask", async () => {
    const { provider, fetchMock } = providerReturning(hourly())
    const observation = await provider.getWeather({ points: [{ lat: 43.8, lng: 6, time: new Date(Date.UTC(1933, 5, 1, 4)) }] })

    expect(observation).toBeUndefined()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("treats an archive error payload as 'no record', not as a broken lookup", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ error: true, reason: "Invalid date" }) })
    const provider = new OpenMeteoWeatherProvider({ fetchImpl: fetchMock as unknown as typeof fetch })

    await expect(provider.getWeather({ points: [{ lat: 43.8, lng: 6, time: AT_04 }] })).resolves.toBeUndefined()
  })

  it("throws on an HTTP failure — 'we couldn't ask' is not 'there is nothing to find'", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 503 })
    const provider = new OpenMeteoWeatherProvider({ fetchImpl: fetchMock as unknown as typeof fetch })

    await expect(provider.getWeather({ points: [{ lat: 43.8, lng: 6, time: AT_04 }] })).rejects.toThrow("503")
  })

  it("asks once per distinct query, however often the recorder re-asks", async () => {
    const { provider, fetchMock } = providerReturning(hourly())
    await provider.getWeather({ points: [{ lat: 43.8, lng: 6, time: AT_04 }] })
    await provider.getWeather({ points: [{ lat: 43.8, lng: 6, time: AT_04 }] })

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("reads percentages as fractions and m/s as-is", async () => {
    const { provider } = providerReturning(hourly({ cloud_cover: 40, wind_speed_10m: 3.5 }))
    const observation = await provider.getWeather({ points: [{ lat: 43.8, lng: 6, time: AT_04 }] })

    expect(observation?.samples[0].weather.cloudCover).toBeCloseTo(0.4)
    expect(observation?.samples[0].weather.windSpeed).toBe(3.5)
  })

  it("turns the record's 'wind from' into this project's 'wind toward'", async () => {
    const { provider } = providerReturning(hourly({ wind_direction_10m: 270 }))
    const observation = await provider.getWeather({ points: [{ lat: 43.8, lng: 6, time: AT_04 }] })

    // A westerly (from 270) blows eastward — see Weather.windDirectionDeg.
    expect(observation?.samples[0].weather.windDirectionDeg).toBe(90)
  })

  it("reads a thunderstorm code as a storm", async () => {
    const { provider } = providerReturning(hourly({ weather_code: 95 }))
    const observation = await provider.getWeather({ points: [{ lat: 43.8, lng: 6, time: AT_04 }] })

    expect(observation?.samples[0].weather.storm).toBe(true)
  })

  it("distinguishes rain, snow and hail", async () => {
    const rain = await providerReturning(hourly({ precipitation: 2 })).provider.getWeather({ points: [{ lat: 0, lng: 0, time: AT_04 }] })
    const snow = await providerReturning(hourly({ precipitation: 2, snowfall: 1.5 })).provider.getWeather({ points: [{ lat: 0, lng: 0, time: AT_04 }] })
    const hail = await providerReturning(hourly({ precipitation: 2, weather_code: 96 })).provider.getWeather({ points: [{ lat: 0, lng: 0, time: AT_04 }] })
    const dry = await providerReturning(hourly()).provider.getWeather({ points: [{ lat: 0, lng: 0, time: AT_04 }] })

    expect(rain?.samples[0].weather.precipitationType).toBe("rain")
    expect(snow?.samples[0].weather.precipitationType).toBe("snow")
    expect(hail?.samples[0].weather.precipitationType).toBe("hail")
    expect(dry?.samples[0].weather.precipitationType).toBe("none")
    expect(dry?.samples[0].weather.precipitationIntensity).toBe(0)
  })

  it("scales precipitation intensity with the rate, saturating at heavy rain", async () => {
    const light = await providerReturning(hourly({ precipitation: 0.5 })).provider.getWeather({ points: [{ lat: 0, lng: 0, time: AT_04 }] })
    const heavy = await providerReturning(hourly({ precipitation: 20 })).provider.getWeather({ points: [{ lat: 0, lng: 0, time: AT_04 }] })

    const lightIntensity = light!.samples[0].weather.precipitationIntensity
    expect(lightIntensity).toBeGreaterThan(0)
    expect(lightIntensity).toBeLessThan(0.5)
    expect(heavy?.samples[0].weather.precipitationIntensity).toBe(1)
  })

  it("darkens a low deck more than the same amount of cirrus", async () => {
    const low = await providerReturning(hourly({ cloud_cover: 90, cloud_cover_low: 90 })).provider.getWeather({ points: [{ lat: 0, lng: 0, time: AT_04 }] })
    const high = await providerReturning(hourly({ cloud_cover: 90, cloud_cover_high: 90 })).provider.getWeather({ points: [{ lat: 0, lng: 0, time: AT_04 }] })

    expect(low!.samples[0].weather.cloudDarkness).toBeGreaterThan(high!.samples[0].weather.cloudDarkness)
  })

  it("leaves a clear sky with no darkness and no deck altitude to place", async () => {
    const { provider } = providerReturning(hourly())
    const weather = (await provider.getWeather({ points: [{ lat: 0, lng: 0, time: AT_04 }] }))!.samples[0].weather

    expect(weather.cloudDarkness).toBe(0)
    expect(weather.cloudBaseM).toBeUndefined()
  })

  it("puts a low deck at the condensation level the temperature/dew-point spread implies", async () => {
    const { provider } = providerReturning(hourly({ cloud_cover: 80, cloud_cover_low: 80, temperature_2m: 20, dew_point_2m: 12 }))
    const weather = (await provider.getWeather({ points: [{ lat: 0, lng: 0, time: AT_04 }] }))!.samples[0].weather

    // Espy: ~125 m per degree of spread, 8 degrees here.
    expect(weather.cloudBaseM).toBe(1000)
  })

  it("puts a cirrus-only sky high up, whatever the surface spread says", async () => {
    const { provider } = providerReturning(hourly({ cloud_cover: 60, cloud_cover_high: 60, temperature_2m: 20, dew_point_2m: 19 }))
    const weather = (await provider.getWeather({ points: [{ lat: 0, lng: 0, time: AT_04 }] }))!.samples[0].weather

    expect(weather.cloudBaseM).toBeGreaterThan(5000)
  })

  it("describes the lowest deck holding a real share of the sky, not the biggest one", async () => {
    const { provider } = providerReturning(
      hourly({ cloud_cover: 95, cloud_cover_low: 30, cloud_cover_high: 90, temperature_2m: 20, dew_point_2m: 16 })
    )
    const weather = (await provider.getWeather({ points: [{ lat: 0, lng: 0, time: AT_04 }] }))!.samples[0].weather

    // What a witness under it would describe is the 30% deck overhead, not the cirrus above it.
    expect(weather.cloudBaseM).toBe(500)
  })

  it("reads BETWEEN the hours the record states, so a short sighting still has weather that moves", async () => {
    const { provider } = providerReturning({
      time: ["1965-07-01T04:00", "1965-07-01T05:00"],
      cloud_cover: [10, 90],
      cloud_cover_low: [0, 0],
      cloud_cover_mid: [0, 0],
      cloud_cover_high: [10, 90],
      precipitation: [0, 0],
      snowfall: [0, 0],
      weather_code: [0, 0],
      wind_speed_10m: [0, 0],
      wind_direction_10m: [0, 0],
      temperature_2m: [15, 15],
      dew_point_2m: [10, 10]
    })
    const observation = await provider.getWeather({ points: [{ lat: 0, lng: 0, time: new Date(Date.UTC(1965, 6, 1, 4, 12)) }, { lat: 0, lng: 0, time: new Date(Date.UTC(1965, 6, 1, 4, 51)) }] })

    // 04:12 is a fifth of the way from the 10% row to the 90% one; 04:51 is 85% of the way.
    expect(observation?.samples[0].weather.cloudCover).toBeCloseTo(0.26)
    expect(observation?.samples[1].weather.cloudCover).toBeCloseTo(0.78)
  })

  it("holds the WMO code from the nearer hour rather than averaging a category", async () => {
    const { provider } = providerReturning({
      ...hourly(),
      weather_code: [0, 95]
    })
    const observation = await provider.getWeather({ points: [{ lat: 0, lng: 0, time: new Date(Date.UTC(1965, 6, 1, 4, 20)) }, { lat: 0, lng: 0, time: new Date(Date.UTC(1965, 6, 1, 4, 40)) }] })

    expect(observation?.samples[0].weather.storm).toBe(false)
    expect(observation?.samples[1].weather.storm).toBe(true)
  })

  it("takes the shortest arc when the wind bearing wraps past north", async () => {
    const { provider } = providerReturning({ ...hourly(), wind_direction_10m: [350, 10] })
    const observation = await provider.getWeather({ points: [{ lat: 0, lng: 0, time: new Date(Date.UTC(1965, 6, 1, 4, 30)) }] })

    // Halfway from 350 to 10 is 0 (through north), not 180. Stored as "blows toward", so +180.
    expect(observation?.samples[0].weather.windDirectionDeg).toBeCloseTo(180)
  })

  it("asks about every grid cell a moving witness passed through, in one request", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([{ hourly: hourly({ cloud_cover: 10 }) }, { hourly: hourly({ cloud_cover: 90 }) }])
    })
    const provider = new OpenMeteoWeatherProvider({ fetchImpl: fetchMock as unknown as typeof fetch })
    const observation = await provider.getWeather({
      points: [
        { lat: 32.379, lng: -86.308, time: AT_04 },
        { lat: 33.749, lng: -84.388, time: AT_04 }
      ]
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const url = fetchMock.mock.calls[0][0] as string
    expect(url).toContain("latitude=32.379%2C33.749")
    expect(observation?.samples[0].weather.cloudCover).toBeCloseTo(0.1)
    expect(observation?.samples[1].weather.cloudCover).toBeCloseTo(0.9)
  })

  it("asks once for a witness who never left one grid cell", async () => {
    const { provider, fetchMock } = providerReturning(hourly())
    // ~1 km apart: ERA5 has exactly one answer for both, so asking twice would be waste.
    await provider.getWeather({
      points: [
        { lat: 43.837, lng: 5.983, time: AT_04 },
        { lat: 43.845, lng: 5.99, time: AT_04 }
      ]
    })

    const url = fetchMock.mock.calls[0][0] as string
    expect(url).toContain("latitude=43.837&")
    expect(url).not.toContain("43.845")
  })

  it("has no record when the response doesn't reach the requested hour", async () => {
    const { provider } = providerReturning(hourly())
    const observation = await provider.getWeather({ points: [{ lat: 0, lng: 0, time: new Date(Date.UTC(1965, 6, 1, 20)) }] })

    expect(observation).toBeUndefined()
  })
})
