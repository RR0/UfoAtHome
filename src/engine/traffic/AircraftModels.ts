import type { AircraftDescription } from "./AircraftProvider.js"

/** What kind of machine it is, which decides how it is lit, how it sounds and how big it is when nothing more is known. */
export type AircraftKind =
  | "airliner-narrow" | "airliner-wide" | "regional-turboprop" | "regional-jet" | "business-jet"
  | "light-piston" | "turboprop-light" | "helicopter-light" | "helicopter-medium" | "helicopter-heavy"
  | "military-jet" | "glider" | "balloon" | "ultralight" | "unmanned" | "unknown"

/** One machine, or the class of one. */
export interface AircraftModel {
  /** The ICAO type designator when it is one that is known by name; undefined for a class. */
  code?: string
  name: string
  kind: AircraftKind
  /** Wingspan, or the rotor's diameter for a helicopter, metres. */
  spanM: number
  lengthM: number
  /** Whether it was found by its type designator (the real thing) or inferred from its category (a class). */
  basis: "type" | "category" | "nothing"
}

/**
 * Which machine a record says an aircraft is — by its ICAO type designator (A320, EC35: the dimensions of the real
 * thing), else by the category it states (A7 rotorcraft: a typical one), else a typical narrow-body airliner, which is
 * what most of the sky is.
 *
 * Dimensions are the manufacturers' published figures, rounded to a tenth of a metre: a helicopter's span is its rotor.
 * This is a DATUM table: more types are more rows, never more code (same principle as LIGHT_RIGS).
 */
