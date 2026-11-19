/** A file held in memory under its address: what an editor holds of it, handed to a reader without being written anywhere. */
export interface OpenFile {
  /** Its content, as the editor holds it now. */
  readonly json: unknown
  /** Whether it differs from what stands at its address: a link to that address does not give what is on show. */
  readonly changed: boolean
  /**
   * Whether the address is no address at all: a file picked from the disk, or made here, is held under a name beside the page, which
   * nobody else can open.
   */
  readonly local: boolean
}

/**
 * The files an editor hands to a reader on the same page, under the addresses they are read by.
 *
 * A reader opens what it reads by its address (SightingFetch), and opens the recordings a case lists by theirs: so what an editor holds,
 * changed or never written, is read by the very same paths when it is held here first. Nothing is copied into the reader, nothing of it
 * changes: it reads its case, and the case its recordings, as it always does. Held whole, and given as a copy, so that a reader never
 * writes into the editor's own objects.
 *
 * What a share dialog gives is an address: `changed` and `local` say when that address does not give what is on show.
 */
export class OpenFiles {

  private static readonly files = new Map<string, OpenFile>()

  /** Holds `files` in place of all those held before: one document is handed over at a time. */
  static holdOnly(files: ReadonlyMap<string, OpenFile>): void {
    OpenFiles.files.clear()
    for (const [url, file] of files) OpenFiles.files.set(OpenFiles.key(url), file)
  }

  /** Lets go of every file held: the reader reads from the network again. */
  static clear(): void {
    OpenFiles.files.clear()
  }

  /** A copy of what is held at `url`, if anything is. */
  static read(url: string): unknown | undefined {
    const file = OpenFiles.files.get(OpenFiles.key(url))
    return file === undefined ? undefined : structuredClone(file.json)
  }

  /** Whether any of `urls` is held changed from what stands at its address. */
  static changed(...urls: (string | undefined)[]): boolean {
    return urls.some(url => url !== undefined && OpenFiles.files.get(OpenFiles.key(url))?.changed === true)
  }

  /** Whether `url` names a file held here that has no address of its own (see OpenFile.local). */
  static local(url: string | undefined): boolean {
    return url !== undefined && OpenFiles.files.get(OpenFiles.key(url))?.local === true
  }

  /** The address absolute and without its fragment: a file is the same whichever way a page wrote its address. */
  private static key(url: string): string {
    const absolute = new URL(url, location.href)
    absolute.hash = ""
    return absolute.href
  }
}
