/**
 * The birds a flock can be made of (see BirdFlockJson.species): what each weighs, how big it is, how it beats its wings, and the model it is
 * drawn as.
 *
 * Their length, wingspan and mass are the middle of the ranges field guides give (Cornell Lab's All About Birds, the species' Wikipedia
 * pages); their wing area is an ESTIMATE from the wingspan and the aspect ratio typical of their family (Pennycuick, Modelling the Flying
 * Bird, 2008): gulls 10, geese and ducks 8 to 9, pelicans 8, plovers 12. What they are drawn as is one of the builds of
 * scripts/build-birds.ts, stretched to their own length and wingspan, and coloured by its model settings.
 *
 * Their wingbeat frequency, unless stated, is PREDICTED, not measured: Pennycuick's formula for steady cruising flight (Pennycuick 1996,
 * "Wingbeat frequency of birds in steady cruising flight: new data and improved predictions", J. Exp. Biol. 199: 1613),
 *
 *   f = m^(3/8) · g^(1/2) · b^(−23/24) · S^(−1/3) · ρ^(−3/8)
 *
 * with m the mass, b the wingspan, S the wing area and ρ the density of the air: a heavier bird beats faster, a longer- and broader-winged one
 * slower, and every bird faster in thin air. It falls within some 10 % of the frequencies he measured in the field for the species he had,
 * which is closer than an estimate per species would be; a flock can state a measured one instead (see BirdFlockJson.wingbeatHz).
 */
export interface BirdSpecies {
  id: string
  /** Its common name in English, as the editor lists it. */
  name: string
  /** What it is drawn as: one of BirdSpecies.BUILDS. */
  build: BirdBuildId
  lengthM: number
  wingspanM: number
  massKg: number
  /** ESTIMATED from the wingspan and the family's aspect ratio (see above). */
  wingAreaM2: number
  /**
   * How it flies: flapping all the time, or in bursts of `beats` wingbeats each followed by a glide of `glideS` seconds, as a pelican does.
   * ESTIMATES from field guides' descriptions, not measurements.
   */
  flight: BirdFlightStyle
  /** Its colours, by the model settings of its build (see public/models/index.json): what differs from the build's own. */
  colours?: Partial<Record<BirdColourKey, string>>
  /** Its plumage as a whole, colour and share of light sent back: what it is drawn as when it is a speck under a pixel (see
   * BodySystem.shineReflected). ESTIMATES from its colours: some 0.8 for white plumage, 0.25 for a dark one. */
  plumage: { color: string, albedo: number }
}

export type BirdBuildId = "gull" | "pelican" | "goose" | "duck" | "plover"
export type BirdColourKey = "upperColor" | "underColor" | "tipColor" | "headColor" | "neckColor" | "billColor"
/**
 * How a bird flies (see the kinds):
 * - "flapping": its wings beat all the time;
 * - "bursts": bursts of `beats` wingbeats, each followed by a glide of `glideS` seconds, as a pelican travels;
 * - "path": as its path asks, as a gull flies when it is not travelling: it beats its wings to climb, glides to come down (see
 *   BirdFlock.flapsAlong), and on the level goes in bursts of `beats` with glides of `glideS` between.
 */
export type BirdFlightStyle = { kind: "flapping" } | { kind: "bursts", beats: number, glideS: number } | { kind: "path", beats: number, glideS: number }

/** What a build of bird is as written by scripts/build-birds.ts: the bird it was made for, and the size of its model at rest. */
export interface BirdBuild {
  lengthM: number
  wingspanM: number
  /** The model's own size at rest, metres: wingspan, height and length (with its bill). What a body stretches. */
  restM: { widthM: number, heightM: number, lengthM: number }
}

export class BirdSpecies {
  static readonly G = 9.81

  /** As scripts/build-birds.ts writes them (a test holds the two together). */
  static readonly BUILDS: Readonly<Record<BirdBuildId, BirdBuild>> = {
    gull: { lengthM: 0.6, wingspanM: 1.4, restM: { widthM: 1.4, heightM: 0.14, lengthM: 0.653 } },
    pelican: { lengthM: 1.2, wingspanM: 2.1, restM: { widthM: 2.147, heightM: 0.281, lengthM: 1.299 } },
    goose: { lengthM: 0.95, wingspanM: 1.6, restM: { widthM: 1.6, heightM: 0.22, lengthM: 1.003 } },
    duck: { lengthM: 0.58, wingspanM: 0.9, restM: { widthM: 0.9, heightM: 0.15, lengthM: 0.633 } },
    plover: { lengthM: 0.27, wingspanM: 0.68, restM: { widthM: 0.68, heightM: 0.07, lengthM: 0.291 } }
  }

