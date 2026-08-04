/**
 * The sighting's reported weather condition — a static, single value for the whole observation
 * (unlike `observerTrack`, weather isn't keyframed: a witness reports "it was raining, stormy sky"
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
  /** 0-1. */
  windSpeed: number
  lightning: boolean
}

export const DEFAULT_WEATHER: Weather = {
  cloudCover: 0,
  cloudDarkness: 0,
  precipitationType: "none",
  precipitationIntensity: 0,
  windDirectionDeg: 0,
  windSpeed: 0,
  lightning: false
}
