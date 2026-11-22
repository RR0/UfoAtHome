/**
 * What a balloon is: how its envelope holds what lifts it, what it weighs, how big it is, what it looks like and what lights it carries,
 * as the flight computes it (see BalloonFlight) and the models of scripts/build-balloons.ts draw it.
 *
 * Four ways an envelope holds what lifts it (see BalloonEnvelope), which is what makes one rise to burst, another float at a height of its
 * own and a third go where its pilot wants:
 *
 * - "elastic": a latex balloon, a party one or a weather balloon. Its gas swells it as the air thins, until it bursts.
 * - "vented": an envelope that cannot stretch and lets go of the gas it can no longer hold: a stratospheric balloon, open at its foot (a
 *   "zero-pressure" balloon), and a foil party balloon, whose seams and valve let its helium out as it swells. It floats where it weighs
 *   what the air it pushes aside does.
 * - "sealed": an envelope that holds its gas whatever the height, a captive balloon's, which a line holds down.
 * - "superpressure": an envelope let go slack that fills out as it rises, then holds its gas at more than the air's pressure: it no longer
 *   swells, and floats where it weighs what the air it pushes aside does, for weeks (the CNES's BPS, Google's Loon).
 * - "open": a hot-air balloon, a solar, infrared or prank balloon, lifted by its own air, hotter than outside: by a burner its pilot fires, by
 *   the Sun or the Earth's warmth, or by candles. One let go partly filled (its stated volume less than its most) fills out as it rises, its
 *   warm air swelling as a gas does.
 *
 * Every figure below is a type's own, sourced where it could be and SUPPOSED where it could not: a recording changes any of them (see
 * BalloonFlightJson.balloon).
 */
export interface BalloonType {
  id: BalloonTypeId
  /** The model of the catalogue it is drawn as (public/models/index.json). */
  modelId: string
  envelope: BalloonEnvelope
  /**
   * How much it holds when it is let go, m³: the gas a latex or stratospheric balloon is filled with, measured in the standard air at the sea
   * (15 °C, 1013.25 hPa) — what fixes how much gas it holds, and so what it lifts, wherever it is filled; the whole envelope of one that is
   * full from the start (a foil, a captive or a hot-air balloon).
   */
  launchVolumeM3: number
  /** The most it holds, m³: where a latex one bursts, a vented one lets its gas go, a sealed one stops swelling. */
  maxVolumeM3: number
  /** What it weighs without its gas, kg: envelope, string, payload, basket and people. */
  massKg: number
  /** Its drag coefficient over the disc it shows: some 0.3 to 0.5 for a sphere at its speeds. */
  dragCoefficient: number
  /** How tall it is over how wide, envelope included: what turns the width its volume gives into its size. */
  aspect: number
  /** How wide it is, m, whatever it holds: a model whose size is its own (a hot-air balloon, a foil one). Its volume's when absent. */
  widthM?: number
  /** How thick it is over how wide, front to back: a foil balloon is a flat pillow. 1 when absent. */
  depthRatio?: number
  /** Its envelope's colour, CSS. */
  color: string
  /** Its second colour, CSS: a hot-air balloon's alternate gores. */
  stripeColor?: string
  /** How much of the light on it it sends back, 0-1. */
  albedo: number
  /** A polished envelope sends back what it faces (see BodyAppearance.finish): a foil balloon. Matt when absent. */
  finish?: "matt" | "mirror"
  /** The molar mass of its gas, kg/mol: helium's, 0.004, when absent; hydrogen's is 0.002. */
  gasMolarMassKgMol?: number
  /**
   * The ballast it carries to drop, kg, part of `massKg`: what keeps a stratospheric balloon at its height. Past its float it lets go of the
   * gas it can no longer hold, and is then a little heavier than the air it pushes aside: it drops the ballast that makes up the difference,
   * as their barometric switches did, for as long as it has any. None when absent.
   */
  ballastKg?: number
  /** An open envelope's heating, when a burner heats it: see BalloonBurner. */
  burner?: BalloonBurner
  /** How much hotter than the air an open envelope's air is, K, when nothing fires (a solar balloon in the Sun). */
  insideExcessK?: number
  /** A light inside its envelope that makes it glow all over (an LED balloon), candela, and its colour. */
  glow?: { candela: number, color: string }
  /** A lamp it carries under it (the lamp a pilot balloon took up at night), candela, and its colour; unlit unless the recording lights it. */
  lamp?: { candela: number, color: string }
  /** The flames that heat and light an open envelope with no burner (see BalloonFlames). */
  flames?: BalloonFlames
  /** Held on a line from where it is let go (see BalloonFlightJson.tetherM). */
  tethered?: boolean
  /** It turns slowly about its vertical, at a rate of its own: a foil balloon, a prank balloon whose lights go round "like a slow frisbee". */
  spins?: boolean
  /** It swings a few degrees to and fro as a pendulum, its heavy foot under its light top: a prank balloon in the gusts. */
  sways?: boolean
  /** The shapes it is sold in, each changing its model and its figures; the first when the recording says none (see BalloonFlightJson.shape). */
  shapes?: Partial<Record<FoilShape, BalloonShape>>
  /** The column of RR0's version of Poher's matrix it is assessed as (see InterpretationKind.phenomenon). */
  phenomenon: string
  /** How long its flight is computed for when the recording does not say, s: it may burst, or land, before. */
  durationS: number
}

