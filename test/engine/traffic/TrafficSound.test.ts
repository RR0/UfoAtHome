import { describe, expect, test } from "vitest"
import { AircraftHearing } from "../../../src/engine/traffic/AircraftHearing.js"
import { SoundInAir } from "../../../src/engine/traffic/SoundInAir.js"
import type { AircraftPoint, AircraftTrack } from "../../../src/engine/traffic/AircraftProvider.js"
import { TrafficIds } from "../../../src/engine/traffic/TrafficIds.js"
import { TrafficSound } from "../../../src/engine/traffic/TrafficSound.js"

const observer = { lat: 48, lng: 2, heightM: 0 }
const T0 = Date.UTC(2025, 11, 30, 12)
const KM_LNG = 1 / (111.32 * Math.cos((48 * Math.PI) / 180))

/** Eastbound at `knots` and `altitudeFt`, `offsetKm` north of the observer, passing at 200 s, recorded from -400 to 600 s. */
function flight(icao: number, altitudeFt: number, offsetKm: number, knots = 250): AircraftTrack {
  const mps = knots * 0.514444
  const points: AircraftPoint[] = []
  for (let s = -400; s <= 600; s += 5) {
    points.push({ t: T0 + s * 1000, lat: 48 + offsetKm / 111.32, lng: 2 + ((s - 200) * mps / 1000) * KM_LNG, altitudeFt, groundSpeedKt: knots, trackDeg: 90 })
  }
  return { icao, nonIcao: false, points }
}
const flights = (...list: [string, AircraftTrack][]) => new Map(list)
const key = (track: AircraftTrack) => TrafficIds.keyOf(track)

