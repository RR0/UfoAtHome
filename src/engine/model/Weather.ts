/**
 * The sighting's reported weather condition — a static, single value for the whole observation
 * (unlike `witnessTrack`, weather isn't keyframed: a witness reports "it was raining, stormy sky"
 * as a general condition, not something that changes second-to-second during a sighting). Kept as
 * a plain flat interface, not a class — there's no keyframe store or interpolation to encapsulate,
 * so a class would just be ceremony (compare to SightingLocation/ObserverPose, also plain).
 */
export type PrecipitationType = "none" | "rain" | "snow" | "hail"

export interface Weather {
  /** 0 = clear sky, 1 = fully overcast. */
  cloudCover: number
  /** 0 = light/clear clouds, 1 = dark/stormy character. */
  cloudDarkness: number
  precipitationType: PrecipitationType
  /** 0-1; meaningless while precipitationType is "none". */
  precipitationIntensity: number
  /** Degrees clockwise from true north — same convention as ObserverPose.headingDeg. */
  windDirectionDeg: number
  /** Real-world wind speed in m/s (0 = calm, ~30 = violent storm/hurricane-force) — drives both
   * visual precipitation drift and wind audio volume directly, see SceneRenderer/WeatherAudio. */
  windSpeed: number
  /** Whether a thunderstorm was reported — drives both a scene-fog lightning flash and a delayed
   * thunderclap (see SceneRenderer's lightning-flash scheduling, named for the visual mechanism
   * it implements internally, not for this field). */
  storm: boolean
}

export const DEFAULT_WEATHER: Weather = {
  cloudCover: 0,
  cloudDarkness: 0,
  precipitationType: "none",
  precipitationIntensity: 0,
  windDirectionDeg: 0,
  windSpeed: 0,
  storm: false
}
