/** A text of the recording, in one language or several. */
type Said = string | Readonly<Record<string, string>> | undefined

/** What the prompt reads of a recording, in the recording's own format (see SightingRecordingJson): nothing more, so that it can say no more. */
interface PromptSource {
  readonly id?: string
  readonly time?: string
  readonly place?: { readonly name?: string }
  readonly description?: Said
  readonly tags?: readonly string[]
  readonly timeline?: { readonly keyframes?: readonly { readonly t: number, readonly shapes?: readonly { readonly sourceId: string, readonly shape: PromptShape }[] }[] }
  readonly weatherTrack?: { readonly keyframes?: readonly { readonly t: number, readonly weather: PromptWeather }[] }
  readonly milestones?: readonly { readonly t: number, readonly note?: Said }[]
}

interface PromptShape {
  readonly title?: Said
  readonly color?: string
  readonly angular?: { readonly widthDeg: number, readonly heightDeg: number }
  readonly aim?: { readonly azimuthDeg: number, readonly altitudeDeg: number }
}

interface PromptWeather {
  readonly cloudCover?: number
  readonly cloudBaseM?: number
  readonly precipitationType?: string
  readonly precipitationIntensity?: number
}

/** The part of the recording a film shows, and how fast: what the prompt's instants are counted in. */
export interface PromptClip {
  /** Seconds of the recording. */
  readonly fromSeconds: number
  readonly toSeconds: number
  /** Seconds of the recording per second of film (the player's playbackRate). */
  readonly rate?: number
}

/**
 * What a video generator is told about a reconstruction, written from the recording's own statements and nothing else: the place and the
 * time, where the phenomenon stands and what it looks like as drawn, what happens and when, the weather stated (see of). And what it must
 * not do, since the shortest prompt invites it to fill every gap with the usual picture of a UFO (see NEGATIVE), for the negative prompt
 * field the generators have apart.
 *
 * In English, the language generators follow best, whatever the reader's (the kit's README is in theirs, see GenerativeKit). The testimony
 * itself is never part of the prompt: a generator would draw every word of it, what the witness did not say included.
 */
export class GenerativePrompt {

  /**
   * The most characters a prompt may have: what the generators' prompt fields take (DaVinci's 2 500; Kling's and Runway's are of the
   * same order). A recording that says more is told shorter (see of), never cut in the middle of what it says.
   */
  static readonly MAX_CHARS = 2500

  /** What a generator must not do, for its own negative prompt field: the same for every recording. */
  static readonly NEGATIVE = "added objects, windows, portholes, lights or beams not in the reference, smoke, people, animals, camera shake beyond the "
    + "reference, lens flares not in the reference, any change of the phenomenon's shape, size, colour, brightness, position or motion, text, logos.\n"

  /**
   * The prompt, as plain text of at most MAX_CHARS characters. What happens is told in full if it fits; else each moment by its first
   * sentence, then by its first words; and if the recording still says too much (dozens of shapes or moments), the last lines are left
   * out, whole, rather than any line cut short.
   */
  static of(recording: object, clip: PromptClip): string {
    const source = recording as PromptSource
    const rate = clip.rate && clip.rate > 0 ? clip.rate : 1
    const filmSeconds = (recordingSeconds: number) => Math.max(0, (recordingSeconds - clip.fromSeconds) / rate)
    const notes: ((note: string) => string)[] = [
      note => note,
      note => GenerativePrompt.firstSentence(note),
      note => GenerativePrompt.firstWords(GenerativePrompt.firstSentence(note), GenerativePrompt.SHORT_NOTE_CHARS)
    ]
    let text = ""
    for (const shorten of notes) {
      const lines = [
        `Realistic, steady first-person view, as seen by a pedestrian's own eyes, ${source.place?.name ?? "place not stated"}, local time ${source.time ?? "not stated"}. `
        + "Keep exactly the geometry, horizon, framing, lighting and motion of the reference video: only make the textures (vegetation, ground, "
        + "buildings, clouds, rain) photographic. Render the phenomenon as realistically as the rest (same grain, blur, haze and light), but keep "
        + "its shape, size, colour, brightness, position and motion exactly those of the reference video.",
        "",
        "Phenomenon, as drawn by the reconstruction from the testimony:",
        ...GenerativePrompt.shapes(source, clip.fromSeconds),
        ...GenerativePrompt.section("What happens:", GenerativePrompt.milestones(source, clip, filmSeconds, shorten)),
        ...GenerativePrompt.section("Weather and light (follow this, not the reference's own colours):", GenerativePrompt.weather(source, clip, filmSeconds))
      ]
      text = lines.join("\n") + "\n"
      if (text.length <= GenerativePrompt.MAX_CHARS) return text
    }
    const kept: string[] = []
    for (const line of text.split("\n")) {
      if ([...kept, line].join("\n").length + 1 > GenerativePrompt.MAX_CHARS) break
      kept.push(line)
    }
    return kept.join("\n") + "\n"
  }

