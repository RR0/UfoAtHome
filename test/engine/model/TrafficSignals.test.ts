import { describe, expect, it } from "vitest"
import { LightRigs, TrafficSignals } from "../../../src/engine/model/LightRig.js"
import { isLightOnAt } from "../../../src/engine/model/Decor.js"
import { DecorBase } from "../../../src/engine/model/DecorBase.js"

const lit = (lights: ReturnType<typeof TrafficSignals.vehicleLights>, s: number) => lights.filter(light => isLightOnAt(light, s * 1000)).map(light => light.id)

describe("TrafficSignals", () => {
  it("lights one lens of a head at a time, green then amber then red, over a cycle of ninety seconds", () => {
    const head = TrafficSignals.vehicleLights(0)
    expect(lit(head, 10)).toEqual(["green"])
    expect(lit(head, 42)).toEqual(["amber"])
    expect(lit(head, 60)).toEqual(["red"])
    expect(lit(head, 100)).toEqual(["green"])
    for (let s = 0.5; s < TrafficSignals.CYCLE_S; s += 1) expect(lit(head, s)).toHaveLength(1)
  })

  it("never lets two crossing roads go together, and gives a pedestrian green only while the road crossed is red", () => {
    const one = TrafficSignals.vehicleLights(0)
    const other = TrafficSignals.vehicleLights(1)
    const walker = TrafficSignals.pedestrianLights(0)
    for (let s = 0.5; s < TrafficSignals.CYCLE_S; s += 1) {
      const a = lit(one, s)[0]
      const b = lit(other, s)[0]
      expect(a === "red" || b === "red").toBe(true)
      if (lit(walker, s)[0] === "ped-green") expect(a).toBe("red")
    }
  })

  it("puts the two roads of a junction in the two phases by their direction", () => {
    expect(TrafficSignals.phaseOf(0)).toBe(0)
    expect(TrafficSignals.phaseOf(180)).toBe(0)
    expect(TrafficSignals.phaseOf(90)).toBe(1)
    expect(TrafficSignals.phaseOf(275)).toBe(1)
  })

  it("is a rig of a traffic light, recognised whichever phase its lamps are in", () => {
    expect(LightRigs.forKind("trafficlight").map(rig => rig.id)).toEqual(["traffic-signal", "pedestrian-signal"])
    expect(DecorBase.rigOf({ kind: "trafficlight", lights: TrafficSignals.vehicleLights(1) })).toBe("traffic-signal")
    expect(DecorBase.rigOf({ kind: "trafficlight", lights: TrafficSignals.pedestrianLights(1) })).toBe("pedestrian-signal")
    expect(TrafficSignals.isPedestrian(TrafficSignals.pedestrianLights(0))).toBe(true)
    expect(TrafficSignals.isPedestrian(TrafficSignals.vehicleLights(0))).toBe(false)
  })
})
