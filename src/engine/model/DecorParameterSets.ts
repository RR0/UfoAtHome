import { Parameters } from "../interpretation/Parameters.js"
import type { ChoiceParameter, NumberParameter, ParameterHolder, ParameterSet, ParameterSpec } from "../interpretation/Parameters.js"
import type { DecorObject, DecorSide } from "./Decor.js"
import { DEFAULT_BUILDING_FLOORS, decorSidesFor, FIXED_WINDOW_MIN_OPACITY_PERCENT, hasWindows, isWindowOpenable } from "./Decor.js"
import { DecorTraits } from "./DecorTraits.js"
import type { ModelParameters } from "./DecorTraits.js"
import type { SaidText } from "./SaidText.js"

/**
 * What a decor object lets an author set beyond where it stands and how big it is, said as a
 * description the editor draws generically (see ParameterSet): a building's floors and windows, a
 * car's windows, a bridge's deck and railing, an overhead line's poles.
 *
 * What applies to an object is what it is: its kind, and what it is drawn as (a model keeps the
 * materials, floors and windows of its file, so the shape's own do not apply: see DecorTraits). A
 * catalogue model can add parameters of its own (see ModelParameters.parameters), which is how an
 * asset brings a setting the editor has never heard of.
 *
 * Each key is a path into the object, so a value is written where the renderer reads it
 * (`windows.front`, `bridge.railing.heightM`). A field left empty states nothing, and the renderer's
 * own default stands: the form shows it greyed.
 */
export class DecorParameterSets {

  /** What a side of an object is called, relative to its heading — used by windows and by the seat of an observer alike. */
  static sideLabel(side: DecorSide): SaidText {
    return DecorParameterSets.SIDE_LABELS[side]
  }

  private static readonly SIDE_LABELS: Record<DecorSide, string> = {
    front: "front",
    behind: "behind",
    left: "left",
    right: "right",
    "front-left": "frontLeft",
    "front-right": "frontRight",
    "behind-left": "behindLeft",
    "behind-right": "behindRight"
  }

  private static readonly WINDOWS = "windows"
  private static readonly BUILDING = "building"
  private static readonly BRIDGE = "bridge"
  private static readonly RAILING = "railing"
  private static readonly WIRE = "overheadLine"

  /** Two keys as one text ("windows" and "front" are "Windows Front", "Fenêtres Avant": see ParameterTexts.resolve). */
  private static together(first: string, second: string): string {
    return `${first} ${second}`
  }

  /** The parameters of this decor object, or none: the kinds the editor needs nothing more for. */
  static of(object: Pick<DecorObject, "kind" | "model" | "observerSide">, published?: ModelParameters): ParameterSet | undefined {
    const parameters: ParameterSpec[] = []
    const model = DecorTraits.drawnAsModel(object)
    if (!model && object.kind === "building") parameters.push(...DecorParameterSets.floors(), ...DecorParameterSets.walls(), ...DecorParameterSets.roof())
    if (!model && hasWindows(object.kind)) parameters.push(...DecorParameterSets.windows(object.kind))
    if (object.kind === "vehicle") parameters.push(...DecorParameterSets.engine())
    if (object.kind === "observer") parameters.push(...DecorParameterSets.observerRecording())
    if (object.kind === "aircraft") parameters.push(...DecorParameterSets.aircraftSound(published))
    if (object.kind === "bridge") parameters.push(...DecorParameterSets.bridge())
    if (object.kind === "wire") parameters.push(...DecorParameterSets.wire())
    // What the model publishes is written under `modelParameters`, so that no key of its can be taken for one of the object's own.
    if (published?.parameters) parameters.push(...published.parameters.map(spec => ({ ...spec, key: `modelParameters.${spec.key}` })))
    if (parameters.length === 0) return undefined
    return { kind: `decor-${object.kind}`, title: "properties", parameters }
  }

  /** The floors of a building, and the one the observer is on. */
  private static floors(): NumberParameter[] {
    const floorsOf = (element: ParameterHolder) => (Parameters.read(element, "floors") as number | undefined) ?? DEFAULT_BUILDING_FLOORS
    return [
      {
        type: "number", key: "floors", min: 0, max: 20, step: 1, effective: () => DEFAULT_BUILDING_FLOORS,
        label: "floors",
        hint: "upperStoriesAboveTheGround",
        group: DecorParameterSets.BUILDING
      },
      {
        type: "number", key: "occupiedFloor", min: 0, max: 20, step: 1, effective: () => 0,
        bounds: element => ({ max: floorsOf(element) }),
        label: "occupiedFloor",
        hint: "theFloorTheWitnessIs",
        group: DecorParameterSets.BUILDING
      }
    ]
  }

