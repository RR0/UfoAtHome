import { describe, expect, it } from "vitest"
import { KeplerOrbit } from "../../../src/engine/astronomy/Orbit.js"
import { BRIGHT_COMETS } from "../../../src/engine/astronomy/cometCatalog.js"

/**
 * Where each comet really was, straight from JPL Horizons — heliocentric ecliptic J2000 position
 * vectors in astronomical units, ten days apart across the months either side of perihelion,
 * computed by the same numerical integration the elements in the catalog were taken from.
 *
 * This is the only thing in this suite that can tell a working Kepler solver from a broken one.
 * A solver that agrees with itself proves nothing; agreeing with an independent integration of the
 * real, perturbed orbit is the whole test. The four apparitions between them cover every conic the
 * universal formulation exists to handle at once: Halley's ordinary ellipse, Hale-Bopp's e=0.9951,
 * NEOWISE at 0.9992, and Ikeya-Seki grazing the Sun at 0.99991 with a perihelion of eight
 * thousandths of an astronomical unit.
 */
const HORIZONS_POSITIONS: { id: string; rows: { julianDay: number; x: number; y: number; z: number }[] }[] = [
  {
    id: "hale-bopp-1997",
    rows: [
      { julianDay: 2450449.500000000, x: 2.887621338606226E-01, y: -1.250720433245530E+00, z: 1.193607786641625E+00 },
      { julianDay: 2450459.500000000, x: 2.485352348562040E-01, y: -1.068495213488630E+00, z: 1.200874157516668E+00 },
      { julianDay: 2450469.500000000, x: 2.066016774467400E-01, y: -8.789338259746421E-01, z: 1.199837878131587E+00 },
      { julianDay: 2450479.500000000, x: 1.628681979220739E-01, y: -6.817180411863213E-01, z: 1.188258419097297E+00 },
      { julianDay: 2450489.500000000, x: 1.173109087648514E-01, y: -4.768745087652641E-01, z: 1.163219322493988E+00 },
      { julianDay: 2450499.500000000, x: 7.005105288986528E-02, y: -2.651225190683735E-01, z: 1.121013913199182E+00 },
      { julianDay: 2450509.500000000, x: 2.147902948851548E-02, y: -4.843243697223655E-02, z: 1.057197036692827E+00 },
      { julianDay: 2450519.500000000, x: -2.757935437952493E-02, y: 1.692453351244582E-01, z: 9.670797691461991E-01 },
      { julianDay: 2450529.500000000, x: -7.573209629714996E-02, y: 3.814482159060922E-01, z: 8.470150970892021E-01 },
      { julianDay: 2450539.500000000, x: -1.211145519395796E-01, y: 5.797167706630595E-01, z: 6.963988258047201E-01 },
      { julianDay: 2450549.500000000, x: -1.618647081416005E-01, y: 7.558120786265099E-01, z: 5.191498889914945E-01 },
      { julianDay: 2450559.500000000, x: -1.967674276644205E-01, y: 9.045934178613588E-01, z: 3.229466897723133E-01 },
      { julianDay: 2450569.500000000, x: -2.255564120329726E-01, y: 1.025255915176176E+00, z: 1.164556150517479E-01 },
      { julianDay: 2450579.500000000, x: -2.487077508341471E-01, y: 1.120281803679569E+00, z: -9.317210965488225E-02 },
      { julianDay: 2450589.500000000, x: -2.670383998798900E-01, y: 1.193584817308512E+00, z: -3.011673481163273E-01 },
      { julianDay: 2450599.500000000, x: -2.814060056605394E-01, y: 1.249167676649960E+00, z: -5.048178753482104E-01 },
      { julianDay: 2450609.500000000, x: -2.925684381381894E-01, y: 1.290517675826131E+00, z: -7.028064603276486E-01 },
      { julianDay: 2450619.500000000, x: -3.011464835591194E-01, y: 1.320464054636839E+00, z: -8.946486876707943E-01 },
      { julianDay: 2450629.500000000, x: -3.076321797737672E-01, y: 1.341232916168916E+00, z: -1.080318988705510E+00 }
    ]
  },
  {
    id: "ikeya-seki-1965",
    rows: [
      { julianDay: 2439034.500000000, x: 8.276493016599957E-03, y: 6.403263546959693E-01, z: -4.912933170096914E-01 },
      { julianDay: 2439044.500000000, x: 3.107943844555199E-02, y: 4.007995156658424E-01, z: -3.120911499272192E-01 },
      { julianDay: 2439054.500000000, x: 2.283840519491278E-02, y: 1.292196653956942E-02, z: -1.391992254392447E-02 },
      { julianDay: 2439064.500000000, x: -2.079510942523356E-01, y: 3.750159486937729E-01, z: -2.501366521443043E-01 },
      { julianDay: 2439074.500000000, x: -2.953983928365561E-01, y: 6.123871797066647E-01, z: -4.162688760664505E-01 }
    ]
  },
  {
    id: "halley-1910",
    rows: [
      { julianDay: 2418762.500000000, x: 6.932013620975284E-01, y: -9.393373863624122E-03, z: 1.912488030378815E-01 },
      { julianDay: 2418772.500000000, x: 5.327595667680670E-01, y: -2.569314952253756E-01, z: 1.887537185057124E-01 },
      { julianDay: 2418782.500000000, x: 3.092536813253211E-01, y: -4.719671531985284E-01, z: 1.635659102751219E-01 },
      { julianDay: 2418792.500000000, x: 4.240916308447436E-02, y: -6.212745937152727E-01, z: 1.155250464007684E-01 },
      { julianDay: 2418802.500000000, x: -2.311588988745966E-01, y: -7.002994053205890E-01, z: 5.388701825209702E-02 },
      { julianDay: 2418812.500000000, x: -4.892623370050971E-01, y: -7.278065391328135E-01, z: -1.213714211764334E-02 },
      { julianDay: 2418822.500000000, x: -7.263908184052021E-01, y: -7.227776768008822E-01, z: -7.786419736517659E-02 },
      { julianDay: 2418832.500000000, x: -9.438050377292619E-01, y: -6.976284396529295E-01, z: -1.415622319083361E-01 },
      { julianDay: 2418842.500000000, x: -1.144295306379606E+00, y: -6.597459181696691E-01, z: -2.027589811341960E-01 },
      { julianDay: 2418852.500000000, x: -1.330557081243526E+00, y: -6.135481449599983E-01, z: -2.614529252319572E-01 }
    ]
  },
  {
    id: "neowise-2020",
    rows: [
      { julianDay: 2459015.500000000, x: -1.068709762235854E-01, y: 4.611294459693448E-01, z: -3.922959716125743E-01 },
      { julianDay: 2459025.500000000, x: 8.762164328884561E-02, y: 3.669843181556423E-01, z: -1.252701108023984E-01 },
      { julianDay: 2459035.500000000, x: 2.181022074784988E-01, y: 1.036513089939649E-01, z: 1.739413794397887E-01 },
      { julianDay: 2459045.500000000, x: 1.605728305076491E-01, y: -2.622796651365863E-01, z: 3.311571730238352E-01 },
      { julianDay: 2459055.500000000, x: 3.527137449656706E-02, y: -5.594349262489944E-01, z: 3.737496797759451E-01 },
      { julianDay: 2459065.500000000, x: -9.624809481889793E-02, y: -8.012608124010473E-01, z: 3.764219602296340E-01 },
      { julianDay: 2459075.500000000, x: -2.241971489646954E-01, y: -1.008716303629294E+00, z: 3.623426801668719E-01 }
    ]
  }
]

