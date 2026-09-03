import type { Sighting } from "../engine/model/Sighting.js"
import { formatEdtfTime, resolveObserverPoseAt, resolveSoundAt, resolveWeatherAt, sightingDurationMs } from "../engine/model/Sighting.js"
import type { DecorKind, DecorObject, DecorSide } from "../engine/model/Decor.js"
import { resolveDecorLitAt, resolveDecorPlacementAt } from "../engine/model/Decor.js"
import { LIGHT_RIGS } from "../engine/model/LightRig.js"
import type { PrecipitationType } from "../engine/model/Weather.js"
import type { SoundKind } from "../engine/model/Sound.js"
import { Instruments } from "../engine/instrument/Instrument.js"
import type { SightingLabels } from "./messages/SightingLabels.js"

/** Which group of the recorder's own tab strip a summary entry belongs to. The player ignores
 * these; the recorder maps them onto its panels, so that clicking a chip opens the one holding
 * the field. */
export type SummaryGroup = "observation" | "witness" | "location" | "decor" | "temporal" | "weather" | "sound" | "shape"

/** One thing a recording states. `field` is the name of the field it came from, which is also the
 * id the recorder gives that field's own control — that coincidence is what lets a chip put the
 * caret in the right input without the summary knowing anything about the form. */
export interface SummaryEntry {
  group: SummaryGroup
  field: string
  label: string
  value: string
  /** "m", "°", "%"… — a symbol, never translated. Empty when the value carries its own. */
  unit: string
  /** A colour to show as a swatch beside the value, when the value IS a colour. */
  color?: string
  /** True when a real record supplied this value rather than the witness — see Sighting.weatherSource. */
  fromSource: boolean
}

/** What the caller knows that the file itself does not.
 *
 * `decorId`/`sourceId` are what the recorder is currently pointing at, so the entries can describe
 * that decor object and that shape rather than every one of them; the player passes neither and
 * gets the observation itself: where, when, through what, under what sky.
 *
 * `groundElevationM` is not a convenience. A pose's own `elevationM` is height ABOVE THE GROUND,
 * while the field both components label "Altitude" is height above SEA LEVEL — the difference
 * being the terrain's own height there, which is a lookup and lives nowhere in the file. Without
 * it this summary read 0 m for a witness standing 220 m up, contradicting the very editor it sits
 * under. Absent, the entry falls back to the raw value, which is the same number only at sea
 * level.
 */
export interface SummaryContext {
  decorId?: string
  sourceId?: string
  groundElevationM?: number
}

/**
 * Everything a recording states, as a flat list of label/value pairs.
 *
 * Read off the `Sighting` and not off any form, which is what lets the editor and the player show
 * the same summary of the same file — and the reason it exists at all: `<rr0-eyewitness>` has no
 * form to read. The cost of that is this class: a form's own markup already pairs a label with a
 * value and a unit, a model doesn't, so each field has to be named here once. It is named ONCE —
 * an earlier version of this summary lived in the recorder and derived itself from the editor's
 * DOM, and duplicating that for the player would have been two summaries of one object, free to
 * drift apart.
 *
 * Only what is actually set appears (28 entries of a possible ~55 on a real case), so the list
 * reads as a statement about this sighting rather than as a second rendering of the form.
 */
export class SightingSummary {
  /** `language` is needed for the catalogue entries alone — an instrument's name is data, and data
   * carries every language it speaks rather than only English (see Instrument.name). Everything
   * else here is named from `labels`. */
  constructor(private readonly labels: SightingLabels, private readonly language: "en" | "fr") {
  }

