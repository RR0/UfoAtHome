/** What the HVS table says — see HvsElement. Each `{name}` is filled where it is said. */
export interface HvsMessages {
  /** What it is called, folded. */
  heading: string
  /** What the protocol does and what of it is the analyst's, in the (?) beside the heading. */
  hint: string
  /** Whose protocol, which version: `{protocol}`. */
  credit: string
  /** Which version of its taxonomy of hypotheses: `{taxonomy}`. */
  taxonomy: string
  /** The list of elements is not frozen yet. */
  notSealed: string
  /** No elements: nothing to cover. */
  noElements: string
  /** No hypotheses weighed. */
  noHypotheses: string
  iqi: {
    heading: string
    /** One group and its level, with the punctuation of the language: `{group}`, `{level}`. */
    item: string
    /** The sum of the levels rated, `{sum}` out of `{of}`. */
    total: string
    groups: { dateTime: string, place: string, identification: string, witnesses: string, enquiry: string }
    levels: { complete: string, partial: string, absent: string }
    /** A group nobody rated, and nothing in the file suggests. */
    unrated: string
    /** Beside a level read from the file rather than given. */
    suggested: string
  }
  elements: {
    heading: string
    id: string
    element: string
    status: string
    statuses: { observed: string, inferred: string, association: string }
    /** Beside an element that tells the hypotheses apart. */
    discriminating: string
    /** In a cell: explained, not explained, each as the confrontation of a reading found it or as declared. */
    explainedByReading: string
    notExplainedByReading: string
    explainedDeclared: string
    notExplainedDeclared: string
  }
  hypotheses: {
    heading: string
    code: string
    hypothesis: string
    csRaw: string
    csDiscriminating: string
    ps: string
    hvs: string
    standing: string
    /** A score and its envelope: `{preferred}` [`{low}` – `{high}`]. */
    score: string
    /** Covers at least half of the elements: it may be examined, which is no verdict. */
    admissible: string
    notAdmissible: string
    /** What the two say, over the milestone column. */
    admissibleHint: string
    dominant: string
    identified: string
    proven: string
    /** The plausibility is the geometric mean: a rating collapsed. */
    geometric: string
    /** Ratings not given: `{names}`. */
    missing: string
    ratings: { existence: string, frequency: string, compatibility: string, context: string }
  }
  loading: string
}
