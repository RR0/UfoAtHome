import { LaunchPlumeSighting } from "./LaunchPlume.js"
import type { LaunchJetJson, LaunchJson, LaunchPlumeJson, LaunchRelease } from "./LaunchPlume.js"
import { ParameterRegistry } from "../../../engine/interpretation/Parameters.js"
import type { SaidText } from "../../../engine/model/SaidText.js"
import type { NumberParameter, ParameterHolder, ParameterSet, ParameterSpec } from "../../../engine/interpretation/Parameters.js"

/**
 * What a rocket launch lets its author set: the engine's thrust and impulse and the propellant, from
 * which the plume follows (see LaunchPlumeSighting.plumeOf), and the plume's own values, each of which
 * overrides what the engine implies.
 *
 * This is the launch kind's whole contribution to the editor: the form is built from it (see
 * ParameterForm) and nothing in the editor knows what a launch is. The values in force when a field
 * is empty are the plume's own (`effective`), so an empty field shows what the plume will use and
 * clearing a field goes back to it.
 */
export class LaunchParameters {

  /** The value the plume uses for `key` when the launch does not state it. */
  private static plumeValue(key: keyof LaunchPlumeJson): (element: ParameterHolder) => number {
    return element => LaunchPlumeSighting.plumeOf(element as unknown as LaunchJson)[key]
  }

  private static plume(key: keyof LaunchPlumeJson, spec: Omit<NumberParameter, "type" | "key" | "effective">): NumberParameter {
    return { type: "number", key: `plume.${key}`, effective: LaunchParameters.plumeValue(key), ...spec }
  }

  /**
   * A burn time: stored in milliseconds of the recording, typed in seconds. Where the launch states none the engine is taken to burn along
   * the whole path, and the field shows that instant, greyed.
   */
  private static burn(key: "burnFromT" | "burnUntilT", spec: { label: SaidText, hint: SaidText, ends: (track: LaunchJson["track"]) => { t: number } | undefined }): NumberParameter {
    return {
      type: "number", key, min: -3600, max: 36000, step: 0.1, unit: "s", scale: 0.001, label: spec.label, hint: spec.hint,
      group: "engine",
      effective: element => spec.ends((element as unknown as LaunchJson).track ?? [])?.t
    }
  }

  /**
   * A place of the path at `t`: between two of its places, where the stage is then (joined linearly, as the plume is let go between them);
   * past either end, going on as the nearest two were going, the height never below the ground.
   */
  static placeAt(track: LaunchJson["track"], t: number): LaunchJson["track"][number] {
    if (track.length === 0) return { t, lat: 0, lng: 0, altitudeKm: 0 }
    if (track.length === 1) return { t, lat: track[0].lat, lng: track[0].lng, altitudeKm: track[0].altitudeKm }
    let i = 0
    while (i < track.length - 2 && track[i + 1].t < t) i++
    const a = track[i]
    const b = track[i + 1]
    const f = b.t === a.t ? 0 : (t - a.t) / (b.t - a.t)
    const at = (from: number, to: number) => from + (to - from) * f
    return { t, lat: at(a.lat, b.lat), lng: at(a.lng, b.lng), altitudeKm: Math.max(0, at(a.altitudeKm, b.altitudeKm)) }
  }

  /** The instants every point of `launch` stands at: its path, its burn and its jets. */
  static instantsOf(launch: LaunchJson): number[] {
    return [
      ...launch.track.map(place => place.t),
      ...[launch.burnFromT, launch.burnUntilT].filter((t): t is number => t !== undefined),
      ...(launch.jets ?? []).flatMap(jet => [jet.fromT, jet.untilT])
    ]
  }

