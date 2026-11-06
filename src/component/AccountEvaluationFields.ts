import { type Account, type ObserverActivity, type ObserversRelation, type OccupationKind, STRANGENESS_FACTORS, type StrangenessFactor } from "../engine/model/Account.js"
import { HintElement } from "./HintElement.js"

/** The values each list offers, in their order. */
class BallesterGuaspChoices {
  static readonly OCCUPATIONS: Record<OccupationKind, true> = {
    student: true, worker: true, farmer: true, homemaker: true, merchant: true, business: true, employee: true, artist: true,
    technician: true, police: true, pilot: true, military: true
  }
  static readonly RELATIONS: readonly ObserversRelation[] = ["friends", "family", "professional", "none"]
  static readonly ACTIVITIES: readonly ObserverActivity[] = ["leisure", "travelling", "cultural", "working"]
}

/** What the fields say. */
export interface AccountEvaluationMessages {
  occupationKind: string
  occupationKindHint: string
  occupationKinds: Record<OccupationKind, string>
  graduate: string
  enquiryMinutes: string
  enquiryMinutesHint: string
  relation: string
  relations: Record<ObserversRelation, string>
  activity: string
  activities: Record<ObserverActivity, string>
  strangenessSection: string
  strangenessIntro: string
  factors: Record<StrangenessFactor, string>
  factorHints: Record<StrangenessFactor, string>
  /** The choice of a factor left to the recording (detection, close, beings): what the scene shows. */
  fromRecording: string
  unknown: string
  yes: string
  no: string
  minutes: string
}

/**
 * The facts of an account the evaluation methods read and the reconstruction does not (see Account): what kind of work the observer did,
 * whether they are a graduate, how long the enquiry lasted, what ties the observers, what they were doing, and the strangeness factors the
 * investigators judged. Laid into the observer's sections of the editor, each field with the id its assessment's criterion marks.
 */
export class AccountEvaluationFields {
  /** The factors the recording can say itself, whose unknown is "from the recording" (see BallesterGuaspAssessor.strangeness). */
  private static readonly READ_FROM_RECORDING: StrangenessFactor[] = ["detection", "close", "beings"]

  private readonly occupationKind = AccountEvaluationFields.select("observerOccupationKind")
  private readonly graduate = AccountEvaluationFields.select("observerGraduate")
  private readonly enquiryMinutes = Object.assign(document.createElement("input"), { id: "enquiryMinutes", type: "number", min: "0", step: "1", size: 5 })
  private readonly relation = AccountEvaluationFields.select("observersRelation")
  private readonly activity = AccountEvaluationFields.select("observerActivity")
  private readonly factors = new Map(STRANGENESS_FACTORS.map(factor => [factor, AccountEvaluationFields.select(`strangeness-${factor}`)]))
  private readonly labels = new Map<HTMLElement, () => void>()
  private readonly unit = document.createTextNode(" min")
  private readonly strangenessTitle = document.createElement("span")
  private readonly strangenessIntro = Object.assign(document.createElement("p"), { className: "section-intro" })
  private wording?: AccountEvaluationMessages

  /**
   * @param profile The section the observer's occupation is in.
   * @param testimony The section saying how the account was obtained.
   * @param strangeness An empty section, for the strangeness factors.
   * @param changed Called on each change, to write the account.
   */
  constructor(profile: HTMLElement, testimony: HTMLElement, strangeness: HTMLElement, changed: () => void) {
    HintElement.register()
    profile.append(this.label(this.occupationKind, m => [m.occupationKind, m.occupationKindHint]), this.label(this.graduate, m => [m.graduate]))
    const enquiry = this.label(this.enquiryMinutes, m => [m.enquiryMinutes, m.enquiryMinutesHint])
    enquiry.append(this.unit)
    // After how the account was obtained, which the length is the length of.
    const source = testimony.querySelector("#accountSource")?.closest("label")
    if (source) source.after(enquiry)
    else testimony.append(enquiry)
    testimony.append(this.label(this.relation, m => [m.relation]), this.label(this.activity, m => [m.activity]))
    const title = Object.assign(document.createElement("h3"), { className: "section-title" })
    title.append(this.strangenessTitle)
    strangeness.append(title, this.strangenessIntro, ...[...this.factors].map(([factor, select]) => this.label(select, m => [m.factors[factor], m.factorHints[factor]])))
    // Their choices from the start, named by their values until messages are given: a value can be set before (a recording shown first).
    const yesNo: [string, string][] = [["yes", "yes"], ["no", "no"]]
    const named = (values: readonly string[]): [string, string][] => values.map(value => [value, value])
    AccountEvaluationFields.choices(this.occupationKind, "", named(Object.keys(BallesterGuaspChoices.OCCUPATIONS)))
    AccountEvaluationFields.choices(this.graduate, "", yesNo)
    AccountEvaluationFields.choices(this.relation, "", named(BallesterGuaspChoices.RELATIONS))
    AccountEvaluationFields.choices(this.activity, "", named(BallesterGuaspChoices.ACTIVITIES))
    for (const select of this.factors.values()) AccountEvaluationFields.choices(select, "", yesNo)
    for (const control of [this.occupationKind, this.graduate, this.enquiryMinutes, this.relation, this.activity, ...this.factors.values()]) {
      control.addEventListener("change", changed)
    }
  }

