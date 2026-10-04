import type { HaloTraceRequest, HaloTraceResult } from "./HaloTraceWorker.js"
import HaloWorker from "./HaloTraceWorker.ts?worker&inline"

/** A display asked of the pool: call `cancel` when it is no longer wanted. */
export interface HaloTraceJob {
  cancel(): void
}

interface PendingJob {
  id: number
  altitudeDeg: number
  alignment: number
  rays: number
  done: (texels: Uint16Array) => void
  failed: () => void
  worker?: PoolWorker
}

interface PoolWorker {
  worker: Worker
  running?: PendingJob
}

/**
 * The few workers that trace halo displays for every scene of a page (see HaloTraceWorker).
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
export class OffThreadHaloTracer {

  /** At most this many tracings at once, and never all of a machine's cores. */
  private static readonly MAX_WORKERS = 3

  private static shared?: OffThreadHaloTracer | null

  /** The pool, or nothing where workers are not available (tests, an old browser, a page whose
   * policy forbids blob workers) — the caller then traces on its own thread, as it always could. */
  static get(): OffThreadHaloTracer | null {
    if (OffThreadHaloTracer.shared !== undefined) return OffThreadHaloTracer.shared
    try {
      OffThreadHaloTracer.shared = typeof Worker === "undefined" ? null : new OffThreadHaloTracer()
    } catch {
      OffThreadHaloTracer.shared = null
    }
    return OffThreadHaloTracer.shared
  }

  private readonly workers: PoolWorker[] = []
  private readonly waiting: PendingJob[] = []
  private readonly jobs = new Map<number, PendingJob>()
  private nextId = 1

  private constructor() {
    const cores = typeof navigator === "undefined" ? 2 : navigator.hardwareConcurrency || 2
    const count = Math.max(1, Math.min(OffThreadHaloTracer.MAX_WORKERS, cores - 1))
    for (let index = 0; index < count; index++) {
      const worker = new HaloWorker()
      const pooled: PoolWorker = { worker }
      worker.onmessage = (event: MessageEvent<HaloTraceResult>) => this.finish(pooled, event.data)
      worker.onerror = () => this.fail(pooled)
      this.workers.push(pooled)
    }
  }

  /** Traces a display. `failed` is called if the worker dies, so the caller can trace it itself. */
  trace(altitudeDeg: number, alignment: number, rays: number,
        done: (texels: Uint16Array) => void, failed: () => void): HaloTraceJob {
    const job: PendingJob = { id: this.nextId++, altitudeDeg, alignment, rays, done, failed }
    this.jobs.set(job.id, job)
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
      const request: HaloTraceRequest = {
        type: "trace", id: job.id, altitudeDeg: job.altitudeDeg, alignment: job.alignment, rays: job.rays
      }
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
    const request: HaloTraceRequest = { type: "cancel", id: job.id }
    job.worker?.worker.postMessage(request)
    if (job.worker) job.worker.running = undefined
    this.dispatch()
  }

  private finish(pooled: PoolWorker, result: HaloTraceResult): void {
    const job = this.jobs.get(result.id)
    if (pooled.running?.id === result.id) pooled.running = undefined
    if (job) {
      this.jobs.delete(job.id)
      job.done(result.texels)
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
      OffThreadHaloTracer.shared = null
      for (const job of this.waiting.splice(0)) if (this.jobs.delete(job.id)) job.failed()
    } else {
      this.dispatch()
    }
  }
}