  /** The entries for `sighting` as it stands at `timeMs` on the recording's own clock — weather,
   * sound, pose and decor placement are all keyframed, so a summary without an instant would have
   * to pick one silently. */
  entriesFor(sighting: Sighting, timeMs: number, context: SummaryContext = {}): SummaryEntry[] {
    const entries: SummaryEntry[] = []
    this.addObservation(entries, sighting)
    this.addWitness(entries, sighting, timeMs)
    this.addLocation(entries, sighting, timeMs, context.groundElevationM)
    this.addDecor(entries, sighting, timeMs, context.decorId)
    this.addTemporal(entries, sighting)
    this.addWeather(entries, sighting, timeMs)
    this.addSound(entries, sighting, timeMs)
    this.addShape(entries, sighting, timeMs, context.sourceId)
    return entries
  }

  /** Adds one entry, unless it has nothing to state. Every `add*` below funnels through here, so
   * "empty means absent" is decided in one place rather than at fifty call sites. */
  private push(
    entries: SummaryEntry[],
    group: SummaryGroup,
    field: string,
    label: string,
    value: string | number | undefined,
    unit = "",
    options: { fromSource?: boolean, color?: string } = {}
  ): void {
    if (value === undefined || value === "") {
      return
    }
    entries.push({
      group,
      field,
      label,
      value: String(value),
      unit,
      color: options.color,
      fromSource: options.fromSource === true
    })
  }

  /** A 0..1 proportion as it is read rather than as it is stored: "35 %", not "0.35". */
  private percent(value: number | undefined): string | undefined {
    return value === undefined ? undefined : `${Math.round(value * 100)} %`
  }

  private rounded(value: number | undefined, decimals = 0): string | undefined {
    return value === undefined ? undefined : String(Number(value.toFixed(decimals)))
  }

  private addObservation(entries: SummaryEntry[], sighting: Sighting): void {
    this.push(entries, "observation", "caseId", this.labels.caseId, sighting.caseId)
    // The description is deliberately not an entry: it is prose, sometimes a paragraph of it, and
    // a chip is a glance. It stays where prose belongs — the player's info panel, which is
    // exactly what it is left holding once the summary takes the fields off its hands.
    const tags = sighting.event.tags
    this.push(entries, "observation", "tags", this.labels.tags, tags && tags.length > 0 ? tags.join(", ") : undefined)
  }

  private addWitness(entries: SummaryEntry[], sighting: Sighting, timeMs: number): void {
    const witness = sighting.witness
    this.push(entries, "witness", "witnessId", this.labels.witnessId, witness?.id)
    this.push(entries, "witness", "witnessTitle", this.labels.witnessTitle, witness?.title)
    this.push(entries, "witness", "witnessLastName", this.labels.witnessLastName, witness?.lastName)
    const firstNames = witness?.firstNames
    this.push(entries, "witness", "witnessFirstNames", this.labels.witnessFirstNames,
      firstNames && firstNames.length > 0 ? firstNames.join(", ") : undefined)

    const instrument = sighting.instrument
    this.push(entries, "witness", "instrument", this.labels.instrument, instrument.name[this.language])
    // The recording's own, not the instant's: one observation was photographed one way (see
    // Sighting.exposureSeconds), so this stands whether or not there is a pose to read.
    const exposure = sighting.exposure
    this.push(entries, "witness", "exposureSeconds", this.labels.exposure,
      exposure === undefined ? undefined : (exposure < 1 ? `1/${Math.round(1 / exposure)}` : this.rounded(exposure, 2)), "s")
    const pose = resolveObserverPoseAt(sighting, timeMs)
    if (pose) {
      // The one label that isn't a constant: an eye has no focal length, so what its field of view
      // is called changes with the instrument — the same condition the recorder's own
      // syncOpticsFromInstrument applies to the very same value.
      const focalLengthMm = Instruments.focalLengthMmFor(instrument, pose.fovDeg)
      if (focalLengthMm === undefined) {
        this.push(entries, "witness", "focalLength", this.labels.fieldOfView, this.rounded(pose.fovDeg, 1), "°")
      } else {
        this.push(entries, "witness", "focalLength", this.labels.focalLength, this.rounded(focalLengthMm, 1), "mm")
      }
      this.push(entries, "witness", "fNumber", this.labels.aperture, this.rounded(pose.fNumber ?? instrument.fNumber, 1))
      this.push(entries, "witness", "focusDistance", this.labels.focusDistance, this.rounded(pose.focusDistanceM, 1), "m")
      // With the instrument, not with the place: it says how the device was held, not where the
      // witness stood. Absent or zero is one held upright, which states nothing worth a chip.
      this.push(entries, "witness", "roll", this.labels.roll,
        pose.rollDeg === undefined || pose.rollDeg === 0 ? undefined : this.rounded(pose.rollDeg), "°")
    }
  }

