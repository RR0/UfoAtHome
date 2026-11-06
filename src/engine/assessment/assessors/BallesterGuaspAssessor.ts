import type { Assessment, AssessmentCriterion, Assessor } from "../Assessor.js"
import type { Sighting } from "../../model/Sighting.js"
import type { Basis } from "../../persistence/Provenance.js"
import { type Account, type ObserverActivity, type ObserversRelation, type OccupationKind, STRANGENESS_FACTORS, type StrangenessFactor } from "../../model/Account.js"
import { SaidTexts } from "../../model/SaidText.js"
import { ShapeDistance } from "../../shape/ShapeDistance.js"
import { CoverageAssessor } from "./CoverageAssessor.js"

/** One of the figures the assessment is made of, before it is a criterion: its value, and where it was read. */
interface Reading {
  value: number
  /** Undefined when nothing in the recording answers it: the method then counts 0. */
  basis?: Basis
  paths: string[]
}

/**
 * Scores an account the way V.-J. Ballester-Olmos and M. Guasp do (Los OVNIs y la Ciencia, 1981; used by MUFON since 1992), as
 * rr0.org/science/crypto/ufo/enquete/methode/Ballester-Guasp.html gives it: Δ = Q × Σ × Π, each between 0 and 1.
 *
 * - Q, the information quality: how the account was obtained, and how much of it.
 * - Σ, the strangeness: how many of seven factors remain unexplained, over 7.
 * - Π, the reliability: six weighted ratings of the observers and their circumstances.
 *
 * The method's own rule for what is not known is kept: it counts 0, so a recording that says little scores little, which is the method
 * telling an investigator what is missing (see each criterion's basis). Only a recording that does not say how its account was obtained
 * gets no score at all, rather than a 0 taken for a verdict. What this project reads its own way, and says so:
 *
 * - The number of witnesses is the account's (Sighting.observerCount), not the case's: a case gathers one recording per account.
 *   For the same reason the observers of one recording are together; independent observers are the accounts of a case.
 * - The age is the observer's at the time of the sighting, which is what the format keeps; the method wants it at the time of the report.
 * - A page of a letter is PAGE_WORDS words of the account's text, and an "extended" questionnaire or letter is one of a page or more:
 *   the method does not say how to measure either.
 * - An account posted online is read as a letter, which it is: written unprompted by the observer.
 * - A length of enquiry left unsaid is read as the shorter band, the weaker of the two.
 */
export class BallesterGuaspAssessor implements Assessor {

  /** Most of what it reads is about the observer and how the account was obtained: see Assessor.about. */
  readonly about = "observer"

  /** Words of a page, to tell a letter of a page or more from a shorter one. */
  static readonly PAGE_WORDS = 250

  /** Words of a newspaper article the method rates higher. */
  static readonly ARTICLE_WORDS = 500

  /** Hynek's own line between a close encounter and a distant sighting, which the method follows: about 500 feet. */
  static readonly CLOSE_M = 150

  /** The reliability ratings, with their weights. */
  static readonly WEIGHTS = { witnesses: 0.25, occupation: 0.2, relation: 0.15, geography: 0.15, activity: 0.15, age: 0.1 } as const

  static readonly OCCUPATIONS: Record<OccupationKind, number> = {
    student: 0.3,
    worker: 0.5, farmer: 0.5, homemaker: 0.5,
    merchant: 0.7, business: 0.7, employee: 0.7, artist: 0.7,
    technician: 0.9, police: 0.9, pilot: 0.9,
    military: 1
  }

  static readonly RELATIONS: Record<ObserversRelation, number> = { friends: 0.3, family: 0.6, professional: 0.8, none: 1 }

  static readonly ACTIVITIES: Record<ObserverActivity, number> = { leisure: 0.3, travelling: 0.6, cultural: 0.8, working: 1 }

  static readonly FACTORS = STRANGENESS_FACTORS

  /** Weakest first, as CoverageAssessor: a figure is worth no more than the least of what holds it up. */
  private static readonly WEAKEST_FIRST: Basis[] = ["assumed", "derived", "stated", "measured"]

