import { SoundInAir } from "../src/engine/traffic/SoundInAir.js"

/** What a recording of an aircraft is made of, as far as what we play can be held to it (see build-aircraft-sound-reference). */
export interface AircraftSoundMeasure {
  durationS: number
  /** The power in each octave band of SoundInAir.OCTAVES, dB under the whole: as the microphone took it, with no weighting. */
  octaveShapeDb: number[]
  /** The lines that stand out of the noise around them, strongest first: a fan, a propeller, a piston engine. */
  tones: { hz: number; prominenceDb: number }[]
  /**
   * How much the loudness flickers, dB: the root mean square of the level over 10 ms less its average over a second, while the aircraft is
   * within FLUCTUATION_RANGE_DB of its loudest. Most of it is the noise's own, since a noise of a few hundred hertz of bandwidth measured over
   * 10 ms is not steady: `unmodulatedFluctuationDb` says how much a noise of the same spectrum with nothing to modulate it gives.
   */
  fluctuationDb: number
  unmodulatedFluctuationDb: number
  /**
   * The periodic beat of its loudness, if it has one: the rate, Hz, between MODULATION_MIN_HZ and MODULATION_MAX_HZ, at which the noise
   * between 250 Hz and 1 kHz swells and falls, and how much (the index m of an amplitude modulation, (1 + m cos) × the noise). A piston engine's
   * firings and a propeller's blades beat a noise this way, and a jet's roar does not: in a jet, what is measured is the measure's own floor.
   */
  modulation: { hz: number; depth: number }
}

/**
 * The measures of a recording that a synthesized aircraft is calibrated against: its spectrum by octaves, its tones, and how rough it is.
 *
 * A recording is a datum of the SOUND HEARD, not of the aircraft: it was taken at a distance nobody wrote down, through a microphone and an
 * encoder, and maybe edited. So it says the shape of what reaches an ear, which the model is held to after it has carried its source that far
 * (see AircraftSoundCalibration.test.ts), and never a source level.
 */
export class AircraftSoundAnalysis {
  /** The length of a spectrum's window, samples: at 22 050 Hz, a resolution of 2.7 Hz, fine enough to tell a propeller's harmonics apart. */
  static readonly WINDOW = 8192
  /** A tone is a line that stands this far above the median of the spectrum around it, dB, over TONE_NEIGHBOURHOOD bins on each side. */
  static readonly TONE_PROMINENCE_DB = 12
  static readonly TONE_NEIGHBOURHOOD = 40
  /** Lines nearer each other than this, as a fraction of their frequency, are one line: the side peaks of a wavering one. */
  static readonly TONE_MERGE = 0.03
  static readonly MAX_TONES = 6
  /** The span a loudness is measured over, s, and the span its average is taken over, s, which the flicker is measured against. */
  static readonly LEVEL_STEP_S = 0.01
  static readonly AVERAGE_S = 1
  /** Only while it is this near its loudest second, dB: the aircraft, and not the background before and after it. */
  static readonly FLUCTUATION_RANGE_DB = 15

  /** All the measures of one recording, mono, at `sampleRate`. `random` draws the phases of the unmodulated noise: seeded, for a measure that repeats. */
  static measure(samples: Float32Array, sampleRate: number, random: () => number = Math.random): AircraftSoundMeasure {
    const power = AircraftSoundAnalysis.averageSpectrum(samples)
    return {
      durationS: samples.length / sampleRate,
      octaveShapeDb: AircraftSoundAnalysis.octaveShapeDb(power, sampleRate),
      tones: AircraftSoundAnalysis.tones(power, sampleRate),
      fluctuationDb: AircraftSoundAnalysis.fluctuationDb(samples, sampleRate),
      unmodulatedFluctuationDb: AircraftSoundAnalysis.fluctuationDb(AircraftSoundAnalysis.unmodulated(samples, random), sampleRate),
      modulation: AircraftSoundAnalysis.modulation(samples, sampleRate)
    }
  }

  /** The span the beat is measured over, samples: about six seconds at 22 050 Hz, the loudest of the recording. */
  static readonly MODULATION_WINDOW = 1 << 17
  static readonly MODULATION_MIN_HZ = 50
  static readonly MODULATION_MAX_HZ = 200
  /** An engine's rate wanders: the beat's power is summed this far either side of its peak, Hz. */
  static readonly MODULATION_SPREAD_HZ = 3