  /** The walls of a building: their colour, and the kind of facade they are. Drawn only where all three sizes are stated (see DecorFacade). */
  private static walls(): ParameterSpec[] {
    const group: SaidText = "walls"
    return [
      {
        type: "colour", key: "facade.color", group, fallback: "#d3cab8",
        label: "wallColour",
        hint: "theColourOfTheWalls"
      },
      {
        type: "choice", key: "facade.openings", group,
        label: "facade",
        empty: "aHouseS",
        hint: "aHouseSAWindowEvery",
        choices: [
          { value: "tall", label: "oldBuilding" },
          { value: "lancet", label: "church" },
          { value: "plain", label: "bareWall" },
          { value: "none", label: "noFacade" }
        ]
      }
    ]
  }

  /** The roof of a building: its shape, how far it rises, which way its ridge runs, its colour. */
  private static roof(): ParameterSpec[] {
    const group: SaidText = "roof"
    const pitched = (element: ParameterHolder): boolean => ["gable", "hip", "dome"].includes(String(Parameters.read(element, "roof.shape")))
    return [
      {
        type: "choice", key: "roof.shape", group,
        label: "roof",
        empty: "flat",
        hint: "flatTheBoxTwoSlopes",
        choices: [
          { value: "flat", label: "flat" },
          { value: "gable", label: "twoSlopes" },
          { value: "hip", label: "fourSlopes" },
          { value: "dome", label: "dome" }
        ]
      },
      {
        type: "number", key: "roof.riseM", min: 0, max: 15, step: 0.1, unit: "m", group, effective: () => 3,
        label: "rise",
        hint: "howFarTheRidgeStands",
        visibleWhen: pitched
      },
      {
        type: "choice", key: "roof.ridge", group, required: false,
        label: "ridgeAlong",
        empty: "theWidth",
        choices: [
          { value: "width", label: "theWidth" },
          { value: "depth", label: "theDepth" }
        ],
        visibleWhen: element => Parameters.read(element, "roof.shape") === "gable"
      },
      {
        type: "colour", key: "roof.color", group, fallback: "#7a5a4a",
        label: "roofColour"
      }
    ]
  }

  /** The opacity of the window on each side, 0 (open) to 100 (shut), empty for no window there. A fixed pane never opens. */
  private static windows(kind: DecorObject["kind"]): NumberParameter[] {
    return decorSidesFor(kind).map((side): NumberParameter => ({
      type: "number", key: `windows.${side}`, step: 5, unit: "%",
      min: isWindowOpenable(kind, side) ? 0 : FIXED_WINDOW_MIN_OPACITY_PERCENT, max: 100,
      label: DecorParameterSets.SIDE_LABELS[side],
      summary: DecorParameterSets.together(DecorParameterSets.WINDOWS, DecorParameterSets.SIDE_LABELS[side]),
      hint: "opacityOfTheWindowOn",
      group: DecorParameterSets.WINDOWS
    }))
  }

  /**
   * Whether a decor vehicle is heard running, and what it sounds like (see DecorEngine): no engine is a parked car, silent. Choosing
   * a sound states one, and emptying the choice takes the engine away with its noise.
   */
  private static engine(): ParameterSpec[] {
    const group: SaidText = "engineSound"
    return [
      {
        type: "choice", key: "engine.kind", group,
        label: "engine",
        hint: "whetherTheVehicleIsHeard",
        empty: "silentParked",
        choices: [
          { value: "car", label: "car" },
          { value: "van", label: "van" },
          { value: "truck", label: "truck" },
          { value: "motorcycle", label: "motorcycle" },
          { value: "generic", label: "unknown" }
        ]
      },
      {
        type: "number", key: "engine.noise", min: 0.1, max: 3, step: 0.1, group, effective: () => 1,
        label: "loudness",
        hint: "againstAnOrdinaryOneOf",
        visibleWhen: element => Parameters.read(element, "engine.kind") !== undefined || (element as { engine?: unknown }).engine !== undefined
      }
    ]
  }

