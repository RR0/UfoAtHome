import type { ObserverProvider, ObserverSettings } from "./ObserverProvider.js"
import type { Perception } from "./Perception.js"
import { Perceptions } from "./Perception.js"

/**
 * An observer who has been drinking, for the one effect the literature puts a number on: lower contrast
 * sensitivity. A controlled crossover study at a blood alcohol of about 0.08 % measured a mean fall of
 * 0.57 to 1.26 dB depending on the colour of the light (Frontiers in Neuroscience, 2022, doi
 * 10.3389/fnins.2022.873671), larger the longer after drinking. The effect here is that fall, scaled
 * LINEARLY with the level between nothing and 0.08 %, at the 0.9 dB middle of that range, and never
 * extrapolated past 0.1 %: past what was measured the model refuses to say. A higher level can still be
 * recorded (a drunk witness is a fact about the account); the picture then shows the effect at 0.1 %.
 *
 * The level is a percentage, grams per 100 mL of blood; ten times it is grams per litre, the unit French
 * readers know, which the field shows beside it.
 *
 * What it does NOT model, and the reason: double vision, narrowed field and blur were not quantified by
 * any source found (their effects are mentioned in reviews without numbers), so the picture does not
 * pretend to show them. The same goes for any other drug: no figures, no effect.
 */
export class IntoxicationProvider implements ObserverProvider {
  static readonly ID = "intoxication"
  /** The level the study measured, per cent blood alcohol, and the fall it gave there, decibels. */
  static readonly MEASURED_LEVEL = 0.08
  static readonly MEASURED_LOSS_DB = 0.9
  /** The highest level the effect is drawn for: past it, nothing was measured. */
  static readonly MAX_EFFECT_LEVEL = 0.1
  /** The highest level that can be recorded: about what is fatal. */
  static readonly MAX_LEVEL = 0.5

  readonly id = IntoxicationProvider.ID
  readonly label = "Alcohol"
  readonly hint =
    "Lowers contrast sensitivity by about 0.9 dB at 0.08 % blood alcohol (one controlled study, results vary), drawn up to 0.1 % at most: a higher level is recorded but shown as 0.1 %, since nothing was measured past it. Double vision, narrowed field and other drugs are not modelled: no source quantifies them."
  readonly sources = [
    "Frontiers in Neuroscience, 2022, doi:10.3389/fnins.2022.873671 (contrast sensitivity at about 0.08 % blood alcohol)"
  ]
  readonly settings = [
    { id: "bloodAlcohol", label: "Blood alcohol", kind: "number" as const, default: 0, min: 0, max: IntoxicationProvider.MAX_LEVEL, step: 0.01, unit: "%", also: { unit: "g/L", factor: 10, digits: 1 } }
  ]

  perceive(values: ObserverSettings): Perception {
    const raw = Number(values.bloodAlcohol ?? 0)
    const level = Math.max(0, Math.min(IntoxicationProvider.MAX_EFFECT_LEVEL, Number.isFinite(raw) ? raw : 0))
    if (level === 0) return Perceptions.NONE
    const lossDb = (level / IntoxicationProvider.MEASURED_LEVEL) * IntoxicationProvider.MEASURED_LOSS_DB
    return { colorMatrix: Perceptions.IDENTITY, contrastGain: 10 ** (-lossDb / 20) }
  }
}
