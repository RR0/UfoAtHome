/** Contract for `<rr0-ufo>`'s user-visible label strings — implemented per language under this
 * directory (`UfoMessages_en.ts`, `UfoMessages_fr.ts`) and loaded via `loadUfoMessages`. */
export interface UfoMessages {
  play: string
  pause: string
  noDuration: string
  autoReplay: string
  currentPosition: string
  duration: string
  /** Appended to both counters' titles to say what clicking one does. Only ever shown when the
   * observation has a start time, since with no clock there is nothing to switch to. */
  switchToElapsed: string
  switchToClockTime: string
  fullscreen: string
  exitFullscreen: string
}
