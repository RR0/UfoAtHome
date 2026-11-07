import type { Object3D, Vector3 } from "three"
import type { AerialPerspective, Rgb } from "../../engine/atmosphere/AerialPerspective.js"
import type { Sighting } from "../../engine/model/Sighting.js"
import type { SaidText } from "../../engine/model/SaidText.js"
import type { SaidTexts } from "../../engine/model/SaidText.js"
import type { PositionPlace } from "../../component/ParameterForm.js"
import type { DataSource } from "../../engine/source/DataSource.js"
import type { HorizontalPosition } from "../../engine/astronomy/CelestialPositions.js"

/** What every event of the sky states, whatever its kind: an id, unique among the events of its kind in the recording. */
export interface SkyEventJson {
  id: string
  /** What it is called in the scene's tooltip and in the editor's list. */
  title?: SaidText
}

/** Where the scene stands and what it is drawn through, at one instant: what a simulation places and lights its events from. */
export interface SkyEventFrame {
  /** The latitude and longitude the scene's frame is laid out from (the decor's reference pose). */
  reference: { lat: number, lng: number }
  /** Where that place stands in the scene, metres, and how much a metre east of it is in the scene now (see SceneRenderer.bodyEastScale). */
  origin: { x: number, z: number }
  eastScale: number
  /** The altitude above the sea the scene's y = 0 stands for. */
  siteElevationM: number
  eye: Vector3
  /** The angle of one pixel of the picture, radians: nothing is drawn thinner. */
  pixelRad: number
  /** What a candela per square metre is in the scene's own light (see ScatteredSky.relativeScale). */
  relativeScale: number
  air: AerialPerspective
  /** How much of a light at a point of the scene reaches the eye, per channel. */
  transmittanceTo: (x: number, y: number, z: number) => Rgb
  /** The ground under a point of the scene. */
  groundYAt: (x: number, z: number) => number
  /** The wind, metres a second towards the east and towards the north. */
  wind?: { eastMS: number, northMS: number }
  /** Where the observer really stands now, on the Earth, metres above the sea: what is placed on the Earth (a re-entry 300 km off) is seen
   * from here, not from the scene's origin. */
  observer: { lat: number, lng: number, heightM: number }
  /** The real instant, or undefined when the recording states no date: then nothing lit by the Sun can be lit. */
  date?: Date
  /** The faintest magnitude seen now, by this eye or instrument through this sky. */
  magnitudeLimit: number
  /** The share of a light from a direction of the sky that the clouds let through. */
  cloudTransmission(position: HorizontalPosition): number
  /** What reaches the eye, per channel, in the scene's units, of a source of `magnitude` in that direction, through `through` of the clouds. */
  arrivingIlluminance(position: HorizontalPosition, magnitude: number, through: number): Rgb
  /** What the air above the eye lets through of a light from space towards a direction, per channel. */
  transmittanceFromSpace(position: HorizontalPosition): Rgb
  /** Lights the ground and the sky with these far sources, as the Moon does (see EmitterLights); what this kind said before is replaced. */
  lightFrom(sources: readonly { position: HorizontalPosition, magnitude: number }[]): void
  /** Dazzles the eye round these bright sources, as a star or the Moon does (see Veil); what this kind said before is replaced. */
  glareFrom(sources: readonly { key: string, position: HorizontalPosition, magnitude: number, fade: number }[]): void
}

/** What a simulation is given to say what is under the pointer. */
export interface SkyEventPickContext {
  /** How far from what is drawn a pointer may be, radians: a few pixels. */
  toleranceRad: number
  /** The cosine of the angle within which the nearest of the points in the sky is taken, as a star is. */
  nearestCos: number
  /** The sky's own light towards a direction, relative: what something has to stand out from to be seen. */
  skyLightTowards(direction: Vector3): number
}

/** An event under the pointer: which, how far along the ray when that is known (else the ground is asked whether it hides it), and what the
 * kind's own tooltip needs of what was picked. */
export interface SkyEventHit {
  id: string
  distanceM?: number
  detail?: unknown
}

/**
 * The drawing of one kind of event in one scene: built once, the first time the scene has an event of that kind, and then given the events
 * and the instant at every tick (see SceneRenderer.setSkyEvents).
 *
 * It follows the scene's contract (see docs/performance-audit-2026-09.md): `update` places and lights, and never draws; the scene draws once
 * per frame what `object` holds.
 */
