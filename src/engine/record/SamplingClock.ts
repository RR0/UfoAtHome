/**
 * Fires onTick roughly every `intervalMs`, with the elapsed time (ms) since start.
 * Abstracted so Recorder/Player logic is testable without a browser (fake timers)
 * while using requestAnimationFrame for real, on-screen use.
 */
export interface SamplingClock {
  start(onTick: (elapsedMs: number) => void): void

  stop(): void
}

/**
 * requestAnimationFrame-driven, throttled to intervalMs. Replaces the original
 * BehaviorController's background-thread busy-wait (a spin loop with no sleep)
 * with a rAF loop gated by elapsed time — same "sample at this cadence" intent,
 * without pegging a CPU core.
 */
export class RafSamplingClock implements SamplingClock {
  private rafId: number | null = null
  private startTime = 0
  private lastTick = 0

  constructor(private readonly intervalMs: number) {
  }

  start(onTick: (elapsedMs: number) => void): void {
    this.startTime = performance.now()
    this.lastTick = 0
    const loop = () => {
      const elapsed = performance.now() - this.startTime
      if (elapsed - this.lastTick >= this.intervalMs) {
        this.lastTick = elapsed
        onTick(elapsed)
      }
      this.rafId = requestAnimationFrame(loop)
    }
    this.rafId = requestAnimationFrame(loop)
  }

  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }
}

/**
 * setInterval-backed clock — swappable in tests via fake timers (vi.useFakeTimers()),
 * since jsdom/node don't run requestAnimationFrame on a real display refresh cadence.
 */
export class IntervalSamplingClock implements SamplingClock {
  private timerId: ReturnType<typeof setInterval> | null = null
  private startTime = 0

  constructor(private readonly intervalMs: number) {
  }

  start(onTick: (elapsedMs: number) => void): void {
    this.startTime = Date.now()
    this.timerId = setInterval(() => {
      onTick(Date.now() - this.startTime)
    }, this.intervalMs)
  }

  stop(): void {
    if (this.timerId !== null) {
      clearInterval(this.timerId)
      this.timerId = null
    }
  }
}
