import { MilkyWay } from "../engine/astronomy/MilkyWay.js"
import { ZodiacalLight } from "../engine/astronomy/ZodiacalLight.js"
import { HaloSky } from "../engine/atmosphere/HaloSky.js"
import { GlowTexels } from "./GlowTexels.js"
import { HaloTexels } from "./HaloTexels.js"

/** What the page asks of a worker: a display or the glow maps to work out, or the end of one it no
 * longer wants. */
export type TraceRequest =
  | { type: "halo"; id: number; altitudeDeg: number; alignment: number; rays: number }
  | { type: "glow"; id: number }
  | { type: "cancel"; id: number }

/** A finished job, as the texels the shader reads (the buffers are handed over, not copied). */
export type TraceResult =
  | { id: number; texels: Uint16Array }
  | { id: number; milkyWay: Uint16Array; zodiacal: Uint16Array }

/** The part of a worker's global scope this uses (the page's own lib has no worker scope). */
export interface TraceWorkerScope {
  onmessage: ((event: MessageEvent<TraceRequest>) => void) | null
  postMessage(message: TraceResult, transfer: Transferable[]): void
}

type Job = Exclude<TraceRequest, { type: "cancel" }>

/**
 * Works out, away from the page's thread, what a sky is made of that depends on no scene.
 *
 * Two things, both arithmetic on typed arrays. An ice-halo display: nine hundred thousand rays
 * through a crystal is half a second of one core, and a page of cases has several scenes that each
 * want one. And the Milky Way and zodiacal light maps: some nine million steps of line-of-sight
 * integral, the same for every scene, which the page used to walk in slices of its own making that
 * still never let it go idle. The page receives textures and copies them.
 *
 * Both are done in batches with a yield between them, only so that a "cancel" can be heard: a
 * reader who seeks elsewhere has no use for the display being traced, and finishing it would keep
 * the next one waiting.
 */
export class TraceWorker {

  /** Rays between two looks at the queue. Large enough that the yield is lost in the noise. */
  private static readonly RAYS_PER_BATCH = 60_000
  /** Rows of each glow map between two looks at the queue (a row is a few tens of thousands of steps). */
  private static readonly ROWS_PER_BATCH = 4

  private readonly sky = new HaloSky()
  private readonly cancelled = new Set<number>()
  private readonly queue: Job[] = []
  private working = false

  constructor(private readonly scope: TraceWorkerScope) {
    scope.onmessage = event => this.receive(event.data)
  }

  private receive(request: TraceRequest): void {
    if (request.type === "cancel") {
      this.cancelled.add(request.id)
      return
    }
    this.queue.push(request)
    if (!this.working) void this.work()
  }

  private async work(): Promise<void> {
    this.working = true
    try {
      for (let job = this.queue.shift(); job; job = this.queue.shift()) {
        if (job.type === "halo") await this.traceHalo(job)
        else await this.walkGlow(job.id)
      }
    } finally {
      this.working = false
    }
  }

  /** A macrotask, so that a message waiting in the port is delivered before the next batch. */
  private static yield(): Promise<void> {
    return new Promise<void>(resolve => setTimeout(resolve))
  }

  private async traceHalo(job: { id: number; altitudeDeg: number; alignment: number; rays: number }): Promise<void> {
    this.sky.begin(job.altitudeDeg, job.alignment)
    while (this.sky.tracedRays < job.rays && !this.cancelled.has(job.id)) {
      this.sky.trace(Math.min(TraceWorker.RAYS_PER_BATCH, job.rays - this.sky.tracedRays))
      await TraceWorker.yield()
    }
    if (this.cancelled.delete(job.id)) return
    const map = this.sky.harvest()
    const texels = new Uint16Array(HaloSky.AZIMUTH_BINS * HaloSky.ALTITUDE_BINS * 4)
    HaloTexels.fromRadiance(map.data, texels)
    const result: TraceResult = { id: job.id, texels }
    this.scope.postMessage(result, [texels.buffer])
  }

  private async walkGlow(id: number): Promise<void> {
    const galaxy = new MilkyWay()
    const dust = new ZodiacalLight()
    while (!(galaxy.done && dust.done) && !this.cancelled.has(id)) {
      galaxy.walk(TraceWorker.ROWS_PER_BATCH)
      dust.walk(TraceWorker.ROWS_PER_BATCH)
      await TraceWorker.yield()
    }
    if (this.cancelled.delete(id)) return
    const milkyWay = new Uint16Array(MilkyWay.LONGITUDE_STEPS * MilkyWay.LATITUDE_STEPS * 4)
    const zodiacal = new Uint16Array(ZodiacalLight.LONGITUDE_STEPS * ZodiacalLight.LATITUDE_STEPS * 4)
    GlowTexels.fromMap(galaxy.harvest(), milkyWay)
    GlowTexels.fromMap(dust.harvest(), zodiacal)
    const result: TraceResult = { id, milkyWay, zodiacal }
    this.scope.postMessage(result, [milkyWay.buffer, zodiacal.buffer])
  }
}

// Only when this file is what runs in a worker: the page imports its types, and must not start one.
if ("WorkerGlobalScope" in globalThis) {
  new TraceWorker(globalThis as unknown as TraceWorkerScope)
}
