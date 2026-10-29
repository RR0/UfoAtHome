import type { DecorKind, DecorObject, DecorPlacementKeyframe, DecorSide, DecorSize } from "./Decor.js"
import { canHoldObserver, resolveDecorHeadlightsAt, resolveDecorLitAt, resolveDecorPlacementAt } from "./Decor.js"
import type { HeadlightMode } from "./Headlights.js"
import { LightRigs } from "./LightRig.js"
import type { SaidText } from "./SaidText.js"
import type { SaidPosition } from "./SaidPosition.js"

/** What the editor knows about the object on show, which the object alone cannot say. */
export interface DecorBaseContext {
  kind: DecorKind
  /** What the built-in shape measures: shown, greyed, where a size is not stated. */
  natural?: DecorSize
  /** Which of the fields mean anything for this object as it is drawn (see DecorTraits). */
  traits: { color: boolean, lit: boolean, headlights: boolean, lights: boolean, observerSide: boolean }
  /** The rigs of lamps that suit this kind, by the name the reader's language gives them. */
  lightRigs: ReadonlyArray<{ value: string, label: string }>
  /** The seats an observer can have in this kind of object. */
  seats: ReadonlyArray<{ value: string, label: SaidText }>
  /** The catalogue's models for this kind, which the object can be drawn as. */
  models: ReadonlyArray<{ value: string, label: SaidText }>
  /** The model this kind is drawn as when none is chosen, if it has one: what the empty choice stands for. */
  defaultModelId?: string
}

/**
 * A decor object as the fields of its base properties show it at one instant: where it stands and which way it
 * faces at the playhead (an object that moves is somewhere quite else than the place it was created at), its
 * colour and measures when it states them, whether it is lit then, which rig of lamps it carries, where the
 * observer sits in it.
 *
 * What the form edits is this view and not the object, because several of these are not plain properties of
 * it: a place is a keyframe for an object that moves and a plain field for one that does not, a lit state is a
 * keyframe too, and the rig of lamps is recognised by the lamps it made. An edit of one field becomes the change
 * of the object it stands for (see apply), and of that one only.
 */
export interface DecorBaseView {
  title?: SaidText
  eastM: number
  northM: number
  /** How the place at this instant was said: the object's own, or its track's keyframe at this very instant (see DecorObject.saidPosition). */
  saidPosition?: SaidPosition
  altitudeM: number
  headingDeg: number
  color?: string
  sizeM?: { widthM?: number, lengthM?: number, heightM?: number }
  lit: boolean
  /** How a vehicle's lights are set then (see HeadlightMode): never empty, what its `lit` switch says being the dipped beam or nothing. */
  headlights: HeadlightMode
  /** The id of the rig the object's lamps came from, or "" for none. */
  lightRig: string
  observerSide?: string
  /** The model it is drawn as, by catalogue id or by an address with its credit (see DecorModelRef). */
  model?: DecorObject["model"]
}

export class DecorBase {

  /** The rig a public lamp's own lamp is: the lamp it is built with, without a declared one (see apply). */
  static readonly STREETLIGHT_RIG = "streetlamp"

  /** The rig a decor object's own lamps came from, recognised by the ids of the lamps it produced; a street lamp's built-in lamp is the street lamp's rig. */
  static rigOf(decor: Pick<DecorObject, "kind" | "lights">): string {
    if (decor.kind === "streetlight" && !decor.lights?.length) return DecorBase.STREETLIGHT_RIG
    const carried = decor.lights?.map(light => light.id).join() ?? ""
    return LightRigs.forKind(decor.kind).find(rig => rig.create().map(light => light.id).join() === carried)?.id ?? ""
  }

  /** The view of an object at `t`; places are as a field shows them, a hundredth of a metre at most. */
  /** `sunAltitudeDeg`: the Sun at `t`, which switches a lamp on its photocell (see resolveDecorLitAt). */
  static viewOf(decor: DecorObject, t: number, sunAltitudeDeg?: number): DecorBaseView {
    const placement = resolveDecorPlacementAt(decor, t)
    const round = (value: number) => Number(value.toFixed(2))
    return {
      title: decor.title,
      eastM: round(placement.eastM),
      northM: round(placement.northM),
      saidPosition: decor.track ? decor.track.find(keyframe => keyframe.t === t)?.saidPosition : decor.saidPosition,
      altitudeM: round(placement.altitudeM),
      headingDeg: round(placement.headingDeg ?? 0),
      color: decor.color,
      sizeM: decor.sizeM ? { ...decor.sizeM } : undefined,
      lit: resolveDecorLitAt(decor, t, sunAltitudeDeg),
      headlights: resolveDecorHeadlightsAt(decor, t),
      lightRig: DecorBase.rigOf(decor),
      observerSide: decor.observerSide,
      model: decor.model ? { ...decor.model } : undefined
    }
  }

