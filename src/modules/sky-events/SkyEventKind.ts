import type { Object3D, Vector3 } from "three"
import type { AerialPerspective, Rgb } from "../../engine/atmosphere/AerialPerspective.js"
import type { Sighting } from "../../engine/model/Sighting.js"
import type { SaidText } from "../../engine/model/SaidText.js"
import type { SaidTexts } from "../../engine/model/SaidText.js"
import type { PositionPlace } from "../../component/ParameterForm.js"
import type { DataSource } from "../../engine/source/DataSource.js"

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
}

/**
 * The drawing of one kind of event in one scene: built once, the first time the scene has an event of that kind, and then given the events
 * and the instant at every tick (see SceneRenderer.setSkyEvents).
 *
 * It follows the scene's contract (see docs/performance-audit-2026-09.md): `update` places and lights, and never draws; the scene draws once
 * per frame what `object` holds.
 */
export interface SkyEventSimulation<J extends SkyEventJson = SkyEventJson> {
  /** What is added to the scene, once. */
  readonly object: Object3D
  /** Places and lights `events` as they are at `t`, milliseconds of the recording, seen from `frame.eye`. */
  update(events: readonly J[], t: number, frame: SkyEventFrame): void
  /** How many things it draws now: what tells the scene there is something to pick. */
  readonly drawnCount: number
  /** The event under a ray from the eye, within `toleranceRad` of what is drawn of it, and how far along the ray. */
  pick?(origin: Vector3, direction: Vector3, toleranceRad: number): { id: string, distanceM: number } | undefined
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
  /** What the scene's tooltip says of one, picked `distance` away (a distance already said in words). */
  describe?(event: J, name: string, distance: string): string
  /** What it is called when it has no title of its own. */
  fallbackName?: string
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
