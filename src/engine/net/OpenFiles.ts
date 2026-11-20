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

  /** Holds `files`, each in place of what was held at its address. */
  static hold(files: ReadonlyMap<string, OpenFile>): void {
    for (const [url, file] of files) OpenFiles.files.set(OpenFiles.key(url), file)
  }

  /**
   * Lets go of the copies of files that have an address: what is read of them is what stands there again. The files that have none are
   * kept, since nothing else holds them: a case picked from the disk with its recordings has them read from here, the editor loading each
   * only when it is opened.
   */
  static releaseCopies(): void {
    for (const [url, file] of OpenFiles.files) if (!file.local) OpenFiles.files.delete(url)
  }

  /** Lets go of every file held, those with no address too. */
  static clear(): void {
    OpenFiles.files.clear()
  }

  /**
   * Where files with no address of their own are held together, beside the page: under a directory of their own, so that what one names
   * of another by its bare name (a case its recordings) is found, and two files of the same name opened apart are two files.
   */
  static localBase(): string {
    return new URL(`local/${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}/`, location.href).href
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
