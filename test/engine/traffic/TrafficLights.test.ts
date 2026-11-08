import { describe, expect, test } from "vitest"
import { AircraftModels } from "../../../src/engine/traffic/AircraftModels.js"
import { TrafficLights } from "../../../src/engine/traffic/TrafficLights.js"

const A320 = AircraftModels.of({ type: "A320" })
const C172 = AircraftModels.of({ type: "C172" })
const EC35 = AircraftModels.of({ type: "EC35" })
const ids = (model: ReturnType<typeof AircraftModels.of>, sun: number) => TrafficLights.lights(model, sun).map(light => light.id)

describe("TrafficLights", () => {
  test("an airliner flies lit at every hour of the day", () => {
    for (const sun of [60, 5, -1, -20]) {
      expect(TrafficLights.lampsOn("airliner-narrow", sun)).toEqual({ navigation: true, beacon: true, strobes: true })
    }
    expect(ids(A320, 40)).toContain("strobe-port")
    expect(ids(A320, -20)).toContain("beacon-top")
  })

  test("a light aircraft and a helicopter light their lamps from dusk, and by day are taken as dark", () => {
    expect(ids(C172, 30)).toEqual([])
    expect(ids(C172, -0.5)).toEqual([])
    expect(ids(C172, -2)).toContain("strobe-port")
    expect(ids(EC35, 20)).toEqual([])
    expect(ids(EC35, -10)).toContain("strobe")
  })

  test("a glider and a balloon carry none, a drone only its strobes, and from dusk", () => {
    expect(TrafficLights.lampsOn("glider", -30)).toEqual({ navigation: false, beacon: false, strobes: false })
    expect(TrafficLights.lampsOn("balloon", -30)).toEqual({ navigation: false, beacon: false, strobes: false })
    expect(TrafficLights.lampsOn("unmanned", 10).strobes).toBe(false)
    expect(TrafficLights.lampsOn("unmanned", -10)).toEqual({ navigation: false, beacon: false, strobes: true })
  })

  test("the lamps stand on the real size of the machine: the wingtips of a wide-body are further out", () => {
    const wide = AircraftModels.of({ type: "A388" })
    const tip = (model: ReturnType<typeof AircraftModels.of>) => TrafficLights.lights(model, 0).find(light => light.id === "nav-starboard")!.offsetM.x
    expect(tip(A320)).toBeCloseTo(34.1 / 2, 1)
    expect(tip(wide)).toBeCloseTo(79.8 / 2, 1)
    const tail = (model: ReturnType<typeof AircraftModels.of>) => TrafficLights.lights(model, 0).find(light => light.id === "nav-tail")!.offsetM.z
    expect(tail(A320)).toBeCloseTo(-37.6 / 2, 0)
    expect(tail(wide)).toBeLessThan(tail(A320))
  })

  test("a helicopter's lamps are on its own small frame, not an airliner's", () => {
    const nav = TrafficLights.lights(EC35, -10).find(light => light.id === "nav-starboard")!
    expect(nav.offsetM.x).toBeCloseTo(10.2 / 2, 1)
  })

  test("a light aircraft's strobe is a fifth of an airliner's, and its navigation light a half", () => {
    const strobe = (model: ReturnType<typeof AircraftModels.of>, sun: number) => TrafficLights.lights(model, sun).find(light => light.id === "strobe-port")!.intensity!
    const nav = (model: ReturnType<typeof AircraftModels.of>, sun: number) => TrafficLights.lights(model, sun).find(light => light.id === "nav-port")!.intensity ?? 1
    expect(strobe(C172, -5) / strobe(A320, -5)).toBeCloseTo(0.2, 6)
    expect(nav(C172, -5) / nav(A320, -5)).toBeCloseTo(0.5, 6)
  })

  test("the flash rates stay those the rigs give, which the specifications fix", () => {
    const strobe = TrafficLights.lights(A320, 0).find(light => light.id === "strobe-port")!
    expect(strobe.pattern).toMatchObject({ kind: "flash", perMinute: 60 })
  })

  test("the airframe is white for an airliner, grey for a military jet, dark for a drone", () => {
    expect(TrafficLights.bodyColor(A320)).toBe("#dde0e4")
    expect(TrafficLights.bodyColor(AircraftModels.of({ type: "T38" }))).toBe("#8a8e94")
    expect(TrafficLights.bodyColor(AircraftModels.of({ category: "B6" }))).toBe("#2c2e33")
  })
})

describe("TrafficLights.landingLights", () => {
  const A320 = AircraftModels.of({ type: "A320" })
  const B738Low = [{ t: 0, altitudeFt: 3000 }, { t: 1000, altitudeFt: 4000 }]

  test("are thrown ahead by an airliner under the height, in a narrow beam", () => {
    const lights = TrafficLights.landingLights(A320, 30, B738Low)
    expect(lights.map(light => light.id)).toEqual(["landing-left", "landing-right"])
    expect(lights[0].beamDeg).toBeLessThan(15)
    expect(lights[0].offsetM.z).toBeGreaterThan(0)
    expect(lights[0].intensity).toBe(600)
  })

  test("are none on a flight that never comes under the height, nor on what carries none", () => {
    expect(TrafficLights.landingLights(A320, 30, [{ t: 0, altitudeFt: 35000 }])).toEqual([])
    expect(TrafficLights.landingLights(AircraftModels.of({ category: "B1" }), -10, B738Low)).toEqual([])
  })

  test("wait for dusk on what is only lit from then, as its other lamps do", () => {
    const piston = AircraftModels.of({ type: "C172" })
    expect(TrafficLights.landingLights(piston, 30, B738Low)).toEqual([])
    expect(TrafficLights.landingLights(piston, -10, B738Low)[0].intensity).toBeLessThan(600)
  })

  test("are switched as the flight crosses the height, up and down", () => {
    const climb = [{ t: 0, altitudeFt: 8000 }, { t: 1000, altitudeFt: 12000 }, { t: 2000, altitudeFt: 9000 }]
    const [light] = TrafficLights.landingLights(A320, 30, climb)
    expect(light.intensity).toBe(600)
    expect(light.keyframes).toEqual([{ t: 1000, intensity: 0 }, { t: 2000, intensity: 600 }])
    const high = [{ t: 0, altitudeFt: 12000 }, { t: 1000, altitudeFt: 9000 }]
    expect(TrafficLights.landingLights(A320, 30, high)[0].intensity).toBe(0)
  })
})
