import type { ScenarioSweepMessages } from "./messages/ScenarioSweepMessages.js"
import type { OnlyIf, RobustnessVerdict, SkyAlert } from "../engine/scenario/ScenarioSweep.js"
import type { Scenario } from "../engine/scenario/UncertainConditions.js"

/**
 * The words of the sweep's verdicts, shared by the editor's panel (ScenarioSweepElement) and the command line (scripts/scenario-sweep.ts):
 * no page is needed to say them.
 */
export class ScenarioSweepWords {

  /**
   * @param placeName What a scenario's place is called, by its id: a candidate's name, or the account's own place.
   * @param language The language dates are written in.
   */
  constructor(private readonly m: ScenarioSweepMessages, private readonly placeName: (placeId: string) => string, private readonly language: string) {
  }

  /** "conditional (only if at Groom Lake Road)", "robust exclusion". */
  robustness(verdict: RobustnessVerdict): string {
    switch (verdict.robustness) {
      case "robust-plausible": return this.m.robustPlausible
      case "robust-exclusion": return this.m.robustExclusion
      case "conditional": return this.m.conditional.replace("{where}", this.where(verdict.onlyIf))
    }
  }

  /** How it moved from the verdict as written: "plausible as written, becomes robust". */
  evolution(verdict: RobustnessVerdict): string {
    const from = verdict.asWritten === "plausible" ? this.m.asWrittenPlausible : this.m.asWrittenExcluded
    if (verdict.independent) return `${from}, ${this.m.independent}`
    const to = verdict.asWritten === "plausible"
      ? { "robust-plausible": this.m.becomesRobust, "robust-exclusion": this.m.excludedEverywhere, "conditional": this.m.becomesConditional }[verdict.robustness]
      : { "robust-plausible": this.m.plausibleEverywhere, "robust-exclusion": this.m.becomesRobustExclusion, "conditional": this.m.plausibleOnlyIf }[verdict.robustness]
    return `${from}, ${to}`
  }

  /** The whole verdict, with how many scenarios it holds in. */
  sentence(verdict: RobustnessVerdict): string {
    const held = verdict.independent ? "" : ` (${this.m.holdsIn.replace("{holds}", String(verdict.holds)).replace("{played}", String(verdict.played))})`
    return `${this.robustness(verdict)}${this.m.colon}${this.evolution(verdict)}${held}`
  }

  /** Where a conditional verdict holds. */
  where(onlyIf: OnlyIf | undefined): string {
    if (onlyIf?.places) return onlyIf.places.map(id => id === "own" ? this.m.atOwnPlace : this.m.atPlaces.replace("{places}", this.placeName(id))).join(this.m.or)
    if (onlyIf?.dates) return onlyIf.dates.map(date => this.m.onDates.replace("{dates}", this.date(date))).join(this.m.or)
    return (onlyIf?.scenarios ?? []).map(id => this.m.inScenarios.replace("{scenarios}", this.scenarioId(id))).join(this.m.or)
  }

  /** The alerts grouped: one per candidate and verdict, with the accounts it is said of, the compatible first. */
  static grouped(alerts: readonly SkyAlert[]): (SkyAlert & { accounts: string[] })[] {
    const groups = new Map<string, SkyAlert & { accounts: string[] }>()
    for (const alert of alerts) {
      const key = `${alert.candidate}|${alert.robustness}|${JSON.stringify(alert.onlyIf ?? {})}`
      const group = groups.get(key) ?? { ...alert, accounts: [] }
      if (alert.eventId) group.accounts.push(alert.eventId)
      groups.set(key, group)
    }
    const rank = { "robust-plausible": 0, "conditional": 1, "robust-exclusion": 2 }
    return [...groups.values()].sort((a, b) => rank[a.robustness] - rank[b.robustness])
  }

  /** An alert of the sky: "Venus incompatible in every scenario". */
  alert(alert: SkyAlert): string {
    const template = alert.robustness === "robust-exclusion" ? this.m.alertExcluded : alert.robustness === "robust-plausible" ? this.m.alertPlausible : this.m.alertConditional
    return template.replace("{name}", alert.label).replace("{where}", this.where(alert.onlyIf))
  }

  /** A scenario, as a reader reads it: its place, on its date at its time. */
  scenario(scenario: Scenario): string {
    return `${this.placeName(scenario.placeId)}, ${this.instant(scenario.local)}`
  }

  private scenarioId(id: string): string {
    const [place, local] = id.split("@")
    return `${this.placeName(place)}, ${this.instant(local)}`
  }

  /** A local date, "15 October 2023". */
  date(date: string): string {
    return new Date(`${date}T12:00Z`).toLocaleDateString(this.language, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
  }

  /** A local instant, "15 October 2023, 19:00". */
  instant(local: string): string {
    return new Date(`${local.slice(0, 16)}Z`).toLocaleString(this.language, { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" })
  }
}