  static readonly SET: ParameterSet = {
    kind: "launch",
    title: "launch",
    parameters: ([
      { type: "said", key: "title", label: "name", group: "vehicle" },
      // The vehicle itself is picked when the launch is added (see LaunchEditor.VEHICLES), and kept: another vehicle is another launch.
      {
        type: "text", key: "vehicle.mission",
        label: "mission",
        placeholder: "Starlink Group 10-49",
        group: "vehicle"
      },
      {
        type: "number", key: "vehicle.engine.thrustKN", min: 1, max: 100000, step: 1, unit: "kN",
        label: "thrustVacuum",
        hint: "merlinVacuum934Rl10110A",
        group: "engine"
      },
      {
        type: "number", key: "vehicle.engine.specificImpulseS", min: 100, max: 500, step: 1, unit: "s",
        label: "specificImpulseVacuum",
        hint: "times981MSIt",
        group: "engine"
      },
      {
        type: "choice", key: "vehicle.engine.propellant",
        label: "propellant",
        hint: "whatTheExhaustIsMadeOf",
        choices: [
          { value: "rp1-lox", label: "keroseneAndOxygen" },
          { value: "methane-lox", label: "methaneAndOxygen" },
          { value: "hydrogen-lox", label: "hydrogenAndOxygen" },
          { value: "hypergolic", label: "hypergolic" },
          { value: "solid", label: "solid" }
        ],
        group: "engine"
      },
      LaunchParameters.burn("burnFromT", {
        label: "engineStart",
        hint: "whenTheEngineStartedInSeconds",
        ends: track => track[0]
      }),
      LaunchParameters.burn("burnUntilT", {
        label: "engineCutOff",
        hint: "whenTheEngineStoppedInSeconds",
        ends: track => track[track.length - 1]
      }),
      LaunchParameters.plume("exhaustKgPerS", {
        min: 0.1, max: 100000, step: 0.1, unit: "kg/s",
        label: "exhaustFlow",
        hint: "howMuchExhaustLeavesTheEngine",
        group: "plume"
      }),
      LaunchParameters.plume("condensedShare", {
        min: 0, max: 1, step: 0.01,
        label: "shareThatScatters",
        hint: "theShareOfTheExhaustThat",
        group: "plume"
      }),
      LaunchParameters.plume("particleRadiusUm", {
        min: 0.05, max: 5, step: 0.05, unit: "µm",
        label: "particleRadius",
        group: "plume"
      }),
      LaunchParameters.plume("lifetimeS", {
        min: 10, max: 3600, step: 10, unit: "s",
        label: "trailLifetime",
        hint: "howLongTheNarrowTrailLasts",
        group: "plume"
      }),
      LaunchParameters.plume("expansionKmPerS", {
        min: 0, max: 5, step: 0.01, unit: "km/s",
        label: "trailSpreading",
        group: "plume"
      }),
      LaunchParameters.plume("initialRadiusKm", {
        min: 0, max: 50, step: 0.1, unit: "km",
        label: "radiusAtRelease",
        group: "plume"
      }),
      LaunchParameters.plume("collarShare", {
        min: 0, max: 1, step: 0.01,
        label: "shareInTheCollar",
        hint: "theCollarIsTheExhaustJust",
        group: "collar"
      }),
      LaunchParameters.plume("collarExpansionKmPerS", {
        min: 0, max: 10, step: 0.05, unit: "km/s",
        label: "collarSpreading",
        hint: "howFastTheCollarWidensThree",
        group: "collar"
      }),
      LaunchParameters.plume("collarLifetimeS", {
        min: 1, max: 300, step: 1, unit: "s",
        label: "collarLifetime",
        group: "collar"
      })
    ] satisfies ParameterSpec[])
  }

  /**
   * One place of the path: where the stage stood at an instant of the recording, which may be before the recording began (the stage had
   * already been climbing for minutes when the observer looked up). The path is a list of them, edited one at a time (see LaunchEditor).
   */
  static readonly PLACE: ParameterSet = {
    kind: "launch-place",
    title: "placeOfThePath",
    parameters: ([
      {
        type: "number", key: "t", min: -3600, max: 36000, step: 0.1, unit: "s", scale: 0.001, required: true,
        label: "time",
        hint: "secondsOfTheRecordingNegativeBefore"
      },
      // As degrees, or from the observer or a decor object: see PositionInputElement.
      { type: "position", key: "lat", secondKey: "lng", saidKey: "saidPosition", native: "geo", step: 1, label: "position" },
      { type: "number", key: "altitudeKm", min: 0, max: 2000, step: 0.1, unit: "km", required: true, label: "altitude" }
    ] satisfies ParameterSpec[])
  }

  /** What a jet's form is told besides the jet: the launch it belongs to and where it stands among its jets, for the values in force. */
  static jetContext(launch: LaunchJson, index: number): JetContext {
    return { launch, index }
  }

  /** The value a jet uses for `key` when it does not state it: the launch's plume for a burn, the vent's defaults for a vent. */
  private static jetValue(read: (release: LaunchRelease) => number | undefined): (element: ParameterHolder, context?: unknown) => number | undefined {
    return (element, context) => {
      const { launch, index } = context as JetContext ?? {}
      return launch ? read(LaunchPlumeSighting.releaseOf(launch, element as unknown as LaunchJetJson, index)) : undefined
    }
  }

