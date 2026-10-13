import type { DecorObject } from "../../engine/model/Decor.js"
import type { Surroundings } from "./SurroundingsProvider.js"

/** The kinds of decor a survey brings. */
export type SurveyedKind = "tree" | "building" | "bridge" | "wire" | "streetlight"

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

  static of(providerId: string, found: Surroundings, options: SurveyedDecorOptions): SurveyedDecorResult {
    const { kept } = options
    const has = (kind: SurveyedKind): boolean => kept.some(object => object.kind === kind)
    const hand = { tree: has("tree"), building: has("building"), bridge: has("bridge"), wire: has("wire"), streetlight: has("streetlight") }
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
      streetlight: kept.filter(object => object.kind === "streetlight").length
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
    const planted: DecorObject[] = []
    if (!hand.tree) {
      for (const tree of found.trees) {
        planted.push({
          id: nextId(), kind: "tree", title: titled("tree", undefined), eastM: tree.eastM, northM: tree.northM, headingDeg: 0, lit: false,
          sizeM: { widthM: tree.widthM, lengthM: tree.widthM, heightM: tree.heightM }, origin: providerId
        })
      }
    }
    if (!hand.building) {
      for (const building of found.buildings) {
        planted.push({
          id: nextId(), kind: "building", title: titled("building", building.name), eastM: building.eastM, northM: building.northM,
          headingDeg: building.headingDeg, lit: false,
          sizeM: { widthM: building.widthM, lengthM: building.lengthM, heightM: building.heightM },
          floors: building.floors ?? Math.max(1, Math.round((building.heightM - (building.roof?.riseM ?? 0)) / SurveyedDecor.FLOOR_HEIGHT_M)),
          ...(building.roof ? { roof: building.roof } : {}), origin: providerId
        })
      }
    }
    if (!hand.bridge) {
      for (const bridge of found.bridges) {
        planted.push({
          id: nextId(), kind: "bridge", title: titled("bridge", bridge.name ? `${options.kindName("bridge")} (${bridge.name})` : undefined),
          eastM: bridge.eastM, northM: bridge.northM, headingDeg: bridge.headingDeg, lit: false,
          sizeM: { lengthM: bridge.lengthM, widthM: bridge.widthM, heightM: bridge.heightM }, origin: providerId
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
          origin: providerId
        })
      }
    }
    if (!hand.streetlight) {
      for (const lamp of found.lamps ?? []) {
        // No `lit`: a public lamp is lit by the dark, not by the author (see SceneRenderer's photocell).
        planted.push({
          id: nextId(), kind: "streetlight", title: titled("streetlight", undefined), eastM: lamp.eastM, northM: lamp.northM, headingDeg: 0,
          ...(lamp.heightM ? { sizeM: { heightM: lamp.heightM } } : {}), origin: providerId
        })
      }
    }
    return { planted, handPlaced: hand.tree || hand.building || hand.bridge || hand.wire || hand.streetlight }
  }
}