export class AircraftModels {
  /** type designator → [name, kind, span, length] */
  private static readonly TYPES: Record<string, [string, AircraftKind, number, number]> = {
    A318: ["Airbus A318", "airliner-narrow", 34.1, 31.4], A319: ["Airbus A319", "airliner-narrow", 34.1, 33.8],
    A320: ["Airbus A320", "airliner-narrow", 34.1, 37.6], A321: ["Airbus A321", "airliner-narrow", 34.1, 44.5],
    A19N: ["Airbus A319neo", "airliner-narrow", 35.8, 33.8], A20N: ["Airbus A320neo", "airliner-narrow", 35.8, 37.6],
    A21N: ["Airbus A321neo", "airliner-narrow", 35.8, 44.5],
    B737: ["Boeing 737-700", "airliner-narrow", 34.3, 33.6], B738: ["Boeing 737-800", "airliner-narrow", 35.8, 39.5],
    B739: ["Boeing 737-900", "airliner-narrow", 35.8, 42.1], B38M: ["Boeing 737 MAX 8", "airliner-narrow", 35.9, 39.5],
    B39M: ["Boeing 737 MAX 9", "airliner-narrow", 35.9, 42.2], B752: ["Boeing 757-200", "airliner-narrow", 38.0, 47.3],
    B753: ["Boeing 757-300", "airliner-narrow", 38.0, 54.4],
    B762: ["Boeing 767-200", "airliner-wide", 47.6, 48.5], B763: ["Boeing 767-300", "airliner-wide", 47.6, 54.9],
    B764: ["Boeing 767-400", "airliner-wide", 51.9, 61.4], B772: ["Boeing 777-200", "airliner-wide", 60.9, 63.7],
    B77L: ["Boeing 777-200LR", "airliner-wide", 64.8, 63.7], B77W: ["Boeing 777-300ER", "airliner-wide", 64.8, 73.9],
    B788: ["Boeing 787-8", "airliner-wide", 60.1, 56.7], B789: ["Boeing 787-9", "airliner-wide", 60.1, 62.8],
    B78X: ["Boeing 787-10", "airliner-wide", 60.1, 68.3], B744: ["Boeing 747-400", "airliner-wide", 64.4, 70.7],
    B748: ["Boeing 747-8", "airliner-wide", 68.4, 76.3],
    A306: ["Airbus A300-600", "airliner-wide", 44.8, 54.1], A310: ["Airbus A310", "airliner-wide", 43.9, 46.7],
    A332: ["Airbus A330-200", "airliner-wide", 60.3, 58.8], A333: ["Airbus A330-300", "airliner-wide", 60.3, 63.7],
    A338: ["Airbus A330-800", "airliner-wide", 64.0, 58.8], A339: ["Airbus A330-900", "airliner-wide", 64.0, 63.7],
    A343: ["Airbus A340-300", "airliner-wide", 60.3, 63.7], A346: ["Airbus A340-600", "airliner-wide", 63.5, 75.4],
    A359: ["Airbus A350-900", "airliner-wide", 64.8, 66.8], A35K: ["Airbus A350-1000", "airliner-wide", 64.8, 73.8],
    A388: ["Airbus A380-800", "airliner-wide", 79.8, 72.7],
    E170: ["Embraer 170", "regional-jet", 26.0, 29.9], E75L: ["Embraer 175", "regional-jet", 26.0, 31.7],
    E75S: ["Embraer 175", "regional-jet", 26.0, 31.7], E190: ["Embraer 190", "regional-jet", 28.7, 36.2],
    E195: ["Embraer 195", "regional-jet", 28.7, 38.7], E290: ["Embraer 190-E2", "regional-jet", 33.7, 36.2],
    E295: ["Embraer 195-E2", "regional-jet", 33.7, 41.5],
    CRJ2: ["Bombardier CRJ200", "regional-jet", 21.2, 26.8], CRJ7: ["Bombardier CRJ700", "regional-jet", 23.2, 32.3],
    CRJ9: ["Bombardier CRJ900", "regional-jet", 24.9, 36.2], CRJX: ["Bombardier CRJ1000", "regional-jet", 26.2, 39.1],
    AT72: ["ATR 72", "regional-turboprop", 27.1, 27.2], AT76: ["ATR 72-600", "regional-turboprop", 27.1, 27.2],
    AT45: ["ATR 42", "regional-turboprop", 24.6, 22.7], DH8D: ["Dash 8 Q400", "regional-turboprop", 28.4, 32.8],
    DH8C: ["Dash 8-300", "regional-turboprop", 27.4, 25.7], SF34: ["Saab 340", "regional-turboprop", 21.4, 19.7],
    B190: ["Beechcraft 1900", "regional-turboprop", 17.7, 17.6],
    C25A: ["Cessna CitationJet CJ2", "business-jet", 14.3, 14.4], C56X: ["Cessna Citation Excel", "business-jet", 17.2, 16.0],
    C68A: ["Cessna Citation Latitude", "business-jet", 22.0, 18.9], C550: ["Cessna Citation II", "business-jet", 15.8, 14.4],
    E55P: ["Embraer Phenom 300", "business-jet", 15.9, 15.6], E50P: ["Embraer Phenom 100", "business-jet", 12.3, 12.8],
    GLF5: ["Gulfstream G550", "business-jet", 28.5, 29.4], FA7X: ["Dassault Falcon 7X", "business-jet", 26.2, 23.4],
    CL60: ["Bombardier Challenger 600", "business-jet", 19.6, 20.9], LJ45: ["Learjet 45", "business-jet", 14.6, 17.7],
    H25B: ["Hawker 800", "business-jet", 15.7, 15.6],
    C172: ["Cessna 172", "light-piston", 11.0, 8.3], C152: ["Cessna 152", "light-piston", 10.2, 7.3],
    C182: ["Cessna 182", "light-piston", 10.9, 8.8], P28A: ["Piper Cherokee", "light-piston", 10.7, 7.2],
    PA34: ["Piper Seneca", "light-piston", 11.8, 8.7], SR20: ["Cirrus SR20", "light-piston", 10.9, 7.9],
    SR22: ["Cirrus SR22", "light-piston", 11.7, 7.9], S22T: ["Cirrus SR22T", "light-piston", 11.7, 7.9],
    DA40: ["Diamond DA40", "light-piston", 11.6, 8.1], DA42: ["Diamond DA42", "light-piston", 13.4, 8.6],
    BE20: ["Beechcraft King Air 200", "turboprop-light", 16.6, 13.3], BE58: ["Beechcraft Baron", "light-piston", 11.5, 9.1],
    C208: ["Cessna Caravan", "turboprop-light", 15.9, 11.5], PC12: ["Pilatus PC-12", "turboprop-light", 16.3, 14.4],
    TBM9: ["Daher TBM 900", "turboprop-light", 12.8, 10.7],
    EC35: ["Airbus H135", "helicopter-light", 10.2, 12.1], EC45: ["Airbus H145", "helicopter-medium", 11.0, 13.6],
    AS50: ["Airbus H125", "helicopter-light", 10.7, 12.9], EC30: ["Airbus H130", "helicopter-light", 10.7, 12.6],
    B407: ["Bell 407", "helicopter-light", 10.7, 12.7], B06: ["Bell 206", "helicopter-light", 10.2, 12.0],
    B429: ["Bell 429", "helicopter-medium", 10.9, 13.0], B505: ["Bell 505", "helicopter-light", 10.4, 11.9],
    R44: ["Robinson R44", "helicopter-light", 10.1, 11.7], R22: ["Robinson R22", "helicopter-light", 7.7, 8.8],
    A109: ["Agusta A109", "helicopter-medium", 11.0, 13.0], A139: ["Leonardo AW139", "helicopter-medium", 13.8, 16.7],
    S92: ["Sikorsky S-92", "helicopter-heavy", 17.2, 20.9], H60: ["Sikorsky UH-60 Black Hawk", "helicopter-heavy", 16.4, 19.8],
    T38: ["Northrop T-38 Talon", "military-jet", 7.7, 14.1], HAWK: ["BAE Hawk", "military-jet", 9.4, 11.9],
    GLID: ["Glider", "glider", 17.0, 7.0], BALL: ["Balloon", "balloon", 15.0, 20.0],
    ULAC: ["Ultralight", "ultralight", 9.5, 6.0], C42: ["Ikarus C42", "ultralight", 9.4, 6.3], DRON: ["Drone", "unmanned", 1.0, 0.6]
  }

