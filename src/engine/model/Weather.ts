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
  /**
   * Height of the cloud layer's BASE above the ground, in meters — 600 to 2000 m covers most real
   * low cloud. It decides which side of the deck the witness is on: below it (the usual case) they
   * see it overhead, compressed toward the horizon; above it (a witness in an aircraft, on a
   * mountain) they look down on its top. Absent means unstated, and DEFAULT_CLOUD_BASE_M stands
   * in — a real observation always had a real cloud base, so there is no meaningful "no altitude"
   * rendering, only an unrecorded one.
   */
  cloudBaseM?: number
  /**
   * How much of the sky the HIGH deck covered, 0 to 1 — cirrus and cirrostratus, above about six
   * kilometres, where anything present is ice rather than water.
   *
   * Separate from cloudCover because it answers a different question. The total cover says how much
   * of the sky was hidden; this says whether there were ICE CRYSTALS in it, which is the one
   * ingredient halos, sundogs and pillars need (see IceHalos). Undefined means nobody asked — a
   * hand-authored sky with no ice cloud stated, which draws no display rather than guessing one.
   */
  highCloudCover?: number
  precipitationType: PrecipitationType
  /** 0-1; meaningless while precipitationType is "none". */
  precipitationIntensity: number
  /**
   * Degrees clockwise from true north — same convention as ObserverPose.headingDeg, and the
   * direction the wind blows *toward*, not the one it comes from: SceneRenderer drifts every
   * precipitation particle along exactly this bearing (`sin/-cos`, north = -Z), so 0 means snow
   * drifting northward. That is the opposite of the meteorological convention every real record
   * uses ("wind 270" = a westerly, blowing east) — OpenMeteoWeatherProvider turns one into the
   * other, and it is the only place that conversion belongs.
   */
  windDirectionDeg: number
  /** Real-world wind speed in m/s (0 = calm, ~30 = violent storm/hurricane-force) — drives both
   * visual precipitation drift and wind audio volume directly, see SceneRenderer/WeatherAudio. */
  windSpeed: number
  /** Whether a thunderstorm was reported — drives both a scene-fog lightning flash and a delayed
   * thunderclap (see SceneRenderer's lightning-flash scheduling, named for the visual mechanism
   * it implements internally, not for this field). */
  storm: boolean
}

/** What an unstated cloud base falls back to — a mid-low deck, and the value that reproduces
 * exactly the layer geometry this project rendered before cloudBaseM existed. */
export const DEFAULT_CLOUD_BASE_M = 1000

export const DEFAULT_WEATHER: Weather = {
  cloudCover: 0,
  cloudDarkness: 0,
  precipitationType: "none",
  precipitationIntensity: 0,
  windDirectionDeg: 0,
  windSpeed: 0,
  storm: false
}

/**
 * Where a recording's weather values came from, when they weren't stated by the witness but
 * looked up from a real meteorological record for the observation's own date/time and place (see
 * engine/weather/WeatherProvider.ts). Present on a Sighting means every weatherTrack keyframe was
 * produced by that lookup — the recorder shows them read-only on that basis, since a reanalysis
 * value is a measurement to report, not a dial to tune. Absent means the opposite and the stronger
 * claim: the conditions are the WITNESS's, declared, and nothing may overwrite them — the same
 * "declared, not deduced" rule BaseShape.behindCloud follows.
 */
export interface WeatherSource {
  /** Stable dataset id, e.g. "era5" — what a later reader identifies the record by. */
  id: string
  /** Human-readable dataset name, e.g. "ERA5 (Open-Meteo)". */
  name: string
  /** The exact request that produced these values, so the claim stays checkable years later. */
  url: string
}
