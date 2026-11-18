import { ParameterRegistry, Parameters } from "../../../engine/interpretation/Parameters.js"
import type { ParameterHolder, ParameterSet, ParameterSpec } from "../../../engine/interpretation/Parameters.js"
import { DroneFlight, DronePath } from "./DroneFlight.js"
import type { DroneFlightJson, DroneWaypoint } from "./DroneFlight.js"
import { DroneAirframes } from "./DroneAirframe.js"
import type { DroneLight } from "./DroneAirframe.js"

/** What the form of a drone needs of the editor: the shapes it may stand for. */
export interface DroneContext {
  shapes: { value: string, label: string }[]
}

/**
 * What a drone, or a group of them, lets its author set (see DroneFlightJson): what airframe, how many and how arranged, how it is
 * turned and what wind it holds against, what it sounds like, its colour, each of its lights, and the points of its path (WAYPOINT). The
 * drone kind's whole contribution to the editor: the forms are built from these sets (see ParameterForm). Every drone's own track is
 * computed from them (see DroneFlight.bodiesOf), never offered.
 *
 * An empty field shows what is in force: its airframe's colour and lights. Only the lights its airframe has are offered.
 */
export class DroneParameters {
  private static readonly DRONE = "drone"
  private static readonly FLIGHT = "flight"
  private static readonly LOOK = "look"

  /** Every light any airframe has, in the order the airframes list them. */
  static readonly LIGHT_NAMES: readonly string[] = [...new Set(DroneAirframes.ALL.flatMap(airframe => Object.keys(airframe.lights)))]

