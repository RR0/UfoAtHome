import type { PrecipitationType } from "../engine/model/Weather.js"
import { AudioUnlock } from "../audio/AudioUnlock.js"
import { SoundInAir } from "../engine/traffic/SoundInAir.js"

/**
 * Real, sourced royalty-free ambient/one-shot sound effects for weather — the audio counterpart to
 * SceneRenderer's clouds/precipitation/lightning, but deliberately NOT owned by SceneRenderer (see
 * SceneElement's own doc comment on why): the renderer stays audio-agnostic, this class knows
 * nothing about three.js.
 *
 * Assets are fetched+decoded lazily — only the first time a given sound is actually needed (never
 * eagerly on construction/page load) — and referenced the same way SceneElement already references
 * the star catalog binary: `new URL("../assets/audio/X.ogg", import.meta.url).href`, so Vite emits
 * them as real assets into every dist-embed-* bundle with no extra build config (see
 * StarCatalog.ts/SceneElement.ts's own DEFAULT_STAR_CATALOG_URL for the precedent).
 *
 * No `<audio>` elements, no positional/3D panning (see the weather milestone's own v1 non-goals) —
 * plain looping AudioBufferSourceNodes for ambient beds (rain/hail/wind), gain-scaled by
 * intensity/wind speed, plus one-shot playback for thunder.
 */

const RAIN_URL = new URL("../assets/audio/rain.ogg", import.meta.url).href
const WIND_URL = new URL("../assets/audio/wind.ogg", import.meta.url).href
// .wav, not .ogg — the sourced file (see CREDITS.md) is actually WAV-encoded despite its
// original ".ogg" filename on OpenGameArt; renamed to match its real format rather than mislabel
// it. AudioContext.decodeAudioData() sniffs the real container/codec from the bytes regardless of
// extension, so this doesn't affect playback — it's purely so the filename itself isn't a lie.
const THUNDER_URL = new URL("../assets/audio/thunder.wav", import.meta.url).href

/** Weather.windSpeed is real m/s — normalized here into the ~0-1 range a Web Audio GainNode
 * expects. windSpeed reaching MAX_WIND_FOR_FULL_VOLUME_MS (a strong gale) already sounds as loud
 * as this loop gets; MIN_AUDIBLE_WIND_MS is a near-calm threshold below which the wind loop simply
 * doesn't start, replacing the old normalized-scale "0.03" threshold. */
const MAX_WIND_FOR_FULL_VOLUME_MS = 20
const MIN_AUDIBLE_WIND_MS = 1

/** How long the noise the bed of what is around is filtered from lasts, s: long enough that its loop is not heard as one. */
const AROUND_NOISE_SECONDS = 7
/** How much the bed swells and fades as vehicles come and go, as a fraction of its amplitude, and how slowly: values a second of a random table. */
const AROUND_SWELL = 0.35
const AROUND_SWELL_PER_SECOND = 0.4
const AROUND_SWELL_SECONDS = 40
/** How fast the bed follows a new level, s (a time constant). */
const AROUND_SMOOTHING_S = 0.5
/** The band filters' Q: an octave wide, whose noise bandwidth is some 1.1 of the centre (π/2 f / Q). */
const AROUND_Q = Math.SQRT2

interface LoopHandle {
  source: AudioBufferSourceNode
  gain: GainNode
}

export class WeatherAudio {
  private context?: BaseAudioContext

  /** @param context What to play into instead of the reader's speakers, whose context is made at the first gesture: a film's (see VideoExport). */
  constructor(context?: BaseAudioContext) {
    this.context = context
  }
  private readonly buffers = new Map<string, Promise<AudioBuffer>>()

  private ambientSource?: AudioBufferSourceNode
  private ambientGain?: GainNode
  /** What's actually playing right now — "none" for both PrecipitationType "none" AND "snow" (real
   * snowfall is close to silent; only wind carries — see setAmbient's own comment). Tracked
   * separately from the PrecipitationType passed in so a rain<->hail switch (both map to the same
   * bed today, see ASSET_URLS) doesn't restart the loop for no audible reason. */
  private ambientKey: "none" | "rain" | "hail" = "none"
  private ambientToken = 0
  /** The most recently requested ambient volume — see setAmbient's own comment on why applyIfCurrent
   * reads this instead of the volume captured when startLoop() was first called. */
  private ambientVolume = 0

  private windSource?: AudioBufferSourceNode
  private windGain?: GainNode
  private windActive = false
  private windToken = 0
  private windVolume = 0

