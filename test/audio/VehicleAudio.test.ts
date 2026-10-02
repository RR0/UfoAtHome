import { beforeEach, afterEach, describe, expect, test, vi } from "vitest"
import { VehicleAudio } from "../../src/audio/VehicleAudio.js"
import type { VehicleVoice } from "../../src/audio/VehicleAudio.js"

/** A node that accepts every call a voice makes of it and remembers what it is wired to. */
class FakeNode {
  readonly connections: unknown[] = []
  readonly gain = { value: 0, setTargetAtTime: () => undefined, setValueAtTime: () => undefined, linearRampToValueAtTime: () => undefined }
  frequency = { value: 0, setTargetAtTime: () => undefined }
  Q = { value: 0, setTargetAtTime: () => undefined }
  type = ""
  buffer: unknown
  loop = false
  connect<T>(to: T): T {
    this.connections.push(to)
    return to
  }
  disconnect(): void {}
  start(): void {}
  stop(): void {}
}

const made = { nodes: [] as FakeNode[], contexts: [] as FakeContext[] }

class FakeContext {
  state = "running"
  currentTime = 0
  sampleRate = 48000
  destination = new FakeNode()
  constructor() {
    made.contexts.push(this)
  }
  resume(): Promise<void> {
    return Promise.resolve()
  }
  close(): Promise<void> {
    return Promise.resolve()
  }
  private node(): FakeNode {
    const node = new FakeNode()
    made.nodes.push(node)
    return node
  }
  createGain = () => this.node()
  createBiquadFilter = () => this.node()
  createOscillator = () => this.node()
  createBufferSource = () => this.node()
  createBuffer(channels: number, length: number): { length: number; numberOfChannels: number; getChannelData: () => Float32Array } {
    const data = new Float32Array(length)
    return { length, numberOfChannels: channels, getChannelData: () => data }
  }
}

const voice = (): VehicleVoice => ({
  id: "car",
  profile: { engine: "petrol", cylinders: 4, idleRpm: 800, maxRpm: 6000, gears: 5 } as never,
  state: { speedMs: 10, rpm: 2000, load: 0.5, braking: false } as never,
  noise: 1,
  inside: true,
  windowsOpen: false,
  distanceM: 0
})

describe("VehicleAudio, the player's volume and mute button", () => {
  beforeEach(() => {
    made.nodes.length = 0
    made.contexts.length = 0
    vi.stubGlobal("AudioContext", FakeContext)
  })
  afterEach(() => vi.unstubAllGlobals())

  const masterOf = () => made.nodes.find(node => node.gain && node.connections.includes(made.contexts[0].destination))!

  test("plays at full level until it is told otherwise", () => {
    const audio = new VehicleAudio()
    audio.resume()
    audio.setPaused(false)
    audio.setVoices([voice()])
    expect(masterOf().gain.value).toBe(1)
  })

  test("is silenced by mute, and given back, without touching what the voices are doing", () => {
    const audio = new VehicleAudio()
    audio.resume()
    audio.setPaused(false)
    audio.setVoices([voice()])
    audio.setLevel(0)
    expect(masterOf().gain.value).toBe(0)
    audio.setLevel(0.5)
    expect(masterOf().gain.value).toBe(0.5)
  })

  test("is honoured when it was set before anything was heard", () => {
    const audio = new VehicleAudio()
    audio.setLevel(0)
    audio.resume()
    audio.setPaused(false)
    audio.setVoices([voice()])
    expect(masterOf().gain.value).toBe(0)
  })
})