  /** Where another observer's own account is, for the scene's menu to open it (see DecorObject.sightingUrl). */
  private static observerRecording(): ParameterSpec[] {
    return [{
      type: "text", key: "sightingUrl", placeholder: "https://…/sighting.json",
      label: "theirOwnRecordingURL"
    }]
  }

  /**
   * What an aircraft in flight sounds like (see DecorObject.aircraftSound). It is heard like the traffic of a record, from its distance, late by
   * the time sound takes, and shifted as it comes and goes: the choice is the sort of noise it makes at the source.
   */
  private static aircraftSound(published?: ModelParameters): ParameterSpec[] {
    const modelSays = published?.sound
    return [{
      type: "choice", key: "aircraftSound",
      group: "sound",
      label: "noiseInFlight",
      hint: "whatItSoundsLikeWhile",
      empty: modelSays === "silent"
        ? "silentAsTheModel"
        : "asTheModel",
      choices: [
        { value: "airliner-narrow", label: "aircraftNarrowBodyAirliner" },
        { value: "airliner-wide", label: "aircraftWideBodyAirliner" },
        { value: "regional-jet", label: "aircraftRegionalJet" },
        { value: "regional-turboprop", label: "aircraftTurboprop" },
        { value: "business-jet", label: "aircraftBusinessJet" },
        { value: "light-piston", label: "aircraftLightPistonAircraft" },
        { value: "helicopter-light", label: "aircraftLightHelicopter" },
        { value: "helicopter-medium", label: "aircraftMediumHelicopter" },
        { value: "helicopter-heavy", label: "aircraftHeavyHelicopter" },
        { value: "military-jet", label: "aircraftMilitaryJet" },
        { value: "ultralight", label: "aircraftUltralight" },
        { value: "unmanned", label: "aircraftDrone" },
        { value: "glider", label: "aircraftGlider" },
        { value: "silent", label: "aircraftSilent" }
      ]
    }]
  }

  /** How a bridge is built: the defaults are those of an ordinary French overpass (see BridgeStructure). */
  private static bridge(): ParameterSpec[] {
    const field = (key: string, label: SaidText, min: number, max: number, step: number, unit: string, effective: number | undefined,
      group: SaidText, hint?: SaidText): NumberParameter => ({ type: "number", key, label, min, max, step, unit, group, hint, effective: effective === undefined ? undefined : () => effective })
    return [
      field("bridge.spanM", "span", 0.1, 5000, 0.1, "m", undefined, DecorParameterSets.BRIDGE,
        "metresOfOpenSpanUnder"),
      field("bridge.deckThicknessM", "deckThickness", 0.1, 20, 0.1, "m", 1.2, DecorParameterSets.BRIDGE),
      field("bridge.railing.heightM", "height", 0.1, 5, 0.05, "m", 1.05, DecorParameterSets.RAILING),
      field("bridge.railing.postSpacingM", "postSpacing", 0.2, 20, 0.1, "m", 1.5, DecorParameterSets.RAILING),
      field("bridge.railing.rails", "rails", 0, 8, 1, "", 2, DecorParameterSets.RAILING)
    ]
  }

  /** How an overhead line is built: the strands are a table, stated in the file; the rest is set here. */
  private static wire(): ParameterSpec[] {
    const poles: ChoiceParameter = {
      type: "choice", key: "wire.poles", group: DecorParameterSets.WIRE,
      label: "poles",
      hint: "whichEndsStandOnA",
      choices: [
        { value: "both", label: "both" },
        { value: "start", label: "start" },
        { value: "end", label: "end" },
        { value: "none", label: "noPoles" }
      ],
      effective: () => "both"
    }
    return [
      poles,
      {
        type: "number", key: "wire.diameterM", min: 0.001, max: 0.2, step: 0.001, unit: "m", effective: () => 0.008, group: DecorParameterSets.WIRE,
        label: "strandThickness"
      },
      {
        type: "number", key: "wire.poleHeightM", min: 0.5, max: 100, step: 0.1, unit: "m", group: DecorParameterSets.WIRE,
        label: "poleHeight",
        hint: "emptyHalfAMetreOver"
      }
    ]
  }
}