export type BalloonEnvelope = "elastic" | "vented" | "sealed" | "superpressure" | "open"

export type BalloonTypeId = "hot-air" | "party" | "led" | "foil" | "pilot" | "weather" | "stratospheric" | "stratospheric-large" | "superpressure" | "infrared"
  | "solar" | "captive" | "prank-candles" | "prank-flares"

/** The shapes foil balloons are sold in (see BalloonType.shapes). */
export const FOIL_SHAPES = ["round", "star", "heart", "figure"] as const
export type FoilShape = typeof FOIL_SHAPES[number]

/**
 * What a shape of a type changes of it: its model, its proportions, and what it holds and weighs. A foil balloon is round, a star, a heart or
 * a figure, a pillow of film each, the same physics.
 */
export type BalloonShape = Pick<BalloonType, "modelId" | "aspect" | "widthM" | "depthRatio" | "launchVolumeM3" | "maxVolumeM3" | "massKg" | "color">

/**
 * The flames that heat an open envelope that has no burner, and light it: a prank balloon's birthday candles or road flares, on a cross of
 * straws or balsa at its mouth. How many are lit when nothing says (a recording may say another number, 1 to 9: see
 * BalloonFlightJson.flames), how bright each is and of what colour, how long they burn, and how fast the bag's air cools once they go out.
 * Its air is the type's `insideExcessK` hotter for that many flames, in proportion for another number.
 */
export interface BalloonFlames {
  count: number
  candela: number
  color: string
  burnS: number
  coolingS: number
}

/**
 * The burner of a hot-air balloon: how fast a blast heats its air, how fast that air cools through its fabric, how long a blast lasts, and
 * how bright its flame is and how much of its light the fabric passes on. Its pilot fires it in blasts of a few seconds, half a minute to a
 * minute apart, to keep the height they want: at night each blast lights the whole envelope from inside, and between them it goes dark.
 */
export interface BalloonBurner {
  /** How fast a blast heats the envelope's air, K/s. */
  heatingKS: number
  /** How long its air takes to cool through the fabric, s (the time constant of the loss). */
  coolingS: number
  /** How long a blast lasts, s. */
  blastS: number
  /** The hottest its air may be over the outside's, K: fabric is rated to some 120 °C. */
  maxExcessK: number
  /** The flame's luminance, cd/m², as drawn on the model's flame. */
  flameCdM2: number
  /** The mean luminance of the envelope a blast lights from inside, cd/m². */
  envelopeCdM2: number
  /** The flame's colour, CSS. */
  color: string
}

export class BalloonTypes {
  static readonly HELIUM_KG_MOL = 0.0040026

