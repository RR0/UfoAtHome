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
- **Low-elevation lights are placed at the horizon** (Maugé II.8, Jimenez's GEPAN experiments): a light below
  about 5° elevation is reported at the distance of the horizon or the nearest obstacle in that direction, even the
  full Moon. When a reported distance roughly equals the terrain distance along the bearing (computable from the
  DEM), treat it as uninformative and still test far candidates.
- **The naming word predicts error** (Maugé II.8, 1,225 re-entry testimonies): on the scale light < phenomenon <
  shape < object < machine < flying object < UFO, a stronger word goes with more precise and more wrong size,
  distance, altitude, speed and "artificial details", while direction, time, colour, brightness and angular size
  stay reliable. Classify the word and discount metric claims as it strengthens. Surprise raises identification
  and error; an experimenter or a classmate saying "UFO" raised UFO labels from 18 % to 68 %.
- **Size from a remembered object** (Keul I.5, Salzburg experiment, N=60): sizes shown by hand or said right away
  were within +2 to +17 %, but a size recalled through a familiar object (a football) was ~30 % too large.
  Duration of a stressful event is overestimated: re-enact it on site with a stopwatch ("say now / stop") and use
  the gap as a per-witness correction.
- **Confidence after feedback** (Kelley-Romano & Douglass IV.2): with no feedback both groups recalled ~6/10
  certainty; after confirming feedback, contact claimants recalled 8.69 against 7.78 and claimed faster, more
  "immediate" recognition. Keep the certainty stated before any feedback, log every feedback (investigator, media,
  support group, checklists) with its date, and treat certainty that grew after it as contamination (Albright II.1).
- **Hypnosis and age** (French II.5): 13 of 27 highly hypnotizable subjects accepted an implanted memory; over 70 %
  of children accepted an implanted abduction memory without hypnosis; about two thirds "remembered" events before
  age 2 under hypnosis. Record whether each detail first appeared under hypnosis or guided imagery, and compare the
  event date with the witness's birth date. Record the interviewer and their beliefs: accounts cluster by hypnotist.

## Dream and sleep states

- **Raduga's checklist** (IV.5): a required gate (lying, sitting or reclining; waking, falling asleep, napping or
  meditating, day or night) then eight markers detectable in `description`: paralysis or "vibrations",
  levitation or passing through walls, out-of-body experience, events contradicting reality (absent or dead
  relatives, impossible objects), jumps between unconnected places, fluctuating vividness or "hyperreality",
  teleportation back to the starting place, a forgotten ending. The weights are untested: learn them, don't
  assert them. Base rates: 114 of 152 practitioners (75 %) produced an alien or UFO encounter on purpose; sleep
  paralysis with fear clustered in the most realistic accounts.
- **Mavrakis' symptom table** (III.9): night, bed or long night drive with paralysis, sense of presence, buzzing,
  a bright light rushing in, floating or missing time map to sleep paralysis (40-50 % lifetime prevalence with
  hypnagogic hallucinations), the Isakower phenomenon or automatic behaviour; hypnotics (zolpidem, zopiclone)
  favour them. Check claimed transport against distance and the day's timetables (Bahía Blanca: 575 km).

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
- date errors: when a low red or orange "ball" does not match the Moon or a planet on the stated date, recompute
  for ±1 day, month and year and rank the dates where the body fits in azimuth, elevation and phase (van Utrecht
  I.15: the Polish ambulance case was 1979-09-05, not 1980, and the "ball" vanished at the computed moonset,
  04:13, behind a crest 870 m away). Compare a reported disappearance time with rise and set times against the
  terrain horizon;
- elevation overestimate, asymmetric (van Utrecht I.15, 196 identified astronomical cases): for estimates of
  15-25°, 9 % of the true objects were below 4° and 38 % at 4-8°; for 25-40°, 42 % were at 10° or lower. Widen
  the tolerance downward, not symmetrically; "at treetop level" beats a number given afterwards;
- observer on a route: from the road geometry and timestamps, compute the candidate's bearing relative to the
  vehicle's heading; "on the left", "dashed ahead", "stopped over the road" should follow the turns (parallax
  pacing, van Utrecht I.15, Borraz III.1);
- recurring lights: the same "brilliant light" at the same time and direction over several evenings or dawns is
  a planet (Delaval III.5: Jupiter to the SE in the evening, Venus to the east at dawn, Varese 1985); an observer
  within 10-20 km of a runway's extended centreline sees landing aircraft hover then leave fast (Malpensa);