  private addLocation(entries: SummaryEntry[], sighting: Sighting, timeMs: number, groundElevationM: number | undefined): void {
    const place = sighting.event.place?.[0]
    this.push(entries, "location", "placeName", this.labels.placeName, place?.name)
    const pose = resolveObserverPoseAt(sighting, timeMs)
    if (!pose) {
      return
    }
    this.push(entries, "location", "lat", this.labels.latitude, this.rounded(pose.lat, 6))
    this.push(entries, "location", "lng", this.labels.longitude, this.rounded(pose.lng, 6))
    this.push(entries, "location", "heading", this.labels.heading, this.rounded(pose.headingDeg), "°")
    this.push(entries, "location", "pitch", this.labels.pitch, this.rounded(pose.pitchDeg), "°")
    // Told apart rather than guessed at: with the terrain's height known this is an altitude above
    // sea level, which is what "Altitude" means in both components; without it, the only true
    // thing that can be said is the height above the ground the pose actually holds — and zero of
    // that states nothing at all, since standing on the ground is what everyone does.
    if (groundElevationM === undefined) {
      this.push(entries, "location", "elevation", this.labels.heightAboveGround,
        pose.elevationM === 0 ? undefined : this.rounded(pose.elevationM), "m")
    } else {
      this.push(entries, "location", "elevation", this.labels.elevation, this.rounded(groundElevationM + pose.elevationM), "m")
    }
  }

  /**
   * The decor: one entry per object when nothing is selected, and that object's own placement and
   * properties when something is.
   *
   * Because the two readers ask different questions of the same array. An editor is working on one
   * building and wants its distance east and its floor count; a reader wants to know that there
   * WAS a building, a car and another witness — fifteen fields for each of them would be a wall,
   * and the fifteen fields of whichever one happened to be first would be a lie by omission.
   */
  private addDecor(entries: SummaryEntry[], sighting: Sighting, timeMs: number, decorId: string | undefined): void {
    const selected = sighting.decor.find(decor => decor.id === decorId)
    if (!selected) {
      for (const decor of sighting.decor) {
        this.push(entries, "decor", `decor:${decor.id}`, this.decorLabel(decor), this.decorKindName(decor.kind))
      }
      return
    }
    this.push(entries, "decor", "decorTitle", this.labels.decorTitle, selected.title)
    const placement = resolveDecorPlacementAt(selected, timeMs)
    this.push(entries, "decor", "decorEast", this.labels.decorEast, this.rounded(placement.eastM, 1), "m")
    this.push(entries, "decor", "decorNorth", this.labels.decorNorth, this.rounded(placement.northM, 1), "m")
    this.push(entries, "decor", "decorAltitude", this.labels.decorAltitude, this.rounded(placement.altitudeM), "m")
    this.push(entries, "decor", "decorHeading", this.labels.decorHeading, this.rounded(placement.headingDeg), "°")
    if (resolveDecorLitAt(selected, timeMs)) {
      this.push(entries, "decor", "decorLit", this.labels.decorLit, "✓")
    }
    // A rig isn't stored as a rig: the object carries the lamps it made (see DecorObject.lights),
    // so it is recognised by the set of lamp ids it produced — the same identification the
    // recorder's own picker makes to decide which entry to show as selected.
    const carried = selected.lights?.map(light => light.id).join() ?? ""
    const rig = carried === "" ? undefined : LIGHT_RIGS.find(candidate => candidate.create().map(light => light.id).join() === carried)
    this.push(entries, "decor", "decorLightRig", this.labels.decorLights, rig?.name)
    this.push(entries, "decor", "decorFloors", this.labels.decorFloors, selected.floors)
    this.push(entries, "decor", "decorOccupiedFloor", this.labels.decorOccupiedFloor, selected.occupiedFloor)
    this.push(entries, "decor", "decorWitnessSide", this.labels.decorWitnessSide, this.decorSideName(selected.witnessSide))
    for (const [side, opacity] of Object.entries(selected.windows ?? {})) {
      this.push(entries, "decor", `decorWindow${this.capitalise(side)}`,
        `${this.labels.decorWindows} ${this.decorSideName(side as DecorSide)}`, opacity, "%")
    }
  }

