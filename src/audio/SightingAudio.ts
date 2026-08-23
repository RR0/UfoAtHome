import type { SightingSound } from "../engine/model/Sound.js"

/**
 * Plays what a sighting sounded like, from its SoundTrack — the audio counterpart of what
 * CanvasRenderer does with its shapes, and owned by UfoElement for exactly that reason: the sound
 * belongs to the recording, not to the 3D decor, so it plays in every embed including the plain 2D
 * one (unlike WeatherAudio, which is SceneElement's).
 *
 * Not under render3d/ despite WeatherAudio living there: nothing here knows about three.js, and
 * the 2D bundle would otherwise import from a directory that has no business being in it.
 *
 * **Synthesized, not sampled** — a described sound ("un bourdonnement grave") is synthesized from
 * that description the same way a described shape is drawn from its description, which also costs
 * the four embed bundles nothing in assets. A recording that carries a real audio file
 * (SightingSound.src) plays that file instead, and then this class is only a mixer.
 *
 * Silent until resume() has been called from a real user gesture — the same "there is genuinely
 * nothing to play into before that" rule as WeatherAudio, not merely an autoplay workaround.
 */

/** How fast gain/pitch reach a newly requested value, as setTargetAtTime's time constant. Long
 * enough that a per-frame retarget doesn't zipper, short enough that a keyframe's own ramp is
 * still heard as the ramp it is. */
const SMOOTHING_S = 0.05

/** Fade applied when a voice is torn down (kind change, pause, dispose) — an abrupt gain cut
 * clicks audibly. */
const RELEASE_S = 0.08

/** Seconds of looping noise generated for the unpitched kinds. Long enough not to sound like a
 * repeating pattern, short enough to build in a frame. */
const NOISE_SECONDS = 2

/** Seconds of the looping burst envelope that gives "crackle" its irregularity. */
const CRACKLE_SECONDS = 3

/** Average bursts per second in that envelope, and how fast each one decays. */
const CRACKLE_BURSTS_PER_SECOND = 14
const CRACKLE_DECAY_S = 0.02

/** One playing sound: every node it owns, plus the params that must follow `volume`/`pitchHz`
 * while it plays. */
interface Voice {
  /** What this voice was built for — a SoundKind, or `src:<url>` for a real recording. A change
   * here is what forces a rebuild rather than a retarget. */
  key: string
  nodes: AudioNode[]
  sources: AudioScheduledSourceNode[]
  /** The param `volume` drives (an output gain, or the depth of crackle's own modulation). */
  volumeParam: AudioParam
  /** What full volume means for this voice — a detuned sawtooth pair is far hotter than a sine,
   * so each kind carries its own scale rather than sounding twice as loud as its neighbour. */
  gainScale: number
  /** Every param that tracks pitchHz, each with its own multiple of it (an oscillator sits at 1x,
   * the low-pass shaping it well above). Empty for a real recording, whose pitch is its own. */
  pitch: { param: AudioParam; ratio: number }[]
}

export class SightingAudio {
  private context?: AudioContext
  private voice?: Voice
  /** Bumped on every voice change, including to silence — a src recording still fetching when the
   * sound has already moved on must be discarded rather than started into nothing (the exact
   * "audio that never stops" trap WeatherAudio.setAmbient documents). */
  private voiceToken = 0
  private readonly buffers = new Map<string, Promise<AudioBuffer>>()
  private noiseBuffer?: AudioBuffer
  private crackleBuffer?: AudioBuffer
  /** The most recently requested sound, so a late-resolving src load starts at the volume asked
   * for now rather than the one captured when loading began. */
  private requested?: SightingSound

  /** Unlocks the AudioContext — must be called from a real user gesture. Safe to call repeatedly.
   * Never throws: a browser with no Web Audio (jsdom, a locked-down policy) just means the
   * sighting stays silent, the same degrade-quietly rule as WeatherAudio.resume. */
  resume(): void {
    if (!this.context) {
      if (typeof AudioContext === "undefined") return
      try {
        this.context = new AudioContext()
      } catch (error) {
        console.warn("SightingAudio: Web Audio unavailable, the sighting stays silent:", error)
        return
      }
    }
    if (this.context.state === "suspended") void this.context.resume()
  }

