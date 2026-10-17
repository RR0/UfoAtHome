import type { ObserverProvider, ObserverSettings } from "./ObserverProvider.js"
import type { Perception } from "./Perception.js"
import { Perceptions } from "./Perception.js"

/**
 * An observer who has been drinking, for the one effect the literature puts a number on: lower contrast
 * sensitivity. A controlled crossover study at a blood alcohol of about 0.08 % measured a mean fall of
 * 0.57 to 1.26 dB depending on the colour of the light (Frontiers in Neuroscience, 2022, doi
 * 10.3389/fnins.2022.873671), larger the longer after drinking. The effect here is that fall, scaled
 * LINEARLY with the level between nothing and 0.08 %, at the 0.9 dB middle of that range, and never
 * extrapolated past 0.1 %: past what was measured the model refuses to say.
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
  static readonly MAX_LEVEL = 0.1

  readonly id = IntoxicationProvider.ID
  readonly label = "Alcohol"
  readonly hint =
    "Lowers contrast sensitivity by about 0.9 dB at 0.08 % blood alcohol (one controlled study, results vary). Double vision, narrowed field and other drugs are not modelled: no source quantifies them."
  readonly sources = [
    "Frontiers in Neuroscience, 2022, doi:10.3389/fnins.2022.873671 (contrast sensitivity at about 0.08 % blood alcohol)"
  ]
  readonly settings = [
    { id: "bloodAlcohol", label: "Blood alcohol", kind: "number" as const, default: 0, min: 0, max: IntoxicationProvider.MAX_LEVEL, step: 0.01, unit: "%" }
  ]

  perceive(values: ObserverSettings): Perception {
    const raw = Number(values.bloodAlcohol ?? 0)
    const level = Math.max(0, Math.min(IntoxicationProvider.MAX_LEVEL, Number.isFinite(raw) ? raw : 0))
    if (level === 0) return Perceptions.NONE
    const lossDb = (level / IntoxicationProvider.MEASURED_LEVEL) * IntoxicationProvider.MEASURED_LOSS_DB
    return { colorMatrix: Perceptions.IDENTITY, contrastGain: 10 ** (-lossDb / 20) }
  }
}