  private addTemporal(entries: SummaryEntry[], sighting: Sighting): void {
    const event = sighting.event
    this.push(entries, "temporal", "obs-time", this.labels.observationTime, event.time && formatEdtfTime(event.time))
    this.push(entries, "temporal", "obs-end-time", this.labels.observationEndTime, event.endTime && formatEdtfTime(event.endTime))
    const durationMs = sightingDurationMs(event)
    this.push(entries, "temporal", "durationSeconds", this.labels.duration, this.rounded(durationMs && durationMs / 1000, 1), "s")
    this.push(entries, "temporal", "timeZone", this.labels.utcOffset, event.timeZone)
    this.push(entries, "temporal", "utcOffsetHours", this.labels.utcOffset, this.rounded(event.utcOffsetHours, 1), "UTC±h")
  }

  private addWeather(entries: SummaryEntry[], sighting: Sighting, timeMs: number): void {
    const weather = resolveWeatherAt(sighting, timeMs)
    // Whether a record owns these, taken from the sighting itself rather than from whether some
    // control happens to be disabled — "disabled" also means "doesn't apply", and marking both
    // would have the summary claim a silent sighting's loudness came out of an archive.
    const fromSource = sighting.weatherSource !== undefined
    const owned = { fromSource }
    this.push(entries, "weather", "cloudCover", this.labels.cloudCover, this.percent(weather.cloudCover), "", owned)
    this.push(entries, "weather", "highCloudCover", this.labels.highCloudCover, this.percent(weather.highCloudCover), "", owned)
    // Never marked, whatever the record says about the clouds: what the ice crystals were doing up
    // there was measured nowhere, so this one is always the author's own (see Weather.ts).
    this.push(entries, "weather", "iceCrystalAlignment", this.labels.iceCrystalAlignment, this.percent(weather.iceCrystalAlignment))
    this.push(entries, "weather", "cloudDarkness", this.labels.cloudDarkness, this.percent(weather.cloudDarkness), "", owned)
    this.push(entries, "weather", "cloudBase", this.labels.cloudBase, this.rounded(weather.cloudBaseM), "m", owned)
    this.push(entries, "weather", "precipitationType", this.labels.precipitationType,
      weather.precipitationType === "none" ? undefined : this.precipitationName(weather.precipitationType), "", owned)
    this.push(entries, "weather", "precipitationIntensity", this.labels.precipitationIntensity,
      weather.precipitationType === "none" ? undefined : this.percent(weather.precipitationIntensity), "", owned)
    this.push(entries, "weather", "windDirection", this.labels.windDirection, this.rounded(weather.windDirectionDeg), "°", owned)
    this.push(entries, "weather", "windSpeed", this.labels.windSpeed, this.rounded(weather.windSpeed, 2), "m/s", owned)
    if (weather.storm) {
      this.push(entries, "weather", "storm", this.labels.storm, "✓", "", owned)
    }
  }

