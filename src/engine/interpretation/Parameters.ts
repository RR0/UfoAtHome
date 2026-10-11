import type { SaidText } from "../model/SaidText.js"

/**
 * What an element of a recording lets its author set, said by the element itself.
 *
 * An editor that knows the fields of every kind of thing it edits has to be changed for each new
 * kind: a launch's thrust, a decor object's height, a cloud's base. So the kind says its own
 * parameters instead — a key into its JSON, a label in as many languages as it has, and what is
 * allowed (a type, its bounds and step, its unit) — and a generic form builds the fields (see
 * ParameterForm). A new kind of thing is then a description and nothing in the editor: the nearest
 * this project has to a plugin, one that carries data and not code.
 *
 * The labels are `SaidText`, so a kind published from outside this package (another repository's
 * asset) speaks the languages it has, and a reader whose language it lacks reads what it does have.
 */
export type ParameterSpec = NumberParameter | ChoiceParameter | TextParameter | SaidParameter | SetParameter | BooleanParameter | ColourParameter

interface ParameterBase {
  /**
   * Where the value is in the element's JSON, dotted: "plume.collarShare", "vehicle.engine.thrustKN".
   * Written bare, as an author types it; a value stated with its provenance (see Provenance) is
   * read through its `value`, and replaced by the bare one when it is edited.
   */
  key: string
  label: SaidText
  /** A sentence on what it does, shown as the field's tooltip. */
  hint?: SaidText
  /** What the summary strip calls it when it stands alone, where the label only makes sense under its group heading. */
  summary?: SaidText
  /** The fields that go together are drawn together, under this heading. */
  group?: SaidText
  /** Whether the field applies to the element as it stands now (a floor to occupy needs a building). Drawn only while it does. */
  visibleWhen?: (element: ParameterHolder, context?: unknown) => boolean
}

/**
 * A number. `min`, `max` and `step` are required, because the field takes only what they allow (see
 * NumberFields): a field with no bound takes nine digits.
 */
export interface NumberParameter extends ParameterBase {
  type: "number"
  min: number
  max: number
  step: number
  /** Shown AFTER the field, never in its label. */
  unit?: string
  /**
   * The value in force when the element does not state one — a default, or what another value of the
   * element implies (a thrust and an impulse imply an exhaust flow). Shown in the empty field, and
   * what clearing the field goes back to. It reads the element's other values with `Parameters.read`,
   * which sees through a value stated with its provenance.
   */
  effective?: (element: ParameterHolder, context?: unknown) => number | undefined
  /**
   * Shown instead of a value when the element states none and nothing is in force that a number can say: "General
   * wind", for a layer's wind that inherits the weather's.
   */
  placeholder?: SaidText
  /**
   * What the field shows is the stored value times this: a coverage stored from 0 to 1 is typed in percent. `min`, `max`
   * and `step` are in what is typed.
   */
  scale?: number
  /** A value that cannot be absent: emptying the field leaves what was there, instead of stating nothing. */
  required?: boolean
  /**
   * Bounds that depend on the element: the floor the observer stands on goes up to the number of
   * floors the building has. What it gives replaces `min` and `max`, which stay the widest the field
   * can ever take.
   */
  bounds?: (element: ParameterHolder, context?: unknown) => { min?: number, max?: number }
}

export interface ChoiceParameter extends ParameterBase {
  type: "choice"
  /** A choice that cannot be left unmade: there is no empty option. */
  required?: boolean
  choices: ReadonlyArray<{ value: string, label: SaidText }>
  /** What is in force when none is chosen, shown as the empty choice. */
  effective?: (element: ParameterHolder, context?: unknown) => string | undefined
}

export interface TextParameter extends ParameterBase {
  type: "text"
  placeholder?: SaidText
  /** Cannot be empty: emptying the field keeps what was there. */
  required?: boolean
  /**
   * Whether a typed value may be kept: an identifier another element already has may not. A value refused is not
   * written and the field is marked; leaving it puts the stated value back.
   */
  validate?: (value: string, element: ParameterHolder, context?: unknown) => boolean
}

/**
 * Text an author writes in a language (see SaidText): shown as the reader's language has it, and written into
 * that language's entry without touching the others.
 */
