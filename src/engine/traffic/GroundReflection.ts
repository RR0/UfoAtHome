import { SoundInAir } from "./SoundInAir.js"

/** What lies under the listener, as far as sound goes, and how high their ears are over it. */
export interface Ground {
  /** Its effective flow resistivity, kPa s/m²: 10 to 30 for new snow, 150 to 300 for grass, 30 000 for asphalt (Embleton, Piercy and Daigle, 1983). */
  flowResistivityKPa: number
  /** m. */
  earHeightM: number
}

/** What a voice's echo off the ground is to be played as: a copy of it, later by `delayS`, as strong as `lowGain` in the lows and `highGain` in the highs. */
export interface GroundEcho {
  delayS: number
  lowGain: number
  highGain: number
  /** How much the delay wavers, s: the air between does, and a comb that held still would be a studio's phaser. */
  jitterS: number
}

/**
 * The sound of an aircraft reaches the ear twice: straight, and off the ground, later by the extra path 2 h sin ψ for ears at h under a sound
 * arriving at ψ above the horizon (far enough that its rays are parallel). The two interfere: a comb of notches, which slides as the aircraft
 * climbs in the sky, and which near the horizon, where the delay is nothing and the ground turns the echo over, cancels the lows.
 *
 * THE GROUND is told by its effective flow resistivity, the one parameter of the model of Delany and Bazley (1970) that Embleton, Piercy and Daigle
 * (1983) measured for outdoor surfaces: its impedance Z = 1 + 0.0571 X^-0.754 − i 0.087 X^-0.732 with X = ρ f / σ, and a plane wave's reflection
 * R = (Z sin ψ − 1) / (Z sin ψ + 1). (The model was fitted to fibrous materials over 0.01 < X < 1; outdoor grounds are well under, where it is
 * used all the same, as by Embleton et al.)
 *
 * NOT ALL OF IT INTERFERES: the turbulence of the air and the roughness of the ground scatter the echo, and only COHERENCE of it keeps its phase.
 * Fitted, on the Pixabay recordings (see scripts/build-aircraft-sound-reference.ts): their combs, at 3 to 6 ms, stand out of the noise in 6 to 26 % of
 * their frames, which a noise with an echo does at a coherent strength of 0.15 to 0.3, and Delany and Bazley give grass 0.4 to 0.7 from 1 to 4 kHz
 * at the elevations of a pass: some 0.4 of it is coherent. The rest is energy without a comb.
 */
export class GroundReflection {
  static readonly GRASS: Ground = { flowResistivityKPa: 200, earHeightM: 1.6 }
  static readonly COHERENCE = 0.4
  /** How much the echo's delay wavers, s: a tenth of a millisecond, enough that its comb shimmers and too little to blur it (see GroundEcho.jitterS). Assumed. */
  static readonly JITTER_S = 0.0001
  /**
   * Under this delay the comb's first notch is above a few hundred hertz and what the echo does is to take the lows away, which the levels say
   * (see excessDb): it is not played as an echo. It is played whole from ECHO_FROM_S.
   */
  static readonly ECHO_UNDER_S = 0.0005
  static readonly ECHO_FROM_S = 0.0015
  /** The frequencies an echo's lows and highs are told at, Hz. */
  static readonly LOW_HZ = 125
  static readonly HIGH_HZ = 2000
  private static readonly AIR_DENSITY = 1.2

  /** The reflection of a plane wave off `ground` at `frequencyHz`, arriving `elevationDeg` above the horizon: its real and imaginary parts. */
  static reflection(frequencyHz: number, elevationDeg: number, ground: Ground = GroundReflection.GRASS): { re: number; im: number } {
    const [zRe, zIm] = GroundReflection.impedance(frequencyHz, ground)
    return GroundReflection.reflected(zRe, zIm, Math.sin((Math.max(0, elevationDeg) * Math.PI) / 180))
  }

  /** The ground's normalized impedance at a frequency, by Delany and Bazley: real and imaginary parts. */
  static impedance(frequencyHz: number, ground: Ground = GroundReflection.GRASS): [number, number] {
    const x = (GroundReflection.AIR_DENSITY * frequencyHz) / (ground.flowResistivityKPa * 1000)
    return [1 + 0.0571 * x ** -0.754, -0.087 * x ** -0.732]
  }

  /** A plane wave's reflection off an impedance, at an elevation whose sine is `s`. */
  private static reflected(zRe: number, zIm: number, s: number): { re: number; im: number } {
    // (Z s − 1) / (Z s + 1)
    const [aRe, aIm, bRe, bIm] = [zRe * s - 1, zIm * s, zRe * s + 1, zIm * s]
    const d = bRe * bRe + bIm * bIm
    return { re: (aRe * bRe + aIm * bIm) / d, im: (aIm * bRe - aRe * bIm) / d }
  }

