import type { GeoPoint } from "../../sky-events/reentries/Reentry.js"
import type { AircraftDescription, AircraftProblem, AircraftProvider, AircraftTraffic, AircraftTrack, AircraftPoint } from "../../../engine/traffic/AircraftProvider.js"
import { AircraftSighting } from "../../../engine/traffic/AircraftSighting.js"
import { TrafficIds } from "../../../engine/traffic/TrafficIds.js"
import { FLIGHTRADAR24_CITATION } from "./aircraftSources.js"

/** What /historic/flight-positions/full says of one flight, of what is read here. */
interface Fr24Flight {
  fr24_id: string
  lat: number
  lon: number
  alt: number
  hex?: string | null
  type?: string | null
  reg?: string | null
}

/** What /flight-tracks says of one position, of what is read here. */
interface Fr24TrackPoint {
  timestamp: string
  lat: number
  lon: number
  alt: number
  gspeed?: number
  track?: number
  source?: string
}

/** One instant of the sky around a place: who was flying, nearest first. */
interface Snapshot {
  t: number
  place: string
  flights: Fr24Flight[]
  /** The radius the flights were last asked within: the smallest that held enough of them. */
  withinKm: number
}

/** An answer of the API that is not the data: why it is not, in the terms an AircraftTraffic says it. */
class Fr24Refusal extends Error {
  constructor(readonly problem: AircraftProblem) {
    super(problem)
  }
}

export interface Flightradar24ProviderOptions {
  /** The key the reader typed, read at each question: they may type another. */
  token: () => string | undefined
  fetchImpl?: typeof fetch
  /** How long a question waits for another to replace it, ms. Mainly for tests. */
  settleMs?: number
  /** The rate it keeps to; the cheapest plan's by default. Mainly for tests. */
  requestsPerMinute?: number
}

/**
 * The aircraft Flightradar24 recorded, asked of its API on the reader's own subscription: the key is theirs, kept by the page and sent
 * from their browser straight to the API (which answers any origin), as for the Claude drafts. Nothing relays it, and the answers
 * stay in memory: its terms keep what it returns from being stored more than 30 days, which is also why traffic is never frozen into
 * a recording.
 *
 * What it charges shapes what is asked. Its positions are a snapshot of ONE instant, at 8 credits per flight returned, and a flight's
 * whole track costs 40 credits, while the cheapest plan gives 30 000 credits a month and 10 requests a minute. Asking a snapshot per
 * minute of a window would spend the month in a few openings, so a question is one instant in the middle of the window (who was
 * there), then the tracks of the few nearest flights (where they went). Each flight's track being whole, the hour the trails ask for
 * costs nothing more; it holds only the flights of that one instant, which the answer says through `partial`.
 *
 * The nearest have to be asked for by asking near. A snapshot returns no more than the plan allows (measured: 20 on the cheapest,
 * though `limit` asks for more, a number its documentation does not state), and in no order of distance: over 100 km around Roissy
 * they were a sample of the box, with 3 of the 9 flights within 20 km. So the radius starts small and only widens while it holds too
 * few flights, which also pays for no more of them than are needed.
 *
 * A question that nothing has answered yet waits a little, because an editor asks again at each change of the place or the time, and
 * paying for the positions a drag went through is paying for nothing. And there is a ceiling per page, in case something asks in a
 * loop: this is someone's money.
 */
export class Flightradar24Provider implements AircraftProvider {
  readonly citation = FLIGHTRADAR24_CITATION

