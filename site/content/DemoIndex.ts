import { readFile } from "node:fs/promises"
import { join } from "node:path"
import type { DemoCatalogue, DemoSectionId } from "./DemoCatalogue.js"
import { demoPlayUrl } from "./DemoCatalogue.js"
import { SITE_LANGUAGES, type SiteLanguage } from "../SitePage.js"
import { parseEdtfTime } from "../../src/engine/model/Sighting.js"
import { FormatVersion } from "../../src/engine/persistence/FormatVersion.js"

/** One demo as the hub's search sees it. */
export interface DemoIndexEntry {
  readonly id: string
  readonly section: DemoSectionId
  /** Where a result leads: straight to the player with the demo open, as the title of its card does (not to the card's anchor on its sub-page). */
  readonly href: string
  readonly title: string
  readonly blurb: string
  /** ISO, as precise as the recording states it: `1965-07-01`, or `1965`. Absent if it states none. */
  readonly date?: string
  /** The recording's own `tags`: the demo is categorised where it is defined, not in a list kept beside it. */
  readonly tags: readonly string[]
}

/**
 * The catalogue as data, for the hub's search: one file per language, written at build.
 *
 * Titles and blurbs come from {@link DemoCatalogue}; dates and tags come from the recordings
 * themselves, so a tag added to a recording is searchable at the next build with nothing else to
 * edit, and a recording cannot be tagged one way here and another in its own file.
 */
export class DemoIndex {

  /** The player, which hands a reader on to their own language (see PlayerPage). */
  static readonly PLAYER_PATH = "/play/"

  constructor(private readonly root: string, private readonly catalogue: DemoCatalogue) {
  }

  async build(): Promise<Record<SiteLanguage, DemoIndexEntry[]>> {
    const index = Object.fromEntries(SITE_LANGUAGES.map(language => [language, [] as DemoIndexEntry[]])) as
      Record<SiteLanguage, DemoIndexEntry[]>
    for (const group of this.catalogue.groups) {
      for (const demo of group.demos) {
        const recording = FormatVersion.recording(JSON.parse(await readFile(join(this.root, "public", demo.src), "utf8")))
        const date = DemoIndex.isoDate(recording.time)
        const tags: string[] = recording.tags ?? []
        for (const language of SITE_LANGUAGES) {
          index[language].push({
            id: demo.id,
            section: group.section,
            href: demoPlayUrl(demo, DemoIndex.PLAYER_PATH),
            title: demo.title[language],
            blurb: demo.blurb[language],
            ...(date ? { date } : {}),
            tags
          })
        }
      }
    }
    return index
  }

  /** The day (or month, or year) of the time as the recording states it: EDTF text, bare or wrapped with its basis. */
  private static isoDate(time: any): string | undefined {
    const stated = parseEdtfTime(typeof time === "object" && time !== null ? time.value : time)
    if (!stated?.year) return undefined
    const part = (n: number) => String(n).padStart(2, "0")
    return [String(stated.year).padStart(4, "0"),
      ...(stated.month ? [part(stated.month)] : []),
      ...(stated.month && stated.day ? [part(stated.day)] : [])].join("-")
  }
}
