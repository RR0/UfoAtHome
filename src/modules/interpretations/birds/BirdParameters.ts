import { ParameterRegistry, Parameters } from "../../../engine/interpretation/Parameters.js"
import type { ParameterHolder, ParameterSet, ParameterSpec } from "../../../engine/interpretation/Parameters.js"
import { BirdFlock } from "./BirdFlock.js"
import type { BirdFlockJson, BirdWaypoint } from "./BirdFlock.js"
import { BirdSpecies } from "./BirdSpecies.js"
import { FlockSimulation } from "./FlockSimulation.js"
import type { BirdColourKey } from "./BirdSpecies.js"

/** What the form of a flock needs of the editor: the shapes the birds may stand for. */
export interface BirdContext {
  shapes: { value: string, label: string }[]
}

/**
 * What a flock of birds lets its author set (see BirdFlockJson): what birds, how many and how arranged, how they fly, what they look like
 * and what lights them, and the points of their path (WAYPOINT). The bird kind's whole contribution to the editor: the forms are built from
 * these sets (see ParameterForm). Every bird's own track is computed from them (see BirdFlock.bodiesOf), never offered.
 *
 * An empty field shows what is in force: the species' wingbeat as Pennycuick predicts it, its way of flying, its colours.
 */
export class BirdParameters {
  private static readonly FLOCK = "flock"
  private static readonly FORMATION = "formation"
  private static readonly FLIGHT = "flight"
  private static readonly LOOK = "look"

  /** The species of a flock as stated, or the one it is drawn as when it states none the list has. */
  private static speciesOf(element: ParameterHolder): BirdSpecies {
    return BirdFlock.speciesOf(element as unknown as BirdFlockJson)
  }

