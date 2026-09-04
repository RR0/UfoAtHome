import * as Astronomy from "astronomy-engine"
import { describe, expect, it } from "vitest"
import { SkyFrames } from "../../../src/engine/astronomy/SkyFrames.js"
import { equatorialToHorizontal, type HorizontalPosition, type ObserverGeo } from "../../../src/engine/astronomy/CelestialPositions.js"
import { horizontalToCartesian } from "../../../src/render3d/skyColors.js"

/**
 * The point of these: the band is not placed star by star, it is a whole coordinate system turned
 * to face the witness. A rotation that is a degree out puts the Milky Way through the wrong
 * constellations, and nothing about the picture would say so — a glowing band across a night sky
 * looks equally plausible wherever it is. So the frame is checked against stars whose galactic
 * coordinates are published, END TO END: right ascension in, altitude and azimuth through the same
 * door the star field uses, out the other side as galactic longitude and latitude.
 */
const observer: ObserverGeo = { lat: 45, lng: 2, elevationM: 0 }

const directionOf = (position: HorizontalPosition): [number, number, number] => {
  const { x, y, z } = horizontalToCartesian(position.altitudeDeg, position.azimuthDeg, 1)
  return [x, y, z]
}
const dot = (a: [number, number, number], b: [number, number, number]): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

/** Where a star of that right ascension and declination falls in galactic coordinates, using the
 * frame exactly as the renderer builds it. */
function galacticOf(raHours: number, decDeg: number, date: Date): { l: number; b: number } {
  const axes = SkyFrames.galactic(date, observer)
  const centre = directionOf(axes.centre)
  const rotation = directionOf(axes.rotation)
  const pole = directionOf(axes.pole)
  const star = directionOf(equatorialToHorizontal(raHours, decDeg, date, observer, false))
  const b = (Math.asin(Math.max(-1, Math.min(1, dot(star, pole)))) * 180) / Math.PI
  const l = ((Math.atan2(dot(star, rotation), dot(star, centre)) * 180) / Math.PI + 360) % 360
  return { l, b }
}

describe("the galactic frame", () => {
  const date = new Date(Date.UTC(2000, 0, 1, 22, 0, 0))

  it("is a frame: its three axes are at right angles and of unit length", () => {
    const axes = SkyFrames.galactic(date, observer)
    const vectors = [directionOf(axes.centre), directionOf(axes.rotation), directionOf(axes.pole)]
    for (const vector of vectors) expect(dot(vector, vector)).toBeCloseTo(1, 6)
    expect(dot(vectors[0], vectors[1])).toBeCloseTo(0, 3)
    expect(dot(vectors[1], vectors[2])).toBeCloseTo(0, 3)
    expect(dot(vectors[0], vectors[2])).toBeCloseTo(0, 3)
  })

  it("puts Deneb where the catalogues put it: on the band, a couple of degrees above the plane", () => {
    const deneb = galacticOf(20.690528, 45.280339, date)
    expect(deneb.l).toBeCloseTo(84.28, 0)
    expect(deneb.b).toBeCloseTo(2, 0)
  })

  it("puts Vega well off the band, where a summer observer sees it", () => {
    const vega = galacticOf(18.615649, 38.783689, date)
    expect(vega.l).toBeCloseTo(67.45, 0)
    expect(vega.b).toBeCloseTo(19.24, 0)
  })

  it("puts Polaris a quarter of the way to the galactic pole", () => {
    const polaris = galacticOf(2.529750, 89.264109, date)
    expect(polaris.l).toBeCloseTo(123.28, 0)
    expect(polaris.b).toBeCloseTo(26.46, 0)
  })

  it("still does, at the date of a real sighting half a century before the catalogue's epoch", () => {
    // Precession moves both the star and the frame, and it moves them TOGETHER — which is the whole
    // reason both go through the same transform. A frame built by hand from J2000 constants and
    // applied to an of-date sky would have drifted the band by most of a degree here.
    const kennethArnold = new Date(Date.UTC(1947, 5, 24, 22, 0, 0))
    const deneb = galacticOf(20.690528, 45.280339, kennethArnold)
    expect(deneb.l).toBeCloseTo(84.28, 0)
    expect(deneb.b).toBeCloseTo(2, 0)
  })
})

describe("the ecliptic pole", () => {
  const date = new Date(Date.UTC(2000, 0, 1, 22, 0, 0))

  it("stands the obliquity of the Earth's axis away from the celestial pole", () => {
    const eclipticPole = directionOf(SkyFrames.eclipticPole(date, observer))
    const celestialPole = directionOf(equatorialToHorizontal(0, 90, date, observer, false))
    const apart = (Math.acos(Math.max(-1, Math.min(1, dot(eclipticPole, celestialPole)))) * 180) / Math.PI
    expect(apart).toBeCloseTo(23.44, 1)
  })

  it("is a quarter turn from the Sun, wherever the Sun is — which is what makes it an axis of the cloud", () => {
    for (const month of [0, 3, 6, 9]) {
      const when = new Date(Date.UTC(2000, month, 15, 12, 0, 0))
      const pole = directionOf(SkyFrames.eclipticPole(when, observer))
      // The Sun by its own real position, not by the ecliptic's definition, so this is a check and
      // not a tautology: the Sun is never more than a fraction of a degree off the plane whose pole
      // this is.
      const sun = directionOf(equatorialToHorizontal(...sunEquatorialAt(when), when, observer, false))
      expect(Math.abs(Math.asin(Math.max(-1, Math.min(1, dot(sun, pole))))) * 180 / Math.PI).toBeLessThan(1)
    }
  })
})

/** The Sun's own right ascension and declination, from the same ephemeris the scene uses. */
function sunEquatorialAt(date: Date): [number, number] {
  const equator = Astronomy.Equator(
    Astronomy.Body.Sun,
    date,
    new Astronomy.Observer(observer.lat, observer.lng, 0),
    true,
    true
  )
  return [equator.ra, equator.dec]
}
