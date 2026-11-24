import type { SaidText } from "../model/SaidText.js"
import type { SealRecipient } from "./QuestionnaireSeal.js"
import { QuestionnaireTemplates, type QuestionnaireTemplate } from "./QuestionnaireTemplate.js"

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
   * The questionnaires its witness is asked to fill in, each an interview of the case held through it: the id of one its template brings (see
   * CaseTemplateJson.questionnaires) or the page knows (see QuestionnaireTemplates), or the address of one, relative to the template's. None: a
   * blank observation, and no case around it until one is made.
   */
  questionnaires?: string[]
  /** Its modules (see `CaseTemplateJson.modules`), loaded when it is chosen. */
  modules?: string[]
  /** Where it opens: on the first questionnaire's form when it has one, unless said otherwise. */
  start?: CaseStartStep
  /** Who the confidential answers of its questionnaires are sealed for: its template's (see CaseTemplateJson.recipient). */
  recipient?: SealRecipient
}

/**
 * A case template: what New offers to start, as a deployment of UFO@home (an organisation's, a page's) wants its cases started. Without one, New
 * starts a blank observation; with one, New offers its starts, and takes the only one without asking.
 *
 * ```json
 * { "format": 1, "id": "testimony", "title": { "en": "Testimony" },
 *   "modules": ["https://example.org/module/ufoathome-module.json"],
 *   "questionnaires": [{ "id": "sighting-form", "title": { "en": "Sighting form" }, "sections": [] }],
 *   "starts": [{ "id": "questionnaire", "title": { "en": "I saw something" }, "questionnaires": ["sighting-form"], "start": "questionnaire" }] }
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
  /**
   * Who receives the testimonies it starts (an organisation): the confidential answers of their questionnaires are sealed for it (see
   * QuestionnaireSeal), its public key given here, so that nobody else can read them wherever the case goes, and nobody has to send a key to anybody.
   */
  recipient?: SealRecipient
  /**
   * The questionnaires it brings itself, whole (see QuestionnaireTemplate), named by their id in its starts: what makes a template one file that
   * needs no other, as one read from the reader's own disk has to be (its pictures then whole addresses or `data:` ones).
   */
  questionnaires?: QuestionnaireTemplate[]
  starts: CaseStart[]
}

/** A template read, its addresses made whole. */
export interface CaseTemplate extends CaseTemplateJson {
  /** Where it was read from: an address, or the page's own for one read from a file. */
  url: string
  /**
   * Who gave it: the page (its `case-template`), whose word runs the scripts of the modules it names; or the reader, from a file of theirs or from
   * an address they typed, kept in this browser (see LocalCaseTemplate), whose modules bring what their manifests state, their code only once the
   * reader has agreed to it (`scripts`).
   */
  origin: "page" | "file" | "address"
  /** The name of the file it was read from, for one the reader gave. */
  fileName?: string
  /** For one the reader gave: whether they agreed to run the code of the modules it names, which come from where it says, not from this site. */
  scripts?: boolean
}

/** Reads case templates. */
export class CaseTemplates {
  static readonly FORMAT = 1

  private static readonly read = new Map<string, Promise<CaseTemplate>>()

  /**
   * Makes the questionnaires `template` brings known to the page (see QuestionnaireTemplates.add), and those it names by address read: what the
   * starts it offers and the interviews it made need, a case saved under it opened again included.
   */
  static async install(template: CaseTemplate): Promise<void> {
    for (const questionnaire of template.questionnaires ?? []) QuestionnaireTemplates.add(questionnaire)
    const addressed = template.starts.flatMap(start => start.questionnaires ?? []).filter(entry => CaseTemplates.isAddress(entry))
    await Promise.all([...new Set(addressed)].map(address => QuestionnaireTemplates.load(address)))
  }

  /** The template at `url`, read once per page; an error saying why when there is none there. */
  static load(url: string, fetchImpl: typeof fetch = fetch.bind(globalThis)): Promise<CaseTemplate> {
    const absolute = new URL(url, typeof location === "undefined" ? undefined : location.href).href
    let reading = CaseTemplates.read.get(absolute)
    if (!reading) {
      reading = (async () => {
        const response = await fetchImpl(absolute)
        if (!response.ok) throw new Error(`${absolute}: HTTP ${response.status}`)
        return CaseTemplates.check(await response.json(), absolute, "page")
      })()
      reading.catch(() => CaseTemplates.read.delete(absolute))
      CaseTemplates.read.set(absolute, reading)
    }
    return reading
  }