/** How far a two-body propagation is allowed to stray, in astronomical units. Two hundredths of a
 * milli-au is about a thousandth of a degree seen from one au away — far under the width of a
 * comet's own coma, and under everything else in this scene's error budget. */
const TOLERANCE_AU = 2e-5

describe("KeplerOrbit", () => {
  for (const reference of HORIZONS_POSITIONS) {
    it(`follows the real orbit of ${reference.id}`, () => {
      const apparition = BRIGHT_COMETS.find(comet => comet.id === reference.id)!
      const orbit = new KeplerOrbit(apparition.orbit)
      for (const row of reference.rows) {
        const position = orbit.positionAt(row.julianDay)
        expect(Math.hypot(position.x - row.x, position.y - row.y, position.z - row.z)).toBeLessThan(TOLERANCE_AU)
      }
    })
  }

  it("puts the comet at its perihelion distance, at perihelion", () => {
    // The starting state the whole propagation is built on: nothing else in this class is right if
    // this is not.
    for (const apparition of BRIGHT_COMETS) {
      const orbit = new KeplerOrbit(apparition.orbit)
      expect(orbit.heliocentricDistanceAt(apparition.orbit.perihelionJd)).toBeCloseTo(apparition.orbit.perihelionAu, 12)
    }
  })

  it("is symmetric about perihelion", () => {
    // A two-body orbit is time-reversible through its own perihelion, so the same number of days
    // before and after must put the comet the same distance out. This is what catches a sign error
    // in the universal anomaly, which the Horizons comparison above would also catch but only for
    // the four apparitions it covers.
    for (const apparition of BRIGHT_COMETS) {
      const orbit = new KeplerOrbit(apparition.orbit)
      for (const days of [0.5, 7, 60]) {
        const before = orbit.heliocentricDistanceAt(apparition.orbit.perihelionJd - days)
        const after = orbit.heliocentricDistanceAt(apparition.orbit.perihelionJd + days)
        expect(before).toBeCloseTo(after, 9)
      }
    }
  })

  it("returns an ellipse to where it started after one period", () => {
    // Only the elliptic orbits can be asked this, which is why it is worth asking: the universal
    // formulation has no separate elliptic branch to get right, so a period that does not close
    // would mean the Stumpff functions are wrong on the positive-z side.
    const halley = BRIGHT_COMETS.find(comet => comet.id === "halley-1986")!
    const orbit = new KeplerOrbit(halley.orbit)
    const semiMajorAxis = halley.orbit.perihelionAu / (1 - halley.orbit.eccentricity)
    const periodDays = (2 * Math.PI * Math.sqrt(semiMajorAxis ** 3)) / Math.sqrt(KeplerOrbit.SUN_GM_AU3_PER_DAY2)
    const start = orbit.positionAt(halley.orbit.perihelionJd + 1000)
    const later = orbit.positionAt(halley.orbit.perihelionJd + 1000 + periodDays)
    expect(Math.hypot(start.x - later.x, start.y - later.y, start.z - later.z)).toBeLessThan(1e-6)
  })

  describe("the Stumpff functions", () => {
    it("agrees with the closed forms away from zero, on both sides", () => {
      for (const z of [0.4, 3, 12, -0.4, -3, -12]) {
        const expectedC = z > 0 ? (1 - Math.cos(Math.sqrt(z))) / z : (Math.cosh(Math.sqrt(-z)) - 1) / -z
        const root = Math.sqrt(Math.abs(z))
        const expectedS = z > 0 ? (root - Math.sin(root)) / root ** 3 : (Math.sinh(root) - root) / root ** 3
        expect(KeplerOrbit.stumpffC(z)).toBeCloseTo(expectedC, 12)
        expect(KeplerOrbit.stumpffS(z)).toBeCloseTo(expectedS, 12)
      }
    })

    it("is continuous through the parabola, where the closed forms fall apart", () => {
      // Both must pass through the parabola's own 1/2 and 1/6, and must join the closed forms
      // smoothly on either side of it.
      expect(KeplerOrbit.stumpffC(0)).toBeCloseTo(0.5, 15)
      expect(KeplerOrbit.stumpffS(0)).toBeCloseTo(1 / 6, 15)
      for (const z of [-1e-5, -1e-7, 0, 1e-7, 1e-5]) {
        expect(KeplerOrbit.stumpffC(z)).toBeCloseTo(0.5, 6)
        expect(KeplerOrbit.stumpffS(z)).toBeCloseTo(1 / 6, 6)
      }
    })

    it("stays accurate where the closed forms have lost their significant digits", () => {
      // The reason the series branch exists, made to matter. At these arguments `1 - cos(sqrt(z))`
      // is a difference of two numbers that agree to fifteen places, so the closed form returns
      // whatever floating-point noise survives the subtraction — several digits out, and on some of
      // these arguments not even monotonic. Delete the series branch from Orbit.ts and this test
      // fails while every other one in this file still passes.
      for (const z of [1e-12, 1e-14, -1e-12, -1e-14]) {
        const closedFormC = z > 0 ? (1 - Math.cos(Math.sqrt(z))) / z : (Math.cosh(Math.sqrt(-z)) - 1) / -z
        expect(KeplerOrbit.stumpffC(z)).toBeCloseTo(0.5, 12)
        expect(Math.abs(closedFormC - 0.5)).toBeGreaterThan(1e-5)
      }
    })
  })
})
