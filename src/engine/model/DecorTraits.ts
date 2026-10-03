import type { DecorKind, DecorObject } from "./Decor.js"
import { canHoldObserver, decorModelOf, hasWindows } from "./Decor.js"
import { LightRigs } from "./LightRig.js"

/**
 * What can be set on a decor object, as the object itself says it: the one answer to "which of the
 * editor's fields mean anything for this?", asked by the form instead of each field guessing from the
 * kind. A field that changes nothing on screen is not offered.
 */
export interface DecorParameters {
  /** A colour, which paints the built-in shape only: a model keeps the materials of its file. */
  color: boolean
  /** The single lit/unlit switch (a lamp head, a car's headlights). */
  lit: boolean
  /** A rig of individual lamps, which are laid on the object wherever it is drawn as. */
  lights: boolean
  /** Windows with their own opacity, of the built-in shape. */
  windows: boolean
  /** A floor count and the floor the observer stands on, of the built-in building. */
  floors: boolean
  /** The observer may be placed inside it. */
  observerSide: boolean
}

/**
 * What a catalogue model publishes about itself, over the defaults of its kind (see DecorTraits.of):
 * a model that carries its own emissive lamp head says `lit`, one built to be repainted says
 * `color`, one whose lamps must not be laid over it says `lights: false`. Stated in the catalogue,
 * beside the model's size and credit, so that a new model brings its own answer.
 */
export type ModelParameters = Partial<Pick<DecorParameters, "color" | "lit" | "lights">>

export class DecorTraits {
  /**
   * The parameters of a decor object, from what it is (its kind), what it is drawn as (the built-in
   * shape, or a model, which the observer being inside it turns back into the shape: see
   * DecorSystem.usesModel) and what that model publishes.
   */
  static of(object: Pick<DecorObject, "kind" | "model" | "observerSide">, published?: ModelParameters): DecorParameters {
    const model = DecorTraits.drawnAsModel(object)
    return {
      color: published?.color ?? !model,
      lit: published?.lit ?? DecorTraits.litByDefault(object.kind, model),
      lights: (published?.lights ?? true) && LightRigs.forKind(object.kind).length > 0,
      windows: !model && hasWindows(object.kind),
      floors: !model && object.kind === "building",
      observerSide: canHoldObserver(object.kind)
    }
  }

  /** Whether the object is drawn as a loaded model rather than as its built-in shape. */
  static drawnAsModel(object: Pick<DecorObject, "kind" | "model" | "observerSide">): boolean {
    return decorModelOf(object) !== undefined && !(object.observerSide !== undefined && canHoldObserver(object.kind))
  }

  /** A street lamp's real light switches with the object whatever it is drawn as; a car's headlights
   * are parts of the built-in shape. Nothing else has anything to switch. */
  private static litByDefault(kind: DecorKind, model: boolean): boolean {
    return kind === "streetlight" || (kind === "vehicle" && !model)
  }
}