  /** Whether the observation's clock is stopped. Weather is something that was happening at an
   * instant of the sighting, so it is heard only while that instant is advancing — a paused replay
   * is one frozen moment, and rain going on over it would be the room's own weather, not the
   * observer's. Mirrors SceneRenderer.animationsRunning, which freezes the same weather visually.
   *
   * Starts true: nothing has been played yet, and setAmbient is a no-op before resume() anyway. */
  private paused = true
  /** The last conditions setAmbient was asked for, replayed on unpause — the beds are genuinely
   * stopped while paused (an inaudible source still costs), so resuming needs to know what to
   * start again without waiting for the weather itself to change. */
  private requested: { type: PrecipitationType; intensity: number; windSpeed: number } = {
    type: "none",
    intensity: 0,
    windSpeed: 0
  }

  /**
   * The bed of what is around (see setAround): a noise through one band filter per octave, in the proportions asked, swelling and fading slowly.
   * Made at the first request for one, kept while the scene lasts.
   */
  private around?: { sources: AudioScheduledSourceNode[]; nodes: AudioNode[]; bands: GainNode[]; gain: GainNode }
  /** What was last asked of it: the root of its mean square, and its shape (one amplitude per octave of SoundInAir.OCTAVES, whose root sum of squares is 1). */
  private aroundRequested: { rms: number; shape: readonly number[] } = { rms: 0, shape: [] }

  private level = 1
  /** How much of the weather reaches the observer, 0 to 1: all of it in the open, a fraction inside a closed cabin (see ObserverRide). */
  private share = 1
  private master?: GainNode

  /** Where every bed and every thunderclap is sent, so that one gain silences them all at once. */
  private output(context: BaseAudioContext): GainNode {
    if (!this.master) {
      this.master = context.createGain()
      this.master.gain.value = this.gain
      this.master.connect(context.destination)
    }
    return this.master
  }

  private get gain(): number {
    return this.level * this.share
  }

  /** How loud everything is, 0 (silent) to 1, without touching what it is doing — a track heard
   * again is where it would have got to, not where it was left. */
  setLevel(level: number): void {
    this.level = level
    if (this.master) this.master.gain.value = this.gain
  }

  /**
   * How much of the weather gets through what the observer is inside, 0 to 1: rain on the road is a roar in the open and a patter from
   * inside a closed van (see ObserverRide.insulationDb). The reader's own volume is kept apart from it.
   */
  setOutsideHeard(share: number): void {
    this.share = Math.min(1, Math.max(0, share))
    if (this.master) this.master.gain.value = this.gain
  }

  /** Unlocks the AudioContext — must be called from a real user gesture (browsers start it
   * suspended otherwise). Safe to call repeatedly; a no-op once already running. Never throws to
   * the caller — a browser/environment with no Web Audio support (or a security policy blocking
   * it) just means weather stays silent, same "degrade silently, console.warn only" spirit as
   * every other fallible thing in this renderer (terrain fetch failures, etc.), not a hard
   * dependency the rest of the scene should ever break over. */
  resume(): void {
    if (!this.context) {
      // No Web Audio support at all (jsdom, SSR, an old/locked-down browser) is an expected
      // environment gap, not a failure worth a console.warn — only genuinely unexpected
      // construction errors (a real browser's own AudioContext throwing) get logged below.
      if (typeof AudioContext === "undefined") return
      try {
        this.context = new AudioContext()
      } catch (error) {
        console.warn("WeatherAudio: Web Audio unavailable, weather sounds disabled:", error)
        return
      }
    }
    if (AudioUnlock.isLive(this.context)) AudioUnlock.unlock(this.context)
    this.applyAround()
  }

  /**
   * Plays the bed of what is around the observer — the traffic of a town, its roads — at `rms` (the root of its mean square), in the octave
   * proportions `shape` gives (see AmbientNoise.aroundBedShape). Nothing at 0. Like the weather, heard only while the clock runs, and through
   * what the observer rides in.
   */
  setAround(rms: number, shape: readonly number[]): void {
    // Asked at every tick with the weather: nothing is retargeted when nothing has changed.
    const last = this.aroundRequested
    if (last.rms === Math.max(0, rms) && last.shape.length === shape.length && last.shape.every((value, band) => value === shape[band])) return
    this.aroundRequested = { rms: Math.max(0, rms), shape }
    this.applyAround()
  }

