import { describe, expect, it } from "vitest"
import { TranscriptionAudio } from "../../../src/engine/transcription/TranscriptionAudio.js"
import { InterviewImport } from "../../../src/engine/persistence/interviewImport.js"

/** `seconds` of a tone at a 100 Hz rate, silent between `quietFrom` and `quietTo`. */
const tone = (seconds: number, quietFrom: number, quietTo: number, rate = 100): Float32Array =>
  Float32Array.from({ length: seconds * rate }, (_, i) => i / rate >= quietFrom && i / rate < quietTo ? 0 : Math.sin(i))

describe("TranscriptionAudio", () => {
  it("cuts a long recording where it is quietest before each limit, and never in a word", () => {
    const blocks = TranscriptionAudio.blocks(tone(100, 41, 42), 50, 20, 100)
    expect(blocks.map(block => block.start).slice(0, 2)).toEqual([0, 41.05])
    expect(blocks.reduce((sum, block) => sum + block.samples.length, 0)).toBe(10_000)
    for (const block of blocks) expect(block.samples.length).toBeLessThanOrEqual(5000)
  })

  it("keeps a short recording whole", () => {
    const blocks = TranscriptionAudio.blocks(tone(10, 0, 0), 50, 20, 100)
    expect(blocks).toHaveLength(1)
    expect(blocks[0].start).toBe(0)
  })

  it("mixes the channels down to one", () => {
    expect([...TranscriptionAudio.mono([Float32Array.of(1, 0), Float32Array.of(0, 1)])]).toEqual([0.5, 0.5])
  })

  it("writes 16-bit PCM WAV, mono, at the rate given", () => {
    const view = new DataView(TranscriptionAudio.wavBytes(Float32Array.of(0, 1, -1), 16_000))
    const text = (at: number) => String.fromCharCode(...new Uint8Array(view.buffer, at, 4))
    expect([text(0), text(8), text(12), text(36)]).toEqual(["RIFF", "WAVE", "fmt ", "data"])
    expect([view.getUint16(22, true), view.getUint32(24, true), view.getUint16(34, true), view.getUint32(40, true)]).toEqual([1, 16_000, 16, 6])
    expect([view.getInt16(44, true), view.getInt16(46, true), view.getInt16(48, true)]).toEqual([0, 32767, -32768])
    expect(TranscriptionAudio.wav(Float32Array.of(0)).type).toBe("audio/wav")
  })

  it("says what was found as WebVTT, which the import reads back with its times and voices", () => {
    const vtt = TranscriptionAudio.vtt([
      { start: 1.5, end: 4, text: " Where were you? ", speaker: "A" },
      { start: 3725.25, end: 3730, text: "In the park." },
      { start: 3731, end: 3732, text: "  " }
    ])
    expect(vtt).toBe("WEBVTT\n\n00:00:01.500 --> 00:00:04.000\n<v A>Where were you?\n\n01:02:05.250 --> 01:02:10.000\nIn the park.\n")
    expect(InterviewImport.parse(vtt)!.segments.map(segment => [segment.start, segment.text])).toEqual([[1.5, "Where were you?"], [3725.25, "In the park."]])
  })
})
