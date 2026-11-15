/** One stretch of speech a transcription found: when, in seconds since the start of the recording, and what was said. */
export interface TranscribedSegment {
  start: number
  end: number
  text: string
  /** Who speaks, as the service names them ("A", "SPEAKER_00"), when it tells voices apart. Never a person's name. */
  speaker?: string
}

/** How far a transcription has got, for the editor to show it. */
export type TranscriptionProgress =
  /** Downloading what it needs the first time (a model): bytes so far out of `total`, when known. */
  | { stage: "loading", loaded: number, total?: number }
  /** Transcribing: seconds of the recording done out of `total`. */
  | { stage: "transcribing", done: number, total: number }

/** What is asked of a transcription. */
export interface TranscriptionRequest {
  /** The recording as 16 kHz mono samples (see TranscriptionAudio.decode). */
  samples: Float32Array
  /** The language spoken, as a BCP 47 tag ("fr"): guessed by the service when absent. */
  language?: string
  progress?: (progress: TranscriptionProgress) => void
  /** Stops it between two blocks of the recording: what was done is lost, nothing is written. */
  signal?: AbortSignal
}

/**
 * What turns the recording of an interview into text: a model run in the reader's own browser, or a service the reader holds a key to.
 *
 * Two things set them apart and are said by the entry rather than discovered: whether the recording LEAVES the reader's machine
 * (`sendsAudio`), since an interview with a witness is not something to send anywhere without saying so, and what a first use costs in
 * download (`downloadBytes`), since a model of several hundred megabytes is not something to fetch without saying so either.
 *
 * Its `create()` costs nothing (see DataSource): what does the work is loaded on the first `transcribe`.
 */
export interface TranscriptionProvider {
  /** Whether the recording is sent to someone else's machine. */
  readonly sendsAudio: boolean
  /** Roughly what the first use downloads, in bytes, when it downloads anything. */
  readonly downloadBytes?: number
  /** What the transcript's `transcription.engine` says made it ("whisper-large-v3-turbo"). */
  readonly engine: string
  transcribe(request: TranscriptionRequest): Promise<TranscribedSegment[]>
}
