import { describe, expect, it } from "vitest"
import * as Astronomy from "astronomy-engine"
import { Comets } from "../../../src/engine/astronomy/Comets.js"
import { BRIGHT_COMETS } from "../../../src/engine/astronomy/cometCatalog.js"

/** Paris — a real place, and the one every other astronomy test in this suite could be checked
 * against. Nothing about the comparison depends on which place it is; it only has to be the same
 * place JPL was asked about. */
const PARIS = { lat: 48.8566, lng: 2.3522, elevationM: 35 }

/**
 * What JPL Horizons says these comets did in that sky, asked for the same site.
 *
 * The whole point of the file. Every number below was computed by a numerical integration of the
 * real solar system, by somebody else, and none of it can be reproduced by a mistake this code
 * also makes. Altitudes are AIRLESS, which is Horizons' default and is why the assertions below
 * take the refraction back out of ours before comparing.
 */
/**
 * How far the reconstruction may sit from Horizons, in degrees.
 *
 * A fifth of the Moon's own width, and four of the five apparitions below stay inside a hundredth
 * of it. The one that does not is Hyakutake, off by six hundredths: it passed 0.10 au from the
 * Earth, and the Earth's own pull on it over the five weeks between this date and the perihelion
 * the elements osculate at is precisely what a two-body propagation cannot carry. The error is
 * therefore largest for the comet that came closest, which is the shape one should expect, and it
 * is still an order of magnitude under the comet's own coma.
 */
const POSITION_TOLERANCE_DEG = 0.1

