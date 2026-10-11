import type { DecorKind, DecorObject, DecorSide, DecorSize } from "./Decor.js"
import { canHoldObserver, resolveDecorLitAt, resolveDecorPlacementAt } from "./Decor.js"
import { LightRigs } from "./LightRig.js"
import type { SaidText } from "./SaidText.js"

/** What the editor knows about the object on show, which the object alone cannot say. */
export interface DecorBaseContext {
  kind: DecorKind
  /** What the built-in shape measures: shown, greyed, where a size is not stated. */
  natural?: DecorSize
  /** Which of the fields mean anything for this object as it is drawn (see DecorTraits). */
  traits: { color: boolean, lit: boolean, lights: boolean, observerSide: boolean }
  /** The rigs of lamps that suit this kind, by the name the reader's language gives them. */
  lightRigs: ReadonlyArray<{ value: string, label: string }>
  /** The seats an observer can have in this kind of object. */
  seats: ReadonlyArray<{ value: string, label: SaidText }>
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
  altitudeM: number
  headingDeg: number
  color?: string
  sizeM?: { widthM?: number, lengthM?: number, heightM?: number }
  lit: boolean
  /** The id of the rig the object's lamps came from, or "" for none. */
  lightRig: string
  observerSide?: string
}

export class DecorBase {

  /** The rig a decor object's own lamps came from, recognised by the ids of the lamps it produced. */
  static rigOf(decor: Pick<DecorObject, "kind" | "lights">): string {
    const carried = decor.lights?.map(light => light.id).join() ?? ""
    return LightRigs.forKind(decor.kind).find(rig => rig.create().map(light => light.id).join() === carried)?.id ?? ""
  }

  /** The view of an object at `t`; places are as a field shows them, a hundredth of a metre at most. */
  static viewOf(decor: DecorObject, t: number): DecorBaseView {
    const placement = resolveDecorPlacementAt(decor, t)
    const round = (value: number) => Number(value.toFixed(2))
    return {
      title: decor.title,
      eastM: round(placement.eastM),
      northM: round(placement.northM),
      altitudeM: round(placement.altitudeM),
      headingDeg: round(placement.headingDeg ?? 0),
      color: decor.color,
      sizeM: decor.sizeM ? { ...decor.sizeM } : undefined,
      lit: resolveDecorLitAt(decor, t),
      lightRig: DecorBase.rigOf(decor),
      observerSide: decor.observerSide
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
      case "lightRig": {
        const rig = LightRigs.byId(view.lightRig === "" ? undefined : view.lightRig)
        return { ...decor, lights: rig ? rig.create() : undefined }
      }
      case "observerSide":
        // Only a kind that can hold an observer states a seat, whatever a shared field was left showing.
        return { ...decor, observerSide: canHoldObserver(decor.kind) && view.observerSide ? view.observerSide as DecorSide : undefined }
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
      const keyframe = { t, eastM: view.eastM, northM: view.northM, altitudeM: view.altitudeM, headingDeg }
      return { ...decor, track: [...track.filter(existing => existing.t !== t), keyframe].sort((a, b) => a.t - b.t) }
    }
    return { ...decor, eastM: view.eastM, northM: view.northM, headingDeg }
  }
}
