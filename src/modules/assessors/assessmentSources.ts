import { ModuleRegistry } from "../ModuleRegistry.js"
import type { DataSource } from "../../engine/source/DataSource.js"
import type { Assessment, Assessor } from "../../engine/assessment/Assessor.js"
import type { Sighting } from "../../engine/model/Sighting.js"

/**
 * Every way this project can be asked what to make of a finished recording.
 *
 * A few entries, and the registry exists anyway for the reason DataSource's own doc comment
 * gives, with a second reason of its own: the published schemes disagree by construction. Hynek
 * classifies by what was seen, Vallée by what it did, Poher and Ballester-Guasp score the observer
 * and the enquiry rather than the sighting. A registry says out loud that reading a recording is a
 * choice among those, where a single built-in function would quietly make this project take a side.
 *
 * Each implementation arrives when it is first asked for, never in the bundle: an assessor nobody
 * opens costs a reader nothing. See DataSource.create's own note on the same idea one level up.
 */
export const ASSESSMENT_SOURCES: DataSource<Assessor>[] = ModuleRegistry.point("assessment").provide(ModuleRegistry.BUILT_IN, [
  {
    id: "coverage",
    name: "Coverage",
    // Its own, because the questions are this format's rather than an institution's — a scheme
    // somebody else published would credit them here instead, and link to them.
    credit: "UFO@home",
    creditUrl: "https://ufoathome.org",
    create: () => ({
      about: "observer",
      assess: async (sighting: Sighting): Promise<Assessment> => {
        const { CoverageAssessor } = await import("./CoverageAssessor.js")
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
    creditUrl: "https://rr0.org/science/crypto/ufo/observation/classification/hynek/",
    create: () => ({
      about: "temporal",
      assess: async (sighting: Sighting): Promise<Assessment> => {
        const { HynekAssessor } = await import("./HynekAssessor.js")
        return new HynekAssessor().assess(sighting)
      }
    })
  },
  {
    id: "ballester-guasp",
    name: "Ballester-Guasp",
    credit: "V.-J. Ballester-Olmos & M. Guasp",
    creditUrl: "https://rr0.org/science/crypto/ufo/enquete/methode/Ballester-Guasp.html",
    create: () => ({
      about: "observer",
      assess: async (sighting: Sighting): Promise<Assessment> => {
        const { BallesterGuaspAssessor } = await import("./BallesterGuaspAssessor.js")
        return new BallesterGuaspAssessor().assess(sighting)
      }
    })
  },
  {
    id: "poher",
    name: "Poher",
    credit: "Claude Poher",
    creditUrl: "https://rr0.org/science/crypto/ufo/enquete/methode/Poher-Criteres.html",
    create: () => ({
      about: "shape",
      assess: async (sighting: Sighting): Promise<Assessment> => {
        const { PoherAssessor } = await import("./PoherAssessor.js")
        return new PoherAssessor().assess(sighting)
      }
    })
  }
])
