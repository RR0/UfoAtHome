import type { DecorKind, DecorModelCredit, DecorSize } from "../../engine/model/Decor.js"

/**
 * One model a catalogue offers, resolved but not yet fetched.
 *
 * The split between this and the loading itself is deliberate: every model here is glTF, so there
 * is exactly one way to turn an address into geometry (see loadGltfScene) and no provider should
 * own a copy of it. A provider's whole job is to answer "what does `id` mean today, and who has to
 * be credited for it" — which is the part that is allowed to change under a recording that never
 * does.
 */
export interface DecorModelEntry {
  /** Stable id a recording names (see DecorModelRef.id). It outlives the address below. */
  id: string
  /** Which decor kind this model can stand for — what the editor's picker filters on. */
  kind: DecorKind
  /** Short name for that picker: what the thing IS ("Pontiac Catalina, 1964"), not its licence. */
  name: string
  /** Where the glTF/GLB actually lives right now. Must be readable cross-origin. */
  url: string
  credit: DecorModelCredit
  /** Degrees to turn the model about its own vertical axis so its nose faces -Z, this scene's
   * heading-0 direction (see DecorSystem.build). A property of the file, so the catalogue carries
   * it and a recording never has to know how a given model happened to be exported. */
  headingOffsetDeg?: number
  /** What the real object this model depicts actually measures, when the catalogue knows it —
   * offered as the decor object's own size when the model is picked, so choosing "a 1964 Catalina"
   * states 5.4 m of car rather than leaving a reader to invent one. Never imposed: the recording's
   * own DecorObject.sizeM always wins (see DecorSystem.sizeOf). */
  sizeM?: DecorSize
}

/**
 * A catalogue of real 3D models the decor can be shown with — one interchangeable source, in the
 * same lineage as ElevationProvider and ImageryProvider, and registered the same way (see
 * decorModelSources.ts, where the picker IS the credit).
 *
 * Why a seam at all, for something as fixed-looking as "the model of a car": because the model is
 * the part of a reconstruction most likely to be provisional. A recording says a 1964 patrol car
 * stood eight meters away; whether it is drawn today as a box, tomorrow as somebody's approximate
 * sedan, and later as a real Catalina somebody modelled properly is a question about the CATALOGUE,
 * not about the testimony. Naming the model by id keeps that question out of the data — and lets a
 * source that turns out not to be permanent be re-hosted here without touching a single recording.
 */
export interface DecorModelProvider {
  /** The attribution this catalogue's own licence requires, shown verbatim beside its picker —
   * separate from each entry's own credit, which names the individual model's author. */
  readonly attribution: string
  /** Everything on offer, optionally narrowed to one decor kind. Cached by implementations: the
   * editor asks on every decor selection. */
  entries(kind?: DecorKind): Promise<DecorModelEntry[]>
  /** What `id` means in this catalogue, or undefined when it means nothing here — which is not an
   * error: a recording naming a model this catalogue doesn't have falls back to the primitive, the
   * same as one naming no model at all. */
  entry(id: string): Promise<DecorModelEntry | undefined>
}