export interface SkyEventSimulation<J extends SkyEventJson = SkyEventJson> {
  /** What is added to the scene, once: among the things that stand in the scene, or on the sky's shell (`inSky`). */
  readonly object: Object3D
  /** Drawn on the sky's shell round the eye, as the stars and the satellites are, rather than in the scene's metres. */
  readonly inSky?: boolean
  /** Left out of what the eye's adaptation and the instrument's meter read, as the stars are: points far brighter than their size. */
  readonly hiddenFromEye?: boolean
  /** Places and lights `events` as they are at `t`, milliseconds of the recording, seen from `frame.eye`. */
  update(events: readonly J[], t: number, frame: SkyEventFrame): void
  /** How many things it draws now: what tells the scene there is something to pick. */
  readonly drawnCount: number
  /** The event under a ray from the eye (see SkyEventPickContext). */
  pick?(origin: Vector3, direction: Vector3, context: SkyEventPickContext): SkyEventHit | undefined
  dispose(): void
}

/** What an editor of a kind of event needs of the editor it is a part of. */
export interface SkyEventEditorHost {
  sighting(): Sighting
  said(): SaidTexts
  writingLanguage(): string
  /** What a place is said from, and in what words (see PositionPlace). */
  positionPlace?(): PositionPlace
  /** Where the playhead is, ms, how long the recording lasts, and putting the playhead elsewhere. */
  currentTime(): number
  duration(): number
  seekTo(t: number): void
  /** An edit was written onto the recording. */
  changed(): void
}

/** The part of the Sky group that edits one kind of event, built the first time it is opened. */
export interface SkyEventEditor {
  /** Shows what the recording states now: after a recording is loaded, an edit written, or the part opened. */
  sync(): void
  /** Shows the recording again after an edit made elsewhere (the text of the file, an undo). */
  refresh(): void
  /** The playhead moved. */
  setTime(t: number): void
  setLanguage(language: string): Promise<void>
}

/**
 * A kind of event of the sky: what a recording states under `skyEvents.<key>` (see SkyEventsJson), how the scene draws it, and how the
 * editor edits it. Facts of the sky that were there whether anybody saw them or not (a laser shot, a rocket's launch, lightning), which
 * an account may be confronted with.
 *
 * A kind is given to the extension point `skyEvents` of ModuleRegistry as a DataSource whose `id` is its `key`: the built-in ones in
 * skyEventSources.ts, another module's by its script. Its code is loaded the first time a recording has an event of the kind
 * (`simulation`) or the author opens its part (`editor`), never before.
 */
export interface SkyEventKind<J extends SkyEventJson = SkyEventJson> {
  /** Where the recording states them: `skyEvents.<key>`. Unique among the kinds. */
  key: string
  /** What the editor's part is called, in as many languages as it has. */
  title: SaidText
  /** The code that draws them. */
  simulation(): Promise<() => SkyEventSimulation<J>>
  /** The code of the editor's part; a kind without one is drawn and not edited. */
  editor?(): Promise<(container: HTMLElement, host: SkyEventEditorHost, language: string) => SkyEventEditor>
  /** How far from `centre` they reach, metres: the ground is built that far, and the scene drawn that deep. */
  reachM?(events: readonly J[], centre: { lat: number, lng: number }): number
  /** What the scene's tooltip says of one under the pointer: its name, and a sentence shown on demand (see SkyEventDescribeContext). */
  describe?(event: J, hit: SkyEventHit, context: SkyEventDescribeContext): { name: string, detail?: string }
  /** What the scene calls what is under the pointer, for those who style or test it: "beam", "plume", "reentry"; "skyEvent" when absent. */
  pickKind?: string
  /** Looked for under the pointer after the satellites rather than before: a point moving across the sky, which a satellite crossing it is
   * the better answer for. Only for a kind drawn on the sky's shell (see SkyEventSimulation.inSky). */
  pickedAfterSatellites?: boolean
  /** What it is called when it has no title of its own. */
  fallbackName?: string
}

/** What a kind's tooltip is said with. */
export interface SkyEventDescribeContext {
  /** Reads a text in the reader's language. */
  said: SaidTexts
  /** The event's own name, or the kind's when it has none. */
  name: string
  /** A distance from the eye as the page writes it: "540 m", "1,7 km". */
  distance(m: number): string
  /** The scene's own words in the reader's language (see SceneNames), by key; what a built-in kind's tooltips are taken from. */
  names?: Readonly<Record<string, unknown>>
}

/** The kinds of the registry, and the events of one of them a recording states. */
export class SkyEventKinds {
  private static readonly built = new WeakMap<DataSource<SkyEventKind>, SkyEventKind>()

  /** The kind a source of the registry gives, built once: a scene compares kinds to know whether a key is still drawn by the same code. */
  static of(source: DataSource<SkyEventKind>): SkyEventKind {
    let kind = SkyEventKinds.built.get(source)
    if (!kind) {
      kind = source.create()
      SkyEventKinds.built.set(source, kind)
    }
    return kind
  }

  static eventsOf<J extends SkyEventJson>(skyEvents: Record<string, unknown> | undefined, kind: SkyEventKind<J>): readonly J[] {
    const events = skyEvents?.[kind.key]
    return Array.isArray(events) ? events as J[] : []
  }
}