  static readonly ALL: readonly BalloonType[] = [
    /**
     * A sport hot-air balloon of 90 000 cubic feet (2 550 m³, a Cameron Z-90's), 16.5 m across and 24 m from its basket's floor to its
     * crown, carrying a pilot and two passengers: 540 kg with its basket, burner and fuel (manufacturers' figures, rounded). Its burner:
     * a blast of 6 s heats its air by some 1.2 K/s, which cools with a time constant of 400 s, so that holding a height takes a blast every
     * 40 to 60 s, as pilots do. The flame's luminance (20 000 cd/m², a yellow propane flame) and the mean luminance of the envelope a blast
     * lights (40 cd/m², what night-glow photographs suggest) are SUPPOSED.
     */
    {
      id: "hot-air", modelId: "ufoathome-balloon-hot-air", envelope: "open", launchVolumeM3: 2550, maxVolumeM3: 2550, massKg: 540,
      dragCoefficient: 0.5, aspect: 1.461, widthM: 16.5, color: "#c8202f", stripeColor: "#f5c400", albedo: 0.4,
      burner: { heatingKS: 1.2, coolingS: 400, blastS: 6, maxExcessK: 100, flameCdM2: 20000, envelopeCdM2: 40, color: "#ffb347" },
      phenomenon: "WeatherBalloonsOrMongolfieres", durationS: 3600
    },
    /**
     * An 11-inch (28 cm) latex party balloon filled with 11.5 litres of helium, 4.5 g with its ribbon: some 7 g of free lift, which climbs at
     * about 2 m/s. It bursts swelled to some 40 cm, at about 8 km: what is reported of released balloons. Its size at burst is SUPPOSED.
     */
    {
      id: "party", modelId: "ufoathome-balloon-latex", envelope: "elastic", launchVolumeM3: 0.0115, maxVolumeM3: 0.0335, massKg: 0.0045,
      dragCoefficient: 0.47, aspect: 1.13, color: "#d8263a", albedo: 0.35, phenomenon: "WeatherBalloonsOrMongolfieres", durationS: 3600
    },
    /**
     * A 30 cm latex balloon with an LED and its coin cell inside, 7.5 g: let go by the dozen at weddings and sold as "glow" balloons. The
     * LED's 0.5 cd seen through the latex is SUPPOSED; its colour is the recording's (white when absent).
     */
    {
      id: "led", modelId: "ufoathome-balloon-led", envelope: "elastic", launchVolumeM3: 0.0141, maxVolumeM3: 0.041, massKg: 0.0075,
      dragCoefficient: 0.47, aspect: 1.115, color: "#ffffff", albedo: 0.5, glow: { candela: 0.5, color: "#ffffff" },
      phenomenon: "LedBalloon", durationS: 3600
    },
    /**
     * An 18-inch (45 cm) round foil balloon, 10 g with its ribbon, holding some 14 litres of helium; or a star, a heart, or the figure of a
   * child, arms wide and head big, 0.9 m tall and 0.8 m across, its shirt the balloon's colour and its hair, skin, shorts and shoes their own (the "Dora" balloon seen over Nancy on 23 October 2005 was one), 50
   * litres, 30 g: sizes and weights SUPPOSED from sellers' listings. Its film cannot stretch: as the air
     * thins its helium leaks through its seams and valve, and it floats at some 4 km, for days, polished, flashing the Sun as it turns. The
     * loss of its gas as it swells is SUPPOSED, which is what keeps it from bursting as one sealed would.
     */
    {
      id: "foil", modelId: "ufoathome-balloon-foil", envelope: "vented", launchVolumeM3: 0.014, maxVolumeM3: 0.014, massKg: 0.01,
      dragCoefficient: 0.6, aspect: 1.034, widthM: 0.45, depthRatio: 0.267, color: "#c9cdd2", albedo: 0.85, finish: "mirror", spins: true,
      shapes: {
        round: { modelId: "ufoathome-balloon-foil", aspect: 1.034, widthM: 0.45, depthRatio: 0.267, launchVolumeM3: 0.014, maxVolumeM3: 0.014, massKg: 0.01, color: "#c9cdd2" },
        star: { modelId: "ufoathome-balloon-foil-star", aspect: 1.029, widthM: 0.5, depthRatio: 0.183, launchVolumeM3: 0.012, maxVolumeM3: 0.012, massKg: 0.009, color: "#e0b83a" },
        heart: { modelId: "ufoathome-balloon-foil-heart", aspect: 0.903, widthM: 0.5, depthRatio: 0.2, launchVolumeM3: 0.014, maxVolumeM3: 0.014, massKg: 0.01, color: "#d81e3c" },
        figure: { modelId: "ufoathome-balloon-foil-figure", aspect: 1.112, widthM: 0.8, depthRatio: 0.127, launchVolumeM3: 0.05, maxVolumeM3: 0.05, massKg: 0.03, color: "#f0a3c8" }
      },
      phenomenon: "FoilBalloon", durationS: 3600
    },
    /**
     * A 30 g pilot balloon ("pibal"), followed with a theodolite to measure the winds aloft: filled to some 65 cm, it climbs at about
     * 3.5 m/s and bursts swelled to 1 m, at some 12 km (its size at burst SUPPOSED from that height). At night it took a small lamp up (1 cd, SUPPOSED), lit only when the recording
     * says so.
     */
    {
      id: "pilot", modelId: "ufoathome-balloon-latex", envelope: "elastic", launchVolumeM3: 0.144, maxVolumeM3: 0.57, massKg: 0.045,
      dragCoefficient: 0.4, aspect: 1.13, color: "#f0e6cf", albedo: 0.55, lamp: { candela: 1, color: "#fff1c4" },
      phenomenon: "WeatherBalloonsOrMongolfieres", durationS: 5400
    },
    /**
     * A radiosonde's 600 g latex balloon (a Totex TA600's figures), carrying its sonde, parachute and unwinder (250 g), filled to 1.5 m with
     * 1 kg of free lift: it climbs at some 5 m/s and bursts swelled to 6.1 m, at 28 to 30 km, an hour or so later. Launched twice a
     * day from some 800 stations, at 00 and 12 UTC: at dusk, far up in the Sun while the ground is dark, it is a bright point that slowly
     * grows into a disc. Its sonde, 20 to 30 m under it on its string, is not drawn.
     */
    {
      id: "weather", modelId: "ufoathome-balloon-latex", envelope: "elastic", launchVolumeM3: 1.75, maxVolumeM3: 118.9, massKg: 0.85,
      dragCoefficient: 0.3, aspect: 1.13, color: "#f2ece0", albedo: 0.55, phenomenon: "WeatherBalloonsOrMongolfieres", durationS: 7200
    },
    /**
     * A stratospheric balloon of polyethylene open at its foot, as the Skyhooks of 1947 to the 1950s (and the scientific balloons since)
     * are: 14 000 m³ full, some 30 m across, carrying 210 kg with its gondola. Let go as a tall bubble of 220 m³ of helium, it climbs at
     * some 5 m/s, fills out as it rises, lets its excess gas go once full and floats at about 30 km, where the Sun lights it long after the
     * ground's sunset: the balloon of the Mantell case. It carries 20 kg of ballast to drop (SUPPOSED). Its shape as it fills is SUPPOSED, its gondola, 50 m under it, not drawn.
     */
    {
      id: "stratospheric", modelId: "ufoathome-balloon-stratospheric", envelope: "vented", launchVolumeM3: 219, maxVolumeM3: 14000, massKg: 210,
      dragCoefficient: 0.4, aspect: 0.91, color: "#e9eef2", albedo: 0.8, ballastKg: 20, phenomenon: "StratosphericBalloons", durationS: 10800
    },
    /**
     * A large open stratospheric balloon of the CNES's (a BSO) or NASA's: 150 000 m³ full, some 66 m across, carrying 700 kg, floating at
     * some 38 km, where it is lit for an hour and more after the ground's sunset. The CNES has let go some 3 000 of 30 to 80 m from France
     * and elsewhere. Its figures are SUPPOSED, for one of the middle of that range; 70 kg of ballast.
     */
    {
      id: "stratospheric-large", modelId: "ufoathome-balloon-stratospheric", envelope: "vented", launchVolumeM3: 730, maxVolumeM3: 150000, massKg: 700,
      dragCoefficient: 0.4, aspect: 0.91, color: "#e9eef2", albedo: 0.8, ballastKg: 140, phenomenon: "StratosphericBalloons", durationS: 14400
    },
    /**
     * A superpressure balloon (the CNES's BPS, Google's Loon): a sealed sphere 10 m across, let go slack, that fills out as it rises and
     * then floats for weeks at some 19 km without swelling more, its gas kept at more than the air's pressure. Carrying 44 kg; figures
     * SUPPOSED. Drawn as a sphere.
     */
    {
      id: "superpressure", modelId: "ufoathome-balloon-latex", envelope: "superpressure", launchVolumeM3: 45, maxVolumeM3: 523, massKg: 44,
      dragCoefficient: 0.4, aspect: 1.13, color: "#eef1f4", albedo: 0.8, phenomenon: "StratosphericBalloons", durationS: 10800
    },
    /**
     * The CNES's infrared hot-air balloon (MIR): an open envelope of 45 000 m³, black above to take in the Sun and the Earth's warmth, its
     * air some 20 K hotter than outside, floating at some 25 km. Let go partly filled, it fills out as it rises. Its figures are SUPPOSED (a
     * 150 kg flight chain); drawn as a stratospheric balloon's natural shape.
     */
    {
      id: "infrared", modelId: "ufoathome-balloon-stratospheric", envelope: "open", launchVolumeM3: 2075, maxVolumeM3: 45000, massKg: 150,
      dragCoefficient: 0.4, aspect: 0.91, color: "#9aa0a8", albedo: 0.4, insideExcessK: 20, phenomenon: "StratosphericBalloons", durationS: 10800
    },
    /**
     * A prank balloon: a dry-cleaning bag (some 0.25 m³, 0.6 m across) held open at its mouth by a cross of straws on which four birthday
     * candles burn, 20 g in all. Its air some 60 K hotter while they burn, it climbs a few hundred metres, its candles a ring of small lights
     * under a faint glowing dome, turning slowly and swinging in the gusts, and goes out after ten minutes or so: one of the four kinds of
     * prank balloon known since 1897 (the "Omaha airship"). Its heat and its candles' 0.5 cd each are SUPPOSED.
     */
    {
      id: "prank-candles", modelId: "ufoathome-balloon-prank", envelope: "open", launchVolumeM3: 0.25, maxVolumeM3: 0.25, massKg: 0.02,
      dragCoefficient: 0.6, aspect: 1.515, widthM: 0.6, color: "#f4f4f4", albedo: 0.6, insideExcessK: 60, spins: true, sways: true,
      flames: { count: 4, candela: 0.5, color: "#ffb347", burnS: 720, coolingS: 15 },
      phenomenon: "SkyLantern", durationS: 1200
    },
    /**
     * A prank balloon of the long-lasting kind: several leaf bags taped into one of some 2 m³ (1.2 m across), held open by balsa on which one
     * road flare burns red, 300 g in all: a bright red point that drifts for a quarter of an hour. Its heat (80 K) and the flare's 150 cd are
     * SUPPOSED.
     */
    {
      id: "prank-flares", modelId: "ufoathome-balloon-prank", envelope: "open", launchVolumeM3: 2, maxVolumeM3: 2, massKg: 0.3,
      dragCoefficient: 0.6, aspect: 1.515, widthM: 1.2, color: "#2b2d30", albedo: 0.1, insideExcessK: 80, spins: true, sways: true,
      flames: { count: 1, candela: 150, color: "#ff3a20", burnS: 900, coolingS: 30 },
      phenomenon: "SkyLantern", durationS: 1500
    },
    /**
     * A solar balloon: a black plastic envelope of some 14 m³ (3 m across), 250 g, its air warmed by the Sun some 20 K over the outside's
     * (SUPPOSED, for a sunny day): a toy that climbs to a few hundred metres and drifts while the Sun is up.
     */
    {
      id: "solar", modelId: "ufoathome-balloon-latex", envelope: "open", launchVolumeM3: 14, maxVolumeM3: 14, massKg: 0.4,
      dragCoefficient: 0.47, aspect: 1.13, color: "#151515", albedo: 0.05, insideExcessK: 10,
      phenomenon: "WeatherBalloonsOrMongolfieres", durationS: 3600
    },
    /**
     * A captive balloon: a 3 m sphere of sealed PVC (14 m³ of helium, 8 kg), held on a line over a fair, a shop or a field, the advertising
     * balloons that sway over a town. Its line is 30 m when the recording does not say (see BalloonFlightJson.tetherM).
     */
    {
      id: "captive", modelId: "ufoathome-balloon-latex", envelope: "sealed", tethered: true, launchVolumeM3: 14, maxVolumeM3: 14, massKg: 8,
      dragCoefficient: 0.47, aspect: 1.13, color: "#f4f4f4", albedo: 0.7, phenomenon: "WeatherBalloonsOrMongolfieres", durationS: 3600
    }
  ]

  static byId(id: string | undefined): BalloonType | undefined {
    return BalloonTypes.ALL.find(type => type.id === id)
  }
}
