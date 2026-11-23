# Witness error model and variants under a hypothesis

Technical note ([version française](witness-error-model_fr.md)). It describes how a recording carries what is known about the errors in each value a
witness gives, and how that knowledge is used: not to blur the recording, but to ask whether a
candidate explanation is reachable from it, and how robust a reading of it is.

It was first written on 2026-10-22 as a design note, before any code; most of it has been built
since. [Where things stand](#where-things-stand) says what is built and where, and
[Not done yet](#not-done-yet) what is not. The sections in between keep the reasoning, which is
still what the code follows.

The error laws themselves are in [testimony-evaluation-leads.md](testimony-evaluation-leads.md)
(user-facing summary: [ufoathome.org/roadmap/witness](https://ufoathome.org/roadmap/witness/)). This
note is about the format, the editor, the reader and the searches that put them to work.

## Where things stand

As of November 2026 (UFO@home 0.178):

- **Bases.** Any field may be written as `{ value, basis, how, rationale }`
  (`src/engine/persistence/Provenance.ts`). `basis` is one of `established`, `measured`, `stated`
  (the default), `derived`, `assumed` or `fitted` (see the table below); `how` says how a value was
  obtained, from a closed list per kind of value. The wrapper is stripped on read and restored on
  write, so no consumer sees it.
- **Conditions of an account** (`Account.conditions`, `src/engine/model/Account.ts`): delay,
  version, word used, exposure, independence, dark adaptation, corrected vision, glare and the Moon
  gauge.
- **The error model** (`src/engine/witness/WitnessError.ts`): the law of a value's error from its
  kind, value, basis, `how` and the witness's conditions, each law with its status and sources, and
  the witness parameters that tie one witness's errors together. Two readings of the literature:
  `consolidated` and `keul` (sizes shown on the spot), picked in the editor.
- **The editor** (`src/component/WitnessErrorView.ts`): a basis mark on the start time, the
  duration, the heading and the apparent width, opening a window to say how the value was obtained;
  a value typed over goes back to `stated` and says so. Under each, its law, read-only, in its unit,
  with its status. The Witness section holds the conditions, the Moon gauge and the error parameters,
  and warns when the laws are stretched to daylight.
- **Contradictions against the laws** (`BodyConfrontation.lawsOf`,
  `src/engine/interpretation/BodyConfrontation.ts`): in the editor's scene, an interpretation is
  contradicted where it is outside the laws, not merely beside the account.
- **The candidate search** (`src/engine/witness/CandidateSearch.ts`, `src/component/CandidatesView.ts`):
  per candidate (the Moon and the planets bright enough for that sky, the re-entries and fireballs on
  record, and the account's own interpretations and readings), the witness parameters that bring the
  account closest to it, the values they move, the cost and the verdict. Structural variants are
  declared by candidates. A variant can be seen over the scene, and kept in the recording's
  `variants` as an interpretation carrying its parameters, cost, verdict and error model.
- **The sensitivity of a reading** (`src/engine/interpretation/ReadingSensitivity.ts`,
  `<rr0-reading-sensitivity>`): see [Sensitivity of a reading](#sensitivity-of-a-reading).

Before this work, `stated` conflated what a witness estimated with what was read off an instrument,
margins existed only for time (as EDTF qualifiers), and the tolerances were hard-coded where they
were used (`BodyConfrontation.DIRECTION_TOLERANCE_DEG = 1`, `SIZE_TOLERANCE = 1.5`), the same for
every witness, every value and every condition. The fixed tolerances remain as the case of "no error
model" (see below).

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

`basis` gained `measured`, ranked above `stated`. Two more were added in November 2026 at the GEIPAN's
request (A. Cousyn), both about one danger, a reconstruction made to fit and then read as a
validation: `established` above all others, and `fitted` below all others.

| Basis         | Meaning                                                                                  | Rank (strongest first) |
|---------------|------------------------------------------------------------------------------------------|------------------------|
| `established` | Settled away from both the account and the reconstruction: a register, a survey, a permit, a published orbit | 1 |
| `measured`    | Read off an instrument or gauge, by the witness or an investigator                       | 2                      |
| `stated`      | Estimated or recalled by the witness (default)                                           | 3                      |
| `derived`     | Worked out from stated or measured values plus something checkable                      | 4                      |
| `assumed`     | Chosen so the reconstruction can run                                                    | 5                      |
| `fitted`      | Turned to see whether a hypothesis can be made to fit                                   | 6                      |

A reading is judged against `established` values and never against `fitted` ones: agreement with a
value that was turned to agree is the fitting, not a finding (`ReadingCheck`, `ReadingVerdict`).

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
`disagreements` are computed against the law for each value (`BodyConfrontation.lawsOf`) instead of
1° and ×1.5. The editor's scene and the sensitivity use the laws; the reader's scene still uses the
fixed tolerances.

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

## Sensitivity of a reading

The candidate search moves the **account** within its laws to reach a candidate. The sensitivity
asks the reverse question of a **reading** (an interpretation of the account, in a case): how far can
what the reading itself chose be moved before it reproduces less of the account? A likeness that
survives only within a degree of a supposed heading was made; one that survives thirty degrees of it
was found. It answers the GEIPAN's request to "measure the sensitivity of the results to reasonable
variations of the uncertain parameters", so that an attractive reconstruction is not taken for a
validation.

### Margins, not sampled variations

Sampling "reasonable variations" would need a range for each value nobody stated, and choosing it
would be one more free parameter. A margin needs no such choice and lets whoever reads it judge. So
for each free body of a reading (its fields marked free by `Provenance.free`), five knobs are pushed
each way until the reading reproduces less of the account than as written:

- direction across the line of sight (up to 45°);
- height above the horizon (up to 30°);
- distance along the line of sight (up to ×/÷10);
- size (up to ×/÷10);
- time (up to 10 s).

An end that reaches the limit is the limit of the search, not of the reading: it still holds there.
What the reading reproduces is the share of comparisons (instant × phenomenon) it does not
contradict, since no real reading reproduces every instant. A turn found to reproduce **more** than
the reading as written is reported too: that reading was not at its best.

### The witness's error is in the tolerance, not in the knobs

What the witness stated is never turned. How far their estimate may be off is already in what
counts as a contradiction, through the laws of this note (`BodyConfrontation.lawsOf`, given as the
tolerance). A margin is called **sufficient** when it covers half the uncertainty of the value each
way (`ReadingSensitivity.SUFFICIENT`): a reading that keeps agreeing when what it supposed is moved
by half of what the witness could be off by. Below that, the reading rests on **fine tuning**.

### Only what was said is compared

A timeline is drawn to be played, so it holds far more than was said: a direction every half second
where the witness gave three, a size nobody gave. Comparing a reading to those would compare two
reconstructions with each other. Only a direction or a size the recording traces to the witness (a
basis that is not free, saying what it rests on, or a cited passage of an interview) is compared.

### Where it shows

`<rr0-reading-sensitivity>` shows the margins on each reading's card in the case editor and under the
image in the reader (`rr0-sighting`, so `rr0-case`). The case report (HTML, JSON, CSV) includes it.
`scripts/reading-sensitivity.ts <case.json>` prints it from the command line, judged as above; with
`ALL=1`, against everything the timelines draw, with the fixed tolerances.

### Limits

- The relief is not known to this computation: the ground is flat at the observer's feet.
- Each knob is turned alone; margins of two knobs turned together are not computed.
- A reading whose bodies do not say what they explain (no `explains`) has nothing to be confronted
  with, so it has no margins.

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

1. `measured` and `how` in the format; the per-field basis marker in the editor. **Done** (12e3f4e0).
2. Witness conditions and the Moon gauge in the format and editor. **Done** (12e3f4e0).
3. The `ErrorModel` seam; laws shown read-only in the editor. **Done** (12e3f4e0), with two models.
4. `BodyConfrontation` reads tolerances from the model; contradictions use the laws. **Done** in the
   editor (abfefc1b).
5. The search, variants as interpretations, verdict chips. **Done** (abfefc1b, e0c4b471).
6. `established` and `fitted`, and the sensitivity of a reading. **Done** (November 2026).

## Not done yet

- **Date shift and mirror in the search.** Done (2026-11-23) for a day either way and a heading mirrored east
  for west, each a law's tail (see `CandidateSearch.DATE_SHIFT_SIGMA`, `MIRROR_SIGMA`); a wrong month or year,
  and summer time, are not searched.
- **Basis marks on every field.** The editor shows them on the start time, the duration, the heading
  and the apparent width only.
- **The reader's scene** still confronts interpretations with the fixed tolerances, not the laws
  (its sensitivity margins do use them).
- **Drafting by AI**: `RecordingRules` still asks for a range in `rationale` when a value is assumed,
  rather than how each value was obtained.
- **The envelope rendering**, if still wanted.
- **`ErrorModel` as a data source** with its credit: the two models are a fixed list
  (`WitnessError.MODELS`).
- **Sensitivity**: relief, and knobs turned together (see its limits).
