import { describe, expect, test } from "vitest"
import type { AircraftPoint, AircraftTrack } from "../../../src/engine/traffic/AircraftProvider.js"
import { AIRCRAFT_NOISES, AircraftHearing } from "../../../src/engine/traffic/AircraftHearing.js"
import { SoundInAir } from "../../../src/engine/traffic/SoundInAir.js"

const observer = { lat: 48, lng: 2, heightM: 0 }
const KM_LNG = 1 / (111.32 * Math.cos((48 * Math.PI) / 180))
const T0 = Date.UTC(2025, 11, 30, 12)

class Flights {
  /**
   * A level flight due east at `altitudeFt` and `knots`, passing `offsetKm` north of the observer at
   * `passAtS` seconds, recorded for `fromS` to `untilS` every 5 s.
   */
  static eastbound(altitudeFt: number, knots: number, passAtS: number, fromS = -400, untilS = 600, offsetKm = 0): AircraftTrack {
    const mps = knots * 0.514444
    const points: AircraftPoint[] = []
    for (let s = fromS; s <= untilS; s += 5) {
      points.push({ t: T0 + s * 1000, lat: 48 + offsetKm / 111.32, lng: 2 + ((s - passAtS) * mps / 1000) * KM_LNG, altitudeFt, groundSpeedKt: knots, trackDeg: 90 })
    }
    return { icao: 1, nonIcao: false, points }
  }

  /** The same, climbing (or, below zero, coming down) at `feetPerMinute` from `altitudeFt` at the pass. */
  static sloping(altitudeFt: number, feetPerMinute: number, knots: number, passAtS: number): AircraftTrack {
    const track = Flights.eastbound(altitudeFt, knots, passAtS)
    for (const point of track.points) point.altitudeFt = altitudeFt + (feetPerMinute * ((point.t - T0) / 1000 - passAtS)) / 60
    return track
  }
}