  /** How long a moment is told at most once the prompt has to be short, characters. */
  private static readonly SHORT_NOTE_CHARS = 80

  private static firstSentence(text: string): string {
    const end = text.search(/[.;!?](\s|$)/)
    return end >= 0 ? text.slice(0, end + 1) : text
  }

  private static firstWords(text: string, chars: number): string {
    if (text.length <= chars) return text
    const cut = text.lastIndexOf(" ", chars - 1)
    return text.slice(0, cut > 0 ? cut : chars - 1) + "…"
  }

  private static section(title: string, lines: string[]): string[] {
    return lines.length > 0 ? ["", title, ...lines] : []
  }

  private static text(value: Said, language = "en"): string | undefined {
    if (value === undefined) return undefined
    if (typeof value === "string") return value
    return value[language] ?? value.en ?? Object.values(value)[0]
  }

  /** Each shape as it stands when the clip opens: its motion after that is the reference video's to give, not the prompt's. */
  private static shapes(source: PromptSource, fromSeconds: number): string[] {
    const shapes = new Map<string, PromptShape>()
    for (const keyframe of source.timeline?.keyframes ?? []) {
      for (const shape of keyframe.shapes ?? []) if (keyframe.t <= fromSeconds * 1000 || !shapes.has(shape.sourceId)) shapes.set(shape.sourceId, shape.shape)
    }
    if (shapes.size === 0) return ["- none drawn."]
    return [...shapes.entries()].map(([id, shape]) => {
      const size = shape.angular ? `${shape.angular.widthDeg}° wide and ${shape.angular.heightDeg}° tall as seen` : "size not stated"
      const aim = shape.aim ? `, at azimuth ${Math.round(shape.aim.azimuthDeg)}°, ${shape.aim.altitudeDeg.toFixed(1)}° above the horizon` : ""
      return `- ${GenerativePrompt.text(shape.title) ?? id}: colour ${shape.color ?? "not stated"}, ${size}${aim}.`
    })
  }

  private static milestones(source: PromptSource, clip: PromptClip, filmSeconds: (seconds: number) => number, shorten: (note: string) => string): string[] {
    return (source.milestones ?? [])
      .filter(milestone => milestone.t / 1000 >= clip.fromSeconds && milestone.t / 1000 <= clip.toSeconds)
      .map(milestone => `- ${filmSeconds(milestone.t / 1000).toFixed(1)} s into the video: ${shorten(GenerativePrompt.text(milestone.note) ?? "")}`)
  }

  /** The weather the recording states over the clip, each change once. */
  private static weather(source: PromptSource, clip: PromptClip, filmSeconds: (seconds: number) => number): string[] {
    const lines = (source.tags ?? []).length > 0 ? [`- ${(source.tags ?? []).join(", ")}.`] : []
    let last = ""
    for (const keyframe of source.weatherTrack?.keyframes ?? []) {
      const seconds = keyframe.t / 1000
      if (seconds > clip.toSeconds) break
      const text = GenerativePrompt.describe(keyframe.weather)
      if (text === last) continue
      last = text
      lines.push(`- ${seconds <= clip.fromSeconds ? "from the start" : `from ${filmSeconds(seconds).toFixed(1)} s into the video`}: ${text}.`)
    }
    return lines
  }

  private static describe(weather: PromptWeather): string {
    const parts: string[] = []
    if (typeof weather.cloudCover === "number") parts.push(weather.cloudCover >= 0.95 ? "overcast" : `cloud cover ${Math.round(weather.cloudCover * 100)} %`)
    if (typeof weather.cloudBaseM === "number") parts.push(`cloud base ${Math.round(weather.cloudBaseM)} m`)
    parts.push(weather.precipitationType && weather.precipitationType !== "none" ? `${weather.precipitationType}, intensity ${weather.precipitationIntensity ?? "not stated"}` : "no precipitation")
    return parts.join(", ")
  }
}
