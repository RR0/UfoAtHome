import { ObserverRide } from "../place/ObserverRide.js"
import type { ObserverVehicle } from "../model/Vehicle.js"
import type { AircraftKind } from "./AircraftModels.js"
import { AircraftHearing } from "./AircraftHearing.js"
import { SoundInAir } from "./SoundInAir.js"
import { TrafficSound } from "./TrafficSound.js"
import type { AircraftVoice, TrafficSoundOptions } from "./TrafficSound.js"

/**
 * What an observer flying in an aircraft hears OF THAT AIRCRAFT: the steady roar of the cabin they sit in, which for most of a flight is
 * the loudest thing there is and what everything else has to be heard against (see ObserverRide).
 *
 * Not the same working-out as an aircraft that passes (see AircraftHearing): nothing here spreads over a distance, takes the air's
 * absorption, or sweeps in pitch. The ear is INSIDE the machine, a few metres from its engines and behind its shell, so what it gets is a
 * level of its own — a figure of the class, as the noises of the classes are — shaped like the machine's own noise with the shell's loss
 * laid over it, which is what leaves a rumble where the open air has a whine.
 */
export class CabinHearing {

  /**
   * How loud it is inside each class of machine at cruise, dB(A): what a passenger measures, not what the machine sends out. Round
   * figures of their class and not measured on any one machine, as AircraftHearing's own noises are.
   */
  private static readonly CABIN_DB_A: Readonly<Partial<Record<AircraftKind, number>>> = {
    "airliner-wide": 76, "airliner-narrow": 78, "regional-jet": 78, "business-jet": 82, "regional-turboprop": 84,
    "turboprop-light": 88, "light-piston": 92, "military-jet": 95, "ultralight": 95,
    "helicopter-light": 95, "helicopter-medium": 96, "helicopter-heavy": 98,
    "glider": 70, "balloon": 60
  }

  /** What a machine nobody placed in a class sounds like inside: an airliner's, which is most of what anyone rides. */
  private static readonly DEFAULT_DB_A = 78

  /**
   * The voice of the cabin the observer rides in, or undefined when they rode nothing, or rode on a road (which VehicleHearing
   * synthesizes from its cylinders instead). `ambientDbA` is what the sound stands against, which for the cabin is the open air outside
   * it: nothing else in there is louder.
   */
  static voice(vehicle: ObserverVehicle | undefined, options: TrafficSoundOptions = {}): AircraftVoice | undefined {
    const kind = ObserverRide.aircraftOf(vehicle)
    if (!kind) return undefined
    const noise = AircraftHearing.noiseOfKind(kind)
    const insulation = ObserverRide.insulationDb(vehicle)
    // The SHAPE is the machine's own taken through its shell, which is what leaves a rumble where the open air has a whine; the LEVEL is
    // what a passenger measures in that cabin, the shell's loss being already in that figure and not to be taken twice.
    const shaped = noise.soundPowerA.map((level, band) => level - insulation[band])
    const shapedTotal = SoundInAir.sumDb(shaped)
    const levelDbA = CabinHearing.levelDbA(kind, vehicle?.noise)
    const bandsDbA = shaped.map(level => level - shapedTotal + levelDbA)
    return {
      id: "observer:cabin",
      kind,
      bandAmplitudes: TrafficSound.bandAmplitudes(bandsDbA, options.ambientDbA ?? 0, options.referenceAmplitude),
      levelDbA,
      // All around the ear, and going nowhere relative to it: neither placed to one side nor shifted in pitch (see AircraftVoice.inside).
      inside: true,
      distanceKm: 0,
      dopplerRatio: 1,
      azimuthDeg: 0,
      elevationDeg: 0,
      character: noise.character
    }
  }

  /** How loud that cabin is, dB(A), louder or quieter by what the recording says of this one (see ObserverVehicle.noise). */
  static levelDbA(kind: AircraftKind, noise?: number): number {
    const level = CabinHearing.CABIN_DB_A[kind] ?? CabinHearing.DEFAULT_DB_A
    return level + 20 * Math.log10(Math.max(noise ?? 1, 0.01))
  }
}