  async assess(sighting: Sighting): Promise<Assessment> {
    const account = sighting.account ?? {}
    const information = this.information(sighting, account)
    const strangeness = this.strangeness(sighting, account)
    const reliability = this.reliability(sighting, account)
    const q = information.value
    const sigma = strangeness.filter(reading => reading.value > 0).length / BallesterGuaspAssessor.FACTORS.length
    const weights = BallesterGuaspAssessor.WEIGHTS
    const pi = (Object.keys(weights) as (keyof typeof weights)[]).reduce((sum, key) => sum + weights[key] * reliability[key].value, 0)
    const criteria: AssessmentCriterion[] = [
      this.criterion("bg-information", information),
      ...BallesterGuaspAssessor.FACTORS.map((factor, index) => this.criterion(`bg-${factor}`, strangeness[index])),
      ...(Object.keys(weights) as (keyof typeof weights)[]).map(key => this.criterion(`bg-${key}`, reliability[key]))
    ]
    // No score until the account says how it was obtained: the method would rate it 0, which a reader takes for a verdict on the
    // sighting where it is only the file saying nothing yet. The criteria still say what is missing.
    return { score: account.source === undefined ? undefined : q * sigma * pi, factors: { q, sigma, pi }, criteria }
  }

  private criterion(id: string, reading: Reading): AssessmentCriterion {
    return { id, value: reading.value, basis: reading.basis, paths: reading.basis === undefined ? [] : reading.paths }
  }

  /** Q: how the account reached the investigator, and how much of it there is. */
  private information(sighting: Sighting, account: Account): Reading {
    const source = account.source
    if (source === undefined) return { value: 0, paths: [] }
    const sourceBasis = this.basis(sighting, "account.source")
    const minutes = account.enquiryMinutes
    // The length of the enquiry, against the band's threshold; unknown reads as the shorter band, the weaker one.
    const timed = (thresholdMin: number, long: number, short: number): Reading => minutes === undefined
      ? { value: short, basis: this.weakest(sourceBasis, "assumed"), paths: ["account.source"] }
      : {
        value: minutes >= thresholdMin ? long : short,
        basis: this.weakest(sourceBasis, this.basis(sighting, "account.enquiryMinutes")),
        paths: ["account.source", "account.enquiryMinutes"]
      }
    const words = this.words(sighting)
    // How much was written, counted off the account's own text.
    const written = (thresholdWords: number, long: number, short: number): Reading => ({
      value: words >= thresholdWords ? long : short,
      basis: this.weakest(sourceBasis, "derived"),
      paths: ["account.source", "event.description"]
    })
    switch (source) {
      case "on-site":
        return timed(120, 1, 0.9)
      case "interview":
        return timed(60, 0.9, 0.8)
      case "telephone":
        return timed(30, 0.7, 0.6)
      case "questionnaire":
        return account.followedUp ? written(BallesterGuaspAssessor.PAGE_WORDS, 0.7, 0.6) : { value: 0.6, basis: sourceBasis, paths: ["account.source"] }
      case "letter":
      case "social-media":
        return account.followedUp ? written(BallesterGuaspAssessor.PAGE_WORDS, 0.6, 0.5) : written(BallesterGuaspAssessor.PAGE_WORDS, 0.4, 0.3)
      case "press":
        return written(BallesterGuaspAssessor.ARTICLE_WORDS, 0.2, 0.1)
    }
  }

  /** How many words the account's text has, in whichever language it was written first. */
  private words(sighting: Sighting): number {
    const text = SaidTexts.any.read(sighting.event.description) ?? ""
    return text.split(/\s+/).filter(word => word !== "").length
  }

