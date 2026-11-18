import type { FlightRegime } from "./AircraftHearing.js"
import { SoundInAir } from "./SoundInAir.js"

/** A curve of dB against an angle, degrees, read between its points and held flat beyond the first and the last unless said. */
type Curve = readonly (readonly [number, number])[]

/** How a turbofan's jet and fan are moving, in a regime: what its directivity depends on. */
interface EngineState {
  /** The jet's speed out of the nozzle, and the aircraft's own through the air, m/s. */
  jetMps: number
  flightMps: number
  /** The jet's share of the noise in each band of SoundInAir.OCTAVES, at 90°: the rest is the fan's (and at approach the airframe's, taken with it). */
  jetShare: readonly number[]
}

/**
 * The jet noise's directivity besides its convection, read off figure 4 of Stone (1974): what is left once 30 log[1 + Mc (1 + Mc⁵)^-1/5 cos θ]
 * is taken out, for ambient-temperature, shock-free circular jets, by eye from the scatter of the data (± 1 to 2 dB). At a Strouhal number of
 * 0.16, where the jet is loudest, the lows rise towards the jet's axis; at 1.0 they fall into its "cone of silence", refracted out of it.
 */
const JET_LOW: Curve = [[20, 0], [120, 0], [130, 1.5], [140, 4], [150, 7.5], [160, 7.5]]
const JET_HIGH: Curve = [[20, 1.5], [40, 1], [60, 1], [80, 0], [120, 0], [130, 1], [140, 1], [150, -3], [160, -6.5], [170, -12]]
const LOW_STROUHAL = 0.16
const HIGH_STROUHAL = 1

/**
 * The fan's broadband directivity, from its inlet and from its discharge duct, by Heidmann (1979), figure 7 (a) and (b), as tabulated there. Each
 * is extrapolated linearly where the table stops, as the report says is acceptable, down to FAN_FLOOR_DB. The discharge is the louder of the two by
 * 1.5 dB (its normalized peak level is 60.0 against the inlet's 58.5, figure 4, for a fan whose tip is subsonic at the discharge).
 */
const FAN_INLET: Curve = [[0, -2], [10, -1], [20, 0], [40, 0], [50, -2], [60, -4.5], [70, -7.5], [80, -11], [90, -15], [100, -19.5], [110, -25]]
const FAN_DISCHARGE: Curve = [[60, -15.8], [70, -11.5], [80, -8], [90, -5], [100, -2.7], [110, -1.2], [120, -0.3], [130, 0], [140, -2], [150, -6], [160, -10], [170, -15], [180, -20]]
const DISCHARGE_OVER_INLET_DB = 1.5
const FAN_FLOOR_DB = -40

/**
 * The jet's nozzle, m: what scales the frequencies to the Strouhal numbers of figure 4 (f D / Vj). That of a narrow-body's fan nozzle, some 1.5 m
 * (a CFM56-5B's fan is 1.73 m across). Assumed, as is all of ENGINES.
 */
const NOZZLE_M = 1.5

/**
 * The engine in each regime. ASSUMED, as representative of a high-bypass turbofan and not measured on any: its jet is some 300 m/s at full thrust,
 * less at a climb's and much less at an approach's, which is what makes a take-off roar behind; the aircraft flies at some 80 m/s taking off, 130
 * climbing and 70 coming in. The jet carries the lows and the fan the highs: from the class's spectra, whose lows fall away at approach as the jet's
 * speed does (see TURBOFAN_REGIMES).
 */
const ENGINES: Record<FlightRegime, EngineState> = {
  takeoff: { jetMps: 300, flightMps: 80, jetShare: [1, 1, 0.9, 0.6, 0.3, 0.1, 0, 0] },
  overflight: { jetMps: 280, flightMps: 130, jetShare: [1, 1, 0.9, 0.6, 0.3, 0.1, 0, 0] },
  approach: { jetMps: 180, flightMps: 70, jetShare: [0.6, 0.5, 0.4, 0.2, 0.1, 0, 0, 0] }
}

/**
 * How much louder a turbofan is in one direction than abeam, band by band: its directivity, which a sound source of one figure per band has not.
 *
 * θ is the angle at the engine between where it is going and where the listener is: 0° ahead, 90° abeam (and overhead, which is where the classes'
 * levels were set: there, nothing changes), 180° behind. The JET roars behind: its eddies are carried downstream and their sound with them (the
 * convection of Stone, 1974, with a convective Mach number 0.62 (Vj − V0)/c), more so the faster the jet is against the air, so most at take-off;
 * near its axis its lows rise still and its highs are refracted away. The FAN sings ahead out of its inlet and behind out of its duct, and little
 * abeam or on the jet's axis (Heidmann, 1979). Each band is the two, in the shares the regime gives them.
 *
 * NOT MODELLED: the fan's tones, whose directivity (Heidmann's figure 13) is near its broadband's; the airframe's, at approach; the Doppler
 * amplification of a moving fan; the shielding of engines by the wing. Its figures are a few dB right, as the scatter of the data they come from is.
 */