  set messages(m: AccountEvaluationMessages) {
    this.wording = m
    for (const say of this.labels.values()) say()
    this.unit.textContent = ` ${m.minutes}`
    this.strangenessTitle.textContent = m.strangenessSection
    this.strangenessIntro.textContent = m.strangenessIntro
    AccountEvaluationFields.choices(this.occupationKind, m.unknown, Object.entries(m.occupationKinds))
    AccountEvaluationFields.choices(this.graduate, m.unknown, [["yes", m.yes], ["no", m.no]])
    AccountEvaluationFields.choices(this.relation, m.unknown, Object.entries(m.relations))
    AccountEvaluationFields.choices(this.activity, m.unknown, Object.entries(m.activities))
    for (const [factor, select] of this.factors) {
      AccountEvaluationFields.choices(select, AccountEvaluationFields.READ_FROM_RECORDING.includes(factor) ? m.fromRecording : m.unknown, [["yes", m.yes], ["no", m.no]])
    }
  }

  /** Shows what `account` says. */
  show(account: Account | undefined): void {
    this.occupationKind.value = account?.observerOccupationKind ?? ""
    this.graduate.value = AccountEvaluationFields.yesNo(account?.observerGraduate)
    this.enquiryMinutes.value = account?.enquiryMinutes?.toString() ?? ""
    this.relation.value = account?.observersRelation ?? ""
    this.activity.value = account?.activity ?? ""
    for (const [factor, select] of this.factors) select.value = AccountEvaluationFields.yesNo(account?.strangeness?.[factor])
  }

  /** What the fields say, as the fields of an account (each undefined when blank). */
  values(): Pick<Account, "observerOccupationKind" | "observerGraduate" | "enquiryMinutes" | "observersRelation" | "activity" | "strangeness"> {
    const minutes = this.enquiryMinutes.value.trim() === "" ? undefined : Number(this.enquiryMinutes.value)
    const strangeness: Partial<Record<StrangenessFactor, boolean>> = {}
    for (const [factor, select] of this.factors) {
      const judged = AccountEvaluationFields.boolean(select.value)
      if (judged !== undefined) strangeness[factor] = judged
    }
    return {
      observerOccupationKind: (this.occupationKind.value || undefined) as OccupationKind | undefined,
      observerGraduate: AccountEvaluationFields.boolean(this.graduate.value),
      enquiryMinutes: minutes !== undefined && Number.isFinite(minutes) && minutes >= 0 ? minutes : undefined,
      observersRelation: (this.relation.value || undefined) as ObserversRelation | undefined,
      activity: (this.activity.value || undefined) as ObserverActivity | undefined,
      strangeness: Object.keys(strangeness).length > 0 ? strangeness : undefined
    }
  }

  /** A label holding `control`, named (and hinted) by `say` once messages are given. */
  private label(control: HTMLElement, say: (m: AccountEvaluationMessages) => [string, string?]): HTMLLabelElement {
    const label = document.createElement("label")
    const name = document.createElement("span")
    label.append(name, " ", control)
    this.labels.set(name, () => {
      if (!this.wording) return
      const [text, hint] = say(this.wording)
      HintElement.say(name, text, hint)
    })
    return label
  }

  private static select(id: string): HTMLSelectElement {
    return Object.assign(document.createElement("select"), { id })
  }

  /** Puts `choices` in `select` after its blank one, keeping what it says. */
  private static choices(select: HTMLSelectElement, blank: string, choices: [string, string][]): void {
    const value = select.value
    select.replaceChildren(new Option(blank, ""), ...choices.map(([choice, text]) => new Option(text, choice)))
    select.value = value
  }

  private static yesNo(value: boolean | undefined): string {
    return value === undefined ? "" : value ? "yes" : "no"
  }

  private static boolean(value: string): boolean | undefined {
    return value === "" ? undefined : value === "yes"
  }
}