  private static readonly JET_GROUP: SaidText = "jet"

  /**
   * One jet of a launch: another burn of its engine, or propellant vented from its tanks (see LaunchJetJson), edited one at a time
   * (see LaunchEditor). A field left empty shows what the jet uses: the launch's plume for a burn, a vent's defaults for a vent.
   */
  static readonly JET: ParameterSet = {
    kind: "launch-jet",
    title: "jet",
    parameters: ([
      {
        type: "choice", key: "kind", required: true,
        label: "what",
        choices: [
          { value: "burn", label: "engineBurn" },
          { value: "vent", label: "propellantVented" }
        ],
        group: LaunchParameters.JET_GROUP
      },
      {
        type: "number", key: "fromT", min: -36000, max: 36000, step: 0.1, unit: "s", scale: 0.001, required: true,
        label: "from",
        hint: "secondsOfTheRecordingNegativeBefore2",
        group: LaunchParameters.JET_GROUP
      },
      {
        type: "number", key: "untilT", min: -36000, max: 36000, step: 0.1, unit: "s", scale: 0.001, required: true,
        label: "until",
        group: LaunchParameters.JET_GROUP
      },
      {
        type: "number", key: "angleDeg", min: 0, max: 180, step: 1, unit: "°", effective: () => 0,
        label: "directionFromAft",
        hint: "t0StraightBackAlongTheStage",
        group: LaunchParameters.JET_GROUP
      },
      {
        type: "number", key: "azimuthDeg", min: -360, max: 360, step: 1, unit: "°", effective: () => 0,
        label: "side",
        hint: "roundTheLineOfMotionWhich",
        group: LaunchParameters.JET_GROUP
      },
      {
        type: "number", key: "spinPeriodS", min: -3600, max: 3600, step: 0.1, unit: "s",
        label: "spinPeriod",
        hint: "howLongTheStageTakesTo",
        group: LaunchParameters.JET_GROUP
      },
      {
        type: "number", key: "speedKmPerS", min: 0, max: 10, step: 0.01, unit: "km/s", effective: LaunchParameters.jetValue(release => release.speedKmPerS),
        label: "speed",
        hint: "howFastItLeavesTheStage",
        group: LaunchParameters.JET_GROUP
      },
      {
        type: "number", key: "massKgPerS", min: 0, max: 100000, step: 0.1, unit: "kg/s", effective: LaunchParameters.jetValue(release => release.massKgPerS),
        label: "flow",
        group: LaunchParameters.JET_GROUP
      },
      {
        type: "number", key: "condensedShare", min: 0, max: 1, step: 0.01, effective: LaunchParameters.jetValue(release => release.condensedShare),
        label: "shareThatScatters",
        group: LaunchParameters.JET_GROUP
      },
      {
        type: "number", key: "particleRadiusUm", min: 0.05, max: 5, step: 0.05, unit: "µm", effective: LaunchParameters.jetValue(release => release.particleRadiusUm),
        label: "particleRadius",
        group: LaunchParameters.JET_GROUP
      },
      {
        type: "number", key: "expansionKmPerS", min: 0, max: 5, step: 0.01, unit: "km/s", effective: LaunchParameters.jetValue(release => release.populations[0].expansionKmPerS),
        label: "spreading",
        hint: "howFastEachPuffOfIt",
        group: LaunchParameters.JET_GROUP
      },
      {
        type: "number", key: "initialRadiusKm", min: 0, max: 50, step: 0.1, unit: "km", effective: LaunchParameters.jetValue(release => release.initialRadiusKm),
        label: "radiusAtRelease",
        group: LaunchParameters.JET_GROUP
      },
      {
        type: "number", key: "lifetimeS", min: 1, max: 7200, step: 1, unit: "s", effective: LaunchParameters.jetValue(release => release.populations[0].lifetimeS),
        label: "lifetime",
        group: LaunchParameters.JET_GROUP
      }
    ] satisfies ParameterSpec[])
  }

  /** Makes the launch kind known to whatever builds forms from the registry. */
  static publish(): void {
    ParameterRegistry.publish(LaunchParameters.SET)
  }
}

/** See LaunchParameters.jetContext. */
interface JetContext {
  launch: LaunchJson
  index: number
}