  /** Σ's seven factors, in FACTORS order: what the investigators judged, else what the recording itself shows of the three it can. */
  private strangeness(sighting: Sighting, account: Account): Reading[] {
    const judged = account.strangeness ?? {}
    const readings = BallesterGuaspAssessor.FACTORS.map((factor): Reading => {
      const stated = judged[factor]
      if (stated !== undefined) {
        const path = `account.strangeness.${factor}`
        return { value: stated ? 1 : 0, basis: this.basis(sighting, path), paths: [path] }
      }
      switch (factor) {
        case "detection": {
          // Through a calibrated instrument: anything but an eye, or binoculars, which the method does not name.
          const category = sighting.instrument.category
          return { value: category === "eye" || category === "binoculars" ? 0 : 1, basis: "derived", paths: ["instrumentId"] }
        }
        case "close": {
          const distances = sighting.timeline.sourceIds
            .map(sourceId => ShapeDistance.of(sighting, sourceId)?.nearestM)
            .filter((m): m is number => m !== undefined)
          if (distances.length === 0) return { value: 0, paths: [] }
          return { value: Math.min(...distances) <= BallesterGuaspAssessor.CLOSE_M ? 1 : 0, basis: "derived", paths: ["timeline", "observerTrack"] }
        }
        case "beings": {
          // The beings the scene places, which the account states; none placed is the scene saying there were none.
          const beings = sighting.decor.map((object, index) => ({ object, index })).filter(({ object }) => object.kind === "entity")
          return beings.length > 0
            ? { value: 1, basis: "stated", paths: beings.map(({ index }) => `decor.${index}`) }
            : { value: 0, basis: "derived", paths: ["decor"] }
        }
        default:
          return { value: 0, paths: [] }
      }
    })
    // Beings count only with an object anomalous by its appearance, its movement or an incongruity.
    const beings = BallesterGuaspAssessor.FACTORS.indexOf("beings")
    const anomalous = (["appearance", "movement", "incongruity"] as StrangenessFactor[])
      .some(factor => readings[BallesterGuaspAssessor.FACTORS.indexOf(factor)].value > 0)
    if (!anomalous && readings[beings].value > 0) readings[beings] = { ...readings[beings], value: 0 }
    return readings
  }

  /** Π's six ratings. */
  private reliability(sighting: Sighting, account: Account): Record<keyof typeof BallesterGuaspAssessor.WEIGHTS, Reading> {
    const count = sighting.observerCount
    const alone = count === 1
    const witnesses = count === 1 ? 0.3 : count === 2 ? 0.5 : count <= 5 ? 0.7 : count <= 10 ? 0.9 : 1
    const occupation = account.observerGraduate
      ? { value: 1, basis: this.basis(sighting, "account.observerGraduate"), paths: ["account.observerGraduate"] }
      : account.observerOccupationKind === undefined
        ? { value: 0, paths: [] }
        : {
          value: BallesterGuaspAssessor.OCCUPATIONS[account.observerOccupationKind],
          basis: this.basis(sighting, "account.observerOccupationKind"),
          paths: ["account.observerOccupationKind"]
        }
    // The method rates a lone witness as one of a family, and as together.
    const relation: Reading = alone
      ? { value: 0.6, basis: "derived", paths: ["decor"] }
      : account.observersRelation === undefined
        ? { value: 0, paths: [] }
        : {
          value: BallesterGuaspAssessor.RELATIONS[account.observersRelation],
          basis: this.basis(sighting, "account.observersRelation"),
          paths: ["account.observersRelation"]
        }
    const activity: Reading = account.activity !== undefined
      ? { value: BallesterGuaspAssessor.ACTIVITIES[account.activity], basis: this.basis(sighting, "account.activity"), paths: ["account.activity"] }
      // In a vehicle the recording names: travelling, unless they were going to or from work, which only the account can say.
      : sighting.vehicle !== undefined
        ? { value: BallesterGuaspAssessor.ACTIVITIES.travelling, basis: "derived", paths: ["vehicle"] }
        : { value: 0, paths: [] }
    const ageYears = account.observerAgeYears
    const age: Reading = ageYears === undefined
      ? { value: 0, paths: [] }
      : {
        value: ageYears < 10 || ageYears > 75 ? 0.2 : ageYears < 18 ? 0.4 : ageYears < 35 ? 0.6 : ageYears < 65 ? 1 : 0.8,
        basis: this.basis(sighting, "account.observerAgeYears"),
        paths: ["account.observerAgeYears"]
      }
    return {
      witnesses: { value: witnesses, basis: "derived", paths: ["decor"] },
      occupation,
      relation,
      // The observers of one recording are together; observers apart give accounts of their own, which their case gathers.
      geography: { value: 0.5, basis: "derived", paths: ["decor"] },
      activity,
      age
    }
  }

  /** What the value at `path` stands on: stated when nothing is said of it. */
  private basis(sighting: Sighting, path: string): Basis {
    return CoverageAssessor.basisAt(path, sighting) ?? "stated"
  }

  private weakest(...bases: Basis[]): Basis {
    return BallesterGuaspAssessor.WEAKEST_FIRST.find(basis => bases.includes(basis))!
  }
}
