import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { AircraftAudio } from "../../src/audio/AircraftAudio.js"
import { SoundInAir } from "../../src/engine/traffic/SoundInAir.js"
import type { AircraftVoice } from "../../src/engine/traffic/TrafficSound.js"

/** What a band is multiplied by to take the A-weighting off it, as AircraftAudio does: up to 12 dB of it. */
const unweight = (centre: number) => 10 ** (Math.min(12, Math.max(0, -SoundInAir.aWeightingDb(centre))) / 20)
const CENTRES = [63, 125, 250, 500, 1000, 2000, 4000, 8000]
/** The band-pass filters of the voices made, two to each band. */
const bandFilters = () => made.filters.filter(filter => filter.type === "bandpass")

/** A Web Audio parameter that remembers what it is asked to go to, and a node that remembers what it is wired to. */
class FakeParam {
  value = 0
  target?: number
  setTargetAtTime(value: number): void {
    this.target = value
  }
}

class FakeNode {
  readonly connections: unknown[] = []
  disconnected = false
  started = false
  stopped = false
  connect<T>(to: T): T {
    this.connections.push(to)
    return to
  }
  disconnect(): void {
    this.disconnected = true
  }
  start(): void {
    this.started = true
  }
  stop(): void {
    this.stopped = true
  }
}

class FakeGain extends FakeNode {
  gain = new FakeParam()
  /** The gain wired to the speakers is the player's volume, not one of a voice's: it is kept apart, so that a voice's gains keep their places. */
  override connect<T>(to: T): T {
    super.connect(to)
    if (made.contexts.some(context => context.destination === to)) {
      made.gains.splice(made.gains.indexOf(this), 1)
      made.masters.push(this)
    }
    return to
  }
}

class FakeFilter extends FakeNode {
  type = ""
  frequency = new FakeParam()
  Q = new FakeParam()
}

class FakeOscillator extends FakeNode {
  type = ""
  frequency = new FakeParam()
}

class FakeSource extends FakeNode {
  buffer: unknown
  loop = false
  loopStart = 0
}

class FakeCompressor extends FakeNode {
  threshold = new FakeParam()
  knee = new FakeParam()
  ratio = new FakeParam()
  attack = new FakeParam()
  release = new FakeParam()
}

class FakeConvolver extends FakeNode {
  buffer: { length: number; numberOfChannels: number } | undefined
}

class FakePanner extends FakeNode {
  pan = new FakeParam()
}

/** What the last context made, for a test to look at. */
const made = { masters: [] as FakeGain[], gains: [] as FakeGain[], filters: [] as FakeFilter[], oscillators: [] as FakeOscillator[], sources: [] as FakeSource[], panners: [] as FakePanner[], compressors: [] as FakeCompressor[], convolvers: [] as FakeConvolver[], contexts: [] as FakeContext[] }

class FakeContext {
  state = "running"
  currentTime = 0
  sampleRate = 48000
  destination = new FakeNode()
  closed = false
  constructor() {
    made.contexts.push(this)
  }
  resume(): Promise<void> {
    return Promise.resolve()
  }
  close(): Promise<void> {
    this.closed = true
    return Promise.resolve()
  }
  createGain(): FakeGain {
    const node = new FakeGain()
    made.gains.push(node)
    return node
  }
  createBiquadFilter(): FakeFilter {
    const node = new FakeFilter()
    made.filters.push(node)
    return node
  }
  createOscillator(): FakeOscillator {
    const node = new FakeOscillator()
    made.oscillators.push(node)
    return node
  }
  createBufferSource(): FakeSource {
    const node = new FakeSource()
    made.sources.push(node)
    return node
  }
  /** Absent unless a test gives the context a room: not every context has one. */
  createConvolver?(): FakeConvolver

  createDynamicsCompressor(): FakeCompressor {
    const node = new FakeCompressor()
    made.compressors.push(node)
    return node
  }
  createStereoPanner(): FakePanner {
    const node = new FakePanner()
    made.panners.push(node)
    return node
  }
  createBuffer(channels: number, length: number): { length: number; numberOfChannels: number; getChannelData: () => Float32Array } {
    const data = new Float32Array(length)
    return { length, numberOfChannels: channels, getChannelData: () => data }
  }
}

