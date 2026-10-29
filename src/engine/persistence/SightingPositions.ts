import type { DecorObject } from "../model/Decor.js"
import { resolveDecorPlacementAt } from "../model/Decor.js"
import type { ObserverTrackJson } from "../model/ObserverTrack.js"
import type { Sighting } from "../model/Sighting.js"
import type { GeoPoint, LocalPoint, PositionFrame, SaidPosition } from "../model/SaidPosition.js"
import { SaidPositions } from "../model/SaidPosition.js"

/**
 * How the places of a recording were said, said again with the numbers of where they now are, for the file.
 *
 * What a place comes to is what counts (see SaidPosition): a car said 20 m north of the house and then dragged in the scene, or a house
 * moved after a car was said from it, still says "from the house", but no longer "20 m north". The editor has many ways of moving a thing
 * and one way of writing a file, so the numbers are made true on the way out rather than in each of them. The recording in memory is
 * left as it is: what it says is only ever read through the place it keeps.
 */
export class SightingPositions {

  /** The decor as it is written: each object's said place, and each of its track's, from where things stand. */
  static restatedDecor(sighting: Sighting): DecorObject[] {
    const origin = SightingPositions.originOf(sighting)
    return sighting.decor.map(decor => {
      let restated = decor
      if (decor.saidPosition) {
        const said = SightingPositions.restated(decor.saidPosition, decor, SightingPositions.frameAt(sighting, 0, origin, decor.id))
        if (JSON.stringify(said) !== JSON.stringify(decor.saidPosition)) {
          restated = { ...decor, saidPosition: said }
          if (!said) delete restated.saidPosition
        }
      }
      if (decor.track?.some(keyframe => keyframe.saidPosition)) {
        const track = decor.track.map(keyframe => {
          if (!keyframe.saidPosition) return keyframe
          const said = SightingPositions.restated(keyframe.saidPosition, keyframe, SightingPositions.frameAt(sighting, keyframe.t, origin, decor.id))
          if (JSON.stringify(said) === JSON.stringify(keyframe.saidPosition)) return keyframe
          const copy = { ...keyframe, saidPosition: said }
          if (!said) delete copy.saidPosition
          return copy
        })
        restated = { ...restated, track }
      }
      return restated
    })
  }

  /** The observer's track as it is written: a place said from a decor object, from where that object stands at the keyframe's instant. */
  static restatedObserverTrack(sighting: Sighting): ObserverTrackJson {
    const json = sighting.observerTrack.toJSON()
    const origin = SightingPositions.originOf(sighting)
    if (!origin || !json.keyframes.some(keyframe => keyframe.pose.saidPosition)) return json
    return {
      ...json,
      keyframes: json.keyframes.map(keyframe => {
        const { pose } = keyframe
        if (!pose.saidPosition || pose.lat === undefined || pose.lng === undefined) return keyframe
        const point = SaidPositions.toLocal({ lat: pose.lat, lng: pose.lng }, origin)
        const said = SightingPositions.restated(pose.saidPosition, point, SightingPositions.frameAt(sighting, keyframe.t, origin))
        if (JSON.stringify(said) === JSON.stringify(pose.saidPosition)) return keyframe
        const copy = { ...pose, saidPosition: said }
        if (!said) delete copy.saidPosition
        return { ...keyframe, pose: copy }
      })
    }
  }

  /** Where the recording sets off on the Earth: the observer's first place, or the recording's. */
  static originOf(sighting: Sighting): GeoPoint | undefined {
    const pose = sighting.observerTrack.getInterpolatedPoseAt(0)
    const place = sighting.event.place?.[0]
    const lat = pose?.lat ?? place?.lat
    const lng = pose?.lng ?? place?.lng
    return typeof lat === "number" && typeof lng === "number" ? { lat, lng } : undefined
  }

  /** The frame at `t`: the observer, and every decor object but `except` where it stands then. */
  static frameAt(sighting: Sighting, t: number, origin: GeoPoint | undefined, except?: string): PositionFrame {
    const references = [{ label: "", eastM: 0, northM: 0 }, ...sighting.decor.filter(decor => decor.id !== except).map(decor => {
      const { eastM, northM } = resolveDecorPlacementAt(decor, t)
      return { id: decor.id, label: decor.id, eastM, northM }
    })]
    return { origin, references }
  }

  /** Said again with the numbers of `point`; nothing when what it was said from is gone, since it says nothing true any more. */
  private static restated(said: SaidPosition, point: LocalPoint, frame: PositionFrame): SaidPosition | undefined {
    return SaidPositions.restated(said, { eastM: point.eastM, northM: point.northM }, frame)
  }
}
