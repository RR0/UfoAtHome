/**
 * Dated orbital elements, fetched from the archive built by scripts/build-tle-archive.ts.
 *
 * This is the half of the satellite record that Satellites.ts was written without: WHICH objects
 * were up, and where. It exists for dates since February 2021 only, because that is when Laurent
 * Chabin (SCEAU) started saving the public element sets once or twice a day, precisely because
 * nobody else keeps them where a browser can reach them. Before that date this answers "not
 * covered", and Satellites.ts keeps answering what it always could.
 *
 * WHAT IS NEVER DONE: propagate a set across a hole. An element set is only a good description of an
 * orbit near its epoch, and the archive has holes (three months in late 2025). An object whose
 * nearest set is older than MAX_ELEMENT_AGE_DAYS is dropped rather than moved a week along an orbit
 * that drag has since changed; a date where that drops everything is reported as a gap. Every
 * object kept carries the age of its elements, so a reader can say how old they were.
 */

/** One element set, as the archive stores it (see RECORD_BYTES in the build script). */
export interface ElementSet {
  norad: number
  /** Unix milliseconds, UTC. */
  epochMs: number
  bstar: number
  inclinationDeg: number
  raanDeg: number
  eccentricity: number
  argOfPerigeeDeg: number
  meanAnomalyDeg: number
  /** Revolutions per day. */
  meanMotion: number
}

/** The two lists the archive keeps apart: the naked-eye objects, and every Starlink. */
export type TleKind = "visual" | "starlink"

export interface OrbitingObject {
  norad: number
  name: string
  kind: TleKind
  /** Launch date from the SATCAT, YYYY-MM-DD. */
  launch?: string
  /** McCants standard magnitude: at 1000 km, half illuminated. Absent when nobody measured one. */
  stdMag?: number
  elements: ElementSet
  /** How far the elements' epoch is from the instant asked for, in days, either side. */
  ageDays: number
}

/** Whether the archive could answer for that date, per list. */
export interface TleCoverage {
  kind: TleKind
  /** `covered`: elements were found. `before`/`after`: the date is outside the archive. `gap`: inside
   * it, but in a hole where no element set is recent enough to use. */
  status: "covered" | "before" | "after" | "gap"
  /** First and last snapshot of that list, ISO. */
  from: string
  to: string
}

export interface TleSnapshot {
  objects: OrbitingObject[]
  coverage: TleCoverage[]
  credit: string
  creditUrl: string
}

interface ArchiveIndex {
  credit: string
  source: string
  binDays: number
  recordBytes: number
  kinds: Record<TleKind, { from: string; to: string; bins: string[] }>
}

interface ObjectInfo {
  name: string
  launch?: string
  stdMag?: number
}

export interface TleArchiveOptions {
  fetchImpl?: typeof fetch
  /** Where `index.json` is looked for, in order; bins and object lists are resolved beside it. */
  indexUrls?: string[]
}

/** Where the archive lives when the page itself does not carry a copy. */
export const UFOATHOME_TLE_INDEX_URL = "https://ufoathome.org/tle/index.json"

export class TleArchive {
  /**
   * The oldest an element set may be, either side of the instant, and still be used.
   *
   * A week. An orbit a few hundred kilometres up is shifted along its track by drag, by a kilometre
   * or two a day in quiet conditions and much more when the Sun is active; after a week that can
   * be several seconds of timing, which still says which satellite crossed where. Stellarium flags
   * elements at thirty days, and draws them anyway; this does not draw them.
   */
  static readonly MAX_ELEMENT_AGE_DAYS = 7

  static readonly DAY_MS = 86_400_000

  private readonly fetchImpl: typeof fetch
  private readonly indexUrls: string[]
  private index?: Promise<{ index: ArchiveIndex; base: string } | undefined>
  private readonly files = new Map<string, Promise<unknown>>()

  constructor(options: TleArchiveOptions = {}) {
    this.fetchImpl = options.fetchImpl ?? fetch.bind(globalThis)
    this.indexUrls = options.indexUrls ?? TleArchive.defaultIndexUrls()
  }

  /** Beside the page first (this site, a dev server), ufoathome.org otherwise. */
  static defaultIndexUrls(): string[] {
    const urls: string[] = []
    if (typeof location !== "undefined" && /^https?:$/.test(location.protocol)) {
      urls.push(new URL("/tle/index.json", location.href).href)
    }
    if (!urls.includes(UFOATHOME_TLE_INDEX_URL)) urls.push(UFOATHOME_TLE_INDEX_URL)
    return urls
  }

  /**
   * The first snapshot of the archive, known without asking it: nothing is fetched for an earlier
   * date. Nearly every recording this project reconstructs is older, and none of them should cost
   * a request, or wait on one, to learn that.
   */
  static readonly FIRST_SNAPSHOT = "2021-02-22"

  /** Whether the archive exists at all and could hold that date — without fetching any element set. */
  async covers(date: Date): Promise<boolean> {
    const floor = Date.parse(`${TleArchive.FIRST_SNAPSHOT}T00:00:00Z`) - TleArchive.MAX_ELEMENT_AGE_DAYS * TleArchive.DAY_MS
    if (date.getTime() < floor) return false
    const loaded = await this.loadIndex()
    if (!loaded) return false
    return Object.values(loaded.index.kinds).some(kind =>
      date.getTime() >= Date.parse(kind.from) - TleArchive.MAX_ELEMENT_AGE_DAYS * TleArchive.DAY_MS
      && date.getTime() <= Date.parse(kind.to) + TleArchive.MAX_ELEMENT_AGE_DAYS * TleArchive.DAY_MS)
  }

