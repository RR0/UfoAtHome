/**
 * The individual meteors a shower actually drops during a recording — worked out once, from the
 * rate, and then simply looked up at each instant.
 *
 * Deterministic on purpose, and it matters twice over. A recording that is paused must FREEZE, not
 * keep raining meteors on a frozen scene (the rule the whole scene follows since the sound work),
 * and a long exposure has to be able to integrate the same sky several thousand times over without
 * it changing underneath — a meteor that appeared only because the exposure sampled twice would be
 * an artefact of the renderer, exactly the kind this project exists to tell apart from a real one.
 *
 * So the fall is a pure function of a seed and the recording's own clock. Same recording, same
 * meteors, every time it is played, on every machine.
 */
export interface Meteor {
  /** When it appears, in milliseconds of the recording's own clock. */
  t: number
  /** How long it stays visible. Faster showers give shorter, sharper trails. */
  durationMs: number
  /** How far from the radiant it starts, in degrees along a great circle. A meteor never appears
   * AT its radiant — one coming straight at the observer has no apparent motion at all — and the
   * further out it starts, the longer the trail it can draw. */
  fromRadiantDeg: number
  /** Which way around the radiant, in degrees: 0 to 360. */
  bearingDeg: number
  /** How far it travels, in degrees of arc. */
  lengthDeg: number
  /** 0 to 1, faint to brilliant. Most are faint; the population index is what makes that so. */
  brightness: number
  /**
   * Where THIS meteor came from, when it did not come from the shower's own radiant.
   *
   * Present only on sporadics, and it is what makes them sporadic: they belong to no stream, so
   * each arrives from its own direction instead of all of them tracing back to one point. The
   * rendering reads it in place of the shower radiant — see MeteorSystem.
   */
  radiant?: { altitudeDeg: number; azimuthDeg: number }
}

export interface MeteorFallOptions {
  /** How many an observer would really see per hour — see MeteorShowers.observedRatePerHour. */
  ratePerHour: number
  /** The recording's own length, in milliseconds. */
  durationMs: number
  /** Atmospheric entry speed, km/s: what makes a Leonid a flick and a Draconid a drift. */
  velocityKmS: number
  /** Anything stable: the same seed must always give the same sky. */
  seed: number
}

/** A tiny deterministic generator — mulberry32. Not for cryptography, only for a sky that comes out
 * the same twice, which Math.random cannot promise. */
export class Rng {
  constructor(private state: number) {}

  next(): number {
    this.state = (this.state + 0x6d2b79f5) | 0
    let t = this.state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  between(min: number, max: number): number {
    return min + this.next() * (max - min)
  }
}

export class MeteorFall {
  /** The shortest a trail is ever shown for, and the longest — a real one lasts a few tenths of a
   * second, a slow fireball a couple. */
  static readonly MIN_DURATION_MS = 250
  static readonly MAX_DURATION_MS = 1400

  /**
   * Every meteor of a recording, in order.
   *
   * The count is the rate times the recording's length — a Perseid night at 68 an hour drops about
   * one every 53 seconds, so a twenty-second reconstruction usually shows NONE. That is the honest
   * answer and the useful one: a witness who watched for twenty seconds and saw a single streak did
   * not see a typical shower meteor, they saw something at the rate of a hundred an hour.
   *
   * Arrivals are spread evenly rather than drawn from a Poisson process. Meteors really do arrive
   * at random, and a Poisson draw would sometimes cluster two into one second — worth having when
   * the question is "could three in a row have been the shower?", and worth naming as a
   * simplification until then.
   */
  static schedule(options: MeteorFallOptions): Meteor[] {
    const { ratePerHour, durationMs, velocityKmS, seed } = options
    if (ratePerHour <= 0 || durationMs <= 0) return []
    const expected = (ratePerHour * durationMs) / 3_600_000
    const rng = new Rng(seed)
    // A fractional expectation is a CHANCE of one, not a rounding to zero: at 68 an hour over 20
    // seconds the answer is "0.38 of a meteor", which has to mean it appears about a third of the
    // time rather than never.
    const whole = Math.floor(expected)
    const count = whole + (rng.next() < expected - whole ? 1 : 0)
    const meteors: Meteor[] = []
    for (let i = 0; i < count; i++) {
      // Faster meteors burn shorter and brighter; the speed range across the showers is 20 to 72.
      const speedFactor = Math.min(1, Math.max(0, (velocityKmS - 20) / 52))
      const durationMsOf = MeteorFall.MAX_DURATION_MS - speedFactor * (MeteorFall.MAX_DURATION_MS - MeteorFall.MIN_DURATION_MS)
      const fromRadiantDeg = rng.between(5, 70)
      meteors.push({
        t: rng.between(0, durationMs),
        durationMs: durationMsOf * rng.between(0.7, 1.3),
        fromRadiantDeg,
        bearingDeg: rng.between(0, 360),
        // A trail grows with how far off the radiant it is — one seen edge-on sweeps the sky, one
        // near the radiant barely moves — and with how fast the thing is going. The range gives 5
        // to 25 degrees for a meteor well off its radiant, which is what a shower meteor really
        // draws; a first attempt at a third of this produced trails a dozen pixels long, which is
        // a speck and not a streak.
        lengthDeg: Math.sin((fromRadiantDeg * Math.PI) / 180) * rng.between(8, 40) * (0.6 + speedFactor),
        // Skewed hard toward the faint: cubing a uniform draw is a crude stand-in for the real
        // magnitude distribution, and errs the way the sky does.
        brightness: rng.next() ** 3
      })
      meteors.sort((a, b) => a.t - b.t)
    }
    return meteors
  }

  /** Those visible at `t`, with how far each has flown, 0 at its head and 1 as it fades. */
  static aliveAt(meteors: Meteor[], t: number): { meteor: Meteor; progress: number }[] {
    return meteors
      .filter(meteor => t >= meteor.t && t <= meteor.t + meteor.durationMs)
      .map(meteor => ({ meteor, progress: (t - meteor.t) / meteor.durationMs }))
  }
}
