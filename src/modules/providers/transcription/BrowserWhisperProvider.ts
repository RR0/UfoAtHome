import { TranscriptionAudio } from "../../../engine/transcription/TranscriptionAudio.js"
import { TranscriptionError } from "../../../engine/transcription/TranscriptionError.js"
import type { TranscribedSegment, TranscriptionProvider, TranscriptionRequest } from "../../../engine/transcription/TranscriptionProvider.js"

/** What Transformers.js gives back for a block, with `return_timestamps`. */
interface WhisperOutput {
  text: string
  chunks?: { timestamp: [number, number | null], text: string }[]
}

type Recognizer = ((samples: Float32Array, options: Record<string, unknown>) => Promise<WhisperOutput>) & { dispose?: () => Promise<void> }

/** What Transformers.js says of each file it fetches. */
interface LoadEvent {
  status: string
  file?: string
  loaded?: number
  total?: number
}

/**
 * Whisper, run in the reader's own browser by Transformers.js: nothing leaves the machine, and nothing is installed.
 *
 * The model, large-v3-turbo quantized to 4 bits (about 760 MB), is downloaded on the first use and kept by the browser's cache. Measured on
 * five minutes of the Saint-Lô interview (French, a video call) on an Apple GPU through WebGPU: 6.3 times faster than real time, as good as
 * the same model run natively by whisper.cpp; the smaller models (base, small) got numbers and shapes wrong ("250 000 secondes" for 250 ms),
 * which is what matters most in a testimony. Without WebGPU it runs on the processor, many times slower.
 *
 * The library is fetched from a CDN at a fixed version on the first `transcribe`, never bundled: neither the reader nor the editor pays for it
 * until someone asks for a transcription.
 */
export class BrowserWhisperProvider implements TranscriptionProvider {
  static readonly LIBRARY = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.2/dist/transformers.min.js"
  static readonly MODEL = "onnx-community/whisper-large-v3-turbo"
  /** Both halves at 4 bits: half the download of a 16-bit encoder (760 MB instead of 1.6 GB), same text on the Saint-Lô test. */
  static readonly DTYPE = { encoder_model: "q4", decoder_model_merged: "q4" }
  /** A block between two looks at the progress and at a request to stop: about ten seconds of work on a GPU. */
  static readonly BLOCK_SECONDS = 60

  readonly sendsAudio = false
  readonly downloadBytes = 760_000_000
  readonly engine = "whisper-large-v3-turbo (Transformers.js, in the browser)"

  /** The model once loaded, for every later transcription of the page. */
  private static recognizer?: Promise<Recognizer>

  async transcribe(request: TranscriptionRequest): Promise<TranscribedSegment[]> {
    const recognize = await BrowserWhisperProvider.load(request)
    const total = request.samples.length / TranscriptionAudio.RATE
    const segments: TranscribedSegment[] = []
    request.progress?.({ stage: "transcribing", done: 0, total })
    for (const block of TranscriptionAudio.blocks(request.samples, BrowserWhisperProvider.BLOCK_SECONDS)) {
      if (request.signal?.aborted) throw request.signal.reason ?? new DOMException("Aborted", "AbortError")
      const output = await recognize(block.samples, {
        language: request.language,
        task: "transcribe",
        chunk_length_s: 30,
        stride_length_s: 5,
        return_timestamps: true
      })
      const length = block.samples.length / TranscriptionAudio.RATE
      for (const chunk of output.chunks ?? [{ timestamp: [0, length], text: output.text }]) {
        const [from, to] = chunk.timestamp
        segments.push({ start: block.start + from, end: block.start + (to ?? length), text: chunk.text })
      }
      request.progress?.({ stage: "transcribing", done: Math.min(total, block.start + length), total })
    }
    return segments
  }

  /** The recognizer, loaded once: the library, then the model, the download told as it goes. */
  private static load(request: TranscriptionRequest): Promise<Recognizer> {
    if (!BrowserWhisperProvider.recognizer) {
      BrowserWhisperProvider.recognizer = BrowserWhisperProvider.create(request).catch(error => {
        BrowserWhisperProvider.recognizer = undefined
        throw error
      })
    }
    return BrowserWhisperProvider.recognizer
  }

  private static async create(request: TranscriptionRequest): Promise<Recognizer> {
    if (typeof WebAssembly === "undefined") throw new TranscriptionError("unsupported", "WebAssembly")
    const files = new Map<string, { loaded: number, total: number }>()
    request.progress?.({ stage: "loading", loaded: 0 })
    const library = await import(/* @vite-ignore */ BrowserWhisperProvider.LIBRARY) as {
      pipeline: (task: string, model: string, options: Record<string, unknown>) => Promise<Recognizer>
    }
    const gpu = typeof navigator !== "undefined" && "gpu" in navigator
    return library.pipeline("automatic-speech-recognition", BrowserWhisperProvider.MODEL, {
      device: gpu ? "webgpu" : "wasm",
      dtype: BrowserWhisperProvider.DTYPE,
      progress_callback: (event: LoadEvent) => {
        if (event.status !== "progress" || !event.file) return
        files.set(event.file, { loaded: event.loaded ?? 0, total: event.total ?? 0 })
        let loaded = 0
        let total = 0
        for (const file of files.values()) {
          loaded += file.loaded
          total += file.total
        }
        request.progress?.({ stage: "loading", loaded, total: total || undefined })
      }
    })
  }
}
