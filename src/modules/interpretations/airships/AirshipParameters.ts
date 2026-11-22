import { ParameterRegistry, Parameters } from "../../../engine/interpretation/Parameters.js"
import type { ParameterHolder, ParameterSet, ParameterSpec } from "../../../engine/interpretation/Parameters.js"
import { DroneParameters } from "../drones/DroneParameters.js"
import { DronePath, DroneFlight } from "../drones/DroneFlight.js"
import type { DroneWaypoint } from "../drones/DroneFlight.js"
import type { DroneLight } from "../drones/DroneAirframe.js"
import { AirshipFlight } from "./AirshipFlight.js"
import type { AirshipFlightJson } from "./AirshipFlight.js"
import { AirshipTypes } from "./AirshipType.js"
import type { AirshipType } from "./AirshipType.js"

/** What the form of an airship needs of the editor: the shapes it may stand for. */
export interface AirshipContext {
  shapes: { value: string, label: string }[]
}

/**
 * An airship as its form edits it (see AirshipEditor): its type by name alone, whatever figures of it the recording changes kept aside,
 * and its sign as two fields, whether it is lit and in what colour, rather than `false`, `true` or an object.
 */
export interface AirshipView extends Omit<AirshipFlightJson, "airship" | "sign"> {
  airship: AirshipType["id"]
  signLit?: boolean
  signColor?: string
}

/**
 * What an airship lets its author set (see AirshipFlightJson): its type, the wind it noses into, whether it is heard, its colours, its sign,
 * each of its lights, and the points of its path (WAYPOINT, a drone's). The airship kind's whole contribution to the editor: the forms are
 * built from these sets (see ParameterForm). Its course is computed from them (see AirshipFlight), never offered.
 *
 * An empty field shows what is in force: its type's. Only what its type has is offered: a sign, an envelope lit from inside, the lights.
 */
export class AirshipParameters {
  private static readonly AIRSHIP = "airship"
  private static readonly FLIGHT = "flight"
  private static readonly LOOK = "look"

  /** Every light any type has, in the order the types list them. */
  static readonly LIGHT_NAMES: readonly string[] = [...new Set(AirshipTypes.ALL.flatMap(type => Object.keys(type.lights)))]

  /** The form's view of an airship (see AirshipView). */
  static viewOf(flight: AirshipFlightJson): AirshipView {
    const { airship, sign, ...rest } = structuredClone(flight)
    const view: AirshipView = { ...rest, airship: typeof airship === "string" ? airship : airship.id }
    if (sign === false) view.signLit = false
    else if (sign === true) view.signLit = true
    else if (sign) {
      view.signLit = true
      if (sign.color) view.signColor = sign.color
    }
    return view
  }

  /** The airship a view states, keeping what the form does not edit of `was`: the figures of its type it changes, its sign's luminance. */
  static fromView(view: AirshipView, was: AirshipFlightJson): AirshipFlightJson {
    const { airship, signLit, signColor, ...rest } = view
    const figures = typeof was.airship === "object" ? was.airship : undefined
    const flight: AirshipFlightJson = { ...rest, airship: figures ? { ...figures, id: airship } : airship }
    const luminance = typeof was.sign === "object" ? was.sign.luminanceCdM2 : undefined
    if (signLit === false) flight.sign = false
    else if (signColor !== undefined || luminance !== undefined) flight.sign = { ...(signColor ? { color: signColor } : {}), ...(luminance !== undefined ? { luminanceCdM2: luminance } : {}) }
    else if (signLit === true) flight.sign = true
    return flight
  }

  private static typeOf(element: ParameterHolder): AirshipType {
    return AirshipFlight.typeOf(element as unknown as AirshipFlightJson)
  }

  private static ownLight(element: ParameterHolder, name: string): DroneLight | undefined {
    return AirshipParameters.typeOf(element).lights[name]
  }

  /** Whether its sign is lit, as it stands: what it states, else its type's. */
  private static signLit(element: ParameterHolder): boolean {
    const stated = Parameters.read(element, "signLit")
    return typeof stated === "boolean" ? stated : AirshipParameters.typeOf(element).sign?.lit === true
  }

  /** The fields of one light: whether it is out, its colour, how bright, how it flashes; only while its type has it (see DroneParameters). */
  private static light(name: string): ParameterSpec[] {
    const group = DroneParameters.textKey(name)
    const has = (element: ParameterHolder) => AirshipParameters.ownLight(element, name) !== undefined
    const out = (element: ParameterHolder) => {
      const stated = (element as unknown as AirshipView).lights?.[name]
      if (stated === false) return true
      return typeof stated?.off === "boolean" ? stated.off : AirshipParameters.ownLight(element, name)?.off === true
    }
    const lit = (element: ParameterHolder) => has(element) && !out(element)
    return [
      {
        type: "boolean", key: `lights.${name}.off`, group, label: "switchedOff", visibleWhen: has,
        effective: element => (element as unknown as AirshipView).lights?.[name] === false || AirshipParameters.ownLight(element, name)?.off === true
      },
      { type: "colour", key: `lights.${name}.color`, group, label: "colour", visibleWhen: lit, effective: element => AirshipParameters.ownLight(element, name)?.color },
      {
        type: "number", key: `lights.${name}.candela`, min: 0, max: 100000, step: 0.1, unit: "cd", group, label: "intensity", hint: "eachLed",
        visibleWhen: lit, effective: element => AirshipParameters.ownLight(element, name)?.candela
      },
      {
        type: "number", key: `lights.${name}.hz`, min: 0, max: 50, step: 0.05, unit: "Hz", group, label: "flashesASecond", hint: "steadyAtNought",
        visibleWhen: lit, effective: element => AirshipParameters.ownLight(element, name)?.hz ?? 0
      },
      {
        type: "number", key: `lights.${name}.flashS`, min: 0.001, max: 60, step: 0.001, unit: "s", group, label: "eachFlashLasts",
        visibleWhen: element => lit(element) && (((Parameters.read(element, `lights.${name}.hz`) as number | undefined) ?? AirshipParameters.ownLight(element, name)?.hz ?? 0) > 0),
        effective: element => {
          const own = AirshipParameters.ownLight(element, name)
          const hz = (Parameters.read(element, `lights.${name}.hz`) as number | undefined) ?? own?.hz ?? 0
          return own?.flashS ?? (hz > 0 ? Math.round(500 / hz) / 1000 : undefined)
        }
      }
    ]
  }

