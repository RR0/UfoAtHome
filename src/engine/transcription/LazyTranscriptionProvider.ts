import type { TranscribedSegment, TranscriptionProvider, TranscriptionRequest } from "./TranscriptionProvider.js"

/**
 * A provider whose code is loaded on its first transcription: what an entry's `create()` gives, so that listing the choices, showing
 * what each sends and downloads, costs a few lines and nothing else.
 */
export class LazyTranscriptionProvider implements TranscriptionProvider {
  private loaded?: Promise<TranscriptionProvider>

  constructor(
    readonly sendsAudio: boolean,
    readonly engine: string,
    private readonly load: () => Promise<TranscriptionProvider>,
    readonly downloadBytes?: number
  ) {
  }

  transcribe(request: TranscriptionRequest): Promise<TranscribedSegment[]> {
    this.loaded ??= this.load().catch(error => {
      this.loaded = undefined
      throw error
    })
    return this.loaded.then(provider => provider.transcribe(request))
  }
}