  /** `json` as a template read at `url`, its addresses made whole; an error saying what is wrong with it otherwise. */
  static check(json: unknown, url: string, origin: CaseTemplate["origin"] = "page", fileName?: string, scripts?: boolean): CaseTemplate {
    const template = json as Partial<CaseTemplateJson> | null
    if (template === null || typeof template !== "object" || !Array.isArray(template.starts)) throw new Error(`${url}: not a UFO@home case template`)
    if (typeof template.format === "number" && template.format > CaseTemplates.FORMAT) throw new Error(`${url}: format ${template.format} is newer than ${CaseTemplates.FORMAT}`)
    const whole = (address: string) => new URL(address, url).href
    const recipient = CaseTemplates.recipientOf(template.recipient, url)
    const starts = template.starts.filter(start => typeof start?.id === "string").map(start => ({
      ...start,
      ...(recipient ? { recipient } : {}),
      ...(start.questionnaires ? { questionnaires: start.questionnaires.filter(entry => typeof entry === "string").map(entry => CaseTemplates.isAddress(entry) ? whole(entry) : entry) } : {}),
      ...(start.modules ? { modules: start.modules.filter(entry => typeof entry === "string").map(whole) } : {})
    }))
    if (starts.length === 0) throw new Error(`${url}: a case template offers no start`)
    // Its own questionnaires, their relative pictures read against it (a file's own have none: theirs are whole or `data:`).
    const questionnaires = Array.isArray(template.questionnaires)
      ? template.questionnaires.filter(questionnaire => typeof questionnaire?.id === "string" && Array.isArray(questionnaire.sections))
        .map(questionnaire => QuestionnaireTemplates.withImages(structuredClone(questionnaire), src => /^[a-z][a-z0-9+.-]*:/i.test(src) ? src : whole(src)))
      : undefined
    return {
      format: 1,
      id: typeof template.id === "string" ? template.id : url,
      title: template.title ?? template.id ?? url,
      ...(template.modules ? { modules: template.modules.filter(entry => typeof entry === "string").map(whole) } : {}),
      ...(recipient ? { recipient } : {}),
      ...(questionnaires?.length ? { questionnaires } : {}),
      starts,
      url,
      origin,
      ...(fileName ? { fileName } : {}),
      ...(scripts !== undefined ? { scripts } : {})
    }
  }

  /** `recipient` when it is one: an id and an RSA public key, nothing private. An error saying why otherwise. */
  private static recipientOf(recipient: SealRecipient | undefined, url: string): SealRecipient | undefined {
    if (recipient === undefined) return undefined
    const key = recipient?.publicKey
    if (typeof recipient.id !== "string" || !key || key.kty !== "RSA" || typeof key.n !== "string") throw new Error(`${url}: its recipient has no RSA public key`)
    if (key.d !== undefined) throw new Error(`${url}: its recipient gives a private key, which must never be published`)
    const { kty, n, e, alg } = key
    return { id: recipient.id, name: recipient.name ?? recipient.id, publicKey: { kty, n, e, ...(alg ? { alg } : {}) },
      ...(typeof recipient.email === "string" && /^[^@\s]+@[^@\s]+$/.test(recipient.email) ? { email: recipient.email } : {}) }
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

/**
 * The case template the reader gave from a file of their own, kept in this browser (localStorage) so that New offers it on every visit, until
 * they forget it. One at a time; nothing of it leaves the browser. Every access in a try: storage may be refused (a private window, a full disk).
 */
export class LocalCaseTemplate {
  static readonly KEY = "rr0-case-template"

  /** The template kept, read; undefined when none is, or what is kept is no template any more. */
  static read(storage: Storage | undefined = LocalCaseTemplate.storage()): CaseTemplate | undefined {
    try {
      const kept = LocalCaseTemplate.record(storage)
      return kept ? LocalCaseTemplate.parse(kept.text, kept.name, kept.url, kept.scripts) : undefined
    } catch {
      return undefined
    }
  }

  /**
   * `text` as a template: the file `name`, or what was read at `url`, against which its relative addresses (its questionnaires, its modules) are
   * then read. An error saying why when it is none.
   */
  static parse(text: string, name?: string, url?: string, scripts?: boolean): CaseTemplate {
    const base = url ?? (typeof location === "undefined" ? "https://localhost/" : location.href)
    return CaseTemplates.check(JSON.parse(text), base, url ? "address" : "file", name, scripts)
  }

  /**
   * Keeps `text` as the reader's template (the file `name`, or what was read at `url`) once it reads as one, its modules' code not run until the
   * reader agrees to it (see allowScripts); returns it. An error when it is none, or cannot be kept.
   */
  static keep(text: string, name: string, storage: Storage | undefined = LocalCaseTemplate.storage(), url?: string): CaseTemplate {
    const template = LocalCaseTemplate.parse(text, name, url, false)
    if (!storage) throw new Error("No storage in this browser")
    storage.setItem(LocalCaseTemplate.KEY, JSON.stringify({ name, text, ...(url ? { url } : {}), scripts: false }))
    return template
  }

  /** Records whether the reader agreed to run the code of the modules the kept template names. */
  static allowScripts(allowed: boolean, storage: Storage | undefined = LocalCaseTemplate.storage()): void {
    try {
      const kept = LocalCaseTemplate.record(storage)
      if (kept) storage!.setItem(LocalCaseTemplate.KEY, JSON.stringify({ ...kept, scripts: allowed }))
    } catch {
      // Not kept: asked again next time.
    }
  }

  /** Forgets the template kept. */
  static forget(storage: Storage | undefined = LocalCaseTemplate.storage()): void {
    try {
      storage?.removeItem(LocalCaseTemplate.KEY)
    } catch {
      // Nothing kept, nothing to forget.
    }
  }

  private static record(storage: Storage | undefined): { name?: string, text: string, url?: string, scripts?: boolean } | undefined {
    const kept = storage?.getItem(LocalCaseTemplate.KEY)
    return kept ? JSON.parse(kept) : undefined
  }

  private static storage(): Storage | undefined {
    try {
      return typeof localStorage === "undefined" ? undefined : localStorage
    } catch {
      return undefined
    }
  }
}
