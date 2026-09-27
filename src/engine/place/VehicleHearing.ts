import type { Sighting } from "../model/Sighting.js"
import { resolveDecorPlacementAt } from "../model/Decor.js"
import type { DecorObject } from "../model/Decor.js"
import { VehicleProfiles } from "../model/Vehicle.js"
import type { VehicleProfile } from "../model/Vehicle.js"
import { geoToLocalMeters } from "../../render3d/terrain/GeoProjection.js"
import { VehicleDrive } from "./VehicleDrive.js"
import type { DriveState } from "./VehicleDrive.js"

/** One vehicle as the observer hears it at an instant — see VehicleAudio.VehicleVoice. */
export interface HeardVehicle {
  id: string
  profile: VehicleProfile
  state: DriveState
  noise: number
  inside: boolean
  windowsOpen: boolean
  distanceM: number
}

/**
 * Which vehicles the observer hears, and how: the one they are in (Sighting.vehicle), from inside,
 * turning with their own journey; and every decor vehicle whose engine runs (DecorObject.engine),
 * from where the observer stands, turning with its own track.
 *
 * The journeys are worked out once per recording and kept (see VehicleDrive), keyed on what they
 * are made of, so an edit to the track is heard and a tick of playback costs a lookup.
 */
export class VehicleHearing {
  private readonly drives = new Map<string, { key: string, drive?: VehicleDrive }>()

  at(sighting: Sighting, tMs: number): HeardVehicle[] {
    const heard: HeardVehicle[] = []
    const origin = sighting.event.place?.[0]
    const observerAt = (t: number) => {
      const pose = sighting.observerTrack.getInterpolatedPoseAt(t)
      const lat = pose?.lat ?? origin?.lat
      const lng = pose?.lng ?? origin?.lng
      if (lat === undefined || lng === undefined || !origin) return undefined
      const local = geoToLocalMeters(lat, lng, origin.lat, origin.lng)
      return { eastM: local.x, northM: -local.z }
    }
    const span = Math.max(sighting.observerTrack.duration, (sighting.event.durationSeconds ?? 0) * 1000)
    const vehicle = sighting.vehicle
    if (vehicle) {
      const profile = VehicleProfiles.of(vehicle.kind)
      const drive = this.drive(`observer:${vehicle.kind}`, VehicleHearing.trackKey(sighting), () =>
        VehicleDrive.of(profile, observerAt, 0, span))
      if (drive) heard.push({ id: "observer", profile, state: drive.at(tMs), noise: vehicle.noise ?? 1, inside: true, windowsOpen: vehicle.windowsOpen === true, distanceM: 0 })
    }
    const here = observerAt(tMs)
    for (const decor of sighting.decor) {
      if (!decor.engine || !here) continue
      const profile = VehicleProfiles.of(decor.engine.kind)
      const position = (t: number) => {
        const placed = resolveDecorPlacementAt(decor, t)
        return { eastM: placed.eastM, northM: placed.northM }
      }
      const drive = this.drive(`decor:${decor.id}`, VehicleHearing.decorKey(decor, span), () => VehicleDrive.of(profile, position, 0, span))
      if (!drive) continue
      const at = resolveDecorPlacementAt(decor, tMs)
      const distanceM = Math.hypot(at.eastM - here.eastM, at.northM - here.northM, at.altitudeM)
      heard.push({ id: `decor:${decor.id}`, profile, state: drive.at(tMs), noise: decor.engine.noise ?? 1, inside: false, windowsOpen: true, distanceM })
    }
    return heard
  }

  private drive(id: string, key: string, make: () => VehicleDrive | undefined): VehicleDrive | undefined {
    const known = this.drives.get(id)
    if (known && known.key === key) return known.drive
    const drive = make()
    this.drives.set(id, { key, drive })
    return drive
  }

  private static trackKey(sighting: Sighting): string {
    const keyframes = sighting.observerTrack.allKeyframes
    return keyframes.map(keyframe => `${keyframe.t}:${keyframe.pose.lat}:${keyframe.pose.lng}`).join(";")
  }

  private static decorKey(decor: DecorObject, span: number): string {
    return `${span}|${decor.eastM},${decor.northM}|` + (decor.track ?? []).map(k => `${k.t}:${k.eastM}:${k.northM}`).join(";")
  }
}
