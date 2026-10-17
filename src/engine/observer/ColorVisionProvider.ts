import type { ObserverProvider, ObserverSettings } from "./ObserverProvider.js"
import type { Perception } from "./Perception.js"
import { Perceptions } from "./Perception.js"

/**
 * Colour vision deficiencies, by the matrices of Machado, Oliveira and Fernandes, "A Physiologically-based
 * Model for Simulation of Color Vision Deficiency" (IEEE TVCG 15(6), 2009), at their full severity,
 * for LINEAR RGB.
 *
 * Severity (the anomalous trichromat, whose cone is shifted rather than missing) is the straight blend between the
 * normal vision and the dichromat's matrix. That is an approximation of the paper's per-severity matrices, which
 * are close to it, and it is said so here rather than passed off as theirs.
 *
 * Limit, said rather than hidden: the finish recolours the SCENE, not what is laid over it (the phenomenon
 * drawn on the screen, the pictures of the place, the compass), so a green phenomenon stays green to a deutan.
 *
 * About 8 % of men and 0.5 % of women have one of the red-green kinds; the blue-yellow (tritan) kind is rare.
 */
export class ColorVisionProvider implements ObserverProvider {
  static readonly ID = "color-vision"

  /** Full-severity matrices, row-major (Machado 2009, severity 1.0). */
  static readonly MATRICES: Record<string, readonly number[]> = {
    protan: [0.152286, 1.052583, -0.204868, 0.114503, 0.786281, 0.099216, -0.003882, -0.048116, 1.051998],
    deutan: [0.367322, 0.860646, -0.227968, 0.280085, 0.672501, 0.047413, -0.01182, 0.04294, 0.968881],
    tritan: [1.255528, -0.076749, -0.178779, -0.078411, 0.930809, 0.147602, 0.004733, 0.691367, 0.3039]
  }

  readonly id = ColorVisionProvider.ID
  readonly label = "Colour vision"
  readonly hint =
    "How colours look to someone whose cones differ, from Machado et al. 2009. Only recolours: it does not change brightness or what the eye can resolve."
  readonly sources = [
    "Machado, Oliveira, Fernandes, A Physiologically-based Model for Simulation of Color Vision Deficiency, IEEE TVCG 15(6), 2009"
  ]
  readonly settings = [
    {
      id: "type",
      label: "Type",
      kind: "choice" as const,
      default: "normal",
      choices: [
        { id: "normal", label: "Typical" },
        { id: "protan", label: "Protan (red-weak or red-blind)" },
        { id: "deutan", label: "Deutan (green-weak or green-blind)" },
        { id: "tritan", label: "Tritan (blue-weak or blue-blind)" }
      ]
    },
    { id: "severity", label: "Severity", kind: "number" as const, default: 100, min: 0, max: 100, step: 5, unit: "%" }
  ]

  perceive(values: ObserverSettings): Perception {
    const matrix = ColorVisionProvider.MATRICES[String(values.type)]
    if (!matrix) return Perceptions.NONE
    const raw = Number(values.severity ?? 100)
    const severity = Math.max(0, Math.min(100, Number.isFinite(raw) ? raw : 100)) / 100
    const colorMatrix = matrix.map((value, i) => Perceptions.IDENTITY[i] + (value - Perceptions.IDENTITY[i]) * severity)
    return { colorMatrix, contrastGain: 1 }
  }
}
