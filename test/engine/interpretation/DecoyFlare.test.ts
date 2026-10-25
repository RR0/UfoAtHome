import { describe, expect, test } from "vitest"
import { DecoyFlare } from "../../../src/engine/interpretation/DecoyFlare.js"
import type { FlareSalvoJson } from "../../../src/engine/interpretation/DecoyFlare.js"

/** A fighter flying due south at 230 m/s, 6 km up and 6 km east of the observer, dispensing three flares a second apart. */
const salvo = (wind?: FlareSalvoJson["wind"]): FlareSalvoJson => ({
  id: "salvo",
  aircraft: { t: 0, eastM: 6000, northM: 0, altitudeM: 6000, headingDeg: 180, speedMS: 230 },
  releases: [{ t: 1000, explains: ["red-1"] }, { t: 2000 }, { t: 3000 }],
  wind
})

describe("DecoyFlare", () => {
  test("the aircraft flies straight and level through its stated point", () => {
    const p = DecoyFlare.aircraftAt(salvo().aircraft, 2000)
    expect(p.x).toBeCloseTo(6000, 6)
    expect(p.y).toBeCloseTo(-460, 6)
    expect(p.z).toBe(6000)
  })

  test("a flare is braked within a fraction of a second and drops at its terminal speed", () => {
    const path = DecoyFlare.trajectory(salvo(), DecoyFlare.MJU_7, 0)
    // Released at the aircraft: 230 m/s south, it travels a couple of hundred metres before the air stops it (at 7 km, in air half as thick
    // as at sea level), a second of the aircraft's flight.
    const travelled = -path[path.length - 1].y
    expect(travelled).toBeGreaterThan(100)
    expect(travelled).toBeLessThan(300)
    // Then falls at a few tens of m/s: the last second's drop.
    const last = path[path.length - 1], secondBefore = path[path.length - 11]
    const fall = (secondBefore.z - last.z) / ((last.t - secondBefore.t) / 1000)
    expect(fall).toBeGreaterThan(15)
    expect(fall).toBeLessThan(40)
    // The makers say it burns out within 150 to 400 ft (46 to 122 m) of descent.
    const drop = path[0].z - last.z
    expect(drop).toBeGreaterThan(46)
    expect(drop).toBeLessThan(150)
  })

  test("the wind carries a falling flare", () => {
    const still = DecoyFlare.trajectory(salvo(), DecoyFlare.MJU_7, 0)
    const blown = DecoyFlare.trajectory(salvo({ towardDeg: 90, speedMS: 10 }), DecoyFlare.MJU_7, 0)
    const drift = blown[blown.length - 1].x - still[still.length - 1].x
    // About the wind's speed for most of 4.5 s.
    expect(drift).toBeGreaterThan(30)
    expect(drift).toBeLessThan(45)
  })

  test("it catches, holds, and dies within its burn", () => {
    const type = DecoyFlare.MJU_7
    expect(DecoyFlare.burnShare(type, 0)).toBe(0)
    expect(DecoyFlare.burnShare(type, 0.1)).toBeCloseTo(0.5, 6)
    expect(DecoyFlare.burnShare(type, 2)).toBe(1)
    expect(DecoyFlare.burnShare(type, type.burnS * 0.9)).toBeCloseTo(0.4, 6)
    expect(DecoyFlare.burnShare(type, type.burnS)).toBe(0)
  })

  test("a salvo becomes glowing bodies along the aircraft's path, gone once burnt out", () => {
    const bodies = DecoyFlare.bodiesOf(salvo())
    expect(bodies.map(body => body.id)).toEqual(["salvo-flare-1", "salvo-flare-2", "salvo-flare-3"])
    expect(bodies[0].explains).toEqual(["red-1"])
    const first = bodies[1].track[0]
    expect(first.t).toBe(2000)
    expect(first.northM).toBeCloseTo(-460, 6)
    expect(first.present).toBe(true)
    const lit = bodies[1].track.find(key => key.t === 3000)
    expect(lit?.appearance?.luminanceCdM2).toBeGreaterThan(10000)
    expect(bodies[1].track[bodies[1].track.length - 1].present).toBe(false)
  })

  test("an interpretation with no salvo is left as it is, and one with a salvo gains its bodies", () => {
    const plain = { bodies: [] }
    expect(DecoyFlare.expand(plain)).toBe(plain)
    const withFlares = DecoyFlare.expand({ bodies: [], flares: [salvo()] })
    expect(withFlares.bodies.length).toBe(3)
  })

  test("the aircraft's own light follows it, lit and put out in turn, and goes when it is said to", () => {
    const glow = { explains: ["orange"], sizeM: 3, luminousIntensityCd: 50000, color: "#ff9a3a", fromT: 0, untilT: 6000, onS: 2.5, offS: 2.5 }
    const bodies = DecoyFlare.bodiesOf({ ...salvo(), aircraft: { ...salvo().aircraft, glow } })
    const light = bodies[0]
    expect(light.id).toBe("salvo-glow")
    expect(light.explains).toEqual(["orange"])
    const lum = (t: number) => [...light.track].reverse().find(key => key.t <= t && key.appearance)?.appearance?.luminanceCdM2
    expect(lum(1000)).toBeGreaterThan(0)
    expect(lum(3000)).toBe(0)
    expect(lum(5500)).toBeGreaterThan(0)
    // It moves with the aircraft: at 2 s it is where the aircraft is.
    const at2 = light.track.find(key => key.t === 2500)!
    expect(at2.northM).toBeCloseTo(DecoyFlare.aircraftAt(salvo().aircraft, 2500).y, 6)
    expect(light.track[light.track.length - 1]).toEqual({ t: 6001, present: false })
  })

  test("a drawn aircraft comes first, on its own straight track", () => {
    const bodies = DecoyFlare.bodiesOf({ ...salvo(), aircraft: { ...salvo().aircraft, model: { id: "box" }, sizeM: { widthM: 10, lengthM: 15, heightM: 5 } } })
    expect(bodies[0].id).toBe("salvo-aircraft")
    expect(bodies[0].track).toHaveLength(2)
  })
})
