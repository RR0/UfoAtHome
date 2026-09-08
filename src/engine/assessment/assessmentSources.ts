import type { DataSource } from "../source/DataSource.js"
import type { Assessment, Assessor } from "./Assessor.js"
import type { Sighting } from "../model/Sighting.js"

/**
 * Every way this project can be asked what to make of a finished recording.
 *
 * One entry today, and the registry exists anyway for the reason DataSource's own doc comment
 * gives, with a second reason of its own: the published schemes disagree by construction. Hynek
 * classifies by what was seen, Vallée by what it did, Poher and Ballester-Guasp score the witness
 * and the enquiry rather than the sighting. A registry says out loud that reading a recording is a
 * choice among those, where a single built-in function would quietly make this project take a side.
 *
 * Each implementation arrives when it is first asked for, never in the bundle: an assessor nobody
 * opens costs a reader nothing. See DataSource.create's own note on the same idea one level up.
 */
export const ASSESSMENT_SOURCES: DataSource<Assessor>[] = [
  {
    id: "coverage",
    name: "Coverage",
    // Its own, because the questions are this format's rather than an institution's — a scheme
    // somebody else published would credit them here instead, and link to them.
    credit: "UFO@home",
    creditUrl: "https://ufoathome.org",
    create: () => ({
      about: "witness",
      assess: async (sighting: Sighting): Promise<Assessment> => {
        const { CoverageAssessor } = await import("./assessors/CoverageAssessor.js")
        return new CoverageAssessor().assess(sighting)
      }
    })
  },
  {
    id: "hynek",
    name: "Hynek",
    // Whose scheme it is. The link goes to this project's own pages on evaluation methods rather
    // than to a publisher, so a reader lands where the terms are explained in their language.
    credit: "J. Allen Hynek",
    creditUrl: "https://rr0.org/science/crypto/ufo/enquete/methode/",
    create: () => ({
      about: "observation",
      assess: async (sighting: Sighting): Promise<Assessment> => {
        const { HynekAssessor } = await import("./assessors/HynekAssessor.js")
        return new HynekAssessor().assess(sighting)
      }
    })
  }
]