  private applyAround(): void {
    const context = this.context
    if (!context) return
    const { rms, shape } = this.aroundRequested
    const playing = this.paused ? 0 : rms
    if (playing === 0 && !this.around) return
    const bed = this.around ?? (this.around = this.buildAround(context))
    const now = context.currentTime
    bed.gain.gain.setTargetAtTime(playing, now, AROUND_SMOOTHING_S)
    // White noise of full scale has a root mean square of 1/√3, of which a band of constant Q keeps the root of its share of the spectrum.
    SoundInAir.OCTAVES.forEach((centre, band) => {
      const kept = Math.sqrt(Math.min(1, (1.11 * centre) / (context.sampleRate / 2))) / Math.sqrt(3)
      bed.bands[band].gain.setTargetAtTime((shape[band] ?? 0) / kept, now, AROUND_SMOOTHING_S)
    })
  }

  private buildAround(context: BaseAudioContext): NonNullable<WeatherAudio["around"]> {
    const noise = context.createBuffer(1, Math.floor(context.sampleRate * AROUND_NOISE_SECONDS), context.sampleRate)
    const data = noise.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    const source = context.createBufferSource()
    source.buffer = noise
    source.loop = true
    // The swell: a slow random table, smooth between its values and round from its last to its first, laid on the bed's loudness.
    const swellLength = Math.floor(context.sampleRate * AROUND_SWELL_SECONDS)
    const table = context.createBuffer(1, swellLength, context.sampleRate)
    const values = Array.from({ length: Math.round(AROUND_SWELL_SECONDS * AROUND_SWELL_PER_SECOND) }, () => Math.random() * 2 - 1)
    const tableData = table.getChannelData(0)
    const step = context.sampleRate / AROUND_SWELL_PER_SECOND
    for (let i = 0; i < swellLength; i++) {
      const at = i / step
      const k = Math.floor(at)
      const f = at - k
      const smooth = f * f * (3 - 2 * f)
      tableData[i] = values[k % values.length] * (1 - smooth) + values[(k + 1) % values.length] * smooth
    }
    const swell = context.createBufferSource()
    swell.buffer = table
    swell.loop = true
    const swellDepth = context.createGain()
    swellDepth.gain.value = AROUND_SWELL
    const sum = context.createGain()
    sum.gain.value = 1
    swell.connect(swellDepth).connect(sum.gain)
    const gain = context.createGain()
    gain.gain.value = 0
    sum.connect(gain).connect(this.output(context))
    const bands = SoundInAir.OCTAVES.map(centre => {
      const filter = context.createBiquadFilter()
      filter.type = "bandpass"
      filter.frequency.value = centre
      filter.Q.value = AROUND_Q
      const band = context.createGain()
      band.gain.value = 0
      source.connect(filter).connect(band).connect(sum)
      return band
    })
    source.start()
    swell.start()
    return { sources: [source, swell], nodes: [swellDepth, sum, gain, ...bands], bands, gain }
  }

