import type { InterviewJson } from "../persistence/interviewJson.js"
import type { StatedValue, ValueSource } from "../persistence/Provenance.js"
import { QuestionnaireImport } from "../persistence/QuestionnaireImport.js"
import type { QuestionnaireFeedTarget, QuestionnaireTemplate } from "./QuestionnaireTemplate.js"
import { QuestionnaireTemplates } from "./QuestionnaireTemplate.js"

/** What an answer gave the observation: the path of the recording it set, and what it set it to. */
export interface QuestionnaireFed {
  path: string
  value: unknown
  field: string
}

type Recording = Record<string, unknown> & { timeline?: { keyframes?: { t: number, shapes?: { sourceId: string, shape: Record<string, unknown> }[] }[] } }

/**
 * Sets in the witness's observation what their answers to a questionnaire say of it, each value stated and citing its answer (see ValueSource.said):
 * the witness's words come first, before anything drawn. What it reads: the account in their words, when it began (date and time), how long it lasted
 * (a duration, or the time it ended), the colour of the phenomenon, and where it was in the sky at the beginning and at the end (a cardinal point or an
 * azimuth, a height in degrees). An answer it cannot read as such (a landmark, "twice as high as the steeple") sets nothing: it stays in the
 * interview, for whoever reconstructs the scene to read.
 *
 * The phenomenon is the first the recording draws; a recording that draws none is given one, its size assumed (a witness seldom gives one that a form
 * can read), seen where the answers say.
 */
export class QuestionnaireFeed {

  /** The source the phenomenon drawn here is given, when the recording draws none. */
  static readonly PHENOMENON = "phenomenon"

  /** Sets what the answers say in `recording` (changed in place), and lists it. `interview` is the id of the case's interview event. */
  static apply(recording: Recording, json: InterviewJson, template: QuestionnaireTemplate, interview?: string): QuestionnaireFed[] {
    const answers = QuestionnaireImport.answers(json)
    const by = new Map<QuestionnaireFeedTarget, { field: string, text: string, source: ValueSource }>()
    for (const field of QuestionnaireTemplates.fields(template)) {
      const answer = field.feeds ? answers.get(field.id) : undefined
      if (field.feeds && answer) by.set(field.feeds, { field: field.id, text: answer.text, source: { said: { ...(interview !== undefined ? { interview } : {}), segment: answer.segment } } })
    }
    const fed: QuestionnaireFed[] = []
    const stated = <T>(value: T, rationale: string, source: ValueSource): StatedValue<T> => ({ value, basis: "stated", rationale, source })
    const set = (path: string, value: unknown, field: string, write: () => void) => {
      write()
      fed.push({ path, value, field })
    }
    const narrative = by.get("narrative")
    if (narrative) set("description", narrative.text, narrative.field, () => { recording.description = { [template.language ?? "fr"]: narrative.text } })
    const date = by.get("date")
    const start = by.get("startTime")
    const day = date ? QuestionnaireFeed.date(date.text) : undefined
    const clock = start ? QuestionnaireFeed.clock(start.text) : undefined
    if (day) {
      const value = clock !== undefined ? `${day}T${QuestionnaireFeed.hms(clock)}` : day
      const said = [date!.text, start?.text].filter(text => text !== undefined).join(", ")
      set("time", value, start && clock !== undefined ? start.field : date!.field, () => { recording.time = stated(value, said, (clock !== undefined ? start! : date!).source) })
    }
    const duration = by.get("duration")
    const seconds = duration ? QuestionnaireFeed.duration(duration.text, clock) : undefined
    if (duration && seconds !== undefined) set("durationSeconds", seconds, duration.field, () => { recording.durationSeconds = stated(seconds, duration.text, duration.source) })
    const color = by.get("color")
    const hex = color ? QuestionnaireFeed.color(color.text) : undefined
    const startAim = QuestionnaireFeed.aim(by.get("startAzimuth"), by.get("startElevation"))
    const endAim = QuestionnaireFeed.aim(by.get("endAzimuth"), by.get("endElevation"))
    if (hex || startAim || endAim) {
      const keyframes = (recording.timeline ??= {}).keyframes ??= []
      let first = keyframes.find(keyframe => (keyframe.shapes ?? []).length > 0)
      if (!first) {
        first = keyframes.find(keyframe => keyframe.t === 0) ?? { t: 0, shapes: [] }
        if (!keyframes.includes(first)) keyframes.unshift(first)
        first.shapes = [{ sourceId: QuestionnaireFeed.PHENOMENON, shape: { kind: "oval", color: hex ?? "#ffffff", transparency: 0, haloScale: 1.5, brightness: 0.4,
          angular: { value: { widthDeg: 0.5, heightDeg: 0.5 }, basis: "assumed", rationale: "no size the questionnaire's answers give" } } }]
      }
      const shape = first.shapes![0]
      if (hex) set(`timeline.keyframes.${keyframes.indexOf(first)}.shapes.0.shape.color`, hex, color!.field, () => { shape.shape.color = stated(hex, color!.text, color!.source) })
      if (startAim) set(`timeline.keyframes.${keyframes.indexOf(first)}.shapes.0.shape.aim`, startAim.value, startAim.field, () => { shape.shape.aim = stated(startAim.value, startAim.said, startAim.source) })
      if (endAim) {
        const at = (seconds ?? 10) * 1000
        let last = keyframes.find(keyframe => keyframe.t === at)
        if (!last) {
          last = { t: at, shapes: [] }
          keyframes.push(last)
          keyframes.sort((a, b) => a.t - b.t)
        }
        const shapes = last.shapes ??= []
        let state = shapes.find(candidate => candidate.sourceId === shape.sourceId)
        if (!state) {
          state = { sourceId: shape.sourceId, shape: {} }
          shapes.push(state)
        }
        const aim = endAim
        set(`timeline.keyframes.${keyframes.indexOf(last)}.shapes.${shapes.indexOf(state)}.shape.aim`, aim.value, aim.field, () => { state!.shape.aim = stated(aim.value, aim.said, aim.source) })
      }
    }
    return fed
  }