  static readonly ALL: readonly BirdSpecies[] = [
    {
      id: "herring-gull", name: "Herring gull", build: "gull", lengthM: 0.6, wingspanM: 1.4, massKg: 1.0, wingAreaM2: 0.2,
      flight: { kind: "flapping" }, plumage: { color: "#e6e8ea", albedo: 0.6 }
    },
    {
      id: "ring-billed-gull", name: "Ring-billed gull", build: "gull", lengthM: 0.48, wingspanM: 1.2, massKg: 0.5, wingAreaM2: 0.14,
      flight: { kind: "flapping" }, colours: { upperColor: "#b3bbc3" }, plumage: { color: "#e6e8ea", albedo: 0.6 }
    },
    {
      id: "black-headed-gull", name: "Black-headed gull", build: "gull", lengthM: 0.37, wingspanM: 1.0, massKg: 0.28, wingAreaM2: 0.1,
      flight: { kind: "flapping" }, colours: { upperColor: "#c3c9cf", headColor: "#3d2b24", billColor: "#8f1d1d" }, plumage: { color: "#e8eaec", albedo: 0.6 }
    },
    {
      id: "brown-pelican", name: "Brown pelican", build: "pelican", lengthM: 1.2, wingspanM: 2.1, massKg: 3.5, wingAreaM2: 0.55,
      flight: { kind: "bursts", beats: 5, glideS: 3 }, plumage: { color: "#7d7468", albedo: 0.25 }
    },
    {
      id: "american-white-pelican", name: "American white pelican", build: "pelican", lengthM: 1.5, wingspanM: 2.7, massKg: 7, wingAreaM2: 0.9,
      flight: { kind: "bursts", beats: 6, glideS: 3 }, plumage: { color: "#f3f2ec", albedo: 0.8 },
      colours: { upperColor: "#f3f2ec", underColor: "#f3f2ec", tipColor: "#1b1c1f", headColor: "#f3f2ec", neckColor: "#f3f2ec", billColor: "#e89a3c" }
    },
    {
      id: "canada-goose", name: "Canada goose", build: "goose", lengthM: 0.95, wingspanM: 1.6, massKg: 4, wingAreaM2: 0.3,
      flight: { kind: "flapping" }, plumage: { color: "#8a7c6c", albedo: 0.25 }
    },
    {
      id: "snow-goose", name: "Snow goose", build: "goose", lengthM: 0.75, wingspanM: 1.45, massKg: 2.6, wingAreaM2: 0.25,
      flight: { kind: "flapping" }, plumage: { color: "#f3f2ec", albedo: 0.8 },
      colours: { upperColor: "#f3f2ec", underColor: "#f3f2ec", tipColor: "#1b1c1f", headColor: "#f3f2ec", neckColor: "#f3f2ec", billColor: "#d9898a" }
    },
    {
      id: "mallard", name: "Mallard", build: "duck", lengthM: 0.58, wingspanM: 0.9, massKg: 1.1, wingAreaM2: 0.095,
      flight: { kind: "flapping" }, plumage: { color: "#8a8074", albedo: 0.3 }
    },
    {
      id: "american-golden-plover", name: "American golden plover", build: "plover", lengthM: 0.26, wingspanM: 0.68, massKg: 0.145, wingAreaM2: 0.038,
      flight: { kind: "flapping" }, plumage: { color: "#8a8070", albedo: 0.3 }
    },
    {
      id: "killdeer", name: "Killdeer", build: "plover", lengthM: 0.25, wingspanM: 0.6, massKg: 0.09, wingAreaM2: 0.03,
      flight: { kind: "flapping" }, colours: { upperColor: "#7a6249", headColor: "#7a6249" }, plumage: { color: "#9a8a72", albedo: 0.3 }
    }
  ]

  static byId(id: string): BirdSpecies | undefined {
    return BirdSpecies.ALL.find(species => species.id === id)
  }

  /** Pennycuick's predicted wingbeat frequency, Hz (see above), in air of density `airDensity` kg/m³. */
  static wingbeatHz(species: Pick<BirdSpecies, "massKg" | "wingspanM" | "wingAreaM2">, airDensity = 1.225): number {
    return species.massKg ** (3 / 8) * Math.sqrt(BirdSpecies.G) * species.wingspanM ** (-23 / 24) * species.wingAreaM2 ** (-1 / 3) * airDensity ** (-3 / 8)
  }

  /** The density of the air at `elevationM` above sea level in the standard atmosphere, kg/m³. */
  static airDensityAt(elevationM: number): number {
    const kelvin = 288.15 - 0.0065 * elevationM
    return 1.225 * (kelvin / 288.15) ** 4.2559
  }

  /** The size of a body drawn as `species`: its build's model at rest stretched to its own wingspan and length. */
  static sizeOf(species: BirdSpecies): { widthM: number, lengthM: number, heightM: number } {
    const build = BirdSpecies.BUILDS[species.build]
    const across = species.wingspanM / build.wingspanM
    const along = species.lengthM / build.lengthM
    return { widthM: build.restM.widthM * across, lengthM: build.restM.lengthM * along, heightM: build.restM.heightM * along }
  }
}
