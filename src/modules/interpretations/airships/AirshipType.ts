import type { DroneLight } from "../drones/DroneAirframe.js"
import type { AircraftKind } from "../../../engine/traffic/AircraftModels.js"

/**
 * What an airship is: its size, how fast it goes, the lights it carries and the sign on its flanks, as the flight computes it (see
 * AirshipFlight) and the models of scripts/build-airships.ts draw it.
 *
 * Five builds, for the airships accounts are about, from the "phantom airships" of 1896-1897 and 1909 to the blimps over a stadium:
 *
 * - "blimp": a non-rigid advertising blimp of Goodyear's GZ-20A class, 59.4 m long and 14.3 m across, its gondola under it, its two piston
 *   engines beside the gondola; it cruises at some 15 m/s and at most 22 m/s (Goodyear's figures). On its flanks, the sign of lamps it
 *   carries at night, some 28 m by 6.5 m, lit at 150 cd/m² (its luminance SUPPOSED: an LED billboard's at night is dimmed to some 100 to
 *   300 cd/m²).
 * - "zeppelin-nt": a semi-rigid Zeppelin NT (Goodyear's Wingfoot One), 75 m long, 19.5 m across its fins, its three fins in an inverted Y;
 *   it cruises at 19 m/s and at most 35 m/s (Zeppelin's figures). No sign unless the recording lights one.
 * - "lightship": a small advertising airship of the A-60 class, 39.6 m long and 9.8 m across, whose white envelope is lit from inside at
 *   night, a glowing cigar in the dark: some 20 cd/m² of envelope (SUPPOSED, from photographs). It cruises at some 13 m/s.
 * - "aerostat": a tethered surveillance aerostat (the US border's TARS, of the 420K class), 63.6 m long and 21 m across, moored on its line
 *   at some kilometres, its nose into the wind; red obstruction lights flashing under its nose and its tail, where the ground sees them (2000 cd,
 *   FAA L-864's; on top, its hull hid them from anyone below). It does not
 *   fly a path: it stays at the first point stated.
 * - "rigid": a rigid airship of the great Zeppelins' era, the LZ 127 Graf Zeppelin's size: 236.6 m long and 30.5 m across, cruising at 32 m/s.
 *
 * Every figure is a type's own, sourced where it could be and SUPPOSED where it could not; a recording changes any of them.
 */
export interface AirshipType {
  id: AirshipTypeId
  /** The model of the catalogue it is drawn as (public/models/index.json). */
  modelId: string
  /** Its size as the model is built, fins, gondola and lights included, metres (see scripts/build-airships.ts, which prints it). */
  sizeM: { widthM: number, lengthM: number, heightM: number }
  /** Its cruising speed through the air and its top speed, m/s. */
  cruiseMS: number
  maxSpeedMS: number
  /** Whether it is held on a line rather than flown: it stays at its first point, its nose into the wind. */
  tethered?: boolean
  /** Its envelope's colour, and its fins', CSS. */
  color: string
  finColor: string
  albedo: number
  /** The sign of lamps on its flanks, when it has one: its colour and luminance, cd/m², and whether it is lit unless the recording says not. */
  sign?: { color: string, luminanceCdM2: number, lit: boolean }
  /** The luminance of its envelope lit from inside, cd/m², for a lightship. */
  glowCdM2?: number
  /** Its lights, by the name a recording calls them, each LED where the model has it (see DroneLight, whose shape they share). */
  lights: Record<string, DroneLight>
  /** What its engines sound like (see AircraftHearing); none for one with none. */
  sound?: AircraftKind
  /** The column of RR0's version of Poher's matrix it is assessed as. */
  phenomenon: string
}

export type AirshipTypeId = "blimp" | "zeppelin-nt" | "lightship" | "aerostat" | "rigid"