const HORIZONS_APPEARANCES: {
  id: string
  rows: { on: string; azimuthDeg: number; airlessAltitudeDeg: number; heliocentricDistanceAu: number; earthDistanceAu: number; elongationDeg: number }[]
}[] = [
  {
    id: "hale-bopp-1997",
    rows: [
      { on: "1997-03-28T00:00:00Z", azimuthDeg: 353.358220, airlessAltitudeDeg: 4.810441, heliocentricDistanceAu: 0.917182596620, earthDistanceAu: 1.32737658315242, elongationDeg: 43.6616 },
      { on: "1997-03-29T00:00:00Z", azimuthDeg: 352.313635, airlessAltitudeDeg: 4.744556, heliocentricDistanceAu: 0.915904448104, earthDistanceAu: 1.33214960406819, elongationDeg: 43.4063 },
      { on: "1997-03-30T00:00:00Z", azimuthDeg: 351.284096, airlessAltitudeDeg: 4.640824, heliocentricDistanceAu: 0.914975934331, earthDistanceAu: 1.33767533660369, elongationDeg: 43.1419 },
      { on: "1997-03-31T00:00:00Z", azimuthDeg: 350.272266, airlessAltitudeDeg: 4.500071, heliocentricDistanceAu: 0.914398474365, earthDistanceAu: 1.34393589120104, elongationDeg: 42.8688 },
      { on: "1997-04-01T00:00:00Z", azimuthDeg: 349.280634, airlessAltitudeDeg: 4.323285, heliocentricDistanceAu: 0.914172952478, earthDistanceAu: 1.35091162325917, elongationDeg: 42.5873 },
      { on: "1997-04-02T00:00:00Z", azimuthDeg: 348.311504, airlessAltitudeDeg: 4.111599, heliocentricDistanceAu: 0.914299712236, earthDistanceAu: 1.35858129691589, elongationDeg: 42.2978 },
      { on: "1997-04-03T00:00:00Z", azimuthDeg: 347.366979, airlessAltitudeDeg: 3.866267, heliocentricDistanceAu: 0.914778554194, earthDistanceAu: 1.36692225977730, elongationDeg: 42.0005 },
      { on: "1997-04-04T00:00:00Z", azimuthDeg: 346.448954, airlessAltitudeDeg: 3.588652, heliocentricDistanceAu: 0.915608737248, earthDistanceAu: 1.37591062795345, elongationDeg: 41.6959 }
    ]
  },
  {
    id: "hyakutake-1996",
    rows: [
      { on: "1996-03-23T00:00:00Z", azimuthDeg: 116.308886, airlessAltitudeDeg: 49.823640, heliocentricDistanceAu: 1.089859585572, earthDistanceAu: 0.12687410536897, elongationDeg: 134.7350 },
      { on: "1996-03-24T00:00:00Z", azimuthDeg: 100.716368, airlessAltitudeDeg: 60.747796, heliocentricDistanceAu: 1.069092408196, earthDistanceAu: 0.11032186257716, elongationDeg: 128.3721 },
      { on: "1996-03-25T00:00:00Z", azimuthDeg: 63.361822, airlessAltitudeDeg: 68.630561, heliocentricDistanceAu: 1.048178780058, earthDistanceAu: 0.10216380479681, elongationDeg: 117.3021 },
      { on: "1996-03-26T00:00:00Z", azimuthDeg: 18.072178, airlessAltitudeDeg: 63.762213, heliocentricDistanceAu: 1.027115339419, earthDistanceAu: 0.10435238711796, elongationDeg: 103.5432 },
      { on: "1996-03-27T00:00:00Z", azimuthDeg: 356.875395, airlessAltitudeDeg: 52.007340, heliocentricDistanceAu: 1.005898324637, earthDistanceAu: 0.11627518915542, elongationDeg: 90.6024 },
      { on: "1996-03-28T00:00:00Z", azimuthDeg: 347.895083, airlessAltitudeDeg: 41.247103, heliocentricDistanceAu: 0.984523629749, earthDistanceAu: 0.13536054905966, elongationDeg: 80.3146 }
    ]
  },
  {
    id: "ikeya-seki-1965",
    rows: [
      { on: "1965-10-29T00:00:00Z", azimuthDeg: 48.606535, airlessAltitudeDeg: -48.917509, heliocentricDistanceAu: 0.425246464418, earthDistanceAu: 1.04677673939510, elongationDeg: 23.8768 },
      { on: "1965-10-30T00:00:00Z", azimuthDeg: 51.859176, airlessAltitudeDeg: -48.383034, heliocentricDistanceAu: 0.461418595197, earthDistanceAu: 1.04815886005753, elongationDeg: 25.9485 },
      { on: "1965-10-31T00:00:00Z", azimuthDeg: 54.957280, airlessAltitudeDeg: -47.809762, heliocentricDistanceAu: 0.496243326819, earthDistanceAu: 1.04935542603329, elongationDeg: 27.9511 },
      { on: "1965-11-01T00:00:00Z", azimuthDeg: 57.918606, airlessAltitudeDeg: -47.201808, heliocentricDistanceAu: 0.529901036334, earthDistanceAu: 1.05037692784730, elongationDeg: 29.8954 },
      { on: "1965-11-02T00:00:00Z", azimuthDeg: 60.757693, airlessAltitudeDeg: -46.562677, heliocentricDistanceAu: 0.562533648618, earthDistanceAu: 1.05123246836268, elongationDeg: 31.7900 }
    ]
  },
  {
    id: "halley-1910",
    rows: [
      { on: "1910-05-18T00:00:00Z", azimuthDeg: 17.363661, airlessAltitudeDeg: -21.242309, heliocentricDistanceAu: 0.833774259911, earthDistanceAu: 0.18363555461426, elongationDeg: 13.0427 },
      { on: "1910-05-19T00:00:00Z", azimuthDeg: 5.649639, airlessAltitudeDeg: -21.502286, heliocentricDistanceAu: 0.848054153476, earthDistanceAu: 0.16392266340991, elongationDeg: 2.1542 },
      { on: "1910-05-20T00:00:00Z", azimuthDeg: 351.361360, airlessAltitudeDeg: -20.887401, heliocentricDistanceAu: 0.862482500115, earthDistanceAu: 0.15294936205264, elongationDeg: 11.1581 },
      { on: "1910-05-21T00:00:00Z", azimuthDeg: 336.148518, airlessAltitudeDeg: -19.082723, heliocentricDistanceAu: 0.877045109770, earthDistanceAu: 0.15255985880284, elongationDeg: 25.5432 },
      { on: "1910-05-22T00:00:00Z", azimuthDeg: 322.307909, airlessAltitudeDeg: -16.459667, heliocentricDistanceAu: 0.891728945831, earthDistanceAu: 0.16277250944341, elongationDeg: 38.9576 },
      { on: "1910-05-23T00:00:00Z", azimuthDeg: 311.189680, airlessAltitudeDeg: -13.769533, heliocentricDistanceAu: 0.906522074178, earthDistanceAu: 0.18175161907105, elongationDeg: 50.0001 }
    ]
  },
  {
    id: "neowise-2020",
    rows: [
      { on: "2020-07-08T00:00:00Z", azimuthDeg: 10.992826, airlessAltitudeDeg: -2.976645, heliocentricDistanceAu: 0.324343612494, earthDistanceAu: 0.99966372204410, elongationDeg: 18.4880 },
      { on: "2020-07-09T00:00:00Z", azimuthDeg: 10.079859, airlessAltitudeDeg: -1.529314, heliocentricDistanceAu: 0.338349399195, earthDistanceAu: 0.96455592764346, elongationDeg: 19.4357 },
      { on: "2020-07-10T00:00:00Z", azimuthDeg: 8.944699, airlessAltitudeDeg: -0.150615, heliocentricDistanceAu: 0.354273526792, earthDistanceAu: 0.93056085510251, elongationDeg: 20.3500 },
      { on: "2020-07-11T00:00:00Z", azimuthDeg: 7.586054, airlessAltitudeDeg: 1.152386, heliocentricDistanceAu: 0.371764139073, earthDistanceAu: 0.89800496116650, elongationDeg: 21.2490 },
      { on: "2020-07-12T00:00:00Z", azimuthDeg: 6.003812, airlessAltitudeDeg: 2.372836, heliocentricDistanceAu: 0.390510352488, earthDistanceAu: 0.86716723303339, elongationDeg: 22.1538 }
    ]
  }
]

