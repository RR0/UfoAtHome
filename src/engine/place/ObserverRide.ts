import type { AircraftKind } from "../traffic/AircraftModels.js"
import type { ObserverVehicle, RideKind, VehicleKind } from "../model/Vehicle.js"

/**
 * What the observer rode in, and what riding in it does to everything they heard (see Sighting.vehicle).
 *
 * Two things, which go together and which a recording states with one word. Inside, its own noise is the loudest thing there is: a van's
 * cylinders and tyres, an aircraft's steady roar. Outside, its shell stands between the observer and the rest of the world, and takes more
 * from the highs than from the lows, which is why a closed cabin leaves a rumble where the open air has a whine.
 *
 * Here rather than beside the sounds it shapes (see CabinHearing, which plays the first) so that asking what the observer rode costs
 * nothing: these are numbers, and the code that works a sound out is loaded only once one is played.
 */
export class ObserverRide {

  /** The kinds that are driven on a road: everything else an observer can ride is flown (see RideKind). */
  private static readonly ROAD_KINDS: readonly string[] = ["car", "van", "truck", "motorcycle", "generic"]

  /** A shell that takes nothing off: nobody was aboard anything. */
  static readonly OPEN_AIR: readonly number[] = [0, 0, 0, 0, 0, 0, 0, 0]

  /**
   * What a closed road cabin takes off each octave (63 Hz to 8 kHz, see SoundInAir.OCTAVES), dB: glass and panels, which stop a whine and
   * hardly touch a rumble. Round figures of their class, as the noises of aircraft are (see AircraftHearing).
   */
  private static readonly ROAD_CLOSED_DB: readonly number[] = [10, 14, 18, 22, 25, 28, 30, 32]

  /** What an open window leaves of it: next to nothing, the opening being wider than the sounds that matter. */
  private static readonly WINDOWS_OPEN_DB: readonly number[] = [2, 3, 4, 5, 6, 7, 8, 9]

  /** A pressurised fuselage, which is a thicker shell than any car's: an airliner's cabin is quiet for the roar that is outside it. */
  private static readonly FUSELAGE_DB: readonly number[] = [14, 18, 23, 28, 32, 36, 38, 40]

  /** A canopy of plastic over an open frame, which is barely a shell at all. */
  private static readonly CANOPY_DB: readonly number[] = [3, 4, 6, 8, 10, 12, 14, 16]

  /** The machines flown with a canopy or nothing rather than a cabin. */
  private static readonly CANOPIED: readonly string[] = ["glider", "balloon", "ultralight"]

  /** Whether that is a machine driven on a road, as against one that is flown. */
  static isRoad(kind: RideKind): kind is VehicleKind {
    return ObserverRide.ROAD_KINDS.includes(kind)
  }

  /** The road vehicle the observer rode, when it was one: what VehicleHearing turns into cylinders and gears. */
  static roadOf(vehicle: ObserverVehicle | undefined): VehicleKind | undefined {
    return vehicle && ObserverRide.isRoad(vehicle.kind) ? vehicle.kind : undefined
  }

  /** The aircraft the observer rode, when it was one: what CabinHearing turns into the roar around them. */
  static aircraftOf(vehicle: ObserverVehicle | undefined): AircraftKind | undefined {
    return vehicle && !ObserverRide.isRoad(vehicle.kind) ? vehicle.kind : undefined
  }

  /**
   * How much of a broad outdoor noise gets through the shell, 0 to 1: for the rain and the wind, which are not worked out band by band
   * (see WeatherAudio.setOutsideHeard). Taken at the octaves such a noise is loudest in, 500 Hz to 2 kHz.
   */
  static transmission(vehicle: ObserverVehicle | undefined): number {
    const insulation = ObserverRide.insulationDb(vehicle)
    const bands = [3, 4, 5].map(band => insulation[band])
    return 10 ** (-(bands.reduce((sum, level) => sum + level, 0) / bands.length) / 20)
  }

  /**
   * What the shell around the observer takes off a sound that comes from outside it, octave by octave, dB. All zeroes when they rode
   * nothing, and nearly so with a window open: what gets in then gets in whole.
   */
  static insulationDb(vehicle: ObserverVehicle | undefined): readonly number[] {
    if (!vehicle) return ObserverRide.OPEN_AIR
    if (vehicle.windowsOpen === true) return ObserverRide.WINDOWS_OPEN_DB
    if (ObserverRide.isRoad(vehicle.kind)) return ObserverRide.ROAD_CLOSED_DB
    return ObserverRide.CANOPIED.includes(vehicle.kind) ? ObserverRide.CANOPY_DB : ObserverRide.FUSELAGE_DB
  }
}
