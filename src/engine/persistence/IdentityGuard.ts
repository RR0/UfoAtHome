import type { SightingRecordingJson } from "./sightingJson.js"

/** What kind of personal detail a recording was found to state. */
export type IdentityKind = "lastName" | "firstNames" | "nameInId" | "nameInText" | "address" | "email" | "phone"

/** One personal detail found in a recording, as the author wrote it. */
export interface IdentityFinding {
  readonly kind: IdentityKind
  readonly found: string
}

/**
 * Finds what a recording says that points at a person, before it leaves the author's hands.
 *
 * It does not decide anything: publishing is the publisher's responsibility, and a name is often
 * exactly what an observer agreed to or published themselves. It only makes sure the author has seen
 * what they are about to hand out. What it looks for is what can be found reliably — the name fields,
 * those names written into an identifier or into the account, a street address, an e-mail address or
 * a telephone number — and nothing more: a place and a date can identify somebody without any of
 * those, which no check can tell.
 *
 * Only what is NEW is reported. A recording opened from a published case and saved again states
 * nothing the author has not already stood behind.
 */
export class IdentityGuard {

  /** Shorter than this and a name is as likely a word ("Li", "Al") as a person. */
  private static readonly MIN_NAME_LENGTH = 3
  private static readonly EMAIL = /[\p{L}\d._%+-]+@[\p{L}\d-]+(?:\.[\p{L}\d-]+)+/u
  private static readonly PHONE = /(?:\+\d{1,3}[ .-]?|\b0)\d(?:[ .-]?\d{2}){4}\b|\+\d[\d ().-]{8,}\d/
  private static readonly ADDRESS = new RegExp(
    "\\b\\d{1,4}\\s?(?:bis|ter)?,?\\s+(?:rue|avenue|av\\.|boulevard|bd|chemin|impasse|allée|route|place|street|st\\.|road|rd|lane|drive|via|calle|piazza)\\b",
    "iu")

  /** What `json` states that `loaded` (the recording as it was opened or last exported) did not. */
  static inspect(json: SightingRecordingJson, loaded?: SightingRecordingJson): IdentityFinding[] {
    const before = new Set((loaded ? IdentityGuard.all(loaded) : []).map(finding => `${finding.kind}:${finding.found}`))
    return IdentityGuard.all(json).filter(finding => !before.has(`${finding.kind}:${finding.found}`))
  }

  /** "Dupont" is "D.", "Jean-Charles" is "J.-C.": what stands for a name once it is no longer written. */
  static initialsOf(name: string): string {
    return name.trim().split("-").map(part => {
      const letter = [...part.trim()][0]
      return letter === undefined ? "" : `${letter.toLocaleUpperCase()}.`
    }).filter(part => part !== "").join("-")
  }

  /**
   * `text` with every one of `names` (whatever the case) written as its initials. In an identifier
   * they are bare letters ("1994-01-28-DJC"): dots and hyphens are what an identifier is made of.
   */
  static withInitials(text: string, names: readonly string[], inIdentifier = false): string {
    let result = text
    for (const name of IdentityGuard.usable(names)) {
      const initials = IdentityGuard.initialsOf(name)
      result = result.replace(new RegExp(IdentityGuard.escape(name), "giu"), inIdentifier ? initials.replace(/[.-]/g, "") : initials)
    }
    return result
  }

  /** The names the observer fields state, apart from what is already initials. */
  static namesOf(json: SightingRecordingJson): string[] {
    const observer = json.observer
    const names = [observer?.lastName, ...(observer?.firstNames ?? [])]
    return IdentityGuard.usable(names.filter((name): name is string => typeof name === "string"))
  }

  /** Whether a name field holds initials ("Q. B.", "QB", "J.-C.") rather than a name. */
  static isInitials(name: string): boolean {
    const letters = name.replace(/[^\p{L}]/gu, "")
    return letters.length > 0 && letters.length <= 3 && letters === letters.toLocaleUpperCase()
  }

  private static usable(names: readonly (string | undefined)[]): string[] {
    return names
      .map(name => (name ?? "").trim())
      .filter(name => name.length >= IdentityGuard.MIN_NAME_LENGTH && !IdentityGuard.isInitials(name))
  }

  private static all(json: SightingRecordingJson): IdentityFinding[] {
    const found: IdentityFinding[] = []
    const observer = json.observer
    const lastName = IdentityGuard.usable([observer?.lastName])
    const firstNames = IdentityGuard.usable(observer?.firstNames ?? [])
    for (const name of lastName) found.push({ kind: "lastName", found: name })
    for (const name of firstNames) found.push({ kind: "firstNames", found: name })
    const names = [...lastName, ...firstNames]

    for (const id of [json.id, observer?.id]) {
      for (const name of names) {
        if (id && id.toLocaleLowerCase().includes(name.toLocaleLowerCase())) found.push({ kind: "nameInId", found: `${id}` })
      }
    }
    for (const text of IdentityGuard.texts(json)) {
      for (const name of names) {
        if (new RegExp(`(?<![\\p{L}])${IdentityGuard.escape(name)}(?![\\p{L}])`, "iu").test(text)) {
          found.push({ kind: "nameInText", found: name })
        }
      }
      const address = IdentityGuard.ADDRESS.exec(text)?.[0]
      if (address) found.push({ kind: "address", found: address })
      const email = IdentityGuard.EMAIL.exec(text)?.[0]
      if (email) found.push({ kind: "email", found: email })
      const phone = IdentityGuard.PHONE.exec(text)?.[0]
      if (phone) found.push({ kind: "phone", found: phone })
    }
    return IdentityGuard.unique(found)
  }

  /** The free text of a recording: its account, its summary, the names of its places and the occupation. */
  private static texts(json: SightingRecordingJson): string[] {
    const said = (text: unknown): string[] => typeof text === "string" ? [text]
      : typeof text === "object" && text !== null ? Object.values(text).filter((value): value is string => typeof value === "string")
        : []
    const places = (json.place ?? []).map(place => {
      const located = place as unknown as { name?: unknown, value?: { name?: unknown } }
      return located.name ?? located.value?.name
    })
    return [
      ...said(json.description), ...said(json.summary), ...said(json.account?.observerOccupation),
      ...places.flatMap(said)
    ]
  }

  private static unique(findings: IdentityFinding[]): IdentityFinding[] {
    const seen = new Set<string>()
    return findings.filter(finding => {
      const key = `${finding.kind}:${finding.found}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  private static escape(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  }
}
