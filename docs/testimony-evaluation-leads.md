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
- **Duration of a short stimulus** (Peiniger IV.4, fire balloon photo shown 10 s to four groups): individual
  estimates from 1.5 to 30 s, group means 7.5-12 s; only a third to a half of descriptions and sketches were
  "good", about 5 % completely wrong. Model one witness's duration as log-normal ×/÷3 and tighten it only by
  averaging independent witnesses; events under ~30 min tend to be overestimated (Ickinger III.7, Tobin 2010).
- **Retelling** (Sharps II.12): the ratio of correct to wrong details falls from 3.5 at the first questioning to
  1.39 at the second and 0.91 at the third; in calm conditions witnesses average 1.88 distorted and 1.25 invented
  details per scene. Confidence rises while accuracy falls.
- **Report delay** (Ickinger III.7): rate a report by the time between sighting and interview (same day, within
  a month, within a year, beyond). Record the interview method: the cognitive interview recovers 25-35 % more
  correct content; leading or multiple-choice questions before a free account contaminate it (store the questions
  with the answers, Callahan I.2).

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
- re-entries from decay catalogues (Space-Track, Aerospace CORDS) within ±2 h and within sight (fireballs at
  60-90 km are visible several hundred km away); rocket stages launched hours or days before vent fuel and make
  "searchlights" (Oberg I.10). Signature: many lights in formation, near-horizontal path, 1-2 min to cross,
  silence, witnesses spread over hundreds of km. Meteors are ~15 km/s and last seconds, debris half as fast and
  longer (Young I.17);
- Earth's shadow height: a plume 100 km up can stay sunlit while the observer is in twilight (Campo Pérez III.3);
  stars seen through the object point to a gaseous or transparent stimulus;
- military flares: lights appearing and going out one by one, low over a range, setting behind the terrain
  profile (Callahan I.2, Phoenix 22:00); split one night's reports by time and direction before matching;
- "follower" objects: a moving witness (car, aircraft) who says the light paced them or stopped when they stopped:
  test Venus, Jupiter, the Moon and bright stars within ~10° of the bearing (Borraz III.1); a planet near the
  horizon, with a mirage warning under an inversion (da Silva III.4); pilots' clock positions converted to
  azimuths with the heading;
- data-error sensitivity: perturb date, time and direction (±1 day, ±1 h, summer time, mirrored or 90° off) and
  see whether a candidate snaps into place (Borraz III.1);
- small near objects (kite, drone, balloon) when a "huge distant craft" keeps its angular size
  (Martins VII.2: a 1.5 m kite 27 m up seen by everyone as a giant triangle hundreds of metres high).

**Striking precedent**: witnesses of the Zond IV re-entry (1968-03-03) described a cigar-shaped craft
with rows of lit windows and flames at the rear, the very description of the Chiles-Whitted sighting
(1948); Hartmann made the comparison in the Condon report (sections 6.2.3 and 6.2.6), and Campo Pérez
recalls both in III.3. A "windows" or "structure" report must not rule out a fireball.

More known-stimulus calibration sets, where each witness's distance, altitude and direction error can be measured:
Hawaii re-entry 2020-10-24, Oregon 2021-03-25, France 1990-11-05, Kiev 1963, Yukon 1996 (Oberg I.10); the Great
Lakes fireball 1965-12-09 (Young I.17: "almost everyone" placed it far too close, and edge-of-range observers saw
it drop "just behind the trees"); the Canary Islands Poseidon launches 1974-1979 (Campo Pérez III.3).

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
- **Primed expectation** (Sharps II.12): being told a place is a "UFO hotspot" was enough to turn dust specks on a
  camera mirror into "spacecraft"; check hotspot status, recent coverage and earlier waves, and test lens and dust
  artefacts for any fixed blob across frames. Young's 7-stage crashed-saucer model (event, local media,
  enthusiasts, extra witnesses, national media, new witnesses as old ones are refuted, stranger theories) is a
  checklist for how a story spreads; 100+ new Kecksburg "witnesses" appeared after a 1990 TV show.
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