const voice = (overrides: Partial<AircraftVoice> = {}): AircraftVoice => ({
  id: "traffic-1-0", kind: "airliner-narrow", bandAmplitudes: [0.01, 0.02, 0.04, 0.04, 0.03, 0.02, 0.01, 0], levelDbA: 55, distanceKm: 3,
  dopplerRatio: 1, azimuthDeg: 90, elevationDeg: 30, character: { toneHz: 1800, toneShare: 0.08 }, ...overrides
})

describe("AircraftAudio", () => {
  beforeEach(() => {
    for (const list of Object.values(made)) list.length = 0
    vi.stubGlobal("AudioContext", FakeContext)
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  /** An audio that has been unlocked and is playing. */
  const playing = () => {
    const audio = new AircraftAudio()
    audio.resume()
    audio.setPaused(false)
    return audio
  }

  test("makes no sound, and builds nothing, until a gesture has unlocked it", () => {
    const audio = new AircraftAudio()
    audio.setPaused(false)
    audio.setVoices([voice()])
    expect(made.contexts).toHaveLength(0)
    expect(made.sources).toHaveLength(0)
  })

  test("builds a voice for each aircraft it is given: a noise, a filter and a gain for each octave band", () => {
    const audio = playing()
    audio.setVoices([voice()])
    // A noise, and the slow and the fast random tables that make it rough, all looped.
    expect(made.sources.filter(source => source.started)).toHaveLength(3)
    expect(made.sources.every(source => source.loop)).toBe(true)
    // Two band-pass filters in a row for each band, which fall away twice as steeply as one.
    expect(bandFilters()).toHaveLength(16)
    expect(bandFilters().map(filter => filter.frequency.value)).toEqual(CENTRES.flatMap(centre => [centre, centre]))
  })

  test("plays each band as strong as it was asked, with the ear's weighting taken off and the lows a little louder for the way white noise falls on a band of constant Q", () => {
    const audio = playing()
    audio.setVoices([voice({ bandAmplitudes: [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1] })])
    // Built in this order: the master, the beat, the beat's swing, then one gain for each of the eight bands.
    const bands = made.gains.slice(3, 11).map(gain => gain.gain.target)
    expect(bands).toHaveLength(8)
    bands.forEach((target, i) => expect(target ?? NaN).toBeCloseTo(0.1 * unweight(CENTRES[i]) * Math.sqrt(1000 / CENTRES[i]), 9))
    expect(bands[0]!).toBeGreaterThan(bands[7]!)
  })

  test("takes the A-weighting back off the lows, which it takes 26 dB from, and a hiss that is flat in A-weighted terms is a rumble", () => {
    const audio = playing()
    // The same amplitude in every band as the ear has it: played, the lows are far stronger than the highs, as the air carries them.
    audio.setVoices([voice({ bandAmplitudes: [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1], character: undefined })])
    expect(unweight(63)).toBeCloseTo(10 ** (12 / 20), 6)
    expect(unweight(1000)).toBe(1)
    expect(unweight(125)).toBeGreaterThan(unweight(500))
    expect(unweight(500)).toBeGreaterThan(unweight(1000))
    // At 63 Hz the weighting takes 26 dB and is taken back by 12, not all: what 63 Hz asks is more than a speaker can give, and a sound of lows alone is a blowing.
    expect(unweight(63)).toBeLessThan(10 ** (26.2 / 20))
  })

  test("a noise that holds perfectly steady is a wind tunnel: this one is rough, by slow and fast random tables read round and round", () => {
    // The tables are drawn at random: a fixed sequence, so that what is said of them is said of the same ones each time.
    let seed = 20251230
    const random = vi.spyOn(Math, "random").mockImplementation(() => {
      seed = (seed * 1664525 + 1013904223) % 4294967296
      return seed / 4294967296
    })
    const audio = playing()
    audio.setVoices([voice({ character: undefined })])
    const [, slow, fast] = made.sources
    for (const table of [slow, fast]) {
      expect(table.loop).toBe(true)
      const values = (table.buffer as { getChannelData: () => Float32Array }).getChannelData()
      let highest = -Infinity
      let lowest = Infinity
      for (const value of values) {
        if (value > highest) highest = value
        if (value < lowest) lowest = value
      }
      expect(highest).toBeLessThanOrEqual(1)
      expect(lowest).toBeGreaterThanOrEqual(-1)
    }
    // Mostly small values and the occasional large one: its median is well under half its range.
    const slowValues = Float32Array.from((slow.buffer as { getChannelData: () => Float32Array }).getChannelData(), Math.abs).sort()
    expect(slowValues[Math.floor(slowValues.length / 2)]).toBeLessThan(0.4)
    expect(slowValues[slowValues.length - 1]).toBeGreaterThan(0.5)
    // A jet's by default: a fifth of its loudness at most, and a crackle at a fifth of that. Steady, and only now and then a fluctuation.
    expect(made.gains.some(gain => Math.abs(gain.gain.value - 0.2) < 1e-9)).toBe(true)
    expect(made.gains.some(gain => Math.abs(gain.gain.value - 0.04) < 1e-9)).toBe(true)
    audio.dispose()
    for (const list of Object.values(made)) list.length = 0
    const other = playing()
    other.setVoices([voice({ id: "x", character: { roughness: 0.1 } })])
    expect(made.gains.some(gain => gain.gain.value === 0.1)).toBe(true)
    random.mockRestore()
  })

  test("the compressor is gentle and only for peaks, so that it does not flatten what makes a noise a roar", () => {
    const audio = playing()
    audio.setVoices([voice()])
    const compressor = made.compressors[0]
    expect(compressor.threshold.value).toBe(-6)
    expect(compressor.ratio.value).toBe(4)
    expect(compressor.attack.value).toBeGreaterThan(0)
  })

  test("shifts a tone by the Doppler ratio, and a broad noise only by the root of it: its rumble does not rise into the mids", () => {
    const audio = playing()
    audio.setVoices([voice({ dopplerRatio: 1.44 })])
    const shifted = (centre: number) => Math.min(48000 * 0.45, centre * 1.2)
    expect(bandFilters().map(filter => filter.frequency.target)).toEqual(CENTRES.flatMap(centre => [shifted(centre), shifted(centre)]))
    expect(made.oscillators.some(oscillator => oscillator.frequency.target !== undefined && Math.abs(oscillator.frequency.target - 1800 * 1.44) < 1e-6)).toBe(true)
  })

  test("limits a shift so large that it would be a swoop: a tone to half as much again, a noise to a third", () => {
    const audio = playing()
    audio.setVoices([voice({ dopplerRatio: 9 })])
    expect(bandFilters()[0].frequency.target).toBeCloseTo(63 * 1.3, 6)
    expect(bandFilters()[14].frequency.target).toBeLessThanOrEqual(48000 * 0.45)
    expect(made.oscillators.some(oscillator => oscillator.frequency.target !== undefined && Math.abs(oscillator.frequency.target - 1800 * 1.5) < 1e-6)).toBe(true)
    audio.setVoices([voice({ dopplerRatio: 0.2 })])
    expect(bandFilters()[0].frequency.target).toBeCloseTo(63 * 0.8, 6)
    expect(made.oscillators.some(oscillator => oscillator.frequency.target !== undefined && Math.abs(oscillator.frequency.target - 1800 * 0.7) < 1e-6)).toBe(true)
  })

  test("an approaching aircraft's whine is carried into a band the air has emptied, and is the weaker for it", () => {
    const audio = playing()
    // The 2 kHz band is strong and the 4 kHz band is nothing: a whine at 1800 Hz is heard at 2700 Hz when the aircraft comes on (the 2 kHz band still), and at 3600 Hz
    // shifted by two (the 4 kHz band, which is silent).
    audio.setVoices([voice({ bandAmplitudes: [0, 0, 0, 0, 0, 0.2, 0, 0], dopplerRatio: 1, character: { toneHz: 1800, toneShare: 0.3 } })])
    const level = made.gains[11].gain.target ?? NaN
    expect(level).toBeGreaterThan(0)
    audio.setVoices([voice({ bandAmplitudes: [0, 0, 0, 0, 0, 0.2, 0, 0], dopplerRatio: 1.5, character: { toneHz: 1800, toneShare: 0.3 } })])
    // 1800 x 1.5 = 2700 Hz: nearer the 2 kHz band than the 4 kHz one on a log scale (ratio 1.35 against 1.48), so still strong.
    expect(made.gains[11].gain.target).toBeCloseTo(level, 9)
    audio.setVoices([voice({ id: "x", bandAmplitudes: [0, 0, 0, 0, 0, 0.2, 0, 0], dopplerRatio: 1.5, character: { toneHz: 2600, toneShare: 0.3 } })])
    // 2600 x 1.5 = 3900 Hz: in the 4 kHz band, which is silent: no whine.
    expect(made.gains[17 + 11].gain.target).toBe(0)
  })

  test("a helicopter's rotor beats, at its own rate shifted like everything else, and its loudness swings between full and what its depth leaves", () => {
    const audio = playing()
    audio.setVoices([voice({ kind: "helicopter-light", dopplerRatio: 1.1, character: { modulationHz: 20, modulationDepth: 0.5 } })])
    const lfo = made.oscillators.find(oscillator => oscillator.frequency.target !== undefined && Math.abs(oscillator.frequency.target - 22) < 1e-9)
    expect(lfo).toBeDefined()
    // Depth 0.5: the gain rests at 0.75 and swings 0.25 either side, so it runs from 0.5 to 1.
    expect(made.gains.some(gain => gain.gain.value === 0.75)).toBe(true)
    expect(made.gains.some(gain => gain.gain.value === 0.25)).toBe(true)
  })

  test("an aircraft with no beat does not swing, and one with no tone carries none", () => {
    const audio = playing()
    audio.setVoices([voice({ character: undefined })])
    expect(made.gains.some(gain => gain.gain.value === 1)).toBe(true)
    const tone = made.gains.find(gain => gain.gain.target === 0)
    expect(tone).toBeDefined()
  })

  test("places the sound on the side it comes from, as the listener faces", () => {
    const audio = playing()
    // Due east, facing north: to the right. Facing east: ahead. Facing south: to the left.
    audio.setVoices([voice({ azimuthDeg: 90 })], 0)
    expect(made.panners[0].pan.target).toBeCloseTo(0.9, 6)
    audio.setVoices([voice({ azimuthDeg: 90 })], 90)
    expect(made.panners[0].pan.target).toBeCloseTo(0, 6)
    audio.setVoices([voice({ azimuthDeg: 90 })], 180)
    expect(made.panners[0].pan.target).toBeCloseTo(-0.9, 6)
  })

  test("a whine is as strong as the band it stands in, and so goes with it when the air takes the band away", () => {
    const audio = playing()
    // The fan's whine at 1800 Hz is in the 2 kHz band: with that band at nothing there is no whine, whatever the lows are.
    audio.setVoices([voice({ bandAmplitudes: [0.3, 0.3, 0.3, 0.3, 0.3, 0, 0, 0], character: { toneHz: 1800, toneShare: 0.08 } })])
    const toneGain = made.gains[11]
    expect(toneGain.gain.target).toBe(0)
    audio.setVoices([voice({ bandAmplitudes: [0.3, 0.3, 0.3, 0.3, 0.3, 0.2, 0, 0], character: { toneHz: 1800, toneShare: 0.08 } })])
    expect(toneGain.gain.target).toBeCloseTo(0.08 * 0.16 * 0.2 * unweight(2000), 9)
  })

  test("a whine has harmonics, each as strong as its own band lets it be and fewer as they go up", () => {
    const audio = playing()
    audio.setVoices([voice({ bandAmplitudes: [0, 0, 0, 0, 0, 0.2, 0.2, 0.2], character: { toneHz: 1800, toneShare: 0.3 } })])
    // 1800, 3600 and 5400 Hz: three oscillators, in the 2 kHz, 4 kHz and 4 kHz bands.
    const frequencies = made.oscillators.filter(oscillator => [1800, 3600, 5400].some(f => Math.abs((oscillator.frequency.target ?? 0) - f) < 1e-6)).map(oscillator => oscillator.frequency.target)
    expect(frequencies).toEqual([1800, 3600, 5400])
    const [first, second, third] = made.gains.slice(11, 14).map(gain => gain.gain.target ?? NaN)
    expect(first).toBeCloseTo(0.3 * 0.16 * 0.2 * unweight(2000) / 1, 9)
    expect(second).toBeCloseTo(0.3 * 0.16 * 0.2 * unweight(4000) / 2, 9)
    expect(third).toBeCloseTo(0.3 * 0.16 * 0.2 * unweight(4000) / 3, 9)
  })

  test("a harmonic whose band the air has taken away is not heard, though the first still is", () => {
    const audio = playing()
    audio.setVoices([voice({ bandAmplitudes: [0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0, 0], character: { toneHz: 1800, toneShare: 0.3 } })])
    const gains = made.gains.slice(11, 14).map(gain => gain.gain.target ?? NaN)
    expect(gains[0]).toBeGreaterThan(0)
    expect(gains[1]).toBe(0)
    expect(gains[2]).toBe(0)
  })

  test("an engine hums as it turns, and the hum outlasts the highs: what a far jet has when its roar is gone, and what tells it from the wind", () => {
    const audio = playing()
    // Only the lows reach the listener, as for an aircraft that is far off: the whine has nothing to stand in, and the hum is all there is of a tone.
    audio.setVoices([voice({ bandAmplitudes: [0.1, 0.2, 0.05, 0, 0, 0, 0, 0], character: { toneHz: 1800, toneShare: 0.3, humHz: 90, humShare: 0.7 } })])
    // Whine first, then hum: three harmonics of each. The whine is silent, the hum is not.
    const [w1, w2, w3, h1, h2, h3] = made.gains.slice(11, 17).map(gain => gain.gain.target ?? NaN)
    expect([w1, w2, w3]).toEqual([0, 0, 0])
    // 90 Hz is in the 125 Hz band (nearest on a log scale), 180 Hz in the 125 Hz or 250 Hz band, 270 Hz in the 250 Hz.
    expect(h1).toBeCloseTo(0.7 * 0.16 * 0.2 * unweight(125), 9)
    expect(h2).toBeGreaterThan(0)
    expect(h3).toBeGreaterThan(0)
    expect(h1).toBeGreaterThan(h3)
    const frequencies = made.oscillators.filter(oscillator => [90, 180, 270].some(f => Math.abs((oscillator.frequency.target ?? 0) - f) < 1e-6)).map(oscillator => oscillator.frequency.target)
    expect(frequencies).toEqual([90, 180, 270])
  })

  test("a voice with no hum has none, and a hum shifts with the Doppler effect as every tone does", () => {
    const audio = playing()
    audio.setVoices([voice({ character: { toneHz: 1800, toneShare: 0.3 } })])
    expect(made.oscillators.filter(oscillator => oscillator.frequency.value === 90)).toHaveLength(0)
    audio.setVoices([voice({ id: "h", dopplerRatio: 1.2, bandAmplitudes: [0.1, 0.2, 0.05, 0, 0, 0, 0, 0], character: { humHz: 90, humShare: 0.7 } })])
    expect(made.oscillators.some(oscillator => oscillator.frequency.target !== undefined && Math.abs(oscillator.frequency.target - 90 * 1.2) < 1e-9)).toBe(true)
  })

  test("a far sound is played quieter than its level says: distance takes more than the decibels do", () => {
    const audio = playing()
    audio.setVoices([voice({ id: "near", distanceKm: 2 }), voice({ id: "far", distanceKm: 40 })])
    expect((made.gains[17].gain.target ?? NaN) / (made.gains[0].gain.target ?? NaN)).toBeCloseTo(0.7, 9)
  })

  describe("with a room", () => {
    beforeEach(() => {
      FakeContext.prototype.createConvolver = function (this: FakeContext) {
        const node = new FakeConvolver()
        made.convolvers.push(node)
        return node
      }
    })
    afterEach(() => {
      delete FakeContext.prototype.createConvolver
    })

    test("a far sound arrives in a long reverberation, and a near one in hardly any", () => {
      const audio = playing()
      audio.setVoices([voice({ id: "near", distanceKm: 1 }), voice({ id: "far", distanceKm: 40 })])
      expect(made.convolvers).toHaveLength(1)
      // A tail of several seconds, in both ears.
      expect(made.convolvers[0].buffer!.numberOfChannels).toBe(2)
      expect(made.convolvers[0].buffer!.length).toBeGreaterThan(48000 * 3)
      // The send is the last gain of each voice (after the two roughnesses): nothing for the near one, a good deal for the far one.
      const sends = made.gains.filter(gain => made.convolvers[0] && made.convolvers[0] !== undefined && gain.connections.includes(made.convolvers[0]))
      expect(sends).toHaveLength(2)
      expect(sends[0].gain.target).toBe(0)
      expect(sends[1].gain.target).toBeGreaterThan(1)
    })

    test("the reverberation goes to the same compressor as the voices, so that the whole does not clip", () => {
      const audio = playing()
      audio.setVoices([voice({ distanceKm: 30 })])
      const wet = made.convolvers[0].connections[0] as FakeGain
      expect(wet.connections[0]).toBe(made.compressors[0])
    })

    test("is made once, whatever the number of voices", () => {
      const audio = playing()
      audio.setVoices([voice({ id: "a", distanceKm: 20 }), voice({ id: "b", distanceKm: 30 }), voice({ id: "c", distanceKm: 40 })])
      expect(made.convolvers).toHaveLength(1)
    })
  })

  test("makes no room where the context has none, and the voices still play", () => {
    const audio = playing()
    expect(() => audio.setVoices([voice({ distanceKm: 40 })])).not.toThrow()
    expect(made.convolvers).toHaveLength(0)
  })

  test("a propeller's hum is in the lowest band, and stays when the highs have gone", () => {
    const audio = playing()
    audio.setVoices([voice({ kind: "regional-turboprop", bandAmplitudes: [0.2, 0.1, 0, 0, 0, 0, 0, 0], character: { toneHz: 80, toneShare: 0.5 } })])
    expect(made.gains[11].gain.target).toBeCloseTo(0.5 * 0.16 * 0.2 * unweight(63), 9)
  })

  test("a far sound wanders, as the air between does, and a near one does not", () => {
    const audio = playing()
    audio.setVoices([voice({ id: "near", distanceKm: 2 })])
    // A voice with a tone has seventeen gains: the master, the beat and its swing, eight bands, three tones, then the wander and the two roughnesses.
    const nearWander = made.gains[14]
    audio.setVoices([voice({ id: "near", distanceKm: 2 }), voice({ id: "far", distanceKm: 40 })])
    const farWander = made.gains[17 + 14]
    expect(nearWander.gain.target).toBe(0)
    expect(farWander.gain.target).toBeGreaterThan(0)
    // Two slow oscillators on each voice, at rates that do not repeat.
    expect(made.oscillators.filter(oscillator => oscillator.frequency.value === 0.13)).toHaveLength(2)
    expect(made.oscillators.filter(oscillator => oscillator.frequency.value === 0.31)).toHaveLength(2)
  })

  test("a far sound is not placed so sharply to one side as a near one", () => {
    const audio = playing()
    audio.setVoices([voice({ id: "near", azimuthDeg: 90, distanceKm: 2 }), voice({ id: "far", azimuthDeg: 90, distanceKm: 40 })], 0)
    expect(made.panners[0].pan.target).toBeCloseTo(0.9, 6)
    expect(made.panners[1].pan.target).toBeCloseTo(0.9 * 0.5, 6)
  })

  test("is never louder than the saturation, and approaches it smoothly: a louder aircraft is still louder", () => {
    // The strength of the whole is that of the bands as they are played, with the ear's weighting taken off.
    const rmsOf = (amplitude: number) => Math.sqrt(CENTRES.reduce((sum, centre) => sum + (amplitude * unweight(centre)) ** 2, 0))
    const played = (amplitude: number) => {
      for (const list of Object.values(made)) list.length = 0
      const audio = playing()
      audio.setVoices([voice({ bandAmplitudes: Array(8).fill(amplitude) })])
      return rmsOf(amplitude) * made.gains[0].gain.target!
    }
    // Quiet: played as asked. Loud: brought toward 0.7, never past it, and the louder the nearer to it.
    expect(played(0.001)).toBeCloseTo(rmsOf(0.001), 3)
    expect(played(0.5)).toBeLessThan(0.7)
    expect(played(0.5)).toBeGreaterThan(played(0.2))
    expect(played(2)).toBeLessThan(0.7)
    expect(played(2)).toBeGreaterThan(played(0.5))
    expect(played(10)).toBeLessThanOrEqual(0.7)
    expect(played(10)).toBeGreaterThanOrEqual(played(2))
  })

  test("sends every voice through one compressor, so that several at once do not clip together", () => {
    const audio = playing()
    audio.setVoices([voice({ id: "a" }), voice({ id: "b" })])
    expect(made.compressors).toHaveLength(1)
    expect(made.panners.every(panner => panner.connections[0] === made.compressors[0])).toBe(true)
    // Through the master gain, which the player's volume sets, and only then the speakers.
    expect(made.masters).toHaveLength(1)
    expect(made.compressors[0].connections[0]).toBe(made.masters[0])
    expect(made.masters[0].connections[0]).toBe(made.contexts[0].destination)
  })

  describe("the player's volume and mute button", () => {
    /** The last gain before the speakers. */
    const masterOf = () => made.masters[0]

    test("is heard at full level until it is told otherwise", () => {
      const audio = playing()
      audio.setVoices([voice()])
      expect(masterOf().gain.value).toBe(1)
    })

    test("silences everything when muted, and gives it back when it is not, without touching the voices", () => {
      const audio = playing()
      audio.setVoices([voice({ id: "a" })])
      audio.setLevel(0)
      expect(masterOf().gain.value).toBe(0)
      expect(made.sources.every(source => !source.stopped)).toBe(true)
      audio.setLevel(0.6)
      expect(masterOf().gain.value).toBe(0.6)
    })

    test("is honoured when it was set before anything was heard: a reader who muted the player first", () => {
      const audio = new AircraftAudio()
      audio.setLevel(0)
      audio.resume()
      audio.setPaused(false)
      audio.setVoices([voice()])
      expect(masterOf().gain.value).toBe(0)
    })
  })

  test("a voice that is no longer heard fades out, and is taken down once it has", () => {
    const audio = playing()
    audio.setVoices([voice()])
    const master = made.gains[0]
    audio.setVoices([])
    expect(master.gain.target).toBe(0)
    expect(made.sources[0].stopped).toBe(false)
    vi.advanceTimersByTime(2000)
    expect(made.sources[0].stopped).toBe(true)
    expect(master.disconnected).toBe(true)
  })

  test("is silent while the observation's clock is stopped, and heard again when it runs", () => {
    const audio = playing()
    audio.setVoices([voice()])
    audio.setPaused(true)
    expect(made.gains[0].gain.target).toBe(0)
    audio.setPaused(false)
    expect(made.sources.length).toBeGreaterThanOrEqual(2)
  })

  test("two aircraft are two voices, and each its own", () => {
    const audio = playing()
    audio.setVoices([voice({ id: "a" }), voice({ id: "b", dopplerRatio: 1.2 })])
    expect(made.sources.filter(source => source.started)).toHaveLength(6)
    expect(bandFilters()).toHaveLength(32)
  })

  test("a voice asked for again is not built again, only retargeted", () => {
    const audio = playing()
    audio.setVoices([voice()])
    audio.setVoices([voice({ dopplerRatio: 1.3 })])
    expect(made.sources.filter(source => source.started)).toHaveLength(3)
    expect(bandFilters()[0].frequency.target).toBeCloseTo(63 * Math.sqrt(1.3), 6)
  })

  test("closes its context when it is disposed of", () => {
    const audio = playing()
    audio.setVoices([voice()])
    audio.dispose()
    expect(made.contexts[0].closed).toBe(true)
  })

  test("stays silent where there is no Web Audio at all", () => {
    vi.stubGlobal("AudioContext", undefined)
    const audio = new AircraftAudio()
    expect(() => {
      audio.resume()
      audio.setPaused(false)
      audio.setVoices([voice()])
    }).not.toThrow()
  })
})