  /** The first instant its record holds; how far back a given key reaches depends on its plan, which only the API knows. */
  static readonly FIRST_MS = Date.UTC(2016, 4, 11)
  /** How far around the observer flights are looked for, km: smaller than the free archive's, since each one found is paid for. */
  static readonly DEFAULT_RADIUS_KM = 100
  /** The radii asked in turn, km, up to the radius of the question. */
  static readonly RINGS_KM = [25, 50]
  /** The most flights a snapshot is asked to return, hence the most it can cost. */
  static readonly SNAPSHOT_LIMIT = 60
  /** The most the cheapest plan returns, measured: as many flights as that may be a sample of more. */
  static readonly SMALLEST_PLAN_RESULTS = 20
  /** How many get their track. With one snapshot, this fits in the cheapest plan's 10 requests a minute; a wider radius waits its turn (see paced). */
  static readonly MAX_TRACED = 8
  static readonly CREDITS_PER_SNAPSHOT_FLIGHT = 8
  static readonly CREDITS_PER_TRACK = 40
  /** What an empty answer costs. */
  static readonly CREDITS_FOR_NOTHING = 1
  /** What a page may spend before it stops asking, about one sixth of the cheapest plan's month. */
  static readonly MAX_CREDITS_PER_PAGE = 5000
  /** Every smaller radius with one flight too few, the widest with all it can return, and the tracks. */
  private static readonly WORST_CASE_CREDITS = (Flightradar24Provider.MAX_TRACED - 1) * Flightradar24Provider.RINGS_KM.length * Flightradar24Provider.CREDITS_PER_SNAPSHOT_FLIGHT
    + Flightradar24Provider.SNAPSHOT_LIMIT * Flightradar24Provider.CREDITS_PER_SNAPSHOT_FLIGHT
    + Flightradar24Provider.MAX_TRACED * Flightradar24Provider.CREDITS_PER_TRACK
  private static readonly API = "https://fr24api.flightradar24.com/api"
  /** Flights at 0 ft are on the ground: they would be paid for, and are nobody's light in the sky. */
  private static readonly IN_THE_AIR_FT = "1-60000"
  private static readonly KM_PER_DEG = 111.32

  private readonly token: () => string | undefined
  private readonly fetchImpl: typeof fetch
  private readonly settleMs: number
  private readonly requestsPerMinute: number
  private readonly snapshots: Promise<Snapshot>[] = []
  private readonly tracks = new Map<string, Promise<AircraftPoint[]>>()
  private readonly descriptions = new Map<string, AircraftDescription>()
  private readonly requestTimes: number[] = []
  /** What the answers held was asked with this key: another may be another plan, or the sandbox's static data. */
  private tokenOfMemory?: string
  private latestQuestion = 0
  private creditsSpent = 0

  constructor(options: Flightradar24ProviderOptions) {
    this.token = options.token
    // fetch.bind(globalThis): an unbound fetch loses the `this` it requires once called as a field.
    this.fetchImpl = options.fetchImpl ?? fetch.bind(globalThis)
    this.settleMs = options.settleMs ?? 1500
    this.requestsPerMinute = options.requestsPerMinute ?? 10
  }

  mayCover(ms: number): boolean {
    return ms >= Flightradar24Provider.FIRST_MS && ms <= Date.now()
  }

  async between(observer: GeoPoint, startMs: number, endMs: number, radiusKm = Flightradar24Provider.DEFAULT_RADIUS_KM): Promise<AircraftTraffic> {
    const token = this.token()
    if (!token) return { status: "failed", problem: "credential" }
    if (token !== this.tokenOfMemory) this.forgetAnswers(token)
    try {
      const snapshot = await this.snapshotFor(token, observer, startMs, endMs, radiusKm)
      if (!snapshot) return { status: "failed" }
      const traced = snapshot.flights.slice(0, Flightradar24Provider.MAX_TRACED)
      const pointsByFlight = await Promise.all(traced.map(flight => this.trackOf(token, flight)))
      const tracks: AircraftTrack[] = []
      traced.forEach((flight, index) => {
        const points = pointsByFlight[index].filter(point => point.t >= startMs && point.t <= endMs && AircraftSighting.groundDistanceKm(observer, point) <= radiusKm)
        if (points.length > 0) tracks.push({ ...Flightradar24Provider.addressOf(flight), points })
      })
      return {
        status: "found",
        tracks,
        creditsSpent: this.creditsSpent,
        partial: {
          traced: traced.length,
          seen: snapshot.flights.length,
          moreSeen: snapshot.flights.length >= Flightradar24Provider.SMALLEST_PLAN_RESULTS,
          withinKm: snapshot.withinKm
        }
      }
    } catch (error) {
      return { status: "failed", problem: error instanceof Fr24Refusal ? error.problem : "network", creditsSpent: this.creditsSpent }
    }
  }

