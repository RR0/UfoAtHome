import * as Astronomy from "astronomy-engine"
import { describe, expect, it } from "vitest"
import { Novae } from "../../../src/engine/astronomy/Novae.js"
import { STELLAR_OUTBURSTS } from "../../../src/engine/astronomy/novaCatalog.js"

const PARIS = { lat: 48.8566, lng: 2.3522, elevationM: 35 }

/** The catalog's own entry, failing loudly rather than testing undefined. */
function outburst(id: string) {
  const found = Novae.byId(id)
  if (!found) throw new Error(`${id} is not in the catalog`)
  return found
}

/** The Julian day at noon UT of a date in the Julian calendar — the calendar the chronicles and
 * Tycho kept. Written out here rather than borrowed from the build script, so that a mistake there
 * cannot pass for correct here. */
function julianCalendarNoon(year: number, month: number, day: number): number {
  const y = month <= 2 ? year - 1 : year
  const m = month <= 2 ? month + 12 : month
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day - 1524
}

describe("the catalog", () => {
  it("is well-formed: unique ids, time-ordered curves starting at their first point, the peak on the curve", () => {
    expect(new Set(STELLAR_OUTBURSTS.map(entry => entry.id)).size).toBe(STELLAR_OUTBURSTS.length)
    for (const entry of STELLAR_OUTBURSTS) {
      expect(entry.lightCurve[0][0], entry.id).toBe(0)
      for (let i = 1; i < entry.lightCurve.length; i++) expect(entry.lightCurve[i][0], entry.id).toBeGreaterThan(entry.lightCurve[i - 1][0])
      expect(Math.min(...entry.lightCurve.map(([, magnitude]) => magnitude)), entry.id).toBe(entry.peakMagnitude)
      expect(entry.decDeg).toBeGreaterThanOrEqual(-90)
      expect(entry.raHours).toBeLessThan(24)
    }
  })

  it("reads a Julian-calendar record ten days behind the Gregorian one, as it was by 1582", () => {
    // Tycho's first dated sighting, 11 November 1572 in the calendar he used.
    expect(outburst("sn-1572").startJd).toBe(julianCalendarNoon(1572, 11, 11))
    // The reform itself: Thursday 4 October 1582 (Julian) was followed by Friday 15 October (Gregorian).
    expect(julianCalendarNoon(1582, 10, 4) + 1).toBe(Novae.julianDayOf(new Date(Date.UTC(1582, 9, 15, 12))))
  })
})

