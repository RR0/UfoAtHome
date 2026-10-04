import type { OffThreadTracer } from "./OffThreadTracer.js"

/**
 * Whether there are workers to trace in, and the pool when there are.
 *
 * Apart from OffThreadTracer because that file holds the workers' code (the whole tracer, inlined):
 * the heaviest part of the bundle and the least often wanted, so it is fetched by a dynamic import,
 * and only by a sky that has something to trace. This is the part that knows whether to ask.
 */
export class TracerPool {

  /** The pool, `null` once known to be unavailable (tests, an old browser, a page whose policy
   * forbids blob workers), `undefined` until first asked for. */
  static pool?: OffThreadTracer | null = typeof Worker === "undefined" ? null : undefined

  /**
   * Runs `use` with the pool, or `unavailable` where there is none. Synchronously when that is
   * already known, so that a caller with no workers behaves exactly as it did before there were any.
   */
  static with(use: (pool: OffThreadTracer) => void, unavailable: () => void): void {
    const known = TracerPool.pool
    if (known === null) {
      unavailable()
      return
    }
    if (known) {
      use(known)
      return
    }
    void import("./OffThreadTracer.js").then(
      ({ OffThreadTracer: Tracer }) => {
        TracerPool.pool = Tracer.get()
        if (TracerPool.pool) use(TracerPool.pool)
        else unavailable()
      },
      () => {
        TracerPool.pool = null
        unavailable()
      }
    )
  }
}
