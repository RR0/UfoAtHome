import { SoundInAir } from "../engine/traffic/SoundInAir.js"
import type { AircraftVoice } from "../engine/traffic/TrafficSound.js"
import { AudioUnlock } from "./AudioUnlock.js"

/** How fast a voice follows a new state, as setTargetAtTime's time constant: slower than a vehicle's, for a sound that sweeps. */
const SMOOTHING_S = 0.25
const RELEASE_S = 0.4
/** Long enough that the ear does not catch the loop of a steady noise as a repetition. */
const NOISE_SECONDS = 6
/** The slow random fluctuation of a noise, as a table of values this many seconds long, at this many values a second, which are read round and round. */
const ROUGH_SECONDS = 12
const ROUGH_VALUES_PER_SECOND = 3
/**
 * What a jet's loudness fluctuates by, as a fraction of it, unless its class says otherwise: a little. Its sound is steady, and the fluctuations
 * it has are rare and slow: the table they are read from is mostly small values with the occasional large one (see roughTable).
 */
const DEFAULT_ROUGHNESS = 0.2
/** The faster crackle laid over the slow swell, as a fraction of the roughness, and the values it takes a second. */
const CRACKLE_SHARE = 0.2
const CRACKLE_VALUES_PER_SECOND = 24
/** How many harmonics a tone has: a fan or a propeller sings in several, and each is heard as far as its own band reaches. */
const HARMONICS = 3
/**
 * The most the A-weighting is taken back by, dB. The levels the bands are given in are A-weighted — the ear's sensitivity, which takes 26 dB off 63 Hz
 * and 16 off 125 — and a sound played with the weighting still on it has lost its lows and is a hiss: a wind tunnel. The real noise of an aircraft has
 * as much below 500 Hz as above, so the weighting is taken off each band. Not all of it, though: what 63 Hz asks is more than a speaker can give, and
 * would take the whole level down with it.
 */
const MAX_UNWEIGHT_DB = 12
/**
 * An octave band's filter is two band-pass filters in a row, each with this Q (a band a little over an octave wide), which together are about an octave
 * wide and fall away twice as steeply on both sides. One filter of an octave's width falls at only 6 dB an octave, and the strong bands of a sound
 * overflow into the weak ones: the highs, which the air has taken away, came back out of the mids' skirts, as a hiss.
 */
const STAGE_Q = 1
/**
 * The pitch shifts played, beyond which the Doppler effect of a fast aircraft is a swoop and not a hum. A tone is shifted by the whole of it, within
 * these limits; a broad noise only by the root of it, and within narrower ones, since its spectrum is smooth and the ear hears no pitch in it: a whole
 * shift of its bands moves the rumble up into the mids, and a receding aircraft's rumble is not the high hiss of an approaching one.
 */
const MIN_PITCH = 0.7
const MAX_PITCH = 1.5
const MIN_NOISE_SHIFT = 0.8
const MAX_NOISE_SHIFT = 1.3
/** How far to one side a sound is placed: all the way would be a sound in one ear. */
const MAX_PAN = 0.9
/**
 * What makes a far sound far, besides what the air takes from its highs (which the bands already say): it is not placed so sharply, and its loudness
 * wanders as the air between wanders, a few decibels over some seconds. Nothing of either within NEAR_KM; the whole of it by FAR_KM.
 */
const NEAR_KM = 5
const FAR_KM = 25
/** How much less a far sound is placed to one side than a near one, as a fraction of the pan. */
const FAR_PAN_LOSS = 0.5
/** How much a far sound's loudness wanders, as a fraction of it, and the slow rates it does so at, Hz (not multiples of one another, so that it does not repeat). */
const FAR_WANDER = 0.12
const WANDER_RATES_HZ = [0.13, 0.31]
/**
 * What a tone's amplitude is multiplied by, against a band's, for the tone to be `share` as strong as the noise in its band: white noise of full scale has a
 * root-mean-square of 0.577, of which a band filter keeps the root of its bandwidth over the whole (see REFERENCE_BAND_HZ: about a fifth), and a sine of
 * amplitude one has one of 0.707. So a tone given the band's own amplitude is nearly ten times stronger than the band, and a hum of that
 * amplitude is a sine wave with a little noise round it, which is what a far jet is not.
 */
const TONE_AMPLITUDE = 0.16
/**
 * What makes a far sound far, and not merely quiet: it arrives in a room's worth of reflections, which grow as the direct sound weakens. This is the
 * most of a sound that is sent to the reverberation.
 */