  /**
   * Plays `sound`, or retargets what is already playing toward it — called on every playback tick
   * with whatever the SoundTrack resolves to at that instant, so it must stay cheap when nothing
   * has changed: only a kind (or src) change rebuilds anything, volume and pitch just glide.
   *
   * A no-op until resume() has been called. Silence (kind "none", or volume at 0) tears the voice
   * down rather than playing an inaudible one — an oscillator running at zero gain still costs.
   */
  setSound(sound: SightingSound): void {
    this.requested = sound
    if (!this.context) return
    const key = this.keyFor(sound)
    if (!key) {
      this.silence()
      return
    }
    if (this.voice?.key !== key) {
      this.stopVoice()
      const token = ++this.voiceToken
      if (key.startsWith("src:")) {
        void this.buildRecordedVoice(sound.src!, key, token)
      } else {
        this.voice = this.buildSynthesizedVoice(sound, key)
      }
    }
    this.applyTo(this.voice, sound)
  }

  /** Fades out and tears down whatever is playing — pausing playback, switching sightings, or a
   * track that has fallen silent. Keeps the AudioContext, unlike dispose(). */
  silence(): void {
    this.voiceToken++
    this.stopVoice()
  }

  /** Stops everything and closes the AudioContext — UfoElement's disconnectedCallback. */
  dispose(): void {
    this.silence()
    void this.context?.close()
    this.context = undefined
    this.buffers.clear()
    this.noiseBuffer = undefined
    this.crackleBuffer = undefined
  }

  /** What identifies the voice `sound` needs — undefined when it needs none at all. A real
   * recording wins over the kind: a witness who has the actual sound has no use for an imitation
   * of it. */
  private keyFor(sound: SightingSound): string | undefined {
    if (sound.volume <= 0) return undefined
    if (sound.src) return `src:${sound.src}`
    return sound.kind === "none" ? undefined : sound.kind
  }

  private applyTo(voice: Voice | undefined, sound: SightingSound): void {
    const context = this.context
    if (!voice || !context) return
    const now = context.currentTime
    voice.volumeParam.setTargetAtTime(Math.max(0, Math.min(1, sound.volume)) * voice.gainScale, now, SMOOTHING_S)
    for (const { param, ratio } of voice.pitch) {
      // A filter asked for more than Nyquist is an error in some engines and a no-op in others —
      // clamp rather than trust the caller's pitch times this voice's own multiple of it.
      param.setTargetAtTime(Math.min(sound.pitchHz * ratio, context.sampleRate / 2 - 1), now, SMOOTHING_S)
    }
  }

  private buildSynthesizedVoice(sound: SightingSound, key: string): Voice | undefined {
    const context = this.context
    if (!context) return undefined
    switch (sound.kind) {
      case "hum":
        return this.buildHum(context, key)
      case "whistle":
        return this.buildWhistle(context, key)
      case "rumble":
        return this.buildRumble(context, key)
      case "crackle":
        return this.buildCrackle(context, key)
      default:
        return undefined
    }
  }

  /** Two sawtooths a fraction apart, low-passed: the slow beat between them is what makes a drone
   * sound like a machine rather than a test tone. */
  private buildHum(context: AudioContext, key: string): Voice {
    const first = context.createOscillator()
    first.type = "sawtooth"
    const second = context.createOscillator()
    second.type = "sawtooth"
    const filter = context.createBiquadFilter()
    filter.type = "lowpass"
    filter.Q.value = 1
    const gain = context.createGain()
    gain.gain.value = 0
    first.connect(filter)
    second.connect(filter)
    filter.connect(gain).connect(context.destination)
    first.start()
    second.start()
    return {
      key,
      nodes: [filter, gain],
      sources: [first, second],
      volumeParam: gain.gain,
      gainScale: 0.16,
      pitch: [
        { param: first.frequency, ratio: 1 },
        { param: second.frequency, ratio: 1.006 },
        { param: filter.frequency, ratio: 6 }
      ]
    }
  }

