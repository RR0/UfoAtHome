import { HaloSky } from "../engine/atmosphere/HaloSky.js"
import { HaloTexels } from "./HaloTexels.js"

/** What the page asks of a worker: a display to trace, or the end of one it no longer wants. */
export type HaloTraceRequest =
  | { type: "trace"; id: number; altitudeDeg: number; alignment: number; rays: number }
  | { type: "cancel"; id: number }

/** A finished display, as the texels the shader reads (the buffer is handed over, not copied). */
export interface HaloTraceResult {
  id: number
  texels: Uint16Array
}

/** The part of a worker's global scope this uses (the page's own lib has no worker scope). */
export interface HaloWorkerScope {
  onmessage: ((event: MessageEvent<HaloTraceRequest>) => void) | null
  postMessage(message: HaloTraceResult, transfer: Transferable[]): void
}

/**
 * Traces ice-halo displays away from the page's thread.
 *
 * Nine hundred thousand rays through a crystal is half a second of one core, and a page of cases
 * has several scenes that each want a display: traced on the page's own thread that was most of
 * what it did while loading, in slices of its own making that still never let it go idle. Nothing
 * in the tracing needs the page — HaloSky is arithmetic on typed arrays — so it runs here, and the
 * page receives a texture and copies it.
 *
 * The rays are traced in batches with a yield between them, only so that a "cancel" can be heard:
 * a reader who seeks elsewhere has no use for the display being traced, and finishing it would keep
 * the next one waiting.
 */
export class HaloTraceWorker {

  /** Rays between two looks at the queue. Large enough that the yield is lost in the noise. */
  private static readonly RAYS_PER_BATCH = 60_000

  private readonly sky = new HaloSky()
  private readonly cancelled = new Set<number>()
  private readonly queue: Extract<HaloTraceRequest, { type: "trace" }>[] = []
  private working = false

  constructor(private readonly scope: HaloWorkerScope) {
    scope.onmessage = event => this.receive(event.data)
  }

  private receive(request: HaloTraceRequest): void {
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
        await this.trace(job)
      }
    } finally {
      this.working = false
    }
  }

  private async trace(job: { id: number; altitudeDeg: number; alignment: number; rays: number }): Promise<void> {
    this.sky.begin(job.altitudeDeg, job.alignment)
    while (this.sky.tracedRays < job.rays && !this.cancelled.has(job.id)) {
      this.sky.trace(Math.min(HaloTraceWorker.RAYS_PER_BATCH, job.rays - this.sky.tracedRays))
      // A macrotask, so that a message waiting in the port is delivered before the next batch.
      await new Promise<void>(resolve => setTimeout(resolve))
    }
    if (this.cancelled.delete(job.id)) return
    const map = this.sky.harvest()
    const texels = new Uint16Array(HaloSky.AZIMUTH_BINS * HaloSky.ALTITUDE_BINS * 4)
    HaloTexels.fromRadiance(map.data, texels)
    const result: HaloTraceResult = { id: job.id, texels }
    this.scope.postMessage(result, [texels.buffer])
  }
}

// Only when this file is what runs in a worker: the page imports its types, and must not start one.
if ("WorkerGlobalScope" in globalThis) {
  new HaloTraceWorker(globalThis as unknown as HaloWorkerScope)
}