const REVERB_SEND = 1.6
/** How long the reverberation lasts, s, and how fast it dies away (a time constant), s: a long tail, as in the open air and over distance, where a sound comes back off the ground and the hills. */
const REVERB_SECONDS = 3.6
const REVERB_DECAY_S = 1.1
/** How much quieter a sound at FAR_KM is played than its level says, as a fraction: distance takes more than the decibels do. */
const FAR_QUIETING = 0.3
/** The frequency of the band that equal noise amplitude per band is referred to. */
const REFERENCE_BAND_HZ = 1000
/**
 * The loudest a voice is played, as the root of its bands' amplitudes: below it a voice is played as strong as it is asked, and approaching it
 * it is brought down smoothly, so that a close aircraft is louder than a nearer one still and never clips, and two of them together have room.
 */
const SATURATION = 0.7

interface Voice {
  sources: AudioScheduledSourceNode[]
  nodes: AudioNode[]
  filters: BiquadFilterNode[]
  /** The second stage of each band's filter. */
  seconds: BiquadFilterNode[]
  gains: GainNode[]
  lfo: OscillatorNode
  lfoDepth: GainNode
  /** What makes a far sound wander: two slow oscillators, added to the voice's own gain. */
  wander: OscillatorNode[]
  wanderDepth: GainNode
  /** The tones and their harmonics, each with its own gain: the whine, and the hum of the engine turning, whose base frequencies and strengths they carry. */
  tones: { oscillator: OscillatorNode; gain: GainNode; harmonic: number; baseHz: number; share: number }[]
  /** What makes a noise rough: a slow random table and a faster one, added to the loudness. */
  roughDepth: GainNode
  crackleDepth: GainNode
  beat: GainNode
  output: GainNode
  panner?: StereoPannerNode
  /** How much of the voice is sent to the reverberation. */
  send?: GainNode
}

/**
 * What an aircraft sounds like, played: the broad noise its class makes, in the strength of each octave band that reaches the listener
 * (see TrafficSound.bandAmplitudes), shifted in pitch by the Doppler effect, and placed where it comes from — behind where the aircraft
 * is seen, since that is where it was when it made the sound (see AircraftHearing).
 *
 * Synthesized, like a vehicle's (see VehicleAudio): white noise through eight band filters, which is how a sound with a spectrum and no
 * tone is made, and over it what the class has besides — a helicopter's rotor beating the air, a propeller's or an engine's hum, a fan's
 * whine, a drone's whistle (see AircraftSoundCharacter). A voice that is not in the list fades out. Heard only while the observation's
 * clock runs, like the weather (see WeatherAudio.paused).
 *
 * Its own module, and brought in with the aircraft that need it (see trafficRuntime): a scene without aircraft never loads it.
 */
export class AircraftAudio {
  private context?: AudioContext
  private noiseBuffer?: AudioBuffer
  private readonly roughBuffers = new Map<number, AudioBuffer>()
  private readonly voices = new Map<string, Voice>()
  /** Where every voice goes, and where several aircraft at once are kept from clipping together. */
  private bus?: AudioNode
  /** Where the reverberation goes in: the room a far sound arrives in. */
  private reverb?: AudioNode
  private reverbOut?: AudioNode
  /** What the reader's volume and mute button say, 0 to 1, over everything it plays: the last gain before the speakers. */
  private level = 1
  private master?: GainNode
  private paused = true
  private requested: AircraftVoice[] = []
  private headingDeg = 0

  resume(): void {
    if (!this.context) {
      if (typeof AudioContext === "undefined") return
      try {
        this.context = new AudioContext()
      } catch (error) {
        console.warn("AircraftAudio: Web Audio unavailable, aircraft stay silent:", error)
        return
      }
    }
    AudioUnlock.unlock(this.context)
    this.apply()
  }

  /** How loud everything is, 0 (muted) to 1, without touching what it is doing: the player's volume and its mute button. */
  setLevel(level: number): void {
    this.level = level
    if (this.master) this.master.gain.value = level
  }

  setPaused(paused: boolean): void {
    if (paused === this.paused) return
    this.paused = paused
    this.apply()
  }

  /** The aircraft heard now, and the way the listener faces (degrees from north), which decides which ear they are nearer. A voice not in the list fades out. */
  setVoices(voices: AircraftVoice[], listenerHeadingDeg = 0): void {
    this.requested = voices
    this.headingDeg = listenerHeadingDeg
    this.apply()
  }

  dispose(): void {
    for (const id of [...this.voices.keys()]) this.release(id)
    void this.context?.close()
    this.context = undefined
    this.master = undefined
    this.bus = undefined
  }

