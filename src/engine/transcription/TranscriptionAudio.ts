import type { TranscribedSegment } from "./TranscriptionProvider.js"

/** One block of a recording, transcribed on its own: its samples, and where it starts in the recording, in seconds. */
export interface TranscriptionBlock {
  samples: Float32Array
  start: number
}

/**
 * The recording of an interview as a transcription takes it: decoded, cut into blocks, written as a WAV file for a service, and what was
 * found written back as WebVTT, which the editor then reads as it reads an imported transcript (see InterviewImport).
 */
export class TranscriptionAudio {
  /** What every model and service of transcription is fed: Whisper's own rate. */
  static readonly RATE = 16_000

  /**
   * `bytes` (an audio or a video file) as 16 kHz mono samples. The browser decodes the whole of it at once: a file of hours of video can be
   * too much for it, which `TranscriptionAudio.MAX_BYTES` is there to say before trying.
   */
  static async decode(bytes: ArrayBuffer): Promise<Float32Array> {
    const context = new OfflineAudioContext(1, 1, TranscriptionAudio.RATE)
    const buffer = await context.decodeAudioData(bytes)
    return TranscriptionAudio.mono(Array.from({ length: buffer.numberOfChannels }, (_, channel) => buffer.getChannelData(channel)))
  }

  /** Beyond this, a file is not decoded in the page: its audio alone is several times smaller, and is what to give. */
  static readonly MAX_BYTES = 1_000_000_000

  /** The channels as one: their mean. */
  static mono(channels: Float32Array[]): Float32Array {
    if (channels.length === 1) return channels[0]
    const out = new Float32Array(channels[0].length)
    for (const channel of channels) for (let i = 0; i < out.length; i++) out[i] += channel[i] / channels.length
    return out
  }

  /**
   * `samples` in blocks of at most `maxSeconds`, each cut where the sound is lowest in its last `searchSeconds`, so that a cut falls
   * between two words rather than in one. A block is what is transcribed between two looks at the progress and at a request to stop, and
   * what a service is sent at once.
   */
  static blocks(samples: Float32Array, maxSeconds: number, searchSeconds = 20, rate = TranscriptionAudio.RATE): TranscriptionBlock[] {
    const max = Math.round(maxSeconds * rate)
    const search = Math.min(Math.round(searchSeconds * rate), Math.floor(max / 2))
    const window = Math.round(rate / 10)
    const blocks: TranscriptionBlock[] = []
    let from = 0
    while (from < samples.length) {
      let to = Math.min(samples.length, from + max)
      if (to < samples.length) to = TranscriptionAudio.quietest(samples, to - search, to, window)
      blocks.push({ samples: samples.subarray(from, to), start: from / rate })
      from = to
    }
    return blocks
  }

  /** The middle of the quietest `window` between `from` and `to`. */
  private static quietest(samples: Float32Array, from: number, to: number, window: number): number {
    let best = to
    let lowest = Infinity
    for (let at = from; at + window <= to; at += window) {
      let energy = 0
      for (let i = at; i < at + window; i++) energy += samples[i] * samples[i]
      if (energy < lowest) {
        lowest = energy
        best = at + Math.floor(window / 2)
      }
    }
    return best
  }

  /** `samples` as a 16-bit PCM WAV file: what a service is sent, about 1.9 MB a minute. */
  static wav(samples: Float32Array, rate = TranscriptionAudio.RATE): Blob {
    return new Blob([TranscriptionAudio.wavBytes(samples, rate)], { type: "audio/wav" })
  }

  /** The bytes of `wav`. */
  static wavBytes(samples: Float32Array, rate = TranscriptionAudio.RATE): ArrayBuffer {
    const data = new DataView(new ArrayBuffer(44 + samples.length * 2))
    const text = (at: number, value: string): void => {
      for (let i = 0; i < value.length; i++) data.setUint8(at + i, value.charCodeAt(i))
    }
    text(0, "RIFF")
    data.setUint32(4, 36 + samples.length * 2, true)
    text(8, "WAVE")
    text(12, "fmt ")
    data.setUint32(16, 16, true)
    data.setUint16(20, 1, true)
    data.setUint16(22, 1, true)
    data.setUint32(24, rate, true)
    data.setUint32(28, rate * 2, true)
    data.setUint16(32, 2, true)
    data.setUint16(34, 16, true)
    text(36, "data")
    data.setUint32(40, samples.length * 2, true)
    for (let i = 0; i < samples.length; i++) {
      const sample = Math.max(-1, Math.min(1, samples[i]))
      data.setInt16(44 + i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
    }
    return data.buffer
  }

  /** What was found as WebVTT, a voice tag on each cue whose speaker is known. */
  static vtt(segments: TranscribedSegment[]): string {
    const cues = segments
      .filter(segment => segment.text.trim() !== "")
      .map(segment => {
        const said = segment.text.trim().replace(/\s+/g, " ")
        const text = segment.speaker ? `<v ${segment.speaker.replace(/>/g, "")}>${said}` : said
        return `${TranscriptionAudio.stamp(segment.start)} --> ${TranscriptionAudio.stamp(Math.max(segment.end, segment.start))}\n${text}`
      })
    return ["WEBVTT", ...cues].join("\n\n") + "\n"
  }

  /** Seconds as a WebVTT time, `hh:mm:ss.mmm`. */
  static stamp(seconds: number): string {
    const ms = Math.max(0, Math.round(seconds * 1000))
    const pad = (value: number, width = 2): string => String(value).padStart(width, "0")
    return `${pad(Math.floor(ms / 3_600_000))}:${pad(Math.floor(ms / 60_000) % 60)}:${pad(Math.floor(ms / 1000) % 60)}.${pad(ms % 1000, 3)}`
  }
}
