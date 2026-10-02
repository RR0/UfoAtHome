import type { VehicleProfile } from "../engine/model/Vehicle.js"
import type { DriveState } from "../engine/place/VehicleDrive.js"
import { AudioUnlock } from "./AudioUnlock.js"

/** One vehicle to be heard at this instant. */
export interface VehicleVoice {
  id: string
  profile: VehicleProfile
  state: DriveState
  /** How loud against an ordinary one of its kind — see ObserverVehicle.noise. */
  noise: number
  /** Heard from inside its cabin, or from outside at `distanceM`. */
  inside: boolean
  windowsOpen: boolean
  distanceM: number
}

/** How fast a voice follows a new state, as setTargetAtTime's time constant. */
const SMOOTHING_S = 0.08
const RELEASE_S = 0.15
const NOISE_SECONDS = 2
/** Beyond this a vehicle is not worth a voice. */
const MAX_AUDIBLE_M = 2000

interface Voice {
  nodes: AudioNode[]
  sources: AudioScheduledSourceNode[]
  firing: OscillatorNode
  crank: OscillatorNode
  knock: BiquadFilterNode
  engineGain: GainNode
  knockGain: GainNode
  roadGain: GainNode
  windGain: GainNode
  cabin: BiquadFilterNode
  output: GainNode
}

/**
 * What a vehicle sounds like: synthesized, from the state of its engine and its speed (see
 * VehicleDrive), the way SightingAudio synthesizes a described sound — nothing to fetch.
 *
 * Three noises, as anyone who has driven knows them apart: the ENGINE, a buzz at the rate its
 * cylinders fire (revolutions per second times half the cylinders) over the rumble of the crank,
 * louder as it pulls, with a diesel's knock; the ROAD, the tyres' low roar growing with speed; and
 * the WIND, a hiss growing as the square of it. Where it is heard from shapes all three: inside a
 * closed cabin the panels take the highs away and the wind is nearly gone; windows open, the road
 * and the wind come in; outside, it fades with distance and loses its highs to the air.
 *
 * Heard only while the observation's clock runs, like the weather (see WeatherAudio.paused).
 */
export class VehicleAudio {
  private context?: AudioContext
  private noiseBuffer?: AudioBuffer
  private readonly voices = new Map<string, Voice>()
  /** What the reader's volume and mute button say, 0 to 1, over everything it plays: the last gain before the speakers. */
  private level = 1
  private master?: GainNode
  private paused = true
  private requested: VehicleVoice[] = []

  resume(): void {
    if (!this.context) {
      if (typeof AudioContext === "undefined") return
      try {
        this.context = new AudioContext()
      } catch (error) {
        console.warn("VehicleAudio: Web Audio unavailable, vehicles stay silent:", error)
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

  /** The vehicles heard now. A voice not in the list fades out. */
  setVoices(voices: VehicleVoice[]): void {
    this.requested = voices
    this.apply()
  }

  dispose(): void {
    for (const id of [...this.voices.keys()]) this.release(id)
    void this.context?.close()
    this.context = undefined
    this.master = undefined
  }

  private masterOf(context: AudioContext): GainNode {
    if (!this.master) {
      this.master = context.createGain()
      this.master.gain.value = this.level
      this.master.connect(context.destination)
    }
    return this.master
  }

  private apply(): void {
    const context = this.context
    if (!context) return
    const wanted = this.paused ? [] : this.requested.filter(voice => voice.inside || voice.distanceM < MAX_AUDIBLE_M)
    const ids = new Set(wanted.map(voice => voice.id))
    for (const id of [...this.voices.keys()]) if (!ids.has(id)) this.release(id)
    for (const voice of wanted) {
      const built = this.voices.get(voice.id) ?? this.build(context, voice.id)
      this.retarget(context, built, voice)
    }
  }

  private build(context: AudioContext, id: string): Voice {
    const output = context.createGain()
    output.gain.value = 0
    const cabin = context.createBiquadFilter()
    cabin.type = "lowpass"
    cabin.connect(output).connect(this.masterOf(context))

    const firing = context.createOscillator()
    firing.type = "sawtooth"
    const crank = context.createOscillator()
    crank.type = "sine"
    const engineGain = context.createGain()
    const engineTone = context.createBiquadFilter()
    engineTone.type = "lowpass"
    engineTone.frequency.value = 900
    firing.connect(engineTone)
    crank.connect(engineTone)
    engineTone.connect(engineGain).connect(cabin)

    const noise = () => {
      const source = context.createBufferSource()
      source.buffer = this.noise(context)
      source.loop = true
      source.loopStart = Math.random() * NOISE_SECONDS * 0.5
      return source
    }
    const knockSource = noise()
    const knock = context.createBiquadFilter()
    knock.type = "bandpass"
    knock.Q.value = 4
    const knockGain = context.createGain()
    knockSource.connect(knock).connect(knockGain).connect(cabin)

    const roadSource = noise()
    const roadFilter = context.createBiquadFilter()
    roadFilter.type = "lowpass"
    roadFilter.frequency.value = 600
    const roadGain = context.createGain()
    roadSource.connect(roadFilter).connect(roadGain).connect(cabin)

    const windSource = noise()
    const windFilter = context.createBiquadFilter()
    windFilter.type = "bandpass"
    windFilter.frequency.value = 1400
    windFilter.Q.value = 0.7
    const windGain = context.createGain()
    windSource.connect(windFilter).connect(windGain).connect(cabin)

    const sources = [firing, crank, knockSource, roadSource, windSource]
    for (const source of sources) source.start()
    const voice: Voice = {
      nodes: [output, cabin, engineGain, engineTone, knock, knockGain, roadFilter, roadGain, windFilter, windGain, ...sources],
      sources, firing, crank, knock, engineGain, knockGain, roadGain, windGain, cabin, output
    }
    this.voices.set(id, voice)
    return voice
  }

  private retarget(context: AudioContext, voice: Voice, { profile, state, noise, inside, windowsOpen, distanceM }: VehicleVoice): void {
    const now = context.currentTime
    const set = (param: AudioParam, value: number) => param.setTargetAtTime(value, now, SMOOTHING_S)
    const revsPerSecond = state.rpm / 60
    const firingHz = (revsPerSecond * profile.cylinders) / 2
    const revs = Math.min(1, state.rpm / profile.shiftUpRpm)
    const speed = Math.min(1.5, state.speedMps / 30)
    set(voice.firing.frequency, firingHz)
    set(voice.crank.frequency, revsPerSecond)
    set(voice.knock.frequency, firingHz * 3)
    set(voice.engineGain.gain, profile.engineGain * (0.25 + 0.75 * state.load) * (0.5 + 0.5 * revs) * 0.3)
    set(voice.knockGain.gain, profile.roughness * (0.2 + 0.8 * state.load) * 0.4)
    set(voice.roadGain.gain, profile.roadGain * speed ** 1.5 * 0.8)
    const open = !inside || windowsOpen
    set(voice.windGain.gain, speed ** 2 * (open ? 0.5 : 0.06))
    // Where it is heard from: a closed cabin muffles, an open window lets the highs in, the air
    // takes them away with distance, and the level falls as the distance grows.
    const cutoff = inside ? (windowsOpen ? 3500 : 700) : 8000 / (1 + distanceM / 60)
    set(voice.cabin.frequency, cutoff)
    const level = inside ? 0.5 : Math.min(1, 8 / Math.max(distanceM, 1))
    set(voice.output.gain, level * noise)
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