- sky conditions: compare "a dark, starry night" with the computed Moon phase and altitude and the terrain
  horizon (Delaval III.5: 95 % Moon 10° up at Viggiù); daylight claims against the sun's altitude (Carlson I.3:
  Echo Flight began at 08:45, two hours after sunrise, not "at night");
- party balloons (Maillot & Abrassart I.6, the Amarante case): a low, silent, motionless object under light
  wind, a clearing sky, rising temperature and falling pressure (an under-inflated Mylar balloon warming up),
  resting on hidden supports: compare the claimed hovering height with nearby vegetation (hollyhocks ~1.7 m).
  Sizes were overestimated ~1.6× in a small enclosed space; a vocabulary signature ("metallic", "filled",
  "Plexiglas", blue-green, a flat rim seen edge-on) and a colour-chart pick can be scored against the stimulus;
- camcorder artefacts: a point light filmed at full zoom or out of focus shows a disc with a central hole and
  notches (iris and lens structure) (Delaval III.5); check every image's claimed date against its date stamp
  (Maillot & Abrassart: the "gendarmerie, 22 Oct" photo is stamped 29 Oct);
- lightning: for luminous balls in stormy weather, query lightning-location data within ~5 km and ±10 min; strong
  positive cloud-to-ground strokes correlate with ball lightning, negative strokes near power lines or solar panels
  with short-circuit arcs ("dazzling + metal contact + blue-white"); a curved track rules out a signal rocket, and
  something in front of the clouds rules out a meteor (Keul I.5);
- independent sensor channels (visual, radar, infrared, other witnesses), each with its own error rate: count the
  truly independent ones; anything about the Sun, Moon or planets is checkable against their positions, the same
  Sun being visible from half the planet (Albright II.1, Fatima);
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
- **Structured retelling diff** (Carlson I.3): store each dated version as fields (site, date, witness's role,
  informant, count, time of day) and diff them: Salas moved Echo → November → Oscar, 16 → 24 March, 4 → 10
  missiles. Flag a claimed date that migrates onto a date with publicised sightings, a claimed co-event with no
  records when a comparable real one has many, and "X confirmed it" relayed by the claimant rather than obtained
  from X. Documented assignment dates and procedures bound undated anecdotes.
- **Data sufficiency and source independence** (Printy I.13): 423 of 1,305 cases (32 %) of the Weinstein pilot
  catalogue have no date or time: score completeness (date, time, direction, elevation, angular size) and flag a
  case below the minimum instead of counting it. Count independent sources by origin, not by citations (Stockton:
  several sources, one news story). Pilot reports were explained 88 % of the time for one pilot and 76 % for
  several (Hynek, Blue Book); several pilots made the same error on 1990-11-05. Printy's 55 explained pilot cases
  (10 re-entries, 5 missile tests, ~15 fireballs, ~10 Venus/Jupiter/Altair, a moonrise, a subsun, balloons) are a
  labelled test set.
- **Context risk flags** (Introduction, "alien encounter disorder"): single or dominant witness, isolation,
  outdoors or driving, night (~85 %), recalled without hypnosis, UFO press or TV items about the same kind of
  event in the preceding weeks (countable from RR0's time pages), heavy reading of UFO literature, closeness to
  active ufologists. Close-range landings with one witness and no trace sit between misinterpretation and
  confabulation.
- **Records against claims** (Nickell I.9, Posner I.12): check physical and medical claims against
  contemporaneous records (an eye injury "lasting three days" contradicted by a hospital exam the day after;
  radiation symptoms against dose-response thresholds: GI symptoms for days with normal blood counts is not a
  survivable exposure). Log null physical tests (no residual radioactivity, no burnt road). Record which witness
  first reported each feature, and search nearby reports for similar names before merging them (the
  Culverson/Culberson mix-up).
- **Co-witness who "remembered" later** (Nickell I.9, Ruesga I.14): a second witness who was unconscious, or who
  appears only in later versions after publicity, is not independent, especially when dependent on the main
  witness; estimate how many people should have seen the event (a busy highway) and treat silence as evidence.
- **Reading before each version** (Ruesga I.14, Maugé I.7): date the witness's reading and media exposure against
  each new version; features first appearing after a matching publication suggest contamination. Compare
  editions of a witness's own books; a claim contradicting settled science sinks the account.
- **Incentives** (Palmer I.11, Myers I.8): what happened just before (a closed business) and what followed (a
  movement, a book deal, a candidacy); statements of relatives kept apart from corroborating witnesses.
- **More candidates**: searchlights on low cloud (moving blobs converging toward a ground point, near a
  commercial strip, with an overcast sky) and a tethered balloon or kite (looping light trails in long exposures)
  (Myers I.8, Newman); proximity to military air bases and test ranges raises the aircraft candidate at night
  (Gulf Breeze between Pensacola NAS and Eglin AFB); a witness reporting routine sightings is first tested against
  aircraft lights on flight paths and bright planets (Huston I.4, Betty Hill).
- **Sort reports before evaluating them** (Scribner & Wheeler II.11, Noll III.10, Conesa-Sevilla II.2): forensic
  sighting reports, checkable against sky and weather data, apart from contact or abduction narratives; a
  "private" experience (bedroom, alone, near sleep) apart from a "public" one; most abduction reports include no
  sighting at all. Fix the evaluation criteria before a report is made (versioned rules). Hynek's minimum was two
  independent observers.
- **The Moon nobody mentioned** (Krippner II.6): for a stationary, Moon-sized light in a report that does not
  mention the Moon, compute the Moon (Ouro Preto 1991: 62 % lit, 24-43° up to the north-west, hidden by haze,
  against an object reported 45° up) and re-test the witnesses' own eliminations ("several lights, so not a
  planet"; "it twinkled, so not the Moon"). Check movable local festivals (Carnival, Brazil's June lantern and
  balloon festivals, light or searchlight shows: Lansley & Rabeyron II.7); a "very bright rectangle that suddenly
  disappears" is a satellite flare or a satellite entering Earth's shadow. Were witnesses questioned separately,
  and was there UFO talk just before?
