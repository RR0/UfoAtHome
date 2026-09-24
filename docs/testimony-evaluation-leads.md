# Testimony evaluation leads

Ideas for assessing a sighting's testimony and explaining it, collected while importing
*The Reliability of UFO Witness Testimony* (V.J. Ballester-Olmos & R.W. Heiden eds., UPIAR, 2023)
into rr0.org. None is implemented yet. Each lead names the chapter it comes from, so its data and
caveats can be checked there before it becomes an `Assessor` or a candidate check.

Chapters are on rr0.org under
`https://rr0.org/time/2/0/2/3/05/Ballester-Olmos-Heiden_TheReliabilityOfUfoWitnessTestimony_UPIAR/`
(`05/02/` is part III, chapter 2, and so on).

## What a witness gets right and wrong

- **Angles, counts, layout, heading and timing are the reliable part; metres are not.**
  - Bullard (III.2, Zond IV 1968 and Phoenix 1997): witnesses agree on the number of lights (68 %),
    their layout (87 %) and heading (79 %), and 56 % give the time within minutes. They are
    systematically wrong on size, altitude and speed: too low, too big, too slow.
  - Passot (III.11, GEIPAN): any distance to an unknown light beyond about 20 m is random, so size
    and speed derived from it are random too.
  - Rospars (IV.7, 7 atmospheric entries, ~300 witnesses): stated altitude and distance follow
    lognormal laws with medians of 300 m and 650 m (σ(ln) ≈ 1.7) whatever the truth (80-120 km
    altitude, up to 1000 km distance).
  - Consequence: never derive metres from a stated distance; constrain the scene with angles and
    timing, and use metres only when anchored (known-size object, occlusion by terrain or cloud base
    at a known distance, triangulation between witnesses).
- **Stated angular size is 3 to 30 times too large.**
  - Passot: a plane really 0.67° across reported at 19.18°; people cover the rising Moon (0.5°) with
    "5 fingers" or "2 hands".
  - Peiniger (IV.3, 238 people): the Moon at arm's length estimated at 7.05 cm on average against
    0.5 cm; 38 % said more than 8 cm, only ~19 % 1 cm or less; typical answer 1.6-2 cm (3-4×).
    Bright objects are judged larger (irradiation: the Sun was rated larger than the Moon).
  - Lead: ask each witness to show the full Moon the way they showed the object; the ratio is that
    witness's own scale error. Otherwise treat an unanchored size as an upper bound with a wide,
    heavy-tailed error.
- **Error laws for time, date and duration** (Rospars, IV.7):
  - date right for 98 %, otherwise the next day;
  - time within about N(0, 6 min) for 90 % of witnesses, with a wider 10 % tail: match within ±30 min;
  - duration lognormal around the true value, σ(ln) ≈ 1.25: 10 % report at least 5×, 3 % at least 10×;
  - references: meteors median 8 s (3-20 s), satellite re-entries median 35-42 s (at most ~3 min).
- **Heading**: a distant horizontal track is seen moving across the line of sight, so "moved N→S"
  means the witness was looking E or W, within ±45°. Between witnesses, only opposite headings are
  contradictory (2 % in Rospars' sample).
- **Colours and features of entries** (Rospars): main colour 77 % consistent, trail colour 80 %,
  fragmentation 63 %, trail reported by only 49 % although always physically present.

## Checks from date and place

Run these before scoring a testimony (Passot's GEIPAN remote check, Magin III.8, Plaza III.12):

- the Moon: 29 of 138 French cases of 1976 (21 %) studied by Saros were the full Moon, some described
  as a craft landed in the garden;
- bright planets and stars along the reported bearing, and autokinesis for a fixed light;
- fireball databases (AMS, FRIPON) and re-entry catalogues at date ±1 day and time ±30 min;
- missile and sounding-rocket launches, and whether a high-altitude plume would still be sunlit while
  the observer is in twilight (Canaries 1976);
- Chinese lanterns: slow orange lights drifting with the measured wind (ERA5), local events;
- aircraft: nearby airfields, formation flights (lights with a dark body between them = contrast plus
  contour illusion, Bullard), and observer motion (Passot's Silly-le-Long case: a plane flying
  against a moving van looked stationary);
- small near objects (kite, drone, balloon) when a "huge distant craft" keeps its angular size
  (Martins VII.2: a 1.5 m kite 27 m up seen by everyone as a giant triangle hundreds of metres high).

**Striking precedent**: witnesses of the Zond IV re-entry (1968-03-03) described a cigar-shaped craft
with rows of lit windows and flames at the rear, the very description of the Chiles-Whitted sighting
(1948); Hartmann made the comparison in the Condon report (sections 6.2.3 and 6.2.6), and Campo Pérez
recalls both in III.3. A "windows" or "structure" report must not rule out a fireball.

## Scoring the account

- **Version drift**: keep every dated version of an account, compare them field by field, weigh the
  earliest most. Flags: sizes growing across retellings (Magin: 6-8 ft, then 25 ft, then 30 ft),
  details dropped after criticism, dates contradicting the witness's own life.
- **Media timing and independence**: record whether the account came before or after media coverage
  (Bullard: solid-object reports rose from 32 % to 38 % among later accounts), whether witnesses
  talked to each other or saw others' drawings, and only then count N reports as N confirmations.
- **Group agreement**: record witnesses separately and measure feature overlap; a feature reported by
  one witness out of N gets low confidence (Magin; Bullard: no witness saw the "solid craft" and the
  "separate lights" at the same moment, pointing to one source seen two ways).
- **Reduce interpretations to primitives** before matching: "flying triangle" becomes "3 moving
  lights" (Passot).
- **No bonus for occupation**: pilots and "trained observers" are not measurably more reliable
  (Magin: 27 of 764 drone reports by pilots were real near misses; Haines, Martins). Record flying
  experience, stress, visibility, expectation and whether confirmation was sought instead.
- **Stereotype details** (Haines III.6): people who claim a sighting draw fewer stereotype features
  (domes, portholes, rim detail, legs, insignia) than non-witnesses; counting them flags content that
  may come from culture rather than from the sighting.
- **Deception cues** work only on samples (~70 % at best), never on one testimony (Martins).

## Indexes that could become assessors

- **Ballester-Olmos & Guasp subjectivity index** (VI.1):
  S = 1 − (0.2·W_I + 0.05·W_II + 0.1·W_III + 0.1·W_IV), bands at 10/30/50 %. Only criterion I
  (internal and external consistency, version stability) can be computed from a recording; the
  others are investigator checklist fields with an explicit "unknown". The weights are the authors'
  judgement and were never calibrated.
- **Vallee's SVP, P axis** (Leduc VI.2): how much the data must be bent to fit a natural explanation
  (0 none … 4 impossible). Computable: compare reported azimuth, elevation, time, duration and angular
  size with the best candidate and count the parameters out of tolerance.
- **Hynek strangeness / probability** (Leduc): P capped at 3/10 for a single witness, raised by
  independent witnesses; thresholds 3 and 5 give classes A-E. Randles-Warrington levels A-E (on-site
  investigation … second-hand press) record provenance and can feed P.
- **Explained cases as a control group** (Leduc): before calling a feature anomalous, check that its
  distribution differs from the same feature in explained cases. Time of day and weekday are not
  evidence: reports peak at 21:00-23:00 and on days off for every reliability class.