  /**
   * Every object the archive knows at that instant, each with its element set nearest to it.
   *
   * Undefined when the archive itself cannot be reached — a different answer from an empty
   * snapshot, which says the archive was read and had nothing for that date.
   */
  async at(date: Date): Promise<TleSnapshot | undefined> {
    const loaded = await this.loadIndex()
    if (!loaded) return undefined
    const { index, base } = loaded
    const objects: OrbitingObject[] = []
    const coverage: TleCoverage[] = []
    for (const kind of Object.keys(index.kinds) as TleKind[]) {
      const found = await this.kindAt(kind, date, index, base)
      objects.push(...found)
      coverage.push(this.coverageOf(kind, date, index, found.length > 0))
    }
    return { objects, coverage, credit: index.credit, creditUrl: index.source }
  }

  private async kindAt(kind: TleKind, date: Date, index: ArchiveIndex, base: string): Promise<OrbitingObject[]> {
    const t = date.getTime()
    const binMs = index.binDays * TleArchive.DAY_MS
    const bin = Math.floor(t / binMs)
    // The bin holding the instant, and the neighbour on whichever side is nearer: a weekly set is at
    // most half a bin away, so these two always hold it.
    const neighbour = t - bin * binMs < binMs / 2 ? bin - 1 : bin + 1
    const available = new Set(index.kinds[kind].bins)
    const names = [bin, neighbour].map(b => new Date(b * binMs).toISOString().slice(0, 10)).filter(name => available.has(name))
    if (names.length === 0) return []
    const [info, ...bins] = await Promise.all([
      this.json<Record<string, ObjectInfo>>(new URL(`objects-${kind}.json`, base).href),
      ...names.map(name => this.binary(new URL(`${kind}/${name}.bin`, base).href))
    ])
    const nearest = new Map<number, ElementSet>()
    for (const buffer of bins) {
      for (const set of TleArchive.decode(buffer, index.recordBytes)) {
        const current = nearest.get(set.norad)
        if (!current || Math.abs(set.epochMs - t) < Math.abs(current.epochMs - t)) nearest.set(set.norad, set)
      }
    }
    const objects: OrbitingObject[] = []
    for (const elements of nearest.values()) {
      const ageDays = Math.abs(elements.epochMs - t) / TleArchive.DAY_MS
      if (ageDays > TleArchive.MAX_ELEMENT_AGE_DAYS) continue
      const about = info[elements.norad] ?? { name: String(elements.norad) }
      // A set from after the launch, read back to before it, would put an object in orbit that was
      // still on the ground.
      if (about.launch && Date.parse(`${about.launch}T00:00:00Z`) > t) continue
      objects.push({ norad: elements.norad, name: about.name, kind, launch: about.launch, stdMag: about.stdMag, elements, ageDays })
    }
    return objects
  }

  private coverageOf(kind: TleKind, date: Date, index: ArchiveIndex, found: boolean): TleCoverage {
    const { from, to } = index.kinds[kind]
    const t = date.getTime()
    const margin = TleArchive.MAX_ELEMENT_AGE_DAYS * TleArchive.DAY_MS
    const status = found ? "covered" : t < Date.parse(from) - margin ? "before" : t > Date.parse(to) + margin ? "after" : "gap"
    return { kind, status, from, to }
  }

  /** Reads 44-byte little-endian records — the layout written by scripts/build-tle-archive.ts. */
  static decode(buffer: ArrayBuffer, recordBytes: number): ElementSet[] {
    const view = new DataView(buffer)
    const sets: ElementSet[] = []
    for (let o = 0; o + recordBytes <= buffer.byteLength; o += recordBytes) {
      sets.push({
        norad: view.getUint32(o, true),
        epochMs: view.getFloat64(o + 4, true),
        bstar: view.getFloat32(o + 12, true),
        inclinationDeg: view.getFloat32(o + 16, true),
        raanDeg: view.getFloat32(o + 20, true),
        eccentricity: view.getFloat32(o + 24, true),
        argOfPerigeeDeg: view.getFloat32(o + 28, true),
        meanAnomalyDeg: view.getFloat32(o + 32, true),
        meanMotion: view.getFloat64(o + 36, true)
      })
    }
    return sets
  }

  private loadIndex(): Promise<{ index: ArchiveIndex; base: string } | undefined> {
    this.index ??= (async () => {
      for (const url of this.indexUrls) {
        try {
          const response = await this.fetchImpl(url)
          if (!response.ok) continue
          return { index: await response.json() as ArchiveIndex, base: url }
        } catch {
          // A miss beside the page is the ordinary case everywhere but ufoathome.org.
        }
      }
      return undefined
    })()
    return this.index
  }

  private json<T>(url: string): Promise<T> {
    return this.cached(url, async response => response.json()) as Promise<T>
  }

  private binary(url: string): Promise<ArrayBuffer> {
    return this.cached(url, async response => response.arrayBuffer()) as Promise<ArrayBuffer>
  }

  private cached(url: string, read: (response: Response) => Promise<unknown>): Promise<unknown> {
    let file = this.files.get(url)
    if (!file) {
      file = this.fetchImpl(url).then(response => {
        if (!response.ok) throw new Error(`${url}: ${response.status}`)
        return read(response)
      })
      // A failed fetch is not remembered: the next ask tries again.
      file.catch(() => this.files.delete(url))
      this.files.set(url, file)
    }
    return file
  }
}