describe("TrafficSound", () => {
  describe("which aircraft could be heard at all", () => {
    test("a near one, and not one that never comes within earshot of anything", () => {
      const sky = flights(["near", flight(1, 3000, 1)], ["far", flight(2, 35000, 60)])
      expect([...TrafficSound.candidates(sky, new Map(), key, observer)]).toEqual(["near"])
    })

    test("by what it is: a helicopter at ten kilometres is heard where an airliner is too, but a drone is not", () => {
      const sky = flights(["heli", flight(1, 2000, 9)], ["drone", flight(2, 2000, 9)])
      const described = new Map([["000001", { type: "R44" }], ["000002", { category: "B6" }]])
      expect([...TrafficSound.candidates(sky, described, key, observer)]).toEqual(["heli"])
    })

    test("in a place where nothing else is heard, more of them", () => {
      const sky = flights(["far", flight(2, 20000, 25)])
      expect(TrafficSound.candidates(sky, new Map(), key, observer, { ambientDbA: 50 }).size).toBe(0)
      expect(TrafficSound.candidates(sky, new Map(), key, observer, { ambientDbA: 20 }).size).toBe(1)
    })
  })

  describe("who is heard at an instant", () => {
    const sky = flights(["a", flight(1, 3000, 1)], ["b", flight(2, 6000, 3)], ["c", flight(3, 9000, 5)])
    const all = new Set(["a", "b", "c"])
    
    test("the loudest first, each with its own sound", () => {
      const voices = TrafficSound.voices(all, sky, new Map(), key, observer, T0 + 200_000)
      expect(voices.length).toBeGreaterThan(0)
      expect(voices.map(voice => voice.levelDbA)).toEqual([...voices.map(voice => voice.levelDbA)].sort((x, y) => y - x))
      expect(voices[0].id).toBe("a")
    })

    test("no more than the most that can be played", () => {
      expect(TrafficSound.voices(all, sky, new Map(), key, observer, T0 + 200_000, { maxVoices: 2 })).toHaveLength(2)
    })

    test("only what it is asked to work out", () => {
      const voices = TrafficSound.voices(all, sky, new Map(), key, observer, T0 + 200_000, { only: id => id === "b" })
      expect(voices.map(voice => voice.id)).toEqual(["b"])
    })

    test("the sound of an aircraft that has left the record is still heard: it left the aircraft long before", () => {
      // Recorded until 205 s only: at 208 s the aircraft is gone from it, and what is heard left it four seconds before, while it was there.
      const gone = flights(["g", { ...flight(7, 3000, 1), points: flight(7, 3000, 1).points.filter(point => point.t <= T0 + 205_000) }])
      const voices = TrafficSound.voices(new Set(["g"]), gone, new Map(), key, observer, T0 + 208_000)
      expect(voices).toHaveLength(1)
      expect(voices[0].levelDbA).toBeGreaterThan(50)
    })

    test("the sound comes from where the aircraft was, behind it, and is shifted by its speed", () => {
      const [voice] = TrafficSound.voices(new Set(["a"]), sky, new Map(), key, observer, T0 + 200_000)
      // Eastbound: the sound it makes now left it when it was to the west, which is where it seems to come from.
      expect(voice.azimuthDeg).toBeGreaterThan(180)
      expect(voice.azimuthDeg).toBeLessThan(360)
      const going = TrafficSound.voices(new Set(["a"]), sky, new Map(), key, observer, T0 + 240_000)
      const coming = TrafficSound.voices(new Set(["a"]), sky, new Map(), key, observer, T0 + 170_000)
      expect(coming[0].dopplerRatio).toBeGreaterThan(1)
      expect(going[0].dopplerRatio).toBeLessThan(1)
    })

    test("with the character of what it is: a helicopter beats, an airliner whines", () => {
      const heli = TrafficSound.voices(new Set(["a"]), sky, new Map([["000001", { type: "EC35" }]]), key, observer, T0 + 200_000)[0]
      const airliner = TrafficSound.voices(new Set(["a"]), sky, new Map([["000001", { type: "A320" }]]), key, observer, T0 + 200_000)[0]
      expect(heli.kind).toBe("helicopter-light")
      expect(heli.character?.modulationHz).toBe(20)
      expect(airliner.character?.toneHz).toBe(1800)
      expect(airliner.character?.modulationHz).toBeUndefined()
    })

    test("not what is too faint: it is said inaudible, and not played", () => {
      const far = flights(["f", flight(9, 35000, 70)])
      expect(TrafficSound.voices(new Set(["f"]), far, new Map(), key, observer, T0 + 200_000)).toEqual([])
    })

    test("an id that is not a flight of the record is passed over", () => {
      expect(TrafficSound.voices(new Set(["nobody"]), sky, new Map(), key, observer, T0 + 200_000)).toEqual([])
    })
  })

  describe("how strong to play a band", () => {
    const ambient = AircraftHearing.ambientBands(35)
    /** A sound whose bands stand `offsetDb` over the ambient's, band by band: the same shape as the ambient noise's, and `offsetDb` over its total. */
    const sameShape = (offsetDb: number, reference?: number) => TrafficSound.bandAmplitudes(ambient.map(level => level + offsetDb), 35, reference)
    const rms = (amplitudes: number[]) => Math.sqrt(amplitudes.reduce((sum, amplitude) => sum + amplitude * amplitude, 0))

    test("the whole is as loud as its level over the ambient says: the reference at the pivot, and twice for twelve decibels more over it", () => {
      const knee = TrafficSound.KNEE_DB
      expect(rms(sameShape(knee))).toBeCloseTo(TrafficSound.REFERENCE_AMPLITUDE * 10 ** (knee / 20), 6)
      // Above the pivot it is compressed: so many decibels of level for one played.
      expect(rms(sameShape(knee + 12)) / rms(sameShape(knee))).toBeCloseTo(10 ** (12 / TrafficSound.COMPRESSION_RATIO / 20), 6)
    })

    test("beyond the knee it is played compressed: not the whole range of an aircraft over a calm night, which nobody listens at", () => {
      const knee = TrafficSound.KNEE_DB
      const ratio = TrafficSound.COMPRESSION_RATIO
      expect(rms(sameShape(knee + 20)) / rms(sameShape(knee))).toBeCloseTo(10 ** (20 / ratio / 20), 6)
      // A sound 46 dB over the weather is played as 20 + 26 / ratio over it: a seventy-fold amplitude and not a two-hundred-fold.
      expect(rms(sameShape(46)) / TrafficSound.REFERENCE_AMPLITUDE).toBeCloseTo(10 ** ((knee + (46 - knee) / ratio) / 20), 6)
    })

    test("under it a sound is played expanded, so that an aircraft far off is the faint thing it is: each decibel less is more than one less", () => {
      const knee = TrafficSound.KNEE_DB
      // Nine decibels over the ambient is where every band is whole; six under the pivot is played so many times six under it.
      expect(rms(sameShape(knee - 6)) / rms(sameShape(knee))).toBeCloseTo(10 ** (-6 * TrafficSound.EXPANSION_RATIO / 20), 6)
      expect(rms(sameShape(knee - 6))).toBeLessThan(TrafficSound.REFERENCE_AMPLITUDE * 10 ** ((knee - 6) / 20))
    })

    test("the whole is shared between the bands as the sound's own spectrum has it, not as its excess over the ambient's band by band", () => {
      // A sound that is all low rumble, the ambient being what it is: played as low rumble, and not whitened by dividing it by the ambient's shape.
      const bands = [60, 62, 58, 50, 40, 30, 20, 10]
      const amplitudes = TrafficSound.bandAmplitudes(bands, 20)
      // The strong bands stand to one another as their levels do, whatever the ambient's own spectrum is.
      expect(amplitudes[1] / amplitudes[2]).toBeCloseTo(10 ** ((62 - 58) / 20), 6)
      expect(amplitudes[0] / amplitudes[3]).toBeCloseTo(10 ** ((60 - 50) / 20), 6)
      expect(amplitudes[1]).toBeGreaterThan(amplitudes[4] * 5)
    })

    test("the same sound is as loud whatever the ambient's shape, since only its level decides it", () => {
      const bands = [60, 62, 58, 50, 40, 30, 20, 10]
      expect(rms(TrafficSound.bandAmplitudes(bands, 20))).toBeGreaterThan(0)
      // The spectrum's own total is 64 dB(A); at 20 dB(A) of ambient that is 44 over, played compressed from the knee.
      const over = SoundInAir.sumDb(bands) - 20
      const expected = TrafficSound.REFERENCE_AMPLITUDE * 10 ** ((TrafficSound.KNEE_DB + (over - TrafficSound.KNEE_DB) / TrafficSound.COMPRESSION_RATIO) / 20)
      expect(rms(TrafficSound.bandAmplitudes(bands, 20))).toBeCloseTo(expected, 6)
    })

    test("the reference is the amplitude of the scene's own bed, so that the aircraft is as loud against the weather as its level over it says", () => {
      expect(rms(sameShape(20, 0.1)) / rms(sameShape(20, 0.05))).toBeCloseTo(2, 9)
      expect(rms(sameShape(20, 0.04))).toBeCloseTo(0.04 * 10 ** (20 / 20), 6)
    })

    test("a band the ambient masks is silent, and comes in smoothly, whatever the rest is doing", () => {
      // Strong in the lows, and the highs far under the ambient: the highs are silent, the lows are played.
      const bands = ambient.map((level, i) => level + (i < 3 ? 30 : -30))
      const amplitudes = TrafficSound.bandAmplitudes(bands, 35)
      expect(amplitudes.slice(0, 3).every(amplitude => amplitude > 0)).toBe(true)
      expect(amplitudes.slice(3).every(amplitude => amplitude === 0)).toBe(true)
      const around = (offsetDb: number) => TrafficSound.bandAmplitudes(ambient.map((level, i) => level + (i === 3 ? offsetDb : 40)), 35)[3]
      expect(around(-5)).toBe(0)
      expect(around(-1)).toBeGreaterThan(0)
      expect(around(-1)).toBeLessThan(around(2))
      expect(around(2)).toBeLessThan(around(12))
    })

    test("one amplitude per octave band", () => {
      expect(TrafficSound.bandAmplitudes(ambient, 35)).toHaveLength(TrafficSound.BANDS_HZ.length)
    })
  })

  describe("heard against the weather", () => {
    test("the same aircraft is heard against a calm and masked by a wind", () => {
      const far = flights(["f", flight(5, 3000, 8)])
      const calm = TrafficSound.voices(new Set(["f"]), far, new Map(), key, observer, T0 + 200_000, { ambientDbA: 30 })
      const windy = TrafficSound.voices(new Set(["f"]), far, new Map(), key, observer, T0 + 200_000, { ambientDbA: 52 })
      expect(calm).toHaveLength(1)
      expect(windy).toHaveLength(0)
    })

    test("a voice says how far it was, for what a far sound lacks", () => {
      const sky = flights(["a", flight(1, 3000, 1)])
      const [voice] = TrafficSound.voices(new Set(["a"]), sky, new Map(), key, observer, T0 + 200_000, { ambientDbA: 30 })
      expect(voice.distanceKm).toBeGreaterThan(1)
      expect(voice.distanceKm).toBeLessThan(10)
    })

    test("the reference amplitude it is given reaches its bands", () => {
      const sky = flights(["a", flight(1, 3000, 1)])
      const at = (referenceAmplitude: number) => TrafficSound.voices(new Set(["a"]), sky, new Map(), key, observer, T0 + 200_000, { ambientDbA: 30, referenceAmplitude })[0].bandAmplitudes
      expect(at(0.2)[4] / at(0.1)[4]).toBeCloseTo(2, 9)
    })
  })
})