  /** What the snapshot said of it: nothing more is asked, and its type and registration are already paid for. */
  async describe(track: AircraftTrack): Promise<AircraftDescription | undefined> {
    return this.descriptions.get(TrafficIds.keyOf(track))
  }

  /** The address of a flight, or, for one that broadcasts none, its flight's id, marked as not the airframe's. */
  static addressOf(flight: Pick<Fr24Flight, "fr24_id" | "hex">): { icao: number; nonIcao: boolean } {
    const address = flight.hex ? Number.parseInt(flight.hex, 16) : Number.NaN
    return Number.isFinite(address) ? { icao: address, nonIcao: false } : { icao: Number.parseInt(flight.fr24_id, 16), nonIcao: true }
  }

  /**
   * The north, south, west, east of the box around a circle, as the API reads them. Cut at the antimeridian rather than wrapped: the
   * API does not say it reads a box across it, and two boxes would be paid twice for the rare place concerned.
   */
  static boundsAround(observer: GeoPoint, radiusKm: number): string {
    const dLat = radiusKm / Flightradar24Provider.KM_PER_DEG
    const north = Math.min(90, observer.lat + dLat)
    const south = Math.max(-90, observer.lat - dLat)
    const cos = Math.cos((Math.max(Math.abs(north), Math.abs(south)) * Math.PI) / 180)
    const dLng = cos < 1e-6 ? 180 : radiusKm / (Flightradar24Provider.KM_PER_DEG * cos)
    const west = Math.max(-180, observer.lng - dLng)
    const east = Math.min(180, observer.lng + dLng)
    return [north, south, west, east].map(value => value.toFixed(3)).join(",")
  }

  private forgetAnswers(token: string): void {
    this.tokenOfMemory = token
    this.snapshots.length = 0
    this.tracks.clear()
    this.descriptions.clear()
  }

  /**
   * A snapshot already paid for that lies within the window, or a new one in its middle. Undefined when a newer question replaced this
   * one while it waited: whoever asked has moved on.
   */
  private async snapshotFor(token: string, observer: GeoPoint, startMs: number, endMs: number, radiusKm: number): Promise<Snapshot | undefined> {
    const place = `${observer.lat.toFixed(3)},${observer.lng.toFixed(3)},${radiusKm}`
    for (const known of this.snapshots) {
      const snapshot = await known.catch(() => undefined)
      if (snapshot && snapshot.place === place && snapshot.t >= startMs && snapshot.t <= endMs) return snapshot
    }
    const question = ++this.latestQuestion
    if (this.settleMs > 0) await new Promise(resolve => setTimeout(resolve, this.settleMs))
    if (question !== this.latestQuestion) return undefined
    if (this.creditsSpent + Flightradar24Provider.WORST_CASE_CREDITS > Flightradar24Provider.MAX_CREDITS_PER_PAGE) throw new Fr24Refusal("budget")
    const asked = this.askSnapshot(token, observer, Math.round((startMs + endMs) / 2), radiusKm, place)
    this.snapshots.push(asked)
    asked.catch(() => this.snapshots.splice(this.snapshots.indexOf(asked), 1))
    return asked
  }

  /** The flights of that instant in the smallest radius that holds enough of them to trace, nearest first. */
  private async askSnapshot(token: string, observer: GeoPoint, t: number, radiusKm: number, place: string): Promise<Snapshot> {
    const radii = [...Flightradar24Provider.RINGS_KM.filter(ring => ring < radiusKm), radiusKm]
    let flights: Fr24Flight[] = []
    let withinKm = radiusKm
    for (const ring of radii) {
      withinKm = ring
      flights = await this.flightsWithin(token, observer, t, ring)
      if (flights.length >= Flightradar24Provider.MAX_TRACED) break
    }
    const distance = (flight: Fr24Flight) => AircraftSighting.groundDistanceKm(observer, { lat: flight.lat, lng: flight.lon })
    return { t, place, withinKm, flights: [...flights].sort((a, b) => distance(a) - distance(b)) }
  }