  private static readonly MONTHS: Record<string, number> = {
    janvier: 1, fevrier: 2, mars: 3, avril: 4, mai: 5, juin: 6, juillet: 7, aout: 8, septembre: 9, octobre: 10, novembre: 11, decembre: 12,
    january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
    enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
    gennaio: 1, febbraio: 2, aprile: 4, maggio: 5, giugno: 6, luglio: 7, settembre: 9, ottobre: 10, dicembre: 12
  }

  /** A date as written by a witness: ISO, day/month/year, or "12 mars 2024". */
  static date(text: string): string | undefined {
    const pad = (n: number) => String(n).padStart(2, "0")
    const ok = (y: number, m: number, d: number) => m >= 1 && m <= 12 && d >= 1 && d <= 31 ? `${y}-${pad(m)}-${pad(d)}` : undefined
    const iso = /(\d{4})-(\d{1,2})-(\d{1,2})/.exec(text)
    if (iso) return ok(Number(iso[1]), Number(iso[2]), Number(iso[3]))
    const numeric = /(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/.exec(text)
    if (numeric) {
      const year = Number(numeric[3]) < 100 ? 2000 + Number(numeric[3]) : Number(numeric[3])
      return ok(year, Number(numeric[2]), Number(numeric[1]))
    }
    const plain = text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    const words = /(\d{1,2})(?:er)?\s+([a-z]+)\s+(\d{4})/.exec(plain)
    const month = words ? QuestionnaireFeed.MONTHS[words[2]] : undefined
    return words && month ? ok(Number(words[3]), month, Number(words[1])) : undefined
  }

  /** A time of day as written ("21:10", "21h10", "21 h", "9:10 pm"), in seconds since midnight. */
  static clock(text: string): number | undefined {
    const match = /(\d{1,2})\s*(?:[:h]\s*(\d{2})?(?:\s*[:m]\s*(\d{2}))?|\s*(?=[ap]\.?m))\s*([ap]\.?m\.?)?/i.exec(text)
    if (!match) return undefined
    let hours = Number(match[1])
    if (match[4]) hours = hours % 12 + (/^p/i.test(match[4]) ? 12 : 0)
    if (hours > 23) return undefined
    return hours * 3600 + Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0)
  }