  /** The key of a species' name in the texts: "herring-gull" is "herringGull". */
  static speciesLabel(id: string): string {
    return id.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())
  }

  /** The arrangement in force: the one stated, else the one a flock that states none flies in (see formationUnstated). */
  private static formationOf(element: ParameterHolder): string {
    const stated = Parameters.read(element, "formation.kind")
    return typeof stated === "string" ? stated : BirdParameters.formationUnstated(element)
  }

  /** What a flock that states no arrangement flies in: a crowd for several birds, one bird alone otherwise (see BirdFlock.arranged). */
  private static formationUnstated(element: ParameterHolder): string {
    return ((Parameters.read(element, "count") as number | undefined) ?? 1) > 1 ? "cluster" : "single"
  }

  private static flightOf(element: ParameterHolder): string {
    const stated = Parameters.read(element, "flight.kind")
    return typeof stated === "string" ? stated : BirdParameters.speciesOf(element).flight.kind
  }

  /** The bursts and glides in force: the flock's, else its species', else those of a gull flying as its path asks. */
  private static burstOf(element: ParameterHolder, key: "beats" | "glideS"): number {
    const stated = Parameters.read(element, `flight.${key}`)
    if (typeof stated === "number") return stated
    const own = BirdParameters.speciesOf(element).flight
    return own.kind === "flapping" ? BirdParameters.BURST[key] : own[key]
  }

  /** What a flock that flies in bursts, or as its path asks, beats and glides when neither it nor its species says. */
  static readonly BURST = { beats: 4, glideS: 2 }

  private static colour(key: BirdColourKey, label: string, hint?: string): ParameterSpec {
    return {
      type: "colour", key: `colours.${key}`, group: BirdParameters.LOOK, label, ...(hint ? { hint } : {}),
      effective: element => BirdSpecies.colourOf(BirdParameters.speciesOf(element), key)
    }
  }

  static readonly SET: ParameterSet = {
    kind: "birds",
    title: "birds",
    parameters: ([
      { type: "said", key: "title", label: "name", group: BirdParameters.FLOCK },
      {
        type: "choice", key: "species", required: true, group: BirdParameters.FLOCK, label: "species",
        choices: BirdSpecies.ALL.map(species => ({ value: species.id, label: BirdParameters.speciesLabel(species.id) }))
      },
      { type: "number", key: "count", min: 1, max: 2000, step: 1, group: BirdParameters.FLOCK, effective: () => 1, label: "howMany" },
      {
        type: "set", key: "explains", group: BirdParameters.FLOCK, label: "standForTheShapes", hint: "theWholeFlockTakenForOne",
        visibleWhen: element => (element as unknown as BirdFlockJson).explainsEach === undefined,
        // A shape named that the recording no longer holds is still listed: dropping it silently would be an edit nobody made.
        options: (flock, context) => {
          const shapes = (context as BirdContext | undefined)?.shapes ?? []
          const named = ((flock as unknown as BirdFlockJson).explains ?? []).filter(id => !shapes.some(shape => shape.value === id))
          return [...shapes, ...named.map(value => ({ value, label: value }))]
        },
        empty: "noShape"
      },
      {
        type: "number", key: "seed", min: 0, max: 4294967295, step: 1, group: BirdParameters.FLOCK, effective: () => 1,
        label: "draw", hint: "whatTheDrawsStartFrom"
      },
      {
        type: "choice", key: "formation.kind", group: BirdParameters.FORMATION, label: "pattern",
        // What the empty choice says: what is flown when none is chosen, not the choice made (it was listed twice).
        effective: element => BirdParameters.formationUnstated(element),
        choices: [
          { value: "single", label: "oneBird" },
          { value: "v", label: "inAV" },
          { value: "j", label: "inAJ" },
          { value: "echelon", label: "inEchelon" },
          { value: "column", label: "inAColumn" },
          { value: "front", label: "abreast" },
          { value: "cluster", label: "aLooseCrowd" },
          { value: "flock", label: "aFlockThatFliesItself" }
        ]
      },
      {
        type: "number", key: "formation.angleDeg", min: 5, max: 180, step: 1, unit: "°", group: BirdParameters.FORMATION, effective: () => 70,
        label: "angleBetweenTheArms", hint: "aGooseVMeasures",
        visibleWhen: element => ["v", "j"].includes(BirdParameters.formationOf(element))
      },
      {
        type: "number", key: "formation.asymmetry", min: 0, max: 100, step: 5, unit: "%", scale: 100, group: BirdParameters.FORMATION,
        effective: () => 0.7, label: "onTheRightArm",
        visibleWhen: element => BirdParameters.formationOf(element) === "j"
      },
      {
        type: "number", key: "formation.spacing", min: 0.2, max: 20, step: 0.1, group: BirdParameters.FORMATION,
        effective: element => ["v", "j", "echelon", "column"].includes(BirdParameters.formationOf(element)) ? 1 : 1.5,
        label: "spacingInWingspans", hint: "betweenNeighbours",
        visibleWhen: element => BirdParameters.formationOf(element) !== "single"
      },
      {
        type: "number", key: "formation.wander", min: 0, max: 5, step: 0.05, group: BirdParameters.FORMATION,
        effective: element => ["v", "j", "echelon", "column"].includes(BirdParameters.formationOf(element)) ? 0.15 : 0.4,
        label: "strayInWingspans", hint: "howMuchEachBirdStrays",
        visibleWhen: element => !["single", "flock"].includes(BirdParameters.formationOf(element))
      },
      {
        type: "number", key: "formation.informed", min: 0, max: 100, step: 1, unit: "%", scale: 100, group: BirdParameters.FORMATION,
        effective: () => FlockSimulation.INFORMED_SHARE, label: "informed", hint: "aFewKnowWhereTheFlockIsGoing",
        visibleWhen: element => BirdParameters.formationOf(element) === "flock"
      },
      {
        type: "number", key: "wingbeatHz", min: 0.5, max: 30, step: 0.01, unit: "Hz", group: BirdParameters.FLIGHT,
        effective: element => {
          const flock = element as unknown as BirdFlockJson
          const up = BirdFlock.pathOf(flock)[0]?.upM ?? 0
          return Math.round(BirdSpecies.wingbeatHz(BirdParameters.speciesOf(element), BirdSpecies.airDensityAt((flock.originElevationM ?? 0) + up)) * 100) / 100
        },
        label: "wingbeat", hint: "predictedFromItsSpecies"
      },
      {
        type: "choice", key: "flight.kind", group: BirdParameters.FLIGHT, label: "howTheyFly",
        effective: element => BirdParameters.speciesOf(element).flight.kind,
        choices: [
          { value: "flapping", label: "flappingAllTheTime" },
          { value: "bursts", label: "inBurstsAndGlides" },
          { value: "path", label: "asTheirPathAsks" }
        ]
      },
      {
        type: "number", key: "flight.beats", min: 1, max: 50, step: 1, group: BirdParameters.FLIGHT, label: "wingbeatsABurst",
        effective: element => BirdParameters.burstOf(element, "beats"),
        visibleWhen: element => BirdParameters.flightOf(element) !== "flapping"
      },
      {
        type: "number", key: "flight.glideS", min: 0, max: 60, step: 0.1, unit: "s", group: BirdParameters.FLIGHT, label: "glideBetween",
        effective: element => BirdParameters.burstOf(element, "glideS"),
        visibleWhen: element => BirdParameters.flightOf(element) !== "flapping"
      },
      {
        type: "number", key: "originElevationM", min: -500, max: 6000, step: 1, unit: "m", group: BirdParameters.FLIGHT, effective: () => 0,
        label: "thePlaceSGroundAboveTheSea", hint: "whatSetsHowThinTheAir"
      },
      BirdParameters.colour("upperColor", "upperSide", "theBackAndTheUpperSide"),
      BirdParameters.colour("underColor", "underSide", "theBellyAndTheUnderSide"),
      BirdParameters.colour("tipColor", "wingTips"),
      BirdParameters.colour("headColor", "head"),
      BirdParameters.colour("neckColor", "neck"),
      BirdParameters.colour("billColor", "bill"),
      {
        type: "number", key: "lightFromBelow.lux", min: 0, max: 10000, step: 0.1, unit: "lx", group: BirdParameters.LOOK, effective: () => 0,
        label: "litFromBelow", hint: "theLampsOfATown"
      },
      {
        type: "colour", key: "lightFromBelow.color", group: BirdParameters.LOOK, fallback: "#ffd7a0", label: "lightFromBelowColour",
        visibleWhen: element => typeof Parameters.read(element, "lightFromBelow.lux") === "number"
      }
    ] satisfies ParameterSpec[])
  }

  /** Whether a point of the path is said as a direction and a distance from the observer, rather than as metres east and north. */
  private static angular(point: ParameterHolder): boolean {
    return typeof point.azimuthDeg === "number"
  }

  /** A point of the path: where the flock (its leader for a line, its middle otherwise) is at an instant. */
  static readonly WAYPOINT: ParameterSet = {
    kind: "birds-waypoint",
    title: "pointOfThePath",
    parameters: ([
      { type: "number", key: "t", min: -36000, max: 36000, step: 0.1, unit: "s", scale: 0.001, required: true, label: "time", hint: "secondsOfTheRecording" },
      {
        // From the observer, from a decor object, or as degrees: see PositionInputElement.
        type: "position", key: "eastM", secondKey: "northM", saidKey: "saidPosition", native: "local", step: 1, rangeM: 100000,
        label: "position", visibleWhen: point => !BirdParameters.angular(point)
      },
      {
        type: "number", key: "altitudeM", min: -500, max: 10000, step: 0.1, unit: "m", required: true, label: "height", hint: "aboveTheGroundOfThePlace",
        visibleWhen: point => !BirdParameters.angular(point)
      },
      {
        type: "number", key: "azimuthDeg", min: 0, max: 360, step: 0.1, unit: "°", required: true, label: "azimuth",
        visibleWhen: point => BirdParameters.angular(point)
      },
      {
        type: "number", key: "altitudeDeg", min: -90, max: 90, step: 0.1, unit: "°", required: true, label: "elevation",
        visibleWhen: point => BirdParameters.angular(point)
      },
      {
        type: "number", key: "distanceM", min: 0, max: 100000, step: 1, unit: "m", required: true, label: "distance",
        visibleWhen: point => BirdParameters.angular(point)
      },
      {
        type: "number", key: "eyeHeightM", min: 0, max: 10000, step: 0.1, unit: "m", effective: () => 1.6, label: "eyeHeight",
        visibleWhen: point => BirdParameters.angular(point)
      }
    ] satisfies ParameterSpec[])
  }

  /**
   * A point of the path at `t`, where the flock is then: between two points, or held at the nearest end (as the flock is, see
   * BirdFlockJson.path), so that putting it changes nothing until it is edited. Said in metres, whatever its neighbours are said in.
   */
  static waypointAt(flock: BirdFlockJson, t: number): BirdWaypoint {
    const path = BirdFlock.pathOf(flock)
    const round = (value: number) => Math.round(value * 10) / 10
    if (path.length === 0) return { t, eastM: 0, northM: 0, altitudeM: 0 }
    const after = path.findIndex(point => point.t >= t)
    const [a, b] = after <= 0 ? [path[Math.max(after, 0)], path[Math.max(after, 0)]] : [path[after - 1], path[after]]
    const at = after < 0 ? path[path.length - 1] : undefined
    const f = at || b.t === a.t ? 0 : (t - a.t) / (b.t - a.t)
    const from = at ?? a
    const to = at ?? b
    return {
      t: Math.round(t),
      eastM: round(from.eastM + (to.eastM - from.eastM) * f),
      northM: round(from.northM + (to.northM - from.northM) * f),
      altitudeM: round(from.upM + (to.upM - from.upM) * f)
    }
  }

  /** Makes the bird kind known to the editor. */
  static publish(): void {
    ParameterRegistry.publish(BirdParameters.SET)
    ParameterRegistry.publish(BirdParameters.WAYPOINT)
  }
}