  /**
   * Starts/stops/retargets the ambient weather beds. A no-op entirely until resume() has been
   * called at least once (mirrors "no sound before a real user gesture", not just an autoplay-
   * policy workaround — there's genuinely nothing to play into before that). Rain and hail share
   * the one sourced rain loop (louder/higher-gain for hail — no dedicated hail recording was found,
   * see the weather milestone's own documented gap) — a real hail-specific transient layer is a
   * natural follow-up, not attempted here. Snow has no ambient bed at all: real snowfall makes very
   * little sound, so silence (aside from wind) is the *more* realistic choice than reusing the rain
   * loop, not a shortcut.
   */
  setAmbient(type: PrecipitationType, intensity: number, windSpeed: number): void {
    this.requested = { type, intensity, windSpeed }
    if (!this.context) return
    // Remembered above first: a weather edit made while paused must be what plays on resume.
    if (this.paused) {
      type = "none"
      intensity = 0
      windSpeed = 0
    }
    const key = type === "rain" || type === "hail" ? type : "none"
    // Tracked in a field (not just a local `volume` const) so applyIfCurrent's resolve callback
    // below can always read the *latest* requested volume, not the one captured in startLoop()'s
    // closure at the moment loading began — see that callback's own comment for why that distinction
    // matters (a user can move the intensity slider again before the fetch+decode finishes).
    this.ambientVolume = key === "hail" ? Math.min(1, intensity * 1.3 + 0.2) : key === "rain" ? intensity : 0
    if (key !== this.ambientKey) {
      this.ambientKey = key
      // Bumped unconditionally on every key change — including *to* "none" — not just when
      // starting a new loop. startLoop() is async (fetch+decodeAudioData): if a user switches away
      // from rain/hail before that resolves, the in-flight promise must still see a stale token so
      // applyIfCurrent discards it instead of starting a loop nothing can ever stop afterward.
      // Previously the token only advanced on the "start" branch, so a switch to "none" while a
      // rain load was in flight left the old token valid — the late-arriving rain loop would start
      // playing after the fact, and since "snow" and "none" both map to key="none", no later
      // snow<->none toggle would ever re-enter this branch to stop it (key already equalled
      // ambientKey), leaving it playing forever. This is the exact bug reported: rain audio that
      // never stops once switched away from.
      const token = ++this.ambientToken
      this.stopSource(this.ambientSource, this.ambientGain)
      this.ambientSource = undefined
      this.ambientGain = undefined
      if (key !== "none") {
        void this.startLoop(RAIN_URL, this.ambientVolume).then(handle => this.applyIfCurrent(handle, token, () => this.ambientToken, h => {
          this.ambientSource = h?.source
          this.ambientGain = h?.gain
          // Re-applies the *current* ambientVolume, not the one startLoop() was originally called
          // with: if the user moved the intensity slider again during the fetch+decode wait, that
          // change would otherwise be silently lost — the loop would start at a stale volume and
          // only catch up on the next actual intensity edit.
          if (h) h.gain.gain.value = this.ambientVolume
        }))
      }
    } else if (this.ambientGain) {
      this.ambientGain.gain.value = this.ambientVolume
    }

    this.windVolume = Math.min(windSpeed / MAX_WIND_FOR_FULL_VOLUME_MS, 1)
    const shouldWind = windSpeed > MIN_AUDIBLE_WIND_MS
    if (shouldWind !== this.windActive) {
      this.windActive = shouldWind
      // Same fix, same reasoning as ambientToken above.
      const token = ++this.windToken
      this.stopSource(this.windSource, this.windGain)
      this.windSource = undefined
      this.windGain = undefined
      if (shouldWind) {
        void this.startLoop(WIND_URL, this.windVolume).then(handle => this.applyIfCurrent(handle, token, () => this.windToken, h => {
          this.windSource = h?.source
          this.windGain = h?.gain
          // Same "apply the latest, not the stale closured value" fix as the ambient bed above.
          if (h) h.gain.gain.value = this.windVolume
        }))
      }
    } else if (this.windGain) {
      this.windGain.gain.value = this.windVolume
    }
  }

  /**
   * Runs or stops the weather beds with the player (see `paused`). Stopping goes through
   * setAmbient's own "no precipitation, no wind" path rather than a separate teardown, so a pause
   * and a genuine clearing of the weather leave exactly the same state behind; resuming replays
   * whatever conditions were last asked for, including any edited while paused.
   */
  setPaused(paused: boolean): void {
    if (paused === this.paused) return
    this.paused = paused
    const { type, intensity, windSpeed } = this.requested
    this.setAmbient(type, intensity, windSpeed)
    this.applyAround()
  }

  /** One-shot thunderclap, triggered by SceneElement on SceneRenderer's onLightningFlash callback
   * (with its own randomized delay applied by the caller — see SceneElement, not here, so audio
   * timing logic stays out of the renderer entirely). A no-op before resume(), same reasoning as
   * setAmbient. */
  playThunder(): void {
    // A clap already in flight when the replay was paused (SceneElement delays it by the distance
    // sound travels) must not land over a frozen scene.
    if (!this.context || this.paused) return
    void this.playOneShot(THUNDER_URL, 0.9)
  }

  /**
   * The bang of a fireball's detonation reaching the observer (see ReentrySighting.detonationsOf), at `loudness` (0 to 1): a shock wave
   * arrives as a sharp crack, the jump of pressure that broke Chelyabinsk's windows, then rolls on as thunder does. The crack is noise of
   * every pitch dying away in a quarter of a second; the roll, the thunder's clap played a little lower. It was the clap alone, played at
   * less than half its speed: its energy, near 100 Hz, fell to 45, which no laptop's speaker gives out, and nothing was heard.
   */
  playDetonation(loudness: number): void {
    const context = this.context
    if (!context || this.paused) return
    const level = Math.min(1, Math.max(0, loudness))
    const crack = context.createBufferSource()
    crack.buffer = this.crackBuffer(context)
    const filter = context.createBiquadFilter()
    filter.type = "lowpass"
    filter.frequency.value = WeatherAudio.CRACK_CUTOFF_HZ
    const gain = context.createGain()
    gain.gain.value = level
    crack.connect(filter).connect(gain).connect(this.output(context))
    crack.start()
    void this.playOneShot(THUNDER_URL, level, WeatherAudio.DETONATION_RATE)
  }