  private apply(): void {
    const context = this.context
    if (!context) return
    const wanted = this.paused ? [] : this.requested
    const ids = new Set(wanted.map(voice => voice.id))
    for (const id of [...this.voices.keys()]) if (!ids.has(id)) this.release(id)
    for (const voice of wanted) {
      const built = this.voices.get(voice.id) ?? this.build(context, voice)
      this.retarget(context, built, voice)
    }
  }

  private build(context: AudioContext, voice: AircraftVoice): Voice {
    const output = context.createGain()
    output.gain.value = 0
    let panner: StereoPannerNode | undefined
    const bus = this.busOf(context)
    if (typeof context.createStereoPanner === "function") {
      panner = context.createStereoPanner()
      output.connect(panner).connect(bus)
    } else output.connect(bus)

    // The beat: a rotor's blades make the loudness swell and fall at their own rate, between full and (1 - depth) of it.
    const beat = context.createGain()
    const depth = voice.character?.modulationDepth ?? 0
    beat.gain.value = 1 - depth / 2
    const lfo = context.createOscillator()
    lfo.type = "sine"
    const lfoDepth = context.createGain()
    lfoDepth.gain.value = depth / 2
    lfo.connect(lfoDepth).connect(beat.gain)
    beat.connect(output)

    // The noise, through one band filter and one gain per octave.
    const source = context.createBufferSource()
    source.buffer = this.noise(context)
    source.loop = true
    source.loopStart = Math.random() * NOISE_SECONDS * 0.5
    const filters: BiquadFilterNode[] = []
    const seconds: BiquadFilterNode[] = []
    const gains: GainNode[] = []
    for (const centre of SoundInAir.OCTAVES) {
      const filter = context.createBiquadFilter()
      filter.type = "bandpass"
      filter.frequency.value = centre
      filter.Q.value = STAGE_Q
      const second = context.createBiquadFilter()
      second.type = "bandpass"
      second.frequency.value = centre
      second.Q.value = STAGE_Q
      const gain = context.createGain()
      gain.gain.value = 0
      source.connect(filter).connect(second).connect(gain).connect(beat)
      filters.push(filter)
      seconds.push(second)
      gains.push(gain)
    }

    // The tone it carries, if it carries one, and its harmonics: out of the beat, since a hum does not swell with the blades. Each has its own gain,
    // because each is in its own band, and the air takes the higher bands away first.
    const tones: Voice["tones"] = []
    for (const [baseHz, share] of [[voice.character?.toneHz, voice.character?.toneShare], [voice.character?.humHz, voice.character?.humShare]] as const) {
      if (baseHz === undefined) continue
      for (let harmonic = 1; harmonic <= HARMONICS; harmonic++) {
        const oscillator = context.createOscillator()
        oscillator.type = "sine"
        oscillator.frequency.value = baseHz * harmonic
        const gain = context.createGain()
        gain.gain.value = 0
        oscillator.connect(gain).connect(output)
        tones.push({ oscillator, gain, harmonic, baseHz, share: share ?? 0 })
      }
    }

    // The air between wanders slowly, and a far sound with it: two slow oscillators laid on its gain.
    const wanderDepth = context.createGain()
    wanderDepth.gain.value = 0
    wanderDepth.connect(output.gain)
    const wander = WANDER_RATES_HZ.map(rate => {
      const oscillator = context.createOscillator()
      oscillator.type = "sine"
      oscillator.frequency.value = rate
      oscillator.connect(wanderDepth)
      return oscillator
    })

    // The roughness: a slow random table, laid on the loudness. A noise that held perfectly steady is what a wind tunnel makes; the roar of a
    // jet crackles, with the turbulence of its exhaust and of the air it crosses.
    const roughDepth = context.createGain()
    roughDepth.gain.value = voice.character?.roughness ?? DEFAULT_ROUGHNESS
    const rough = context.createBufferSource()
    rough.buffer = this.roughTable(context, ROUGH_VALUES_PER_SECOND)
    rough.loop = true
    rough.loopStart = Math.random() * ROUGH_SECONDS * 0.5
    rough.connect(roughDepth).connect(beat.gain)
    // And over the swell, a crackle: the same, faster and shallower.
    const crackleDepth = context.createGain()
    crackleDepth.gain.value = (voice.character?.roughness ?? DEFAULT_ROUGHNESS) * CRACKLE_SHARE
    const crackle = context.createBufferSource()
    crackle.buffer = this.roughTable(context, CRACKLE_VALUES_PER_SECOND)
    crackle.loop = true
    crackle.loopStart = Math.random() * ROUGH_SECONDS * 0.5
    crackle.connect(crackleDepth).connect(beat.gain)

    // And some of it to the reverberation, where there is one: the farther it is, the more.
    let send: GainNode | undefined
    const reverb = this.busOf(context) && this.reverb
    if (reverb) {
      send = context.createGain()
      send.gain.value = 0
      output.connect(send).connect(reverb)
    }

    const sources = [source, rough, crackle, lfo, ...tones.map(tone => tone.oscillator), ...wander]
    for (const node of sources) node.start()
    const built: Voice = {
      nodes: [output, beat, lfoDepth, roughDepth, crackleDepth, wanderDepth, ...tones.map(tone => tone.gain), ...filters, ...seconds, ...gains, ...(send ? [send] : []), ...(panner ? [panner] : []), ...sources],
      sources, filters, seconds, gains, tones, lfo, lfoDepth, wander, wanderDepth, roughDepth, crackleDepth, beat, output, panner, send
    }
    this.voices.set(voice.id, built)
    return built
  }

