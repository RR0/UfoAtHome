import type { DecorObject } from "../../engine/model/Decor.js"
import type { Surroundings } from "./SurroundingsProvider.js"
import { TrafficSignals } from "../../engine/model/LightRig.js"

/** The kinds of decor a survey brings. */
export type SurveyedKind = "tree" | "building" | "bridge" | "wire" | "streetlight" | "trafficlight" | "crossing" | "roadsign"

export interface SurveyedDecorOptions {
  /** What the recording already has that no survey brought: what the author placed. Nothing of a kind is brought where it holds one of that kind. */
  kept: readonly DecorObject[]
  /** What a kind is called ("Tree", "Bridge"), for the names that carry one: "Bridge (Rue de Carentan)". */
  kindName(kind: SurveyedKind): string
}

/** The decor a survey brought, and which kinds the author already had of their own and so were not brought. */
export interface SurveyedDecorResult {
  planted: DecorObject[]
  handPlaced: boolean
}

/**
 * What a survey found, as the decor objects of a recording: each tree, building, bridge and span of line at its measured place, height and width,
 * marked with the survey it came from (see DecorObject.origin) and named as the survey names it, else numbered as the recording's own objects of that
 * kind are.
 *
 * Shared by the editor, which takes the surroundings of the place the author gives, and by the scripts that freeze them into a published recording:
 * the same survey must give the same objects whichever of them asks.
 */
export class SurveyedDecor {
  /** A building about three metres a floor, the common height of one. */
  private static readonly FLOOR_HEIGHT_M = 3
  /** How long the bands of a crossing are along the road: the French minimum in town. */
  static readonly CROSSING_LENGTH_M = 2.5