  static readonly SET: ParameterSet = {
    kind: "airships",
    title: "airships",
    parameters: ([
      { type: "said", key: "title", label: "name", group: AirshipParameters.AIRSHIP },
      {
        type: "choice", key: "airship", required: true, group: AirshipParameters.AIRSHIP, label: "type",
        choices: AirshipTypes.ALL.map(type => ({ value: type.id, label: DroneParameters.textKey(type.id) }))
      },
      {
        type: "set", key: "explains", group: AirshipParameters.AIRSHIP, label: "standsForTheShapes",
        // A shape named that the recording no longer holds is still listed: dropping it silently would be an edit nobody made.
        options: (airship, context) => {
          const shapes = (context as AirshipContext | undefined)?.shapes ?? []
          const named = ((airship as unknown as AirshipView).explains ?? []).filter(id => !shapes.some(shape => shape.value === id))
          return [...shapes, ...named.map(value => ({ value, label: value }))]
        },
        empty: "noShape"
      },
      {
        type: "number", key: "seed", min: 0, max: 4294967295, step: 1, group: AirshipParameters.AIRSHIP, effective: () => 1,
        label: "draw", hint: "whatTheDrawsStartFrom"
      },
      {
        type: "number", key: "wind.fromDeg", min: 0, max: 360, step: 1, unit: "°", group: AirshipParameters.FLIGHT, label: "windFrom",
        effective: () => 0, hint: "whatItNosesInto"
      },
      { type: "number", key: "wind.speedMS", min: 0, max: 60, step: 0.1, unit: "m/s", group: AirshipParameters.FLIGHT, label: "windSpeed", effective: () => 0 },
      { type: "boolean", key: "silent", group: AirshipParameters.FLIGHT, label: "silent", hint: "notEvenItsEngines", visibleWhen: element => AirshipParameters.typeOf(element).sound !== undefined },
      { type: "colour", key: "color", group: AirshipParameters.LOOK, label: "envelope", effective: element => AirshipParameters.typeOf(element).color },
      {
        type: "colour", key: "finColor", group: AirshipParameters.LOOK, label: "fins", effective: element => AirshipParameters.typeOf(element).finColor,
        visibleWhen: element => AirshipParameters.typeOf(element).glowCdM2 === undefined
      },
      {
        type: "boolean", key: "signLit", group: AirshipParameters.LOOK, label: "signLit", hint: "itsSignOfLamps",
        visibleWhen: element => AirshipParameters.typeOf(element).sign !== undefined, effective: element => AirshipParameters.typeOf(element).sign?.lit === true
      },
      {
        type: "colour", key: "signColor", group: AirshipParameters.LOOK, label: "signColour",
        visibleWhen: element => AirshipParameters.typeOf(element).sign !== undefined && AirshipParameters.signLit(element),
        effective: element => AirshipParameters.typeOf(element).sign?.color
      },
      {
        type: "boolean", key: "lit", group: AirshipParameters.LOOK, label: "litFromWithin", hint: "itsEnvelopeGlows", effective: () => true,
        visibleWhen: element => AirshipParameters.typeOf(element).glowCdM2 !== undefined
      },
      ...AirshipParameters.LIGHT_NAMES.flatMap(name => AirshipParameters.light(name))
    ] satisfies ParameterSpec[])
  }

  /** A point of the path: where its middle is at an instant, as a drone's (see DroneParameters.WAYPOINT). */
  static readonly WAYPOINT: ParameterSet = { ...DroneParameters.WAYPOINT, kind: "airships-waypoint" }

  /** A point of the path at `t`, where the airship's path has it then, so that putting it changes nothing until it is edited. */
  static waypointAt(flight: AirshipFlightJson, t: number): DroneWaypoint {
    const points = DroneFlight.pathOf(flight)
    if (points.length === 0) return { t: Math.round(t), eastM: 0, northM: 0, altitudeM: 0 }
    const at = new DronePath(points, false).at(t)
    const round = (value: number) => Math.round(value * 10) / 10
    return { t: Math.round(t), eastM: round(at.eastM), northM: round(at.northM), altitudeM: round(at.upM) }
  }

  /** Makes the airship kind known to the editor. */
  static publish(): void {
    ParameterRegistry.publish(AirshipParameters.SET)
    ParameterRegistry.publish(AirshipParameters.WAYPOINT)
  }
}
