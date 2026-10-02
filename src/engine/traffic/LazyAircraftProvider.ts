import type { GeoPoint } from "../interpretation/Reentry.js"
import type { AircraftDescription, AircraftProvider, AircraftTraffic, AircraftTrack } from "./AircraftProvider.js"

/**
 * An AircraftProvider that is only loaded when it is first asked something.
 *
 * What reads a record of air traffic is a good deal of code, and nearly every scene is older than any record: the
 * implementation is brought in by `load` (a dynamic import) the first time a question reaches it, and not before. Whether it could hold
 * a date at all (`mayCover`) is answered without it, so that a scene that cannot have traffic never asks and never loads anything.
 *
 * A load that fails is not remembered: the next question tries it again, and meanwhile says `failed`, which is true.
 */
export class LazyAircraftProvider implements AircraftProvider {
  private loading?: Promise<AircraftProvider>

  constructor(
    readonly citation: string,
    private readonly covers: (ms: number) => boolean,
    private readonly load: () => Promise<AircraftProvider>
  ) {}

  mayCover(ms: number): boolean {
    return this.covers(ms)
  }

  async between(observer: GeoPoint, startMs: number, endMs: number, radiusKm?: number): Promise<AircraftTraffic> {
    try {
      return await (await this.provider()).between(observer, startMs, endMs, radiusKm)
    } catch {
      return { status: "failed" }
    }
  }

  async describe(track: AircraftTrack, day: string): Promise<AircraftDescription | undefined> {
    try {
      return await (await this.provider()).describe?.(track, day)
    } catch {
      return undefined
    }
  }

  private provider(): Promise<AircraftProvider> {
    if (!this.loading) {
      const loading = this.load()
      this.loading = loading
      // A load that failed is not kept.
      loading.catch(() => {
        if (this.loading === loading) this.loading = undefined
      })
    }
    return this.loading
  }
}
