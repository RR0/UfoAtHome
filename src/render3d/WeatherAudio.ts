import type { PrecipitationType } from "../engine/model/Weather.js"

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

interface LoopHandle {
  source: AudioBufferSourceNode
  gain: GainNode
}

export class WeatherAudio {
  private context?: AudioContext
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
    if (this.context.state === "suspended") void this.context.resume()
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
    if (!this.context) return
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

  /** One-shot thunderclap, triggered by SceneElement on SceneRenderer's onLightningFlash callback
   * (with its own randomized delay applied by the caller — see SceneElement, not here, so audio
   * timing logic stays out of the renderer entirely). A no-op before resume(), same reasoning as
   * setAmbient. */
  playThunder(): void {
    if (!this.context) return
    void this.playOneShot(THUNDER_URL, 0.9)
  }

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
    void this.context?.close()
    this.context = undefined
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
      source.connect(gain).connect(context.destination)
      source.start()
      return { source, gain }
    } catch (error) {
      console.warn("Weather ambient sound failed to load, staying silent:", error)
      return undefined
    }
  }

  private async playOneShot(url: string, volume: number): Promise<void> {
    const context = this.context
    if (!context) return
    try {
      const buffer = await this.getBuffer(url)
      const source = context.createBufferSource()
      source.buffer = buffer
      const gain = context.createGain()
      gain.gain.value = volume
      source.connect(gain).connect(context.destination)
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
