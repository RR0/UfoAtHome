import { describe, expect, test } from "vitest"
import { Flightradar24Provider } from "../../../src/modules/providers/traffic/Flightradar24Provider.js"
import { AIRCRAFT_SOURCES } from "../../../src/modules/providers/traffic/aircraftSources.js"
import { SourceCredentials } from "../../../src/engine/source/SourceCredentials.js"

const PARIS = { lat: 48.85, lng: 2.35, heightM: 0 }
const START = Date.UTC(2026, 10, 1, 12, 0, 0)
const END = START + 10 * 60_000
const iso = (ms: number) => new Date(ms).toISOString().replace(".000", "")

/** A flight `km` east of Paris at the snapshot. */
const flight = (id: string, km: number, extra: object = {}) => ({
  fr24_id: id, lat: PARIS.lat, lon: PARIS.lng + km / 73, alt: 35000, hex: id.slice(0, 6).toUpperCase(), type: "A20N", reg: `F-${id}`, ...extra
})
const track = (points: object[]) => [{ fr24_id: "returned-id-is-not-trusted", tracks: points }]
const point = (ms: number, extra: object = {}) => ({ timestamp: iso(ms), lat: PARIS.lat, lon: PARIS.lng, alt: 35000, gspeed: 440, track: 90, source: "ADSB", ...extra })

function api(flights: object[] | (() => object[]), points: (id: string) => object[] = () => [point(START + 60_000), point(START + 90_000)], status = 200) {
  const calls: { url: URL; headers: Record<string, string> }[] = []
  const fetchImpl = (async (input: string, init: RequestInit) => {
    const url = new URL(input)
    calls.push({ url, headers: init.headers as Record<string, string> })
    if (status !== 200) return new Response("{}", { status })
    const body = url.pathname.endsWith("/flight-tracks") ? track(points(url.searchParams.get("flight_id")!)) : { data: typeof flights === "function" ? flights() : flights }
    return new Response(JSON.stringify(body), { status: 200 })
  }) as unknown as typeof fetch
  return { calls, fetchImpl }
}
const providerOf = (fetchImpl: typeof fetch, token: () => string | undefined = () => "secret") => new Flightradar24Provider({ token, fetchImpl, settleMs: 0, requestsPerMinute: Infinity })

