import type { TraceRequest, TraceResult } from "./TraceWorker.js"
import TracerWorker from "./TraceWorker.ts?worker&inline"

/** A job asked of the pool: call `cancel` when it is no longer wanted. */
export interface TraceJob {
  cancel(): void
}

/** What a job asks, without the id the pool gives it. */
type JobRequest = { type: "halo"; altitudeDeg: number; alignment: number; rays: number } | { type: "glow" }

interface PendingJob {
  id: number
  request: JobRequest
  done: (result: TraceResult) => void
  failed: () => void
  worker?: PoolWorker
}

interface PoolWorker {
  worker: Worker
  running?: PendingJob
}

/**
 * The few workers that work out the scene-independent parts of a sky for every scene of a page (see TraceWorker).
 *
 * Shared, not one per scene: a page of nine cases would start nine threads for work that is done in
 * under a second each, and the cores they would fight over are the ones decoding the page's images.
 * The workers are inline — their code travels inside the bundle as a blob — because a worker must
 * come from the page's own origin, and the page that loads these components is often somebody
 * else's (rr0.org loads them from ufoathome.org).
 *
 * Loaded by a dynamic import, and only for a sky that has ice in it: the worker's code (the whole
 * tracer) is the heaviest part of this and the least often wanted.
 */
export class OffThreadTracer {

  /** At most this many tracings at once, and never all of a machine's cores. */
  private static readonly MAX_WORKERS = 3

  private static shared?: OffThreadTracer | null

  /** The pool, or nothing where workers are not available (tests, an old browser, a page whose
   * policy forbids blob workers) — the caller then traces on its own thread, as it always could. */
  static get(): OffThreadTracer | null {
    if (OffThreadTracer.shared !== undefined) return OffThreadTracer.shared
    try {
      OffThreadTracer.shared = typeof Worker === "undefined" ? null : new OffThreadTracer()
    } catch {
      OffThreadTracer.shared = null
    }
    return OffThreadTracer.shared
  }

  private readonly workers: PoolWorker[] = []
  private readonly waiting: PendingJob[] = []
  private readonly jobs = new Map<number, PendingJob>()
  private nextId = 1

  private constructor() {
    const cores = typeof navigator === "undefined" ? 2 : navigator.hardwareConcurrency || 2
    const count = Math.max(1, Math.min(OffThreadTracer.MAX_WORKERS, cores - 1))
    for (let index = 0; index < count; index++) {
      const worker = new TracerWorker()
      const pooled: PoolWorker = { worker }
      worker.onmessage = (event: MessageEvent<TraceResult>) => this.finish(pooled, event.data)
      worker.onerror = () => this.fail(pooled)
      this.workers.push(pooled)
    }
  }

  /** Traces a halo display. `failed` is called if the worker dies, so the caller can do it itself. */
  trace(altitudeDeg: number, alignment: number, rays: number,
        done: (texels: Uint16Array) => void, failed: () => void): TraceJob {
    return this.submit({ type: "halo", altitudeDeg, alignment, rays },
      result => done((result as { texels: Uint16Array }).texels), failed)
  }

  /** Walks the Milky Way and zodiacal light maps, and hands back their texels. */
  glow(done: (milkyWay: Uint16Array, zodiacal: Uint16Array) => void, failed: () => void): TraceJob {
    return this.submit({ type: "glow" }, result => {
      const maps = result as { milkyWay: Uint16Array; zodiacal: Uint16Array }
      done(maps.milkyWay, maps.zodiacal)
    }, failed)
  }

  private submit(request: JobRequest, done: (result: TraceResult) => void, failed: () => void): TraceJob {
    const job: PendingJob = { id: this.nextId++, request, done, failed }
    this.jobs.set(job.id, job)
    if (this.workers.length === 0) {
      // Every worker has died: nothing will ever pick this up, so say so at once.
      queueMicrotask(() => { if (this.jobs.delete(job.id)) failed() })
      return { cancel: () => this.jobs.delete(job.id) && undefined }
    }
    this.waiting.push(job)
    this.dispatch()
    return { cancel: () => this.cancel(job) }
  }

  private dispatch(): void {
    for (const pooled of this.workers) {
      if (pooled.running) continue
      const job = this.waiting.shift()
      if (!job) return
      pooled.running = job
      job.worker = pooled
      const request: TraceRequest = { ...job.request, id: job.id }
      pooled.worker.postMessage(request)
    }
  }

  private cancel(job: PendingJob): void {
    if (!this.jobs.delete(job.id)) return
    const queued = this.waiting.indexOf(job)
    if (queued >= 0) {
      this.waiting.splice(queued, 1)
      return
    }
    // Under way: the worker stops at its next batch and sends nothing, so this worker is free now.
    const request: TraceRequest = { type: "cancel", id: job.id }
    job.worker?.worker.postMessage(request)
    if (job.worker) job.worker.running = undefined
    this.dispatch()
  }

  private finish(pooled: PoolWorker, result: TraceResult): void {
    const job = this.jobs.get(result.id)
    if (pooled.running?.id === result.id) pooled.running = undefined
    if (job) {
      this.jobs.delete(job.id)
      job.done(result)
    }
    this.dispatch()
  }

  /** A worker that errors is taken out for good, and what it was tracing is handed back to the caller. */
  private fail(pooled: PoolWorker): void {
    pooled.worker.terminate()
    this.workers.splice(this.workers.indexOf(pooled), 1)
    const lost = pooled.running
    pooled.running = undefined
    if (lost && this.jobs.delete(lost.id)) lost.failed()
    if (this.workers.length === 0) {
      OffThreadTracer.shared = null
      for (const job of this.waiting.splice(0)) if (this.jobs.delete(job.id)) job.failed()
    } else {
      this.dispatch()
    }
  }
}
