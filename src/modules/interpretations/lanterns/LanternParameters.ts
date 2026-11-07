import { ParameterRegistry } from "../../../engine/interpretation/Parameters.js"
import type { ParameterSet, ParameterSpec } from "../../../engine/interpretation/Parameters.js"
import { SkyLantern } from "./SkyLantern.js"

/** What the form of a launch of lanterns needs of the editor: the shapes the lanterns may stand for. */
export interface LanternContext {
  shapes: { value: string, label: string }[]
}

/**
 * What a launch of sky lanterns lets its author set (see LanternLaunchJson): where they are let go, how many, over what span and how
 * unlike each other, the air they climb into, and the lantern itself. The lantern kind's whole contribution to the editor: the form is
 * built from it (see ParameterForm), and nothing of the flight is offered, since it is computed (see SkyLantern.trajectory).
 *
 * Its lanterns are stated as a group: drawn at random within what is stated, the same for the same seed. Lanterns stated one by one
 * (`releases`) are kept as they are, and computed with the group's.
 */
export class LanternParameters {
  private static readonly RELEASE = "letGo"
  private static readonly LANTERNS = "lanterns"
  private static readonly AIR = "air"
  private static readonly LANTERN = "eachLantern"

  /** An instant of the recording: stored in milliseconds, typed in seconds. */
  private static instant(key: string, label: ParameterSpec["label"], hint: ParameterSpec["label"]): ParameterSpec {
    return { type: "number", key, min: -36000, max: 36000, step: 1, unit: "s", scale: 0.001, required: true, label, hint, group: LanternParameters.LANTERNS }
  }

  /** A wind as these lanterns state one: where it blows TOWARDS, and how fast. */
  private static wind(key: string, towards: ParameterSpec["label"], speed: ParameterSpec["label"], hint: ParameterSpec["label"]): ParameterSpec[] {
    return [
      { type: "number", key: `${key}.towardDeg`, min: 0, max: 360, step: 1, unit: "°", group: LanternParameters.AIR, hint, label: towards },
      { type: "number", key: `${key}.speedMS`, min: 0, max: 60, step: 0.1, unit: "m/s", group: LanternParameters.AIR, label: speed }
    ]
  }