  private retarget(context: AudioContext, built: Voice, voice: AircraftVoice): void {
    const now = context.currentTime
    const set = (param: AudioParam, value: number) => param.setTargetAtTime(value, now, SMOOTHING_S)
    const pitch = Math.min(MAX_PITCH, Math.max(MIN_PITCH, voice.dopplerRatio))
    const noisePitch = Math.min(MAX_NOISE_SHIFT, Math.max(MIN_NOISE_SHIFT, Math.sqrt(voice.dopplerRatio)))
    const highest = context.sampleRate * 0.45
    // What each band is to be played at, with the ear's weighting taken back off: the amplitudes come in A-weighted, as the ear takes them, and
    // are played as the air carries them.
    const played = voice.bandAmplitudes.map((amplitude, i) => amplitude * AircraftAudio.unweighting(SoundInAir.OCTAVES[i]))
    // The strength of the whole: the root of the sum of the squares of the bands, as noises in different bands add.
    const rms = Math.sqrt(played.reduce((sum, amplitude) => sum + amplitude * amplitude, 0))
    // The farther it is, the more it wanders and the less it is placed.
    const far = Math.min(1, Math.max(0, (voice.distanceKm - NEAR_KM) / (FAR_KM - NEAR_KM)))
    SoundInAir.OCTAVES.forEach((centre, i) => {
      set(built.filters[i].frequency, Math.min(highest, centre * noisePitch))
      set(built.seconds[i].frequency, Math.min(highest, centre * noisePitch))
      // White noise through a band filter of constant Q carries power in proportion to the band's centre: the lower bands are
      // played louder by the root of it, so that each band comes out as strong as it was asked to be.
      set(built.gains[i].gain, played[i] * Math.sqrt(REFERENCE_BAND_HZ / centre))
    })
    const character = voice.character
    for (const { oscillator, gain, harmonic, baseHz, share } of built.tones) {
      const frequency = baseHz * harmonic
      set(oscillator.frequency, frequency * pitch)
      // As strong as the band it is HEARD in is: the air takes a whine's frequency away with its band's, and a whine that outlived its band would
      // be a nearby sound among far ones, which a distant aircraft's does not do. Heard, that is, as shifted by the Doppler effect: an approaching
      // aircraft's whine is carried up into bands that the air has emptied, and is the weaker for it.
      const heardAt = frequency * pitch
      set(gain.gain, heardAt < highest ? share * TONE_AMPLITUDE * played[AircraftAudio.bandOf(heardAt)] / harmonic : 0)
    }
    if (character?.modulationHz !== undefined) set(built.lfo.frequency, character.modulationHz * pitch)
    // Never louder than SATURATION, and softly: the bands keep their proportions, and the whole its place among the louder and the quieter.
    const master = rms > 0 ? (SATURATION * (1 - Math.exp(-rms / SATURATION))) / rms : 1
    set(built.output.gain, master * (1 - FAR_QUIETING * far))
    set(built.wanderDepth.gain, master * FAR_WANDER * far / WANDER_RATES_HZ.length)
    if (built.send) set(built.send.gain, REVERB_SEND * far)
    if (built.panner) {
      const toward = ((voice.azimuthDeg - this.headingDeg) * Math.PI) / 180
      set(built.panner.pan, Math.max(-MAX_PAN, Math.min(MAX_PAN, Math.sin(toward))) * (1 - FAR_PAN_LOSS * far))
    }
  }

  /** What a band's amplitude is multiplied by to take the A-weighting back off it, up to MAX_UNWEIGHT_DB of it. */
  private static unweighting(frequencyHz: number): number {
    return 10 ** (Math.min(MAX_UNWEIGHT_DB, Math.max(0, -SoundInAir.aWeightingDb(frequencyHz))) / 20)
  }

