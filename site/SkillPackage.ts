import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { strToU8, zipSync } from "fflate"
import { RecordingRules } from "../src/engine/narrative/RecordingRules.js"

/**
 * The "recording a sighting" skill, as a folder an AI assistant can load: its instructions
 * (SKILL.md), the schema and an example to work against, and a validator that needs nothing but
 * Python.
 *
 * Published because it is how recordings actually get made: the documents of a case handed to a
 * model, which writes the file. A model pointed at the format page alone gets most of it right; what
 * it gets wrong is what the page cannot say — how to go from a report to angles, what to mark as
 * assumed, what to check before handing the file over. That is the method below, and it is the
 * part an assistant does not bring with it.
 *
 * Its format rules are not written here: they are RecordingRules' "file" set, the same statement
 * the editor's drafting button reads its own from, so the two cannot drift apart.
 */
export class SkillPackage {

  static readonly NAME = "ufoathome-recording"

  constructor(private readonly root: string, private readonly version: string) {
  }

  /** The files of the skill's folder, by path inside it. */
  async files(): Promise<Record<string, string>> {
    return {
      "SKILL.md": this.skill(),
      "references/sighting.schema.json": await readFile(join(this.root, "src", "generated", "sighting.schema.json"), "utf8"),
      "references/example-minimal.json": await readFile(join(this.root, "public", "demo-data", "example-minimal.json"), "utf8"),
      "scripts/validate.py": await readFile(join(this.root, "site", "skill", "validate.py"), "utf8")
    }
  }

  /** The folder as a zip whose single top-level directory is the skill, which is what an assistant
   * that installs skills from a file expects. */
  async zip(): Promise<Uint8Array> {
    const files = await this.files()
    return zipSync(Object.fromEntries(Object.entries(files)
      .map(([path, text]) => [`${SkillPackage.NAME}/${path}`, strToU8(text)])))
  }