  /** How much later the echo arrives, s: its extra path, 2 h sin ψ, over the speed of sound. */
  static delayS(elevationDeg: number, ground: Ground = GroundReflection.GRASS, speedOfSound = 340): number {
    return (2 * ground.earHeightM * Math.sin((Math.max(0, elevationDeg) * Math.PI) / 180)) / speedOfSound
  }

  /**
   * What the ground does to each octave of SoundInAir.OCTAVES of a sound arriving `elevationDeg` above the horizon, dB, AGAINST what it does to one
   * from overhead: the levels a class is given are those measured at the ground under it, which have its ground in them already. The interference
   * of the coherent part, averaged over the octave, and the energy of the rest. Near the horizon the lows are cancelled; higher, where a comb has
   * many notches in an octave, it averages to nearly nothing.
   */
  static excessDb(elevationDeg: number, ground: Ground = GroundReflection.GRASS, speedOfSound = 340): number[] {
    const key = `${ground.flowResistivityKPa}|${ground.earHeightM}|${speedOfSound}`
    let overhead = GroundReflection.overheads.get(key)
    if (!overhead) GroundReflection.overheads.set(key, overhead = GroundReflection.bandsDb(90, ground, speedOfSound))
    return GroundReflection.bandsDb(elevationDeg, ground, speedOfSound).map((level, band) => level - overhead[band])
  }

  /** The echo to play of a sound arriving `elevationDeg` above the horizon, or none when it is too early to be heard as one (see ECHO_UNDER_S). */
  static echo(elevationDeg: number, ground: Ground = GroundReflection.GRASS, speedOfSound = 340): GroundEcho | undefined {
    const delayS = GroundReflection.delayS(elevationDeg, ground, speedOfSound)
    if (delayS <= GroundReflection.ECHO_UNDER_S) return undefined
    const x = Math.min(1, (delayS - GroundReflection.ECHO_UNDER_S) / (GroundReflection.ECHO_FROM_S - GroundReflection.ECHO_UNDER_S))
    const fade = x * x * (3 - 2 * x)
    const strength = (frequencyHz: number) => {
      const r = GroundReflection.reflection(frequencyHz, elevationDeg, ground)
      return fade * GroundReflection.COHERENCE * Math.hypot(r.re, r.im)
    }
    return { delayS, lowGain: strength(GroundReflection.LOW_HZ), highGain: strength(GroundReflection.HIGH_HZ), jitterS: GroundReflection.JITTER_S }
  }

  /** What each ground does overhead, by its resistivity, ear height and speed of sound: what every other elevation is told against. */
  private static readonly overheads = new Map<string, number[]>()
  /**
   * Each octave as its three thirds, each from `from` to `to` Hz with the ground's reflection taken at its centre, which no elevation changes the
   * impedance of: the comb is averaged over each third exactly, and the three are added as the octave's.
   */
  private static readonly thirds = SoundInAir.OCTAVES.map(centre => [-1, 0, 1].map(k => {
    const middle = centre * 2 ** (k / 3)
    return { middle, from: middle * 2 ** (-1 / 6), to: middle * 2 ** (1 / 6) }
  }))
  private static readonly impedances = new Map<number, [number, number][][]>()

  /**
   * What the ground adds to each octave, dB, against the sound alone: over a band, the mean of |1 + C R e^{-iωτ}|² + (1 − C²) |R|², which is
   * 1 + |R|² + 2C (Re R ⟨cos ωτ⟩ + Im R ⟨sin ωτ⟩), the means of the cosine and the sine over the band being had in closed form.
   */
  private static bandsDb(elevationDeg: number, ground: Ground, speedOfSound: number): number[] {
    const delay = GroundReflection.delayS(elevationDeg, ground, speedOfSound)
    const c = GroundReflection.COHERENCE
    const sine = Math.sin((Math.max(0, elevationDeg) * Math.PI) / 180)
    let impedances = GroundReflection.impedances.get(ground.flowResistivityKPa)
    if (!impedances) GroundReflection.impedances.set(ground.flowResistivityKPa, impedances = GroundReflection.thirds.map(band => band.map(third => GroundReflection.impedance(third.middle, ground))))
    return GroundReflection.thirds.map((band, b) => {
      let sum = 0
      band.forEach((third, k) => {
        const r = GroundReflection.reflected(impedances[b][k][0], impedances[b][k][1], sine)
        const span = 2 * Math.PI * delay * (third.to - third.from)
        const [meanCos, meanSin] = span < 1e-9 ? [1, 0] : [
          (Math.sin(2 * Math.PI * third.to * delay) - Math.sin(2 * Math.PI * third.from * delay)) / span,
          (Math.cos(2 * Math.PI * third.from * delay) - Math.cos(2 * Math.PI * third.to * delay)) / span
        ]
        sum += 1 + r.re * r.re + r.im * r.im + 2 * c * (r.re * meanCos + r.im * meanSin)
      })
      return 10 * Math.log10(sum / band.length)
    })
  }
}
