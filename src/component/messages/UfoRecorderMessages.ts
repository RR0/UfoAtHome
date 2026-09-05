import type { SightingLabels } from "./SightingLabels.js"

/** Contract for `<rr0-ufo-recorder>`'s user-visible label strings — implemented per language
 * under this directory (`UfoRecorderMessages_en.ts`, `UfoRecorderMessages_fr.ts`) and loaded
 * via `loadUfoRecorderMessages`. */
export interface UfoRecorderMessages extends SightingLabels {
  oval: string
  /** The "Polygon" preset button — a plain quad, the starting point for a freeform shape (see
   * Shape.ts's own createCustomPolygon doc comment). */
  polygon: string
  /** Right-click menu item, only enabled for a single polygon selection — see
   * UfoRecorderElement.addVertexAtContextMenu. */
  addVertex: string
  /** Right-click menu item, only enabled when the click landed on a real vertex of a single
   * polygon selection with more than MIN_POLYGON_VERTICES points — see
   * UfoRecorderElement.deleteVertexAtContextMenu. */
  deleteVertex: string
  /** addVertex/deleteVertex's own disabled title when the selection isn't a single polygon shape
   * (an oval, a multi-selection, or nothing selected at all). */
  notAPolygon: string
  /** deleteVertex's own disabled title when the polygon is already down to MIN_POLYGON_VERTICES
   * points — removing one more would stop being a real shape. */
  tooFewVertices: string
  shape: string
  /** A real width to TRY, in meters — one half of the authoring aid that puts an angle on the
   * canvas arithmetically instead of by eye (see UfoRecorderElement.applySizeHypothesis). Not
   * something the recording keeps: the shape ends up with the angle, and these meters are
   * forgotten. */
  objectSize: string
  /** The distance to try it at — the other half. */
  objectDistance: string
  /** Read-back of what Real size / Distance actually produce on screen. {deg} is the apparent
   * width in degrees, {moons} the same width counted in full Moons — the comparison a reader
   * can picture, and the quickest way to catch an object drawn ten times too big. */
  apparentSize: string
  /** utcOffset's placeholder: left empty, the time zone is approximated from the longitude. */
  utcOffsetPlaceholder: string
  objectSizePlaceholder: string
  objectDistancePlaceholder: string
  /** What the scene actually establishes about the object's real width, from the moments it was
   * declared to pass behind or in front of decor whose distance is known (see SizeEstimate) —
   * the only meters a recording can honestly produce. {min}/{max} are in meters. */
  realSizeBetween: string
  /** Same, when only a floor was established: it passed behind something, never in front of
   * anything. */
  realSizeAtLeast: string
  /** Same, when only a ceiling was established. */
  realSizeAtMost: string
  /** Nothing in the scene ever crossed this object's line of sight, so its real size is unknown —
   * said out loud rather than left blank, because "unknown" is the answer for most sightings and
   * a blank reads as a missing feature. */
  realSizeUnknown: string
  /** What a stated blur is worth as a distance, read back through the instrument's own thin-lens
   * geometry — the reverse of the depth of field this scene draws (see DepthOfField). */
  blurBound: string
  /** Why no bound can be read: the eye has no aperture to speak of, and a lens focused at a stated
   * distance blurs on both sides of it, which gives two answers rather than one. */
  blurBoundNoInstrument: string
  blurBoundNotAtInfinity: string
  /** The declared crossings cannot all be true of one rigid object — see
   * SizeEstimate.contradictory. */
  realSizeContradiction: string
  /** Appended to a two-sided size once it can be read back as a distance at the playhead's own
   * instant (see SizeEstimate.distanceRangeAt). {min}/{max} are in meters. */
  realDistanceHere: string
  addShape: string
  deleteShape: string
  /** The external Play/Pause/Loop row's own labels — see UfoRecorderElement's
   * syncPlaybackControls(). Copied verbatim from UfoMessages (UfoElement's own overlay toolbar,
   * hidden here in favor of this external row) for consistent wording. */
  play: string
  pause: string
  noDuration: string
  autoReplay: string
  group: string
  ungroup: string
  bringToFront: string
  sendToBack: string
  contextMenuDelete: string
  /** `{name}` gets replaced with the shape's own display label — its title if one's been given,
   * else its raw sourceId (e.g. "ufo-1") — see deleteShape()/shapeLabel(). */
  confirmDeleteShape: string
  /** `{count}` gets replaced with the number of selected shapes — the multi-select counterpart of
   * confirmDeleteShape, used whenever more than one shape is selected at once. */
  confirmDeleteShapes: string
  /** Explains, via the disabled context-menu items' own title, why front/back/delete are all
   * disabled together — see showContextMenu(). */
  onlyOneShape: string
  /** Bring to front's own disabled title when the selected shape is already frontmost. */
  alreadyAtFront: string
  /** Send to back's own disabled title when the selected shape is already backmost. */
  alreadyAtBack: string
  /** Group's own disabled title when fewer than 2 shapes are selected. */
  needTwoShapesToGroup: string
  /** Ungroup's own disabled title when the selected shape isn't part of a group. */
  notGrouped: string
  /** Disabled title on the Name/Color/Transparency/Halo/source-dropdown/preset fields whenever
   * more than one shape is selected — see updateAppearanceFieldsDisabledState(). */
  multipleShapesSelected: string
  samplingRate: string
  /** The playback counters' own titles. They name what each value is, and — when the observation
   * has a start time, so there are two readings to choose between — what clicking one does. */
  currentPosition: string
  switchToElapsed: string
  switchToClockTime: string
  durationPlaceholder: string
  /** Duration field title/tooltip when start+end are both given but too imprecise/mismatched to
   * derive an exact duration from — see sightingDurationBlockedReason. */
  durationImprecise: string
  /**
   * The button that writes the recording out to a file.
   *
   * "Save" — and its French "Enregistrer" — was the earlier answer, on the reasoning that a label
   * should name what a reader is DOING rather than the format it lands in. It named the wrong verb.
   * There is nowhere for this tool to save TO: no account, no document, nothing it can come back to
   * and reopen. What the button does is hand the reader a file to keep somewhere of their own, and
   * "export" is the word for that. "Enregistrer" was worse still in the editor of a RECORDER, where
   * it is also what one does to a recording.
   */
  export: string
  importFile: string
  importUrl: string
  importUrlPlaceholder: string
  importButton: string
  importError: string
  /** The one failure whose fix is not the reader's: the file is there and the address is right, and
   * what has to change is a header on somebody else's server. See SightingFetch for how a page
   * establishes this much and why the wording hedges. */
  importErrorCors: string
  /** A secure page may not fetch an insecure URL at all — the browser refuses before asking. */
  importErrorMixedContent: string
  /** Nothing answered: the host does not resolve, the machine is offline, something blocked it. */
  importErrorUnreachable: string
  /** The server answered, and said no. `{status}` is the code it gave. */
  importErrorStatus: string
  /** It arrived, and it is not a recording. */
  importErrorMalformed: string
  record: string
  stop: string
  /** Connects a reported result to the picker naming who produced it: "2 places found
   * {according} [Nominatim]". The pickers ARE the credits — see engine/source/DataSource.ts. */
  according: string
  sourceElevation: string
  sourceImagery: string
  placeNamePlaceholder: string
  /** The button (and Enter) that runs the search. */
  searchPlace: string
  /** Label of the candidate list a search fills — a place name is often ambiguous, and only the
   * witness knows which one it was. */
  placeMatch: string
  placeSearching: string
  /** Completed in code with the number of candidates: "3 {placeMatchesFound}". Singular has its
   * own message rather than an "(s)" suffix — French and English disagree on where such a suffix
   * even goes, and "1 lieu(x) trouvé(s)" is nobody's language. */
  placeMatchFound: string
  placeMatchesFound: string
  placeNotFound: string
  /** The search itself couldn't be made (offline, HTTP error) — distinct from placeNotFound, the
   * same distinction the weather status line makes. */
  placeSearchFailed: string
  /** Tooltip on a time zone no country has ever placed on that longitude — "{solar}" is replaced
   * with the offset the meridian itself implies. See UfoRecorderElement.updateUtcOffsetValidity. */
  utcOffsetImplausible: string
  /** The zone picker's first entry: no zone, type the offset yourself. */
  timeZoneManual: string
  /** Tooltip on the Altitude field once the ground's own height is known — it says what the number
   * is measured from, which is the whole point of anchoring it. */
  altitudeAboveSeaLevel: string
  /** Shown beside Altitude: the ground's own height there. "{m}" is replaced with the metres. */
  groundAt: string
  headingPlaceholder: string
  /** Custom-validity message shown when an observation start/end field's text doesn't match
   * EDTF_TIME_PATTERN — see UfoRecorderElement.applyEdtfTimeInput. */
  edtfInvalid: string
  /** Shared placeholder for both the start and end EDTF text fields. */
  edtfPlaceholder: string
  /** `title` tooltip spelling out EDTF syntax by example, shown on the observation-start field. */
  observationTimeHint: string
  /** Same as observationTimeHint but for the observation-end field (its own example time). */
  observationEndTimeHint: string
  /** aria-label on the Oval/Polygon preset button group. */
  presetsGroupLabel: string
  witnessDirName: string
  description: string
  tagsPlaceholder: string
  weather: string
  /**
   * The group holding what was actually seen.
   *
   * "Phenomenon", not "Shape": a shape is one of the things stated in here, beside the colour, the
   * halo, the brilliance, the blur, the apparent size and the sound of it — and the group can hold
   * several shapes at once, a craft and its trailing flame being two. Naming the whole after one of
   * its fields said the group was about drawing, when what it is about is the thing the witness
   * saw. The word inside it stays "shape", because that is what a drawn outline is.
   */
  shapeGroup: string
  /** Summary of the group holding what the sighting sounded like — see SoundTrack.ts. */
  soundGroup: string
  /**
   * The group holding when the observation happened.
   *
   * "Moment" rather than "Date/time", which named two form fields; the group holds a start, an end,
   * a duration and the witness's own time zone, and what all four are for is fixing the instant the
   * sky is computed at.
   */
  temporalGroup: string
  /** The four states EDTF_TIME_PATTERN can express about a whole value, offered beside the native
   * picker so that "around 05:00" needs no text mode. */
  timeQualifierExact: string
  timeQualifierApproximate: string
  timeQualifierUncertain: string
  timeQualifierBoth: string
  /** Title of the switch between the native picker and the EDTF text field — the picker cannot
   * state a bare year, a month, or a time without a date. */
  edtfModeTitle: string
  locationGroup: string
  observationGroup: string
  witnessGroup: string
  /** Label of the checkbox that decides whether the weather fields are looked up from a real
   * record (checked, and then read-only) or stated by the witness (unchecked, and then never
   * overwritten) — see UfoRecorderElement.inferWeather. */
  /** Why the weather fields are unavailable mid-playback: the instant they would be written at is
   * moving, and the next tick would overwrite the field being dragged. */
  weatherWhilePlaying: string
  weatherInferred: string
  /** That checkbox's tooltip, where the reasoning actually fits. */
  weatherInferredTitle: string
  /** Shown while the lookup is in flight. */
  weatherLookingUp: string
  /** The sighting doesn't yet say where or exactly when — nothing to look up yet. */
  weatherNeedsDateAndPlace: string
  /** Asked, and no record covers that place and date (nothing exists before 1940). */
  weatherNoRecord: string
  /** The lookup itself couldn't be made (offline, HTTP error) — deliberately distinct from
   * weatherNoRecord: one is a fact about the sighting, the other isn't. */
  weatherLookupFailed: string
  soundSrcPlaceholder: string
  /** The whole "what else was in that sky" line, into which {parts} drops one clause per candidate
   * — a meteor shower, a comet, both. The prefix lives here and nowhere else, so two candidates on
   * one night read as one statement about the sky rather than as two competing announcements. */
  skyLine: string
  /** Title of the button that unclamps the weather-record and sky lines. */
  skyDetails: string
  skyDetailsHide: string
  /** What else was in that sky, from the date and the place alone — see MeteorShowers.ts.
   * {name} is the shower, {rate} how many an observer would really have seen per hour, {altitude}
   * the radiant's HEIGHT above the horizon and {bearing} the compass point it stands in, WITH its
   * own preposition (see Compass.towards — in French that depends on the point, not the sentence).
   * Both are needed and both must be named: a lone "77 degrees" beside a sky reads as either. */
  skyShowerActive: string
  /** Same, for a shower whose radiant had not risen: it cannot have produced anything, which is
   * worth saying as loudly as the opposite. */
  skyShowerBelowHorizon: string
  /** No shower running at all on that date — but never an empty sky: {sporadic} is the sporadic
   * background, the meteors that belong to no stream and fall on every night of the year. */
  skyNothingActive: string
  /** The date or the place is missing, so nothing can be worked out — distinct from "there was
   * nothing", the same way the weather distinguishes the two. */
  skyUnknown: string
  /** Jumps the playhead to the next meteor of the shower and turns the witness to face it. Stating
   * that a shower was running without offering this is half a feature: a one-second streak
   * somewhere in sixty degrees of sky is not findable by hand. */
  showMeteor: string
  /** A naked-eye comet standing in that sky — see Comets.ts. {name} is the apparition, {magnitude}
   * how bright the light curve makes it that night, {altitude} its HEIGHT above the horizon,
   * {bearing} the compass point with its own preposition, {tail} how many degrees of sky its tail
   * covered from there. */
  skyComet: string
  /** Same, for an apparition with no recorded tail length — half the catalog. Saying nothing about
   * the tail is the point: there is no figure for it, so there is nothing to state. */
  skyCometNoTail: string
  /** A comet that was there and had not risen. The same negative the meteor showers make, and
   * worth as much. */
  skyCometBelowHorizon: string
  /** A comet standing very close to the Sun, which is how several of these reached their recorded
   * peak. {elongation} is how many degrees from it — and the clause stops there rather than
   * concluding, because the conclusion is not the same for every comet: an ordinary one two degrees
   * from the Sun is lost in the glare, and Ikeya-Seki at magnitude -9 was seen there in broad
   * daylight by people who blocked the Sun with a hand. The scene's own visibility rule decides
   * whether it is drawn; this line states the geometry that decision rests on. */
  skyCometInDaylight: string
  /**
   * What ice crystals could have put beside the Sun or the Moon — see IceHalos.ts.
   *
   * Stated whether or not anything is drawn, and that is the point of it. A display that silently
   * fails to appear leaves a reader adjusting sliders and guessing; a line that says "no ice cloud,
   * so no halo" tells them which of the ingredients is missing. {forms} is every form the geometry
   * allowed at that source height — which is most of what the line is for, since which of them a
   * given sky shows is the whole question.
   */
  skyOpticsPossible: string
  /**
   * What the crystals were assumed to be doing, appended to the list of forms.
   *
   * The one weather quantity in this whole project that is STATED rather than looked up, and the
   * line says so rather than letting a reader take it for another reading (see
   * Weather.iceCrystalAlignment). It is also the answer to the question the forms list raises: why
   * a sky with the same cloud in it shows a bare ring one hour and six forms the next.
   */
  skyOpticsAlignment: string
  /** One name per form, each with the angle IceHalos derives for it where it has one. Separate
   * strings rather than one built by code, because a language decides for itself whether a form is
   * "a 22° halo" or "un halo à 22°" and where the number goes. */
  skyOpticsHalo22: string
  skyOpticsHalo46: string
  skyOpticsParhelia: string
  skyOpticsTangentArc: string
  skyOpticsParhelicCircle: string
  skyOpticsCircumzenithal: string
  skyOpticsCircumhorizontal: string
  skyOpticsPillar: string
  /** A device the recording names although its own dates exclude it — offered anyway, and said to
   * be out of period rather than dropped: dropping it would silently re-instrument a testimony.
   * {name} is the device's own name. */
  instrumentOutOfPeriod: string
  /** The two units the focal row switches between. */
  unitMillimetres: string
  unitDegrees: string
  /** No ice cloud at all, so none of it could have happened. The commonest answer. */
  skyOpticsNoIce: string
  /** Ice above, but a lower deck between it and the witness. */
  skyOpticsHidden: string
  /** How the two messages above name whichever light source is making the display — the Sun by day,
   * the Moon by night. Separate strings because French wants "du Soleil" and "de la Lune". */
  skyOpticsSun: string
  skyOpticsMoon: string
  /**
   * What falling water could have put opposite the source — see Rainbows.ts.
   *
   * Said only when rain was reported, unlike the ice line: everybody knows whether it was raining,
   * so the clause exists to answer the question that rain RAISES rather than to list an absent
   * ingredient. {forms} is every bow that could have cleared the witness's own horizon.
   */
  skyBowPossible: string
  /** The same under a Moon, which is the version worth reporting: a moonbow is white to the eye,
   * needs a nearly full Moon, and is seen by people who did not know it could happen. {lit} is how
   * much of the Moon was lit. */
  skyBowMoon: string
  /**
   * The two diffuse glows of a dark sky, and — when there were none — which of the things that hide
   * them was in the way. Silent by day, because nobody needs telling there is no Milky Way at noon.
   */
  skyGlowBand: string
  skyGlowCone: string
  skyGlowZodiacalBand: string
  skyGlowMoon: string
  skyGlowTwilight: string
  skyGlowNothingUp: string
  /** One name per bow, with the radius it stands at and how high its top reached — the height being
   * the number an account can be checked against, since it fixes how low the source was. */
  skyBowPrimary: string
  skyBowSecondary: string
  /** Rain, but the source too high for any bow to clear the horizon: the strongest negative in this
   * family, and the one that rules out a midday report outright. */
  skyBowSourceTooHigh: string
  /** Rain, but an unbroken deck between the source and it — the missing half of the famous
   * condition. */
  skyBowHidden: string
  /** Rain in the dark, with neither Sun nor Moon up to be bent. */
  skyBowNoSource: string
  /** Turns the witness to face the comet. Unlike a meteor it does not need seeking to: it was
   * there for the whole recording, and for weeks either side. */
  showComet: string
  /**
   * Whether anything in orbit could have been seen — see Satellites.ts. Stated only once the Sun
   * has set, since a satellite in a daylit sky is not a candidate for anything.
   *
   * {height} is how far above the witness the Earth's own shadow stood, which is the number the
   * whole verdict rests on and is worth showing rather than hiding behind a yes or no. {count} is
   * how many tracked objects were in orbit THAT MONTH — the wording says "that month" because the
   * catalogue is monthly, and claiming a figure for one particular night would be precision it does
   * not carry (see Satellites.trackedInOrbitAt).
   */
  skySatellitesLit: string
  /** Same, plus the classes of object that existed on that date: {eras}. */
  skySatellitesLitWith: string
  /** The negative, and the strong one: deep in the night the shadow stands thousands of kilometres
   * up and nothing in low orbit is lit, so a light crossing the sky then was not a satellite. The
   * count makes it concrete — of {count} objects up there, none of them lit. */
  skySatellitesShadowed: string
  /** Before Sputnik. The hardest coverage floor in the project, and worth saying plainly for the
   * many reports that predate it. */
  skySatellitesNotYet: string
  /**
   * Daylight, and something up there bright enough to be picked out of it anyway — which is a real
   * class of report rather than a technicality: an Iridium flare reached magnitude -8 and those were
   * genuinely watched in broad daylight.
   *
   * Everything in orbit is sunlit by day (the Earth's shadow is behind the witness, not above), so
   * what the clause states is the CONTRAST: {eras} are the classes that outshone that sky.
   */
  skySatellitesDaylight: string
  /** The same clause when {eras} names exactly one class. It exists because French agrees the verb
   * with the list — "la Station spatiale internationale POUVAIENT" is what a single template
   * produced — and no amount of care in the list formatter fixes a verb outside it. English needs
   * no such split and carries the same sentence twice. */
  skySatellitesDaylightOne: string
  /** Turns the witness to face the selected decor object — the only practical way to find an
   * aircraft in an otherwise empty sky. */
  lookAtDecor: string
  /** The accessible name/tooltip for the "+" button that adds a new decor object of whichever
   * kind decorKindSelect currently shows — placed right before that dropdown ("[+] [Kind ▾]"), a
   * plain "+" glyph rather than this text (see UfoRecorderElement.addDecorBuildingButton), so
   * it's deliberately just "Add", not "Add decor" — the adjacent dropdown already says what's
   * being added. */
  addDecor: string
  deleteDecor: string
  decorSightingUrl: string
  /** Right-click menu item on a witness decor object that has a sightingUrl — loads that
   * recording (see UfoRecorderElement.viewWitnessTestimony). */
  viewTestimony: string
  /** viewTestimony's own disabled title when the right-clicked witness has no sightingUrl set. */
  noWitnessRecording: string
  /** Decor context menu's "Masks ▸" flyout trigger — the arrow itself is appended in code, not
   * part of this translated string (see UfoRecorderElement.applyMessages). Its submenu lists every
   * shape/source as a checkbox (see DecorObject.occludesSourceIds), which needs no translation of
   * its own since each entry is just that shape's own name/sourceId. */
  masks: string
  /** Button in the Witness group that adds a new "other witness" decor object (see
   * UfoRecorderElement's addDecorWitnessButton) — distinct from decorWitness, that dropdown
   * option's own (now-hidden) label. */
  addWitness: string
}
