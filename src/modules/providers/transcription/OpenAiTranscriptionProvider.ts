import { TranscriptionAudio } from "../../../engine/transcription/TranscriptionAudio.js"
import { TranscriptionError } from "../../../engine/transcription/TranscriptionError.js"
import type { TranscribedSegment, TranscriptionProvider, TranscriptionRequest } from "../../../engine/transcription/TranscriptionProvider.js"

/** Where an OpenAI-compatible service is, which of its models transcribes, and how the reader's key is read. */
export interface OpenAiTranscriptionOptions {
  /** The API's base, without the trailing slash: `https://api.groq.com/openai/v1`. */
  base: string
  model: string
  /** The key the reader typed (see SourceCredentials), read at each transcription. */
  key: () => string | undefined
  fetchImpl?: typeof fetch
}

/** What `verbose_json` answers. */
interface VerboseJson {
  text?: string
  segments?: { start: number, end: number, text: string }[]
}

/**
 * A service that speaks OpenAI's `audio/transcriptions` (OpenAI itself, Groq), called from the page with the reader's own key: the
 * recording is SENT to it, which the editor says before anything goes.
 *
 * The recording goes in blocks of ten minutes, as 16-bit WAV (about 19 MB each): under the 25 MB a file most of these services take on
 * their free plans, and a block is what the progress moves by. Each block's times are moved to where it starts in the recording.
 *
 * These services answer a browser (CORS), checked on 2026-11-15 for Groq and OpenAI. Deepgram does not, and cannot be one of them.
 */
export class OpenAiTranscriptionProvider implements TranscriptionProvider {
  static readonly BLOCK_SECONDS = 600

  readonly sendsAudio = true
  readonly engine: string
  private readonly fetchImpl: typeof fetch

  constructor(private readonly options: OpenAiTranscriptionOptions) {
    this.engine = options.model
    this.fetchImpl = options.fetchImpl ?? fetch.bind(globalThis)
  }

  async transcribe(request: TranscriptionRequest): Promise<TranscribedSegment[]> {
    const key = this.options.key()
    if (!key) throw new TranscriptionError("noKey")
    const total = request.samples.length / TranscriptionAudio.RATE
    const segments: TranscribedSegment[] = []
    request.progress?.({ stage: "transcribing", done: 0, total })
    for (const block of TranscriptionAudio.blocks(request.samples, OpenAiTranscriptionProvider.BLOCK_SECONDS)) {
      if (request.signal?.aborted) throw request.signal.reason ?? new DOMException("Aborted", "AbortError")
      const answer = await this.send(block.samples, key, request)
      const length = block.samples.length / TranscriptionAudio.RATE
      const found = answer.segments ?? (answer.text ? [{ start: 0, end: length, text: answer.text }] : [])
      for (const segment of found) segments.push({ start: block.start + segment.start, end: block.start + segment.end, text: segment.text })
      request.progress?.({ stage: "transcribing", done: Math.min(total, block.start + length), total })
    }
    return segments
  }

  private async send(samples: Float32Array, key: string, request: TranscriptionRequest): Promise<VerboseJson> {
    const form = new FormData()
    form.append("file", TranscriptionAudio.wav(samples), "interview.wav")
    form.append("model", this.options.model)
    form.append("response_format", "verbose_json")
    form.append("timestamp_granularities[]", "segment")
    if (request.language) form.append("language", request.language.split("-")[0])
    let response: Response
    try {
      response = await this.fetchImpl(`${this.options.base}/audio/transcriptions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}` },
        body: form,
        signal: request.signal
      })
    } catch (error) {
      if ((error as Error)?.name === "AbortError") throw error
      throw new TranscriptionError("failed", String((error as Error)?.message ?? error))
    }
    if (response.status === 401 || response.status === 403) throw new TranscriptionError("key")
    if (response.status === 413) throw new TranscriptionError("tooLarge")
    if (response.status === 429) throw new TranscriptionError("rateLimited")
    if (!response.ok) throw new TranscriptionError("failed", `HTTP ${response.status}`)
    return await response.json() as VerboseJson
  }
}
