/**
 * Where a value in a recording came from.
 *
 * "stated" is the default and the reason there IS a default: for the whole life of this format
 * every value was the witness's own, so a file that says nothing says "stated", and every recording
 * ever written stays true without being touched.
 *
 * The other two are what let a reconstruction be run at all. A witness who says "a few minutes"
 * has not given a duration, and a timeline needs one; one who says the thing barred the road has
 * not given an angle, though a road's width and a plausible distance bound one. Refusing to write
 * those left a recording that could not play, which is a worse answer than a marked guess.
 */
export type Basis =
  /** The witness said it. The default when a file states no basis at all. */
  | "stated"
  /** Worked out from what the witness said plus something checkable — a road's width, a place's
   * coordinates, the geometry of a bend. `rationale` carries the working. */
  | "derived"
  /** Chosen so the reconstruction has a value at all, on nothing the witness said. The list of
   * these IS the list of what to go back to the source for. */
  | "assumed"

/** A value with its provenance beside it — what any field of a recording may be written as, in
 * place of the bare value. */
export interface StatedValue<T = unknown> {
  value: T
  /** Absent means "stated": see Basis. */
  basis?: Basis
  /** Why this value, and why that basis — the working for a derivation ("a 5.5 m carriageway at
   * 20-100 m spans 15 to 3 degrees; 8 taken"), or what a guess was chosen for. Optional because a
   * stated value's justification is the account itself, which is already in the recording. */
  rationale?: string
}

/** What is known about one path, once the value has been taken out of it. */
export interface ProvenanceEntry {
  basis: Basis
  rationale?: string
  /**
   * The value this was said ABOUT, kept so the saying can expire.
   *
   * A basis describes one value, not one field. The moment an author types over a guessed duration,
   * the guess is gone and "assumed, because the account only said a few minutes" is no longer true
   * of what is there — it would credit the author's own work to a machine. Comparing on the way out
   * catches that without every one of the editor's field handlers having to remember to say so, and
   * without a fortieth place for the rule to be forgotten.
   */
  of?: unknown
}

/** A plain JSON object — what the walk descends into. Arrays are walked too, by index. */
type JsonObject = Record<string, unknown>

/**
 * Takes provenance out of a recording on the way in, and puts it back on the way out.
 *
 * Any field of a recording may be written either bare or as {@link StatedValue}. That is a decision
 * about the FILE, not about the model: every consumer in this project — the astronomy, the
 * renderers, the six thousand lines of editor — reads plain numbers and strings, and making each of
 * them unwrap would be a change to everything in exchange for a fact none of them use.
 *
 * So the wrapper lives exactly as long as the file does. {@link strip} runs before the recording is
 * read and hands back a plain one plus a table of what it removed; {@link restore} puts it back
 * before the recording is written. In between, the model is what it has always been, and the
 * provenance rides along on the Sighting as one map rather than as a thousand wrappers.
 *
 * Paths are dot-joined with array indices as steps ("time.year", "place.0.lat",
 * "timeline.keyframes.1.shapes.0.shape.angular.widthDeg"), which is also how a provider names them
 * (see NarrativeClaim.path) — one vocabulary, so a claim can be stored without translation.
 */
export class Provenance {

  private constructor(private readonly entries: Map<string, ProvenanceEntry>) {
  }

  static empty(): Provenance {
    return new Provenance(new Map())
  }

  get size(): number {
    return this.entries.size
  }

  /** What is known about `path`, or undefined for a value nobody said anything about — which means
   * "stated", the same as if the file had said so. */
  at(path: string): ProvenanceEntry | undefined {
    return this.entries.get(path)
  }

  /** Every path with a basis, in insertion order. */
  paths(): string[] {
    return [...this.entries.keys()]
  }

  /** Records what is known about `path`. A "stated" entry with no rationale is dropped rather than
   * stored: it is the default, and writing it would put noise in every file. */
  set(path: string, entry: ProvenanceEntry): void {
    if (entry.basis === "stated" && entry.rationale === undefined) {
      this.entries.delete(path)
    } else {
      this.entries.set(path, entry)
    }
  }