  /**
   * The object after an edit of the field `key` of its view `view`, at `t`: that field's change and no other, so that
   * renaming an object does not restate where it stands, nor typing a width its colour.
   */
  static apply(decor: DecorObject, view: DecorBaseView, key: string, t: number): DecorObject {
    switch (key) {
      case "title":
        return { ...decor, title: view.title }
      case "eastM":
      case "northM":
      case "saidPosition":
      case "altitudeM":
      case "headingDeg":
        return DecorBase.placed(decor, view, t)
      case "color":
        return { ...decor, color: view.color }
      case "sizeM.widthM":
      case "sizeM.lengthM":
      case "sizeM.heightM": {
        // Each axis stands on its own: pacing out the length of a shed states ONE number, and the other two stay unmeasured
        // rather than being filled in from the built-in shape's proportions, which the placeholder already shows, in grey.
        const size = view.sizeM
        const stated = size !== undefined && (size.widthM !== undefined || size.lengthM !== undefined || size.heightM !== undefined)
        return { ...decor, sizeM: stated ? { widthM: size!.widthM, lengthM: size!.lengthM, heightM: size!.heightM } : undefined }
      }
      case "lit": {
        const litKeyframes = [...(decor.litKeyframes ?? []).filter(keyframe => keyframe.t !== t), { t, lit: view.lit }].sort((a, b) => a.t - b.t)
        return { ...decor, litKeyframes }
      }
      case "headlights": {
        const headlightKeyframes = [...(decor.headlightKeyframes ?? []).filter(keyframe => keyframe.t !== t), { t, mode: view.headlights }].sort((a, b) => a.t - b.t)
        return { ...decor, headlightKeyframes }
      }
      case "lightRig": {
        // A street lamp has its lamp: choosing the street lamp's rig keeps it as it is built, not a second one declared over it, and choosing none
        // is a column whose lamp is out.
        if (decor.kind === "streetlight" && view.lightRig === DecorBase.STREETLIGHT_RIG) return { ...decor, lights: undefined }
        if (decor.kind === "streetlight" && !view.lightRig) return { ...decor, lights: undefined, lit: false, litKeyframes: undefined }
        const rig = LightRigs.byId(view.lightRig === "" ? undefined : view.lightRig)
        return { ...decor, lights: rig ? rig.create() : undefined }
      }
      case "observerSide":
        // Only a kind that can hold an observer states a seat, whatever a shared field was left showing.
        return { ...decor, observerSide: canHoldObserver(decor.kind) && view.observerSide ? view.observerSide as DecorSide : undefined }
      case "model.id":
        // Choosing from the catalogue replaces an address: the one that was chosen last is the model.
        return { ...decor, model: view.model?.id ? { id: view.model.id } : undefined }
      case "model":
        return { ...decor, model: view.model }
      default:
        return decor
    }
  }

  /**
   * Where the object stands, written: at the playhead as a keyframe of its track when it has one — and giving a still
   * object an altitude starts a trajectory of a single keyframe, which is exactly what "it sits up there" means — and
   * as its own fields otherwise.
   */
  private static placed(decor: DecorObject, view: DecorBaseView, t: number): DecorObject {
    const headingDeg = ((view.headingDeg % 360) + 360) % 360
    const track = decor.track ?? (view.altitudeM !== 0 ? [] : undefined)
    if (track) {
      const keyframe: DecorPlacementKeyframe = { t, eastM: view.eastM, northM: view.northM, altitudeM: view.altitudeM, headingDeg }
      if (view.saidPosition) keyframe.saidPosition = view.saidPosition
      return { ...decor, track: [...track.filter(existing => existing.t !== t), keyframe].sort((a, b) => a.t - b.t) }
    }
    const placed: DecorObject = { ...decor, eastM: view.eastM, northM: view.northM, headingDeg, saidPosition: view.saidPosition }
    if (!placed.saidPosition) delete placed.saidPosition
    return placed
  }
}