  /** The octave band a frequency is in, by the nearest centre on a log scale. */
  private static bandOf(frequencyHz: number): number {
    let best = 0
    SoundInAir.OCTAVES.forEach((centre, i) => {
      if (Math.abs(Math.log(frequencyHz / centre)) < Math.abs(Math.log(frequencyHz / SoundInAir.OCTAVES[best]))) best = i
    })
    return best
  }

  /** A table of random values, between -1 and 1, smooth between them, `perSecond` of them a second: what a fluctuation is read from. */
  private roughTable(context: AudioContext, perSecond: number): AudioBuffer {
    const kept = this.roughBuffers.get(perSecond)
    if (kept) return kept
    const length = Math.floor(context.sampleRate * ROUGH_SECONDS)
    const buffer = context.createBuffer(1, length, context.sampleRate)
    const data = buffer.getChannelData(0)
    // Mostly small values and now and then a large one: the cube of a uniform value, so that the loudness is steady and only occasionally swells or falls.
    const values = Array.from({ length: ROUGH_SECONDS * perSecond }, () => (Math.random() * 2 - 1) ** 3)
    const step = context.sampleRate / perSecond
    for (let i = 0; i < data.length; i++) {
      // Smoothly between one value and the next, and the last into the first, so that the table can be read round and round.
      const at = i / step
      const k = Math.floor(at)
      const f = at - k
      const smooth = f * f * (3 - 2 * f)
      data[i] = values[k % values.length] * (1 - smooth) + values[(k + 1) % values.length] * smooth
    }
    this.roughBuffers.set(perSecond, buffer)
    return buffer
  }

  /** The impulse response of a room: noise that dies away, a little darker as it goes, the same in both ears but for its detail. */
  private roomImpulse(context: AudioContext): AudioBuffer {
    const length = Math.floor(context.sampleRate * REVERB_SECONDS)
    const buffer = context.createBuffer(2, length, context.sampleRate)
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel)
      let dark = 0
      for (let i = 0; i < length; i++) {
        const t = i / context.sampleRate
        // One-pole low-pass on the noise whose cutoff falls as the tail goes on: high frequencies die first in a room.
        const k = 0.6 * Math.exp(-t / (REVERB_DECAY_S * 2)) + 0.04
        dark += k * ((Math.random() * 2 - 1) - dark)
        data[i] = dark * Math.exp(-t / REVERB_DECAY_S)
      }
    }
    return buffer
  }

  private busOf(context: AudioContext): AudioNode {
    if (this.bus) return this.bus
    const master = context.createGain()
    master.gain.value = this.level
    master.connect(context.destination)
    this.master = master
    if (typeof context.createConvolver === "function") {
      const convolver = context.createConvolver()
      convolver.buffer = this.roomImpulse(context)
      // Quieter than the direct sound: what it adds is the room, not a second source.
      const wet = context.createGain()
      wet.gain.value = 0.9
      convolver.connect(wet)
      this.reverb = convolver
      this.reverbOut = wet
    }
    // A compressor, where there is one, ahead of the speakers: voices that are each within bounds can still add up past them.
    if (typeof context.createDynamicsCompressor === "function") {
      const compressor = context.createDynamicsCompressor()
      // Gentle, and only for peaks: the defaults (a threshold at -24 dB, twelve to one) would flatten the very fluctuations that make a noise a roar.
      compressor.threshold.value = -6
      compressor.knee.value = 3
      compressor.ratio.value = 4
      compressor.attack.value = 0.005
      compressor.release.value = 0.25
      compressor.connect(master)
      this.bus = compressor
    } else this.bus = master
    this.reverbOut?.connect(this.bus)
    return this.bus
  }

  private release(id: string): void {
    const voice = this.voices.get(id)
    if (!voice) return
    this.voices.delete(id)
    const context = this.context
    if (!context) return
    voice.output.gain.setTargetAtTime(0, context.currentTime, RELEASE_S / 3)
    setTimeout(() => {
      for (const source of voice.sources) {
        try {
          source.stop()
        } catch {
          // Already stopped.
        }
      }
      for (const node of voice.nodes) node.disconnect()
    }, RELEASE_S * 1000 * 3)
  }

  private noise(context: AudioContext): AudioBuffer {
    if (this.noiseBuffer) return this.noiseBuffer
    const buffer = context.createBuffer(1, context.sampleRate * NOISE_SECONDS, context.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    this.noiseBuffer = buffer
    return buffer
  }
}
