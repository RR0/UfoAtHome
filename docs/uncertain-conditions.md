# Uncertain conditions: simulating over several scenarios

Design note, 2026-11-19. Besides what [What exists](#what-exists) lists, only a first headless
replay is built (`scripts/scenario-replay.ts`, wind only), tried on the
[Western U.S. Event](#first-case-the-western-us-event-2026-11-19).

## The problem

A scene is always played at one place and one instant: the engine cannot draw a sky, a relief or a
wind "somewhere in Nevada, on the 14th or the 15th". When the place or the date is uncertain, a
recording therefore settles on a working choice, marked `assumed` with its rationale. That part is
honest. What is not is everything the engine then derives from that choice, which looks just as
solid as a measurement:

- the weather, read from the ERA5 archive at that point and hour (`OpenMeteoWeatherProvider`), wind
  included;
- the sky: the Sun, the Moon, the planets, the satellites passing over;
- the relief, the horizon it draws, what it hides;
- the decor fetched around the point (buildings, roads, lights), the light pollution, the ambient
  noise.

Each of these is a fact *about the chosen place and date*, not about the event. A reading judged
against them inherits the assumption without saying so.

The case that showed it: in the Western U.S. Event, witness 3's red orbs head south in a straight
line, and the wind archived at the working position that evening blew at 3 m/s from the south-east,
so sky lanterns would have drifted north-west. That says lanterns fit badly *at the place assumed*.
It does not exclude them: the place is not known. Replacing the archived wind with no wind would not
be neutral either: it is one more value nobody stated, and a misleading one wherever the wind did
blow.

The way out is not to pick a better single value but to play the reading over the several
conditions the case leaves open, and to say how its verdict depends on them.

## What exists

- **Bases** (`Provenance.ts`): a value says whether it is stated, derived, assumed, established or
  fitted, with a rationale, and may carry a `range`.
- **Time** is EDTF, which already says an uncertain or approximate date, or an interval.
- **Place** is a `PlaceJson` (`@rr0/place`): a name and one or more points. It cannot say "one of
  these places" or "somewhere in this area": a `range` on `place.locations.0.lat` and `.lng` bounds
  each coordinate on its own, which is a box, not a set of candidates drawn from clues.
- **A reading may move the time and the place** within what is known of them (`ReadingCheck`), and
  is told so when it goes beyond.
- **`ReadingSensitivity`** measures how far each free value of a reading's bodies (direction,
  height, distance, size, instant) can be turned before the reading reproduces less of the account.
  It works on the bodies, not on the conditions, and with flat ground.
- **`BestCaseSearch`** already searches what a mechanism leaves free (the Sun of a lens ghost within
  the days the account allows).
- **A precedent outside UFO@home**: the GEIPAN's pre-characterisation replays a profile over four
  selections of its corpus and reads the stability of the ranking, not one score.

## Proposal

### 1. Candidate conditions, stated rather than sampled

The recording says which conditions are open and what the candidates are, each with the clues that
support it:

- the date: an EDTF interval or uncertain date, as now;
- the place: a list of candidate places, each a `PlaceJson` with its rationale and sources, or an
  area when the clues give nothing finer.

The candidates are those the case puts forward, not a range drawn around a guess. This keeps to the
rule behind `ReadingSensitivity` (2026-11-14): a range chosen for a value nobody stated is one more
free parameter. A finite set of sourced candidates is not.

Recordings that must share a place (witnesses of the same event, a triangulation between them) take
their candidates from the case, so that a scenario moves all of them together.

### 2. Scenarios, and what is established within one

A scenario is one choice for each open condition: one candidate place, one instant within the
interval. Within a scenario, the wind archived at that place and hour, the sky, the relief are
established, *given the scenario*. The basis should say so, rather than read as a plain `established`:
for instance `established` with the scenario it holds for, shown as "at the place assumed" wherever
it is used to judge a reading.

### 3. Multiply only what the verdict depends on

The combinations grow fast (places × instants × the weather of each), and each new place costs the
relief and the decor to fetch. So:

- **By what the reading uses.** A reading that places something carried by the air (a lantern, a
  balloon, flares, gossamer, smoke) depends on the wind; one that names a body of the sky depends on
  the sky, and only coarsely on the place; one that hides something behind a ridge depends on the
  relief at the exact place. Venus as a morning star depends on nothing but the month.
- **By measuring first.** Play the reading at the two most different scenarios. If the verdict does
  not change, stop there. Go further only for the conditions that moved it, as margins do today for
  bodies.
- **With a bound.** A few candidate places and a few instants per night, a few dozen scenarios at
  most; beyond that, a sample, said to be one.

### 4. A verdict of robustness

A reading is then reported as:

- **robust**: it holds, or fails, in every scenario played;
- **conditional**: it holds only in some. The report names them ("lanterns fit only with a wind from
  the north: no candidate place had one on the evening of the 14th").

There are no probabilities over scenarios, as there are none in the GEIPAN's scores: the candidates
are not weighted, they are listed. A conditional verdict turns into a question for the
investigation: "find the place" becomes "find which way the wind blew there".

### 5. How it runs

First headless, as `scripts/reading-sensitivity.ts` does: a script that takes a case, its open
conditions and its readings, plays each reading over its scenarios and writes a table. The reader
and the editor can show it later, next to `rr0-reading-sensitivity`.

## Open questions

- How to write a candidate place in the format: an alternative list on `place`, or a separate
  `conditions` block of the case. Either way the format version moves.
- How the witness's own track follows a change of place: the directions they stated do not move,
  their position does, and the decor with it.
- Whether a reading may pick its own scenario (the best case for it, as `BestCaseSearch` does for a
  mechanism), and how that is shown so that a reading tuned to its scenario is not mistaken for a
  reading that holds everywhere.
- Whether "the weather of that region and season" (a climatology) is a fair stand-in when even the
  candidate places are too vague. It is a distribution, not a value, and would need the same
  robustness reading.

## First case: the Western U.S. Event (2026-11-19)

Played with `scripts/scenario-replay.ts`, which takes a scenarios file (candidate conditions, the
wind each gives, the readings to replay) and judges each reading twice: against what the witness is
on record as having said (`ReadingSensitivity.forAccount`), and against everything the account's
timeline draws, every half second, with flat ground. The inputs are kept beside the case, in
`western/scenarios/` (not under version control): the winds (Open-Meteo historical forecast, 10 m
and 850 to 300 hPa), the script that writes the scenarios, and the horizon and Jupiter computations.

**Scenarios.** For each recording, its working position and one other candidate place, each on its
own date and on the other one:

- evenings: the working position on the Alamo Road or the White Rock Road, or the junction of the
  Alamo and Badger roads with US-93 in the Pahranagat refuge; the 14th or the 15th, the two evenings
  swapped;
- before dawn: Frenchman Flat (NNSS), or the Groom Lake Road; the 16th or the 15th.

Only the wind was replaced: the witness's position and the bodies' geometry are those of the working
position. That is fair for what the air carries; the horizon was computed apart (below).

**Results.**

| Reading | Depends on | Verdict over the scenarios |
|---|---|---|
| Decoy flares (AARO and variants: witnesses 1 to 5) | wind aloft | **Robust.** Separations unchanged within 0.1-0.2° in every scenario: a flare burns 4.5 s, too short for 1-10 m/s to move it. |
| Parachute flares (LUU-2, witnesses 1 and 5) | wind aloft | **Robust.** Median 1.3-1.8°, worst 1.9-3.0°, in every scenario. |
| Gossamer (witnesses 1 and 5, before dawn) | ground wind | **Conditional.** At Frenchman Flat, both mornings give the same wind (2.4-2.5 m/s towards 150-164°): median 24-34°, as written. On the Groom Lake Road the wind is twice as strong (5.1-5.4 m/s towards 205-210°, above what ballooning spiders take off in): median 94-155°. |
| Sky lanterns (witness 3, simulated for the first time) | ground wind | **Robust failure.** In all four scenarios (wind towards 263-302°, 1.4-3.0 m/s), at their best distance, median 37-41°, worst 49-62°. A sweep of hypothetical winds finds them fitting (median 2.5°, worst 6.8°) only with a wind towards 195-210° at about 4 m/s and lanterns about 50 m away, where a 1 m lantern would look ten times the 0.1° the witness gives. No scenario has such a wind. |
| Jupiter (witnesses 2 and 3) | horizon | **Conditional on the time, robust on the height.** Hidden by the eastern ranges until about 19:40 from the Alamo Road (horizon 7.0-7.7°) and 19:35 further south (4.5-5.7°), it clears the lower horizon at Pahranagat (3.0-4.4°) at about 19:23, within witness 2's 19:00-19:30. But it is below 5° then, wherever the witness was, while the orbs are at 35-45°: the exclusion stands on the height, not on the horizon. |
| Black Mountain obstruction lights (witness 2) | horizon | **Conditional.** Seen just over the relief from the working position, 62 km away; hidden by 2.5° from Pahranagat, 148 km away. |

**What it shows.** Of the six readings, the wind or the place leaves three where they were
(the flares, the lanterns' failure, Jupiter's height) and makes three conditional (the gossamer, the
time Jupiter clears the ranges, the Black Mountain lights). The screening of step 3 holds here: the
flares did not need more than the two scenarios to show that the wind does not matter to them.

**Limits.** Two candidate places only, both in Nevada; the first-pass candidates elsewhere (Idaho,
Utah, New Mexico) were not played. The witness's position, road and decor were not moved with the
place: for the gossamer at Groom Lake, the separation in degrees is that of the Frenchman Flat road,
and only the strength of the wind carries over. The lantern reading is a best case written for this
test (laminar air, one lantern per red orb, first seen where the witness first saw each), not a
reading of the case.
