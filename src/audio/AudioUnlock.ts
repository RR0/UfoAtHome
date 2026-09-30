/**
 * What a phone needs before a page's sound can be heard, done from the gesture that asks for it.
 *
 * Three things stand between Web Audio and a phone's speaker, and none of them is a bug in the
 * sound itself:
 * - the context starts suspended (or "interrupted", on iOS, after a call or a switch of app) and
 *   only a user gesture resumes it;
 * - iOS starts an audio graph only when a source is STARTED inside a gesture — resuming the context
 *   alone can leave it silent — so a one-sample silent buffer is started with it;
 * - iOS mutes Web Audio while the ring switch is on silent, because the page's audio is then
 *   "ambient" — unless the page says it is "playback", as a video's is (Audio Session API, iOS 17).
 *
 * Called by every holder of a context (SightingAudio, WeatherAudio, VehicleAudio) each time a
 * gesture reaches them, and free once the context is running.
 */
export class AudioUnlock {

  private static sessionDeclared = false

  static unlock(context: AudioContext): void {
    AudioUnlock.declarePlayback()
    if (context.state === "running") return
    try {
      void Promise.resolve(context.resume()).catch(() => undefined)
      const source = context.createBufferSource()
      source.buffer = context.createBuffer(1, 1, 22050)
      source.connect(context.destination)
      source.start(0)
    } catch {
      // No Web Audio worth the name (a test double, a locked-down policy): the sound stays silent.
    }
  }

  private static declarePlayback(): void {
    if (AudioUnlock.sessionDeclared || typeof navigator === "undefined") return
    AudioUnlock.sessionDeclared = true
    try {
      const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession
      if (session) session.type = "playback"
    } catch {
      // Not offered, or refused: the ring switch then keeps its say.
    }
  }
}
