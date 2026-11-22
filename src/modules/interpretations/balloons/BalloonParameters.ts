import { ParameterRegistry, Parameters } from "../../../engine/interpretation/Parameters.js"
import type { ParameterHolder, ParameterSet, ParameterSpec } from "../../../engine/interpretation/Parameters.js"
import { DroneParameters } from "../drones/DroneParameters.js"
import { BalloonFlight } from "./BalloonFlight.js"
import type { BalloonFlightJson, BalloonGroup, BalloonRelease, BalloonWind } from "./BalloonFlight.js"
import { BalloonTypes, FOIL_SHAPES } from "./BalloonType.js"
import type { BalloonType, BalloonTypeId } from "./BalloonType.js"

/** What the form of a balloon needs of the editor: the shapes it may stand for. */
export interface BalloonContext {
  shapes: { value: string, label: string }[]
}

/**
 * A flight of balloons as its form edits it (see BalloonEditor), where what the recording keeps in lists or in either of two forms is said
 * in fields a form can write: its type by name, and the figures of it the recording changes apart (`figures`); whether one balloon is let go
 * or a group (`mode`), the one as `release`; the first wind aloft as `windAloft`; a hot-air pilot's one height as `cruiseM`.
 */
export interface BalloonView extends Omit<BalloonFlightJson, "balloon" | "windsAloft" | "plan"> {
  balloon: BalloonTypeId
  figures?: Partial<Omit<BalloonType, "id">>
  mode: "one" | "group"
  release?: BalloonRelease
  windAloft?: Partial<BalloonWind & { atM: number }>
  cruiseM?: number
}

/**
 * What a flight of balloons lets its author set (see BalloonFlightJson): where they are let go, one or a group, the balloon and what of it
 * differs from its type, the air they rise into, a hot-air pilot's height, a captive one's line. The balloon kind's whole contribution to the
 * editor: the form is built from it (see ParameterForm). Each flight is computed from it (see BalloonFlight.trajectory), never offered.
 */
export class BalloonParameters {
  private static readonly BALLOON = "balloon"
  private static readonly RELEASE = "letGo"
  private static readonly AIR = "air"
  private static readonly FLIGHT = "flight"

  /** The form's view of a flight (see BalloonView). */
  static viewOf(flight: BalloonFlightJson): BalloonView {
    const { balloon, windsAloft, plan, ...rest } = structuredClone(flight)
    const view: BalloonView = { ...rest, balloon: typeof balloon === "string" ? balloon : balloon.id, mode: flight.group ? "group" : "one" }
    if (typeof balloon === "object") {
      const { id: _id, ...figures } = balloon
      if (Object.keys(figures).length > 0) view.figures = figures
    }
    if (!flight.group) view.release = structuredClone(flight.releases?.[0] ?? { t: 0 })
    if (windsAloft?.[0]) view.windAloft = { ...windsAloft[0] }
    if (plan && plan.length === 1) view.cruiseM = plan[0].altitudeM
    return view
  }

  /**
   * The flight a view states, keeping what the form does not edit of `was`: the releases past the first, the winds aloft past the first, a
   * pilot's plan of more than one height. Switching to a group puts its one balloon's instant as the group's first; back to one balloon, the
   * group's first instant becomes the balloon's.
   */
  static fromView(view: BalloonView, was: BalloonFlightJson): BalloonFlightJson {
    const { balloon, figures, mode, release, windAloft, cruiseM, ...rest } = structuredClone(view)
    const flight: BalloonFlightJson = { ...rest, balloon: figures && Object.keys(figures).length > 0 ? { ...figures, id: balloon } : balloon }
    if (mode === "group") {
      const from = release?.t ?? was.releases?.[0]?.t ?? 0
      flight.group = { count: 10, fromT: from, untilT: from + 60_000, ...(view.group ?? {}) } as BalloonGroup
      if (was.group && was.releases?.length) flight.releases = was.releases
      else delete flight.releases
    } else {
      delete flight.group
      const first: BalloonRelease = { ...(release ?? {}), t: release?.t ?? was.group?.fromT ?? 0 }
      flight.releases = [first, ...(was.group ? [] : was.releases?.slice(1) ?? [])]
    }
    const aloft = was.windsAloft?.slice(1) ?? []
    if (windAloft && Object.values(windAloft).some(value => value !== undefined)) {
      flight.windsAloft = [{ atM: windAloft.atM ?? 1000, towardDeg: windAloft.towardDeg ?? 0, speedMS: windAloft.speedMS ?? 0 }, ...aloft]
    } else if (aloft.length > 0) flight.windsAloft = aloft
    if (was.plan && was.plan.length > 1) flight.plan = was.plan
    else if (cruiseM !== undefined) flight.plan = [{ t: was.plan?.[0]?.t ?? 0, altitudeM: cruiseM }]
    if (flight.wind && flight.wind.towardDeg === undefined && flight.wind.speedMS === undefined) delete flight.wind
    else if (flight.wind) {
      flight.wind.towardDeg ??= 0
      flight.wind.speedMS ??= 0
    }
    return flight
  }

