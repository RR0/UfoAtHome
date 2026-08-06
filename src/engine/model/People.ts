/**
 * A lightweight, plain reference to a real-world person (the witness), structurally aligned with
 * @rr0/data's PeopleJson (id/dirName/title/lastName/firstNames) but dependency-free — same reason
 * and same pattern as SightingTime/SightingLocation in Sighting.ts: importing the real People
 * class would drag its Node-only glob/fs-based export barrel into the browser bundle (see
 * engine/interop/rr0Data.ts for converting to/from the real class).
 *
 * Every field is independently optional — the caller supplies whichever they already know (e.g.
 * just a dirName if the person already has an rr0.org page, or lastName+firstNames for someone
 * not yet documented there). No field takes precedence over another; this type doesn't enforce
 * "exactly one of" anything.
 */
export interface People {
  id?: string
  dirName?: string
  title?: string
  lastName?: string
  firstNames?: string[]
}