  private skill(): string {
    return `---
name: ${SkillPackage.NAME}
description: Build a UFO@home recording (the sighting JSON file replayed at ufoathome.org) from the documents of a UFO/UAP sighting case, such as reports, questionnaires, statements, sketches, maps and photos of the place. Use when asked to reconstruct, simulate, replay or model what an observer saw for UFO@home, or to write or fix a sighting.json / observer-*.json file.
---

# Recording a sighting for UFO@home

A UFO@home recording is one JSON file stating what one observer saw: when, where, which way they
looked, and the phenomenon as directions and apparent sizes over time. The player computes the rest
(the real sky of that moment, the ground, the weather, the optics of the eye or the camera) from
it. Your job is to state the account precisely and honestly, not to illustrate it.

Written for UFO@home ${this.version}. Format reference: https://ufoathome.org/docs/format/ ,
schema: \`references/sighting.schema.json\` (also https://ufoathome.org/sighting.schema.json ),
smallest valid example: \`references/example-minimal.json\`.

## The one rule that matters

Every value is one of three things, and you say which:

- **stated**: the observer said it (a bare value means this);
- **derived**: worked out from what they said plus something checkable (a map, a measured
  drawing, a road's width, a clock correction). Write it as
  \`{"value": ..., "basis": "derived", "rationale": "the working, with the numbers"}\`;
- **assumed**: chosen so the reconstruction has a value at all, on nothing the observer said.
  Write it as \`{"value": ..., "basis": "assumed", "rationale": "what it was chosen for"}\`.

A wrong value marked "assumed" is a question for the author. A guess passed off as stated is a
fabricated account, the one thing this format exists to prevent. When in doubt, mark it weaker. Do
not wrap plumbing (\`version\`, \`id\`, \`sourceId\`).

## Method

1. **Read every document, and cite as you go** (document and page). Note each contradiction between
   them (times, distances, directions, durations) instead of silently picking one; pick one for the
   file, and say which and why.
2. **Place and time.** Coordinates of where the observer stood, from the case's own map or survey
   first (a KMZ, a plan), a geocoder last. The local time their clock showed, corrected if the
   investigator measured the clock. The time zone and the legal offset on that date.
3. **The phenomenon, in angles.** The best source is a drawing the observer made or approved on a
   photograph of the place: find the photo's scale (a stated field of view, or two landmarks of
   known bearing) and measure, with code, the shape's centre, width, height and tilt at each stage.
   Otherwise convert the account's comparisons. One keyframe per moment the account distinguishes.
4. **The observer.** Where they stood and which way they looked, at each moment (a head turned
   towards the phenomenon is a pose change), walking or driving if they were.
5. **What surrounds them**, only as far as the account uses it: the objects the phenomenon stood
   before or went behind, the vehicle they were in, the other people present. The weather they
   described, and the record it can be checked against (the ERA5 reanalysis, for instance
   https://archive-api.open-meteo.com/v1/archive with hourly cloud cover, precipitation and wind,
   named in \`weatherSource\`; the last five days are not in ERA5 yet, and https://historical-forecast-api.open-meteo.com/v1/forecast answers for them). Sound, if they said anything about it.
6. **Say what it was, and who said it.** What the observer themselves concluded (a craft standing on
   its legs, a being of a certain height) goes in \`interpretation\`, as bodies in metres tested
   against the angles. Someone else's reading, an investigator's or yours, is not part of the account:
   it is another recording of the case, listed in its \`case.json\` as an event of type
   \`sighting\` marked \`interpretationOf\`, which names the account's event by its \`id\` in the case
   (give that event an \`id\`, \`"trent"\`: it is local to the case, not the recording's own). A natural cause the account suggests is stated there too
   (\`interpretation.launches\` for a rocket's exhaust in the twilight, \`reentries\` for a satellite
   or stage breaking up), never drawn into the shapes. Do not write what the player works out from
   the date and the place: the sky, the planets, the Moon, eclipses, satellites, the relief
   (https://ufoathome.org/docs/sources/ lists them).
7. **One recording per observer.** When several people saw it, write a recording for each and a case
   file that names them (https://ufoathome.org/docs/format/#several-observers-the-case). People,
   vehicles, trees and buildings come from the catalogue
   https://ufoathome.org/models/index.json , by \`model.id\`: never invent a model, and never leave a
   person to the built-in shape. A model publishes its own settings (a costume colour, a hull
   colour, retracted landing gear) under \`modelParameters\`: state one only when the account does.
8. **Say what the file is about.** \`summary\` (a sentence or two, in the account's language) and
   \`image\` (the observer's own drawing or a photograph of the place, when the documents hold
   one) are what a shared link shows; the case file takes the same two. Without them the link shows
   the logo and who saw it.
9. **Write the file**, then **validate it**: \`python3 scripts/validate.py recording.json\` must say
   \`valid\`, and so must \`case.json\` (it checks that every \`interpretationOf\` names an event of the
   case, and that no \`id\` is borne twice). It catches misspelt keys and words a closed list does not have; it cannot catch a
   wrong direction.
10. **Hand over** the file with a short report: the values you derived and how, the list of assumed
   values, the contradictions, and the questions to put back to the observer or the investigator.
   Tell the user to play it at https://ufoathome.org/play/ ("From your computer", choosing the
   photos it names along with it) and to check that the phenomenon sits where the drawings put it;
   then to correct it with you, or in the editor at https://ufoathome.org/edit/ for fine placement.
   Only the observer can say it looks like what they saw.

## Format rules

${RecordingRules.text("file")}

## Things that have gone wrong before

- Setting \`aim\` to the direction the observer faced rather than to the phenomenon's own direction
  puts every keyframe at the centre of the view.
- Moving \`bounds\` does nothing: \`aim\` and \`angular\` decide where the shape is and how big.
- An elevation above sea level in \`elevationM\` lifts the observer into the air: it is above the
  ground.
- Metres in the shapes (a "60 m object" as a size) are a conclusion, not an observation: they belong
  in \`interpretation\`.
- \`description\` filled with your analysis instead of the account: keep the account there, and your
  working in the rationales and the report.

## Privacy

An account is personal data. Use initials or the case's own anonymisation unless the observer is
already public or agreed to be named, and never put details that identify a private person in
\`observer\`, \`description\` or \`account\` beyond what the published case file itself shows.
`
  }
}
