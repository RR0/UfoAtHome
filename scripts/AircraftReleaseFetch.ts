import { createWriteStream, existsSync, mkdirSync, statSync } from "node:fs"
import path from "node:path"
import { Readable } from "node:stream"
import { pipeline } from "node:stream/promises"

/** One file of a daily release. */
export interface ReleaseAsset {
  name: string
  size: number
  url: string
}

/** What was got for one day: the instance it came from and the parts, in order. */
export interface FetchedDay {
  day: string
  instance: string
  files: string[]
}

/** A day no instance could provide, and why each failed. */
export interface MissingDay {
  day: string
  failures: string[]
}

export interface AircraftReleaseFetchOptions {
  /** Where releases are put, one directory per day and instance. */
  dir: string
  /** The instances to try in turn. Measured on 2025-12-30 (see build-aircraft-archive.ts): prod-0 and staging-0 hold the same data, and each has days the other lacks. */
  instances?: string[]
  fetchImpl?: typeof fetch
  /** How many times a download is resumed after a network failure, before the next instance is tried. */
  retries?: number
  /** Waits before a retry, ms; replaced in tests. */
  wait?: (ms: number) => Promise<void>
  log?: (message: string) => void
}

/**
 * Gets the ADSB.lol release of a day, from the first instance that has it whole.
 *
 * Releases are GitHub releases of https://github.com/adsblol/globe_history_YYYY, tagged
 * `vYYYY.MM.DD-planes-readsb-<instance>`, with the tar in parts of at most 2 GB. An instance whose
 * release is missing for the day, or whose download keeps failing, is skipped for the next; a day
 * none can give is reported as missing, and so stays out of the archive's index — which is how a
 * scene tells "no data" from "no traffic".
 */
export class AircraftReleaseFetch {
  static readonly INSTANCES = ["readsb-prod-0", "readsb-staging-0"]
  private static readonly GITHUB = "https://github.com/adsblol"
  private static readonly API = "https://api.github.com/repos/adsblol"

  private readonly instances: string[]
  private readonly fetchImpl: typeof fetch
  private readonly retries: number
  private readonly wait: (ms: number) => Promise<void>
  private readonly log: (message: string) => void

  constructor(private readonly options: AircraftReleaseFetchOptions) {
    this.instances = options.instances ?? AircraftReleaseFetch.INSTANCES
    this.fetchImpl = options.fetchImpl ?? ((input, init) => fetch(input, init))
    this.retries = options.retries ?? 5
    this.wait = options.wait ?? (ms => new Promise(resolve => setTimeout(resolve, ms)))
    this.log = options.log ?? (() => {})
  }

  static tagOf(day: string, instance: string): string {
    return `v${day.replaceAll("-", ".")}-planes-${instance}`
  }

  async fetchDay(day: string): Promise<FetchedDay | MissingDay> {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error(`A day is YYYY-MM-DD, not ${day}`)
    const failures: string[] = []
    for (const instance of this.instances) {
      try {
        const assets = await this.release(day, instance)
        if (!assets) {
          failures.push(`${instance}: no release`)
          this.log(`${day} ${instance}: no release, trying the next`)
          continue
        }
        const dir = path.join(this.options.dir, day, instance)
        mkdirSync(dir, { recursive: true })
        const files: string[] = []
        for (const asset of assets) files.push(await this.download(asset, dir))
        return { day, instance, files }
      } catch (e) {
        failures.push(`${instance}: ${AircraftReleaseFetch.reason(e)}`)
        this.log(`${day} ${instance}: ${AircraftReleaseFetch.reason(e)}, trying the next`)
      }
    }
    return { day, failures }
  }

  /** An error's message with its cause, which is where fetch puts why it failed ("fetch failed" alone says nothing). */
  static reason(e: unknown): string {
    const error = e as Error & { cause?: { message?: string } }
    return error.cause?.message ? `${error.message} (${error.cause.message})` : error.message
  }

  static isMissing(result: FetchedDay | MissingDay): result is MissingDay {
    return "failures" in result
  }

  /** The parts of the release, in order, or undefined when there is none for that day and instance. */
  async release(day: string, instance: string): Promise<ReleaseAsset[] | undefined> {
    const tag = AircraftReleaseFetch.tagOf(day, instance)
    const response = await this.fetchImpl(`${AircraftReleaseFetch.API}/globe_history_${day.slice(0, 4)}/releases/tags/${tag}`, {
      headers: { Accept: "application/vnd.github+json" }
    })
    if (response.status === 404) return undefined
    if (!response.ok) throw new Error(`GitHub answered ${response.status} for ${tag}`)
    const json = await response.json() as { assets?: { name: string; size: number }[] }
    const assets = (json.assets ?? [])
      .map(asset => ({
        name: asset.name,
        size: asset.size,
        url: `${AircraftReleaseFetch.GITHUB}/globe_history_${day.slice(0, 4)}/releases/download/${tag}/${asset.name}`
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
    return assets.length > 0 ? assets : undefined
  }

  /** One part, resumed from what is already on disk, and checked against its published size. */
  async download(asset: ReleaseAsset, dir: string): Promise<string> {
    const file = path.join(dir, asset.name)
    for (let attempt = 0; ; attempt++) {
      const have = existsSync(file) ? statSync(file).size : 0
      if (have === asset.size) return file
      if (have > asset.size) throw new Error(`${asset.name} is ${have} bytes on disk, more than the ${asset.size} published`)
      try {
        const response = await this.fetchImpl(asset.url, have > 0 ? { headers: { Range: `bytes=${have}-` } } : undefined)
        if (!response.ok || !response.body) throw new Error(`GitHub answered ${response.status} for ${asset.name}`)
        // A server that ignores the range sends the whole file again: start over rather than append to it.
        const resumed = have > 0 && response.status === 206
        await pipeline(Readable.fromWeb(response.body as any), createWriteStream(file, { flags: resumed ? "a" : "w" }))
      } catch (e) {
        if (attempt >= this.retries) throw new Error(`${asset.name}: ${AircraftReleaseFetch.reason(e)} after ${attempt + 1} attempts`)
        this.log(`${asset.name}: ${AircraftReleaseFetch.reason(e)}, resuming`)
        await this.wait(Math.min(300_000, 1000 * 2 ** attempt))
        continue
      }
      const size = statSync(file).size
      if (size !== asset.size) {
        if (attempt >= this.retries) throw new Error(`${asset.name} is ${size} bytes, not the ${asset.size} published`)
        await this.wait(1000)
      }
    }
  }
}