  /** Forgets everything known about `path` and everything under it — what an author editing a
   * field by hand does to a guess that was there: the value is now theirs, whatever it was before. */
  clear(path: string): void {
    for (const known of this.entries.keys()) {
      if (known === path || known.startsWith(`${path}.`)) {
        this.entries.delete(known)
      }
    }
  }

  /**
   * `json` with every {@link StatedValue} replaced by its own value, and a Provenance holding what
   * was taken out.
   *
   * Returns a new object; the argument is untouched. A recording that carries no provenance at all
   * comes back deep-equal to what went in, which is every recording written before this existed.
   */
  static strip<T>(json: T): { recording: T, provenance: Provenance } {
    const provenance = new Provenance(new Map())
    const recording = Provenance.stripValue(json, [], provenance) as T
    return { recording, provenance }
  }

  /** `json` with each path `provenance` knows about written back as a {@link StatedValue}. Returns
   * a new object; the argument is untouched. */
  static restore<T>(json: T, provenance: Provenance): T {
    if (provenance.size === 0) {
      return json
    }
    const restored = structuredClone(json)
    for (const path of provenance.paths()) {
      const entry = provenance.at(path)!
      const steps = path.split(".")
      const holder = Provenance.holderOf(restored as unknown as JsonObject, steps)
      if (!holder) {
        // The path no longer exists: a shape deleted, a keyframe removed. Its provenance goes with
        // it rather than resurrecting an empty wrapper where the value used to be.
        continue
      }
      const last = steps[steps.length - 1]
      const value = holder[last]
      if (value === undefined) {
        continue
      }
      // The value this basis was said about has been replaced since — by an author typing over it,
      // most likely. It is theirs now, and it goes out bare. See ProvenanceEntry.of.
      if (entry.of !== undefined && JSON.stringify(entry.of) !== JSON.stringify(value)) {
        continue
      }
      holder[last] = {
        value,
        ...(entry.basis === "stated" ? {} : { basis: entry.basis }),
        ...(entry.rationale === undefined ? {} : { rationale: entry.rationale })
      } satisfies StatedValue
    }
    return restored
  }

  /** True when `value` is a wrapper rather than a plain object of the recording's own.
   *
   * The test is the presence of a `value` key, and it is deliberately not cleverer than that: no
   * field of a recording is an object with a `value` key of its own, and a rule that also demanded
   * a `basis` would silently drop a rationale written without one. */
  private static isWrapper(value: unknown): value is StatedValue {
    return typeof value === "object" && value !== null && !Array.isArray(value) && "value" in value
  }

  private static stripValue(value: unknown, at: string[], into: Provenance): unknown {
    if (Provenance.isWrapper(value)) {
      into.set(at.join("."), {
        basis: value.basis ?? "stated",
        ...(value.rationale === undefined ? {} : { rationale: value.rationale }),
        of: value.value
      })
      // Recur: a wrapped object may hold wrapped fields of its own.
      return Provenance.stripValue(value.value, at, into)
    }
    if (Array.isArray(value)) {
      return value.map((item, index) => Provenance.stripValue(item, [...at, String(index)], into))
    }
    if (typeof value === "object" && value !== null) {
      return Object.fromEntries(
        Object.entries(value).map(([key, held]) => [key, Provenance.stripValue(held, [...at, key], into)])
      )
    }
    return value
  }

  /** The object holding the last step of `steps`, creating nothing: a path into something that is
   * no longer there returns undefined rather than building a husk for it. */
  private static holderOf(root: JsonObject, steps: string[]): JsonObject | undefined {
    let at: unknown = root
    for (const step of steps.slice(0, -1)) {
      if (typeof at !== "object" || at === null) {
        return undefined
      }
      at = (at as JsonObject)[step]
    }
    return typeof at === "object" && at !== null ? at as JsonObject : undefined
  }
}
