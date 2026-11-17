import type { BodyJson, InterpretationJson } from "../../engine/interpretation/Interpretation.js"
import type { Sighting } from "../../engine/model/Sighting.js"
import type { SaidTexts } from "../../engine/model/SaidText.js"
import type { PositionPlace } from "../../component/ParameterForm.js"
import type { DataSource } from "../../engine/source/DataSource.js"
import type { MessageCatalog } from "../../i18n/MessageCatalog.js"
import type { ComputeContext } from "./Obstacles.js"

/** What an editor of a kind of interpretation needs of the editor it is a part of. */
export interface InterpretationEditorHost {
  sighting(): Sighting
  said(): SaidTexts
  writingLanguage(): string
  /** The shapes of the account, which what it computes may stand for (see BodyJson.explains). */
  shapes(): { id: string, label: string }[]
  /** What a place is said from, and in what words (see PositionPlace). */
  positionPlace?(): PositionPlace
  /** Where the playhead is, ms, how long the recording lasts, and putting the playhead elsewhere: for a part with a timeline of its own. */
  currentTime?(): number
  duration?(): number
  seekTo?(t: number): void
  /** An edit was written onto the recording. */
  changed(): void
}

/** The part of the editor that edits one kind of interpretation, built the first time it is opened. */
export interface InterpretationEditor {
  /** Shows what the recording states now: after a recording is loaded, an edit written, or the part opened. */
  sync(): void
  /** Shows the recording again after an edit made elsewhere (the text of the file, an undo). */
  refresh(): void
  /** The playhead moved. */
  setTime?(t: number): void
  setLanguage(language: string): Promise<void>
}

/**
 * A kind of reading of an account that is stated as a few parameters and computed into bodies when shown: sky lanterns let go from a
 * garden, decoy flares an aircraft dispensed. What a recording states under `interpretation.<key>` (and a case's interpretation under the
 * same key), turned by `bodiesOf` into the bodies the scene draws and confronts the account with (see BodyJson).
 *
 * Not an event of the sky (see SkyEventKind): those are facts that were there whether or not the account is about them; this is what
 * somebody claims the account saw. Given to the extension point `interpretations` of ModuleRegistry as a DataSource whose `id` is its
 * `key`: the built-in ones in interpretationSources.ts, another module's by its script.
 *
 * Its code is loaded the first time an interpretation states one of it (`compute`, see InterpretationKinds.load), never before, as the
 * kinds of events of the sky are (see SkyEventKind.simulation); what it loads then computes from parameters, synchronously, whenever the
 * interpretation is shown. Its editor is a chunk of its own, loaded when its part is opened.
 */
export interface InterpretationKind<J = unknown> {
  /** Where the interpretation states them: `interpretation.<key>`. Unique among the kinds. */
  key: string
  /** Its texts in the reader's language (see MessageCatalog): what its part of the editor is called, and what one of the bodies it
   * computes is called under the pointer when neither it nor what it explains has a name. */
  messages: MessageCatalog<{ title: string, name?: string }>
  /**
   * The code that computes the bodies one of them is, as drawn: loaded once, the first time it is needed. What it computes moves among the
   * solid decor of the recording when it is given it (see ComputeContext, Obstacles): a lantern does not go through a building.
   */
  compute(): Promise<(item: J, context?: ComputeContext) => BodyJson[]>
  /** The code of the editor's part; a kind without one is drawn and not edited. */
  editor?(): Promise<(container: HTMLElement, host: InterpretationEditorHost, language: string) => InterpretationEditor>
}

/** The kinds of the registry, and what an interpretation states of them. */
export class InterpretationKinds {
  private static readonly built = new WeakMap<DataSource<InterpretationKind>, InterpretationKind>()
  /** Each kind's code once it has come (see InterpretationKind.compute), and while it is coming. */
  private static readonly computers = new WeakMap<InterpretationKind, (item: unknown, context?: ComputeContext) => BodyJson[]>()
  private static readonly loading = new WeakMap<InterpretationKind, Promise<void>>()

  /** Whether the code of every kind `interpretation` states is here: what expand needs to compute all its bodies. */
  static loaded(interpretation: InterpretationJson | undefined, kinds: readonly InterpretationKind[]): boolean {
    return kinds.every(kind => InterpretationKinds.itemsOf(interpretation, kind.key).length === 0 || InterpretationKinds.computers.has(kind))
  }