  static readonly SET: ParameterSet = {
    kind: "lantern",
    title: "skyLanterns",
    parameters: ([
      { type: "said", key: "title", label: "name", group: LanternParameters.RELEASE },
      {
        // From the observer, from a decor object (a house, a field), or as degrees: see PositionInputElement.
        type: "position", key: "site.eastM", secondKey: "site.northM", saidKey: "site.saidPosition", native: "local", step: 1, rangeM: 100000,
        group: LanternParameters.RELEASE,
        label: "whereTheyAreLetGo",
        hint: "whereTheyAreLetGoFrom"
      },
      {
        type: "number", key: "site.altitudeM", min: -1000, max: 5000, step: 0.1, unit: "m", group: LanternParameters.RELEASE, effective: () => 0,
        label: "heightAboveThePlaceSGround",
        hint: "aGardenOnAHillAbove"
      },
      {
        type: "number", key: "site.originElevationM", min: -500, max: 6000, step: 1, unit: "m", group: LanternParameters.RELEASE, effective: () => 0,
        label: "thePlaceSGroundAboveThe",
        hint: "whatSetsHowThinTheAir"
      },
      {
        type: "number", key: "group.count", min: 1, max: 200, step: 1, required: true, group: LanternParameters.LANTERNS,
        label: "howMany"
      },
      LanternParameters.instant("group.fromT", "firstLetGoAt",
        "secondsOfTheRecordingBeforeIts"),
      LanternParameters.instant("group.untilT", "lastLetGoAt",
        "secondsOfTheRecordingTheOthers"),
      {
        type: "number", key: "group.radiusM", min: 0, max: 5000, step: 1, unit: "m", group: LanternParameters.LANTERNS, effective: () => 20,
        label: "letGoWithin",
        hint: "aCrowdLetsThemGoA"
      },
      {
        type: "number", key: "group.burnS.min", min: 10, max: 3600, step: 1, unit: "s", group: LanternParameters.LANTERNS, effective: () => 480,
        label: "burnsAtLeast",
        hint: "howLongEachBurnsFromWhen"
      },
      {
        type: "number", key: "group.burnS.max", min: 10, max: 3600, step: 1, unit: "s", group: LanternParameters.LANTERNS, effective: () => 900,
        label: "burnsAtMost"
      },
      {
        type: "number", key: "group.insideExcessK.min", min: 10, max: 400, step: 1, unit: "K", group: LanternParameters.LANTERNS, effective: () => 125,
        label: "hotterThanTheAirAtLeast",
        hint: "howMuchHotterThanTheAir"
      },
      {
        type: "number", key: "group.insideExcessK.max", min: 10, max: 400, step: 1, unit: "K", group: LanternParameters.LANTERNS, effective: () => 175,
        label: "hotterThanTheAirAtMost"
      },
      {
        type: "number", key: "group.burnedS", min: 0, max: 3600, step: 1, unit: "s", group: LanternParameters.LANTERNS, effective: () => 0,
        label: "alreadyBurntWhenLetGo",
        hint: "forLanternsTheAccountOnlyHas"
      },
      {
        type: "number", key: "group.seed", min: 0, max: 4294967295, step: 1, group: LanternParameters.LANTERNS, effective: () => 1,
        label: "draw",
        hint: "whatTheDrawsStartFromAnother"
      },
      {
        type: "set", key: "group.explains", group: LanternParameters.LANTERNS,
        label: "standForTheShapes",
        // A shape named that the recording no longer holds is still listed: dropping it silently would be an edit nobody made.
        options: (launch, context) => {
          const shapes = (context as LanternContext | undefined)?.shapes ?? []
          const named = ((launch as { group?: { explains?: string[] } }).group?.explains ?? []).filter(id => !shapes.some(shape => shape.value === id))
          return [...shapes, ...named.map(value => ({ value, label: value }))]
        },
        empty: "noShape"
      },
      ...LanternParameters.wind("wind",
        "windAtTheGroundTowards",
        "windAtTheGroundSpeed",
        "whereItBlowsTowardsWhichIs"),
      ...LanternParameters.wind("windAloft",
        "windAloftTowards",
        "windAloftSpeed",
        "theWindHigherUpBlendedWith"),
      {
        type: "number", key: "windAloft.atM", min: 10, max: 10000, step: 10, unit: "m", group: LanternParameters.AIR,
        label: "windAloftAt",
        hint: "metresAboveWhereTheyAreLet"
      },
      {
        type: "number", key: "airTemperatureC", min: -60, max: 50, step: 0.5, unit: "°C", group: LanternParameters.AIR, effective: () => 10,
        label: "airTemperature",
        hint: "atTheGroundFallingBy6"
      },
      {
        type: "number", key: "turbulence.horizontalMS", min: 0, max: 10, step: 0.1, unit: "m/s", group: LanternParameters.AIR,
        effective: () => SkyLantern.TURBULENCE.horizontalMS,
        label: "gustsAcross",
        hint: "howFarTheAirSSpeed"
      },
      {
        type: "number", key: "turbulence.verticalMS", min: 0, max: 10, step: 0.1, unit: "m/s", group: LanternParameters.AIR,
        effective: () => SkyLantern.TURBULENCE.verticalMS,
        label: "gustsUpAndDown"
      },
      {
        type: "number", key: "turbulence.timescaleS", min: 1, max: 600, step: 1, unit: "s", group: LanternParameters.AIR,
        effective: () => SkyLantern.TURBULENCE.timescaleS,
        label: "aGustLasts"
      },
      {
        type: "number", key: "lantern.luminousIntensityCd", min: 0.1, max: 1000, step: 0.1, unit: "cd", group: LanternParameters.LANTERN,
        effective: () => SkyLantern.COMMON.luminousIntensityCd,
        label: "light",
        hint: "itsFlameSLightThroughThe"
      },
      {
        type: "choice", key: "lantern.shape", group: LanternParameters.LANTERN,
        effective: () => SkyLantern.COMMON.shape,
        label: "shape",
        choices: [
          { value: "classic", label: "roundAtTheMouthSquareAt" },
          { value: "balloon", label: "balloonLobedTop" }
        ]
      },
      {
        type: "colour", key: "lantern.paperColor", group: LanternParameters.LANTERN, fallback: SkyLantern.COMMON.paperColor,
        label: "paperColour",
        hint: "whatItLooksLikeByDay"
      },
      {
        type: "colour", key: "lantern.color", group: LanternParameters.LANTERN, fallback: SkyLantern.COMMON.color,
        label: "flameLight",
        hint: "itsFlameSLightThroughWhite"
      },
      {
        type: "number", key: "lantern.envelopeVolumeM3", min: 0.01, max: 10, step: 0.01, unit: "m³", group: LanternParameters.LANTERN,
        effective: () => SkyLantern.COMMON.envelopeVolumeM3,
        label: "airItHolds"
      },
      {
        type: "number", key: "lantern.massKg", min: 0.005, max: 5, step: 0.001, unit: "kg", group: LanternParameters.LANTERN,
        effective: () => SkyLantern.COMMON.massKg,
        label: "weightWhenLetGo"
      }
    ] satisfies ParameterSpec[])
  }

  /** Makes the lantern kind known to the editor. */
  static publish(): void {
    ParameterRegistry.publish(LanternParameters.SET)
  }
}