  private static typeOf(element: ParameterHolder): BalloonType {
    const view = element as unknown as BalloonView
    return BalloonFlight.typeOf({ balloon: view.figures ? { ...view.figures, id: view.balloon } : view.balloon, shape: view.shape })
  }

  /** A figure's colours when the recording states none: the catalogue's (see public/models/index.json). */
  private static readonly FIGURE = { hair: "#5a2e14", skin: "#e8955a", bottom: "#f39a1e", shoes: "#f2f2f2" }

  private static one(element: ParameterHolder): boolean {
    return Parameters.read(element, "mode") !== "group"
  }

  /** An instant of the recording: stored in milliseconds, typed in seconds. */
  private static instant(key: string, label: string, group: string, visibleWhen: (element: ParameterHolder) => boolean): ParameterSpec {
    return { type: "number", key, min: -36000, max: 36000, step: 1, unit: "s", scale: 0.001, required: true, label, hint: "secondsOfTheRecording", group, visibleWhen }
  }

  static readonly SET: ParameterSet = {
    kind: "balloons",
    title: "balloons",
    parameters: ([
      { type: "said", key: "title", label: "name", group: BalloonParameters.BALLOON },
      {
        type: "choice", key: "balloon", required: true, group: BalloonParameters.BALLOON, label: "type",
        choices: BalloonTypes.ALL.map(type => ({ value: type.id, label: DroneParameters.textKey(type.id) }))
      },
      {
        type: "choice", key: "shape", group: BalloonParameters.BALLOON, label: "shape", effective: () => "round",
        choices: FOIL_SHAPES.map(shape => ({ value: shape, label: shape })),
        visibleWhen: element => BalloonParameters.typeOf(element).shapes !== undefined
      },
      {
        type: "colour", key: "color", group: BalloonParameters.BALLOON, label: "colour",
        hint: "itsLightsForAnLedBalloon", effective: element => { const type = BalloonParameters.typeOf(element); return type.glow?.color ?? type.color }
      },
      ...(["hair", "skin", "bottom", "shoes"] as const).map((part): ParameterSpec => ({
        type: "colour", key: `partColors.${part}`, group: BalloonParameters.BALLOON, label: part,
        fallback: BalloonParameters.FIGURE[part], visibleWhen: element => Parameters.read(element, "shape") === "figure"
      })),
      {
        type: "number", key: "flames", min: 1, max: 9, step: 1, group: BalloonParameters.BALLOON, label: "flamesLit", hint: "candlesOrFlares",
        effective: element => BalloonParameters.typeOf(element).flames?.count, visibleWhen: element => BalloonParameters.typeOf(element).flames !== undefined
      },
      {
        type: "colour", key: "partColors.flame", group: BalloonParameters.BALLOON, label: "flameColour",
        effective: element => BalloonParameters.typeOf(element).flames?.color, visibleWhen: element => BalloonParameters.typeOf(element).flames !== undefined
      },
      {
        type: "number", key: "figures.launchVolumeM3", min: 0.001, max: 1000000, step: 0.001, unit: "m³", group: BalloonParameters.BALLOON,
        label: "filledWith", hint: "atSeaLevel", effective: element => BalloonParameters.typeOf(element).launchVolumeM3
      },
      {
        type: "number", key: "figures.massKg", min: 0.0001, max: 100000, step: 0.0001, unit: "kg", group: BalloonParameters.BALLOON,
        label: "weight", hint: "withoutItsGas", effective: element => BalloonParameters.typeOf(element).massKg
      },
      {
        type: "set", key: "explains", group: BalloonParameters.BALLOON, label: "standForTheShapes",
        // A shape named that the recording no longer holds is still listed: dropping it silently would be an edit nobody made.
        options: (balloon, context) => {
          const shapes = (context as BalloonContext | undefined)?.shapes ?? []
          const named = ((balloon as unknown as BalloonView).explains ?? []).filter(id => !shapes.some(shape => shape.value === id))
          return [...shapes, ...named.map(value => ({ value, label: value }))]
        },
        empty: "noShape"
      },
      {
        type: "position", key: "site.eastM", secondKey: "site.northM", saidKey: "site.saidPosition", native: "local", step: 1, rangeM: 100000,
        group: BalloonParameters.RELEASE, label: "whereLetGo"
      },
      {
        type: "number", key: "site.altitudeM", min: -1000, max: 9000, step: 0.1, unit: "m", group: BalloonParameters.RELEASE, effective: () => 0,
        label: "heightOfTheSite", hint: "aboveTheGroundOfThePlace"
      },
      {
        type: "number", key: "site.originElevationM", min: -500, max: 6000, step: 1, unit: "m", group: BalloonParameters.RELEASE, effective: () => 0,
        label: "thePlaceAboveTheSea", hint: "whatSetsHowThinTheAir"
      },
      {
        type: "choice", key: "mode", required: true, group: BalloonParameters.RELEASE, label: "howMany",
        choices: [{ value: "one", label: "oneBalloon" }, { value: "group", label: "aGroup" }]
      },
      BalloonParameters.instant("release.t", "letGoAt", BalloonParameters.RELEASE, BalloonParameters.one),
      {
        type: "number", key: "release.altitudeM", min: 0, max: 47000, step: 1, unit: "m", group: BalloonParameters.RELEASE,
        label: "firstSeenAt", hint: "alreadyUp", visibleWhen: BalloonParameters.one
      },
      {
        type: "number", key: "group.count", min: 1, max: 500, step: 1, required: true, group: BalloonParameters.RELEASE, label: "count",
        visibleWhen: element => !BalloonParameters.one(element)
      },
      BalloonParameters.instant("group.fromT", "firstLetGoAt", BalloonParameters.RELEASE, element => !BalloonParameters.one(element)),
      BalloonParameters.instant("group.untilT", "lastLetGoAt", BalloonParameters.RELEASE, element => !BalloonParameters.one(element)),
      {
        type: "number", key: "group.radiusM", min: 0, max: 5000, step: 1, unit: "m", group: BalloonParameters.RELEASE, effective: () => 10,
        label: "letGoWithin", visibleWhen: element => !BalloonParameters.one(element)
      },
      {
        type: "number", key: "group.fillSpread", min: 0, max: 1, step: 0.01, group: BalloonParameters.RELEASE, effective: () => 0.1,
        label: "fillingUnlike", hint: "asAShare", visibleWhen: element => !BalloonParameters.one(element)
      },
      {
        type: "number", key: "group.seed", min: 0, max: 4294967295, step: 1, group: BalloonParameters.RELEASE, effective: () => 1,
        label: "draw", hint: "whatTheDrawsStartFrom", visibleWhen: element => !BalloonParameters.one(element)
      },
      { type: "number", key: "wind.towardDeg", min: 0, max: 360, step: 1, unit: "°", group: BalloonParameters.AIR, label: "windTowards", hint: "atTheGround", effective: () => 0 },
      { type: "number", key: "wind.speedMS", min: 0, max: 100, step: 0.1, unit: "m/s", group: BalloonParameters.AIR, label: "windSpeed", effective: () => 0 },
      { type: "number", key: "windAloft.atM", min: 10, max: 47000, step: 10, unit: "m", group: BalloonParameters.AIR, label: "windAloftAt", hint: "aboveTheSite" },
      { type: "number", key: "windAloft.towardDeg", min: 0, max: 360, step: 1, unit: "°", group: BalloonParameters.AIR, label: "windAloftTowards" },
      { type: "number", key: "windAloft.speedMS", min: 0, max: 150, step: 0.1, unit: "m/s", group: BalloonParameters.AIR, label: "windAloftSpeed" },
      {
        type: "number", key: "airTemperatureC", min: -60, max: 50, step: 0.5, unit: "°C", group: BalloonParameters.AIR, effective: () => 15,
        label: "airTemperature", hint: "atTheSite"
      },
      {
        type: "number", key: "turbulence.horizontalMS", min: 0, max: 10, step: 0.1, unit: "m/s", group: BalloonParameters.AIR,
        effective: () => BalloonFlight.TURBULENCE.horizontalMS, label: "gustsAcross"
      },
      {
        type: "number", key: "turbulence.verticalMS", min: 0, max: 10, step: 0.1, unit: "m/s", group: BalloonParameters.AIR,
        effective: () => BalloonFlight.TURBULENCE.verticalMS, label: "gustsUpAndDown"
      },
      {
        type: "number", key: "cruiseM", min: 0, max: 10000, step: 1, unit: "m", group: BalloonParameters.FLIGHT, effective: () => BalloonFlight.CRUISE_M,
        label: "pilotHolds", hint: "aboveTheSite",
        visibleWhen: element => BalloonParameters.typeOf(element).burner !== undefined
      },
      {
        type: "number", key: "triggerM", min: 10, max: 10000, step: 10, unit: "m", group: BalloonParameters.FLIGHT, label: "torchLitAt",
        hint: "itsAltimeterLightsIt", effective: element => BalloonParameters.typeOf(element).torch?.aboveM,
        visibleWhen: element => BalloonParameters.typeOf(element).torch !== undefined
      },
      {
        type: "number", key: "tetherM", min: 1, max: 5000, step: 1, unit: "m", group: BalloonParameters.FLIGHT, effective: () => BalloonFlight.TETHER_M,
        label: "line", visibleWhen: element => BalloonParameters.typeOf(element).envelope === "sealed"
      },
      {
        type: "boolean", key: "lit", group: BalloonParameters.FLIGHT, label: "lampLit", hint: "theLampUnderIt",
        visibleWhen: element => BalloonParameters.typeOf(element).lamp !== undefined
      },
      {
        type: "number", key: "durationS", min: 1, max: 86400, step: 1, unit: "s", group: BalloonParameters.FLIGHT,
        effective: element => BalloonParameters.typeOf(element).durationS, label: "computedFor", hint: "itMayBurstOrLandBefore"
      }
    ] satisfies ParameterSpec[])
  }

  /** Makes the balloon kind known to the editor. */
  static publish(): void {
    ParameterRegistry.publish(BalloonParameters.SET)
  }
}