  /** A sine with a slight vibrato — a perfectly steady tone reads as electronic, and no real
   * whistling sound holds its pitch that exactly. */
  private buildWhistle(context: AudioContext, key: string): Voice {
    const oscillator = context.createOscillator()
    oscillator.type = "sine"
    const vibrato = context.createOscillator()
    vibrato.type = "sine"
    vibrato.frequency.value = 5
    const vibratoDepth = context.createGain()
    const gain = context.createGain()
    gain.gain.value = 0
    vibrato.connect(vibratoDepth).connect(oscillator.frequency)
    oscillator.connect(gain).connect(context.destination)
    oscillator.start()
    vibrato.start()
    return {
      key,
      nodes: [vibratoDepth, gain],
      sources: [oscillator, vibrato],
      volumeParam: gain.gain,
      gainScale: 0.22,
      pitch: [
        { param: oscillator.frequency, ratio: 1 },
        // The vibrato's swing is a share of the pitch, not a fixed number of Hz — otherwise it
        // vanishes on a high whistle and warbles absurdly on a low one.
        { param: vibratoDepth.gain, ratio: 0.012 }
      ]
    }
  }

  /** Brown noise under a low-pass at the reported pitch — no tone at all, just the weight of it. */
  private buildRumble(context: AudioContext, key: string): Voice {
    const source = context.createBufferSource()
    source.buffer = this.brownNoise(context)
    source.loop = true
    const filter = context.createBiquadFilter()
    filter.type = "lowpass"
    filter.Q.value = 0.8
    const gain = context.createGain()
    gain.gain.value = 0
    source.connect(filter).connect(gain).connect(context.destination)
    source.start()
    return {
      key,
      nodes: [filter, gain],
      sources: [source],
      volumeParam: gain.gain,
      gainScale: 1.4,
      pitch: [{ param: filter.frequency, ratio: 1 }]
    }
  }

  /**
   * Band-passed white noise gated by a looping envelope of sparse decaying bursts — the
   * irregularity IS the sound, so it is generated as a buffer rather than scheduled with timers:
   * an audio-rate modulation stays sample-accurate while a setTimeout would drift and would keep
   * firing after playback stopped.
   *
   * The envelope drives the gain param directly, which is why `volume` lands on the modulation's
   * own depth here instead of on an output gain (the gate must reach real zero between bursts).
   */
  private buildCrackle(context: AudioContext, key: string): Voice {
    const noise = context.createBufferSource()
    noise.buffer = this.whiteNoise(context)
    noise.loop = true
    const filter = context.createBiquadFilter()
    filter.type = "bandpass"
    filter.Q.value = 1.2
    const gate = context.createGain()
    gate.gain.value = 0
    const envelope = context.createBufferSource()
    envelope.buffer = this.crackleEnvelope(context)
    envelope.loop = true
    const depth = context.createGain()
    depth.gain.value = 0
    envelope.connect(depth).connect(gate.gain)
    noise.connect(filter).connect(gate).connect(context.destination)
    noise.start()
    envelope.start()
    return {
      key,
      nodes: [filter, gate, depth],
      sources: [noise, envelope],
      volumeParam: depth.gain,
      gainScale: 0.9,
      pitch: [{ param: filter.frequency, ratio: 4 }]
    }
  }

  /** Loads and loops SightingSound.src. The recording's own pitch is left alone — resampling a
   * real recording to a described pitch would corrupt the one part of this that isn't a
   * reconstruction. */
  private async buildRecordedVoice(url: string, key: string, token: number): Promise<void> {
    const context = this.context
    if (!context) return
    let buffer: AudioBuffer
    try {
      buffer = await this.getBuffer(url)
    } catch (error) {
      console.warn("SightingAudio: the recorded sound failed to load, staying silent:", error)
      return
    }
    if (token !== this.voiceToken || !this.context) return
    const source = context.createBufferSource()
    source.buffer = buffer
    source.loop = true
    const gain = context.createGain()
    gain.gain.value = 0
    source.connect(gain).connect(context.destination)
    source.start()
    this.voice = { key, nodes: [gain], sources: [source], volumeParam: gain.gain, gainScale: 1, pitch: [] }
    // The requested volume may well have moved during the fetch+decode — apply the current one,
    // never the one this load started with.
    if (this.requested) this.applyTo(this.voice, this.requested)
  }