  private addSound(entries: SummaryEntry[], sighting: Sighting, timeMs: number): void {
    const sound = resolveSoundAt(sighting, timeMs)
    if (sound.kind === "none") {
      return
    }
    this.push(entries, "sound", "soundKind", this.labels.soundKind, this.soundKindName(sound.kind))
    this.push(entries, "sound", "soundVolume", this.labels.soundVolume, this.percent(sound.volume))
    this.push(entries, "sound", "soundPitch", this.labels.soundPitch, this.rounded(sound.pitchHz), "Hz")
    this.push(entries, "sound", "soundSrc", this.labels.soundSrc, sound.src)
  }

  /** The appearance of the shape the editor has selected. Nothing at all without a selection: a
   * recording holds several shapes, and one arbitrary member's colour is not a fact about the
   * sighting. */
  private addShape(entries: SummaryEntry[], sighting: Sighting, timeMs: number, sourceId: string | undefined): void {
    if (sourceId === undefined) {
      return
    }
    const shape = sighting.timeline.getInterpolatedShapeAt(timeMs, sourceId)
    if (!shape) {
      return
    }
    this.push(entries, "shape", "shapeTitle", this.labels.shapeTitle, shape.title)
    this.push(entries, "shape", "color", this.labels.color, shape.color, "", { color: shape.color })
    this.push(entries, "shape", "transparency", this.labels.transparency, this.percent(shape.transparency))
    this.push(entries, "shape", "haloScale", this.labels.halo, this.rounded(shape.haloScale, 2))
    // Stated like the colour, so the summary says it like the colour. Absent means nobody said
    // anything about the edges, which is not the same as saying they were sharp — hence no chip
    // rather than a "0 %" one.
    this.push(entries, "shape", "blur", this.labels.blur, shape.blur === undefined || shape.blur === 0 ? undefined : this.percent(shape.blur))
    this.push(entries, "shape", "brightness", this.labels.brightness,
      shape.brightness === undefined || shape.brightness === 0 ? undefined : this.percent(shape.brightness))
  }

  /** What to call a decor object with no name of its own — the same "{kind} {n}" fallback the
   * recorder's picker uses, so a chip and the picker never name the same building differently. */
  private decorLabel(decor: DecorObject): string {
    return decor.title ?? this.decorKindName(decor.kind)
  }

  private decorKindName(kind: DecorKind): string {
    switch (kind) {
      case "building": return this.labels.decorBuilding
      case "tree": return this.labels.decorTree
      case "streetlight": return this.labels.decorStreetlight
      case "vehicle": return this.labels.decorVehicle
      case "aircraft": return this.labels.decorAircraft
      default: return this.labels.decorWitness
    }
  }

  private decorSideName(side: DecorSide | undefined): string | undefined {
    switch (side) {
      case "front": return this.labels.decorSideFront
      case "behind": return this.labels.decorSideBehind
      case "left": return this.labels.decorSideLeft
      case "right": return this.labels.decorSideRight
      case "front-left": return this.labels.decorSideFrontLeft
      case "front-right": return this.labels.decorSideFrontRight
      case "behind-left": return this.labels.decorSideBehindLeft
      case "behind-right": return this.labels.decorSideBehindRight
      default: return undefined
    }
  }

  private precipitationName(type: PrecipitationType): string {
    switch (type) {
      case "rain": return this.labels.precipitationRain
      case "snow": return this.labels.precipitationSnow
      case "hail": return this.labels.precipitationHail
      default: return this.labels.precipitationNone
    }
  }

  private soundKindName(kind: SoundKind): string {
    switch (kind) {
      case "hum": return this.labels.soundHum
      case "whistle": return this.labels.soundWhistle
      case "rumble": return this.labels.soundRumble
      case "crackle": return this.labels.soundCrackle
      default: return this.labels.soundNone
    }
  }

  private capitalise(text: string): string {
    return text.replace(/(^|-)([a-z])/g, (_, separator: string, letter: string) => (separator === "" ? letter.toUpperCase() : letter.toUpperCase()))
  }
}
