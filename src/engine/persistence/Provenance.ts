import type { SaidText } from "../model/SaidText.js"

/**
 * Where a value in a recording came from.
 *
 * "stated" is the default and the reason there IS a default: for the whole life of this format
 * every value was the observer's own, so a file that says nothing says "stated", and every recording
 * ever written stays true without being touched.
 *
 * The weaker ones are what let a reconstruction be run at all. A observer who says "a few minutes"
 * has not given a duration, and a timeline needs one; one who says the thing barred the road has
 * not given an angle, though a road's width and a plausible distance bound one. Refusing to write
 * those left a recording that could not play, which is a worse answer than a marked guess.
 *
 * The two at the ends were asked for by the GEIPAN (A. Cousyn, November 2026), and they are about one danger: a reconstruction
 * that is made to fit and then read as a validation. "established" names what was settled away from both the account and the
 * simulation, the only thing worth judging a reconstruction against; "fitted" names what was turned to make a hypothesis fit, and
 * nothing may be judged against it.
 */
export type Basis =
  /** Settled away from the observation and away from the reconstruction: a document, a register, a survey, a third party's
   * measurement — a crane's permit, a cadastre, a published orbit. It owes nothing to the account and nothing to the simulation,
   * which is what makes it the one kind of value a reconstruction may be judged against. `rationale` names the source. */
  | "established"
  /** Read off an instrument or a gauge — a clock, a compass, an arm's-length gauge — by the observer or an investigator: the
   * strongest the observation itself gives, since its error is the instrument's and not a memory's (see docs/witness-error-model.md). */
  | "measured"
  /** The observer said it. The default when a file states no basis at all. */
  | "stated"
  /** Worked out from what the observer said plus something checkable — a road's width, a place's
   * coordinates, the geometry of a bend. `rationale` carries the working. */
  | "derived"
  /** Chosen so the reconstruction has a value at all, on nothing the observer said. The list of
   * these IS the list of what to go back to the source for. */
  | "assumed"
  /** Moved, within what is known, to see whether a hypothesis can be made to fit — the knob a reading turns.
   *
   * It is the weakest of all, and deliberately so: the more of these a reconstruction holds, the easier it is to produce a
   * likeness, so a likeness obtained on them proves nothing. Nothing judges a reading against a fitted value (see ReadingCheck):
   * agreement there is the fitting, not a finding. `rationale` says which hypothesis it was turned for. */
  | "fitted"

/**
 * Where the observer said it: the passage of an interview a value comes from (see InterviewJson).
 *
 * The mirror of InterviewSightingRef, which points the other way, from a passage to the moment of
 * the observation it tells of. Both halves exist because an investigator reads in both directions:
 * from the account to what was said, and from what was said to the account.
 *
 * It is also, and this is the point, the whole history of what the observer said. A witness gone
 * back to corrects some things and leaves the rest standing, so a value corrected cites the LATER
 * interview and one nobody revisited goes on citing the FIRST: which interview each value cites IS
 * the record of what changed and what did not, and nothing has to keep successive versions of the
 * reconstruction to show it. Asked for by the GEIPAN (A. Cousyn, November 2026), whose worry is a
 * witness's memory contaminated by what was shown to them: what a value rests on is then a dated
 * statement, not "the account" in general.
 */
export interface SaidIn {
  /** The `id` of the case's interview event. Absent: the only interview the case holds. */
  interview?: string
  /** Which turn of speech, as an index into the transcript's `segments`. */
  segment: number
  /** The part of that segment's text it is about, as `[from, to)` character offsets. */
  range?: [number, number]
}