  /** How much slower than the thunder's clap the roll of a detonation is played: a little lower, still within what a small speaker gives out. */
  private static readonly DETONATION_RATE = 0.8
  /** Above this the crack is cut: what is left of a shock wave's high pitches after tens of kilometres of air. */
  private static readonly CRACK_CUTOFF_HZ = 2500
  /** How fast the crack dies away, seconds to a third (1/e). */
  private static readonly CRACK_DECAY_S = 0.25

  /** Noise rising in five milliseconds and dying away over CRACK_DECAY_S, made once for the context. */
  private crackBuffer(context: BaseAudioContext): AudioBuffer {
    if (this.crack?.sampleRate === context.sampleRate) return this.crack
    const length = Math.round(context.sampleRate * WeatherAudio.CRACK_DECAY_S * 6)
    const buffer = context.createBuffer(1, length, context.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < length; i++) {
      const s = i / context.sampleRate
      data[i] = (Math.random() * 2 - 1) * Math.min(1, s / 0.005) * Math.exp(-s / WeatherAudio.CRACK_DECAY_S)
    }
    this.crack = buffer
    return buffer
  }

  private crack?: AudioBuffer

  /** Stops every active source and closes the AudioContext — called from SceneElement's own
   * disconnectedCallback, alongside stopTwinkle(). Bumping both tokens first discards any loop-
   * start still in flight, so a late-resolving fetch/decode can't start a new source into an
   * already-closing context. */
  dispose(): void {
    this.ambientToken++
    this.windToken++
    this.stopSource(this.ambientSource, this.ambientGain)
    this.stopSource(this.windSource, this.windGain)
    this.ambientSource = undefined
    this.ambientGain = undefined
    this.windSource = undefined
    this.windGain = undefined
    for (const source of this.around?.sources ?? []) {
      try {
        source.stop()
      } catch {
        // Already stopped.
      }
    }
    for (const node of this.around?.nodes ?? []) node.disconnect()
    this.around = undefined
    if (AudioUnlock.isLive(this.context)) void this.context.close()
    this.context = undefined
    this.master = undefined
    this.buffers.clear()
  }

  private applyIfCurrent(
    handle: LoopHandle | undefined,
    token: number,
    currentToken: () => number,
    apply: (handle: LoopHandle | undefined) => void
  ): void {
    if (token !== currentToken()) {
      handle?.source.stop() // superseded while the fetch/decode was in flight — discard, not audible
      return
    }
    apply(handle)
  }

  private async startLoop(url: string, volume: number): Promise<LoopHandle | undefined> {
    const context = this.context
    if (!context) return undefined
    try {
      const buffer = await this.getBuffer(url)
      const source = context.createBufferSource()
      source.buffer = buffer
      source.loop = true
      const gain = context.createGain()
      gain.gain.value = volume
      source.connect(gain).connect(this.output(context))
      source.start()
      return { source, gain }
    } catch (error) {
      console.warn("Weather ambient sound failed to load, staying silent:", error)
      return undefined
    }
  }

  private async playOneShot(url: string, volume: number, rate = 1): Promise<void> {
    const context = this.context
    if (!context) return
    try {
      const buffer = await this.getBuffer(url)
      const source = context.createBufferSource()
      source.buffer = buffer
      source.playbackRate.value = rate
      const gain = context.createGain()
      gain.gain.value = volume
      source.connect(gain).connect(this.output(context))
      source.start()
    } catch (error) {
      console.warn("Thunder sound failed to load:", error)
    }
  }

  /** Fetch+decode, cached by URL so toggling a condition off/on doesn't re-fetch — mirrors
   * StarCatalog's own module-level cache Map, instance-scoped here since each SceneElement owns its
   * own AudioContext (no cross-instance sharing precedent needed, unlike the catalog's genuinely
   * shareable static data). */
  private async getBuffer(url: string): Promise<AudioBuffer> {
    const context = this.context
    if (!context) throw new Error("WeatherAudio: AudioContext not ready — resume() must be called first")
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

  private stopSource(source?: AudioBufferSourceNode, gain?: GainNode): void {
    try {
      source?.stop()
    } catch {
      // Already stopped or never started — fine, nothing to clean up.
    }
    source?.disconnect()
    gain?.disconnect()
  }
}