  /** Loads the code of the kinds `interpretation` states that has not come yet; settles once it all has (a kind whose code failed computes nothing). */
  static load(interpretation: InterpretationJson | undefined, kinds: readonly InterpretationKind[]): Promise<void> {
    return Promise.all(kinds.filter(kind => InterpretationKinds.itemsOf(interpretation, kind.key).length > 0 && !InterpretationKinds.computers.has(kind)).map(kind => {
      let loading = InterpretationKinds.loading.get(kind)
      if (!loading) {
        loading = kind.compute().then(compute => { InterpretationKinds.computers.set(kind, compute as (item: unknown, context?: ComputeContext) => BodyJson[]) })
        // A failed load is asked again the next time, rather than kept as a failure.
        loading.catch(() => InterpretationKinds.loading.delete(kind))
        InterpretationKinds.loading.set(kind, loading)
      }
      return loading.catch(() => undefined)
    })).then(() => undefined)
  }

  /** The kind a source of the registry gives, built once. */
  static of(source: DataSource<InterpretationKind>): InterpretationKind {
    let kind = InterpretationKinds.built.get(source)
    if (!kind) {
      kind = source.create()
      InterpretationKinds.built.set(source, kind)
    }
    return kind
  }

  /** What `interpretation` states of `key`: a list, or nothing. */
  static itemsOf(interpretation: InterpretationJson | undefined, key: string): readonly unknown[] {
    const items = (interpretation as Record<string, unknown> | undefined)?.[key]
    return Array.isArray(items) ? items : []
  }

  /** Whether `interpretation` states anything any of `kinds` computes. */
  static computes(interpretation: InterpretationJson | undefined, kinds: readonly InterpretationKind[]): boolean {
    return kinds.some(kind => InterpretationKinds.itemsOf(interpretation, kind.key).length > 0)
  }

  /**
   * `interpretation` with the bodies its kinds compute added to its own: what the scene draws. The same object when it states none. Only
   * the kinds whose code has come compute (see load): the others' bodies are added once it has.
   */
  static expand(interpretation: InterpretationJson, kinds: readonly InterpretationKind[], context?: ComputeContext): InterpretationJson
  static expand(interpretation: InterpretationJson | undefined, kinds: readonly InterpretationKind[], context?: ComputeContext): InterpretationJson | undefined
  static expand(interpretation: InterpretationJson | undefined, kinds: readonly InterpretationKind[], context?: ComputeContext): InterpretationJson | undefined {
    return InterpretationKinds.expandWithKinds(interpretation, kinds, context).interpretation
  }

  /** As expand, with the kind that computed each of the bodies it added, by the body's id: what names one under the pointer. */
  static expandWithKinds(interpretation: InterpretationJson | undefined, kinds: readonly InterpretationKind[], context?: ComputeContext): {
    interpretation: InterpretationJson | undefined, kindOf: Map<string, InterpretationKind>
  } {
    const kindOf = new Map<string, InterpretationKind>()
    if (!interpretation || !InterpretationKinds.computes(interpretation, kinds)) return { interpretation, kindOf }
    const computed = kinds.flatMap(kind => InterpretationKinds.itemsOf(interpretation, kind.key).flatMap(item => {
      const compute = InterpretationKinds.computers.get(kind)
      if (!compute) return []
      const bodies = compute(item, context)
      for (const body of bodies) kindOf.set(body.id, kind)
      return bodies
    }))
    return { interpretation: { ...interpretation, bodies: [...interpretation.bodies, ...computed] }, kindOf }
  }

  /** What `interpretation` states under the keys of `kinds`, alone: what is computed rather than stated as bodies. */
  static computedPart(interpretation: InterpretationJson | undefined, kinds: readonly InterpretationKind[]): Record<string, unknown[]> {
    const part: Record<string, unknown[]> = {}
    for (const kind of kinds) {
      const items = InterpretationKinds.itemsOf(interpretation, kind.key)
      if (items.length > 0) part[kind.key] = [...items]
    }
    return part
  }

  /** Whether `interpretation` says nothing at all: no body, no title, no smoke, and nothing any kind computes. Such a one is not kept. */
  static saysNothing(interpretation: InterpretationJson, kinds: readonly InterpretationKind[]): boolean {
    return interpretation.bodies.length === 0 && interpretation.title === undefined && interpretation.smoke === undefined
      && kinds.every(kind => (interpretation as Record<string, unknown>)[kind.key] === undefined)
  }
}
