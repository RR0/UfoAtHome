import { describe, expect, test } from "vitest"
import { WeatherAudio } from "../../src/render3d/WeatherAudio.js"

/** A Web Audio parameter that remembers what it was asked to go to, and a node that remembers what it is wired to. */
class FakeParam {
  value = 0
  target?: number
  setTargetAtTime(value: number): void {
    this.target = value
  }
}
class FakeNode {
  readonly connections: unknown[] = []
  started = false
  connect<T>(to: T): T {
    this.connections.push(to)
    return to
  }
  disconnect(): void {}
  start(): void {
    this.started = true
  }
  stop(): void {}
}
class FakeGain extends FakeNode {
  gain = new FakeParam()
}
class FakeFilter extends FakeNode {
  type = ""
  frequency = new FakeParam()
  Q = new FakeParam()
}
class FakeSource extends FakeNode {
  buffer: unknown
  loop = false
}

class FakeContext {
  state = "running"
  currentTime = 0
  sampleRate = 48000
  destination = new FakeNode()
  readonly gains: FakeGain[] = []
  readonly filters: FakeFilter[] = []
  readonly sources: FakeSource[] = []
  createGain(): FakeGain {
    const node = new FakeGain()
    this.gains.push(node)
    return node
  }
  createBiquadFilter(): FakeFilter {
    const node = new FakeFilter()
    this.filters.push(node)
    return node
  }
  createBufferSource(): FakeSource {
    const node = new FakeSource()
    this.sources.push(node)
    return node
  }
  createBuffer(_channels: number, length: number): { getChannelData: () => Float32Array } {
    const data = new Float32Array(length)
    return { getChannelData: () => data }
  }
  resume(): Promise<void> {
    return Promise.resolve()
  }
  close(): Promise<void> {
    return Promise.resolve()
  }
}

const SHAPE = [0.3, 0.4, 0.4, 0.4, 0.5, 0.3, 0.2, 0.1]

describe("WeatherAudio's bed of what is around", () => {
  const playing = () => {
    const context = new FakeContext()
    const audio = new WeatherAudio(context as unknown as BaseAudioContext)
    audio.setPaused(false)
    return { audio, context }
  }
  /** The bed's own gain: the one wired to the weather's master, which is wired to the speakers. */
  const bedGain = (context: FakeContext) => context.gains.find(gain => gain.connections.some(to => (to as FakeGain).connections?.includes(context.destination)))

  test("builds nothing until something is around to be heard", () => {
    const { audio, context } = playing()
    audio.setAround(0, [])
    expect(context.sources).toHaveLength(0)
  })

  test("plays a noise through one band filter per octave, at the strength asked, swelling as traffic does", () => {
    const { audio, context } = playing()
    audio.setAround(0.1, SHAPE)
    expect(context.filters.map(filter => filter.frequency.value)).toEqual([63, 125, 250, 500, 1000, 2000, 4000, 8000])
    expect(context.sources.every(source => source.started && source.loop)).toBe(true)
    expect(bedGain(context)?.gain.target).toBeCloseTo(0.1, 9)
    // The highest octave's band gets the least, as the shape has it, once the noise's own share of each band is taken into account.
    const bands = context.gains.filter(gain => context.filters.some(filter => filter.connections.includes(gain)))
    expect(bands).toHaveLength(8)
    expect(bands.every(band => (band.gain.target ?? 0) > 0)).toBe(true)
  })

  test("is silenced while the clock is stopped, and plays again when it runs", () => {
    const { audio, context } = playing()
    audio.setAround(0.1, SHAPE)
    audio.setPaused(true)
    expect(bedGain(context)?.gain.target).toBe(0)
    audio.setPaused(false)
    expect(bedGain(context)?.gain.target).toBeCloseTo(0.1, 9)
  })
})
