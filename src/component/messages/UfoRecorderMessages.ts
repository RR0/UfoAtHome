/** Contract for `<rr0-ufo-recorder>`'s user-visible label strings — implemented per language
 * under this directory (`UfoRecorderMessages_en.ts`, `UfoRecorderMessages_fr.ts`) and loaded
 * via `loadUfoRecorderMessages`. */
export interface UfoRecorderMessages {
  oval: string
  saucer: string
  triangle: string
  color: string
  transparency: string
  halo: string
  shape: string
  addShape: string
  deleteShape: string
  bringToFront: string
  sendToBack: string
  contextMenuDelete: string
  /** `{name}` gets replaced with the shape's own sourceId (e.g. "ufo-1") — see deleteShape(). */
  confirmDeleteShape: string
  /** Explains, via the disabled context-menu items' own title, why front/back/delete are all
   * disabled together — see showContextMenu(). */
  onlyOneShape: string
  samplingRate: string
  duration: string
  durationPlaceholder: string
  export: string
  record: string
  stop: string
  latitude: string
  longitude: string
  heading: string
  headingPlaceholder: string
  pitch: string
  observationTime: string
  yearPlaceholder: string
  monthPlaceholder: string
  dayPlaceholder: string
  hourPlaceholder: string
  minutePlaceholder: string
  weather: string
  cloudCover: string
  cloudDarkness: string
  precipitationType: string
  precipitationNone: string
  precipitationRain: string
  precipitationSnow: string
  precipitationHail: string
  precipitationIntensity: string
  windDirection: string
  windSpeed: string
  lightning: string
}
