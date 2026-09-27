import type { VehicleProfile } from "../model/Vehicle.js"

/** What a vehicle's engine is doing at one instant. */
export interface DriveState {
  /** Metres per second over the ground. */
  speedMps: number
  /** Engine revolutions per minute. */
  rpm: number
  /** How hard it is working, 0 (coasting, the engine held back by the road) to 1 (flat out). */
  load: number
  /** Gear engaged, 1 up; 0 standing. */
  gear: number
}

/**
 * How a vehicle's engine turns along a journey, read from the journey itself: its speed at every
 * instant decides the gear, the gear the revolutions, and the change of speed how hard the engine
 * pulls or holds back. Nobody records which gear a patrol van was in; everybody can hear it, and a
 * journey of known speeds leaves one reasonable answer.
 *
 * Worked out once, in order, every SAMPLE_MS — a gear is a state, and which one a driver is in
 * depends on the ones before (it goes up at SHIFT_UP and down at SHIFT_DOWN, not both at one speed).
 */
export class VehicleDrive {
  static readonly SAMPLE_MS = 100
  /** Below this a vehicle is standing, its engine idling. */
  private static readonly STANDING_MPS = 0.3

  private constructor(private readonly samples: ReadonlyArray<DriveState>, private readonly startMs: number) {}

  /**
   * @param position Where the vehicle is at a time, metres east/north — any fixed origin.
   * @param fromMs,toMs The span to work out.
   */
  static of(profile: VehicleProfile, position: (tMs: number) => { eastM: number, northM: number } | undefined,
    fromMs: number, toMs: number): VehicleDrive | undefined {
    const step = VehicleDrive.SAMPLE_MS
    const speeds: number[] = []
    for (let t = fromMs; t <= toMs + step / 2; t += step) {
      const before = position(t - step / 2)
      const after = position(t + step / 2)
      if (!before || !after) return undefined
      speeds.push(Math.hypot(after.eastM - before.eastM, after.northM - before.northM) / (step / 1000))
    }
    const samples: DriveState[] = []
    let gear = 1
    for (let i = 0; i < speeds.length; i++) {
      const speedMps = speeds[i]
      const acceleration = (speeds[Math.min(i + 1, speeds.length - 1)] - speeds[Math.max(i - 1, 0)]) / (2 * step / 1000)
      if (speedMps < VehicleDrive.STANDING_MPS) {
        gear = 1
        samples.push({ speedMps, rpm: profile.idleRpm, load: 0.1, gear: 0 })
        continue
      }
      const kmh = speedMps * 3.6
      const rpmIn = (g: number) => (kmh / profile.kmhPer1000Rpm[g - 1]) * 1000
      while (gear < profile.kmhPer1000Rpm.length && rpmIn(gear) > profile.shiftUpRpm) gear++
      while (gear > 1 && rpmIn(gear) < profile.shiftDownRpm) gear--
      // Moving off in first below its idle speed, the clutch slips: the engine stays at idle and a
      // little over, not below it.
      const rpm = Math.max(rpmIn(gear), profile.idleRpm * (1 + 0.3 * Math.min(1, speedMps / 3)))
      // Pulling to gain speed, holding back to lose it (the engine braking, nearly silent), and
      // between the two the effort of holding a speed, which grows as the square of it (the air).
      const cruise = 0.15 + 0.5 * Math.min(1, (speedMps / 35) ** 2)
      const load = acceleration > 0.15 ? Math.min(1, cruise + acceleration / 2.5)
        : acceleration < -0.3 ? 0.05
          : cruise
      samples.push({ speedMps, rpm, load, gear })
    }
    return new VehicleDrive(samples, fromMs)
  }

  at(tMs: number): DriveState {
    const position = (tMs - this.startMs) / VehicleDrive.SAMPLE_MS
    const index = Math.min(Math.max(Math.floor(position), 0), this.samples.length - 1)
    const a = this.samples[index]
    const b = this.samples[Math.min(index + 1, this.samples.length - 1)]
    const f = Math.min(Math.max(position - index, 0), 1)
    return {
      speedMps: a.speedMps + (b.speedMps - a.speedMps) * f,
      rpm: a.rpm + (b.rpm - a.rpm) * f,
      load: a.load + (b.load - a.load) * f,
      gear: f < 0.5 ? a.gear : b.gear
    }
  }
}
