/**
 * A lightweight, plain reference to a real-world person (the witness), structurally aligned with
 * @rr0/data's PeopleJson (id/title/lastName/firstNames) but dependency-free — same reason and same
 * pattern as SightingTime/SightingLocation in Sighting.ts: importing the real People class would
 * drag its Node-only glob/fs-based export barrel into the browser bundle (see
 * engine/interop/rr0Data.ts for converting to/from the real class).
 *
 * A reference first, a record second: `id` names the person, and the other fields describe them in
 * value when nobody has given them an id yet. Where an id points to is the business of whoever
 * reads it — on RR0 it is the person's directory ("ZamoraLonnie" is people/z/ZamoraLonnie) — and
 * not of the recording, which is why there is no second field spelling out an RR0 directory.
 *
 * Every field is independently optional. No field takes precedence over another; this type doesn't
 * enforce "exactly one of" anything.
 */
export interface People {
  /** Who this is, as a reference: on RR0, their directory's name, last name then first names
   * ("ZamoraLonnie"), whether or not a page exists there yet. */
  id?: string
  title?: string
  lastName?: string
  firstNames?: string[]
}