  private static hms(seconds: number): string {
    const pad = (n: number) => String(n).padStart(2, "0")
    return `${pad(Math.floor(seconds / 3600))}:${pad(Math.floor(seconds / 60) % 60)}:${pad(seconds % 60)}`
  }

  /**
   * A duration as written: "2 min 30 s", "1 h", "45 secondes", "1:30" (minutes and seconds); or, when it began at `start`, the time it ended ("jusqu'à
   * 21:15", "21h15"). A span ("30 à 45 s") is its middle. Undefined when it says neither.
   */
  static duration(text: string, start?: number): number | undefined {
    const plain = text.toLowerCase().replace(",", ".")
    // The time it ended: said so ("jusqu'à 21h15", "until 21:15"), or a time of day ("21:15") rather than a length ("1h30").
    const clockLike = /(\d{1,2})\s*[:h]\s*\d{2}/.exec(plain)
    if (clockLike && start !== undefined && (/jusqu|until|till|fin\b|end|termin|hasta|fino/.test(plain) || (/:/.test(clockLike[0]) && Number(clockLike[1]) >= 10))) {
      const end = QuestionnaireFeed.clock(clockLike[0])
      if (end !== undefined) return (end - start + 86400) % 86400 || undefined
    }
    // "1h30" is an hour and thirty minutes.
    const lengths = plain.replace(/(\d+)\s*h\s*(\d{2})(?!\s*(?:min|mn|s\b|sec))/g, "$1 h $2 min")
    const units = [...lengths.matchAll(/(\d+(?:\.\d+)?)\s*(?:(?:-|–|à|a|to|or|ou|o)\s*(\d+(?:\.\d+)?)\s*)?(h(?:eures?|ours?|oras?|ore)?|min\w*|mn|s(?:ec\w*)?|seg\w*)(?![a-z])/g)]
    if (units.length > 0) {
      const total = units.reduce((sum, match) => {
        const factor = match[3].startsWith("h") ? 3600 : match[3].startsWith("m") ? 60 : 1
        const value = match[2] ? (Number(match[1]) + Number(match[2])) / 2 : Number(match[1])
        return sum + value * factor
      }, 0)
      return total > 0 ? Math.round(total) : undefined
    }
    const minutes = /^\s*(\d{1,2}):(\d{2})\s*$/.exec(plain)
    return minutes ? Number(minutes[1]) * 60 + Number(minutes[2]) : undefined
  }

  private static readonly COLORS: [RegExp, string][] = [
    [/orang/, "#ff8a1f"], [/rouge|red|rojo|ross/, "#ff2a14"], [/jaune|yellow|amarill|giall/, "#ffe14a"], [/vert|green|verde/, "#3ad65a"],
    [/bleu|blue|azul|azzurr|blu/, "#4a8dff"], [/violet|purple|morad|viola/, "#a35bff"], [/rose|pink/, "#ff7ab8"], [/argent|silver|plat/, "#d8dde3"],
    [/gris|grey|gray|grig/, "#9a9a9a"], [/noir|black|negr|ner/, "#202020"], [/blanc|white|blanco|bianc/, "#ffffff"]
  ]

  /** The first colour named, as drawn. */
  static color(text: string): string | undefined {
    const plain = text.toLowerCase()
    let found: { at: number, hex: string } | undefined
    for (const [words, hex] of QuestionnaireFeed.COLORS) {
      const match = words.exec(plain)
      if (match && (!found || match.index < found.at)) found = { at: match.index, hex }
    }
    return found?.hex
  }