describe("Flightradar24Provider", () => {
  test("without a key nothing is asked, and it says so", async () => {
    const { calls, fetchImpl } = api([])
    expect(await providerOf(fetchImpl, () => undefined).between(PARIS, START, END)).toEqual({ status: "failed", problem: "credential" })
    expect(calls).toEqual([])
  })

  test("asks the middle of the window, in the air only, with the key and the version the API requires", async () => {
    const { calls, fetchImpl } = api(Array.from({ length: 8 }, (_, i) => flight(`cc00${i}000`, i)))
    await providerOf(fetchImpl).between(PARIS, START, END)
    expect(calls.filter(call => call.url.pathname.endsWith("/flight-positions/full"))).toHaveLength(1)
    const { url, headers } = calls[0]
    expect(url.origin + url.pathname).toBe("https://fr24api.flightradar24.com/api/historic/flight-positions/full")
    expect(url.searchParams.get("timestamp")).toBe(String((START + END) / 2000))
    expect(url.searchParams.get("altitude_ranges")).toBe("1-60000")
    expect(url.searchParams.get("limit")).toBe("60")
    expect(headers).toMatchObject({ Authorization: "Bearer secret", "Accept-Version": "v1" })
    const [north, south, west, east] = url.searchParams.get("bounds")!.split(",").map(Number)
    expect(north).toBeGreaterThan(PARIS.lat)
    expect(south).toBeLessThan(PARIS.lat)
    expect(west).toBeLessThan(PARIS.lng)
    expect(east).toBeGreaterThan(PARIS.lng)
  })

  test("widens the radius only while it holds too few flights, and says the one it stopped at", async () => {
    const widths: number[] = []
    const { calls, fetchImpl } = api(() => {
      widths.push(widths.length)
      return widths.length === 1 ? [flight("aa000000", 1)] : Array.from({ length: 9 }, (_, i) => flight(`dd00${i}000`, i))
    })
    const answer = await providerOf(fetchImpl).between(PARIS, START, END)
    const snapshots = calls.filter(call => call.url.pathname.endsWith("/flight-positions/full"))
    const spans = snapshots.map(call => { const [north, south] = call.url.searchParams.get("bounds")!.split(",").map(Number); return Math.round((north - south) * 111.32 / 2) })
    expect(spans).toEqual([25, 50])
    expect(answer).toMatchObject({ status: "found", partial: { traced: 8, seen: 9, moreSeen: false, withinKm: 50 } })
  })

  test("goes as far as the question's radius and no further, and asks nothing more of a sky that is empty", async () => {
    const { calls, fetchImpl } = api([])
    const answer = await providerOf(fetchImpl).between(PARIS, START, END)
    expect(calls).toHaveLength(3)
    expect(answer).toMatchObject({ status: "found", tracks: [], creditsSpent: 3, partial: { seen: 0, withinKm: 100 } })
  })

  test("as many flights as the smallest plan returns may be a sample of more, and says so", async () => {
    const { fetchImpl } = api(Array.from({ length: 20 }, (_, i) => flight(`ee0${String(i).padStart(2, "0")}000`, i)))
    expect(await providerOf(fetchImpl).between(PARIS, START, END)).toMatchObject({ partial: { seen: 20, moreSeen: true, withinKm: 25 } })
  })

  test("traces only the nearest flights, says it, and counts what that cost", async () => {
    const flights = Array.from({ length: 12 }, (_, i) => flight(`aa00${String(i).padStart(2, "0")}00`, 90 - i))
    const { calls, fetchImpl } = api(flights)
    const answer = await providerOf(fetchImpl).between(PARIS, START, END)
    expect(answer.status).toBe("found")
    if (answer.status !== "found") return
    expect(answer.partial).toEqual({ traced: 8, seen: 12, moreSeen: false, withinKm: 25 })
    const asked = calls.filter(call => call.url.pathname.endsWith("/flight-tracks")).map(call => call.url.searchParams.get("flight_id"))
    expect(asked).toEqual(flights.slice(4).reverse().map(f => f.fr24_id))
    expect(answer.creditsSpent).toBe(12 * 8 + 8 * 40)
    expect(answer.tracks).toHaveLength(8)
  })

  test("reads a track in the project's terms, keeping to the window and the radius, without what the API only estimated or what stood on the ground", async () => {
    const { fetchImpl } = api([flight("abc12300", 5)], () => [
      point(START - 60_000),
      point(START + 30_000),
      point(START + 40_000, { source: "ESTIMATED" }),
      point(START + 45_000, { alt: 0 }),
      point(START + 50_000, { lon: PARIS.lng + 10 }),
      point(END + 60_000)
    ])
    const answer = await providerOf(fetchImpl).between(PARIS, START, END)
    if (answer.status !== "found") throw new Error(answer.status)
    expect(answer.tracks).toEqual([{
      icao: 0xabc123,
      nonIcao: false,
      points: [{ t: START + 30_000, lat: PARIS.lat, lng: PARIS.lng, altitudeFt: 35000, groundSpeedKt: 440, trackDeg: 90 }]
    }])
  })

  test("the hour the trails ask for costs nothing more, and what the aircraft is was already paid for", async () => {
    const { calls, fetchImpl } = api([flight("abc12300", 5)])
    const provider = providerOf(fetchImpl)
    const first = await provider.between(PARIS, START, END)
    const before = calls.length
    const trails = await provider.between(PARIS, START - 3_600_000, END)
    expect(calls).toHaveLength(before)
    if (first.status !== "found" || trails.status !== "found") throw new Error("not found")
    expect(trails.creditsSpent).toBe(first.creditsSpent)
    expect(await provider.describe(first.tracks[0])).toEqual({ type: "A20N", registration: "F-abc12300" })
    expect(calls).toHaveLength(before)
  })

  test("a flight that broadcasts no address is told by its flight's id, marked as not the airframe's", () => {
    expect(Flightradar24Provider.addressOf({ fr24_id: "39bebe6e", hex: null })).toEqual({ icao: 0x39bebe6e, nonIcao: true })
    expect(Flightradar24Provider.addressOf({ fr24_id: "39bebe6e", hex: "4CAD41" })).toEqual({ icao: 0x4cad41, nonIcao: false })
  })

  test("a question replaced while it waits is not paid for", async () => {
    const { calls, fetchImpl } = api([])
    const provider = new Flightradar24Provider({ token: () => "secret", fetchImpl, settleMs: 5 })
    const replaced = provider.between(PARIS, START, END)
    const latest = provider.between({ ...PARIS, lat: 52 }, START, END)
    expect(await replaced).toEqual({ status: "failed" })
    expect((await latest).status).toBe("found")
    expect(calls).toHaveLength(3)
    expect(calls[0].url.searchParams.get("bounds")).not.toContain("48.")
  })

  test.each([[401, "credential"], [402, "credits"], [429, "rate"], [403, "refused"], [500, "network"]])("an answer %i says %s, and is not remembered", async (status, problem) => {
    const refusing = api([], undefined, status)
    expect(await providerOf(refusing.fetchImpl).between(PARIS, START, END)).toMatchObject({ status: "failed", problem })
    const provider = providerOf(refusing.fetchImpl)
    await provider.between(PARIS, START, END)
    await provider.between(PARIS, START, END)
    expect(refusing.calls).toHaveLength(3)
  })

  test("a page stops asking once it has spent what it allows itself", async () => {
    // Other flights at each place: one already traced is not paid for twice.
    let snapshots = 0
    const { fetchImpl } = api(() => {
      snapshots++
      return Array.from({ length: 60 }, (_, i) => flight(`b${snapshots}00${String(i).padStart(2, "0")}00`, i))
    })
    const provider = providerOf(fetchImpl)
    const answers = []
    for (let i = 0; i < 7; i++) answers.push(await provider.between({ ...PARIS, lat: 40 + i }, START, END))
    expect(answers.at(-1)).toMatchObject({ status: "failed", problem: "budget" })
    expect(answers[0]).toMatchObject({ status: "found", partial: { traced: 8, seen: 60, moreSeen: true } })
  })

  test("keeps to the rate it was given: a request over it waits rather than being refused", async () => {
    const { calls, fetchImpl } = api([flight("abc12300", 5)])
    const provider = new Flightradar24Provider({ token: () => "secret", fetchImpl, settleMs: 0, requestsPerMinute: 1 })
    void provider.between(PARIS, START, END)
    await new Promise(resolve => setTimeout(resolve, 30))
    expect(calls).toHaveLength(1)
  })

  test("what was answered under one key is not kept for another: the sandbox's data is not the record's", async () => {
    const { calls, fetchImpl } = api([])
    let token = "sandbox"
    const provider = providerOf(fetchImpl, () => token)
    await provider.between(PARIS, START, END)
    token = "production"
    await provider.between(PARIS, START, END)
    expect(new Set(calls.map(call => call.headers.Authorization))).toEqual(new Set(["Bearer sandbox", "Bearer production"]))
  })

  test("its date range is known without asking", () => {
    const provider = providerOf(api([]).fetchImpl)
    expect(provider.mayCover(Date.UTC(1965, 6, 1))).toBe(false)
    expect(provider.mayCover(Date.UTC(2020, 0, 1))).toBe(true)
    expect(provider.mayCover(Date.now() + 3_600_000)).toBe(false)
  })
})

describe("its source", () => {
  const source = AIRCRAFT_SOURCES.find(candidate => candidate.id === "flightradar24")!

  test("is not the default, and tells where a key is had", () => {
    expect(AIRCRAFT_SOURCES[0].id).toBe("adsb-lol")
    expect(source.keyUrl).toMatch(/^https:\/\/fr24api\.flightradar24\.com\//)
  })

  test("says what it cannot hold, and that a key is missing, without any request", async () => {
    SourceCredentials.forget()
    const provider = source.create()
    expect(provider.mayCover?.(Date.UTC(1965, 6, 1))).toBe(false)
    expect(await provider.between(PARIS, START, END)).toEqual({ status: "failed", problem: "credential" })
  })
})
