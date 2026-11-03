/**
 * A lightweight, plain reference to a real-world person (the observer), structurally aligned with
 * @rr0/data's PeopleJson (id/title/lastName/firstNames) but declared here: the recording format's
 * schema is generated from this project's own types (scripts/build-sighting-schema.ts), and PeopleJson
 * would bring its every field into it, deprecated ones included; and the title is a SaidText (one per
 * language), not PeopleJson's single string. See engine/interop/rr0Data.ts for converting to/from the
 * real class.
 *
 * A reference first, a record second: `id` names the person, and the other fields describe them in
 * value when nobody has given them an id yet. Where an id points to is the business of whoever
 * reads it — on RR0 it is the person's directory ("ZamoraLonnie" is people/z/ZamoraLonnie) — and
 * not of the recording, which is why there is no second field spelling out an RR0 directory.
 *
 * Every field is independently optional. No field takes precedence over another; this type doesn't
 * enforce "exactly one of" anything.
 */
import type { SaidText } from "./SaidText.js"

export interface People {
  /** Who this is, as a reference: last name then first names, run together ("ZamoraLonnie"),
   * whether or not a page exists for them yet. */
  id?: string
  /** What the observer is called when no name is given or wanted — "Witness 2" in one language, "Témoin 2" in another — or their name as they
   * gave it. In each of the account's languages when it is a designation (see SaidText); a plain string is the same in all of them. */
  title?: SaidText
  lastName?: string
  firstNames?: string[]
}
