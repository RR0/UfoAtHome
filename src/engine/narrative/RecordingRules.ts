/**
 * Who a set of rules is written for.
 *
 * - "draft": the editor's own drafting button (ClaudeNarrativeProvider), which reads one account and
 *   answers with claims the editor applies. The editor derives the UTC offset from the time zone,
 *   keeps the account in `description`, and paints the shapes itself.
 * - "file": an assistant writing a whole recording that will be played as it is, with no editor
 *   between it and the player — the "Recording a sighting" skill published on the site.
 */
export type RulesAudience = "draft" | "file"

/** One convention, with what it says to each audience that needs it. */
interface Rule {
  draft?: string
  file?: string
}

/**
 * What a language model has to know about the recording format that the schema cannot tell it.
 *
 * Stated once for both of the places that brief a model: the drafting button in the editor, and the
 * skill a reader can install in their own assistant. They share most of it (angles, directions,
 * durations, decor, silence) and differ where what reads their output differs, so each rule says
 * what it says to whom. Two rules written twice drift apart; the first time these were, the
 * button's copy was found telling models that `elevationM` was above sea level (it is above the
 * ground, and a draft following it put the observer a hundred metres up) and to write an
 * `account.observerCount` the format does not have.
 */
export class RecordingRules {

  /**
   * The tags whose name is known in other languages — the ones worth reusing. Kept equal to the keys
   * of TagNames_fr by a test, not imported from it: this runs in the engine, and the translations
   * belong to the components.
   */
  static readonly KNOWN_TAGS = [
    "landing", "trace", "aerial observation", "project sign", "paralysis", "contact", "occupants",
    "close encounter", "photograph", "radar", "electromagnetic effect"
  ]