/**
 * What a value rests on, named: the thing an investigator would go and look at.
 *
 * A basis says what KIND of thing a value is (see Basis); this says WHICH thing, and the two answer
 * different questions. "derived" with the working in its `rationale` is honest and still leaves a
 * reader with nowhere to go; "established" is worth nothing at all until it names the register it
 * was established in. The GEIPAN put it plainly (A. Cousyn, November 2026): every determining
 * parameter should be tied to its origin — testimony, questionnaire, photograph, measurement,
 * outside calculation or working hypothesis — and the traceability has to be beyond reproach.
 *
 * One of these at a time, in the order they are declared. The last of their list has none on
 * purpose: a working hypothesis rests on nothing, which is what "assumed" and "fitted" already say,
 * and inventing a source for it would be the one lie this field exists to prevent.
 */
export interface ValueSource {
  /** What the observer said, and where — see SaidIn. */
  said?: SaidIn
  /** A document: the questionnaire, a report, a paper, a register. Translatable, as a title is. */
  document?: SaidText
  /** Where in it: a page, a question's number, a line. */
  at?: string
  /** Its address, where it has one. */
  url?: string
  /** The `id` of a picture of the recording it was measured on (see Reference): a photograph lined
   * up on the scene, which is a measurement and not an illustration. */
  picture?: string
  /** The tool the measurement or the calculation was made in: "SVH", "IPACO", "QGIS", "a theodolite". */
  tool?: string
}

/** A value with its provenance beside it — what any field of a recording may be written as, in
 * place of the bare value. */
export interface StatedValue<T = unknown> {
  value: T
  /** Absent means "stated": see Basis. */
  basis?: Basis
  /** Why this value, and why that basis — the working for a derivation ("a 5.5 m carriageway at
   * 20-100 m spans 15 to 3 degrees; 8 taken"), or what a guess was chosen for. Optional because a
   * stated value's justification is the account itself, which is already in the recording.
   *
   * A plain string, or one per language as a title is (see SaidText): a report on a case is read in its reader's language, and a
   * justification left in the language its author wrote it in is the one part of it that reader cannot read. */
  rationale?: SaidText
  /**
   * How it was obtained, from a closed list per kind of value (see WitnessError.HOW): a time read on a `clock`, `anchored` to a dated
   * event or `estimated`; a size `shown-on-the-spot`, through an `arm-length-gauge` or a `recalled-object`; an elevation or a heading
   * from an `instrument`, a `landmark` or `estimated`; a distance from `occlusion`, a `known-size`, `triangulation` or `estimated`. It
   * is what selects the law of its error. Absent means an unqualified estimate.
   */
  how?: string
  /**
   * How far what is known lets it be, when that is less than nothing and more than the value: a number's least and greatest
   * (`[50.5, 51.6]`), or a time's EDTF interval (`"1976-06/1976-07"`, the sources' June or July). The value is the one chosen within it
   * to draw the scene; a reading of the observation may move it anywhere within it, and contradicts what is known beyond (see
   * ReadingCheck). Absent: a stated, derived or measured value is what is known; an assumed one is free.
   */
  range?: ValueRange
  /** What it rests on — see ValueSource. */
  source?: ValueSource
}

/** See StatedValue.range. */
export type ValueRange = [number, number] | string

/** What is known about one path, once the value has been taken out of it. */
export interface ProvenanceEntry {
  basis: Basis
  /** See StatedValue.rationale. */
  rationale?: SaidText
  /** See StatedValue.how. */
  how?: string
  /** See StatedValue.range. */
  range?: ValueRange
  /** See StatedValue.source. */
  source?: ValueSource
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
 * Paths are dot-joined with array indices as steps ("time", "place.locations.0.lat",
 * "timeline.keyframes.1.shapes.0.shape.angular.widthDeg"), which is also how a provider names them
 * (see NarrativeClaim.path) — one vocabulary, so a claim can be stored without translation.
 */
export class Provenance {

  private constructor(private readonly entries: Map<string, ProvenanceEntry>) {
  }

