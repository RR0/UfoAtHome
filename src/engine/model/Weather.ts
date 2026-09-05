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
  /**
   * How much of the sky the LOW and MIDDLE decks covered, 0 to 1 — the cloud that stands between a
   * witness and anything higher up.
   *
   * Carried separately rather than derived from the total, because the decks OVERLAP and the
   * subtraction is not sound: a sky reported as fully covered with sixty per cent cirrus does not
   * have forty per cent low cloud, it has an unknown amount. That derivation made the "the display
   * was hidden" case arithmetically unreachable, which is a plausible-looking model that can never
   * say one of the two things it exists to say. Undefined means nobody asked, and the total cover is
   * the best available stand-in.
   */
  lowerCloudCover?: number
  /**
   * How steadily the ice crystals were falling, 0 to 1 — the one thing about the sky that decides
   * which halo forms stood, and the one thing no record of any sighting holds.
   *
   * At 0 every crystal tumbles as it falls and the display is a plain ring or two. At 1 the plates
   * lie flat and the columns roll level, and the whole family stands: sundogs, the arc tangent on
   * top of the ring, the coloured arc high overhead, the white circle at the source's own height,
   * the shaft above a low Sun. Real skies move between the two within an hour, which is why a
   * photograph almost never shows every form at once and why the same afternoon can give a bare
   * ring and then a display of six.
   *
   * DECLARED, NEVER DEDUCED, and it is alone among the weather fields in that. What a cirrus deck's
   * crystals were doing depends on their size and on the turbulence eight kilometres up; ERA5 holds
   * neither, no reanalysis this project can reach holds either, and it could only have been known by
   * being up there with a collecting slide. So it stays editable even when every other field is
   * locked to a record, because locking it would claim a measurement that does not exist. Undefined
   * means nobody said, and DEFAULT_ICE_CRYSTAL_ALIGNMENT stands in.
   */
  iceCrystalAlignment?: number
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

/** What an unstated crystal alignment falls back to: an ordinary cirrus, well enough sorted to show
 * sundogs beside its ring but not the once-a-decade display. See Weather.iceCrystalAlignment for why
 * this is a stated assumption rather than a reading. */
export const DEFAULT_ICE_CRYSTAL_ALIGNMENT = 0.65

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
 * produced by that lookup — the editor shows them read-only on that basis, since a reanalysis
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