  private static readonly RULES: ReadonlyArray<Rule> = [
    {
      draft: `Sizes are ANGULAR, in degrees, and never metric — the format stores no physical size, because an
   observer perceives an angle and a size only follows from a distance nobody measured. Convert the
   comparisons an account gives: the full Moon and the Sun are both about 0.5 degrees across, a
   thumbnail at arm's length about 1.5, a fist about 10. Where the account gives no comparison, work
   from what a scene implies and say so: something "barring the road" spans a carriageway, so a
   5-6 m road seen from 20-100 m gives 3 to 15 degrees; take a value in that range and put the
   range in the rationale. That is "derived", not "stated".`,
      file: `Sizes are ANGULAR, in degrees (\`angular\`: {widthDeg, heightDeg}), never metric: the format stores
   no physical size, because an observer perceives an angle and a size only follows from a distance
   nobody measured. Convert the comparisons an account gives (the full Moon and the Sun about 0.5
   degrees across, a thumbnail at arm's length about 1.5, a fist about 10), or measure them: a
   drawing made on a photograph of the place, with a known field of view or a landmark of known
   bearing, gives degrees per pixel. Where nothing gives a size, work from what the scene implies
   and put the range in the rationale.`
    },
    {
      draft: `Directions are \`aim\`: \`azimuthDeg\` clockwise from true north (north 0, east 90, south 180,
   west 270) and \`altitudeDeg\` above the horizon (horizon 0, zenith 90). Derive them where the
   geography allows — an observer driving towards a named village is looking along that bearing, and a
   phenomenon "barring the road" is on it. Where nothing bears on the altitude, assume something low
   and plausible rather than leaving the phenomenon undrawable, and mark it "assumed".`,
      file: `A shape is PLACED by \`aim\`, the direction of its centre in the observer's sky: \`azimuthDeg\`
   clockwise from true north and \`altitudeDeg\` above the horizon. Not the way the observer faced,
   which is the pose's heading and pitch. \`bounds\` (pixels) is recomputed on load from \`aim\` and
   \`angular\`; leave it out. \`angle\` tilts the shape, in radians, positive clockwise on screen.
   Derive directions from the geography where it allows (a map, the bearing of a road, a landmark
   the observer named); where nothing bears on the altitude, assume something low and plausible and
   mark it "assumed".`
    },
    {
      draft: `Times are the local legal time at the place. State the IANA \`timeZone\` the observer's own clock
   was on ("Europe/Paris", "America/Denver") and NEVER \`utcOffsetHours\`: the editor works the
   offset out from that zone's own historical rules at that date, out of the platform's IANA
   database (see TimeZones.offsetHoursAt), and it is right about summer time as it was then rather
   than as it is now. Anything you computed there would be overwritten, and wrong more often.
   Choosing the zone is the part that needs reading the account, because a zone's BOUNDARIES have
   moved: Montgomery, Alabama is "America/Chicago", which observed summer time in 1948 while Alabama
   did not, so the zone that matches the observer is not always the one their coordinates fall in.`,
      file: `Times are the local legal time at the place, as the observer's clock read it. Give the IANA
   \`timeZone\` their clock was on ("Europe/Paris") AND \`utcOffsetHours\`, the legal offset on that
   date, summer time included (+2 for France in June 2012, +1 in 1965): the player places the sky
   from the number alone, and without it approximates the offset from the longitude, which knows
   nothing of legal time. A time corrected by the investigator (a clock found fast) is "derived".`
    },
    {
      draft: `Duration: \`durationSeconds\` is the one length the reconstruction is played at, a bare number. When the
   account gives a vague length ("a few minutes", "five to ten"), write what was said in \`durationText\`,
   an ISO 8601 duration with the doubt EDTF has (\`"PT3M~"\`, about three minutes) or a range
   (\`"PT5M/PT10M"\`), AND the length to play at in \`durationSeconds\` (the duration, or the middle of the
   range), marked "assumed". Or give \`endTime\`, whose \`raw\` takes the approximation suffix:
   {"raw": "1974-05-20T19:02~", "year": 1974, "month": 5, "day": 20, "hour": 19, "minute": 2}.`,
      file: `Duration: \`durationSeconds\` is the one length the reconstruction is played at, a bare number. For a
   vague length ("a few minutes"), state it in \`durationText\` (an ISO 8601 duration with a doubt, \`"PT3M~"\`, or a
   range, \`"PT5M/PT10M"\`) and put the length chosen to play at in \`durationSeconds\`, with its provenance. Use
   \`durationSeconds\` alone for a length that was timed or bounded.`
    },
    {
      draft: `Give a keyframe only for a moment the account actually distinguishes — where it arrived, where it
   went, when it changed. Two to four is a normal first draft, and one is right for a phenomenon
   that never moved. Interpolation between them is the player's job.`,
      file: `\`timeline.keyframes\` is [{t, shapes: [{sourceId, shape}]}], t in milliseconds from the start of
   the recording. Give a keyframe only for a moment the account distinguishes (where it arrived,
   when it changed, where it went); the player interpolates between them. A keyframe need only
   restate what changes: every field a shape leaves out is held from the keyframe before. To make a
   shape vanish, keyframe it at \`transparency: 1\`. \`milestones\` ([{t, label, note}]) name the
   moments the account itself names ("A", "B"), shown on the seek bar.`
    },
    {
      draft: `For each shape give only \`kind\` ("oval" or "polygon"), \`title\` (what the observer called it,
   in their language), \`angular\` and \`aim\`. Never a pixel box, a transparency or a halo: those
   are how a drawing is painted, they are derived from the angle and the direction on loading, and
   values for them would be numbers no one observed and no one could check.`,
      file: `A shape is \`kind\` "oval" or "polygon" (a polygon's \`points\` are pixels from the top-left of its
   box, spanning the box: they are stretched with it), \`title\` (what the observer called it),
   \`angular\` and \`aim\`. Add \`color\`, \`haloScale\` (a glow around it), \`brightness\` (0 a light
   you can look at, 1 one you cannot) and \`blur\` (0 hard edges, 1 none) only when the account
   describes them; left out, they assert nothing.`
    },
    {
      draft: `NEVER write \`description\`. It is the account you were just given: it is what the observer said,
   it does not change because somebody read it, and anything you would put there instead belongs in
   the numbers the reading produced. Leave the field out of your answer entirely.`,
      file: `\`description\` is the account itself, in prose: what the observer said, in their words where the
   documents quote them, one string or one per language ({"fr": ..., "en": ...}). Not your
   analysis: measurements, contradictions and reasoning belong in the values, their rationales,
   and your report.`
    },
    {
      draft: `\`tags\` are stored in English whatever the account's language, because two recordings that share
   a tag have to match on it. Reuse the vocabulary already in use where it fits — {tags} — and pass
   classification codes and case references through unchanged ("RR3", "NL", "Blue Book 8729"),
   which read the same in every language.`,
      file: `\`tags\` are stored in English whatever the account's language, because two recordings that share
   a tag have to match on it. Reuse the vocabulary already in use where it fits ({tags}); pass
   classification codes and case references through unchanged ("RR3", "NL", "GEIPAN D1").
   \`paralysis\` changes the replay (the view is held still): use it only when the account says the
   observer could not move.`
    },
    {
      draft: `\`decor\` is the scenery around the observer, and \`eastM\`/\`northM\` are metres from where they
   stand. Something the observer is INSIDE — their own car, their kitchen — goes at 0,0 and carries
   \`observerSide\` ("front-left" for a European driver's seat), which is what puts the viewpoint
   within it. Anything they are NOT inside must be placed away from 0,0, or it is drawn on the lens.
   Give \`sizeM\` in metres ({widthM, lengthM, heightM}: about 1.7 x 4.2 x 1.4 for a 1970s family
   car) or leave it out for the primitive's own size. Add decor only for what the account names: an
   unmentioned streetlight is scenery nobody reported.`,
      file: `\`decor\` is the scenery the account names, and \`eastM\`/\`northM\` are metres from where the
   observer stood at the start. Something the observer is INSIDE (their car) goes at 0,0 and carries
   \`observerSide\` ("front-left" for a European driver's seat); anything else must be away from
   0,0, or it is drawn on the lens. Give \`sizeM\` ({widthM, lengthM, heightM}) where known. The
   relief and the roads of the map are drawn for you: add decor for what the account uses (the wood the phenomenon stood before, the car, the other people present, as kind
   "observer"). When the account says the phenomenon went behind something, that object's
   \`occludesSourceIds\` names the shape. Roads the map lacks go in \`roads\`.`
    },
    {
      draft: `\`observerTrack\` is where the observer stood and which way they faced, over time. One pose is
   normally enough. \`headingDeg\` is the direction they were LOOKING, same convention as \`aim\`,
   and it is what makes a shape's azimuth mean anything — an observer driving towards a named village
   faces that bearing. \`elevationM\` is metres above the local ground (0 for someone standing on it;
   the eye's own height is added), \`pitchDeg\` 0 for someone looking level, \`fovDeg\` about 60 for
   the naked eye.`,
      file: `\`observerTrack\` ({keyframes: [{t, pose}]}) is where the observer stood and which way they looked,
   over time: \`lat\`, \`lng\`, \`elevationM\` (metres above the local ground, 0 for someone standing
   on it: the eye's own height is added), \`headingDeg\` and \`pitchDeg\` (the direction they LOOKED,
   same conventions as \`aim\`), \`fovDeg\` (the vertical field shown, about 60 for the naked eye).
   A walk is a series of poses; a head turned towards the phenomenon is two poses a fraction of a
   second apart. \`instrument\` is "eye" unless a camera was used.`
    },
    {
      draft: `\`account\` is about the OBSERVERS and how their account travelled, not about the phenomenon.
   An account naming who was there says it in \`observerOccupation\` ("boulanger"), in their own
   words and never as a level, and each other person present is a \`decor\` object of kind
   "observer". But \`source\` and \`followedUp\` say how the report was OBTAINED, which no account
   of a sighting can tell you: leave them out rather than guessing, unless the text itself says an
   investigator came, or that it is a press cutting.`,
      file: `\`account\` is about the observer and how the account travelled: \`observerAgeYears\` (at the
   time), \`observerOccupation\` (in their words), \`source\` (how it reached whoever wrote the
   recording: on-site, interview, telephone, questionnaire, letter, social-media, press) and \`followedUp\`
   (whether they were gone back to). Where the account can be read goes in \`sources\`, in the
   shape of an RR0 source: [{type ("book" | "article", none for a web page or a post), title,
   authors, url, publication: {publisher, time}, index}]. Always give the documents you worked from. Each other person present is a \`decor\` object of kind
   "observer".`
    },
    {
      draft: `Silence is a statement. An observer who says the thing was silent is not an observer who said nothing
   about sound: write a \`soundTrack\` whose keyframe holds a sound of kind "none", and mark it
   "stated". An account that simply never mentions sound gets no soundTrack at all.`,
      file: `Absent is not zero. An observer who says the thing was silent gets a \`soundTrack\` whose keyframe
   holds a sound of kind "none"; an account that never mentions sound gets no soundTrack. The same
   holds for the weather: \`weatherTrack\` states what the observer saw of the sky (cover, rain,
   wind); when it comes from a record (ERA5, a METAR, a station), \`weatherSource\` names it.`
    },
    {
      draft: `\`lightPollution\` is how bright the night sky of the place is, towns and all: the zenith of a
   moonless night in magnitudes per square arcsecond (22 a natural sky, about 19 a suburb, 17 a city
   centre). Write it only from a figure: a Sky Quality Meter reading the observer gives ("stated"),
   or the World Atlas's "SQM" value for the place (Falchi et al. 2016), marked "derived" with the
   atlas named in the rationale. An observer who says the town's glow hid the stars has not given a
   figure: leave the field out, and say in your report that it should be looked up.`,
      file: `\`lightPollution\` (a number) is how bright the night sky of the place is, towns and all: the
   zenith of a moonless night in magnitudes per square arcsecond, as a Sky Quality Meter reads it or
   as the World Atlas of artificial sky brightness gives it ("SQM", Falchi et al. 2016). 22 is a
   natural sky, and absent means one. "derived" when looked up in the atlas (name it in the
   rationale), "stated" when the observer measured it. It brightens the sky, hides the Milky Way
   and takes stars away; never write a brighter sky than the source gives.`
    },
    {
      file: `The observer's own estimate in metres ("60 m long, 175 m away, 10 m up") is not an observation
   but a conclusion: it goes in \`interpretation\` (bodies in metres, see the format page), never in
   the shapes. When it contradicts the angles the observer measured, keep it anyway and say so in
   your report: the player's comparison is what shows the contradiction.`
    }
  ]

  /** The numbered rules for `audience`, ready to be sent or printed. */
  static text(audience: RulesAudience): string {
    return RecordingRules.RULES
      .map(rule => rule[audience])
      .filter((text): text is string => text !== undefined)
      .map((text, index) => `${index + 1}. ${text.replace("{tags}", RecordingRules.KNOWN_TAGS.join(", "))}`)
      .join("\n")
  }
}
