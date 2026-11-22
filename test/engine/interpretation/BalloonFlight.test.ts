import { describe, expect, test } from "vitest"
import { BalloonFlight } from "../../../src/modules/interpretations/balloons/BalloonFlight.js"
import type { BalloonFlightJson, BalloonSample } from "../../../src/modules/interpretations/balloons/BalloonFlight.js"
import { BalloonTypes } from "../../../src/modules/interpretations/balloons/BalloonType.js"
import type { BalloonTypeId } from "../../../src/modules/interpretations/balloons/BalloonType.js"

const STILL = { horizontalMS: 0, verticalMS: 0, timescaleS: 30 }
const flight = (balloon: BalloonTypeId, more: Partial<BalloonFlightJson> = {}): BalloonFlightJson =>
  ({ id: "b", balloon, site: { eastM: 0, northM: 0 }, turbulence: STILL, ...more })
const at = (samples: BalloonSample[], s: number) => samples.find(sample => sample.t >= s * 1000) ?? samples[samples.length - 1]
const climbOver = (samples: BalloonSample[], fromS: number, untilS: number) => (at(samples, untilS).z - at(samples, fromS).z) / (untilS - fromS)

describe("BalloonFlight", () => {
  test("reads the standard atmosphere's pressure at the bounds of its layers", () => {
    expect(BalloonFlight.airAt(0).pressurePa).toBeCloseTo(101325, 0)
    expect(BalloonFlight.airAt(11000).pressurePa).toBeCloseTo(22700, -1)
    expect(BalloonFlight.airAt(20000).pressurePa).toBeCloseTo(5529, -1)
    expect(BalloonFlight.airAt(30000).pressurePa).toBeCloseTo(1197, -1)
    expect(BalloonFlight.airAt(25000).temperatureK).toBeCloseTo(221.55, 1)
    // The site's own air fades into the standard one by 11 km above it.
    expect(BalloonFlight.airAt(0, 10).temperatureK).toBeCloseTo(298.15, 2)
    expect(BalloonFlight.airAt(12000, 10).temperatureK).toBeCloseTo(216.65, 2)
  })

  test("lets a weather balloon climb at some 5 m/s and burst at 28 to 30 km, swelled to 6.1 m, an hour or so after it is let go", () => {
    const { samples, end } = BalloonFlight.trajectory(flight("weather"), { t: 0 })
    expect(end).toBe("burst")
    expect(climbOver(samples, 60, 600)).toBeGreaterThan(4.5)
    expect(climbOver(samples, 60, 600)).toBeLessThan(6.5)
    const last = samples[samples.length - 1]
    expect(last.z).toBeGreaterThan(27000)
    expect(last.z).toBeLessThan(31000)
    expect(last.widthM).toBeCloseTo(6.1, 1)
    expect(last.t / 1000).toBeGreaterThan(3000)
    expect(last.t / 1000).toBeLessThan(6000)
    // It swells as the air thins.
    expect(at(samples, 1800).widthM).toBeGreaterThan(samples[0].widthM * 1.3)
  })

  test("lets a pilot balloon burst at some 12 km, and a party balloon climb at about 2 m/s", () => {
    const pilot = BalloonFlight.trajectory(flight("pilot"), { t: 0 })
    expect(pilot.end).toBe("burst")
    expect(pilot.samples[pilot.samples.length - 1].z).toBeGreaterThan(10000)
    expect(pilot.samples[pilot.samples.length - 1].z).toBeLessThan(14000)
    const party = BalloonFlight.trajectory(flight("party"), { t: 0 })
    expect(climbOver(party.samples, 30, 300)).toBeGreaterThan(1.5)
    expect(climbOver(party.samples, 30, 300)).toBeLessThan(3)
  })

  test("lets a foil balloon float at a few kilometres, losing the helium it can no longer hold", () => {
    const { samples, end } = BalloonFlight.trajectory(flight("foil", { durationS: 10800 }), { t: 0 })
    expect(end).toBe("time")
    const late = at(samples, 9000).z
    expect(late).toBeGreaterThan(2500)
    expect(late).toBeLessThan(5500)
    expect(Math.abs(climbOver(samples, 9000, 10700))).toBeLessThan(0.15)
  })

  test("lets a stratospheric balloon fill out as it climbs and float at some 30 km, its ballast holding it there", () => {
    const { samples } = BalloonFlight.trajectory(flight("stratospheric"), { t: 0 })
    const full = BalloonFlight.widthOf(BalloonTypes.byId("stratospheric")!, 14000)
    expect(samples[0].widthM).toBeLessThan(full / 3)
    const float = at(samples, 6000)
    expect(float.z).toBeGreaterThan(28000)
    expect(float.z).toBeLessThan(32000)
    expect(float.widthM).toBeGreaterThan(full * 0.9)
    expect(Math.abs(climbOver(samples, 5500, 7500))).toBeLessThan(0.5)
  })

  test("has a hot-air balloon's pilot fire blasts of a few seconds, half a minute to two minutes apart, to keep their height", () => {
    const { samples } = BalloonFlight.trajectory(flight("hot-air", { plan: [{ t: 0, altitudeM: 300 }] }), { t: 0 })
    const held = samples.filter(sample => sample.t >= 900_000 && sample.t <= 3_000_000)
    for (const sample of held) expect(Math.abs(sample.z - 300)).toBeLessThan(120)
    const starts = held.filter((sample, i) => i > 0 && sample.burning && !held[i - 1].burning).map(sample => sample.t / 1000)
    expect(starts.length).toBeGreaterThan(10)
    const gaps = starts.slice(1).map((s, i) => s - starts[i])
    const mean = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length
    expect(mean).toBeGreaterThan(20)
    expect(mean).toBeLessThan(150)
    // Its envelope glows while the burner fires, and not between.
    const [body] = BalloonFlight.bodiesOf(flight("hot-air", { durationS: 600 }))
    const lit = body.track.filter(key => (key.lights?.envelope ?? 0) > 0)
    const dark = body.track.filter(key => key.lights && key.lights.envelope === 0)
    expect(lit.length).toBeGreaterThan(0)
    expect(dark.length).toBeGreaterThan(lit.length)
  })

  test("comes down with the pilot's plan, lands and ends there", () => {
    const { samples, end } = BalloonFlight.trajectory(flight("hot-air", { plan: [{ t: 0, altitudeM: 200 }, { t: 600_000, altitudeM: 0 }], durationS: 3600 }), { t: 0 })
    expect(end).toBe("landed")
    expect(samples[samples.length - 1].z).toBeCloseTo(0, 1)
    expect(samples[samples.length - 1].t).toBeLessThan(3_600_000)
  })

  test("holds a captive balloon on its line, leant over by the wind", () => {
    const { samples } = BalloonFlight.trajectory(flight("captive", { tetherM: 40, wind: { towardDeg: 90, speedMS: 6 } }), { t: 0 })
    for (const sample of samples) expect(Math.hypot(sample.x, sample.y, sample.z)).toBeLessThanOrEqual(40.001)
    const late = at(samples, 1800)
    expect(late.x).toBeGreaterThan(3)
    expect(late.z).toBeGreaterThan(20)
  })

  test("goes with the wind of each height", () => {
    const { samples } = BalloonFlight.trajectory(flight("weather", { wind: { towardDeg: 90, speedMS: 2 }, windsAloft: [{ atM: 10000, towardDeg: 0, speedMS: 40 }] }), { t: 0 })
    const early = at(samples, 120), late = at(samples, 2400)
    // Low down it goes east at the ground's 2 m/s; up in the jet it is carried north far faster.
    expect(early.x).toBeGreaterThan(150)
    expect(Math.abs(early.y)).toBeLessThan(Math.abs(early.x))
    expect(late.y).toBeGreaterThan(20000)
  })

  test("draws a group the same each time for the same seed, each balloon a body of its own colour", () => {
    const group = flight("party", { group: { count: 12, fromT: 0, untilT: 10_000, colors: ["#ff0000", "#0000ff"], seed: 7 }, durationS: 120, turbulence: undefined })
    const bodies = BalloonFlight.bodiesOf(group)
    expect(bodies).toHaveLength(12)
    expect(new Set(bodies.map(body => body.ensemble))).toEqual(new Set(["b"]))
    expect(bodies[0].modelParameters?.envelopeColor).toBe("#ff0000")
    expect(bodies[1].modelParameters?.envelopeColor).toBe("#0000ff")
    expect(JSON.stringify(BalloonFlight.bodiesOf({ ...group }))).toBe(JSON.stringify(bodies))
    // Each goes its own way in the gusts.
    const ends = bodies.map(body => body.track[body.track.length - 2])
    expect(new Set(ends.map(key => Math.round(key.eastM! * 10))).size).toBeGreaterThan(6)
  })

  test("makes a body of each balloon: its model, its size swelling, and gone once it bursts", () => {
    const [body] = BalloonFlight.bodiesOf(flight("weather"))
    expect(body.model).toEqual({ id: "ufoathome-balloon-latex" })
    expect((body.title as { fr: string }).fr).toBe("Ballon-sonde")
    const sizes = body.track.filter(key => key.sizeM).map(key => key.sizeM!.widthM)
    expect(sizes.length).toBeGreaterThan(50)
    expect(sizes[sizes.length - 1]).toBeGreaterThan(sizes[0] * 3)
    expect(body.track[body.track.length - 1].present).toBe(false)
    // The aspect of its model.
    const first = body.track[0].sizeM!
    expect(first.heightM / first.widthM).toBeCloseTo(BalloonTypes.byId("weather")!.aspect, 2)
  })

  test("lights an LED balloon all over by its LED, and a pilot balloon's lamp only when the recording lights it", () => {
    const [led] = BalloonFlight.bodiesOf(flight("led", { color: "#ff3040", durationS: 60 }))
    expect(led.track[0].appearance?.luminanceCdM2).toBeCloseTo(0.5 / (Math.PI * 0.15 * 0.15), 0)
    expect(led.modelParameters?.envelopeColor).toBe("#ff3040")
    const [dark] = BalloonFlight.bodiesOf(flight("pilot", { durationS: 60 }))
    expect(dark.track[0].lights?.["light-lamp"]).toBe(0)
    const [lit] = BalloonFlight.bodiesOf(flight("pilot", { durationS: 60, lit: true }))
    expect(lit.track[0].lights?.["light-lamp"]).toBeGreaterThan(0)
  })

  test("turns a foil balloon slowly as it goes, a mirror", () => {
    const [body] = BalloonFlight.bodiesOf(flight("foil", { durationS: 60 }))
    expect(body.track[0].appearance?.finish).toBe("mirror")
    const headings = body.track.filter(key => key.attitude).map(key => key.attitude!.headingDeg!)
    expect(new Set(headings).size).toBeGreaterThan(30)
  })

  test("changes a type's figures by what the recording states", () => {
    const heavy = BalloonFlight.trajectory(flight("party", { balloon: { id: "party", massKg: 0.013 } }), { t: 0 })
    // As heavy as its gas lifts: it does not leave the ground, and the flight ends there.
    expect(Math.max(...heavy.samples.map(sample => sample.z))).toBeLessThan(1)
    expect(heavy.end).toBe("landed")
  })

  test("floats a superpressure balloon at some 19 km without bursting, an infrared one at some 25 km, a large stratospheric one at some 38 km", () => {
    const float = (id: BalloonTypeId, s: number) => at(BalloonFlight.trajectory(flight(id), { t: 0 }).samples, s).z
    expect(float("superpressure", 9000)).toBeGreaterThan(17000)
    expect(float("superpressure", 9000)).toBeLessThan(21000)
    expect(float("infrared", 9000)).toBeGreaterThan(23000)
    expect(float("infrared", 9000)).toBeLessThan(27000)
    expect(float("stratospheric-large", 7200)).toBeGreaterThan(36000)
    expect(float("stratospheric-large", 7200)).toBeLessThan(41000)
  })

  test("lets a prank balloon climb while its candles burn, their light fading over the last quarter, and come down once they are out", () => {
    const { samples } = BalloonFlight.trajectory(flight("prank-candles", { durationS: 1800 }), { t: 0 })
    expect(at(samples, 60).z).toBeGreaterThan(50)
    expect(at(samples, 300).flame).toBe(1)
    expect(at(samples, 650).flame).toBeGreaterThan(0)
    expect(at(samples, 650).flame).toBeLessThan(1)
    expect(at(samples, 900).flame).toBe(0)
    expect(climbOver(samples, 900, 1100)).toBeLessThan(0)
    // As many flames lit as stated, and the others dark; more of them heat it more.
    const [body] = BalloonFlight.bodiesOf(flight("prank-candles", { flames: 2, durationS: 60 }))
    const lights = body.track[1].lights!
    expect(Object.keys(lights).filter(name => name.startsWith("light-flame-") && lights[name] > 0)).toHaveLength(2)
    expect(lights.envelope).toBeGreaterThan(0)
    const climb = (flames: number) => climbOver(BalloonFlight.trajectory(flight("prank-candles", { flames }), { t: 0 }).samples, 30, 120)
    expect(climb(8)).toBeGreaterThan(climb(2))
  })

  test("turns and swings a prank balloon, and draws a foil balloon in its shape", () => {
    const [prank] = BalloonFlight.bodiesOf(flight("prank-candles", { durationS: 30 }))
    expect(new Set(prank.track.filter(key => key.attitude).map(key => key.attitude!.pitchDeg)).size).toBeGreaterThan(5)
    const [figure] = BalloonFlight.bodiesOf(flight("foil", { shape: "figure", partColors: { hair: "#5a2e14" }, durationS: 30 }))
    expect(figure.model).toEqual({ id: "ufoathome-balloon-foil-figure" })
    expect(figure.modelParameters).toMatchObject({ envelopeColor: "#f0a3c8", hairColor: "#5a2e14" })
    expect(figure.track[0].sizeM!.heightM).toBeCloseTo(0.8 * 1.112, 2)
  })

  test("computes every type within a few hundred milliseconds", () => {
    for (const type of BalloonTypes.ALL) {
      const start = performance.now()
      BalloonFlight.trajectory(flight(type.id), { t: 0 })
      expect(performance.now() - start, type.id).toBeLessThan(1000)
    }
  })
})
