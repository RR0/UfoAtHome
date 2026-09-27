import { describe, expect, it } from "vitest"
import { VehicleDrive } from "../../src/engine/place/VehicleDrive.js"
import { VehicleProfiles } from "../../src/engine/model/Vehicle.js"

/** A van accelerating from rest to 100 km/h in 20 s, cruising 20 s, then braking to 45 km/h in 10 s. */
function vanRun(): VehicleDrive {
  const speedAt = (s: number) => (s < 0 ? 0 : s < 20 ? (27.8 * s) / 20 : s < 40 ? 27.8 : s < 50 ? 27.8 - (15.3 * (s - 40)) / 10 : 12.5)
  // Distance as the integral of the speed, finely enough for a 100 ms derivative.
  const distance = (tMs: number) => {
    let d = 0
    for (let s = 0; s < tMs / 1000; s += 0.01) d += speedAt(s) * 0.01
    return d
  }
  return VehicleDrive.of(VehicleProfiles.of("van"), t => ({ eastM: distance(t), northM: 0 }), 0, 60_000)!
}

describe("VehicleDrive", () => {
  const drive = vanRun()

  it("changes up as it gathers speed, the revs falling back at each change", () => {
    const gears = Array.from({ length: 20 }, (_, k) => drive.at(k * 1000).gear)
    expect(Math.max(...gears)).toBeGreaterThan(3)
    for (let k = 1; k < gears.length; k++) expect(gears[k]).toBeGreaterThanOrEqual(gears[k - 1])
    // A real change of gear, not moving off from standing (gear 0): the revs just after it are
    // below the revs just before.
    let t = 100
    while (!(drive.at(t - 100).gear >= 1 && drive.at(t).gear > drive.at(t - 100).gear)) t += 100
    expect(drive.at(t + 100).rpm).toBeLessThan(drive.at(t - 200).rpm)
  })

  it("pulls hard accelerating, less cruising, and nearly nothing slowing down", () => {
    expect(drive.at(10_000).load).toBeGreaterThan(drive.at(30_000).load)
    expect(drive.at(45_000).load).toBeLessThan(0.1)
  })

  it("keeps its revs within the engine's range, and idles standing", () => {
    for (let t = 1000; t < 60_000; t += 500) {
      const { rpm } = drive.at(t)
      expect(rpm).toBeGreaterThanOrEqual(VehicleProfiles.of("van").idleRpm)
      expect(rpm).toBeLessThan(3200)
    }
    const standing = VehicleDrive.of(VehicleProfiles.of("car"), () => ({ eastM: 0, northM: 0 }), 0, 5000)!
    expect(standing.at(2000)).toMatchObject({ gear: 0, rpm: 800 })
  })
})
