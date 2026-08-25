import type { TimeZoneProvider } from "../TimeZoneProvider.js"

/** Open-Meteo answers `timezone=auto` with the IANA identifier for the coordinates asked about —
 * keyless, CORS-open, and already this project's weather record, so it is one credit rather than
 * two. Everything but that identifier is deliberately ignored, `utc_offset_seconds` above all: it
 * is today's offset, and this is used to date observations from decades ago. */
export class OpenMeteoTimeZoneProvider implements TimeZoneProvider {
  constructor(private readonly endpoint = "https://api.open-meteo.com/v1/forecast") {}

  async zoneAt(lat: number, lng: number): Promise<string | undefined> {
    const url = new URL(this.endpoint)
    url.searchParams.set("latitude", String(lat))
    url.searchParams.set("longitude", String(lng))
    url.searchParams.set("timezone", "auto")
    // The smallest answer the endpoint will give: no hourly variables, one day. Only the envelope
    // is wanted.
    url.searchParams.set("forecast_days", "1")
    try {
      const response = await fetch(url.toString())
      if (!response.ok) return undefined
      const body = (await response.json()) as { timezone?: string }
      // "GMT" is what it answers for a coordinate it cannot place in any zone — an identifier in
      // form only, and not one whose rules mean anything.
      return body.timezone && body.timezone !== "GMT" ? body.timezone : undefined
    } catch {
      return undefined
    }
  }
}