export interface SaidParameter extends ParameterBase {
  type: "said"
  placeholder?: SaidText
}

/**
 * Some of a list that the element does not hold itself, ticked: the shapes a body stands for. A value the element
 * states that the list no longer offers is still listed, since dropping it would be an edit nobody made.
 */
export interface SetParameter extends ParameterBase {
  type: "set"
  options: (element: ParameterHolder, context?: unknown) => ReadonlyArray<{ value: string, label: string }>
  /** What stands where the list is empty. */
  empty?: SaidText
}

export interface BooleanParameter extends ParameterBase {
  type: "boolean"
}

export interface ColourParameter extends ParameterBase {
  type: "colour"
  /** The swatch a value the field cannot hold is shown as (a colour name, or no colour): a mid grey when absent. */
  fallback?: string
}

/** An element as its JSON, which is all that the parameters read and write. */
export type ParameterHolder = Record<string, unknown>

/** A kind's parameters, and what they are the parameters of. */
export interface ParameterSet {
  /** The kind: "launch". */
  kind: string
  title: SaidText
  parameters: ReadonlyArray<ParameterSpec>
}

/**
 * Reads and writes a parameter by its key, in the element's JSON.
 *
 * An absent value is a value that is not stated, which is different from zero: clearing a field
 * removes the key, and what is empty again around it is removed too, so a launch that had no
 * `plume` before is not left with an empty one.
 */
export class Parameters {

  /** The value at `key`, bare: a value stated with its provenance is read as its `value`. */
  static read(element: ParameterHolder, key: string): unknown {
    let at: unknown = element
    for (const part of key.split(".")) {
      at = Parameters.bare(at)
      if (at === null || typeof at !== "object") return undefined
      at = (at as Record<string, unknown>)[part]
    }
    return Parameters.bare(at)
  }

  /** Sets the value at `key`, or removes it when `value` is undefined. Creates what the path needs. */
  static write(element: ParameterHolder, key: string, value: unknown): void {
    const parts = key.split(".")
    const trail: Array<{ owner: Record<string, unknown>, part: string }> = []
    let at = element as Record<string, unknown>
    for (let i = 0; i < parts.length - 1; i++) {
      let next = Parameters.bare(at[parts[i]])
      if (next === null || typeof next !== "object" || Array.isArray(next)) {
        if (value === undefined) return
        next = {}
      }
      // A parent stated with its provenance (a value and its basis) is not a place to put fields
      // into: the bare object replaces it, as the bare value replaces a stated leaf.
      at[parts[i]] = next
      trail.push({ owner: at, part: parts[i] })
      at = next as Record<string, unknown>
    }
    const leaf = parts[parts.length - 1]
    if (value === undefined) delete at[leaf]
    else at[leaf] = value
    // What is left empty is removed, from the inside out.
    for (let i = trail.length - 1; i >= 0; i--) {
      const child = trail[i].owner[trail[i].part] as Record<string, unknown>
      if (Object.keys(child).length > 0) break
      delete trail[i].owner[trail[i].part]
    }
  }

  /** Whether the element states a value at `key` (a cleared field does not). */
  static stated(element: ParameterHolder, key: string): boolean {
    return Parameters.read(element, key) !== undefined
  }

  /** A value stated with its provenance is `{ value, basis, rationale }`: its `value` is what it says. */
  private static bare(value: unknown): unknown {
    if (value !== null && typeof value === "object" && !Array.isArray(value) && "value" in value && "basis" in value) {
      return (value as { value: unknown }).value
    }
    return value
  }
}

/**
 * The parameters the kinds of this page publish, by kind: where an asset that is not part of this
 * package says what it lets an author set. Publishing the same kind again replaces it, so that an
 * asset can refine what a default described.
 */
export class ParameterRegistry {
  private static readonly sets = new Map<string, ParameterSet>()

  static publish(set: ParameterSet): void {
    ParameterRegistry.sets.set(set.kind, set)
  }

  static of(kind: string): ParameterSet | undefined {
    return ParameterRegistry.sets.get(kind)
  }

  static kinds(): string[] {
    return [...ParameterRegistry.sets.keys()]
  }
}