- **Media calendar** (Forrest II.4, Watson I.16): compare the date of a recall with broadcasts (The Outer Limits'
  "The Bellero Shield" aired twelve days before Barney Hill's hypnosis session) and films; features appearing after
  a broadcast suggest contamination. Traces tested only by the witness (Betty Hill's compass) weigh less than
  third-party checks; radar echoes elsewhere or at another time count only within set limits.
- **Medical and sleep history** (Forrest II.4, Dodier II.3, Perrotta II.10): a match with the medical-exam script
  (restraint, bright overhead light, probing, figures with only the eyes visible) and a history of surgery under
  anaesthesia; the local time against the witness's usual sleep window; a count of recurrent episodes (a chronic
  pattern weighs less than an acute one); the reporting channel (a GEIPAN report and a counselling request bring
  different profiles).
- **Fiction that came before** (Robé IV.6, Suenaga III.13, Reis V.3): look up the comics, films and TV broadcast
  in the country in the months before a sighting and score shared descriptors against a catalogue of fictional
  beings and craft (the Amarante case came 43 days after the FR3 TV film La soucoupe de solitude; Chabeuil five
  months after a Capucine comic; Close Encounters in Argentina in 1978 for Banchs). Markers: miniature craft with
  tiny visible pilots, paralysing rays or tubes, "sheet metal and bolts" saucers, era-typical technology (windows
  in the late 1940s, diving suits in the 1950s, screens later).
- **Omission, replacement, addition** (Suenaga III.13, Banchs' experiment): where the stimulus is known, score what
  the witness left out, replaced (orange reported red) and added (towers, engine noise); this calibrates drift.
- **Shared vocabulary and hearsay** (White III.14): compare a new account's words with a corpus of published
  abduction narratives (strong overlap suggests a borrowed script); tag each statement first-hand or second-hand.
- **Only one person perceived it** (Berché IV.1): compare each claimed phenomenon (tremor, noise, light) with what
  the other people present report; check that a group led by one person is not a single source.
- **Group expecting a contact** (Cabria V.1): a skywatch or appointment set in advance primes witnesses; an account
  existing only as a narrative agreed later by the group weighs less than first-hour individual records; for the
  Tenerife 1992 "spaceship", test thunderstorms and launches that night.
- **Rumour shape** (Dumerchat V.2, big cats): the fixed sequence (sighting in an unnatural place, "escaped animal",
  a name, tracks, blamed kills, official hunt, media, silence, cover-up belief) and belief falling with distance
  from the first report; identifications made after being shown a reference photo or article are contaminated.
- **Residue as a function of time** (Ares de Blas VII.1): old cases get explained while new ones fill the pool;
  label a case "not yet explained" with the pending checks, track time-to-explanation, and compare the parameter
  distributions of unexplained and explained cases (the 1972 Madrid filters found the same profile). Flag account
  words that look like ufology jargon given by an earlier interviewer rather than the witness's own.
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