export class EngineDirectivity {
  /** dB to add to each band of SoundInAir.OCTAVES of a turbofan heard at `angleDeg` from its heading, in `regime`. */
  static bandsDb(angleDeg: number, regime: FlightRegime, speedOfSound = 340): number[] {
    const engine = ENGINES[regime]
    const fan = EngineDirectivity.fan(angleDeg) - EngineDirectivity.fan(90)
    const convective = 0.62 * Math.max(0, engine.jetMps - engine.flightMps) / speedOfSound
    const convection = -30 * Math.log10(1 + (convective / (1 + convective ** 5) ** 0.2) * Math.cos((angleDeg * Math.PI) / 180))
    return SoundInAir.OCTAVES.map((frequency, band) => {
      const jet = convection + EngineDirectivity.jetRemainder(angleDeg, (frequency * NOZZLE_M) / engine.jetMps)
      const share = engine.jetShare[band]
      return 10 * Math.log10(share * 10 ** (jet / 10) + (1 - share) * 10 ** (fan / 10))
    })
  }

  /** The most each band gains in any direction, in `regime`, dB: how much farther a turbofan can be heard behind than abeam. */
  static loudestDb(regime: FlightRegime): number[] {
    const kept = EngineDirectivity.loudest.get(regime)
    if (kept) return kept
    const loudest = SoundInAir.OCTAVES.map(() => -Infinity)
    for (let angle = 0; angle <= 180; angle += 5) EngineDirectivity.bandsDb(angle, regime).forEach((level, band) => loudest[band] = Math.max(loudest[band], level))
    EngineDirectivity.loudest.set(regime, loudest)
    return loudest
  }

  private static readonly loudest = new Map<FlightRegime, number[]>()

  /** The angle at the source between its heading and the listener, degrees, from where each is: `toListener` from the source, `heading` its velocity. */
  static angleDeg(heading: readonly number[], toListener: readonly number[]): number {
    const dot = heading.reduce((sum, value, i) => sum + value * toListener[i], 0)
    const norms = Math.hypot(...heading) * Math.hypot(...toListener)
    return norms === 0 ? 90 : (Math.acos(Math.min(1, Math.max(-1, dot / norms))) * 180) / Math.PI
  }

  /** The fan's broadband level at an angle, dB, inlet and discharge together. */
  private static fan(angleDeg: number): number {
    const inlet = EngineDirectivity.read(FAN_INLET, angleDeg, true)
    const discharge = EngineDirectivity.read(FAN_DISCHARGE, angleDeg, true) + DISCHARGE_OVER_INLET_DB
    return 10 * Math.log10(10 ** (inlet / 10) + 10 ** (discharge / 10))
  }

  /** Figure 4's remainder at a Strouhal number: the low curve under LOW_STROUHAL, the high one over HIGH_STROUHAL, and between them on a log scale. */
  private static jetRemainder(angleDeg: number, strouhal: number): number {
    const x = Math.min(1, Math.max(0, Math.log(strouhal / LOW_STROUHAL) / Math.log(HIGH_STROUHAL / LOW_STROUHAL)))
    return (1 - x) * EngineDirectivity.read(JET_LOW, angleDeg) + x * EngineDirectivity.read(JET_HIGH, angleDeg)
  }

  /** A curve at an angle: linear between its points; beyond its ends held, or carried on along its last slope down to FAN_FLOOR_DB. */
  private static read(curve: Curve, angleDeg: number, extrapolate = false): number {
    const [first, second] = [curve[0], curve[1]]
    const [beforeLast, last] = [curve[curve.length - 2], curve[curve.length - 1]]
    if (angleDeg <= first[0]) {
      if (!extrapolate) return first[1]
      return Math.max(FAN_FLOOR_DB, first[1] + ((second[1] - first[1]) / (second[0] - first[0])) * (angleDeg - first[0]))
    }
    if (angleDeg >= last[0]) {
      if (!extrapolate) return last[1]
      return Math.max(FAN_FLOOR_DB, last[1] + ((last[1] - beforeLast[1]) / (last[0] - beforeLast[0])) * (angleDeg - last[0]))
    }
    for (let i = 1; i < curve.length; i++) {
      const [a, b] = [curve[i - 1], curve[i]]
      if (angleDeg <= b[0]) return a[1] + ((b[1] - a[1]) * (angleDeg - a[0])) / (b[0] - a[0])
    }
    return last[1]
  }
}
