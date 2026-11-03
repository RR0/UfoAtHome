/**
 * A reference to a real-world person (the observer): RR0's own PeopleJson (see @rr0/data), as rr0.org's data writes one.
 *
 * A reference first, a record second: `id` names the person, and the other fields describe them in value when nobody has given them an id
 * yet. Where an id points to is the business of whoever reads it (on RR0 it is the person's directory: "ZamoraLonnie" is
 * people/z/ZamoraLonnie). What a recording uses of it: `id`, `title` (one per language when it is a designation, "Witness 2" / "Témoin 2",
 * see SaidText), `lastName`, `firstNames`. The fields RR0 keeps for its older files (deprecated) are neither read nor written here.
 */
import type { PeopleJson } from "@rr0/data"

export type People = PeopleJson
