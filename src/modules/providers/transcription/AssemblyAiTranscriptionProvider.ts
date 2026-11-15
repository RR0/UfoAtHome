import { TranscriptionAudio } from "../../../engine/transcription/TranscriptionAudio.js"
import { TranscriptionError } from "../../../engine/transcription/TranscriptionError.js"
import type { TranscribedSegment, TranscriptionProvider, TranscriptionRequest } from "../../../engine/transcription/TranscriptionProvider.js"

/** Where AssemblyAI is, how the reader's key is read, and how long to wait between two looks at a transcription under way. */
export interface AssemblyAiTranscriptionOptions {
  /** `https://api.assemblyai.com`, or `https://api.eu.assemblyai.com` for the European one. */
  base: string
  /** The key the reader typed (see SourceCredentials), read at each transcription. */
  key: () => string | undefined
  fetchImpl?: typeof fetch
  /** Milliseconds between two looks at the transcription, 3 seconds unless a test says otherwise. */
  pollMs?: number
}

/** What a transcript answers, of what is used here. Times are in milliseconds. */
interface Transcript {
  id: string
  status: "queued" | "processing" | "completed" | "error"
  error?: string
  text?: string
  audio_duration?: number
  utterances?: { speaker: string, start: number, end: number, text: string }[]
}

/**
 * AssemblyAI, called from the page with the reader's own key: the one way here that tells the voices apart (`speaker_labels`), each turn
 * coming back with the voice that said it ("A", "B"…). Who each voice is stays to be said in the editor, but once per voice instead of once
 * per turn.
 *
 * Unlike a Whisper service, it must hear the whole recording at once, or a voice would not be the same from one block to the next: the
 * recording is uploaded whole, as 16-bit WAV (about 180 MB for an hour and a half), then transcribed while the page waits. The transcript is
 * deleted from the service once read, so that it keeps nothing of the interview but the upload, which it deletes on its own.
 *
 * It answers a browser (CORS), checked on 2026-11-15.
 */
export class AssemblyAiTranscriptionProvider implements TranscriptionProvider {
  static readonly POLL_MS = 3000

  readonly sendsAudio = true
  readonly engine = "AssemblyAI (speaker labels)"
  private readonly fetchImpl: typeof fetch

  constructor(private readonly options: AssemblyAiTranscriptionOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch.bind(globalThis)
  }

  async transcribe(request: TranscriptionRequest): Promise<TranscribedSegment[]> {
    const key = this.options.key()
    if (!key) throw new TranscriptionError("noKey")
    const total = request.samples.length / TranscriptionAudio.RATE
    request.progress?.({ stage: "sending" })
    const upload = await this.call<{ upload_url: string }>("/v2/upload", key, request, {
      method: "POST",
      headers: { "Content-Type": "application/octet-stream" },
      body: TranscriptionAudio.wav(request.samples, TranscriptionAudio.RATE)
    })
    const language = request.language?.split("-")[0]
    let transcript = await this.call<Transcript>("/v2/transcript", key, request, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        audio_url: upload.upload_url,
        speaker_labels: true,
        ...(language ? { language_code: language } : { language_detection: true })
      })
    })
    request.progress?.({ stage: "waiting" })
    while (transcript.status === "queued" || transcript.status === "processing") {
      await AssemblyAiTranscriptionProvider.pause(this.options.pollMs ?? AssemblyAiTranscriptionProvider.POLL_MS, request.signal)
      transcript = await this.call<Transcript>(`/v2/transcript/${transcript.id}`, key, request, { method: "GET" })
    }
    // What the service holds of the interview is the reader's to keep or not: it is not left there once read.
    this.fetchImpl(`${this.options.base}/v2/transcript/${transcript.id}`, { method: "DELETE", headers: { Authorization: key } }).catch(() => undefined)
    if (transcript.status === "error") throw new TranscriptionError("failed", transcript.error ?? "error")
    request.progress?.({ stage: "transcribing", done: total, total })
    const turns = transcript.utterances?.length ? transcript.utterances
      : transcript.text ? [{ speaker: "", start: 0, end: total * 1000, text: transcript.text }] : []
    return turns.map(turn => ({ start: turn.start / 1000, end: turn.end / 1000, text: turn.text, ...(turn.speaker ? { speaker: turn.speaker } : {}) }))
  }

  private async call<T>(path: string, key: string, request: TranscriptionRequest, init: RequestInit): Promise<T> {
    if (request.signal?.aborted) throw request.signal.reason ?? new DOMException("Aborted", "AbortError")
    let response: Response
    try {
      response = await this.fetchImpl(`${this.options.base}${path}`, {
        ...init,
        headers: { ...init.headers as Record<string, string>, Authorization: key },
        signal: request.signal
      })
    } catch (error) {
      if ((error as Error)?.name === "AbortError") throw error
      throw new TranscriptionError("failed", String((error as Error)?.message ?? error))
    }
    if (response.status === 401 || response.status === 403) throw new TranscriptionError("key")
    if (response.status === 413) throw new TranscriptionError("tooLarge")
    if (response.status === 429) throw new TranscriptionError("rateLimited")
    if (!response.ok) {
      const said = await response.json().then((body: { error?: string }) => body?.error, () => undefined)
      throw new TranscriptionError("failed", said ?? `HTTP ${response.status}`)
    }
    return await response.json() as T
  }

  /** Waits, or stops waiting as soon as the reader stops the transcription. */
  private static pause(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) return reject(signal.reason ?? new DOMException("Aborted", "AbortError"))
      const stop = () => {
        clearTimeout(timer)
        reject(signal?.reason ?? new DOMException("Aborted", "AbortError"))
      }
      const timer = setTimeout(() => {
        signal?.removeEventListener("abort", stop)
        resolve()
      }, ms)
      signal?.addEventListener("abort", stop, { once: true })
    })
  }
}
