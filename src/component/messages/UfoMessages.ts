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
  /** Names the reader's own gesture, not the feature — see the project's wording rules. */
  showWitnessMap: string
  hideWitnessMap: string
  /** Shown on the map instead of the imagery when the tiles cannot be fetched — the path is still
   * drawn, so this says what is missing rather than that the map failed. */
  mapImageryUnavailable: string
  /** The account's own named moments (see Milestone) — the marks on the bar, the caption, and the
   * lettered points on the map, which go together. */
  showMilestones: string
  hideMilestones: string
}
