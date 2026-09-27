/**
 * What kind of vehicle, as far as its SOUND goes: how many cylinders fire, how low they turn, how its
 * gears are spaced. "generic" is what a recording says when it knows there was a vehicle and not
 * which: an ordinary petrol car.
 */
export type VehicleKind = "car" | "van" | "truck" | "motorcycle" | "generic"

/**
 * The vehicle the observer was in, when it is not drawn — see Sighting.vehicle.
 *
 * Not decor: a vehicle drawn around the observer closes the view to what its windows show (see
 * DecorObject.observerSide), which is what a reconstruction wants for a car stopped by the road and
 * not for a driver watching something in the mirror. What it adds here is what the observer HEARD
 * of it, which is what made them hear nothing else.
 */
export interface ObserverVehicle {
  kind: VehicleKind
  /** Whether the windows were open: the road and the wind come in, the cabin no longer muffles the
   * engine. Absent means closed. */
  windowsOpen?: boolean
  /** How loud it was, against an ordinary one of its kind: 1 by default, 1.5 for "very noisy". */
  noise?: number
}

/** A decor vehicle heard running — see DecorObject.engine. Present means the engine runs. */
export interface DecorEngine {
  /** Which sound: a decor object's own `kind` says only "vehicle". Absent means "generic". */
  kind?: VehicleKind
  /** As ObserverVehicle.noise. */
  noise?: number
}

/**
 * How a kind of vehicle turns: firing, idling, its gears as km/h at 1000 rpm, when it changes up
 * and down, and how loud each of its noises is at full scale. Round figures of their class: a
 * four-cylinder petrol car, a four-cylinder diesel van, a six-cylinder diesel truck, a twin motorcycle.
 */
export interface VehicleProfile {
  cylinders: number
  idleRpm: number
  /** Speed per 1000 rpm in each gear, km/h, first to top. */
  kmhPer1000Rpm: readonly number[]
  shiftUpRpm: number
  shiftDownRpm: number
  /** The engine's own loudness, the tyres', and how much it rattles (a diesel knocks). */
  engineGain: number
  roadGain: number
  roughness: number
}

export class VehicleProfiles {
  static readonly BY_KIND: Readonly<Record<VehicleKind, VehicleProfile>> = {
    car: { cylinders: 4, idleRpm: 800, kmhPer1000Rpm: [8, 14, 21, 29, 37, 45], shiftUpRpm: 3000, shiftDownRpm: 1300, engineGain: 0.6, roadGain: 0.5, roughness: 0.15 },
    generic: { cylinders: 4, idleRpm: 800, kmhPer1000Rpm: [8, 14, 21, 29, 37, 45], shiftUpRpm: 3000, shiftDownRpm: 1300, engineGain: 0.6, roadGain: 0.5, roughness: 0.15 },
    van: { cylinders: 4, idleRpm: 750, kmhPer1000Rpm: [7, 12, 19, 27, 35, 42], shiftUpRpm: 2600, shiftDownRpm: 1200, engineGain: 0.8, roadGain: 0.7, roughness: 0.45 },
    truck: { cylinders: 6, idleRpm: 600, kmhPer1000Rpm: [5, 8, 12, 17, 23, 30, 38, 48], shiftUpRpm: 1900, shiftDownRpm: 1000, engineGain: 1, roadGain: 0.9, roughness: 0.55 },
    motorcycle: { cylinders: 2, idleRpm: 1100, kmhPer1000Rpm: [12, 18, 24, 30, 35, 40], shiftUpRpm: 6000, shiftDownRpm: 2500, engineGain: 0.9, roadGain: 0.3, roughness: 0.3 }
  }

  static of(kind: VehicleKind | undefined): VehicleProfile {
    return VehicleProfiles.BY_KIND[kind ?? "generic"] ?? VehicleProfiles.BY_KIND.generic
  }
}
