import { AuroralOval, AuroraSighting } from "./Aurora.js"
import type { AuroraJson } from "./Aurora.js"
import { ParameterRegistry } from "../../../engine/interpretation/Parameters.js"
import type { NumberParameter, ParameterHolder, ParameterSet, ParameterSpec } from "../../../engine/interpretation/Parameters.js"

/**
 * What an aurora lets its author set: how disturbed the field was (Kp), from which the rest follows (see AuroralOval), and each value Kp
 * implies, which a stated one replaces: the oval's edge, the arcs and their brightness, a storm's red. An empty field shows what is in force.
 */
export class AuroraParameters {
  /** A value Kp implies, at the start of the recording. */
  private static fromKp(read: (kp: number) => number): (element: ParameterHolder) => number {
    return element => read(AuroraSighting.kpAt(element as unknown as AuroraJson, 0))
  }

  private static time(key: "fromT" | "untilT", label: string, hint: string): NumberParameter {
    return { type: "number", key, min: -36000, max: 36000, step: 1, unit: "s", scale: 0.001, label, hint, group: "when" }
  }

  static readonly SET: ParameterSet = {
    kind: "aurora",
    title: "aurora",
    parameters: ([
      { type: "said", key: "title", label: "name", group: "field" },
      {
        type: "number", key: "kp", min: 0, max: 12, step: 0.33,
        label: "kp",
        hint: "kpHint",
        effective: element => (element as unknown as AuroraJson).activity?.length ? AuroraSighting.kpAt(element as unknown as AuroraJson, 0) : AuroralOval.DEFAULT_KP,
        group: "field"
      },
      {
        type: "number", key: "edgeLatDeg", min: 20, max: 75, step: 0.1, unit: "°",
        label: "edge",
        hint: "edgeHint",
        effective: AuroraParameters.fromKp(kp => Math.round(AuroralOval.equatorwardEdgeDeg(kp) * 10) / 10),
        group: "field"
      },
      {
        type: "number", key: "arcs", min: 0, max: 4, step: 1,
        label: "arcs",
        hint: "arcsHint",
        effective: AuroraParameters.fromKp(AuroralOval.arcsOf),
        group: "light"
      },
      {
        type: "number", key: "arcKR", min: 0.1, max: 1000, step: 0.1, unit: "kR",
        label: "arcBrightness",
        hint: "arcBrightnessHint",
        effective: AuroraParameters.fromKp(kp => Math.round(AuroralOval.arcKROf(kp) * 10) / 10),
        group: "light"
      },
      {
        type: "number", key: "redKR", min: 0, max: 100, step: 0.1, unit: "kR",
        label: "red",
        hint: "redHint",
        effective: AuroraParameters.fromKp(kp => Math.round(AuroralOval.redKROf(kp) * 10) / 10),
        group: "light"
      },
      AuroraParameters.time("fromT", "from", "fromHint"),
      AuroraParameters.time("untilT", "until", "untilHint")
    ] satisfies ParameterSpec[])
  }

  static publish(): void {
    ParameterRegistry.publish(AuroraParameters.SET)
  }
}