  private async flightsWithin(token: string, observer: GeoPoint, t: number, radiusKm: number): Promise<Fr24Flight[]> {
    const query = new URLSearchParams({
      timestamp: String(Math.floor(t / 1000)),
      bounds: Flightradar24Provider.boundsAround(observer, radiusKm),
      altitude_ranges: Flightradar24Provider.IN_THE_AIR_FT,
      limit: String(Flightradar24Provider.SNAPSHOT_LIMIT)
    })
    const body = await this.get<{ data?: Fr24Flight[] }>(token, `/historic/flight-positions/full?${query}`)
    const flights = body.data ?? []
    this.creditsSpent += flights.length > 0 ? flights.length * Flightradar24Provider.CREDITS_PER_SNAPSHOT_FLIGHT : Flightradar24Provider.CREDITS_FOR_NOTHING
    for (const flight of flights) {
      const description: AircraftDescription = { type: flight.type || undefined, registration: flight.reg || undefined }
      if (description.type || description.registration) this.descriptions.set(TrafficIds.keyOf(Flightradar24Provider.addressOf(flight)), description)
    }
    return flights
  }

  /**
   * The whole recorded track of a flight, asked once. A position the API estimated is left out: it is not what a receiver heard. So is one
   * at 0 ft, which is how it says the ground, whatever the ground's height: the free archive leaves those out as well.
   */
  private trackOf(token: string, flight: Fr24Flight): Promise<AircraftPoint[]> {
    let track = this.tracks.get(flight.fr24_id)
    if (!track) {
      track = this.get<{ tracks?: Fr24TrackPoint[] }[] | { data?: { tracks?: Fr24TrackPoint[] }[] }>(token, `/flight-tracks?flight_id=${encodeURIComponent(flight.fr24_id)}`).then(body => {
        const legs = Array.isArray(body) ? body : body.data ?? []
        const points = legs.flatMap(leg => leg.tracks ?? [])
        this.creditsSpent += points.length > 0 ? Flightradar24Provider.CREDITS_PER_TRACK : Flightradar24Provider.CREDITS_FOR_NOTHING
        return points
          .filter(point => point.source?.toUpperCase() !== "ESTIMATED" && point.alt > 0)
          .map(point => ({
            t: Date.parse(point.timestamp),
            lat: point.lat,
            lng: point.lon,
            altitudeFt: point.alt,
            groundSpeedKt: point.gspeed,
            trackDeg: point.track
          }))
          .sort((a, b) => a.t - b.t)
      })
      // A failure is not remembered: the next ask tries again, and what was already paid for stays held.
      track.catch(() => this.tracks.delete(flight.fr24_id))
      this.tracks.set(flight.fr24_id, track)
    }
    return track
  }

  private async get<T>(token: string, path: string): Promise<T> {
    await this.paced()
    const response = await this.fetchImpl(`${Flightradar24Provider.API}${path}`, {
      headers: { Accept: "application/json", "Accept-Version": "v1", Authorization: `Bearer ${token}` }
    })
    if (!response.ok) throw new Fr24Refusal(Flightradar24Provider.problemOf(response.status))
    return await response.json() as T
  }

  private static problemOf(status: number): AircraftProblem {
    switch (status) {
      case 401:
        return "credential"
      case 402:
        return "credits"
      case 429:
        return "rate"
      // Among what it refuses is a date older than the plan's history.
      case 400:
      case 403:
      case 404:
        return "refused"
      default:
        return "network"
    }
  }

  /** Waits for a request to be allowed by the cheapest plan's rate, so that a second question soon after the first is late rather than refused. */
  private async paced(): Promise<void> {
    for (;;) {
      const now = Date.now()
      while (this.requestTimes.length > 0 && now - this.requestTimes[0] >= 60_000) this.requestTimes.shift()
      if (this.requestTimes.length < this.requestsPerMinute) {
        this.requestTimes.push(now)
        return
      }
      await new Promise(resolve => setTimeout(resolve, 60_000 - (now - this.requestTimes[0]) + 50))
    }
  }
}