  static of(providerId: string, found: Surroundings, options: SurveyedDecorOptions): SurveyedDecorResult {
    const { kept } = options
    const has = (kind: SurveyedKind): boolean => kept.some(object => object.kind === kind)
    const hand = {
      tree: has("tree"), building: has("building"), bridge: has("bridge"), wire: has("wire"), streetlight: has("streetlight"),
      trafficlight: has("trafficlight"), crossing: has("crossing"), roadsign: has("roadsign")
    }
    const taken = new Set(kept.map(object => object.id))
    let serial = 0
    const nextId = (): string => {
      let id: string
      do id = `${providerId}-${++serial}`; while (taken.has(id))
      taken.add(id)
      return id
    }
    const numbers: Record<SurveyedKind, number> = {
      tree: kept.filter(object => object.kind === "tree").length,
      building: kept.filter(object => object.kind === "building").length,
      bridge: kept.filter(object => object.kind === "bridge").length,
      wire: kept.filter(object => object.kind === "wire").length,
      streetlight: kept.filter(object => object.kind === "streetlight").length,
      trafficlight: kept.filter(object => object.kind === "trafficlight").length,
      crossing: kept.filter(object => object.kind === "crossing").length,
      roadsign: kept.filter(object => object.kind === "roadsign").length
    }
    // What a survey names is called by its name (the town hall), the parts of it after the first numbered ("Mairie de Saint-Lô (2)"); what it does not is "Building 12".
    const names = new Set(kept.map(object => typeof object.title === "string" ? object.title : ""))
    const titled = (kind: SurveyedKind, name: string | undefined): string => {
      const wanted = name ?? `${options.kindName(kind)} ${++numbers[kind]}`
      let title = wanted
      for (let n = 2; names.has(title); n++) title = `${wanted} (${n})`
      names.add(title)
      return title
    }
    // Each kind is as old as the newest of what it was drawn from: a tree is the laser's, a building the map's outline under the laser's roof and
    // the photograph's colour, a bridge or a line the map's with the laser's height, a lamp, a light, a crossing or a sign the volunteers' map's.
    const dates = found.dates ?? {}
    const newest = (...days: (string | undefined)[]): { surveyedOn?: string } => {
      const latest = days.filter((day): day is string => day !== undefined).sort().at(-1)
      return latest ? { surveyedOn: latest } : {}
    }
    const planted: DecorObject[] = []
    if (!hand.tree) {
      for (const tree of found.trees) {
        planted.push({
          id: nextId(), kind: "tree", title: titled("tree", undefined), eastM: tree.eastM, northM: tree.northM, headingDeg: 0, lit: false,
          sizeM: { widthM: tree.widthM, lengthM: tree.widthM, heightM: tree.heightM }, origin: providerId, ...newest(dates.laser)
        })
      }
    }
    if (!hand.building) {
      for (const building of found.buildings) {
        planted.push({
          id: nextId(), kind: "building", title: titled("building", building.name), eastM: building.eastM, northM: building.northM,
          headingDeg: building.headingDeg, lit: false,
          sizeM: { widthM: building.widthM, lengthM: building.lengthM, heightM: building.heightM },
          // A church or a monument has no floors to count: its walls are of one height (see DecorFacade.openings).
          ...(building.style === "church" || building.style === "monument" ? {} : {
            floors: building.floors ?? Math.max(1, Math.round((building.heightM - (building.roof?.riseM ?? 0)) / (building.facade?.storeyM ?? SurveyedDecor.FLOOR_HEIGHT_M)))
          }),
          ...(building.roof ? { roof: building.roof } : {}), ...(building.facade ? { facade: building.facade } : {}), origin: providerId, ...newest(dates.map, dates.laser, building.roof?.color ? dates.photo : undefined)
        })
      }
    }
    if (!hand.bridge) {
      for (const bridge of found.bridges) {
        planted.push({
          id: nextId(), kind: "bridge", title: titled("bridge", bridge.name ? `${options.kindName("bridge")} (${bridge.name})` : undefined),
          eastM: bridge.eastM, northM: bridge.northM, headingDeg: bridge.headingDeg, lit: false,
          sizeM: { lengthM: bridge.lengthM, widthM: bridge.widthM, heightM: bridge.heightM }, origin: providerId, ...newest(dates.map, dates.laser)
        })
      }
    }
    if (!hand.wire) {
      for (const line of found.lines) {
        planted.push({
          id: nextId(), kind: "wire", title: titled("wire", `${options.kindName("wire")} (${line.voltage})`), eastM: line.eastM, northM: line.northM,
          headingDeg: line.headingDeg, lit: false,
          sizeM: { lengthM: line.lengthM, heightM: line.heightM },
          wire: { strands: line.acrossM.map(acrossM => ({ heightM: line.heightM, acrossM })), poles: "both", poleHeightM: line.poleHeightM },
          origin: providerId, ...newest(dates.map, dates.laser)
        })
      }
    }
    if (!hand.streetlight) {
      for (const lamp of found.lamps ?? []) {
        // No `lit`: a public lamp is lit by the dark, not by the author (see SceneRenderer's photocell).
        const spec = { ...(lamp.colorTemperatureK ? { colorTemperatureK: lamp.colorTemperatureK } : {}), ...(lamp.lumens ? { lumens: lamp.lumens } : {}), ...(lamp.mount === "wall" ? { mount: "wall" as const } : {}), ...(lamp.supposed ? { supposed: true } : {}) }
        planted.push({
          id: nextId(), kind: "streetlight", title: titled("streetlight", undefined), eastM: lamp.eastM, northM: lamp.northM, headingDeg: 0,
          ...(lamp.heightM ? { sizeM: { heightM: lamp.heightM } } : {}), ...(Object.keys(spec).length > 0 ? { lamp: spec } : {}), origin: providerId, ...newest(dates.lamps)
        })
      }
    }
    if (!hand.trafficlight) {
      for (const signal of found.signals ?? []) {
        // Its lamps are its cycle (see TrafficSignals), which is on day and night: a traffic light is not switched by the dark.
        planted.push({
          id: nextId(), kind: "trafficlight", title: titled("trafficlight", undefined), eastM: signal.eastM, northM: signal.northM, headingDeg: signal.headingDeg,
          lights: signal.for === "pedestrians" ? TrafficSignals.pedestrianLights(signal.phase) : TrafficSignals.vehicleLights(signal.phase),
          origin: providerId, ...newest(dates.lamps)
        })
      }
    }
    if (!hand.crossing) {
      for (const crossing of found.crossings ?? []) {
        planted.push({
          id: nextId(), kind: "crossing", title: titled("crossing", undefined), eastM: crossing.eastM, northM: crossing.northM, headingDeg: crossing.headingDeg,
          sizeM: { widthM: crossing.widthM, lengthM: SurveyedDecor.CROSSING_LENGTH_M }, origin: providerId, ...newest(dates.lamps)
        })
      }
    }
    if (!hand.roadsign) {
      for (const sign of found.signs ?? []) {
        planted.push({
          id: nextId(), kind: "roadsign", title: titled("roadsign", undefined), eastM: sign.eastM, northM: sign.northM, headingDeg: sign.headingDeg,
          sign: { face: sign.face, ...(sign.code ? { code: sign.code } : {}), ...(sign.value ? { value: sign.value } : {}) }, origin: providerId, ...newest(dates.lamps)
        })
      }
    }
    return { planted, handPlaced: Object.values(hand).some(Boolean) }
  }
}