  /** The beat of the loudness (see AircraftSoundMeasure.modulation), over the loudest MODULATION_WINDOW of the recording. */
  static modulation(samples: Float32Array, sampleRate: number): { hz: number; depth: number } {
    const n = AircraftSoundAnalysis.MODULATION_WINDOW
    // The loudest stretch: the aircraft at its nearest.
    let start = 0
    let loudest = -1
    for (let at = 0; at + n <= samples.length; at += 4096) {
      let energy = 0
      for (let i = at; i < at + n; i += 16) energy += samples[i] ** 2
      if (energy > loudest) {
        loudest = energy
        start = at
      }
    }
    const re = new Float64Array(n)
    const im = new Float64Array(n)
    for (let i = 0; i < n; i++) re[i] = samples[start + i] ?? 0
    // The noise between 250 Hz and 1 kHz, where the beat is heard, and not the lows, where it is a tone of its own; nor the highs, where a
    // jet's own flicker is as strong (measured from 1 to 4 kHz, a jet passing over beats as much as a small aircraft does).
    AircraftSoundAnalysis.fft(re, im)
    for (let k = 0; k < n; k++) {
      const hz = Math.min(k, n - k) * sampleRate / n
      if (hz < 250 || hz > 1000) re[k] = im[k] = 0
    }
    AircraftSoundAnalysis.fft(re, im, true)
    // Its power over time, around its mean, under a Hann window; and the spectrum of that.
    let mean = 0
    for (let i = 0; i < n; i++) mean += re[i] * re[i]
    mean /= n
    const envelope = new Float64Array(n)
    const zero = new Float64Array(n)
    for (let i = 0; i < n; i++) envelope[i] = (re[i] * re[i] / mean - 1) * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / n))
    AircraftSoundAnalysis.fft(envelope, zero)
    const lines: [number, number][] = []
    for (let k = 1; k < n / 2; k++) {
      const hz = k * sampleRate / n
      if (hz >= AircraftSoundAnalysis.MODULATION_MIN_HZ && hz <= AircraftSoundAnalysis.MODULATION_MAX_HZ) lines.push([hz, envelope[k] ** 2 + zero[k] ** 2])
    }
    const peak = lines.reduce((best, line) => line[1] > best[1] ? line : best, [0, 0])
    const floor = lines.map(line => line[1]).sort((a, b) => a - b)[lines.length >> 1]
    let power = 0
    for (const [hz, value] of lines) if (Math.abs(hz - peak[0]) <= AircraftSoundAnalysis.MODULATION_SPREAD_HZ) power += value - floor
    // A cosine of amplitude a has (a n / 4)² × 1.5 of power over the bins of a Hann window; the power of (1 + m cos)² noise beats at a = 2m / (1 + m²/2).
    const a = (4 * Math.sqrt(Math.max(0, power) / 1.5)) / n
    const depth = a >= Math.SQRT2 ? 1 : (2 - Math.sqrt(4 - 2 * a * a)) / a
    return { hz: peak[0], depth: Number.isFinite(depth) ? depth : 0 }
  }

  /** The power spectrum averaged over the whole recording, Hann windows overlapping by half: WINDOW / 2 values. */
  static averageSpectrum(samples: Float32Array): Float64Array {
    const n = AircraftSoundAnalysis.WINDOW
    const power = new Float64Array(n / 2)
    const re = new Float64Array(n)
    const im = new Float64Array(n)
    for (let start = 0; start + n <= samples.length; start += n / 2) {
      for (let k = 0; k < n; k++) {
        re[k] = samples[start + k] * (0.5 - 0.5 * Math.cos((2 * Math.PI * k) / n))
        im[k] = 0
      }
      AircraftSoundAnalysis.fft(re, im)
      for (let k = 0; k < n / 2; k++) power[k] += re[k] * re[k] + im[k] * im[k]
    }
    return power
  }

  /** Each octave band's share of the power, dB: the bins between a centre over root two and a centre times root two. */
  static octaveShapeDb(power: Float64Array, sampleRate: number): number[] {
    const binHz = sampleRate / (2 * power.length)
    const bands = SoundInAir.OCTAVES.map(centre => {
      let sum = 0
      for (let k = 1; k < power.length; k++) {
        const hz = k * binHz
        if (hz >= centre / Math.SQRT2 && hz < centre * Math.SQRT2) sum += power[k]
      }
      return sum
    })
    const total = bands.reduce((a, b) => a + b, 0)
    return bands.map(band => 10 * Math.log10(band / total))
  }

  /** The lines between `minHz` and `maxHz` that stand TONE_PROMINENCE_DB above what is around them. */
  static tones(power: Float64Array, sampleRate: number, minHz = 30, maxHz = 5000): { hz: number; prominenceDb: number }[] {
    const binHz = sampleRate / (2 * power.length)
    const db = Array.from(power, p => 10 * Math.log10(p + 1e-30))
    const around = AircraftSoundAnalysis.TONE_NEIGHBOURHOOD
    const found: { hz: number; prominenceDb: number }[] = []
    const first = Math.max(around, Math.ceil(minHz / binHz))
    const last = Math.min(power.length - around - 1, Math.floor(maxHz / binHz))
    for (let k = first; k <= last; k++) {
      if (db[k] < db[k - 1] || db[k] < db[k + 1]) continue
      const neighbours = db.slice(k - around, k + around + 1).sort((a, b) => a - b)
      const prominenceDb = db[k] - neighbours[around]
      if (prominenceDb >= AircraftSoundAnalysis.TONE_PROMINENCE_DB) found.push({ hz: k * binHz, prominenceDb })
    }
    found.sort((a, b) => b.prominenceDb - a.prominenceDb)
    const kept: { hz: number; prominenceDb: number }[] = []
    for (const tone of found) {
      if (kept.some(other => Math.abs(other.hz - tone.hz) < AircraftSoundAnalysis.TONE_MERGE * other.hz)) continue
      kept.push({ hz: Math.round(tone.hz), prominenceDb: Math.round(tone.prominenceDb) })
      if (kept.length === AircraftSoundAnalysis.MAX_TONES) break
    }
    return kept
  }

  /** How much the level flickers about its average over a second, dB, while the sound is near its loudest (see AircraftSoundMeasure.fluctuationDb). */
  static fluctuationDb(samples: Float32Array, sampleRate: number): number {
    const step = Math.floor(sampleRate * AircraftSoundAnalysis.LEVEL_STEP_S)
    const levels: number[] = []
    for (let start = 0; start + step <= samples.length; start += step) {
      let sum = 0
      for (let k = 0; k < step; k++) sum += samples[start + k] * samples[start + k]
      levels.push(10 * Math.log10(sum / step + 1e-12))
    }
    const half = Math.round(AircraftSoundAnalysis.AVERAGE_S / AircraftSoundAnalysis.LEVEL_STEP_S / 2)
    const averages = levels.map((_, i) => {
      let sum = 0
      let count = 0
      for (let j = Math.max(0, i - half); j < Math.min(levels.length, i + half); j++) {
        sum += levels[j]
        count++
      }
      return sum / count
    })
    let top = -Infinity
    for (const average of averages) top = Math.max(top, average)
    let squares = 0
    let count = 0
    levels.forEach((level, i) => {
      if (averages[i] <= top - AircraftSoundAnalysis.FLUCTUATION_RANGE_DB) return
      squares += (level - averages[i]) ** 2
      count++
    })
    return count ? Math.sqrt(squares / count) : 0
  }

  /**
   * The same recording with nothing modulating it: its spectrum over the whole of it, with every phase drawn anew. What flickers in it is
   * what any noise of that spectrum flickers by, which the recording's own flicker is to be compared with.
   */
  static unmodulated(samples: Float32Array, random: () => number = Math.random): Float32Array {
    let n = 1
    while (n < samples.length) n <<= 1
    const re = new Float64Array(n)
    const im = new Float64Array(n)
    re.set(samples)
    AircraftSoundAnalysis.fft(re, im)
    for (let k = 1; k < n / 2; k++) {
      const magnitude = Math.hypot(re[k], im[k])
      const phase = random() * 2 * Math.PI
      re[k] = magnitude * Math.cos(phase)
      im[k] = magnitude * Math.sin(phase)
      re[n - k] = re[k]
      im[n - k] = -im[k]
    }
    AircraftSoundAnalysis.fft(re, im, true)
    return Float32Array.from(re.subarray(0, samples.length), value => value / n)
  }

  /** An in-place radix-2 Fourier transform of a length that is a power of two; the inverse is not divided by the length. */
  static fft(re: Float64Array, im: Float64Array, inverse = false): void {
    const n = re.length
    for (let i = 1, j = 0; i < n; i++) {
      let bit = n >> 1
      for (; j & bit; bit >>= 1) j ^= bit
      j ^= bit
      if (i < j) {
        ;[re[i], re[j]] = [re[j], re[i]]
        ;[im[i], im[j]] = [im[j], im[i]]
      }
    }
    for (let length = 2; length <= n; length <<= 1) {
      const angle = ((inverse ? 2 : -2) * Math.PI) / length
      const half = length / 2
      for (let i = 0; i < n; i += length) {
        for (let k = 0; k < half; k++) {
          const c = Math.cos(angle * k)
          const s = Math.sin(angle * k)
          const xr = re[i + k + half] * c - im[i + k + half] * s
          const xi = re[i + k + half] * s + im[i + k + half] * c
          re[i + k + half] = re[i + k] - xr
          im[i + k + half] = im[i + k] - xi
          re[i + k] += xr
          im[i + k] += xi
        }
      }
    }
  }
}
