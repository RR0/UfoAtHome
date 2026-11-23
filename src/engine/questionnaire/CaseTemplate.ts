import type { SaidText } from "../model/SaidText.js"

/**
 * Where a new case starts once made: on the form of its first questionnaire, for the witness to fill it in first; or on its observation.
 *
 * The first step of what may become a process (the steps a case goes through, in an organisation's order: questionnaire, interview, enquiry,
 * classification…): only the first is said for now, and a later version of this format may list them all.
 */
export type CaseStartStep = "questionnaire" | "observation"

/** One way a case may start, as New offers it. */
export interface CaseStart {
  /** What New names it by, within its template. */
  id: string
  title: SaidText
  /** What it is for, under its title. */
  description?: SaidText
  /**
   * The questionnaires its witness is asked to fill in, each an interview of the case held through it: the id of one UFO@home knows (see
   * QuestionnaireTemplates), or the address of one, relative to the template's. None: a blank observation, and no case around it until one is made.
   */
  questionnaires?: string[]
  /** Its modules (see `CaseTemplateJson.modules`), loaded when it is chosen. */
  modules?: string[]
  /** Where it opens: on the first questionnaire's form when it has one, unless said otherwise. */
  start?: CaseStartStep
}

/**
 * A case template: what New offers to start, as a deployment of UFO@home (an organisation's, a page's) wants its cases started. Without one, New
 * starts a blank observation; with one, New offers its starts, and takes the only one without asking.
 *
 * ```json
 * { "format": 1, "id": "testimony", "title": { "en": "Testimony" },
 *   "modules": ["https://example.org/module/ufoathome-module.json"],
 *   "starts": [{ "id": "questionnaire", "title": { "en": "I saw something" }, "questionnaires": ["geipan-qt-2025"], "start": "questionnaire" }] }
 * ```
 */
export interface CaseTemplateJson {
  /** The version of this format: 1. */
  format: 1
  id: string
  title: SaidText
  /**
   * The modules the cases it starts need (the addresses of their manifests, see ModuleManifest), loaded as soon as New is used. A template the page
   * gives is the page's word, so their scripts run (see ModuleSession.require); a template from elsewhere brings what their manifests state only.
   */
  modules?: string[]
  starts: CaseStart[]
}

/** A template read, its addresses made whole. */
export interface CaseTemplate extends CaseTemplateJson {
  /** Where it was read from. */
  url: string
}

/** Reads case templates. */
export class CaseTemplates {
  static readonly FORMAT = 1

  private static readonly read = new Map<string, Promise<CaseTemplate>>()

  /** The template at `url`, read once per page; an error saying why when there is none there. */
  static load(url: string, fetchImpl: typeof fetch = fetch.bind(globalThis)): Promise<CaseTemplate> {
    const absolute = new URL(url, typeof location === "undefined" ? undefined : location.href).href
    let reading = CaseTemplates.read.get(absolute)
    if (!reading) {
      reading = (async () => {
        const response = await fetchImpl(absolute)
        if (!response.ok) throw new Error(`${absolute}: HTTP ${response.status}`)
        return CaseTemplates.check(await response.json(), absolute)
      })()
      reading.catch(() => CaseTemplates.read.delete(absolute))
      CaseTemplates.read.set(absolute, reading)
    }
    return reading
  }

  /** `json` as a template read at `url`, its addresses made whole; an error saying what is wrong with it otherwise. */
  static check(json: unknown, url: string): CaseTemplate {
    const template = json as Partial<CaseTemplateJson> | null
    if (template === null || typeof template !== "object" || !Array.isArray(template.starts)) throw new Error(`${url}: not a UFO@home case template`)
    if (typeof template.format === "number" && template.format > CaseTemplates.FORMAT) throw new Error(`${url}: format ${template.format} is newer than ${CaseTemplates.FORMAT}`)
    const whole = (address: string) => new URL(address, url).href
    const starts = template.starts.filter(start => typeof start?.id === "string").map(start => ({
      ...start,
      ...(start.questionnaires ? { questionnaires: start.questionnaires.filter(entry => typeof entry === "string").map(entry => CaseTemplates.isAddress(entry) ? whole(entry) : entry) } : {}),
      ...(start.modules ? { modules: start.modules.filter(entry => typeof entry === "string").map(whole) } : {})
    }))
    if (starts.length === 0) throw new Error(`${url}: a case template offers no start`)
    return {
      format: 1,
      id: typeof template.id === "string" ? template.id : url,
      title: template.title ?? template.id ?? url,
      ...(template.modules ? { modules: template.modules.filter(entry => typeof entry === "string").map(whole) } : {}),
      starts,
      url
    }
  }

  /** Whether a questionnaire is named by its address rather than by its id: a path or a URL, a file. */
  static isAddress(entry: string): boolean {
    return /[/:]|\.json$/i.test(entry)
  }

  /** Where `start` opens. */
  static step(start: CaseStart): CaseStartStep {
    return start.start ?? (start.questionnaires?.length ? "questionnaire" : "observation")
  }
}