  /** category → [name, kind, span, length]: a typical one of its class. */
  private static readonly CATEGORIES: Record<string, [string, AircraftKind, number, number]> = {
    A1: ["Light aircraft", "light-piston", 11.0, 8.3],
    A2: ["Small aircraft", "business-jet", 15.0, 15.0],
    A3: ["Large aircraft", "airliner-narrow", 34.1, 37.6],
    A4: ["High-vortex large aircraft", "airliner-narrow", 38.0, 47.3],
    A5: ["Heavy aircraft", "airliner-wide", 60.3, 63.7],
    A6: ["High-performance aircraft", "military-jet", 8.0, 14.0],
    A7: ["Rotorcraft", "helicopter-medium", 10.7, 12.7],
    B1: ["Glider", "glider", 17.0, 7.0],
    B2: ["Lighter-than-air", "balloon", 15.0, 20.0],
    B4: ["Ultralight", "ultralight", 9.5, 6.0],
    B6: ["Unmanned aircraft", "unmanned", 1.5, 1.0]
  }

  private static readonly GENERIC: AircraftModel = { name: "Airliner", kind: "airliner-narrow", spanM: 34.1, lengthM: 37.6, basis: "nothing" }

  /** The machine a description says it is: by type, else by category, else a generic airliner. */
  static of(description?: AircraftDescription): AircraftModel {
    const type = description?.type?.toUpperCase()
    const known = type ? AircraftModels.TYPES[type] : undefined
    if (known) return { code: type, name: known[0], kind: known[1], spanM: known[2], lengthM: known[3], basis: "type" }
    const category = description?.category ? AircraftModels.CATEGORIES[description.category] : undefined
    if (category) return { name: category[0], kind: category[1], spanM: category[2], lengthM: category[3], basis: "category" }
    return { ...AircraftModels.GENERIC }
  }

  /** Whether the machine has a rotor. */
  static isHelicopter(model: AircraftModel): boolean {
    return model.kind.startsWith("helicopter")
  }
}