  /** The key of a name in the texts: "nav-left" is "navLeft". */
  static textKey(name: string): string {
    return name.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())
  }

  private static flightOf(element: ParameterHolder): DroneFlightJson {
    return element as unknown as DroneFlightJson
  }

  /** The light `name` of the drone's airframe, as the airframe has it; undefined when it has none of that name. */
  private static ownLight(element: ParameterHolder, name: string): DroneLight | undefined {
    return DroneFlight.airframeOf(DroneParameters.flightOf(element)).lights[name]
  }

  private static formationUnstated(element: ParameterHolder): string {
    return ((Parameters.read(element, "count") as number | undefined) ?? 1) > 1 ? "cluster" : "single"
  }

  private static formationOf(element: ParameterHolder): string {
    const stated = Parameters.read(element, "formation.kind")
    return typeof stated === "string" ? stated : DroneParameters.formationUnstated(element)
  }

  private static hovers(element: ParameterHolder): boolean {
    return DroneFlight.airframeOf(DroneParameters.flightOf(element)).hovers
  }

  /** The fields of one light: whether it is out, its colour, how bright, how it flashes; only while the airframe has it. */
  private static light(name: string): ParameterSpec[] {
    const group = DroneParameters.textKey(name)
    const has = (element: ParameterHolder) => DroneParameters.ownLight(element, name) !== undefined
    // Out when it says so, when it is stated as `false`, or when its airframe has it out and it says nothing.
    const out = (element: ParameterHolder) => {
      const stated = DroneParameters.flightOf(element).lights?.[name]
      if (stated === false) return true
      return typeof stated?.off === "boolean" ? stated.off : DroneParameters.ownLight(element, name)?.off === true
    }
    const lit = (element: ParameterHolder) => has(element) && !out(element)
    return [
      {
        // What is in force when the field states nothing: its airframe's, or out for a light stated as `false` (which states no field).
        type: "boolean", key: `lights.${name}.off`, group, label: "switchedOff", visibleWhen: has,
        effective: element => DroneParameters.flightOf(element).lights?.[name] === false || DroneParameters.ownLight(element, name)?.off === true
      },
      {
        type: "colour", key: `lights.${name}.color`, group, label: "colour", visibleWhen: lit,
        effective: element => DroneParameters.ownLight(element, name)?.color
      },
      {
        type: "number", key: `lights.${name}.candela`, min: 0, max: 100000, step: 0.1, unit: "cd", group, label: "intensity", hint: "eachLed",
        visibleWhen: lit, effective: element => DroneParameters.ownLight(element, name)?.candela
      },
      {
        type: "number", key: `lights.${name}.hz`, min: 0, max: 50, step: 0.05, unit: "Hz", group, label: "flashesASecond", hint: "steadyAtNought",
        visibleWhen: lit, effective: element => DroneParameters.ownLight(element, name)?.hz ?? 0
      },
      {
        type: "number", key: `lights.${name}.flashS`, min: 0.001, max: 60, step: 0.001, unit: "s", group, label: "eachFlashLasts",
        visibleWhen: element => lit(element) && (((Parameters.read(element, `lights.${name}.hz`) as number | undefined) ?? DroneParameters.ownLight(element, name)?.hz ?? 0) > 0),
        effective: element => {
          const own = DroneParameters.ownLight(element, name)
          const hz = (Parameters.read(element, `lights.${name}.hz`) as number | undefined) ?? own?.hz ?? 0
          return own?.flashS ?? (hz > 0 ? Math.round(500 / hz) / 1000 : undefined)
        }
      }
    ]
  }

  static readonly SET: ParameterSet = {
    kind: "drones",
    title: "drones",
    parameters: ([
      { type: "said", key: "title", label: "name", group: DroneParameters.DRONE },
      {
        type: "choice", key: "airframe", required: true, group: DroneParameters.DRONE, label: "airframe",
        choices: DroneAirframes.ALL.map(airframe => ({ value: airframe.id, label: DroneParameters.textKey(airframe.id) }))
      },
      { type: "number", key: "count", min: 1, max: 2000, step: 1, group: DroneParameters.DRONE, effective: () => 1, label: "howMany" },
      {
        type: "set", key: "explains", group: DroneParameters.DRONE, label: "standForTheShapes", hint: "theWholeGroupTakenForOne",
        visibleWhen: element => DroneParameters.flightOf(element).explainsEach === undefined,
        // A shape named that the recording no longer holds is still listed: dropping it silently would be an edit nobody made.
        options: (drone, context) => {
          const shapes = (context as DroneContext | undefined)?.shapes ?? []
          const named = (DroneParameters.flightOf(drone).explains ?? []).filter(id => !shapes.some(shape => shape.value === id))
          return [...shapes, ...named.map(value => ({ value, label: value }))]
        },
        empty: "noShape"
      },
      {
        type: "number", key: "seed", min: 0, max: 4294967295, step: 1, group: DroneParameters.DRONE, effective: () => 1,
        label: "draw", hint: "whatTheDrawsStartFrom"
      },
      {
        type: "choice", key: "formation.kind", group: DroneParameters.FLIGHT, label: "pattern",
        effective: element => DroneParameters.formationUnstated(element),
        choices: [
          { value: "single", label: "oneDrone" },
          { value: "cluster", label: "aLooseGroup" },
          { value: "line", label: "abreast" }
        ],
        visibleWhen: element => ((Parameters.read(element, "count") as number | undefined) ?? 1) > 1
      },
      {
        type: "number", key: "formation.spacingM", min: 0.5, max: 1000, step: 0.5, unit: "m", group: DroneParameters.FLIGHT,
        effective: element => DroneParameters.formationOf(element) === "line" ? 5 : 10, label: "spacing", hint: "betweenNeighbours",
        visibleWhen: element => ((Parameters.read(element, "count") as number | undefined) ?? 1) > 1 && DroneParameters.formationOf(element) !== "single"
      },
      {
        type: "number", key: "headingDeg", min: 0, max: 360, step: 1, unit: "°", group: DroneParameters.FLIGHT, label: "noseTowards",
        placeholder: "whereItGoes", visibleWhen: DroneParameters.hovers
      },
      {
        type: "number", key: "wind.fromDeg", min: 0, max: 360, step: 1, unit: "°", group: DroneParameters.FLIGHT, label: "windFrom",
        effective: () => 0, hint: "whatItLeansInto"
      },
      {
        type: "number", key: "wind.speedMS", min: 0, max: 60, step: 0.1, unit: "m/s", group: DroneParameters.FLIGHT, label: "windSpeed",
        effective: () => 0
      },
      { type: "boolean", key: "silent", group: DroneParameters.FLIGHT, label: "silent", hint: "notEvenItsRotors" },
      {
        type: "number", key: "quieterDb", min: 0, max: 60, step: 1, unit: "dB", group: DroneParameters.FLIGHT, label: "quieter",
        hint: "thanItsClass", effective: () => 0, visibleWhen: element => Parameters.read(element, "silent") !== true
      },
      {
        type: "colour", key: "bodyColor", group: DroneParameters.LOOK, label: "hull",
        effective: element => DroneFlight.airframeOf(DroneParameters.flightOf(element)).bodyColor
      },
      ...DroneParameters.LIGHT_NAMES.flatMap(name => DroneParameters.light(name))
    ] satisfies ParameterSpec[])
  }

  /** Whether a point of the path is said as a direction and a distance from the observer, rather than as metres east and north. */
  private static angular(point: ParameterHolder): boolean {
    return typeof point.azimuthDeg === "number"
  }

  /** A point of the path: where the drone (the middle of the group) is at an instant. */
  static readonly WAYPOINT: ParameterSet = {
    kind: "drones-waypoint",
    title: "pointOfThePath",
    parameters: ([
      { type: "number", key: "t", min: -36000, max: 36000, step: 0.1, unit: "s", scale: 0.001, required: true, label: "time", hint: "secondsOfTheRecording" },
      {
        // From the observer, from a decor object, or as degrees: see PositionInputElement.
        type: "position", key: "eastM", secondKey: "northM", saidKey: "saidPosition", native: "local", step: 1, rangeM: 100000,
        label: "position", visibleWhen: point => !DroneParameters.angular(point)
      },
      {
        type: "number", key: "altitudeM", min: -500, max: 20000, step: 0.1, unit: "m", required: true, label: "height", hint: "aboveTheGroundOfThePlace",
        visibleWhen: point => !DroneParameters.angular(point)
      },
      {
        type: "number", key: "azimuthDeg", min: 0, max: 360, step: 0.1, unit: "°", required: true, label: "azimuth",
        visibleWhen: point => DroneParameters.angular(point)
      },
      {
        type: "number", key: "altitudeDeg", min: -90, max: 90, step: 0.1, unit: "°", required: true, label: "elevation",
        visibleWhen: point => DroneParameters.angular(point)
      },
      {
        type: "number", key: "distanceM", min: 0, max: 100000, step: 1, unit: "m", required: true, label: "distance",
        visibleWhen: point => DroneParameters.angular(point)
      },
      {
        type: "number", key: "eyeHeightM", min: 0, max: 10000, step: 0.1, unit: "m", effective: () => 1.6, label: "eyeHeight",
        visibleWhen: point => DroneParameters.angular(point)
      }
    ] satisfies ParameterSpec[])
  }

  /**
   * A point of the path at `t`, where the drone's path has it then (see DronePath), so that putting it changes nothing until it is
   * edited, or very little: a point put where a multirotor was passing becomes one it passes, not one it stops at. Said in metres,
   * whatever its neighbours are said in.
   */
  static waypointAt(flight: DroneFlightJson, t: number): DroneWaypoint {
    const points = DroneFlight.pathOf(flight)
    if (points.length === 0) return { t: Math.round(t), eastM: 0, northM: 0, altitudeM: 0 }
    const at = new DronePath(points, DroneFlight.airframeOf(flight).hovers).at(t)
    const round = (value: number) => Math.round(value * 10) / 10
    return { t: Math.round(t), eastM: round(at.eastM), northM: round(at.northM), altitudeM: round(at.upM) }
  }

  /** Makes the drone kind known to the editor. */
  static publish(): void {
    ParameterRegistry.publish(DroneParameters.SET)
    ParameterRegistry.publish(DroneParameters.WAYPOINT)
  }
}