  private async getBuffer(url: string): Promise<AudioBuffer> {
    const context = this.context
    if (!context) throw new Error("SightingAudio: AudioContext not ready — resume() must be called first")
    let cached = this.buffers.get(url)
    if (!cached) {
      cached = fetch(url)
        .then(response => {
          if (!response.ok) throw new Error(`Audio fetch failed (${response.status}): ${url}`)
          return response.arrayBuffer()
        })
        .then(data => context.decodeAudioData(data))
      this.buffers.set(url, cached)
    }
    return cached
  }

  private whiteNoise(context: AudioContext): AudioBuffer {
    if (!this.noiseBuffer) {
      const buffer = context.createBuffer(1, Math.floor(context.sampleRate * NOISE_SECONDS), context.sampleRate)
      const samples = buffer.getChannelData(0)
      for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1
      this.noiseBuffer = buffer
    }
    return this.noiseBuffer
  }

  /** White noise integrated into brown (1/f²) noise — white noise low-passed alone still sounds
   * like a hiss with the top taken off, where a rumble's energy really does pile up at the bottom.
   * Re-normalized because integration drifts. */
  private brownNoise(context: AudioContext): AudioBuffer {
    const buffer = context.createBuffer(1, Math.floor(context.sampleRate * NOISE_SECONDS), context.sampleRate)
    const samples = buffer.getChannelData(0)
    let last = 0
    let peak = 0
    for (let i = 0; i < samples.length; i++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02
      samples[i] = last
      peak = Math.max(peak, Math.abs(last))
    }
    if (peak > 0) {
      for (let i = 0; i < samples.length; i++) samples[i] /= peak
    }
    return buffer
  }

  /** A loop of sharp decaying bursts at irregular intervals, in 0..1 — see buildCrackle. */
  private crackleEnvelope(context: AudioContext): AudioBuffer {
    if (!this.crackleBuffer) {
      const buffer = context.createBuffer(1, Math.floor(context.sampleRate * CRACKLE_SECONDS), context.sampleRate)
      const samples = buffer.getChannelData(0)
      const decay = Math.max(1, Math.floor(CRACKLE_DECAY_S * context.sampleRate))
      const bursts = Math.round(CRACKLE_SECONDS * CRACKLE_BURSTS_PER_SECOND)
      for (let burst = 0; burst < bursts; burst++) {
        const start = Math.floor(Math.random() * samples.length)
        const amplitude = 0.4 + Math.random() * 0.6
        for (let i = 0; i < decay && start + i < samples.length; i++) {
          samples[start + i] = Math.max(samples[start + i], amplitude * (1 - i / decay))
        }
      }
      this.crackleBuffer = buffer
    }
    return this.crackleBuffer
  }

  /** Fades the current voice out and disposes of it once the fade has actually been heard — every
   * node is disconnected on the last source's `ended`, not immediately, or the release would be
   * cut off by the very teardown meant to avoid a click. */
  private stopVoice(): void {
    const voice = this.voice
    const context = this.context
    this.voice = undefined
    if (!voice || !context) return
    const now = context.currentTime
    voice.volumeParam.cancelScheduledValues(now)
    voice.volumeParam.setTargetAtTime(0, now, RELEASE_S / 3)
    const stopAt = now + RELEASE_S
    for (const source of voice.sources) {
      source.onended = () => {
        source.disconnect()
        for (const node of voice.nodes) node.disconnect()
      }
      try {
        source.stop(stopAt)
      } catch {
        // Already stopped, or a mock with no scheduling — nothing left to wind down.
        source.disconnect()
        for (const node of voice.nodes) node.disconnect()
      }
    }
  }
}
