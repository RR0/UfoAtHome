# Witness error model and variants under a hypothesis

Design note, nothing implemented. It describes how a recording could carry what is known about the
errors in each value a witness gives, and how that knowledge would be used: not to blur the
recording, but to ask whether a candidate explanation is reachable from it.

The error laws themselves are in [testimony-evaluation-leads.md](testimony-evaluation-leads.md)
(user-facing summary: [ufoathome.org/roadmap/witness](https://ufoathome.org/roadmap/witness/)). This
note is about the format, the editor, the reader and the search that would put them to work.

## Where things stand

- **Provenance exists in the format.** Any field may be written as `{ value, basis, rationale }`
  (`src/engine/persistence/Provenance.ts`), with `basis` one of `stated` (the default), `derived` or
  `assumed`. The wrapper is stripped on read and restored on write, so no consumer sees it. The
  reader shows the weakest basis of each line of its panel; `CoverageAssessor` grades its questions
  with it.
- **The editor cannot set it.** Bases are written only by automated paths: the narrative draft, the
  photo fit of the observer's pose, light pollution. No field shows its basis, and typing over a value
  drops its basis silently (`ProvenanceEntry.of`, by design).
- **`stated` conflates two things**: a value the witness estimated or recalled, and a value measured
  on the spot (a clock read, a compass, an arm's-length gauge) or by an investigator afterwards (a
  theodolite on site). Their error laws differ by an order of magnitude.
- **Margins exist only for time**, as EDTF qualifiers (`~`, `?`, `%`) on dates and durations, and
  they are qualitative.
- **Tolerances are hard-coded where they are used**: `BodyConfrontation.DIRECTION_TOLERANCE_DEG = 1`
  and `SIZE_TOLERANCE = 1.5`, the same for every witness, every value, every condition.

## Principle: margins are computed, never typed

A margin typed by an author is a guess about a guess. The studies say something better: the error
of a value depends on **what kind of value it is**, **its value**, **how it was obtained** and **the
conditions it was obtained in**, and the dependence is often neither symmetric nor even a margin.

| Value                        | What is known (see the leads note)                                                                 | Shape of the error                          |
|------------------------------|----------------------------------------------------------------------------------------------------|---------------------------------------------|
| Elevation                    | Overestimated; "overhead" means 30° or more; 25-40° estimates were 10° or less 4 times in 10      | One-sided, downward, growing with the value |
| Distance to a low light      | Placed at the skyline's distance, less so as it rises                                              | **Uninformative** inside a band around the skyline distance from the DEM |
| Distance, size, speed (m)    | Off by a factor 10 or more unless anchored                                                         | Not data; only anchors count                 |
| Heading                      | Reliable to about ±45° across the line of sight; sense sometimes reversed                          | Symmetric, plus a discrete reversal          |
| Angular size                 | Overestimated (3-4× at arm's length) or within +2 to +17 % when shown on the spot (contested)      | Multiplicative, per witness, per method      |
| Time of day                  | N(0, 6 min) for 90 %, wider tail; a clock read beats any estimate                                  | Depends on the time source                   |
| Duration                     | Log-normal, σ(ln) ≈ 1.25 (×/÷3)                                                                    | Multiplicative                               |
| Date                         | Right for 98 %; wrong dates are often ±1 day, month or year, or summer time                        | **Discrete** shifts, not a margin            |

So the model is a function, not a field:

```
error(kind, value, how, conditions) → law | uninformative
```

where a `law` is a distribution in the value's own terms (one-sided, multiplicative, discrete
shifts...) and `uninformative` says the value carries no information about the thing it claims to
measure (a low light's distance inside the skyline band). Each law names its sources and carries
the status of the lead it comes from (consolidated, single study, argued, contested).

### A seam, like `Assessor`

`ErrorModel` would be a `DataSource` registry like the others, for the same reason `Assessor` is:
the literature disagrees (angular size is contested between Peiniger and Keul), and the format must
not take a side. One implementation per reading of the literature; its picker is its credit.

A law is a population statistic. It says how witnesses err in general, not how this one did. The
only way to make it individual is to measure the witness (see the Moon gauge below), which is why
the inputs the model needs matter more than the model.

### Dates keep EDTF

EDTF already says how precise a date is (`~`, `?`, `%`, partial dates) and stays the way to write
it. What EDTF does not express is the wrong-date error: a date given precisely and wrong by a day, a
month, a year or an hour of summer time. That is not a margin; it is a variant (below).

## What the recording needs to carry

No new margin field. Instead, the inputs the error model reads.

### Per value: how it was obtained

`basis` gains `measured`, ranked above `stated`:

| Basis      | Meaning                                                                 | Rank (strongest first) |
|------------|-------------------------------------------------------------------------|------------------------|
| `measured` | Read off an instrument or gauge, by the witness or an investigator       | 1                      |
| `stated`   | Estimated or recalled by the witness (default)                           | 2                      |
| `derived`  | Worked out from stated or measured values plus something checkable      | 3                      |
| `assumed`  | Chosen so the reconstruction can run                                    | 4                      |

and an optional `how`, from a closed list per kind of value, because that is what selects a law:

- time: `clock`, `anchored` (to a broadcast, a train...), `estimated`;
- angular size: `shown-on-the-spot`, `arm-length-gauge`, `recalled-object` ("a football");
- elevation, heading: `instrument`, `landmark`, `estimated`;
- distance: `occlusion`, `known-size`, `triangulation`, `estimated`.

Existing files are untouched: no `how` means the law for an unqualified estimate.

### Per witness: the conditions

Fields on the witness (or on each version of their account), each an input of some law:

- **delay** between the sighting and this account, and **which version** it is (the earliest weighs
  most; retelling lowers the ratio of right to wrong details);
- **the word used** for the phenomenon (light, object, craft, UFO), which predicts metric detail is
  volunteered, not how wrong it is;
- **exposure** before the account (press, TV, other witnesses), and whether witnesses talked to each
  other (independence);
- **viewing conditions**: dark adaptation, corrected vision, window or windscreen, binoculars, recent
  bright light;
- **the Moon gauge**: the witness shows the full Moon the way they showed the object. The ratio is
  their own angular-size factor, and the one input that turns a population law into an individual
  one. It deserves a dedicated control, since the investigator records it once per witness.

### Per witness: correlated errors

The errors of one witness are not independent per value. The same person applies the same size
factor to every angle they give, the same clock offset to every time, the same compression to every
elevation. The model therefore exposes a few **witness parameters** rather than one margin per
keyframe:

| Parameter              | Applies to                          | Law from                       |
|------------------------|-------------------------------------|--------------------------------|
| clock offset           | every time of the recording         | time source                    |
| date shift             | the date (±1 d, month, year; DST)   | wrong-date lead                |
| heading rotation, mirror | every bearing                     | heading lead                   |
| elevation compression  | every elevation                     | elevation lead                 |
| angular size factor    | every angular size                  | Moon gauge, else method        |
| duration factor        | the duration, and the timeline's scale | duration lead               |

Fewer than ten dimensions, each with a law. This is what keeps the search below tractable.

## Variants are observations, found from a hypothesis

### Not field variations

Varying fields one by one is the wrong unit: 3 values each for N uncertain fields is 3^N recordings,
nearly all meaningless, because they break the correlations above (a witness does not overestimate
one elevation and underestimate the next).

### Not enumeration either

Even with witness parameters, sampling the space and replaying each sample answers no question. The
question an investigator asks is the other way round: **"could this testimony be a misperception of
X, and at what cost?"**

### The search

For one witness's recording and one candidate (Venus, the ISS, an airliner on its logged track, a
re-entry, a launch plume):

1. Place the candidate in the scene (it already is: `interpretations`, `BodyConfrontation`).
2. Find the witness parameters that bring the testimony closest to what the candidate would have
   looked like, under their laws. This is a fit in fewer than ten dimensions, plus a handful of
   discrete choices (date shift, mirror).
3. Its result is **one variant per candidate**: the testimony as it would read if the witness had
   erred that way, plus its **cost**: which biases it invokes, by how much in units of each law's
   spread, and the status of each.

The number of variants is the number of candidates, not a power of the number of fields.

### Structural variants

Some misperceptions are not shifts of a value but a different reading of the scene, and come from
the candidate, not from a parameter:

- lights read as one body (a formation, a re-entry's fragments, an airliner's lights);
- apparent motion that is not motion (a static light seen moving, an approaching aircraft seen
  hovering, a light switching off seen leaving);
- brightening read as approach.

Each candidate declares which of these it may need, and the variant states which it used. They are
few and are never searched blindly.

### A variant is an interpretation

`Interpretation.ts` already says it: "an interpretation is another observation: the one that was, as
whoever interprets holds it". A variant is exactly that, with two additions:

- the **witness parameters** applied (the transformation from the account to the variant), so the
  variant is reproducible and the account itself never changes;
- the **cost** and the **error model** it was computed with (its id, like a data source), so it can
  be recomputed when the model changes.

It lives where interpretations live (case events of type `interpretation`, or the recording's own),
and is replayed the same way. The account stays the reference; nothing overwrites it.

### Verdicts

Per candidate, three outcomes, in the vocabulary of the leads' statuses:

- **compatible with consolidated biases**: reachable using only consolidated laws, within their
  usual spread;
- **compatible only by invoking contested or argued biases**, or tails of the laws (named);
- **incompatible even at the bounds**: no setting of the witness parameters reaches it. Per the
  "an explanation must be possible too" lead, that is a finding against the explanation, not the
  account.

`BodyConfrontation`'s fixed tolerances become the special case of "no error model": its
`disagreements` would be computed against the law for each value instead of 1° and ×1.5.

The contradiction rule stays as it is (a stated value contradicted by the computation is shown
struck through in red, never removed), with one refinement: a value is contradicted only when it is
outside its law, not merely different.

## Interface impact

### Editor

- **Per field**: a basis marker, shown on hover or focus, opening a picker (`measured`, `stated`,
  `derived`, `assumed`), the `how` list for that kind of value, and the rationale. A non-default basis
  stays visible at rest. The visual vocabulary must differ from the assessment marks (solid or dashed
  outline in the alert colour, meaning "unanswered"); a typographic mark (italic for `assumed`, a small
  glyph for `measured`) avoids the clash.
- **When a value is typed over**, its basis expiring stays the rule, but visibly: the marker resets
  and says so.
- **The computed law** is shown read-only next to the field, in the field's unit ("≈ 12-30°, elevation
  overestimated"), with the lead it comes from and its status, in the inline-credit style of the data
  sources. Where the model answers `uninformative`, it says so instead of a range.
- **Per witness**: a conditions group (delay, version, word, exposure, viewing conditions) and the
  Moon gauge control.

No "±" input anywhere.

### Reader and player

- A **variant picker** alongside the interpretations: the account as given, then one entry per
  candidate, ordered by verdict and cost.
- In a variant, every value that moved is shown **struck through with the variant's value beside
  it**, as contradictions are, with the bias that moved it. The account is always one click away.
- A **chip per candidate** under the render, with its verdict, leading to the variant.
- Optionally, an **envelope**: the phenomenon drawn as a cloud sampled from the witness parameters'
  laws, to show what the account allows without naming a candidate. A rendering, not a list.

### Assessors

- A candidate assessor producing the verdicts above.
- `CoverageAssessor` can count `measured` and the Moon gauge as stronger answers.

### Drafting by AI

`RecordingRules` currently asks for a range in `rationale` when a value is assumed. With `how` and the
witness conditions, the draft records how each value was obtained instead, and the range is computed.

## Caveats

- Several laws rest on studies known here only through summaries (Jimenez, Peiniger, Keul, Sharps;
  see the leads note's reading list). Until read in the original, their laws should be usable for
  variants but not for verdicts.
- The laws are measured on identified stimuli, mostly re-entries and astronomical objects at night.
  Applying them to a close daylight sighting is an extrapolation and should say so.
- A cost is not a probability. Base rates of candidates (Hendry's shares) vary by place and period
  and are priors to set per sample, not constants; the verdict does not combine them.
- Multiple witnesses: independent accounts share no witness parameters, so a candidate must be
  reachable from each with its own; non-independent ones (they talked, they read the press) cannot be
  counted as separate confirmations, and the model should know which they are.

## Order of work

1. `measured` and `how` in the format; the per-field basis marker in the editor.
2. Witness conditions and the Moon gauge in the format and editor.
3. The `ErrorModel` seam with the consolidated laws only; laws shown read-only in the editor.
4. `BodyConfrontation` reads tolerances from the model; contradictions use the laws.
5. The search, variants as interpretations, verdict chips.
6. The envelope rendering, if still wanted.