  /**
   * Whether a value is one a reading may move freely: one the account never settled ("assumed"), or one turned to make a
   * hypothesis fit ("fitted").
   *
   * Moving it is not a contradiction, and agreeing with it is not a finding: it was put there to be moved. Nothing is tested
   * against such a value (see ReadingCheck), which is the whole point of marking it — a likeness obtained by turning knobs is a
   * likeness and no more.
   */
  static free(entry: ProvenanceEntry | undefined): boolean {
    return entry?.basis === "assumed" || entry?.basis === "fitted"
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

  /** Every value that names what it rests on, with its path and its basis — what a report's
   * traceability table is made of (see ValueSource). */
  sourced(): { path: string, basis: Basis, source: ValueSource }[] {
    return [...this.entries]
      .filter(([, entry]) => entry.source !== undefined)
      .map(([path, entry]) => ({ path, basis: entry.basis, source: entry.source! }))
  }

  /**
   * The interviews this recording cites, in the order they are first cited.
   *
   * What each one accounts for is the history of what the observer said: a value corrected by a
   * later interview cites that one, and one nobody went back over goes on citing the first (see
   * SaidIn). Which is the later is the CASE's to say, from the dates of its interview events;
   * nothing here knows them, and nothing here guesses. A citation that names no interview (the only
   * one a case holds) is not listed, since there is nothing to tell apart.
   */
  interviewsCited(): string[] {
    const cited: string[] = []
    for (const { source } of this.sourced()) {
      const id = source.said?.interview
      if (id !== undefined && !cited.includes(id)) cited.push(id)
    }
    return cited
  }

  /** The paths whose value was said in that interview — what it accounts for. With no `id`, the
   * paths said in the interview a citation names none of. */
  pathsFromInterview(id?: string): string[] {
    return this.sourced().filter(({ source }) => source.said !== undefined && source.said.interview === id).map(({ path }) => path)
  }

  /** Records what is known about `path`. A "stated" entry with no rationale is dropped rather than
   * stored: it is the default, and writing it would put noise in every file. */
  set(path: string, entry: ProvenanceEntry): void {
    if (entry.basis === "stated" && entry.rationale === undefined && entry.how === undefined && entry.range === undefined
      && entry.source === undefined) {
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
    // Copied only along the paths it writes to, each object once: the rest is the recording's own, shared, and never written to.
    // A whole copy made a fourteen-megabyte recording cost a clone at every save and every edit, for a few wrapped values.
    const restored = { ...json } as unknown as JsonObject
    const copies = new Set<object>([restored])
    for (const path of provenance.paths()) {
      const entry = provenance.at(path)!
      const steps = path.split(".")
      const holder = Provenance.writableHolderOf(restored, steps, copies)
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
        ...(entry.rationale === undefined ? {} : { rationale: entry.rationale }),
        ...(entry.how === undefined ? {} : { how: entry.how }),
        ...(entry.range === undefined ? {} : { range: entry.range }),
        ...(entry.source === undefined ? {} : { source: entry.source })
      } satisfies StatedValue
    }
    return restored as unknown as T
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
        ...(value.how === undefined ? {} : { how: value.how }),
        ...(value.range === undefined ? {} : { range: value.range }),
        ...(value.source === undefined ? {} : { source: value.source }),
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

  /**
   * The object holding the last step of `steps`, as a copy of its own that may be written to: each object on the way is copied the
   * first time a path goes through it (`copies` remembers which are), so that nothing of the recording itself is ever written to.
   * Creates nothing: a path into something that is no longer there returns undefined.
   */
  private static writableHolderOf(root: JsonObject, steps: string[], copies: Set<object>): JsonObject | undefined {
    let at = root
    for (const step of steps.slice(0, -1)) {
      const next: unknown = at[step]
      if (typeof next !== "object" || next === null) return undefined
      if (copies.has(next)) {
        at = next as JsonObject
        continue
      }
      const copy = (Array.isArray(next) ? [...next] : { ...next }) as JsonObject
      copies.add(copy)
      at[step] = copy
      at = copy
    }
    return at
  }
}
