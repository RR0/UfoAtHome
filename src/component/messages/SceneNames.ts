import type { DecorKind } from "../../engine/model/Decor.js"
import { Compass } from "../../engine/astronomy/Compass.js"

/**
 * What the things a scene and its catalogues hold are CALLED, for one language other than English.
 *
 * English is not a module of this kind: it is the language the catalogues are generated in (a
 * star's, a comet's, a shower's `name`), and the few names the code gives itself (a planet, a decor
 * kind, the tooltip sentences) stay beside the code that uses them. So a page read in English never
 * downloads a table that would only map every name onto itself, and a page read in French downloads
 * the French one alone (see loadSceneNames).
 *
 * Catalogue entries are keyed by the stable id the catalogue gives them (a star, which has none, by
 * its English name). A key absent from a table is not a gap: most star names and every comet named
 * after its discoverers read the same in every language, and are then shown as the catalogue has
 * them.
 */
/** The sentences of the label of an aircraft pointed at, with their {fields}: see TrafficTooltip. */
export interface TrafficTexts {
  /** An aircraft the record does not name: {hex}. */
  readonly unnamed: string
  /** The fields of the line of flight: {value}. */
  readonly altitude: string
  readonly speed: string
  readonly heading: string
  /** Where it is in the sky: {distance}, {elevation}, {bearing}. */
  readonly position: string
  /** Its sound when it is heard: {level}, {delay}, {lag}, {character}, {pitch}. */
  readonly heard: string
  /** How it sounds, by how far up the sound goes: {cutoff}. */
  readonly rumble: string
  readonly muffled: string
  readonly broad: string
  /** The pitch heard against the pitch made: {percent}. */
  readonly pitchHigher: string
  readonly pitchLower: string
  /** When it is not heard: {level}, {ambient}. */
  readonly inaudible: string
  /** When its sound cannot be worked out. */
  readonly soundUnknown: string
  readonly military: string
  readonly restricted: string
  /** What a record of aircraft says, and does not. */
  readonly candidate: string
}

export interface SceneNames {
  /** The Sun, the Moon and the planets, by SceneRenderer's own body key ("sun", "moon", "Venus"…). */
  readonly bodies: Readonly<Record<string, string>>
  /** Star proper names written differently in this language, by their English name. */
  readonly stars: Readonly<Record<string, string>>
  /** Comet apparitions by id — WITHOUT a leading article: the readout supplies it. */
  readonly comets: Readonly<Record<string, string>>
  /** Novae and supernovae by id — without a leading article either. */
  readonly novae: Readonly<Record<string, string>>
  /** The classes of satellite a sky could hold, by id — WITH their article, as they are listed. */
  readonly satelliteClasses: Readonly<Record<string, string>>
  /** Meteor showers by id. */
  readonly showers: Readonly<Record<string, string>>
  /** Instruments by id. */
  readonly instruments: Readonly<Record<string, string>>
  /** The light rigs a decor object can be given, by id (see LightRigs). */
  readonly lightRigs: Readonly<Record<string, string>>
  /** What an untitled decor object is, by its kind. */
  readonly decorKinds: Readonly<Record<DecorKind, string>>
  /** The sixteen points of the compass, clockwise from north (see Compass). */
  readonly compassPoints: readonly string[]
  /** A point with its preposition already on it ("au NO", "à l'OSO") — see Compass.towards. */
  towards(point: string): string
  /** A star's hover tooltip: {name}, {mag}, {alt}. */
  readonly starTooltip: string
  /** The same for a star standing below the horizontal. */
  readonly starTooltipBelow: string
  /** A satellite's hover tooltip: {name}, {mag}, {height}. */
  readonly satelliteTooltip: string
  /** What is said of an aircraft pointed at: see TrafficTooltip. */
  readonly trafficTooltip: TrafficTexts
  /** The scene's credits button. */
  readonly credits: string
  /** Said above the spinner while the picture loads: what it shows is not a video. */
  readonly notAVideo: string
  /** Said below the spinner, answering it: what it is, instead. */
  readonly isASimulation: string
}

/**
 * Names things for one reader: from their language's SceneNames where it has a name, else as the
 * catalogue or the code has it in English.
 *
 * Without names at all it is the English naming, which is what every reader has until their
 * language's module has arrived — and all an English reader ever has.
 */
export class SceneNaming {

  constructor(readonly names?: SceneNames) {
  }

  body(key: string, english: string): string {
    return this.names?.bodies[key] ?? english
  }

  star(star: { name: string }): string {
    return this.names?.stars[star.name] ?? star.name
  }

  comet(apparition: { id: string, name: string }): string {
    return this.names?.comets[apparition.id] ?? apparition.name
  }

  nova(outburst: { id: string, name: string }): string {
    return this.names?.novae[outburst.id] ?? outburst.name
  }

  satelliteClass(entry: { id: string, name: string }): string {
    return this.names?.satelliteClasses[entry.id] ?? entry.name
  }

  shower(shower: { id: string, name: string }): string {
    return this.names?.showers[shower.id] ?? shower.name
  }

  lightRig(rig: { id: string, name: string }): string {
    return this.names?.lightRigs[rig.id] ?? rig.name
  }

  instrument(instrument: { id: string, name: string }): string {
    return this.names?.instruments[instrument.id] ?? instrument.name
  }

  decorKind(kind: DecorKind, english: string): string {
    return this.names?.decorKinds[kind] ?? english
  }

  /** The compass point `azimuthDeg` falls in — see Compass.point. */
  point(azimuthDeg: number): string {
    return Compass.point(azimuthDeg, this.names?.compassPoints)
  }

  /** The same with its preposition — see Compass.towards. */
  towards(azimuthDeg: number): string {
    return Compass.towards(azimuthDeg, this.names)
  }
}