describe("AircraftHearing", () => {
  test("the narrow-body turbofan's power is about 148 dB(A) in all", () => {
    expect(SoundInAir.sumDb(AIRCRAFT_NOISES[0].soundPowerA)).toBeGreaterThan(147)
    expect(SoundInAir.sumDb(AIRCRAFT_NOISES[0].soundPowerA)).toBeLessThan(149)
  })

  test("every class of aircraft has a noise that adds up to its total, with the lows of a helicopter and the highs of a drone", () => {
    const total = (kind: Parameters<typeof AircraftHearing.noiseOfKind>[0]) => SoundInAir.sumDb(AircraftHearing.noiseOfKind(kind).soundPowerA)
    expect(total("airliner-narrow")).toBeCloseTo(148, 5)
    expect(total("airliner-wide")).toBeCloseTo(151, 5)
    expect(total("helicopter-light")).toBeCloseTo(134, 5)
    expect(total("light-piston")).toBeCloseTo(130, 5)
    // An airliner is the loudest of the civil, a drone and a glider the quietest.
    expect(total("airliner-wide")).toBeGreaterThan(total("airliner-narrow"))
    expect(total("airliner-narrow")).toBeGreaterThan(total("helicopter-heavy"))
    expect(total("light-piston")).toBeGreaterThan(total("unmanned"))
    const bands = (kind: Parameters<typeof AircraftHearing.noiseOfKind>[0]) => AircraftHearing.noiseOfKind(kind).soundPowerA
    expect(bands("helicopter-medium").indexOf(Math.max(...bands("helicopter-medium")))).toBeLessThan(bands("unmanned").indexOf(Math.max(...bands("unmanned"))))
    expect(bands("regional-turboprop")[0]).toBeGreaterThan(bands("airliner-narrow")[0])
  })

  test("a turbine hums as it turns, and a rotor does not: the hum is what a far jet has when its roar is gone", () => {
    for (const kind of ["airliner-narrow", "airliner-wide", "regional-jet", "business-jet"] as const) {
      const character = AircraftHearing.noiseOfKind(kind).character
      expect(character?.humHz, kind).toBeGreaterThan(50)
      expect(character?.humHz, kind).toBeLessThan(130)
      expect(character?.humShare, kind).toBeGreaterThan(0)
    }
    expect(AircraftHearing.noiseOfKind("helicopter-light").character?.humHz).toBeUndefined()
    expect(AircraftHearing.noiseOfKind("unmanned").character?.humHz).toBeUndefined()
  })

  test("what is not known is the noise of a narrow-body airliner", () => {
    expect(AircraftHearing.noiseOfKind("unknown").id).toBe("turbofan-narrow-body")
  })

  test("a helicopter overhead is heard where an airliner at the same height is not, and an airliner's rumble outlasts it", () => {
    const heli = AircraftHearing.profile(Flights.eastbound(1500, 90, 200), observer, T0 + 100_000, T0 + 400_000, 2000, { ambientDbA: 35, noise: AircraftHearing.noiseOfKind("helicopter-light") })
    const airliner = AircraftHearing.profile(Flights.eastbound(1500, 90, 200), observer, T0 + 100_000, T0 + 400_000, 2000, { ambientDbA: 35 })
    expect(airliner.peakDbA).toBeGreaterThan(heli.peakDbA)
    expect(heli.peakDbA).toBeGreaterThan(55)
    expect(heli.audible.length).toBeGreaterThan(0)
  })

  // What is reported of airliners overhead, in dB(A), at their loudest: the figures the source's spectrum is held
  // to. They are orders of magnitude, not measurements of one aircraft.
  test.each([
    [3300, 70, 85, "1 km up, as on a final approach"],
    [9800, 55, 70, "3 km up, climbing out"],
    [35000, 30, 45, "10.7 km up, at cruise: faint, a rumble when it is heard at all"]
  ])("an airliner passing overhead at %i ft is heard at its loudest at %i to %i dB(A): %s", (altitudeFt, low, high) => {
    const profile = AircraftHearing.profile(Flights.eastbound(altitudeFt, 450, 200), observer, T0 + 100_000, T0 + 500_000, 1000)
    expect(profile.peakDbA, `${profile.peakDbA.toFixed(1)} dB(A)`).toBeGreaterThan(low)
    expect(profile.peakDbA).toBeLessThan(high)
  })

  test("the sound of an aircraft at 10 km arrives some forty seconds late, from where it was", () => {
    // The sound that arrives as it passes overhead left it when it was further, so the delay is h / sqrt(c^2 - v^2), not h / c.
    const track = Flights.eastbound(35000, 450, 200)
    const heard = AircraftHearing.heardAt(track, observer, T0 + 200_000)!
    const h = 35000 * 0.3048
    const c = SoundInAir.speedOfSound(15)
    const v = 450 * 0.514444
    expect(heard.delayS).toBeCloseTo(h / Math.sqrt(c * c - v * v), 0)
    expect(heard.emittedAtMs).toBeCloseTo(T0 + 200_000 - heard.delayS * 1000, 0)
  })

  test("it is heard behind the aircraft, along its course", () => {
    // Eastbound: its sound comes from the west of where it is seen.
    const heard = AircraftHearing.heardAt(Flights.eastbound(35000, 450, 200), observer, T0 + 200_000)!
    expect(heard.lagDeg).toBeGreaterThan(40)
    expect(heard.seen.altitudeDeg).toBeGreaterThan(85)
    expect(heard.sound.azimuthDeg).toBeGreaterThan(180)
    expect(heard.sound.azimuthDeg).toBeLessThan(360)
    // Still high in the sky, and well to the west.
    expect(heard.sound.altitudeDeg).toBeLessThan(60)
  })

  test("a slow aircraft leaves little lag, a fast one more, and none at all when it is still", () => {
    const lag = (knots: number) => AircraftHearing.heardAt(Flights.eastbound(35000, knots, 200), observer, T0 + 200_000)!.lagDeg
    expect(lag(450)).toBeGreaterThan(lag(100))
    expect(lag(100)).toBeGreaterThan(5)
    expect(lag(0.01)).toBeLessThan(0.5)
  })

  test("a close aircraft is a broad sound, a far one a rumble: the air takes the highs away", () => {
    const near = AircraftHearing.heardAt(Flights.eastbound(3300, 250, 200), observer, T0 + 200_000, { ambientDbA: 30 })!
    const far = AircraftHearing.heardAt(Flights.eastbound(3300, 250, 200, -400, 600, 20), observer, T0 + 200_000, { ambientDbA: 30 })!
    expect(near.cutoffHz).toBeGreaterThanOrEqual(4000)
    expect(far.cutoffHz!).toBeLessThan(near.cutoffHz!)
    expect(far.bandsDbA[7] - far.bandsDbA[3]).toBeLessThan(near.bandsDbA[7] - near.bandsDbA[3])
  })

  test("the level falls by six decibels each time the distance doubles, apart from the air's absorption of the lows", () => {
    const at = (altitudeFt: number) => AircraftHearing.heardAt(Flights.eastbound(altitudeFt, 100, 200), observer, T0 + 200_000, { air: { temperatureC: 15, relativeHumidity: 1, pressureKPa: 101.325 } })!.bandsDbA[0]
    // The 63 Hz band, which the air hardly touches: 1 km against 2 km, as slant distances.
    const ft = (km: number) => (km * 1000) / 0.3048
    expect(at(ft(1)) - at(ft(2))).toBeGreaterThan(5.8)
    expect(at(ft(1)) - at(ft(2))).toBeLessThan(6.4)
  })

  test("an aircraft far off is not heard against even a quiet night, and a near one is", () => {
    const far = AircraftHearing.heardAt(Flights.eastbound(35000, 450, 200, -400, 600, 60), observer, T0 + 200_000, { ambientDbA: 30 })!
    const near = AircraftHearing.heardAt(Flights.eastbound(5000, 250, 200, -400, 600, 2), observer, T0 + 200_000, { ambientDbA: 30 })!
    expect(far.audible).toBe(false)
    expect(near.audible).toBe(true)
  })

  test("the same aircraft is heard in a quiet place and drowned in a noisy one", () => {
    const track = Flights.eastbound(35000, 450, 200)
    expect(AircraftHearing.heardAt(track, observer, T0 + 200_000, { ambientDbA: 25 })!.audible).toBe(true)
    expect(AircraftHearing.heardAt(track, observer, T0 + 200_000, { ambientDbA: 55 })!.audible).toBe(false)
  })

  test("it is heard at a pitch raised while it comes on and lowered once it goes", () => {
    const track = Flights.eastbound(5000, 450, 200, -400, 600, 3)
    const coming = AircraftHearing.heardAt(track, observer, T0 + 120_000)!
    const going = AircraftHearing.heardAt(track, observer, T0 + 290_000)!
    expect(coming.dopplerRatio).toBeGreaterThan(1.1)
    expect(going.dopplerRatio).toBeLessThan(0.9)
  })

  test("coming straight at the listener at 450 knots it is heard at c / (c - v) of its pitch, which is a good deal higher", () => {
    // Observer 100 km east on the aircraft's own line; the sound heard at 100 s left it some fifteen minutes before.
    const head = AircraftHearing.heardAt(Flights.eastbound(100, 450, 100, -1500, 600, 0), { lat: 48, lng: 2 + 100 * KM_LNG, heightM: 0 }, T0 + 100_000)!
    const c = SoundInAir.speedOfSound(15)
    const v = 450 * 0.514444
    expect(head.dopplerRatio).toBeCloseTo(c / (c - v), 1)
  })

  test("nothing is heard of an aircraft that was not yet recorded when its sound left", () => {
    // Recorded only from 150 s: the sound heard at 160 s left at about 128 s.
    const track = Flights.eastbound(35000, 450, 200, 150, 400)
    expect(AircraftHearing.heardAt(track, observer, T0 + 160_000)).toBeUndefined()
    expect(AircraftHearing.heardAt(track, observer, T0 + 260_000)).toBeDefined()
  })

  test("the profile says when it is heard: later than it is seen, and for a while after it is gone", () => {
    const track = Flights.eastbound(5000, 250, 200, -400, 600, 2)
    const profile = AircraftHearing.profile(track, observer, T0, T0 + 400_000, 5000, { ambientDbA: 30 })
    expect(profile.audible).toHaveLength(1)
    expect(profile.peakDbA).toBeGreaterThan(60)
    // Heard at its loudest later than it is overhead: the delay is those seconds.
    expect(profile.peakAtMs).toBeGreaterThan(T0 + 200_000)
    expect(profile.peakDelayS).toBeGreaterThan(4)
  })

  test("the sound of an aircraft that has just left the record is still heard: it left the aircraft while it was there", () => {
    const full = Flights.eastbound(5000, 250, 200, -400, 600, 2)
    const track = { ...full, points: full.points.filter(point => point.t <= T0 + 205_000) }
    const heard = AircraftHearing.heardAt(track, observer, T0 + 209_000)!
    expect(heard).toBeDefined()
    expect(heard.delayS).toBeGreaterThan(3)
    expect(heard.emittedAtMs).toBeLessThanOrEqual(T0 + 205_000)
    // Long after, what is heard would have left it after the record ends, and is not known.
    expect(AircraftHearing.heardAt(track, observer, T0 + 260_000)).toBeUndefined()
  })

  test("an aircraft with no position is not heard", () => {
    expect(AircraftHearing.heardAt({ icao: 1, nonIcao: false, points: [] }, observer, T0)).toBeUndefined()
  })

  test("a hotter day carries the sound a little faster, so it is a little less late", () => {
    const track = Flights.eastbound(35000, 450, 200)
    const cold = AircraftHearing.heardAt(track, observer, T0 + 200_000, { air: { temperatureC: -10, relativeHumidity: 0.7, pressureKPa: 101.325 } })!
    const hot = AircraftHearing.heardAt(track, observer, T0 + 200_000, { air: { temperatureC: 35, relativeHumidity: 0.7, pressureKPa: 101.325 } })!
    expect(hot.delayS).toBeLessThan(cold.delayS)
  })

  test("the ambient noise's bands add up to the figure it was given", () => {
    expect(SoundInAir.sumDb(AircraftHearing.ambientBands(40))).toBeCloseTo(40, 3)
  })

  describe("at the thrust it was at", () => {
    test("tells from its track whether it takes off, comes in to land or passes over", () => {
      const at = T0 + 200_000
      expect(AircraftHearing.regimeAt(Flights.sloping(2000, 2500, 160, 200), at, observer)).toBe("takeoff")
      expect(AircraftHearing.regimeAt(Flights.sloping(1500, -700, 140, 200), at, observer)).toBe("approach")
      expect(AircraftHearing.regimeAt(Flights.eastbound(3000, 250, 200), at, observer)).toBe("overflight")
      // High up, a climb is at a climb's thrust and a descent is not an approach yet.
      expect(AircraftHearing.regimeAt(Flights.sloping(25000, 2000, 400, 200), at, observer)).toBe("overflight")
      expect(AircraftHearing.regimeAt(Flights.sloping(25000, -2000, 400, 200), at, observer)).toBe("overflight")
      // Low over a listener on a height: within 3 000 m of THEM.
      expect(AircraftHearing.regimeAt(Flights.sloping(12000, 2500, 200, 200), at, { ...observer, heightM: 2000 })).toBe("takeoff")
    })

    test("a jet taking off is heard as its class at full thrust, the lows stronger; one that comes in to land is quieter, and brighter", () => {
      const at = T0 + 200_000
      const takeoff = AircraftHearing.heardAt(Flights.sloping(1500, 2500, 160, 200), observer, at, { ambientDbA: 30 })!
      const approach = AircraftHearing.heardAt(Flights.sloping(1500, -700, 160, 200), observer, at, { ambientDbA: 30 })!
      const passing = AircraftHearing.heardAt(Flights.eastbound(1500, 160, 200), observer, at, { ambientDbA: 30 })!
      expect(takeoff.regime).toBe("takeoff")
      expect(takeoff.noise.id).toBe("turbofan-narrow-body-takeoff")
      expect(approach.regime).toBe("approach")
      expect(passing.noise.id).toBe("turbofan-narrow-body")
      // The same total at the source as the class's own, and some 8 dB under it on approach.
      expect(SoundInAir.sumDb(takeoff.noise.soundPowerA)).toBeCloseTo(148, 5)
      expect(SoundInAir.sumDb(approach.noise.soundPowerA)).toBeCloseTo(140, 5)
      // Where the energy is: the lowest band against the 2 kHz one.
      const tilt = (heard: typeof passing) => heard.noise.soundPowerA[0] - heard.noise.soundPowerA[5]
      expect(tilt(takeoff)).toBeGreaterThan(tilt(passing) + 10)
      expect(tilt(approach)).toBeLessThan(tilt(passing) - 15)
    })

    test("an approaching jet's fan sings lower, as it turns slower, and stands out more", () => {
      const own = AircraftHearing.noiseOfKind("airliner-narrow")
      const approach = AircraftHearing.inRegime(own, "approach")
      expect(approach.character?.toneHz).toBeCloseTo(1008, 0)
      expect(approach.character?.toneShare).toBeCloseTo(0.6, 6)
      expect(approach.character?.humHz).toBeLessThan(own.character!.humHz!)
    })

    test("what has no regimes of its own is itself at every thrust", () => {
      const piston = AircraftHearing.noiseOfKind("light-piston")
      expect(AircraftHearing.inRegime(piston, "takeoff")).toBe(piston)
      const heard = AircraftHearing.heardAt(Flights.sloping(1500, 800, 90, 200), observer, T0 + 200_000, { noise: piston, ambientDbA: 30 })!
      expect(heard.regime).toBe("takeoff")
      expect(heard.noise).toBe(piston)
    })

    test("a take-off can be heard where its class at a climb's shape could not: its lows carry", () => {
      const own = AircraftHearing.noiseOfKind("airliner-narrow")
      const takeoff = AircraftHearing.inRegime(own, "takeoff")
      // Far enough that only the lows are left, against a quiet night.
      let km = 1
      while (AircraftHearing.bandsAt(own, km).some((level, i) => level >= AircraftHearing.ambientBands(25)[i] + AircraftHearing.DETECTION_MARGIN_DB)) km *= 1.1
      expect(AircraftHearing.bandsAt(takeoff, km).some((level, i) => level >= AircraftHearing.ambientBands(25)[i] + AircraftHearing.DETECTION_MARGIN_DB)).toBe(true)
      expect(AircraftHearing.couldBeHeard(own, km, 25)).toBe(true)
    })
  })
})