describe("the light curve", () => {
  it("dates an instant on the same Julian day astronomy-engine does", () => {
    const date = new Date("1918-06-09T22:00:00Z")
    expect(Novae.julianDayOf(date)).toBeCloseTo(2451545 + Astronomy.MakeTime(date).ut, 6)
  })

  it("puts V603 Aql at its measured peak, as bright as Vega, on 10 June 1918", () => {
    const magnitude = Novae.magnitudeAt(outburst("v603-aql-1918"), 2421755)
    expect(magnitude).toBeDefined()
    expect(magnitude!).toBeLessThan(0)
  })

  it("says nothing before the first record: SN 1572 was looked for on 2 November 1572 and not there", () => {
    expect(Novae.magnitudeAt(outburst("sn-1572"), julianCalendarNoon(1572, 11, 2))).toBeUndefined()
    // A day before V603 Aql's first binned observation, the star was already rising; nobody measured it.
    const v603 = outburst("v603-aql-1918")
    expect(Novae.magnitudeAt(v603, v603.startJd - 1)).toBeUndefined()
  })

  it("says nothing after the last one either", () => {
    const sn1604 = outburst("sn-1604")
    const lastDays = sn1604.lightCurve[sn1604.lightCurve.length - 1][0]
    expect(Novae.magnitudeAt(sn1604, sn1604.startJd + lastDays + 30)).toBeUndefined()
  })

  it("keeps DQ Her's dust dip — the thing no decline formula would draw", () => {
    const dqHer = outburst("dq-her-1934")
    expect(Novae.magnitudeAt(dqHer, dqHer.startJd + 105)!).toBeLessThan(5)
    expect(Novae.magnitudeAt(dqHer, dqHer.startJd + 140)!).toBeGreaterThan(12)
  })

  it("agrees with the chronicles it was not built from", () => {
    // SN 1006 was seen by day: brighter than a daylit sky lets through (-4) for its first weeks.
    const sn1006 = outburst("sn-1006")
    expect(Novae.magnitudeAt(sn1006, sn1006.startJd + 20)!).toBeLessThan(-4)
    // Kepler was still estimating his star in October 1605, a year after it appeared.
    const sn1604 = outburst("sn-1604")
    expect(Novae.magnitudeAt(sn1604, Novae.julianDayOf(new Date(Date.UTC(1605, 9, 1, 12))))!).toBeLessThan(6)
    // SN 1987A was a naked-eye object for months, peaking near magnitude 3 in May 1987.
    const may = Novae.magnitudeAt(outburst("sn-1987a"), Novae.julianDayOf(new Date("1987-05-20T12:00:00Z")))!
    expect(may).toBeGreaterThan(2.5)
    expect(may).toBeLessThan(3.5)
  })

  it("puts V1369 Cen near 3.5 at its flare of mid-December 2013, and fading past 5.5 by 22 January", () => {
    const cen = outburst("v1369-cen-2013")
    expect(Novae.magnitudeAt(cen, Novae.julianDayOf(new Date("2013-12-13T04:00:00Z")))!).toBeLessThan(3.8)
    expect(Novae.magnitudeAt(cen, Novae.julianDayOf(new Date("2014-01-22T12:00:00Z")))!).toBeGreaterThan(5.5)
    // Only what the figure shows: nothing past its 55th day.
    expect(Novae.magnitudeAt(cen, Novae.julianDayOf(new Date("2014-02-10T00:00:00Z")))).toBeUndefined()
  })

  it("interpolates in magnitude, between two points and exactly through them", () => {
    const sn1054 = outburst("sn-1054")
    const [[, first], [secondDays, second]] = sn1054.lightCurve
    expect(Novae.magnitudeAt(sn1054, sn1054.startJd)).toBe(first)
    expect(Novae.magnitudeAt(sn1054, sn1054.startJd + secondDays)).toBe(second)
    expect(Novae.magnitudeAt(sn1054, sn1054.startJd + secondDays / 2)).toBeCloseTo((first + second) / 2, 9)
  })
})

describe("in the observer's sky", () => {
  it("has nothing at all in almost every night: none in the spring of 1950", () => {
    expect(Novae.aroundDate(new Date("1950-04-01T21:00:00Z"))).toEqual([])
  })

  it("puts SN 1006 in the sky of its own year, precessed, where astronomy-engine's star path puts it", () => {
    const sn1006 = outburst("sn-1006")
    const date = new Date(Date.UTC(1006, 4, 7, 22, 0))
    const cairo = { lat: 30.04, lng: 31.24, elevationM: 20 }
    const appearance = Novae.appearancesAt(date, cairo).find(entry => entry.outburst.id === "sn-1006")!
    Astronomy.DefineStar(Astronomy.Body.Star1, sn1006.raHours, sn1006.decDeg, 7000)
    const observer = new Astronomy.Observer(cairo.lat, cairo.lng, cairo.elevationM)
    const equator = Astronomy.Equator(Astronomy.Body.Star1, date, observer, true, true)
    const expected = Astronomy.Horizon(date, observer, equator.ra, equator.dec, "normal")
    expect(appearance.position.altitudeDeg).toBeCloseTo(expected.altitude, 1)
    expect(appearance.position.azimuthDeg).toBeCloseTo(expected.azimuth, 1)
  })

  it("keeps SN 1987A below a Parisian horizon all night — too far south to rise there", () => {
    for (let hour = 0; hour < 24; hour += 2) {
      const [appearance] = Novae.appearancesAt(new Date(Date.UTC(1987, 4, 20, hour)), PARIS)
      expect(appearance.outburst.id).toBe("sn-1987a")
      expect(appearance.position.altitudeDeg).toBeLessThan(0)
    }
  })

  it("lists both when two overlap, brightest first — HR Del still up when LV Vul peaked in April 1968", () => {
    const date = new Date("1968-04-18T00:00:00Z")
    const ids = Novae.appearancesAt(date, PARIS).map(entry => entry.outburst.id)
    expect(ids).toContain("hr-del-1967")
    expect(ids).toContain("lv-vul-1968")
    const all = Novae.appearancesAt(date, PARIS)
    expect(Novae.brightestAt(date, PARIS)!.magnitude).toBe(Math.min(...all.map(entry => entry.magnitude)))
    expect(all[0].magnitude).toBeLessThanOrEqual(all[1].magnitude)
  })
})