describe("Comets", () => {
  describe("against JPL Horizons", () => {
    for (const reference of HORIZONS_APPEARANCES) {
      it(`puts ${reference.id} where it really was in the sky over Paris`, () => {
        const apparition = BRIGHT_COMETS.find(comet => comet.id === reference.id)!
        for (const row of reference.rows) {
          const appearance = Comets.appearanceOf(apparition, new Date(row.on), PARIS)
          // Ours carries astronomy-engine's own refraction, the same one every other body in this
          // scene is placed through; Horizons' is airless. Inverting it is exact, and comparing
          // without doing so would measure the refraction model rather than the ephemeris.
          const airless =
            appearance.position.altitudeDeg + Astronomy.InverseRefraction("normal", appearance.position.altitudeDeg)
          expect(Math.abs(airless - row.airlessAltitudeDeg)).toBeLessThan(POSITION_TOLERANCE_DEG)
          const azimuthApart = Math.abs(((appearance.position.azimuthDeg - row.azimuthDeg + 540) % 360) - 180)
          expect(azimuthApart).toBeLessThan(POSITION_TOLERANCE_DEG)
          expect(Math.abs(appearance.elongationDeg - row.elongationDeg)).toBeLessThan(POSITION_TOLERANCE_DEG)
          expect(appearance.earthDistanceAu).toBeCloseTo(row.earthDistanceAu, 3)
          expect(appearance.heliocentricDistanceAu).toBeCloseTo(row.heliocentricDistanceAu, 3)
        }
      })
    }
  })

  it("reproduces the magnitude somebody recorded, on the night they recorded it", () => {
    // What the whole light curve is anchored on. If this drifts, the catalog was regenerated with a
    // different model and every magnitude it states has quietly moved.
    for (const apparition of BRIGHT_COMETS) {
      const appearance = Comets.appearanceOf(apparition, new Date(`${apparition.peakOn}T00:00:00Z`), PARIS)
      expect(appearance.magnitude).toBeCloseTo(apparition.peakMagnitude, 1)
    }
  })

  it("never claims a comet was brighter than anybody recorded it", () => {
    // The cap, and the reason for it: the light curve extrapolates a sungrazer to magnitude -15 a
    // few hours from a perihelion nobody on the ground could look at. Ikeya-Seki was recorded at
    // -10, and -10 is what this may say.
    const ikeyaSeki = BRIGHT_COMETS.find(comet => comet.id === "ikeya-seki-1965")!
    const atPerihelion = Comets.magnitudeAt(ikeyaSeki, ikeyaSeki.orbit.perihelionAu, 1)
    expect(atPerihelion).toBe(ikeyaSeki.peakMagnitude)
  })

  it("says nothing at all outside an apparition's own window", () => {
    // The negative statement, and the honest one: this catalog knows about the months around a
    // perihelion and nothing else. A date in an ordinary year has no comet in it, which is the
    // usual answer.
    expect(Comets.aroundDate(new Date("1963-06-15T22:00:00Z"))).toHaveLength(0)
    expect(Comets.brightestAt(new Date("1963-06-15T22:00:00Z"), PARIS)).toBeUndefined()
  })

  it("finds the two comets that shared 1957, and picks the brighter one", () => {
    // Arend-Roland peaked in April and Mrkos in August, so no single night has both at their best —
    // but the windows are 200 days wide and they overlap through the summer.
    const summer = Comets.aroundDate(new Date("1957-06-20T22:00:00Z")).map(comet => comet.id)
    expect(summer).toContain("arend-roland-1957")
    expect(summer).toContain("mrkos-1957")
    const inApril = Comets.brightestAt(new Date("1957-04-25T21:00:00Z"), PARIS)
    expect(inApril?.apparition.id).toBe("arend-roland-1957")
  })

  it("shortens a tail that points away from the observer instead of across their sky", () => {
    // The reason a tail is stored as a length in space and projected, rather than as the angle
    // somebody measured. Hale-Bopp's own tail was the same physical thing all spring; how much sky
    // it covered was a question of where the Earth stood.
    const haleBopp = BRIGHT_COMETS.find(comet => comet.id === "hale-bopp-1997")!
    const lengths = ["1997-02-15", "1997-04-01", "1997-05-15"].map(
      on => Comets.appearanceOf(haleBopp, new Date(`${on}T21:00:00Z`), PARIS).tailLengthDeg!
    )
    for (const length of lengths) expect(length).toBeGreaterThan(0)
    // Longest around the recorded peak, since that is the geometry the stored length was fitted at.
    expect(lengths[1]).toBeGreaterThan(lengths[0])
    expect(lengths[1]).toBeGreaterThan(lengths[2])
  })

  it("draws no tail at all for an apparition with no recorded tail length", () => {
    // Half the catalog. Drawing a plausible-looking tail on a comet nobody measured one for would
    // be the reconstruction inventing evidence.
    const bennett = BRIGHT_COMETS.find(comet => comet.id === "bennett-1970")!
    expect(bennett.tailLengthAu).toBeUndefined()
    const appearance = Comets.appearanceOf(bennett, new Date("1970-03-26T04:00:00Z"), PARIS)
    expect(appearance.tailEnd).toBeUndefined()
    expect(appearance.tailLengthDeg).toBeUndefined()
  })
})