  private static readonly POINTS: [RegExp, number][] = [
    [/nord[- ]?nord[- ]?est|north[- ]?north[- ]?east|\bnne\b/, 22.5], [/est[- ]?nord[- ]?est|east[- ]?north[- ]?east|\bene\b/, 67.5],
    [/est[- ]?sud[- ]?est|east[- ]?south[- ]?east|\bese\b/, 112.5], [/sud[- ]?sud[- ]?est|south[- ]?south[- ]?east|\bsse\b/, 157.5],
    [/sud[- ]?sud[- ]?ouest|south[- ]?south[- ]?west|\bssw\b|\bsso\b/, 202.5], [/ouest[- ]?sud[- ]?ouest|west[- ]?south[- ]?west|\bwsw\b|\boso\b/, 247.5],
    [/ouest[- ]?nord[- ]?ouest|west[- ]?north[- ]?west|\bwnw\b|\bono\b/, 292.5], [/nord[- ]?nord[- ]?ouest|north[- ]?north[- ]?west|\bnnw\b|\bnno\b/, 337.5],
    [/nord[- ]?est|north[- ]?east|\bne\b/, 45], [/sud[- ]?est|south[- ]?east|\bse\b/, 135], [/sud[- ]?ouest|south[- ]?west|\bsw\b|\bso\b/, 225],
    [/nord[- ]?ouest|north[- ]?west|\bnw\b|\bno\b/, 315], [/\bnord\b|\bnorth\b|^n$/, 0], [/\best\b|\beast\b|^e$/, 90], [/\bsud\b|\bsouth\b|^s$/, 180],
    [/\bouest\b|\bwest\b|^o$|^w$/, 270]
  ]

  /** An azimuth as written: degrees ("230°", "azimut 230") or a cardinal point ("sud-ouest", "NNE"). */
  static azimuth(text: string): number | undefined {
    const plain = text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim()
    const degrees = /(\d{1,3}(?:[.,]\d+)?)\s*(?:°|deg|degres?|degrees?)/.exec(plain) ?? /^(?:azimut[h]?\s*)?(\d{1,3}(?:[.,]\d+)?)$/.exec(plain)
    if (degrees) {
      const value = Number(degrees[1].replace(",", "."))
      return value >= 0 && value <= 360 ? value % 360 : undefined
    }
    return QuestionnaireFeed.POINTS.find(([words]) => words.test(plain))?.[1]
  }

  /** A height above the horizon in degrees ("30°", "à 45 degrés", "à l'horizon" is 0, "au zénith" 90). */
  static elevation(text: string): number | undefined {
    const plain = text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    const degrees = /(-?\d{1,2}(?:[.,]\d+)?)\s*(?:°|deg|degres?|degrees?)/.exec(plain) ?? /^\s*(\d{1,2}(?:[.,]\d+)?)\s*$/.exec(plain)
    if (degrees) {
      const value = Number(degrees[1].replace(",", "."))
      return value >= -5 && value <= 90 ? value : undefined
    }
    if (/zenith|au-dessus de (?:ma|la) tete|overhead/.test(plain)) return 90
    if (/(?:a|sur|on) l'?horizon|at the horizon/.test(plain)) return 0
    return undefined
  }

  /** Where the phenomenon was, from an azimuth and a height the witness gave; nothing unless both read. */
  private static aim(azimuth?: { field: string, text: string, source: ValueSource }, elevation?: { field: string, text: string, source: ValueSource }) {
    const az = azimuth ? QuestionnaireFeed.azimuth(azimuth.text) : undefined
    const el = elevation ? QuestionnaireFeed.elevation(elevation.text) : undefined
    if (az === undefined || el === undefined) return undefined
    return { value: { azimuthDeg: az, altitudeDeg: el }, field: azimuth!.field, said: `${azimuth!.text} ; ${elevation!.text}`, source: azimuth!.source }
  }
}