/** An airship's navigation lights, which aviation rules give it: red on its left, green on its right, white at its tail, at these points. */
const navigation = (left: [number, number, number], right: [number, number, number], tail: [number, number, number], candela = 5): Record<string, DroneLight> => ({
  "nav-left": { color: "#ff2a1a", candela, leds: [{ at: left, radiusM: 0.06 }] },
  "nav-right": { color: "#2aff5a", candela, leds: [{ at: right, radiusM: 0.06 }] },
  tail: { color: "#ffffff", candela, leds: [{ at: tail, radiusM: 0.06 }] }
})

export class AirshipTypes {
  static readonly ALL: readonly AirshipType[] = [
    {
      id: "blimp", modelId: "ufoathome-airship-blimp", sizeM: { widthM: 14.72, lengthM: 59.46, heightM: 17.59 }, cruiseMS: 15, maxSpeedMS: 22,
      color: "#c9ccd1", finColor: "#1d3f8a", albedo: 0.6, sign: { color: "#fff4d8", luminanceCdM2: 150, lit: true },
      lights: {
        ...navigation([-1.22, -8.6, -9], [1.22, -8.6, -9], [0, 0, 29.7]),
        strobe: { color: "#ffffff", candela: 400, hz: 1, flashS: 0.06, leds: [{ at: [0, -10.15, -9], radiusM: 0.08 }] }
      },
      sound: "light-piston", phenomenon: "Airship"
    },
    {
      id: "zeppelin-nt", modelId: "ufoathome-airship-zeppelin-nt", sizeM: { widthM: 18.2, lengthM: 75.11, heightM: 19.55 }, cruiseMS: 19, maxSpeedMS: 35,
      color: "#eef0f2", finColor: "#eef0f2", albedo: 0.75, sign: { color: "#fff4d8", luminanceCdM2: 150, lit: false },
      lights: {
        ...navigation([-1.32, -8.4, -14], [1.32, -8.4, -14], [0, 0, 37.5]),
        strobe: { color: "#ffffff", candela: 400, hz: 1, flashS: 0.06, leds: [{ at: [0, -9.65, -14], radiusM: 0.08 }] }
      },
      sound: "light-piston", phenomenon: "Airship"
    },
    {
      id: "lightship", modelId: "ufoathome-airship-lightship", sizeM: { widthM: 10.16, lengthM: 39.66, heightM: 11.98 }, cruiseMS: 13, maxSpeedMS: 20,
      color: "#f4f4f2", finColor: "#f4f4f2", albedo: 0.7, glowCdM2: 20,
      lights: navigation([-0.82, -5.9, -6], [0.82, -5.9, -6], [0, 0, 19.8]),
      sound: "light-piston", phenomenon: "Airship"
    },
    {
      id: "aerostat", modelId: "ufoathome-airship-aerostat", sizeM: { widthM: 25.14, lengthM: 63.6, heightM: 27.05 }, cruiseMS: 0, maxSpeedMS: 0, tethered: true,
      color: "#f2f2f0", finColor: "#f2f2f0", albedo: 0.7,
      lights: {
        nose: { color: "#ff2a1a", candela: 2000, hz: 0.5, flashS: 0.6, leds: [{ at: [0, -4.2, -30], radiusM: 0.12 }] },
        stern: { color: "#ff2a1a", candela: 2000, hz: 0.5, flashS: 0.6, leds: [{ at: [0, -6.3, 22], radiusM: 0.12 }] }
      },
      phenomenon: "Airship"
    },
    {
      id: "rigid", modelId: "ufoathome-airship-rigid", sizeM: { widthM: 33.38, lengthM: 236.66, heightM: 35.79 }, cruiseMS: 32, maxSpeedMS: 36,
      color: "#b9bcbf", finColor: "#b9bcbf", albedo: 0.55,
      lights: navigation([-3.02, -16.5, -80], [3.02, -16.5, -80], [0, 0, 118.3], 10),
      sound: "piston-heavy", phenomenon: "Airship"
    }
  ]

  static byId(id: string | undefined): AirshipType | undefined {
    return AirshipTypes.ALL.find(type => type.id === id)
  }
}
